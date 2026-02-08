
import { BeautyShop } from './types';

export const SAMPLE_SHOPS: BeautyShop[] = [
  // GANGNAM AREA
  {
    id: 1,
    name: "로제 네일 강남점",
    category: "네일아트",
    rating: 4.8,
    reviews: 128,
    lat: 37.4979,
    lng: 127.0276,
    address: "서울특별시 강남구 테헤란로 101",
    imageUrl: "https://images.unsplash.com/photo-1632345033839-22442429f954?auto=format&fit=crop&q=80&w=400",
    price: "45,000원~"
  },
  {
    id: 3,
    name: "글로우 메이크업 스튜디오",
    category: "메이크업",
    rating: 4.7,
    reviews: 210,
    lat: 37.5242,
    lng: 127.0373,
    address: "서울특별시 강남구 압구정로 165",
    imageUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=400",
    price: "80,000원~"
  },
  {
    id: 5,
    name: "루루 속눈썹 & 펌",
    category: "속눈썹",
    rating: 4.5,
    reviews: 42,
    lat: 37.5125,
    lng: 127.0588,
    address: "서울특별시 강남구 영동대로 513",
    imageUrl: "https://images.unsplash.com/photo-1583006503864-4dc025f81831?auto=format&fit=crop&q=80&w=400",
    price: "35,000원~"
  },
  // HONGDAE / MAPO AREA
  {
    id: 2,
    name: "블랑쉬 속눈썹 홍대",
    category: "속눈썹",
    rating: 4.9,
    reviews: 85,
    lat: 37.5562,
    lng: 126.9239,
    address: "서울특별시 마포구 양화로 161",
    imageUrl: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=400",
    price: "50,000원~"
  },
  {
    id: 4,
    name: "아틀리에 네일 홍대",
    category: "네일아트",
    rating: 4.6,
    reviews: 56,
    lat: 37.5511,
    lng: 126.9221,
    address: "서울특별시 마포구 와우산로 94",
    imageUrl: "https://images.unsplash.com/photo-1604902396830-aca29e19b067?auto=format&fit=crop&q=80&w=400",
    price: "40,000원~"
  },
  // SEONGSU / EAST AREA
  {
    id: 7,
    name: "성수 글리터 하우스",
    category: "네일아트",
    rating: 4.9,
    reviews: 320,
    lat: 37.5446,
    lng: 127.0560,
    address: "서울특별시 성동구 아차산로 113",
    imageUrl: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=400",
    price: "55,000원~"
  },
  {
    id: 8,
    name: "무드 메이크업 바",
    category: "메이크업",
    rating: 4.8,
    reviews: 145,
    lat: 37.5450,
    lng: 127.0420,
    address: "서울특별시 성동구 왕십리로 85",
    imageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=400",
    price: "95,000원~"
  }
];

export const CATEGORIES: { label: string; value: string; icon: string }[] = [
  { label: '전체', value: '전체', icon: 'LayoutGrid' },
  { label: '네일아트', value: '네일아트', icon: 'Sparkles' },
  { label: '속눈썹', value: '속눈썹', icon: 'Eye' },
  { label: '메이크업', value: '메이크업', icon: 'User' },
];
