
export type Category = '전체' | '네일아트' | '속눈썹' | '메이크업';

export interface BeautyProfessional {
  id: string | number;
  name: string;
  category: Category;
  rating: number;
  reviews: number;
  experience: number; // 경력 연수
  specialties: string[]; // 전문 분야 태그
  lat: number;
  lng: number;
  address: string;
  imageUrl: string;
  bio: string; // 한줄 소개
  priceRange: string;
  kakaoLink?: string; // 카카오톡 상담 링크 추가
}

export interface MapInstance {
    remove: () => void;
}
