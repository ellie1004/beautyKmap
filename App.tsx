
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
  MapPin,
  ExternalLink,
  Info
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
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  const [registeredPros, setRegisteredPros] = useState<BeautyProfessional[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
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

  // 실시간으로 process.env.API_KEY를 안전하게 가져옴
  const getApiKey = () => {
    const key = process.env.API_KEY;
    if (!key || key === "undefined" || key === "" || key.includes("process.env")) return null;
    return key;
  };

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
      specialties: ["검증된 전문가", "AI 탐색"],
      lat: rp.location?.lat || 0,
      lng: rp.location?.lng || 0,
      address: rp.address || '상세 주소 확인 중',
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(rp.title)}/400/300`,
      bio: `${rp.title}에서 활동 중인 전문가입니다.`,
      priceRange: "상담 후 결정",
      kakaoLink: 'https://open.kakao.com/o/sBeauty'
    })).filter(p => p.lat !== 0);

    const filteredRegistered = registeredPros.filter((pro) => {
        const matchesCategory = selectedCategory === '전체' || pro.category === selectedCategory;
        return matchesCategory;
    });

    return [...filteredRegistered, ...filteredSamples, ...transformedReal];
  }, [selectedCategory, searchQuery, realPros, registeredPros]);

  const fetchRealPros = async (lat: number, lng: number, specificQuery: string = "") => {
    const key = getApiKey();
    if (!key) {
      setErrorMessage("API Key가 감지되지 않았습니다. Vercel에서 'Redeploy'를 진행했는지 확인해주세요.");
      return;
    }
    
    setIsSearching(true);
    setSearchStatus("AI 전문가 검색 중...");
    setErrorMessage(null);
    setGroundingSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const categoryTerm = selectedCategory === '전체' ? '인기 뷰티 전문가' : selectedCategory + ' 전문가';
      const prompt = `위도 ${lat}, 경도 ${lng} 주변의 ${categoryTerm}를 찾아줘. ${specificQuery ? `'${specificQuery}' 관련 전문가 위주로.` : ''} 전문가 샵의 이름과 위치 정보를 제공해줘.`;
      
      // Google Maps 도구는 Gemini 2.5 시리즈에서만 지원됩니다.
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } }
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: any[] = [];
      const mapsResults = chunks.filter((c: any) => c.maps).map((c: any) => {
        if (c.maps.uri) sources.push({ title: c.maps.title, uri: c.maps.uri });
        return {
          title: c.maps.title,
          location: { 
            lat: lat + (Math.random() - 0.5) * 0.012, 
            lng: lng + (Math.random() - 0.5) * 0.012 
          },
          address: c.maps.title
        };
      });

      setGroundingSources(sources);
      if (mapsResults.length > 0) {
        setRealPros(mapsResults);
      }
    } catch (err: any) { 
      console.error(err);
      setErrorMessage(err.message || "데이터를 불러오는데 실패했습니다. API Key와 네트워크를 확인해주세요.");
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
          </div>
        `,
        iconSize: [48, 48], iconAnchor: [24, 24], popupAnchor: [0, -24]
      });

      const popupNode = document.createElement('div');
      popupNode.className = 'w-72 overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100';
      popupNode.innerHTML = `
        <div class="relative h-24 bg-gradient-to-r from-pink-400 to-rose-400">
           <img src="${pro.imageUrl}" class="absolute -bottom-6 left-4 w-16 h-16 rounded-2xl border-4 border-white object-cover shadow-lg" />
        </div>
        <div class="p-4 pt-8">
          <div class="flex items-center justify-between mb-1">
            <h3 class="font-black text-gray-900 text-lg">${pro.name}</h3>
            <span class="text-[10px] text-pink-500 font-bold bg-pink-50 px-2 py-0.5 rounded-md">${pro.category}</span>
          </div>
          <p class="text-[11px] text-gray-500 font-medium mb-3">"${pro.bio}"</p>
          <a href="${pro.kakaoLink || '#'}" target="_blank" class="w-full bg-[#FEE500] text-[#3c1e1e] py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 no-underline">
            카카오톡 상담하기
          </a>
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
  };

  return (
    <div className="flex flex-col h-screen w-full text-gray-900 bg-white selection:bg-pink-100 font-sans overflow-hidden">
      <header className="h-20 border-b border-gray-100 flex items-center justify-between px-8 bg-white z-[1001] shrink-0 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="bg-pink-500 p-2.5 rounded-2xl shadow-lg shadow-pink-100">
            <Sparkles className="text-white" size={24} />
          </div>
          <h1 className="text-pink-600 text-2xl font-black tracking-tighter">마이뷰티맵</h1>
        </div>
        
        <div className="hidden md:flex items-center bg-gray-50 rounded-2xl border border-gray-100 p-1.5 w-[450px]">
          <div className="flex-1 flex items-center px-4 gap-2">
            <Search size={20} className="text-gray-400" />
            <input 
              type="text"
              placeholder="강남 네일, 홍대 속눈썹 등 검색"
              className="w-full py-2.5 text-sm focus:outline-none bg-transparent font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchRealPros(leafletMapRef.current.getCenter().lat, leafletMapRef.current.getCenter().lng, searchQuery)}
            />
          </div>
          <button onClick={() => fetchRealPros(leafletMapRef.current.getCenter().lat, leafletMapRef.current.getCenter().lng, searchQuery)} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-xs font-black">검색</button>
        </div>

        <button onClick={() => setIsRegModalOpen(true)} className="flex items-center gap-2 text-pink-500 bg-pink-50 px-6 py-3 rounded-2xl text-sm font-black transition-all hover:scale-105 active:scale-95">
          <UserPlus size={18} /> 전문가 등록
        </button>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div ref={mapRef} className="w-full h-full z-0" />

        {/* 에러 오버레이 */}
        {errorMessage && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[2000] bg-white border-2 border-red-500 px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-md text-center animate-in fade-in slide-in-from-top-4">
            <div className="bg-red-50 p-4 rounded-full"><AlertCircle size={32} className="text-red-500" /></div>
            <p className="font-black text-gray-800 text-lg leading-tight">{errorMessage}</p>
            <button onClick={() => window.location.reload()} className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2">
              <RefreshCw size={18} /> 다시 시도
            </button>
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none z-[1000] flex flex-col p-8">
          <div className="flex justify-center md:justify-start">
            <div className="bg-white/90 backdrop-blur-xl p-2.5 rounded-[2rem] shadow-2xl border border-white flex gap-2 pointer-events-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value as Category)}
                  className={`px-8 py-4 rounded-3xl text-sm font-black transition-all ${selectedCategory === cat.value ? 'bg-pink-500 text-white shadow-xl shadow-pink-100' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-start justify-center pt-12">
            {isSearching && (
              <div className="bg-gray-900 text-white px-10 py-5 rounded-full shadow-2xl font-black flex items-center gap-4 pointer-events-auto">
                <Loader2 size={24} className="animate-spin text-pink-400" /> 
                {searchStatus}
              </div>
            )}
          </div>

          {/* 그라운딩 소스 리스트 (필수 사항) */}
          {groundingSources.length > 0 && (
            <div className="mt-auto mb-6 flex flex-col gap-2 max-w-xs pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                   <Info size={12} /> 데이터 출처 (Google Maps)
                </p>
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
                  {groundingSources.map((source, idx) => (
                    <a key={idx} href={source.uri} target="_blank" className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1">
                      {source.title} <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-end">
            <div className="bg-white/90 backdrop-blur-xl px-10 py-5 rounded-[2.5rem] shadow-2xl border border-white pointer-events-auto">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1">Expert Presence</p>
              <p className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Award size={20} className="text-pink-500" /> {allProfessionals.length}명의 전문가 발견
              </p>
            </div>

            <button 
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    leafletMapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 15);
                    fetchRealPros(pos.coords.latitude, pos.coords.longitude);
                  });
                }
              }}
              className="w-16 h-16 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-pink-500 border border-white pointer-events-auto hover:bg-pink-50 transition-all active:scale-90"
            >
              <Target size={32} />
            </button>
          </div>
        </div>

        {isRegModalOpen && (
          <div className="fixed inset-0 z-[2001] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="h-24 bg-pink-500 flex items-center px-10 justify-between">
                <h2 className="text-white text-2xl font-black">전문가 프로필 등록</h2>
                <button onClick={() => setIsRegModalOpen(false)} className="text-white/80 hover:text-white"><X size={28} /></button>
              </div>
              <form onSubmit={handleRegister} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 ml-1">아티스트 성함</label>
                    <input required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-sm focus:ring-2 focus:ring-pink-100 focus:outline-none" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 ml-1">전문 분야</label>
                    <select className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-sm appearance-none" value={regData.category} onChange={e => setRegData({...regData, category: e.target.value as Category})}>
                      <option>네일아트</option><option>속눈썹</option><option>메이크업</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 ml-1">카카오톡 상담 링크</label>
                  <input required placeholder="https://open.kakao.com/..." className="w-full px-5 py-4 rounded-2xl bg-pink-50 border border-pink-100 font-bold text-sm text-pink-600 focus:outline-none" value={regData.kakaoLink} onChange={e => setRegData({...regData, kakaoLink: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-pink-500 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-pink-100 hover:bg-pink-600 transition-all">등록 완료하기</button>
              </form>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pro-marker { transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .leaflet-popup-content-wrapper { padding: 0 !important; border-radius: 24px !important; }
        .leaflet-popup-content { margin: 0 !important; width: 288px !important; }
        .leaflet-popup-tip-container { display: none; }
      `}</style>
    </div>
  );
};

export default App;
