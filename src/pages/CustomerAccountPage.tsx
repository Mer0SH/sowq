import { useEffect, useState } from 'react';
import { Heart, Package, RefreshCw, ShoppingBag, Truck } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useCatalog } from '../context/CatalogContext';
import ProductCard from '../components/ProductCard';
import type { CustomerOrder } from '../services/storefrontApi';
import { formatPrice, mediaUrl, storefrontRequest } from '../services/storefrontApi';
import { customerAuth, signOut } from '../services/customerAuth';

type SavedOrder = { id: number; token: string };
const statuses: Record<string, string> = { new: 'جديد', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي' };

export default function CustomerAccountPage() {
  const { navigate, favorites, customerProfile, clearCart } = useApp();
  const { products } = useCatalog();
  const [tab, setTab] = useState<'orders' | 'favorites'>('orders');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    let saved: SavedOrder[] = [];
    try { saved = JSON.parse(localStorage.getItem('souq-customer-orders') || '[]'); }
    catch { setError('تعذر قراءة الطلبات المحفوظة على الجهاز'); }
    Promise.all(saved.map(async entry => {
      try { return await storefrontRequest<CustomerOrder>(`/storefront/orders/${entry.id}`, { headers: { 'x-order-token': entry.token } }); }
      catch { return null; }
    })).then(values => { if (!cancelled) setOrders(values.filter((value): value is CustomerOrder => !!value)); })
      .catch(() => { if (!cancelled) setError('تعذر تحميل الطلبات الآن'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [version]);
  const favoriteProducts = products.filter(product => favorites.includes(product.id));
  return <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-8 sm:pb-16">
    <div className="flex items-center justify-between gap-3"><div><span className="text-xs font-bold text-[#8d7659]">متابعة مشترياتك</span><h1 className="text-3xl font-black text-ink mt-1">حسابي</h1><p className="mt-1 text-sm text-muted">{customerProfile?.name || customerProfile?.email}</p></div><button onClick={() => setVersion(value => value + 1)} className="inline-flex items-center gap-2 text-sm text-brand border border-border bg-white rounded-xl px-4 py-2"><RefreshCw size={15} /> تحديث</button></div>
    <div className="mt-5 flex flex-wrap gap-3"><button onClick={() => window.location.assign('/?onboarding')} className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold">تعديل اهتماماتي</button><button onClick={() => { void signOut(customerAuth).then(() => { clearCart(); navigate('home'); }); }} className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold">تسجيل الخروج</button></div>
    <p className="text-sm text-muted mt-2">تظهر الطلبات المسجلة من هذا الجهاز. احتفظ برقم الطلب عند التواصل مع المتجر.</p>
    <button onClick={() => navigate('admin')} className="mt-5 w-full min-h-12 rounded-xl border border-border bg-white px-5 py-3 text-right text-sm font-bold text-ink">دخول الموظفين والإدارة <span className="float-left text-muted">‹</span></button>
    <div className="flex gap-2 border-b border-border mt-8 mb-7"><button onClick={() => setTab('orders')} className={`flex items-center gap-2 px-5 py-3 text-sm ${tab === 'orders' ? 'border-b-2 border-brand font-bold text-ink' : 'text-muted'}`}><Package size={17} /> طلباتي</button><button onClick={() => setTab('favorites')} className={`flex items-center gap-2 px-5 py-3 text-sm ${tab === 'favorites' ? 'border-b-2 border-brand font-bold text-ink' : 'text-muted'}`}><Heart size={17} /> المفضلة</button></div>
    {tab === 'orders' && (loading ? <p className="text-muted py-16 text-center">جارٍ تحميل الطلبات…</p> : error ? <p role="alert" className="text-red-700 bg-red-50 p-4 rounded-xl">{error}</p> : orders.length ? <div className="space-y-5">{orders.map(order => <article key={order.id} className="border border-border bg-white rounded-2xl overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 p-5 bg-[#f6f7f3]"><div><b className="text-ink">طلب #{order.id}</b><p className="text-xs text-muted mt-1">{new Date(order.created_at).toLocaleDateString('ar-YE')}</p></div><span className="rounded-full bg-white border border-border px-3 py-1 text-xs font-bold">{statuses[order.status] || order.status}</span></div><div className="p-5"><div className="space-y-3">{order.items.map(item => <div key={item.product_id} className="flex items-center gap-3"><img src={mediaUrl(item.image)} alt="" className="w-14 h-14 rounded-lg object-cover bg-[#f1f2ed]" /><div className="flex-1"><b className="block text-sm">{item.name}</b><span className="text-xs text-muted">الكمية: {item.quantity}</span></div><span className="text-sm font-bold">{formatPrice(item.unit_price * item.quantity)}</span></div>)}</div><div className="border-t border-border mt-5 pt-4 flex flex-wrap justify-between gap-3 text-sm"><span className="text-muted flex items-center gap-2"><Truck size={16} /> {order.city}، {order.district}، {order.street} · الدفع عند الاستلام</span><strong>الإجمالي {formatPrice(order.total)}</strong></div></div></article>)}</div> : <div className="text-center bg-white border border-border rounded-2xl py-16 px-5"><ShoppingBag size={40} className="text-muted mx-auto" /><h2 className="font-bold text-lg mt-4">ما عندك طلبات بعد</h2><p className="text-sm text-muted mt-2">الطلبات الجديدة تظهر هنا بعد إتمامها.</p><button onClick={() => navigate('products')} className="mt-6 bg-ink text-white rounded-xl px-6 py-3 text-sm font-bold">تصفح المنتجات</button></div>)}
    {tab === 'favorites' && (favoriteProducts.length ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{favoriteProducts.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="text-center bg-white border border-border rounded-2xl py-16 px-5"><Heart size={40} className="text-muted mx-auto" /><h2 className="font-bold text-lg mt-4">المفضلة فارغة</h2><button onClick={() => navigate('products')} className="mt-6 bg-ink text-white rounded-xl px-6 py-3 text-sm font-bold">اكتشف المنتجات</button></div>)}
  </main>;
}
