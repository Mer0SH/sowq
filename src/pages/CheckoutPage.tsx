import { useEffect, useState } from 'react';
import { Check, ChevronRight, Loader2, MapPin, Truck, CreditCard, CopyCheck, ShoppingCart } from 'lucide-react';
import { useApp } from '../context/useApp';
import { formatPrice, storefrontRequest } from '../services/storefrontApi';
import type { PlacedOrder, Quote } from '../services/storefrontApi';

const steps = [
  { id: 1, label: 'العنوان', icon: MapPin },
  { id: 2, label: 'الشحن', icon: Truck },
  { id: 3, label: 'الدفع', icon: CreditCard },
];

const cities = ['صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'ذمار', 'المكلا', 'سيئون', 'مأرب', 'البيضاء', 'عمران', 'صعدة', 'لحج', 'أبين', 'الضالع', 'حجة'];

export default function CheckoutPage() {
  const { cartItems, clearCart, navigate, showToast } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(true);

  const [address, setAddress] = useState({
    name: '', phone: '', city: '', district: '', street: '', notes: '',
  });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const items = cartItems.map(item => ({ product_id: Number(item.product.id), quantity: item.quantity }));
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (!items.length) { setQuote(null); setQuoteLoading(false); return; }
    let active = true;
    setQuoteLoading(true);
    storefrontRequest<Quote>('/storefront/quote', { method: 'POST', body: JSON.stringify({ items, coupon: appliedCoupon }) })
      .then(result => { if (active) { setQuote(result); setQuoteError(''); } })
      .catch(error => { if (active) { setQuote(null); setQuoteError((error as Error).message); } })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [itemsKey, appliedCoupon]);

  function validateAddress() {
    const errs: Record<string, string> = {};
    if (!address.name.trim()) errs.name = 'الاسم مطلوب';
    if (!/^\+?[0-9]{7,15}$/.test(address.phone.trim())) errs.phone = 'رقم الجوال غير صحيح';
    if (!address.city) errs.city = 'يرجى اختيار المدينة';
    if (address.street.trim().length < 3) errs.street = 'الشارع مطلوب';
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (currentStep === 1 && !validateAddress()) return;
    if (currentStep < 3) setCurrentStep((s) => s + 1);
  }

  async function handleApplyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) { setAppliedCoupon(''); setCouponError(''); return; }
    try {
      const result = await storefrontRequest<Quote>('/storefront/quote', { method: 'POST', body: JSON.stringify({ items, coupon: code }) });
      setQuote(result); setAppliedCoupon(code); setCouponError('');
      showToast('تم تطبيق كود الخصم');
    } catch (error) { setCouponError((error as Error).message); setAppliedCoupon(''); }
  }

  async function handlePlaceOrder() {
    if (!validateAddress() || !quote || quoteLoading || isLoading) return;
    setIsLoading(true);
    try {
      const result = await storefrontRequest<PlacedOrder>('/storefront/orders', {
        method: 'POST', body: JSON.stringify({ items, coupon: appliedCoupon, name: address.name.trim(), phone: address.phone.trim(), city: address.city, district: address.district.trim(), street: address.street.trim(), note: address.notes.trim(), payment_method: 'cod', idempotency_key: idempotencyKey }),
      });
      setPlacedOrder(result); setIsSuccess(true); clearCart();
    } catch (error) { showToast((error as Error).message, 'error'); }
    finally { setIsLoading(false); }
  }

  if (cartItems.length === 0 && !isSuccess) {
    return (
      <main className="page-transition max-w-xl mx-auto px-4 py-16 text-center">
        <ShoppingCart size={44} strokeWidth={1.4} className="mx-auto text-muted mb-4" />
        <h1 className="text-xl font-bold text-ink mb-2">السلة فارغة</h1>
        <p className="text-muted mb-6">أضف منتجات للسلة أولاً قبل إتمام الدفع</p>
        <button
          onClick={() => navigate('products')}
          className="px-8 py-3 bg-ink text-white rounded-xl font-medium hover:bg-brand transition-colors"
        >
          تصفح المنتجات
        </button>
      </main>
    );
  }

  /* ── Order success ────────────────────────────────── */
  if (isSuccess) {
    return (
      <main className="page-transition max-w-lg mx-auto px-4 py-16 text-center">
        <div
          className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ animation: 'fadeIn 0.5s ease-out' }}
        >
          <Check size={36} className="text-white" strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">تم تأكيد طلبك!</h1>
        <p className="text-muted mb-1">شكراً لك على ثقتك بسوق</p>
        <p className="text-sm text-muted mb-6">رقم الطلب: <span className="font-bold text-ink">{placedOrder?.id}</span></p>

        <div className="bg-white border border-border rounded-xl p-5 text-right mb-6">
          <h3 className="font-bold text-ink mb-3 text-sm">تفاصيل التوصيل</h3>
          <p className="text-sm text-ink-soft mb-1">{address.name} — {address.phone}</p>
          <p className="text-sm text-ink-soft mb-3">{address.city}، {address.district}، {address.street}</p>
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full" />
              <p className="text-sm text-success font-medium">تم استلام الطلب</p>
            </div>
            <div className="flex gap-2 mt-1.5 mr-4">
              <div className="w-0.5 bg-border" />
              <div>
                <p className="text-xs text-muted">الدفع عند الاستلام · الإجمالي {formatPrice(placedOrder?.total || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('home')}
            className="flex-1 py-3 bg-ink text-white rounded-xl font-medium hover:bg-brand transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-transition max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8">
      <h1 className="text-xl font-bold text-ink mb-6">إتمام الطلب</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isDone = currentStep > step.id;
          const isActive = currentStep === step.id;
          return (
            <div key={step.id} className="flex items-center shrink-0">
              <div className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-all
                ${isActive ? 'bg-ink text-white' : isDone ? 'bg-success/10 text-success' : 'text-muted'}
              `}>
                {isDone ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight size={14} className={`mx-1 rotate-180 ${isDone ? 'text-success' : 'text-border'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* ── Form ──────────────────────────────────────── */}
        <div className="bg-white border border-border rounded-xl p-5 sm:p-6">
          {/* Step 1: Address */}
          {currentStep === 1 && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <h2 className="font-bold text-ink mb-5">عنوان التوصيل</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: 'الاسم الكامل', key: 'name', placeholder: 'مثال: سارة أحمد', type: 'text' },
                  { label: 'رقم الجوال', key: 'phone', placeholder: '05XXXXXXXX', type: 'tel' },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={address[key as keyof typeof address]}
                      onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
                      className={`w-full h-11 bg-surface border rounded-xl px-3 text-sm outline-none transition-all
                        ${addressErrors[key] ? 'border-danger focus:ring-2 focus:ring-danger/20' : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'}
                      `}
                    />
                    {addressErrors[key] && <p className="text-xs text-danger mt-1">{addressErrors[key]}</p>}
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">المدينة</label>
                  <select
                    value={address.city}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    className={`w-full h-11 bg-surface border rounded-xl px-3 text-sm outline-none appearance-none cursor-pointer transition-all
                      ${addressErrors.city ? 'border-danger' : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'}
                    `}
                  >
                    <option value="">اختر المدينة</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {addressErrors.city && <p className="text-xs text-danger mt-1">{addressErrors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">الحي</label>
                  <input
                    type="text"
                    placeholder="اسم الحي"
                    value={address.district}
                    onChange={(e) => setAddress((a) => ({ ...a, district: e.target.value }))}
                    className="w-full h-11 bg-surface border border-border rounded-xl px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-ink mb-1.5">الشارع والرقم</label>
                  <input
                    type="text"
                    placeholder="اسم الشارع، رقم المبنى"
                    value={address.street}
                    onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                    className={`w-full h-11 bg-surface border rounded-xl px-3 text-sm outline-none transition-all
                      ${addressErrors.street ? 'border-danger' : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'}
                    `}
                  />
                  {addressErrors.street && <p className="text-xs text-danger mt-1">{addressErrors.street}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-ink mb-1.5">ملاحظات (اختياري)</label>
                  <textarea
                    placeholder="مثال: بجانب المسجد، الطابق الثاني..."
                    rows={2}
                    value={address.notes}
                    onChange={(e) => setAddress((a) => ({ ...a, notes: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Shipping */}
          {currentStep === 2 && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <h2 className="font-bold text-ink mb-5">التوصيل</h2>
              <div className="border-2 border-brand bg-brand-50 rounded-xl p-4 flex justify-between gap-3">
                <div><p className="font-medium text-ink text-sm">التوصيل إلى {address.city}</p><p className="text-xs text-muted mt-1">تُعرض رسوم التوصيل النهائية في ملخص الطلب.</p></div>
                <span className="font-bold text-ink text-sm">{quote ? formatPrice(quote.shipping) : '—'}</span>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <h2 className="font-bold text-ink mb-5">طريقة الدفع</h2>
              <div className="border-2 border-brand bg-brand-50 rounded-xl p-4">
                <p className="font-medium text-ink text-sm">الدفع عند الاستلام</p>
                <p className="text-xs text-muted mt-1">ادفع عند وصول الطلب.</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-6">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-5 py-3 border border-border rounded-xl text-sm font-medium text-ink hover:bg-surface transition-colors"
              >
                السابق
              </button>
            )}
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="flex-1 py-3 bg-ink text-white rounded-xl font-bold text-sm hover:bg-brand transition-colors active:scale-[0.98]"
              >
                التالي
              </button>
            ) : (
              <button
                onClick={handlePlaceOrder}
                disabled={isLoading || quoteLoading || !quote}
                className="flex-1 py-3 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-colors active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <CopyCheck size={18} />
                    تأكيد الطلب ({quote ? formatPrice(quote.total) : 'جارٍ حساب السعر'})
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Order summary ─────────────────────────────── */}
        <div>
          <div className="bg-white border border-border rounded-xl p-5 sticky top-24">
            <h2 className="font-bold text-ink mb-4">ملخص الطلب</h2>

            <div className="space-y-3 max-h-52 overflow-y-auto mb-4">
                  {cartItems.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface shrink-0">
                    <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink line-clamp-2">{item.product.name}</p>
                    <p className="text-xs text-muted">×{item.quantity}</p>
                  </div>
                  <span className="text-xs font-bold text-ink shrink-0">
                    {formatPrice((quote?.items.find(row => row.product_id === Number(item.product.id))?.unit_price ?? item.product.price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="كود الخصم"
                  value={coupon}
                  onChange={(e) => { setCoupon(e.target.value); setCouponError(''); if (appliedCoupon) setAppliedCoupon(''); }}
                  className={`flex-1 h-9 bg-surface border rounded-lg px-3 text-sm outline-none transition-all
                    ${couponError ? 'border-danger' : appliedCoupon ? 'border-success' : 'border-border focus:border-brand'}`}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={Boolean(appliedCoupon)}
                  className="h-9 px-3 bg-surface border border-border rounded-lg text-xs font-medium text-ink hover:bg-brand hover:text-white hover:border-brand transition-colors disabled:opacity-50"
                >
                  {appliedCoupon ? '✓ مطبّق' : 'تطبيق'}
                </button>
              </div>
              {couponError && <p className="text-xs text-danger mt-1">{couponError}</p>}
              {appliedCoupon && <p className="text-xs text-success mt-1">تم تطبيق {appliedCoupon}</p>}
              {quoteError && <p className="text-xs text-danger mt-1">{quoteError}</p>}
            </div>

            {/* Totals */}
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">المجموع الفرعي</span>
                <span className="text-ink">{quote ? formatPrice(quote.subtotal) : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">التوصيل</span>
                <span className="text-ink">{quote ? formatPrice(quote.shipping) : '—'}</span>
              </div>
              {quote && quote.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-success">خصم الكوبون</span>
                  <span className="text-success">-{formatPrice(quote.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-bold text-base border-t border-border pt-2 mt-2">
                <span className="text-ink">الإجمالي</span>
                <span className="text-ink">{quote ? formatPrice(quote.total) : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
