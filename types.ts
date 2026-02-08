
export type Category = '전체' | '네일아트' | '속눈썹' | '메이크업';

export interface BeautyShop {
  id: number;
  name: string;
  category: Category;
  rating: number;
  reviews: number;
  lat: number;
  lng: number;
  address: string;
  imageUrl: string;
  price: string;
}

export interface MapInstance {
    remove: () => void;
}
