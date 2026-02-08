
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Target, 
  Loader2, 
  RefreshCw, 
  AlertCircle,
  Star,
  Award,
  ChevronRight,
  UserPlus,
  X,
  MessageCircle,
  Camera,
  MapPin
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { SAMPLE_PROS, CATEGORIES } from './constants';
import { Category, BeautyProfessional } from './types';

declare const L: any;

const App: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [realPros, setRealPros] = useState<any[]>([]);
  const [registeredPros, setRegisteredPros] = useState<BeautyProfessional[]>([]);
  const [mapMoved, setMapMoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regData, setRegData] = useState({
    name: '',
    category: '네일아트' as Category,
    experience: 3,
    bio: '',
    specialties: '',
    kakaoLink: '',
    priceRange: '50,000원~'
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const apiKey = process.env.API_KEY;

  const allProfessionals = useMemo(() => {
    const filteredSamples = SAMPLE_PROS.filter((pro) => {
      const matchesCategory = selectedCategory === '전체' || pro.category === selectedCategory;
      const matchesSearch = pro.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            pro.specialties.some(s => s.includes(searchQuery));
      return matchesCategory && matchesSearch;
    });

    const transformedReal = realPros.map((rp, idx) => ({
      id: `real-${idx}-${rp.title}`,
      name: rp.title.split(' ')[0] + " 원장",
      category: selectedCategory === '전체' ? '네일아트' : selectedCategory,
      rating: 4.6 + (Math.random() * 0.4),
      reviews: Math.floor(Math.random() * 200) + 10,
      experience: Math.floor(Math.random() * 10) + 3,
      specialties: ["검증된 전문가", "인기 아티스트"],
      lat: rp.location?.lat || 0,
      lng: rp.location?.lng || 0,
      address: rp.address || '상세 주소 확인 중',
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(rp.title)}/400/300`,
      bio: `${rp.title}에서 활동 중인 베테랑 전문가입니다.`,
      priceRange: "상담 후 결정",
      kakaoLink: 'https://open.kakao.com/o/sBeauty'
    })).filter(p => p.lat !== 0);

    const filteredRegistered = registeredPros.filter((pro) => {
        const matchesCategory = selectedCategory === '전체' || pro.category === selectedCategory;
        return matchesCategory;
    });

    return [...filteredRegistered, ...filteredSamples, ...transformedReal];
  }, [selectedCategory, searchQuery, realPros, registeredPros]);

  // AI를 이용한 지역 좌표 검색 (Geocoding)
  const getCoordinatesForQuery = async (query: string) => {
    if (!apiKey) return null;
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const prompt = `주어진 검색어 '${query}'에서 지리적 위치(예: 해운대, 성수동 등)를 파악해서 해당 지역의 위도(latitude)와 경도(longitude)만 JSON 형식으로 반환해줘. 위치 정보가 없으면 현재 지도의 위치를 유지하도록 null을 반환해.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              found: { type: Type.BOOLEAN }
            }
          }
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      return result.found ? { lat: result.lat, lng: result.lng } : null;
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    }
  };

  const fetchRealPros = async (lat: number, lng: number, specificQuery: string = "") => {
    if (!apiKey) {
      setError("API Key가 설정되지 않았습니다.");
      return;
    }
    
    setIsSearching(true);
    setSearchStatus("지역 탐색 중...");
    setError(null);

    let targetLat = lat;
    let targetLng = lng;

    // 만약 검색어에 특정 지역명이 포함된 경우 좌표를 먼저 이동
    if (specificQuery.length > 1) {
      const newCoords = await getCoordinatesForQuery(specificQuery);
      if (newCoords) {
        targetLat = newCoords.lat;
        targetLng = newCoords.lng;
        setSearchStatus(`${specificQuery} 지역으로 이동 중...`);
        leafletMapRef.current?.flyTo([targetLat, targetLng], 15, { duration: 2 });
        // 애니메이션 대기
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setSearchStatus("베테랑 전문가 찾는 중...");
    
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const categoryTerm = selectedCategory === '전체' ? '인기 뷰티 전문가, 네일아트 원장' : selectedCategory + ' 전문가';
      const prompt = `위도 ${targetLat}, 경도 ${targetLng} 근처에서 활동하는 ${categoryTerm}를 찾아줘. ${specificQuery ? `'${specificQuery}' 테마의 실력 있는 전문가 위주로.` : ''} 전문가가 운영하는 스튜디오 정보를 리스팅해줘.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: { retrievalConfig: { latLng: { latitude: targetLat, longitude: targetLng } } }
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsResults = chunks.filter((c: any) => c.maps).map((c: any) => ({
        title: c.maps.title,
        uri: c.maps.uri,
        location: { 
          lat: targetLat + (Math.random() - 0.5) * 0.015, 
          lng: targetLng + (Math.random() - 0.5) * 0.015 
        },
        address: c.maps.title
      }));

      if (mapsResults.length > 0) {
        setRealPros(prev => {
            const combined = [...mapsResults, ...prev];
            const seen = new Set();
            return combined.filter(item => { const k = item.title; return seen.has(k) ? false : seen.add(k); }).slice(0, 40);
        });
      } else {
        setSearchStatus("이 지역에는 검색된 결과가 없습니다.");
        setTimeout(() => setSearchStatus(""), 2000);
      }
    } catch (err: any) { 
      console.error(err);
      setError(err.message || "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally { 
      setIsSearching(false); 
      setSearchStatus("");
    }
  };

  useEffect(() => {
    if (typeof L === 'undefined' || !mapRef.current || leafletMapRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([37.5665, 126.9780], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    map.on('dragend', () => setMapMoved(true));
    map.on('zoomend', () => setMapMoved(true));
    leafletMapRef.current = map;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 15);
        fetchRealPros(latitude, longitude);
      }, () => fetchRealPros(37.5665, 126.9780));
    } else { 
      fetchRealPros(37.5665, 126.9780); 
    }
  }, []);

  useEffect(() => {
    if (!leafletMapRef.current || typeof L === 'undefined') return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    allProfessionals.forEach((pro: any) => {
      const isRegistered = pro.id.toString().startsWith('user');
      const markerIcon = L.divIcon({
        className: 'pro-marker',
        html: `
          <div class="relative group">
            <div class="w-12 h-12 rounded-full border-4 ${isRegistered ? 'border-pink-500' : 'border-white'} shadow-xl overflow-hidden bg-pink-100 transition-transform group-hover:scale-110">
              <img src="${pro.imageUrl}" class="w-full h-full object-cover" />
            </div>
            <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 ${isRegistered ? 'bg-pink-600' : 'bg-pink-500'} text-white text-[8px] px-1.5 py-0.5 rounded-full font-black whitespace-nowrap shadow-md">
              ${isRegistered ? 'MY' : pro.rating.toFixed(1) + ' ★'}
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24], popupAnchor: [0, -24]
      });

      const popupNode = document.createElement('div');
      popupNode.className = 'w-72 overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100';
      popupNode.innerHTML = `
        <div class="relative h-24 bg-gradient-to-r from-pink-400 to-rose-400">
           <img src="${pro.imageUrl}" class="absolute -bottom-6 left-4 w-16 h-16 rounded-2xl border-4 border-white object-cover shadow-lg" />
           <div class="absolute top-2 right-2 bg-white/30 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-widest">
             ${pro.experience}Yrs Experience
           </div>
        </div>
        <div class="p-4 pt-8">
          <div class="flex items-center justify-between mb-1">
            <h3 class="font-black text-gray-900 text-lg">${pro.name}</h3>
            <span class="text-[10px] text-pink-500 font-bold bg-pink-50 px-2 py-0.5 rounded-md">${pro.category}</span>
          </div>
          <p class="text-[11px] text-gray-500 font-medium line-clamp-2 mb-3">"${pro.bio}"</p>
          <div class="flex flex-wrap gap-1 mb-4">
            ${pro.specialties.map((s: string) => `<span class="text-[9px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full border border-gray-100">#${s}</span>`).join('')}
          </div>
          <div class="flex flex-col gap-2">
            <a href="${pro.kakaoLink || '#'}" target="_blank" class="w-full bg-[#FEE500] text-[#3c1e1e] py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-[#F7E111] transition-colors shadow-lg shadow-yellow-100 no-underline">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3c-4.97 0-9 3.134-9 7 0 2.419 1.557 4.542 3.945 5.795l-.999 3.666c-.123.454.414.736.755.433l4.398-3.141c.299.031.603.047.911.047 4.97 0 9-3.134 9-7s-4.03-7-9-7z"/></svg>
              카카오톡 상담하기
            </a>
            <button class="w-full bg-gray-900 text-white py-2.5 rounded-xl text-[10px] font-bold tracking-tight hover:bg-black transition-colors">
              전문가 포트폴리오 보기
            </button>
          </div>
        </div>
      `;

      const marker = L.marker([pro.lat, pro.lng], { icon: markerIcon }).addTo(leafletMapRef.current).bindPopup(popupNode);
      markersRef.current.push(marker);
    });
  }, [allProfessionals]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const center = leafletMapRef.current.getCenter();
    const newPro: BeautyProfessional = {
      id: `user-${Date.now()}`,
      name: regData.name,
      category: regData.category,
      rating: 5.0,
      reviews: 0,
      experience: regData.experience,
      specialties: regData.specialties.split(',').map(s => s.trim()),
      lat: center.lat,
      lng: center.lng,
      address: "현재 위치 기반 등록",
      imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400",
      bio: regData.bio,
      priceRange: regData.priceRange,
      kakaoLink: regData.kakaoLink
    };
    setRegisteredPros(prev => [newPro, ...prev]);
    setIsRegModalOpen(false);
    leafletMapRef.current?.flyTo([center.lat, center.lng], 16);
  };

  return (
    <div className="flex flex-col h-screen w-full text-gray-900 bg-white selection:bg-pink-100 selection:text-pink-600 font-sans overflow-hidden">
      <header className="h-18 border-b border-gray-100 flex items-center justify-between px-6 bg-white z-[1001] shrink-0 sticky top-0 shadow-sm">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 p-2.5 rounded-2xl shadow-xl shadow-pink-100">
            <Sparkles className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-pink-600 text-2xl font-black tracking-tighter leading-none">마이뷰티맵</h1>
            <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Expert Finder</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center bg-gray-50 rounded-2xl border border-gray-100 p-1.5 w-[420px] transition-all focus-within:ring-2 focus-within:ring-pink-100 focus-within:bg-white">
          <div className="flex-1 flex items-center px-3 gap-2">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text"
              placeholder="해운대 네일, 성수 메이크업 등 검색"
              className="w-full py-2 text-sm focus:outline-none bg-transparent font-bold placeholder:text-gray-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchRealPros(leafletMapRef.current.getCenter().lat, leafletMapRef.current.getCenter().lng, searchQuery)}
            />
          </div>
          <button onClick={() => fetchRealPros(leafletMapRef.current.getCenter().lat, leafletMapRef.current.getCenter().lng, searchQuery)} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-black transition-colors">검색</button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsRegModalOpen(true)}
            className="flex items-center gap-2 text-pink-500 bg-pink-50 px-5 py-2.5 rounded-xl text-sm font-black hover:bg-pink-100 transition-colors"
          >
            <UserPlus size={16} />
            전문가 등록
          </button>
          <button className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-2xl shadow-gray-200 active:scale-95 transition-all">
            로그인
          </button>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div ref={mapRef} className="w-full h-full z-0" />

        {error && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[2000] bg-white border border-red-100 text-red-500 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none z-[1000] flex flex-col p-6">
          <div className="flex justify-center md:justify-start">
            <div className="bg-white/80 backdrop-blur-2xl p-2 rounded-3xl shadow-2xl border border-white/50 flex gap-1.5 pointer-events-auto overflow-x-auto no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value as Category)}
                  className={`
                    px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-black transition-all whitespace-nowrap flex items-center gap-2
                    ${selectedCategory === cat.value 
                      ? 'bg-pink-500 text-white shadow-xl shadow-pink-100' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-pink-500'
                    }
                  `}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-start justify-center pt-10">
            {isSearching && (
              <div className="bg-gray-900 text-white px-8 py-4 rounded-full shadow-2xl font-black text-sm flex items-center gap-4 pointer-events-auto animate-pulse">
                <Loader2 size={18} className="animate-spin text-pink-400" /> 
                {searchStatus}
              </div>
            )}
          </div>

          <div className="mt-auto flex justify-between items-end">
            <div className="bg-white/90 backdrop-blur-xl px-8 py-4 rounded-3xl shadow-2xl border border-white/50 pointer-events-auto flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Expert Coverage</span>
              <span className="text-base font-black text-gray-900 flex items-center gap-2">
                <Award size={18} className="text-pink-500" />
                {allProfessionals.length}명의 전문가 활동 중
              </span>
            </div>

            <div className="flex flex-col gap-4 pointer-events-auto">
              <button 
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      leafletMapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 15);
                      fetchRealPros(pos.coords.latitude, pos.coords.longitude);
                    });
                  }
                }}
                className="w-16 h-16 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-pink-500 border border-gray-100 hover:bg-pink-50 transition-all group"
              >
                <Target size={32} className="group-hover:rotate-45 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {isRegModalOpen && (
          <div className="fixed inset-0 z-[2001] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="relative h-24 bg-gradient-to-r from-pink-500 to-rose-500 flex items-center px-8">
                <h2 className="text-white text-2xl font-black">전문가 프로필 등록</h2>
                <button onClick={() => setIsRegModalOpen(false)} className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors">
                  <X size={28} />
                </button>
              </div>
              
              <form onSubmit={handleRegister} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">아티스트 성함</label>
                    <input required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-100 font-bold text-sm" 
                           placeholder="이름을 입력하세요" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">전문 분야</label>
                    <select className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-100 font-bold text-sm appearance-none"
                            value={regData.category} onChange={e => setRegData({...regData, category: e.target.value as Category})}>
                      <option>네일아트</option>
                      <option>속눈썹</option>
                      <option>메이크업</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">한줄 자기소개</label>
                  <input required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-100 font-bold text-sm" 
                         placeholder="고객에게 보여질 한줄 메시지" value={regData.bio} onChange={e => setRegData({...regData, bio: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1 text-pink-500 flex items-center gap-1.5">
                    <MessageCircle size={14} /> 카카오톡 상담 링크 (필수)
                  </label>
                  <input required className="w-full px-5 py-4 rounded-2xl bg-pink-50 border border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-200 font-bold text-sm placeholder:text-pink-200 text-pink-600" 
                         placeholder="오픈채팅 링크 (https://open.kakao.com/...)" value={regData.kakaoLink} onChange={e => setRegData({...regData, kakaoLink: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">경력 연수</label>
                    <input type="number" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-100 font-bold text-sm" 
                           value={regData.experience} onChange={e => setRegData({...regData, experience: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">전문 태그 (쉼표 구분)</label>
                    <input className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-100 font-bold text-sm" 
                           placeholder="웨딩, 아트, 케어 등" value={regData.specialties} onChange={e => setRegData({...regData, specialties: e.target.value})} />
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                    <div className="flex-1 text-[11px] text-gray-400 leading-tight">
                        * 등록 시 지도의 <b>현재 중심점</b>에 전문가 프로필이 생성됩니다.
                    </div>
                    <button type="submit" className="bg-pink-500 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-pink-100 hover:bg-pink-600 transition-all active:scale-95">
                        지금 등록하기
                    </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pro-marker { transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .leaflet-popup-content-wrapper { padding: 0 !important; border-radius: 24px !important; background: transparent !important; box-shadow: none !important; }
        .leaflet-popup-content { margin: 0 !important; width: 288px !important; }
        .leaflet-popup-tip-container { display: none; }
      `}</style>
    </div>
  );
};

export default App;
