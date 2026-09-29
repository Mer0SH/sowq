import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { LayoutDashboard, Package, Layers, ShoppingBag, History, LogOut, ArrowUpLeft, Plus, RefreshCw, Search, Users, ChevronLeft, ChevronRight, Pencil, ShieldCheck, Clock3, Boxes, Truck, Headphones, ChartNoAxesCombined, Menu, X, BadgePercent, PanelsTopLeft, Moon, Sun, Eye, EyeOff } from 'lucide-react';
import { adminRequest as api } from '../services/adminApi';
import { setSystemBarsDark } from '../services/systemBars';
import type { Staff, Category, Product, Order, Audit, Dashboard, Role } from '../services/adminApi';
import { useApp } from '../context/useApp';
import EntityEditor from '../components/admin/EntityEditor';
import type { Editor } from '../components/admin/EntityEditor';
import OrderPanel from '../components/admin/OrderPanel';
import PromotionsPanel from '../components/admin/PromotionsPanel';
import HomeEditor from '../components/admin/HomeEditor';
import ProductWorkspace from '../components/admin/ProductWorkspace';
import { Empty, Field, Status, date, money, num, roles, roleDescriptions, statusLabels } from '../components/admin/ui';
import './admin.css';
import './admin-theme.css';

type Tab = 'overview' | 'products' | 'categories' | 'promotions' | 'home' | 'orders' | 'staff' | 'audit';
const tabs = [ { id: 'overview', name: 'نظرة عامة', icon: LayoutDashboard }, { id: 'products', name: 'المنتجات', icon: Package }, { id: 'categories', name: 'الأقسام', icon: Layers }, { id: 'promotions', name: 'العروض والتخفيضات', icon: BadgePercent }, { id: 'home', name: 'تصميم الرئيسية', icon: PanelsTopLeft }, { id: 'orders', name: 'الطلبات', icon: ShoppingBag }, { id: 'staff', name: 'الموظفون والصلاحيات', icon: Users }, { id: 'audit', name: 'سجل التعديلات', icon: History } ] as const;
const roleTabs: Record<Role, Tab[]> = { owner: ['overview', 'products', 'categories', 'promotions', 'home', 'orders', 'staff', 'audit'], catalog: ['overview', 'products', 'categories'], support: ['overview', 'orders', 'products'], fulfillment: ['overview', 'orders'], accountant: ['overview', 'orders'] };
const pageDescriptions: Record<Tab, string> = { overview: '', products: 'كتالوج بصور واضحة وأسعار ومخزون مباشر.', categories: 'رتّب منتجاتك في أقسام وفروع سهلة التصفح.', promotions: 'خطّط الخصومات وحدد المنتجات ووقت ظهورها.', home: 'حرّر بداية المتجر والبنرات وشريط الإعلانات ثم انشرها.', orders: 'من الطلب الجديد حتى التسليم، تابع كل خطوة.', staff: 'لكل شخص دوره، ولكل دور صلاحياته.', audit: 'من غيّر ماذا ومتى؟ كل العمليات في سجل واحد.' };
const roleIcons = { owner: ShieldCheck, catalog: Package, support: Headphones, fulfillment: Truck, accountant: ChartNoAxesCombined };
const pageSize = 10;
const actionLabels: Record<string, string> = { create: 'إضافة', update: 'تعديل', update_status: 'تحديث الحالة' };
const entityLabels: Record<string, string> = { product: 'منتج', category: 'قسم', order: 'طلب', staff: 'موظف' };
function routeTab(role: Role): Tab { const candidate = window.location.pathname.split('/')[3] as Tab; return roleTabs[role].includes(candidate) ? candidate : 'overview'; }

export default function AdminPage() {
  const { navigate } = useApp();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('souq-admin-theme') === 'dark' ? 'dark' : 'light');
  useEffect(() => { setSystemBarsDark(theme === 'dark'); }, [theme]);
  const toggleTheme = () => setTheme(current => {
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem('souq-admin-theme', next);
    return next;
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('souq-admin-token') || '');
  const [staff, setStaff] = useState<Staff | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Staff[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginFieldError, setLoginFieldError] = useState<{ email?: string; password?: string }>({});
  const [checking, setChecking] = useState(!!token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  useEffect(() => {
    const closeOverlay = (event: Event) => {
      if (editor) { setEditor(null); event.preventDefault(); }
      else if (orderId !== null) { setOrderId(null); event.preventDefault(); }
    };
    window.addEventListener('souq-before-back', closeOverlay);
    return () => window.removeEventListener('souq-before-back', closeOverlay);
  }, [editor, orderId]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const drawerHistoryRef = useRef(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [revision, setRevision] = useState(0);
  const [authRevision, setAuthRevision] = useState(0);
  const sessionGeneration = useRef(0);
  useEffect(() => {
    document.title = staff ? `سوق — ${roles[staff.role]}` : 'سوق — دخول الموظفين';
    return () => { document.title = 'سوق — متجر راقٍ'; };
  }, [staff]);
  const clearSession = useCallback(() => {
    sessionGeneration.current++; sessionStorage.removeItem('souq-admin-token'); setToken(''); setStaff(null); setCategories([]); setProducts([]); setOrders([]); setEmployees([]); setAudit([]); setDashboard(null); setEditor(null); setOrderId(null); setTab('overview'); setChecking(false); setNotice(''); setError(''); window.history.replaceState(null, '', '/admin');
  }, []);
  useEffect(() => {
    const expired = () => { clearSession(); setError('انتهت الجلسة أو تغيرت صلاحياتك. سجّل الدخول من جديد.'); };
    window.addEventListener('admin-session-expired', expired); return () => window.removeEventListener('admin-session-expired', expired);
  }, [clearSession]);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController(); setChecking(true); setError('');
    api<{ staff: Staff }>('/me', token, 'GET', undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) { setStaff(data.staff); const next = routeTab(data.staff.role); setTab(next); window.history.replaceState(null, '', `/admin/${data.staff.role}/${next}`); }
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [token, authRevision]);
  useEffect(() => {
    if (!staff) return;
    const handler = () => {
      if (drawerHistoryRef.current) { drawerHistoryRef.current = false; setMobileMenu(false); return; }
      setMobileMenu(false); setTab(routeTab(staff.role)); setSearch(''); setFilter('all'); setPage(1); setEditor(null); setOrderId(null);
    };
    window.addEventListener('popstate', handler); return () => window.removeEventListener('popstate', handler);
  }, [staff]);
  useEffect(() => {
    if (!mobileMenu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLButtonElement>('.admin-mobile-close')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeMenu(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...(drawerRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); menuTriggerRef.current?.focus(); };
  }, [mobileMenu]);
  function openMenu() { window.history.pushState({ ...window.history.state, adminDrawer: true }, '', window.location.href); drawerHistoryRef.current = true; setMobileMenu(true); }
  function closeMenu() { if (window.history.state?.adminDrawer) window.history.back(); else { drawerHistoryRef.current = false; setMobileMenu(false); } }
  useEffect(() => {
    if (!staff) return;
    if (tab === 'promotions' || tab === 'home') { setLoading(false); setError(''); return; }
    const controller = new AbortController(); const generation = sessionGeneration.current;
    setLoading(true); setError('');
    const load = async () => {
      // The server independently checks every role and every category scope.
      const path = tab === 'overview' ? '/dashboard' : tab === 'categories' ? '/admin/categories' : tab === 'audit' ? '/audit-log' : `/${tab}`;
      const [data, cats] = await Promise.all([
        api<Dashboard | Product[] | Category[] | Order[] | Staff[] | Audit[]>(path, token, 'GET', undefined, controller.signal),
        ['products', 'categories', 'staff'].includes(tab) ? api<Category[]>('/admin/categories', token, 'GET', undefined, controller.signal) : Promise.resolve(null),
      ]);
      if (controller.signal.aborted || generation !== sessionGeneration.current) return;
      if (cats) setCategories(cats);
      if (tab === 'overview') setDashboard(data as Dashboard);
      if (tab === 'products') setProducts(data as Product[]);
      if (tab === 'categories') setCategories(data as Category[]);
      if (tab === 'orders') setOrders(data as Order[]);
      if (tab === 'staff') setEmployees(data as Staff[]);
      if (tab === 'audit') setAudit(data as Audit[]);
    };
    load().catch(e => { if (!controller.signal.aborted && generation === sessionGeneration.current) setError(e.message); }).finally(() => { if (!controller.signal.aborted && generation === sessionGeneration.current) setLoading(false); });
    return () => controller.abort();
  }, [staff, token, tab, revision]);
  function selectTab(next: Tab, nextFilter = 'all') {
    if (!staff || !roleTabs[staff.role].includes(next)) return;
    if (window.history.state?.adminDrawer) { window.history.replaceState(null, '', window.location.href); drawerHistoryRef.current = false; }
    setTab(next); setSearch(''); setFilter(nextFilter); setPage(1); setMobileMenu(false); setNotice(''); setError('');
    window.history.pushState(null, '', `/admin/${staff.role}/${next}`);
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const errors = { email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'أدخل بريداً إلكترونياً صحيحاً.' : undefined, password: !password ? 'أدخل كلمة المرور.' : undefined };
    setLoginFieldError(errors);
    if (errors.email || errors.password) return;
    setBusy(true); setError('');
    try { const result = await api<{ token: string }>('/auth/login', '', 'POST', { email: String(data.get('email')).trim(), password: data.get('password') }); sessionStorage.setItem('souq-admin-token', result.token); setToken(result.token); }
    catch (e) { setLoginFieldError({ password: (e as Error).message }); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await api('/auth/logout', token, 'POST'); clearSession(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function saved() {
    if (editor?.kind === 'staff' && editor.item?.id === staff?.id) setAuthRevision(v => v + 1);
    setEditor(null); setNotice('تم حفظ التغييرات بنجاح.'); setRevision(v => v + 1);
  }
  function store() { window.history.pushState(null, '', '/'); navigate('home'); }
  const match = (value: string) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const foundProducts = products.filter(p => match(`${p.name} ${p.sku || ''} ${p.category_name}`) && (filter === 'all' || filter === 'low' && p.stock <= 5 && p.is_active || filter === 'active' && !!p.is_active || filter === 'out' && p.stock === 0 && !!p.is_active || filter === 'hidden' && !p.is_active || String(p.category_id) === filter));
  const foundCategories = categories.filter(c => match(c.name));
  const foundOrders = orders.filter(o => match(`${o.id} ${o.customer_name} ${o.customer_phone} ${o.tracking_number || ''}`) && (filter === 'all' || filter === 'delayed' && o.is_delayed || o.status === filter));
  const foundEmployees = employees.filter(s => match(`${s.name} ${s.email}`) && (filter === 'all' || s.role === filter));
  const foundAudit = audit.filter(a => match(`${a.staff_name || ''} ${entityLabels[a.entity] || a.entity} ${actionLabels[a.action] || a.action} ${a.entity_id}`));
  const total = tab === 'products' ? foundProducts.length : tab === 'categories' ? foundCategories.length : tab === 'orders' ? foundOrders.length : tab === 'staff' ? foundEmployees.length : foundAudit.length;
  const pages = Math.max(1, Math.ceil(total / pageSize)); const currentPage = Math.min(page, pages);
  const slice = <T,>(rows: T[]) => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  if (!staff) return (
    <div className="admin-root admin-login" data-theme={theme} dir="rtl">
      <section className="admin-login-story">
        <button className="admin-logo" onClick={store}>سوق<span>.</span></button>
        <div><span className="admin-eyebrow">مساحة الفريق</span><h1>شغل مرتب.<br />متجر أفضل.</h1><p>مساحة واحدة تجمع فريقك، وكل شخص يجد الأدوات التي يحتاجها.</p><div className="admin-login-roles">{Object.entries(roles).map(([key, label]) => { const RoleIcon = roleIcons[key as Role]; return <span key={key}><RoleIcon size={17} />{label}</span>; })}</div></div>
        <small>إدارة يومك، ببساطة.</small>
      </section>
      <section className="admin-login-panel"><div className="admin-login-card">
        <button className="admin-icon bordered admin-theme-toggle admin-login-theme" onClick={toggleTheme} aria-label={theme === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع الفاتح'} title={theme === 'light' ? 'الوضع الليلي' : 'الوضع الفاتح'}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
        <span className="admin-kicker">أهلًا بفريق سوق</span><h2>تسجيل دخول الموظفين</h2><p>استخدم حسابك، وسنفتح مساحة عملك تلقائيًا.</p>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {token ? <><p role="status">{checking ? 'جارٍ التحقق من حسابك…' : 'تعذر التحقق من الجلسة.'}</p><div className="admin-form-actions"><button className="admin-btn" disabled={checking} onClick={() => setAuthRevision(v => v + 1)}>إعادة المحاولة</button><button className="admin-btn secondary" onClick={clearSession}>تسجيل الدخول من جديد</button></div></> :
          <form noValidate onSubmit={login} className="admin-form admin-login-form">
            <label className="admin-field" htmlFor="admin-email"><span>البريد الإلكتروني</span></label>
            <input id="admin-email" name="email" type="email" inputMode="email" dir="ltr" autoComplete="username" placeholder="name@shop.local" aria-invalid={!!loginFieldError.email} aria-describedby={loginFieldError.email ? 'admin-email-error' : undefined} onChange={() => setLoginFieldError(current => ({ ...current, email: undefined }))} />
            {loginFieldError.email && <small id="admin-email-error" className="admin-field-error" role="alert">{loginFieldError.email}</small>}
            <label className="admin-field" htmlFor="admin-password"><span>كلمة المرور</span></label>
            <div className="admin-password-wrap"><input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="أدخل كلمة المرور" aria-invalid={!!loginFieldError.password} aria-describedby={loginFieldError.password ? 'admin-password-error' : undefined} onChange={() => setLoginFieldError(current => ({ ...current, password: undefined }))} /><button type="button" aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
            {loginFieldError.password && <small id="admin-password-error" className="admin-field-error" role="alert">{loginFieldError.password}</small>}
            <button className="admin-btn full" disabled={busy} aria-busy={busy}>{busy ? 'جارٍ تسجيل الدخول…' : 'دخول مساحة العمل'}<ChevronLeft size={18} /></button>
          </form>}
        <button className="admin-text-btn admin-back-store" onClick={store}>العودة للمتجر <ArrowUpLeft size={15} /></button>
        <div className="admin-login-footer"><ShieldCheck size={16} /><span>كل حساب يصل للأدوات المسموحة له فقط.</span></div>
      </div></section>
    </div>
  );
  const Icon = roleIcons[staff.role]; const canEditProducts = ['owner', 'catalog'].includes(staff.role);
  const addLabel = tab === 'products' && canEditProducts ? 'إضافة منتج' : tab === 'categories' && staff.role === 'owner' ? 'إضافة قسم' : tab === 'staff' ? 'إضافة موظف' : null;
  return <div className="admin-root admin-shell" data-theme={theme} dir="rtl">
    {mobileMenu && <button className="admin-menu-backdrop" aria-label="إغلاق القائمة" onClick={closeMenu} />}
    <aside ref={drawerRef} className={`admin-sidebar ${mobileMenu ? 'open' : ''}`} aria-label="تنقل مساحة الإدارة" aria-modal={mobileMenu ? true : undefined}><div className="admin-sidebar-brand"><button className="admin-logo" onClick={store}>سوق<span>.</span></button><span>مساحة الفريق</span><button className="admin-mobile-close admin-icon" aria-label="إغلاق القائمة" onClick={closeMenu}><X size={20} /></button></div><div className="admin-sidebar-scroll"><div className="admin-role-card"><div className="admin-role-icon"><Icon size={21} /></div><div><small>مساحة عمل</small><strong>{roles[staff.role]}</strong></div></div><p className="admin-nav-caption">القائمة الرئيسية</p><nav aria-label="القائمة الرئيسية">{tabs.filter(t => roleTabs[staff.role].includes(t.id)).map(t => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => selectTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}><t.icon size={19} /><span>{t.name}</span>{tab === t.id && <ChevronLeft size={15} />}</button>)}</nav></div><div className="admin-sidebar-bottom"><button onClick={store} className="admin-store-link">عرض المتجر<ArrowUpLeft size={17} /></button><div className="admin-user"><span className="admin-avatar">{staff.name.charAt(0)}</span><div><strong>{staff.name}</strong><small>{roles[staff.role]}</small></div><button disabled={busy || loading} aria-label="تسجيل الخروج" title="تسجيل الخروج" onClick={logout} className="admin-icon"><LogOut size={18} /></button></div></div></aside>
    <div className="admin-workspace"><header className="admin-topbar"><div><button ref={menuTriggerRef} className="admin-mobile-toggle admin-icon" aria-label="فتح القائمة" aria-expanded={mobileMenu} onClick={openMenu}><Menu size={21} /></button><span>مساحة {roles[staff.role]}</span><ChevronLeft size={14} /><b>{tabs.find(t => t.id === tab)?.name}</b></div><span className="admin-today">{new Date().toLocaleDateString('ar-YE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Aden' })}</span></header>
    <main className={`admin-main ${tab === 'staff' ? 'admin-staff-page' : ''}`}><div className="admin-heading"><div><span className="admin-kicker">{tab === 'overview' ? 'يوم جديد، إنجاز جديد' : 'متجر سوق'}</span><h1>{tab === 'overview' ? `أهلًا، ${staff.name}` : tabs.find(t => t.id === tab)?.name}</h1><p>{tab === 'overview' ? roleDescriptions[staff.role] : pageDescriptions[tab]}</p></div><div className="admin-heading-actions"><button className="admin-icon bordered admin-theme-toggle" onClick={toggleTheme} aria-label={theme === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع الفاتح'} title={theme === 'light' ? 'الوضع الليلي' : 'الوضع الفاتح'}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button><button className="admin-icon bordered" onClick={() => setRevision(v => v + 1)} disabled={loading} aria-label="تحديث البيانات"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>{addLabel && <button className="admin-btn" disabled={loading || !!error} onClick={() => setEditor({ kind: tab === 'products' ? 'product' : tab === 'categories' ? 'category' : 'staff' })}><Plus size={18} />{addLabel}</button>}</div></div>
    {error && <div className="admin-alert error" role="alert">{error}<button className="admin-text-btn" onClick={() => setRevision(v => v + 1)}>إعادة المحاولة</button></div>}{notice && <div className="admin-alert success" role="status">{notice}</div>}
    {loading ? <div role="status" aria-label="جارٍ تحميل البيانات" className="admin-skeleton"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : !error && (tab === 'promotions' ? <PromotionsPanel token={token} /> : tab === 'home' ? <HomeEditor token={token} /> : tab === 'overview' ? <>
      <div className="admin-stats">{[
        { label: 'طلبات جديدة', value: dashboard?.new_orders, icon: ShoppingBag, caption: 'بانتظار بدء التجهيز', go: () => selectTab('orders', 'new'), tone: 'gold' },
        { label: 'طلبات متأخرة', value: dashboard?.delayed_orders, icon: Clock3, caption: 'لم تُشحن خلال 48 ساعة', go: () => selectTab('orders', 'delayed'), tone: 'orange' },
        { label: 'مخزون منخفض', value: dashboard?.low_stock, icon: Boxes, caption: 'منتجات نشطة بكميات 5 أو أقل', go: () => selectTab('products', 'low'), tone: 'rose' },
        ...(staff.role === 'catalog' ? [{ label: 'منتجات أقسامك', value: dashboard?.product_count, icon: Package, caption: 'جميع المنتجات ضمن صلاحياتك', go: () => selectTab('products'), tone: 'gold' }] : []),
      ].filter(s => s.value !== null && s.value !== undefined).map(s => <button className="admin-stat" key={s.label} onClick={s.go}><div><span>{s.label}</span><span className={`admin-stat-icon ${s.tone}`}><s.icon size={19} /></span></div><strong>{num(s.value!)}</strong><p>{s.caption}<ArrowUpLeft size={15} /></p></button>)}</div>
      {staff.role === 'owner' || staff.role === 'catalog' ? <section className="admin-quick-actions"><div><h2>ابدأ من هنا</h2><p>أكثر الأدوات التي تحتاجها في يومك.</p></div><button onClick={() => selectTab('products')}><Package size={19} />إدارة المنتجات<ChevronLeft size={16} /></button>{staff.role === 'owner' && <button onClick={() => selectTab('staff')}><Users size={19} />إدارة الفريق<ChevronLeft size={16} /></button>}</section> : null}
      <div className="admin-dashboard-grid">{staff.role !== 'catalog' && <section className="admin-card"><div className="admin-card-heading"><div><h2>{staff.role === 'fulfillment' ? 'قائمة العمل' : 'أحدث الطلبات'}</h2><p>آخر الطلبات المسجلة في المتجر</p></div><button className="admin-text-btn" onClick={() => selectTab('orders')}>عرض الكل<ChevronLeft size={15} /></button></div>{dashboard?.recent_orders.length ? <div className="admin-recent-list">{dashboard.recent_orders.map(o => <button key={o.id} onClick={() => setOrderId(o.id)}><span className="admin-list-icon"><ShoppingBag size={18} /></span><span><strong>طلب #{o.id}</strong><small>{o.customer_name}</small></span><Status value={o.status} /><ChevronLeft size={16} /></button>)}</div> : <Empty text="لا توجد طلبات بعد" detail="ستظهر أحدث الطلبات هنا لتتابعها مع فريقك." />}</section>}
      {canEditProducts && <section className="admin-card"><div className="admin-card-heading"><div><h2>يحتاج انتباهك</h2><p>منتجات قاربت على النفاد</p></div><span className="admin-dot orange" /></div>{dashboard?.low_stock_products.length ? <div className="admin-recent-list">{dashboard.low_stock_products.map(p => <button key={p.id} onClick={() => selectTab('products', 'low')}><span className="admin-list-icon"><Package size={18} /></span><span><strong>{p.name}</strong><small>{p.category_name}</small></span><b className="admin-stock-low">{num(p.stock)} متبقي</b></button>)}</div> : <Empty text="المخزون مطمئن" detail="لا توجد منتجات نشطة بمخزون منخفض حاليًا." />}</section>}
      </div>{staff.role === 'support' && <div className="admin-phase-note"><Headphones size={20} /><div><strong>محادثات العملاء — المرحلة الثانية</strong><p>حاليًا يمكنك البحث عن العميل ومتابعة طلبه وتفاصيل الشحن.</p></div></div>}{staff.role === 'accountant' && <div className="admin-phase-note"><ChartNoAxesCombined size={20} /><div><strong>تقارير المبيعات والأرباح — المرحلة الأخيرة</strong><p>مساحتك الحالية للاطلاع على الطلبات وإجمالياتها، دون صلاحيات تعديل.</p></div></div>}
    </> : <section className="admin-card admin-data-card"><div className="admin-toolbar"><div className="admin-search"><Search size={18} /><input aria-label="البحث في القائمة" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={tab === 'orders' ? 'رقم الطلب، اسم العميل أو الجوال…' : 'ابحث بالاسم أو الرمز…'} /></div>{['products', 'orders', 'staff'].includes(tab) && <select className="admin-filter" aria-label="تصفية القائمة" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}><option value="all">{tab === 'products' ? 'كل المنتجات' : tab === 'orders' ? 'كل الحالات' : 'كل الأدوار'}</option>{tab === 'products' && <><option value="active">المعروضة</option><option value="low">مخزون منخفض</option><option value="out">نفد المخزون</option><option value="hidden">المخفية</option>{categories.filter(c => products.some(p => p.category_id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</>}{tab === 'orders' && <><option value="delayed">طلبات متأخرة</option>{Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</>}{tab === 'staff' && Object.entries(roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}<span className="admin-count">{num(total)} سجل</span></div>
      {tab === 'products' ? <ProductWorkspace products={slice(foundProducts)} allProducts={products} categories={categories} filter={filter} onFilter={value => { setFilter(value); setPage(1); }} onEdit={item => setEditor({ kind: 'product', item })} canEdit={canEditProducts} /> : total ? <>{tab === 'staff' && <div className="admin-staff-cards">{slice(foundEmployees).map(s => <article className="admin-staff-card" key={s.id}><div className="admin-staff-identity"><strong>{s.name}{s.id === staff.id && ' (أنت)'}</strong><bdi>{s.email}</bdi></div><dl><div><dt>الدور</dt><dd>{roles[s.role]}</dd></div><div><dt>الأقسام المسموحة</dt><dd>{s.role === 'catalog' ? s.categories?.map(id => categories.find(c => c.id === id)?.name || `#${id}`).join('، ') || 'لا توجد أقسام' : s.role === 'owner' ? 'جميع الأقسام' : 'حسب الدور'}</dd></div><div><dt>الحالة</dt><dd><span className={`admin-badge ${s.is_active ? 'status-delivered' : 'status-cancelled'}`}>{s.is_active ? 'نشط' : 'معطل'}</span></dd></div></dl><button className="admin-staff-edit" onClick={() => setEditor({ kind: 'staff', item: s })} aria-label={`تعديل ${s.name}`}><Pencil size={18} />تعديل</button></article>)}</div>}<div className={`admin-table-wrap ${tab === 'staff' ? 'admin-staff-table' : ''}`}><table><thead><tr>{(tab === 'categories' ? ['القسم', 'القسم الأب', 'المنتجات', 'الحالة', ...(staff.role === 'owner' ? [''] : [])] : tab === 'orders' ? ['الطلب', 'العميل', ...(staff.role !== 'fulfillment' ? ['الإجمالي'] : []), 'الحالة', 'التاريخ', ''] : tab === 'staff' ? ['الموظف', 'الدور', 'الأقسام المسموحة', 'الحالة', ''] : ['الموظف', 'العملية', 'السجل', 'التاريخ', 'التفاصيل']).map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>
      {tab === 'categories' && slice(foundCategories).map(c => <tr key={c.id}><td><strong>{c.name}</strong></td><td>{categories.find(p => p.id === c.parent_id)?.name || (c.parent_id ? 'قسم أعلى' : 'قسم رئيسي')}</td><td>{num(c.product_count)}</td><td><span className={`admin-badge ${c.is_active ? 'status-delivered' : 'status-cancelled'}`}>{c.is_active ? 'نشط' : 'مخفي'}</span></td>{staff.role === 'owner' && <td><button className="admin-icon" aria-label={`تعديل ${c.name}`} onClick={() => setEditor({ kind: 'category', item: c })}><Pencil size={16} /></button></td>}</tr>)}
      {tab === 'orders' && slice(foundOrders).map(o => <tr key={o.id}><td><strong>#{o.id}</strong>{!!o.is_delayed && <small className="admin-stock-low">متأخر</small>}</td><td><strong>{o.customer_name}</strong><small><bdi>{o.customer_phone}</bdi></small></td>{o.total !== undefined && <td className="admin-nowrap">{money(o.total)}</td>}<td><Status value={o.status} /></td><td>{date(o.created_at)}</td><td><button className="admin-text-btn" onClick={() => setOrderId(o.id)}>التفاصيل<ChevronLeft size={14} /></button></td></tr>)}
      {tab === 'staff' && slice(foundEmployees).map(s => <tr key={s.id}><td><strong>{s.name}{s.id === staff.id && ' (أنت)'}</strong><small><bdi>{s.email}</bdi></small></td><td>{roles[s.role]}</td><td>{s.role === 'catalog' ? s.categories?.map(id => categories.find(c => c.id === id)?.name || `#${id}`).join('، ') : s.role === 'owner' ? 'جميع الأقسام' : 'حسب الدور'}</td><td><span className={`admin-badge ${s.is_active ? 'status-delivered' : 'status-cancelled'}`}>{s.is_active ? 'نشط' : 'معطل'}</span></td><td><button className="admin-icon" aria-label={`تعديل ${s.name}`} onClick={() => setEditor({ kind: 'staff', item: s })}><Pencil size={16} /></button></td></tr>)}
      {tab === 'audit' && slice(foundAudit).map(a => <tr key={a.id}><td>{a.staff_name || 'النظام'}</td><td>{actionLabels[a.action] || a.action}</td><td>{entityLabels[a.entity] || a.entity} #{a.entity_id}</td><td>{date(a.created_at)}</td><td>{a.changes ? <details><summary>عرض التغيير</summary><pre dir="ltr" className="admin-audit-json">{(() => { try { return JSON.stringify(JSON.parse(a.changes), null, 2); } catch { return a.changes; } })()}</pre></details> : '—'}</td></tr>)}
      </tbody></table></div></> : <Empty text={search || filter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا توجد سجلات حتى الآن'} detail={search || filter !== 'all' ? 'جرّب تغيير كلمة البحث أو التصفية.' : 'ستظهر السجلات هنا عند إضافتها.'} />}
      <footer className="admin-pagination"><span>صفحة {num(currentPage)} من {num(pages)}</span><div><button className="admin-icon bordered" aria-label="الصفحة السابقة" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronRight size={17} /></button><button className="admin-icon bordered" aria-label="الصفحة التالية" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronLeft size={17} /></button></div></footer>
    </section>)}<footer className="admin-page-footer"><span>سوق · مساحة الفريق</span><span>أدوات بسيطة، عمل أوضح.</span></footer></main></div>
    {editor && <EntityEditor editor={editor} categories={categories} currentStaff={staff} token={token} onClose={() => setEditor(null)} onSaved={saved} />}
    {orderId !== null && <OrderPanel id={orderId} token={token} role={staff.role} onClose={() => setOrderId(null)} onSaved={() => setRevision(v => v + 1)} />}
  </div>;
}
