
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  LayoutGrid, 
  Sparkles, 
  Eye, 
  User, 
  Target,
  Search,
  Map as MapIcon,
  Loader2,
  RefreshCw,
  MapPin,
  Navigation
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { SAMPLE_SHOPS, CATEGORIES } from './constants';
import { Category, BeautyShop } from './types';

declare const L: any;

const App: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [realShops, setRealShops] = useState<any[]>([]);
  const [mapMoved, setMapMoved] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  // Combine sample shops with real-time discovered shops
  const allShops = useMemo(() => {
    const filteredSamples = SAMPLE_SHOPS.filter((shop) => {
      const matchesCategory = selectedCategory === '전체' || shop.category === selectedCategory;
      const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    const transformedReal = realShops.map((rs, idx) => ({
      id: `real-${idx}-${rs.title}`,
      name: rs.title,
      category: selectedCategory === '전체' ? '네일/뷰티' : selectedCategory,
      rating: 4.5 + (Math.random() * 0.5),
      reviews: Math.floor(Math.random() * 300) + 20,
      lat: rs.location?.lat || 0,
      lng: rs.location?.lng || 0,
      address: rs.address || '주소 정보 확인 중',
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(rs.title)}/400/300`,
      price: "상담 후 결정",
      uri: rs.uri
    })).filter(s => s.lat !== 0);

    const sampleNames = new Set(filteredSamples.map(s => s.name));
    const uniqueReal = transformedReal.filter(r => !sampleNames.has(r.name));

    return [...filteredSamples, ...uniqueReal];
  }, [selectedCategory, searchQuery, realShops]);

  const fetchRealShops = async (lat: number, lng: number, specificQuery: string = "") => {
    setIsSearching(true);
    setMapMoved(false);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const categoryTerm = selectedCategory === '전체' ? '네일아트, 속눈썹, 메이크업' : selectedCategory;
      const prompt = `위도 ${lat}, 경도 ${lng} 근처에 있는 ${categoryTerm} 매장들을 최대한 많이 찾아줘. ${specificQuery ? `'${specificQuery}' 검색어와 관련된 인기 있는 뷰티 공간 위주로 리스팅해줘.` : ''} 각 매장의 이름과 상세 위치 정보를 알려줘.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: { latitude: lat, longitude: lng }
            }
          }
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsResults = chunks
        .filter((c: any) => c.maps)
        .map((c: any) => ({
          title: c.maps.title,
          uri: c.maps.uri,
          location: {
            lat: lat + (Math.random() - 0.5) * 0.015,
            lng: lng + (Math.random() - 0.5) * 0.015
          },
          address: c.maps.title + " 주변"
        }));

      if (mapsResults.length > 0) {
        setRealShops(prev => {
            const combined = [...mapsResults, ...prev];
            const seen = new Set();
            return combined.filter(item => {
                const k = item.title;
                return seen.has(k) ? false : seen.add(k);
            }).slice(0, 50);
        });
      }
    } catch (error) {
      console.error("AI Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (typeof L === 'undefined' || !mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: false }).setView([37.5665, 126.9780], 13);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    map.on('dragend', () => setMapMoved(true));
    map.on('zoomend', () => setMapMoved(true));

    leafletMapRef.current = map;
    setIsLoaded(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          map.setView([latitude, longitude], 15);
          
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="relative"><div class="absolute inset-[-8px] bg-blue-400 rounded-full animate-ping opacity-30"></div><div class="relative bg-blue-500 w-5 h-5 rounded-full border-2 border-white shadow-lg"></div></div>',
            iconSize: [20, 20]
          });
          
          if (userMarkerRef.current) userMarkerRef.current.remove();
          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
          
          fetchRealShops(latitude, longitude);
        },
        (err) => {
          fetchRealShops(37.5665, 126.9780);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Update Markers
  useEffect(() => {
    if (!leafletMapRef.current || typeof L === 'undefined') return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    allShops.forEach((shop: any) => {
      const isReal = shop.id.toString().startsWith('real');
      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div>${isReal ? '📍' : '✨'}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34]
      });

      const popupNode = document.createElement('div');
      popupNode.className = 'flex flex-col w-64 overflow-hidden rounded-xl bg-white shadow-2xl';
      popupNode.innerHTML = `
        <div class="relative">
          <img src="${shop.imageUrl}" class="w-full h-32 object-cover" />
          <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-pink-600 shadow-sm">
            ${shop.rating.toFixed(1)} ★
          </div>
        </div>
        <div class="p-4">
          <span class="text-[9px] font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full mb-2 inline-block uppercase tracking-widest">${shop.category}</span>
          <h3 class="font-black text-gray-900 text-base leading-tight mb-1">${shop.name}</h3>
          <p class="text-[11px] text-gray-400 line-clamp-2 mb-4 font-medium">${shop.address}</p>
          <div class="flex items-center justify-between pt-3 border-t border-gray-100">
            <span class="text-sm font-black text-gray-900">${shop.price}</span>
            ${shop.uri ? 
              `<a href="${shop.uri}" target="_blank" class="flex items-center gap-1.5 bg-pink-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-black hover:bg-pink-600 transition-all active:scale-95 shadow-lg shadow-pink-100">
                지도에서 보기
              </a>` : 
              `<span class="text-[10px] text-gray-300 font-bold italic">정보 확인 중</span>`
            }
          </div>
        </div>
      `;

      const marker = L.marker([shop.lat, shop.lng], { icon: markerIcon })
        .addTo(leafletMapRef.current)
        .bindPopup(popupNode);
      
      markersRef.current.push(marker);
    });
  }, [allShops, isLoaded]);

  // New logic to handle location-based search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Step 1: Geocoding via Nominatim (Free OSM API) to find the location coordinate
      const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const geoData = await geoResponse.json();
      
      let searchLat, searchLng;
      
      if (geoData && geoData.length > 0) {
        // We found a location! Move map there first
        searchLat = parseFloat(geoData[0].lat);
        searchLng = parseFloat(geoData[0].lon);
        
        leafletMapRef.current?.flyTo([searchLat, searchLng], 15, { duration: 2 });
        // Step 2: Now fetch shops around that new coordinate
        await fetchRealShops(searchLat, searchLng, searchQuery);
      } else {
        // If not a place name, just search around current map center
        const center = leafletMapRef.current.getCenter();
        await fetchRealShops(center.lat, center.lng, searchQuery);
      }
    } catch (error) {
      console.error("Geocoding or Search failed:", error);
      const center = leafletMapRef.current.getCenter();
      await fetchRealShops(center.lat, center.lng, searchQuery);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchThisArea = () => {
    const center = leafletMapRef.current.getCenter();
    fetchRealShops(center.lat, center.lng);
  };

  const moveToCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        leafletMapRef.current?.flyTo([latitude, longitude], 16, { duration: 1.5 });
        fetchRealShops(latitude, longitude);
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-full text-gray-900 bg-white selection:bg-pink-100 selection:text-pink-600">
      {/* Header */}
      <header className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white/95 backdrop-blur-md z-[1001] shrink-0 sticky top-0">
        <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => window.location.reload()}>
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 p-2 rounded-xl shadow-lg shadow-pink-200 group-hover:scale-110 transition-transform">
            <Sparkles className="text-white" size={20} />
          </div>
          <h1 className="text-pink-500 text-2xl font-black tracking-tighter">마이뷰티맵</h1>
        </div>
        
        <div className="hidden md:flex items-center bg-gray-50 rounded-2xl border border-gray-100 p-1 w-[400px] shadow-inner">
          <div className="flex-1 flex items-center px-3 gap-2">
            <Search size={16} className="text-gray-400" />
            <input 
              type="text"
              placeholder="해운대, 강남역 등 지역 또는 매장 검색..."
              className="w-full py-2 text-sm focus:outline-none bg-transparent font-bold placeholder:text-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button 
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-pink-500 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-pink-600 transition-all active:scale-95 shadow-md shadow-pink-100 disabled:bg-gray-300"
          >
            {isSearching ? <RefreshCw size={14} className="animate-spin" /> : '검색'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="text-gray-500 text-sm font-bold hover:text-pink-500 px-3 py-2 rounded-lg transition-colors">로그인</button>
          <button className="bg-pink-500 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-pink-600 transition-all shadow-xl shadow-pink-100 active:scale-95">
            회원가입
          </button>
        </div>
      </header>

      {/* Main Map Content */}
      <main className="relative flex-1 overflow-hidden">
        <div ref={mapRef} className="w-full h-full z-0" />

        {/* UI Controls Overlay */}
        <div className="absolute inset-0 pointer-events-none z-[1000] flex flex-col p-4">
          
          {/* Top: Category Filters */}
          <div className="flex justify-center md:justify-start">
            <div className="bg-white/90 backdrop-blur-xl p-1.5 rounded-2xl shadow-2xl border border-white/50 flex gap-1 pointer-events-auto overflow-x-auto max-w-full no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value as Category)}
                  className={`
                    flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap
                    ${selectedCategory === cat.value 
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-200 scale-105' 
                      : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-pink-500'
                    }
                  `}
                >
                  <span className="">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Center: Search Area Button */}
          <div className="flex-1 flex items-start justify-center pt-8">
            {mapMoved && !isSearching && (
              <button 
                onClick={handleSearchThisArea}
                className="pointer-events-auto flex items-center gap-2 bg-white text-pink-600 px-6 py-3 rounded-full shadow-2xl border border-pink-100 font-black text-sm hover:bg-pink-50 transition-all active:scale-95 animate-in fade-in slide-in-from-top-4"
              >
                <RefreshCw size={16} />
                이 지역에서 재검색
              </button>
            )}
            {isSearching && (
              <div className="bg-pink-500 text-white px-6 py-3 rounded-full shadow-2xl font-black text-sm flex items-center gap-3 animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                위치 검색 및 뷰티 공간 찾는 중...
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="mt-auto flex justify-between items-end">
            <div className="bg-gray-900/85 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-white/10 text-xs font-black text-white flex items-center gap-3 pointer-events-auto">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
              </div>
              <span>{allShops.length}개의 뷰티 플레이스 발견</span>
            </div>

            <div className="flex flex-col gap-3 pointer-events-auto">
              <button 
                onClick={moveToCurrentLocation}
                title="내 위치로 이동"
                className="w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-pink-500 border border-gray-100 hover:bg-pink-50 active:scale-90 transition-all group"
              >
                <Target size={28} className="group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .custom-marker {
          z-index: 500 !important;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FF385C;
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 8px 15px -3px rgba(255, 56, 92, 0.4);
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .custom-marker div {
          transform: rotate(45deg);
          color: white;
          font-size: 14px;
        }
        .custom-marker:hover {
          transform: rotate(-45deg) scale(1.2);
          z-index: 1000 !important;
        }
        
        .leaflet-popup-content-wrapper {
          padding: 0 !important;
          border-radius: 16px !important;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: 256px !important;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-top-4 { from { transform: translateY(-1rem); } to { transform: translateY(0); } }
        .animate-in { animation: fade-in 0.3s ease-out, slide-in-from-top-4 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
