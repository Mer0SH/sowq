import { useEffect, useMemo, useState } from 'react';
import { BadgePercent, CalendarDays, Plus, Search, Tag } from 'lucide-react';
import { adminRequest } from '../../services/adminApi';
import type { Category, Product } from '../../services/adminApi';
import { formatPrice, mediaUrl } from '../../services/storefrontApi';
import { Empty, Field } from './ui';

type Promotion = { id: number; title: string; discount_type: 'percent' | 'fixed'; value: number; scope_type: 'all' | 'products' | 'categories'; target_ids: number[]; code: string | null; starts_at: string | null; ends_at: string | null; is_active: number };
type Draft = Omit<Promotion, 'id' | 'is_active' | 'starts_at' | 'ends_at'> & { id?: number; is_active: boolean; starts_at: string; ends_at: string };
const empty: Draft = { title: '', discount_type: 'percent', value: 10, scope_type: 'products', target_ids: [], code: null, starts_at: '', ends_at: '', is_active: false };
const localDate = (value: string | null) => value ? new Date(value).toLocaleString('sv-SE', { timeZone: 'Asia/Aden' }).replace(' ', 'T').slice(0, 16) : '';
const yemenIso = (value: string) => value ? new Date(`${value}:00+03:00`).toISOString() : null;

export default function PromotionsPanel({ token }: { token: string }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft>(empty);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    Promise.all([
      adminRequest<Promotion[]>('/admin/promotions', token),
      adminRequest<Product[]>('/products', token),
      adminRequest<Category[]>('/admin/categories', token),
    ]).then(([offers, goods, cats]) => { setPromotions(offers); setProducts(goods); setCategories(cats); setError(''); })
      .catch(err => setError((err as Error).message));
  }, [token, revision]);
  const targets = useMemo(() => (draft.scope_type === 'products' ? products : categories)
    .filter(item => item.name.includes(search.trim())).slice(0, 100), [draft.scope_type, products, categories, search]);
  function edit(offer: Promotion) {
    setDraft({ ...offer, is_active: !!offer.is_active, starts_at: localDate(offer.starts_at), ends_at: localDate(offer.ends_at) });
    setNotice(''); setError('');
  }
  async function save() {
    setSaving(true); setError(''); setNotice('');
    try {
      const body = {
        title: draft.title.trim(), discount_type: draft.discount_type, value: Number(draft.value), scope_type: draft.scope_type,
        target_ids: draft.scope_type === 'all' ? [] : draft.target_ids,
        code: draft.code?.trim().toUpperCase() || null,
        starts_at: yemenIso(draft.starts_at),
        ends_at: yemenIso(draft.ends_at),
        is_active: draft.is_active,
      };
      await adminRequest(`/admin/promotions${draft.id ? `/${draft.id}` : ''}`, token, draft.id ? 'PATCH' : 'POST', body);
      setNotice('تم حفظ العرض، وسيطبّق الخادم السعر على المنتجات المشمولة.');
      setDraft(empty); setRevision(value => value + 1);
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }
  return <div className="commerce-panel">
    <section className="commerce-card">
      <div className="commerce-form-row" style={{ justifyContent: 'space-between' }}><div><h2>{draft.id ? 'تعديل العرض' : 'عرض جديد'}</h2><p className="commerce-note">اختر المنتجات، وحدد الخصم ووقت ظهوره.</p></div><button className="admin-dense-btn" onClick={() => { setDraft(empty); setError(''); }}><Plus size={14} /> جديد</button></div>
      {error && <div className="admin-alert error" role="alert">{error}</div>}{notice && <div className="admin-alert success" role="status">{notice}</div>}
      <div className="admin-form">
        <Field label="اسم العرض"><input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="مثال: خصم تشكيلة المنزل" /></Field>
        <div className="admin-form-grid"><Field label="نوع الخصم"><select value={draft.discount_type} onChange={e => setDraft({ ...draft, discount_type: e.target.value as Draft['discount_type'] })}><option value="percent">نسبة مئوية</option><option value="fixed">مبلغ ثابت</option></select></Field><Field label={draft.discount_type === 'percent' ? 'نسبة الخصم %' : 'قيمة الخصم (YER)'}><input type="number" min="0.01" max={draft.discount_type === 'percent' ? 100 : undefined} step="0.01" value={draft.value} onChange={e => setDraft({ ...draft, value: Number(e.target.value) })} /></Field></div>
        <div className="admin-form-grid"><Field label="نطاق العرض"><select value={draft.scope_type} onChange={e => setDraft({ ...draft, scope_type: e.target.value as Draft['scope_type'], target_ids: [] })}><option value="products">منتجات محددة</option><option value="categories">أقسام محددة</option><option value="all">كل المنتجات</option></select></Field><Field label="كود الخصم (اختياري)" hint="فارغ = يطبّق تلقائيًا"><input dir="ltr" value={draft.code || ''} onChange={e => setDraft({ ...draft, code: e.target.value || null })} placeholder="SALE10" /></Field></div>
        {draft.scope_type !== 'all' && <div><label className="admin-search" style={{ maxWidth: 'none' }}><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن منتج أو قسم…" /></label><div className="admin-category-checks" style={{ maxHeight: 190, overflowY: 'auto', marginTop: 8 }}>{targets.map(item => <label key={item.id}><input type="checkbox" checked={draft.target_ids.includes(item.id)} onChange={e => setDraft(current => ({ ...current, target_ids: e.target.checked ? [...current.target_ids, item.id] : current.target_ids.filter(id => id !== item.id) }))} />{'images' in item && item.images?.[0] && <img src={mediaUrl(item.images[0])} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 5 }} />}<span>{item.name}</span></label>)}</div><p className="commerce-note">المحدد: {draft.target_ids.length}</p></div>}
        <div className="admin-form-grid"><Field label="يبدأ في (اختياري)"><input type="datetime-local" value={draft.starts_at} onChange={e => setDraft({ ...draft, starts_at: e.target.value })} /></Field><Field label="ينتهي في (اختياري)"><input type="datetime-local" value={draft.ends_at} onChange={e => setDraft({ ...draft, ends_at: e.target.value })} /></Field></div>
        <label className="admin-check"><input type="checkbox" checked={draft.is_active} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} />العرض منشور</label>
        <p className="commerce-note">إذا تداخل عرضان، يستخدم المتجر أعلى خصم للعميل مرة واحدة. الأسعار النهائية تُحسب في الخادم.</p>
        <button className="admin-btn" disabled={saving} onClick={() => void save()}>{saving ? 'جارٍ الحفظ…' : 'حفظ العرض'}</button>
      </div>
    </section>
    <section className="commerce-card"><h2>العروض الحالية</h2><p>جدول العمل والعروض المفعّلة في المتجر</p><div className="commerce-list">{promotions.length ? promotions.map(offer => <button className="commerce-list-item" key={offer.id} onClick={() => edit(offer)}><span><BadgePercent size={19} /></span><div><strong>{offer.title}</strong><small>{offer.discount_type === 'percent' ? `${offer.value}%` : formatPrice(offer.value)} · {offer.scope_type === 'all' ? 'كل المنتجات' : `${offer.target_ids.length} ${offer.scope_type === 'products' ? 'منتج' : 'قسم'}`}{offer.code && ` · ${offer.code}`}</small>{offer.ends_at && <small><CalendarDays size={12} style={{ display: 'inline' }} /> ينتهي {new Date(offer.ends_at).toLocaleDateString('ar-YE', { timeZone: 'Asia/Aden' })}</small>}</div><span className={`commerce-pill ${offer.is_active ? '' : 'off'}`}><Tag size={12} />{offer.is_active ? 'منشور' : 'مسودة'}</span></button>) : <Empty text="لا توجد عروض بعد" detail="أنشئ أول عرض من النموذج." />}</div></section>
  </div>;
}
