export interface OrderSuccessItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  price: number;
}

export interface OrderSuccessDetails {
  orderId: string;
  items: readonly OrderSuccessItem[];
  total: number;
}

export interface OrderRecommendation {
  id: string;
  title: string;
  priceUsd: number;
  imageUrl: string;
}
