export type Role = 'owner' | 'catalog' | 'support' | 'fulfillment' | 'accountant';
export type Staff = { id: number; name: string; email: string; role: Role; is_active?: number; categories?: number[] };
export type Category = { id: number; name: string; parent_id: number | null; product_count: number; is_active: number; sort_order: number };
export type Product = { id: number; category_id: number; name: string; description: string; category_name: string; sale_price: number; compare_at_price?: number | null; cost_price?: number | null; stock: number; sku: string | null; is_active: number; brand: string; images: string[]; is_featured: number; is_new: number };
export type Order = { id: number; status: string; total?: number; customer_name: string; customer_phone: string; shipping_company: string | null; tracking_number: string | null; created_at: string; updated_at: string; is_delayed: number };
export type OrderDetail = Order & { city?: string | null; district?: string | null; street?: string | null; address_note?: string | null; payment_method?: string | null; payment_status?: string | null; items: { id: number; product_id: number; name: string; sku: string | null; quantity: number; unit_price?: number }[]; history: { id: number; staff_name: string | null; from_status: string; to_status: string; note: string | null; created_at: string }[]; allowed_statuses: string[] };
export type Audit = { id: number; staff_name: string; action: string; entity: string; entity_id: number; created_at: string; changes: string | null };
export type Dashboard = { new_orders: number | null; delayed_orders: number | null; low_stock: number | null; product_count: number | null; recent_orders: Order[]; low_stock_products: Product[] };
const base = (import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'mobile' ? 'https://soow-2dc12.web.app/api' : import.meta.env.PROD ? '/api' : 'http://localhost:4000')).replace(/\/$/, '');
export async function adminRequest<T>(path: string, token = '', method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('تعذر الاتصال بالخادم. تأكد من تشغيله ثم أعد المحاولة.');
  }
  if (response.status === 401 && token) window.dispatchEvent(new Event('admin-session-expired'));
  const result = await response.json().catch(() => { throw new Error('الخادم أعاد استجابة غير متوقعة'); });
  if (!response.ok || !result.ok) throw new Error(result.error || 'تعذر إتمام الطلب');
  return result.data as T;
}
