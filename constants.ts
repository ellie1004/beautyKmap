
import { BeautyProfessional } from './types';

export const SAMPLE_PROS: BeautyProfessional[] = [
  {
    id: 1,
    name: "유진 아티스트",
    category: "네일아트",
    rating: 4.9,
    reviews: 156,
    experience: 8,
    specialties: ["웨딩네일", "오마카세아트", "손톱교정"],
    lat: 37.4979,
    lng: 127.0276,
    address: "강남역 11번 출구 인근 스튜디오",
    imageUrl: "https://images.unsplash.com/photo-1595078475328-1ab05d0a6a0e?auto=format&fit=crop&q=80&w=400",
    bio: "섬세한 붓 터치로 당신만의 무드를 담아냅니다.",
    priceRange: "50,000원~"
  },
  {
    id: 2,
    name: "지우 원장",
    category: "메이크업",
    rating: 4.8,
    reviews: 89,
    experience: 12,
    specialties: ["퍼스널컬러", "면접메이크업", "데일리"],
    lat: 37.5242,
    lng: 127.0373,
    address: "압구정 로데오 개인 작업실",
    imageUrl: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=400",
    bio: "타고난 본연의 아름다움을 극대화하는 내추럴 메이크업 전문입니다.",
    priceRange: "120,000원~"
  },
  {
    id: 3,
    name: "카리나 디자이너",
    category: "속눈썹",
    rating: 4.7,
    reviews: 210,
    experience: 5,
    specialties: ["속눈썹펌", "LED연장", "언더래쉬"],
    lat: 37.5562,
    lng: 126.9239,
    address: "홍대입구역 도보 5분 뷰티룸",
    imageUrl: "https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?auto=format&fit=crop&q=80&w=400",
    bio: "이물감 없는 편안함, 눈매 맞춤형 디자인을 약속합니다.",
    priceRange: "40,000원~"
  },
  {
    id: 4,
    name: "도윤 마스터",
    category: "네일아트",
    rating: 5.0,
    reviews: 42,
    experience: 10,
    specialties: ["캐릭터아트", "문제성발톱", "드릴케어"],
    lat: 37.5446,
    lng: 127.0560,
    address: "성수동 연무장길 프라이빗 룸",
    imageUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400",
    bio: "기술 그 이상의 예술을 손끝에 완성합니다.",
    priceRange: "70,000원~"
  }
];

export const CATEGORIES: { label: string; value: string; icon: string }[] = [
  { label: '전체 전문가', value: '전체', icon: 'LayoutGrid' },
  { label: '네일 아티스트', value: '네일아트', icon: 'Sparkles' },
  { label: '아이 디자이너', value: '속눈썹', icon: 'Eye' },
  { label: '메이크업 아티스트', value: '메이크업', icon: 'User' },
];
