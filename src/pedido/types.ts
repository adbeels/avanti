export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  state: string;
  notes: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type Step = 'customer' | 'products' | 'summary';
