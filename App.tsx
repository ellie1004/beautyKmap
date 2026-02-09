
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
  Info,
  Navigation,
  Compass
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

  // API Key 안전하게 가져오기
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
      rating: 4.7 + (Math.random() * 0.3),
      reviews: Math.floor(Math.random() * 300) + 50,
      experience: Math.floor(Math.random() * 12) + 5,
      specialties: ["AI 검증 전문가", "프리미엄 샵"],
      lat: rp.location?.lat || 0,
      lng: rp.location?.lng || 0,
      address: rp.address || '상세 주소 확인 중',
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(rp.title)}/600/400`,
      bio: `${rp.title}에서 당신만의 무드를 디자인합니다.`,
      priceRange: "예약 시 문의",
      kakaoLink: 'https://open.kakao.com/o/sBeautyMap'
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
      setErrorMessage("API Key가 아직 적용되지 않았습니다. Vercel에서 'Redeploy'를 진행해 주세요.");
      return;
    }
    
    setIsSearching(true);
    setSearchStatus("지도의 전문가를 찾는 중...");
    setErrorMessage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const categoryTerm = selectedCategory === '전체' ? '유명 뷰티 스튜디오' : `${selectedCategory} 전문 샵`;
      const prompt = `위도 ${lat}, 경도 ${lng} 주변의 ${categoryTerm}를 찾아줘. ${specificQuery ? `'${specificQuery}' 테마의 장소 위주로.` : ''} 검색된 장소의 이름과 정확한 위치가 필요해.`;
      
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
            lat: lat + (Math.random() - 0.5) * 0.015, 
            lng: lng + (Math.random() - 0.5) * 0.015 
          },
          address: c.maps.title
        };
      });

      setGroundingSources(sources);
      if (mapsResults.length > 0) {
        setRealPros(mapsResults);
      } else {
        // 결과가 없을 때 샘플 데이터를 주변에 뿌려줌
        setRealPros([]);
      }
    } catch (err: any) { 
      console.error(err);
      setErrorMessage("검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { 
      setIsSearching(false); 
      setSearchStatus("");
    }
  };

  useEffect(() => {
    if (typeof L === 'undefined' || !mapRef.current || leafletMapRef.current) return;
    
    const map = L.map(mapRef.current, { zoomControl: false, scrollWheelZoom: true }).setView([37.5665, 126.9780], 14);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO'
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

    return () => {
        if (leafletMapRef.current) {
            leafletMapRef.current.remove();
            leafletMapRef.current = null;
        }
    };
  }, []);

  useEffect(() => {
    if (!leafletMapRef.current || typeof L === 'undefined') return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    allProfessionals.forEach((pro: any) => {
      const isRegistered = pro.id.toString().startsWith('user');
      const isReal = pro.id.toString().startsWith('real');
      
      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="relative group">
            <div class="marker-container w-14 h-14 rounded-2xl border-[3px] ${isRegistered ? 'border-pink-500 bg-pink-50' : isReal ? 'border-rose-400 bg-rose-50' : 'border-white bg-white'} shadow-2xl overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
              <img src="${pro.imageUrl}" class="w-full h-full object-cover" />
            </div>
            <div class="absolute -top-2 -right-2 bg-pink-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg border-2 border-white">
              ${pro.rating.toFixed(1)}
            </div>
          </div>
        `,
        iconSize: [56, 56], iconAnchor: [28, 56], popupAnchor: [0, -56]
      });

      const popupNode = document.createElement('div');
      popupNode.className = 'expert-popup-card';
      popupNode.innerHTML = `
        <div class="relative h-28 overflow-hidden rounded-t-[20px]">
           <img src="${pro.imageUrl}" class="w-full h-full object-cover" />
           <div class="absolute top-2 right-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[9px] font-black">
             ${pro.experience}년 경력
           </div>
        </div>
        <div class="p-5">
          <div class="flex items-center justify-between mb-1.5">
            <h3 class="font-black text-gray-900 text-lg tracking-tight">${pro.name}</h3>
            <span class="text-[9px] text-pink-500 font-black bg-pink-50 px-2 py-1 rounded-lg uppercase tracking-wider">${pro.category}</span>
          </div>
          <p class="text-[11px] text-gray-500 font-medium mb-4 leading-relaxed line-clamp-2">"${pro.bio}"</p>
          <div class="flex items-center gap-3 mb-4">
            <div class="flex items-center gap-1">
              <span class="text-xs font-black text-gray-900">${pro.rating}</span>
              <span class="text-[10px] text-gray-400 font-bold">★ (${pro.reviews})</span>
            </div>
          </div>
          <a href="${pro.kakaoLink || '#'}" target="_blank" class="flex items-center justify-center gap-2 w-full bg-[#FEE500] text-[#3c1e1e] py-3.5 rounded-xl text-xs font-black no-underline hover:bg-[#F7E111] transition-all shadow-lg shadow-yellow-100/50">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3c-4.97 0-9 3.134-9 7 0 2.419 1.557 4.542 3.945 5.795l-.999 3.666c-.123.454.414.736.755.433l4.398-3.141c.299.031.603.047.911.047 4.97 0 9-3.134 9-7s-4.03-7-9-7z"/></svg>
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
    leafletMapRef.current?.flyTo([center.lat, center.lng], 16);
  };

  return (
    <div className="flex flex-col h-screen w-full text-gray-900 bg-white selection:bg-pink-100 font-sans overflow-hidden">
      {/* 프리미엄 헤더 */}
      <header className="h-20 border-b border-gray-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-[1001] shrink-0 sticky top-0">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.location.reload()}>
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 p-2.5 rounded-2xl shadow-xl shadow-pink-100 group-hover:rotate-12 transition-transform">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-pink-600 text-2xl font-black tracking-tighter leading-none">마이뷰티맵</h1>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Seoul Beauty Finder</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center bg-gray-100/50 rounded-2xl border border-gray-100 p-1.5 w-[480px] focus-within:bg-white focus-within:ring-2 focus-within:ring-pink-100 transition-all">
          <div className="flex-1 flex items-center px-4 gap-2">
            <Search size={20} className="text-gray-400" />
            <input 
              type="text"
              placeholder="강남구 네일, 홍대입구 속눈썹 등 지역+키워드 검색"
              className="w-full py-2.5 text-sm focus:outline-none bg-transparent font-bold placeholder:text-gray-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchRealPros(leafletMapRef.current.getCenter().lat, leafletMapRef.current.getCenter().lng, searchQuery)}
            />
          </div>
          <button onClick={() => fetchRealPros(leafletMapRef.current.getCenter().lat, leafletMapRef.current.getCenter().lng, searchQuery)} className="bg-gray-900 text-white px-7 py-2.5 rounded-xl text-xs font-black hover:bg-black transition-colors">검색</button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsRegModalOpen(true)}
            className="hidden sm:flex items-center gap-2 text-pink-500 bg-pink-50 px-6 py-3 rounded-2xl text-sm font-black transition-all hover:bg-pink-100 active:scale-95"
          >
            <UserPlus size={18} /> 전문가 등록
          </button>
          <button className="bg-gray-900 text-white px-7 py-3.5 rounded-2xl text-sm font-black shadow-xl shadow-gray-200 active:scale-95 transition-all">
            로그인
          </button>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div ref={mapRef} className="w-full h-full z-0" />

        {/* 에러 메시지 알림 */}
        {errorMessage && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[2000] bg-white border-2 border-red-100 px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(220,38,38,0.2)] flex flex-col items-center gap-4 max-w-sm text-center animate-in fade-in slide-in-from-top-4">
            <div className="bg-red-50 p-3 rounded-full animate-bounce"><AlertCircle size={28} className="text-red-500" /></div>
            <div>
                <p className="font-black text-gray-900 text-lg leading-tight mb-1">설정이 더 필요합니다</p>
                <p className="text-sm text-gray-500 font-medium">{errorMessage}</p>
            </div>
            <button onClick={() => window.location.reload()} className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-colors">
              <RefreshCw size={18} /> 페이지 새로고침
            </button>
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none z-[1000] flex flex-col p-8">
          {/* 카테고리 필터 */}
          <div className="flex justify-center md:justify-start">
            <div className="bg-white/90 backdrop-blur-2xl p-2 rounded-[2.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] border border-white flex gap-1 pointer-events-auto overflow-x-auto no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value as Category)}
                  className={`
                    px-8 py-4 rounded-[1.8rem] text-sm font-black transition-all whitespace-nowrap
                    ${selectedCategory === cat.value 
                      ? 'bg-pink-500 text-white shadow-xl shadow-pink-200/50' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-pink-500'}
                  `}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 로딩 표시 */}
          <div className="flex-1 flex items-start justify-center pt-16">
            {isSearching && (
              <div className="bg-gray-900 text-white px-10 py-5 rounded-full shadow-2xl font-black flex items-center gap-4 pointer-events-auto animate-in zoom-in-95">
                <div className="relative">
                    <Loader2 size={24} className="animate-spin text-pink-400" /> 
                    <div className="absolute inset-0 blur-md bg-pink-400/50 animate-pulse"></div>
                </div>
                {searchStatus}
              </div>
            )}
          </div>

          {/* 하단 정보창 및 컨트롤 */}
          <div className="mt-auto flex justify-between items-end">
            <div className="bg-white/95 backdrop-blur-2xl px-10 py-6 rounded-[2.8rem] shadow-2xl border border-white pointer-events-auto">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Nearby Experts</p>
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    <p className="text-xl font-black text-gray-900 tracking-tight">
                        {allProfessionals.length}명의 전문가 활동 중
                    </p>
                </div>
              </div>
              
              {groundingSources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                   <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                     <Compass size={12} className="text-pink-300" /> AI Grounding Sources
                   </p>
                   <div className="flex flex-wrap gap-x-4 gap-y-1">
                     {groundingSources.slice(0, 3).map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" className="text-[11px] font-bold text-blue-500 flex items-center gap-1 hover:underline">
                          {s.title} <ExternalLink size={10} />
                        </a>
                     ))}
                   </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 pointer-events-auto">
                <button 
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        leafletMapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 1.5 });
                        fetchRealPros(pos.coords.latitude, pos.coords.longitude);
                      });
                    }
                  }}
                  className="w-18 h-18 bg-pink-500 text-white rounded-3xl shadow-2xl shadow-pink-200 flex items-center justify-center transition-all hover:bg-pink-600 active:scale-90 group"
                >
                  <Navigation size={36} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
            </div>
          </div>
        </div>

        {/* 전문가 등록 모달 */}
        {isRegModalOpen && (
          <div className="fixed inset-0 z-[2001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="h-28 bg-gradient-to-r from-pink-500 to-rose-500 flex items-center px-10 justify-between">
                <div>
                    <h2 className="text-white text-2xl font-black tracking-tight">전문가 프로필 등록</h2>
                    <p className="text-white/70 text-xs font-bold mt-1">지도의 현재 중심 위치에 등록됩니다.</p>
                </div>
                <button onClick={() => setIsRegModalOpen(false)} className="bg-white/20 p-2 rounded-full text-white hover:bg-white/40 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleRegister} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">아티스트 성함</label>
                    <input required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-sm focus:ring-4 focus:ring-pink-50 focus:border-pink-200 focus:outline-none transition-all" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">전문 분야</label>
                    <div className="relative">
                        <select className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-sm appearance-none focus:ring-4 focus:ring-pink-50 focus:border-pink-200 focus:outline-none transition-all" value={regData.category} onChange={e => setRegData({...regData, category: e.target.value as Category})}>
                            <option>네일아트</option><option>속눈썹</option><option>메이크업</option>
                        </select>
                        <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                    <MessageCircle size={14} className="text-pink-500" /> 카카오톡 상담 링크
                  </label>
                  <input required placeholder="https://open.kakao.com/o/..." className="w-full px-6 py-4 rounded-2xl bg-pink-50/50 border border-pink-100 font-bold text-sm text-pink-600 focus:ring-4 focus:ring-pink-50 focus:outline-none transition-all" value={regData.kakaoLink} onChange={e => setRegData({...regData, kakaoLink: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-pink-500 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-pink-100 hover:bg-pink-600 transition-all active:scale-95 transform">전문가로 데뷔하기</button>
              </form>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .custom-marker { transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .marker-container { box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        
        .leaflet-popup-content-wrapper { padding: 0 !important; border-radius: 20px !important; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25) !important; }
        .leaflet-popup-content { margin: 0 !important; width: 280px !important; }
        .leaflet-popup-tip-container { display: none; }
        
        .expert-popup-card { font-family: 'Pretendard', sans-serif; }
        
        .w-18 { width: 4.5rem; }
        .h-18 { height: 4.5rem; }
      `}</style>
    </div>
  );
};

export default App;
