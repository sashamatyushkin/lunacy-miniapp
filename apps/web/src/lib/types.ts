export type Category = { id: string; slug: string; title: string; count: number };

export type Product = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  price: number;
  oldPrice: number | null;
  images: string[];
  specs: Record<string, string>;
  inStock: boolean;
  isPopular: boolean;
  isLimited: boolean;
  /** доминирующий цвет фото — для мягкого свечения под товаром */
  accent?: string;
  category: { slug: string; title: string };
};

export type CartItem = { id: string; productId: string; qty: number; product: Product };
export type Cart = { items: CartItem[]; total: number; count: number };

export type OrderStatus = 'DRAFT' | 'AWAITING_PAYMENT' | 'PAID' | 'SHIPPED' | 'DONE' | 'CANCELLED';

export type Order = {
  id: string;
  number: number;
  status: OrderStatus;
  total: number;
  contactName: string;
  phone: string;
  address: string;
  comment: string | null;
  createdAt: string;
  items: { id: string; title: string; price: number; qty: number }[];
  payment?: { status: string; currency: string; amount: number } | null;
};

export type User = {
  id: string;
  tgId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  isPremium: boolean;
  refCode: string;
  onboardedAt: string | null;
  _count?: { referrals: number; orders: number };
};

export type Story = {
  id: string;
  title: string;
  caption: string | null;
  mediaUrl: string;
  kind: string;
  accent: string;
};

export const money = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
