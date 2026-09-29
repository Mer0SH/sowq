import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Check, CreditCard, Loader2, MapPin, PackageCheck, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { useApp } from '../context/useApp';
import type { PlacedOrder, Quote } from '../services/storefrontApi';
import { formatPrice, mediaUrl, storefrontRequest } from '../services/storefrontApi';

type Address = { name: string; phone: string; city: string; district: string; street: string; note: string };
const emptyAddress: Address = { name: '', phone: '', city: '', district: '', street: '', note: '' };

export default function RealCheckoutPage() {
  const { cartItems, clearCart, navigate } = useApp();
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<PlacedOrder | null>(null);
  const attempt = useRef(crypto.randomUUID());
  const items = cartItems.map(item => ({ product_id: Number(item.product.id), quantity: item.quantity }));
  const cartKey = JSON.stringify(items);
  useEffect(() => {
    if (!items.length || success) return;
    const controller = new AbortController();
    setPricing(true);
    storefrontRequest<Quote>('/storefront/quote', { method: 'POST', body: JSON.stringify({ items, coupon }), signal: controller.signal })
      .then(result => { setQuote(result); setError(''); })
      .catch(err => { if (!controller.signal.aborted) { setQuote(null); setError((err as Error).message); } })
      .finally(() => { if (!controller.signal.aborted) setPricing(false); });
    return () => controller.abort();
  }, [cartKey, coupon, success]);

  async function applyCoupon() {
    const next = couponInput.trim().toUpperCase();
    if (!next) { setCoupon(''); setError(''); return; }
    setPricing(true); setError('');
    try {
      const result = await storefrontRequest<Quote>('/storefront/quote', { method: 'POST', body: JSON.stringify({ items, coupon: next }) });
      setCoupon(next); setQuote(result);
    } catch (err) { setError((err as Error).message); }
    finally { setPricing(false); }
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || busy) return;
    setBusy(true); setError('');
    try {
      const result = await storefrontRequest<PlacedOrder>('/storefront/orders', {
        method: 'POST', body: JSON.stringify({ ...address, items, coupon, payment_method: 'cod', idempotency_key: attempt.current }),
      });
      const key = 'souq-customer-orders';
      const stored = JSON.parse(localStorage.getItem(key) || '[]') as { id: number; token: string }[];
      localStorage.setItem(key, JSON.stringify([{ id: result.id, token: result.access_token }, ...stored.filter(item => item.id !== result.id)].slice(0, 30)));
      setSuccess(result); clearCart();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  if (success) return <main className="max-w-xl mx-auto px-5 py-16 text-center"><div className="w-20 h-20 mx-auto rounded-full bg-[#e4eddd] text-[#526d48] flex items-center justify-center"><Check size={40} /></div><h1 className="text-3xl font-black text-ink mt-6">تم تسجيل طلبك</h1><p className="text-muted mt-3">رقم الطلب <bdi className="font-bold text-ink">#{success.id}</bdi></p><div className="rounded-2xl border border-border bg-white p-6 text-right mt-8"><p className="font-bold text-ink">الدفع عند الاستلام</p><p className="text-sm text-muted mt-2">سنتواصل معك لتأكيد التوصيل. إجمالي الطلب: {formatPrice(success.total)}</p><p className="text-sm text-muted mt-2">يمكنك متابعة حالته من «طلباتي» على هذا الجهاز.</p></div><div className="flex gap-3 mt-6"><button onClick={() => navigate('account')} className="flex-1 bg-ink text-white rounded-xl py-3 font-bold">متابعة الطلب</button><button onClick={() => navigate('home')} className="flex-1 border border-border rounded-xl py-3 font-bold">الرئيسية</button></div></main>;
  if (!cartItems.length) return <main className="max-w-xl mx-auto px-5 py-16 text-center"><ShoppingBag size={42} className="mx-auto text-muted" /><h1 className="font-bold text-2xl mt-4">السلة فارغة</h1><button onClick={() => navigate('products')} className="mt-6 bg-ink text-white px-6 py-3 rounded-xl">تصفح المنتجات</button></main>;

  return <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 sm:pb-14"><div className="mb-8"><span className="text-xs font-bold text-[#8d7659]">خطوة أخيرة</span><h1 className="text-3xl font-black text-ink mt-1">إتمام الطلب</h1><p className="text-sm text-muted mt-2">راجع بياناتك وسيُسجَّل الطلب في لوحة المتجر.</p></div><div className="grid lg:grid-cols-[1fr_370px] gap-6 items-start"><form onSubmit={event => void placeOrder(event)} className="space-y-6"><section className="rounded-2xl border border-border bg-white p-5 sm:p-7"><h2 className="font-bold text-lg flex items-center gap-2"><MapPin size={20} className="text-brand" />عنوان التوصيل</h2><div className="grid sm:grid-cols-2 gap-4 mt-6">{([
    ['name', 'الاسم الكامل', 'text', 'اسم مستلم الطلب'], ['phone', 'رقم الجوال', 'tel', '77XXXXXXX'],
    ['city', 'المدينة', 'text', 'مثال: صنعاء أو عدن'], ['district', 'الحي', 'text', 'اسم الحي'],
    ['street', 'الشارع والعنوان التفصيلي', 'text', 'الشارع وأقرب معلم'],
  ] as const).map(([key, label, type, placeholder]) => <label key={key} className={key === 'street' ? 'sm:col-span-2' : ''}><span className="block text-sm font-medium text-ink mb-2">{label}</span><input required={key !== 'district'} type={type} value={address[key]} onChange={e => setAddress(current => ({ ...current, [key]: e.target.value }))} placeholder={placeholder} className="w-full rounded-xl border border-border bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-brand" dir={key === 'phone' ? 'ltr' : undefined} /></label>)}</div><label className="block mt-4"><span className="block text-sm font-medium mb-2">ملاحظات التوصيل (اختياري)</span><textarea rows={2} value={address.note} onChange={e => setAddress(current => ({ ...current, note: e.target.value }))} className="w-full rounded-xl border border-border bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-brand" /></label></section><section className="rounded-2xl border border-border bg-white p-5 sm:p-7"><h2 className="font-bold text-lg flex items-center gap-2"><CreditCard size={20} className="text-brand" />طريقة الدفع</h2><div className="flex items-center gap-3 border border-[#c4d4b9] bg-[#f4f8f0] rounded-xl p-4 mt-5"><span className="w-5 h-5 rounded-full border-[6px] border-[#536d48] bg-white" /><div><strong className="block text-sm">الدفع عند الاستلام</strong><small className="text-muted">تدفع عند وصول الطلب بعد تأكيده مع المتجر.</small></div></div></section>{error && <div role="alert" className="rounded-xl bg-red-50 text-red-700 p-4 text-sm">{error}</div>}<button type="submit" disabled={!quote || pricing || busy} className="w-full flex items-center justify-center gap-2 bg-[#273428] text-white rounded-xl py-4 font-bold disabled:opacity-50 hover:bg-[#3a513c]">{busy ? <Loader2 size={18} className="animate-spin" /> : <PackageCheck size={18} />}{busy ? 'جارٍ تسجيل الطلب…' : `تأكيد الطلب ${quote ? formatPrice(quote.total) : ''}`}</button><p className="text-xs text-muted flex items-center justify-center gap-2"><ShieldCheck size={14} /> السعر النهائي يُحسب من الخادم قبل تسجيل الطلب</p></form><aside className="rounded-2xl border border-border bg-white p-5 sm:p-6 lg:sticky lg:top-20"><h2 className="font-bold text-lg mb-5">ملخص الطلب</h2><div className="space-y-4">{cartItems.map(item => <div key={`${item.product.id}-${item.selectedColor}-${item.selectedSize}`} className="flex gap-3"><img src={item.product.image} alt="" className="w-16 h-16 rounded-xl object-cover bg-[#f2f3ef]" /><div className="flex-1 min-w-0"><strong className="block text-sm truncate">{item.product.name}</strong><span className="text-xs text-muted">الكمية: {item.quantity}</span></div><b className="text-sm whitespace-nowrap">{formatPrice(quote?.items.find(row => row.product_id === Number(item.product.id))?.unit_price || item.product.price)}</b></div>)}</div><div className="flex gap-2 mt-6"><input value={couponInput} onChange={e => setCouponInput(e.target.value)} placeholder="كود الخصم" className="flex-1 min-w-0 rounded-lg bg-[#f8f9f5] border border-border px-3 py-2 text-sm" dir="ltr" /><button type="button" onClick={() => void applyCoupon()} disabled={pricing} className="rounded-lg border border-border px-4 text-sm font-bold">تطبيق</button></div>{coupon && <p className="text-xs text-[#59784d] mt-2">الكود المطبّق: {coupon}</p>}<div className="border-t border-border mt-6 pt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted">المنتجات</span><b>{quote ? formatPrice(quote.subtotal) : 'جارٍ الحساب…'}</b></div>{!!quote?.discount && <div className="flex justify-between text-[#58774b]"><span>خصم الكوبون</span><b>-{formatPrice(quote.discount)}</b></div>}<div className="flex justify-between"><span className="text-muted">التوصيل</span><b>{quote ? quote.shipping ? formatPrice(quote.shipping) : 'مجانًا' : '—'}</b></div><div className="flex justify-between border-t border-border pt-4 text-base"><strong>الإجمالي</strong><strong>{quote ? formatPrice(quote.total) : '—'}</strong></div></div><p className="mt-6 text-xs text-muted flex items-center gap-2"><Truck size={15} />ستُحدد تفاصيل التوصيل عند تأكيد الطلب.</p><button className="mt-5 text-sm text-brand flex items-center gap-1" onClick={() => navigate('products')}>العودة للتسوق <ArrowLeft size={14} /></button></aside></div></main>;
}
