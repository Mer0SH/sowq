import { useState } from 'react';
import { Package, Heart, MapPin, Settings, LogOut, ChevronLeft, Loader2, Eye, EyeOff, Star, Check } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useCatalog } from '../context/CatalogContext';
import ProductCard from '../components/ProductCard';

const tabs = [
  { id: 'orders', label: 'طلباتي', icon: Package },
  { id: 'favorites', label: 'المفضلة', icon: Heart },
  { id: 'addresses', label: 'العناوين', icon: MapPin },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

const mockOrders = [
  {
    id: 'SLM-847291',
    date: '18 سبتمبر 2026',
    status: 'shipped',
    statusLabel: 'تم الشحن',
    total: 770,
    items: 2,
  },
  {
    id: 'SLM-721039',
    date: '10 سبتمبر 2026',
    status: 'delivered',
    statusLabel: 'تم التسليم',
    total: 450,
    items: 1,
  },
  {
    id: 'SLM-604817',
    date: '2 سبتمبر 2026',
    status: 'processing',
    statusLabel: 'قيد المعالجة',
    total: 1230,
    items: 3,
  },
  {
    id: 'SLM-519283',
    date: '20 أغسطس 2026',
    status: 'cancelled',
    statusLabel: 'ملغي',
    total: 320,
    items: 1,
  },
];

const statusStyles: Record<string, string> = {
  processing: 'bg-warning-bg text-warning',
  shipped: 'bg-brand-50 text-brand-600',
  delivered: 'bg-success-bg text-success',
  cancelled: 'bg-danger-bg text-danger',
};

function ToggleRow({ label, desc, defaultOn }: { label: string; desc: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        className={`w-10 h-5 rounded-full relative transition-colors ${on ? 'bg-brand' : 'bg-border'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function SettingsTab() {
  return (
    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <h2 className="font-bold text-ink mb-4">الإعدادات</h2>
      <div className="bg-white border border-border rounded-xl divide-y divide-border">
        <ToggleRow label="إشعارات الطلبات" desc="تلقي تحديثات عن طلباتك" defaultOn={true} />
        <ToggleRow label="إشعارات العروض" desc="تنبيهات بالخصومات والعروض" defaultOn={false} />
        <ToggleRow label="النشرة البريدية" desc="أحدث المنتجات والمجموعات" defaultOn={true} />
        <div className="p-4">
          <button className="text-sm text-danger hover:underline font-medium">حذف الحساب</button>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { products } = useCatalog();
  const { isLoggedIn, setIsLoggedIn, favorites, navigate, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('orders');

  /* Login state */
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'otp'>('credentials');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginInput.trim()) {
      setLoginError('يرجى إدخال رقم الجوال أو البريد');
      return;
    }
    setIsLoading(true);
    setLoginError('');
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    setLoginStep('otp');
    showToast('تم إرسال رمز التحقق', 'info');
  }

  async function handleOtp() {
    const code = otp.join('');
    if (code.length < 4) return;
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsLoading(false);
    setIsLoggedIn(true);
    showToast('أهلاً بك في سوق!');
  }

  function handleOtpChange(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 3) {
      document.getElementById(`otp-${i + 1}`)?.focus();
    }
  }

  /* Not logged in */
  if (!isLoggedIn) {
    return (
      <main className="page-transition max-w-sm mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-brand">س</span>
          </div>
          <h1 className="text-xl font-bold text-ink mb-1">تسجيل الدخول</h1>
          <p className="text-sm text-muted">ادخل للوصول إلى طلباتك ومفضلتك</p>
        </div>

        {loginStep === 'credentials' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Method toggle */}
            <div className="flex bg-surface rounded-xl p-1">
              {[{ id: 'phone', label: 'جوال' }, { id: 'email', label: 'بريد إلكتروني' }].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLoginMethod(m.id as 'phone' | 'email')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
                    ${loginMethod === m.id ? 'bg-white shadow-sm text-ink' : 'text-muted'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div>
              <input
                type={loginMethod === 'phone' ? 'tel' : 'email'}
                placeholder={loginMethod === 'phone' ? '05XXXXXXXX' : 'example@email.com'}
                value={loginInput}
                onChange={(e) => { setLoginInput(e.target.value); setLoginError(''); }}
                className={`w-full h-12 bg-white border rounded-xl px-4 text-sm outline-none transition-all
                  ${loginError ? 'border-danger focus:ring-2 focus:ring-danger/20' : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
              />
              {loginError && <p className="text-xs text-danger mt-1">{loginError}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-ink text-white rounded-xl font-bold text-sm hover:bg-brand transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {isLoading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
            </button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted">أو</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={() => { setIsLoggedIn(true); showToast('تم الدخول كضيف'); }}
              className="w-full py-3 border border-border rounded-xl text-sm font-medium text-ink hover:bg-surface transition-colors"
            >
              متابعة كضيف
            </button>

            <p className="text-center text-xs text-muted">
              بالدخول توافق على{' '}
              <a href="#" className="text-brand underline">الشروط والأحكام</a>
              {' '}و{' '}
              <a href="#" className="text-brand underline">سياسة الخصوصية</a>
            </p>
          </form>
        ) : (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <p className="text-center text-sm text-muted mb-6">
              أرسلنا رمز التحقق إلى <span className="font-medium text-ink">{loginInput}</span>
            </p>

            <div className="flex items-center justify-center gap-3 mb-6" dir="ltr">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                    border-border focus:border-brand focus:ring-2 focus:ring-brand/20 bg-white"
                />
              ))}
            </div>

            <button
              onClick={handleOtp}
              disabled={otp.join('').length < 4 || isLoading}
              className="w-full py-3.5 bg-ink text-white rounded-xl font-bold text-sm hover:bg-brand transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {isLoading ? 'جاري التحقق...' : 'تأكيد الرمز'}
            </button>

            <button
              onClick={() => setLoginStep('credentials')}
              className="w-full text-center text-sm text-muted hover:text-ink mt-3 transition-colors"
            >
              تغيير رقم الجوال
            </button>
          </div>
        )}
      </main>
    );
  }

  /* Logged in */
  const favProducts = products.filter((p) => favorites.includes(p.id));

  return (
    <main className="page-transition max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8">
      {/* User header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center text-white font-bold text-lg">
            س
          </div>
          <div>
            <p className="font-bold text-ink">سارة المحمد</p>
            <p className="text-sm text-muted">sara@example.com</p>
          </div>
        </div>
        <button
          onClick={() => { setIsLoggedIn(false); showToast('تم تسجيل الخروج', 'info'); }}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-danger transition-colors"
        >
          <LogOut size={15} />
          خروج
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs (desktop) */}
        <aside className="hidden sm:block w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${activeTab === id ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface hover:text-ink'}`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="sm:hidden w-full mb-4">
          <div className="flex overflow-x-auto gap-2 pb-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${activeTab === id ? 'bg-ink text-white' : 'bg-white border border-border text-ink-soft'}`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Orders */}
          {activeTab === 'orders' && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <h2 className="font-bold text-ink mb-4">طلباتي</h2>
              {mockOrders.length === 0 ? (
                <div className="text-center py-16">
                  <Package size={48} className="text-muted mx-auto mb-3" />
                  <p className="text-ink font-medium mb-1">لا توجد طلبات بعد</p>
                  <p className="text-sm text-muted mb-4">تصفح منتجاتنا وأطلب ما يعجبك</p>
                  <button onClick={() => navigate('products')} className="px-6 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand transition-colors">
                    تسوق الآن
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {mockOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-ink text-sm">{order.id}</p>
                          <p className="text-xs text-muted mt-0.5">{order.date} · {order.items} منتج</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${statusStyles[order.status]}`}>
                          {order.statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">{order.total.toLocaleString('ar-SA')} ر.س</span>
                        <button className="flex items-center gap-1 text-sm text-brand hover:underline">
                          التفاصيل
                          <ChevronLeft size={14} />
                        </button>
                      </div>
                      {order.status === 'shipped' && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brand" />
                            <p className="text-xs text-brand font-medium">الطلب في الطريق إليك</p>
                          </div>
                          <div className="flex items-center gap-3 mt-2 overflow-x-auto pb-1">
                            {['تم الطلب', 'قيد التحضير', 'تم الشحن', 'التسليم'].map((s, i) => (
                              <div key={s} className="flex items-center gap-1.5 shrink-0">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                                  ${i <= 2 ? 'bg-brand text-white' : 'bg-surface border border-border text-muted'}`}>
                                  {i <= 2 ? <Check size={11} strokeWidth={3} /> : i + 1}
                                </div>
                                <span className={`text-[10px] ${i <= 2 ? 'text-ink font-medium' : 'text-muted'}`}>{s}</span>
                                {i < 3 && <div className={`w-4 h-px ${i < 2 ? 'bg-brand' : 'bg-border'}`} />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Favorites */}
          {activeTab === 'favorites' && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <h2 className="font-bold text-ink mb-4">المفضلة ({favProducts.length})</h2>
              {favProducts.length === 0 ? (
                <div className="text-center py-16">
                  <Heart size={48} className="text-muted mx-auto mb-3" />
                  <p className="text-ink font-medium mb-1">المفضلة فارغة</p>
                  <p className="text-sm text-muted mb-4">احفظ منتجاتك المفضلة هنا</p>
                  <button onClick={() => navigate('products')} className="px-6 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand transition-colors">
                    تصفح المنتجات
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {favProducts.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </div>
          )}

          {/* Addresses */}
          {activeTab === 'addresses' && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-ink">عناوين التوصيل</h2>
                <button className="text-sm text-brand hover:underline">+ إضافة عنوان</button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'المنزل', city: 'الرياض', details: 'حي النرجس، شارع السلام، رقم 15', isDefault: true },
                  { label: 'العمل', city: 'الرياض', details: 'حي العليا، برج المملكة، الطابق 8', isDefault: false },
                ].map((addr) => (
                  <div key={addr.label} className="bg-white border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin size={15} className="text-brand shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-ink text-sm">{addr.label}</p>
                            {addr.isDefault && (
                              <span className="text-[10px] bg-brand-50 text-brand-600 border border-brand-100 px-1.5 py-0.5 rounded font-medium">
                                افتراضي
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted mt-0.5">{addr.city} — {addr.details}</p>
                        </div>
                      </div>
                      <button className="text-xs text-muted hover:text-ink transition-colors">تعديل</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </main>
  );
}
