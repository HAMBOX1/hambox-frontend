export interface CartLineItem {
  id: string;
  title: string;
  imageUrl: string;
  platformIconUrl?: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  instantDelivery: boolean;
}

export interface CartSummary {
  subtotal: number;
  discountLabel: string;
  discountAmount: number;
  tax: number;
  total: number;
  itemCount: number;
}
