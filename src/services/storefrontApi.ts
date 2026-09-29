import type { Product } from '../data/products';

export const apiBase = (import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'mobile' ? 'https://soow-2dc12.web.app/api' : import.meta.env.PROD ? '/api' : 'http://localhost:4000')).replace(/\/$/, '');
export const formatPrice = (value: number) => `YER ${value.toLocaleString('en-US')}`;
export const mediaUrl = (value: string) => value.startsWith('/media/') ? `${apiBase}${value}` : value;

export type LinkType = 'none' | 'products' | 'product' | 'category';
export type HomeContent = {
  hero: { eyebrow: string; title: string; description: string; theme?: 'light' | 'dark'; desktopImage: string; mobileImage: string; productId?: number | null; buttonLabel: string; linkType: LinkType; linkId: string };
  announcements: { id: string; text: string; enabled: boolean; linkType: LinkType; linkId: string }[];
  banners: { id: string; title: string; subtitle: string; image: string; enabled: boolean; startsAt?: string | null; endsAt?: string | null; linkType: LinkType; linkId: string }[];
  sections: { id: 'categories' | 'new' | 'featured'; title: string; enabled: boolean; limit: number }[];
};
export type Quote = { items: { product_id: number; name: string; quantity: number; unit_price: number; regular_price: number; image: string }[]; subtotal: number; discount: number; shipping: number; total: number; currency: 'YER' };
export type PlacedOrder = { id: number; total: number; access_token: string; currency: 'YER'; payment_method: 'cod' };
export type CustomerOrder = { id: number; status: string; total: number; city: string; district: string; street: string; payment_method: string; created_at: string; customer_name: string; customer_phone: string; items: { product_id: number; name: string; quantity: number; unit_price: number; image: string }[] };

export async function storefrontRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const result = await response.json().catch(() => ({ ok: false, error: 'استجابة الخادم غير صالحة' }));
  if (!response.ok || !result.ok) throw new Error(result.error || 'تعذر الاتصال بالمتجر');
  return result.data as T;
}

export function adaptProduct(product: Product): Product {
  return { ...product, image: mediaUrl(product.image), images: product.images.map(mediaUrl) };
}

export async function uploadMedia(file: File, token: string): Promise<string> {
  const response = await fetch(`${apiBase}/admin/media`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type }, body: file,
  });
  const result = await response.json().catch(() => ({ ok: false, error: 'فشل رفع الصورة' }));
  if (!response.ok || !result.ok) throw new Error(result.error || 'فشل رفع الصورة');
  return result.data.url;
}
