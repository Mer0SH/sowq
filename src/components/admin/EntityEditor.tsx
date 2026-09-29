import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Category, Product, Staff, Role } from '../../services/adminApi';
import { adminRequest as api } from '../../services/adminApi';
import { Field, Modal, roles } from './ui';
import { mediaUrl, uploadMedia } from '../../services/storefrontApi';

export type Editor = { kind: 'product'; item?: Product } | { kind: 'category'; item?: Category } | { kind: 'staff'; item?: Staff };
export default function EntityEditor({ editor, categories, currentStaff, token, onClose, onSaved }: { editor: Editor; categories: Category[]; currentStaff: Staff; token: string; onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<Role>(editor.kind === 'staff' ? editor.item?.role || 'catalog' : 'catalog');
  const [selected, setSelected] = useState<number[]>(editor.kind === 'staff' ? editor.item?.categories || [] : []);
  const [active, setActive] = useState(editor.item ? !!editor.item.is_active : true);
  const product = editor.kind === 'product' ? editor.item : undefined;
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [uploading, setUploading] = useState(false);
  const [featured, setFeatured] = useState(!!product?.is_featured);
  const [newArrival, setNewArrival] = useState(!!product?.is_new);
  const category = editor.kind === 'category' ? editor.item : undefined;
  const employee = editor.kind === 'staff' ? editor.item : undefined;
  const self = employee?.id === currentStaff.id;
  const title = `${editor.item ? 'تعديل' : 'إضافة'} ${editor.kind === 'product' ? 'منتج' : editor.kind === 'category' ? 'قسم' : 'موظف'}`;
  function categoryPath(c: Category, seen = new Set<number>()): string {
    if (seen.has(c.id)) return c.name;
    seen.add(c.id);
    const parent = categories.find(p => p.id === c.parent_id);
    return parent ? `${categoryPath(parent, seen)} / ${c.name}` : c.name;
  }
  function isDescendant(candidate: Category, target: number): boolean {
    const seen = new Set<number>(); let current: Category | undefined = candidate;
    while (current && !seen.has(current.id)) {
      if (current.id === target) return true;
      seen.add(current.id); current = categories.find(c => c.id === current?.parent_id);
    }
    return false;
  }
  function height(id: number): number { return 1 + Math.max(0, ...categories.filter(c => c.parent_id === id).map(c => height(c.id))); }
  const parents = categories.filter(c => (!category || !isDescendant(c, category.id)) && categoryPath(c).split(' / ').length + (category ? height(category.id) : 1) <= 3);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (uploading || busy) return;
    setError(''); setBusy(true);
    const data = new FormData(e.currentTarget);
    const name = String(data.get('name') || '').trim();
    try {
      if (!name) throw new Error('الاسم مطلوب');
      let payload: Record<string, unknown>;
      let path: string;
      if (editor.kind === 'product') {
        if (!images.length && !product) throw new Error('أضف صورة واحدة على الأقل للمنتج');
        payload = { name, category_id: Number(data.get('category_id')), description: String(data.get('description') || ''), sale_price: Number(data.get('sale_price')), compare_at_price: data.get('compare_at_price') === '' ? null : Number(data.get('compare_at_price')), stock: Number(data.get('stock')), sku: String(data.get('sku') || '').trim(), is_active: active, brand: String(data.get('brand') || '').trim(), images, is_featured: featured, is_new: newArrival };
        if (currentStaff.role === 'owner') payload.cost_price = data.get('cost_price') === '' ? null : Number(data.get('cost_price'));
        path = '/products';
      } else if (editor.kind === 'category') {
        payload = { name, parent_id: data.get('parent_id') ? Number(data.get('parent_id')) : null, sort_order: Number(data.get('sort_order')), is_active: active }; path = '/categories';
      } else {
        if (role === 'catalog' && !selected.length) throw new Error('حدد قسمًا واحدًا على الأقل لمسؤول المنتجات');
        payload = { name, email: String(data.get('email')).trim(), role, categories: role === 'catalog' ? selected : [], is_active: active };
        if (data.get('password')) payload.password = data.get('password');
        path = '/staff';
      }
      if (editor.item) path += `/${editor.item.id}`;
      await api(path, token, editor.item ? 'PATCH' : 'POST', payload);
      onSaved();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    if (images.length + files.length > 12) { setError('الحد الأقصى 12 صورة للمنتج'); return; }
    setUploading(true); setError('');
    try {
      const picked = Array.from(files);
      if (picked.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024)) throw new Error('الصور المسموحة PNG وJPEG وWebP بحجم أقل من 6 م.ب');
      for (const file of picked) {
        const uploaded = await uploadMedia(file, token);
        setImages(current => [...current, uploaded]);
      }
    } catch (e) { setError((e as Error).message); }
    finally { setUploading(false); }
  }
  function moveImage(index: number, delta: number) {
    setImages(current => { const next = [...current]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next; });
  }
  return <Modal title={title} onClose={onClose} busy={busy || uploading}><form onSubmit={submit} className="admin-form">
    {error && <div className="admin-alert error" role="alert">{error}</div>}
    <Field label={editor.kind === 'staff' ? 'اسم الموظف' : 'الاسم'}><input autoFocus name="name" required maxLength={200} defaultValue={editor.item?.name || ''} /></Field>
    {editor.kind === 'product' && <>
      <Field label="القسم" hint="اختر الفرع الأخير في شجرة الأقسام؛ يظهر المنتج في هذا الفرع وأقسامه الأم فقط."><select name="category_id" required defaultValue={product?.category_id || ''}><option value="" disabled>اختر الفرع الأخير</option>{categories.filter(c => (c.is_active || c.id === product?.category_id) && !categories.some(child => child.parent_id === c.id && child.is_active)).map(c => <option key={c.id} value={c.id}>{categoryPath(c)}</option>)}</select></Field>
      <Field label="العلامة التجارية"><input name="brand" maxLength={120} defaultValue={product?.brand || ''} placeholder="مثال: مابودالا" /></Field>
      <div className="admin-form-grid"><Field label="سعر البيع (YER)"><input name="sale_price" type="number" min="0" step="0.01" required defaultValue={product?.sale_price} /></Field><Field label="السعر قبل الخصم (YER)" hint="اختياري ويجب أن يكون أعلى من سعر البيع"><input name="compare_at_price" type="number" min="0" step="0.01" defaultValue={product?.compare_at_price ?? ''} /></Field></div>
      <div className="admin-form-grid"><Field label="الكمية بالمخزون"><input name="stock" type="number" min="0" step="1" required defaultValue={product?.stock ?? 0} /></Field><Field label="رمز المنتج SKU" hint="اختياري؛ يجب أن يكون فريدًا."><input name="sku" maxLength={100} dir="ltr" defaultValue={product?.sku || ''} /></Field></div>
      {currentStaff.role === 'owner' && <Field label="تكلفة الشراء (YER)" hint="اختياري. لا يظهر لموظفي المنتجات أو خدمة العملاء."><input name="cost_price" type="number" min="0" step="0.01" defaultValue={product?.cost_price ?? ''} /></Field>}
      <Field label="وصف المنتج"><textarea name="description" rows={3} maxLength={5000} defaultValue={product?.description || ''} /></Field>
      <div className="admin-media-section"><div><strong>صور المنتج ({images.length}/12)</strong><small>اضغط «إضافة صور» واختر الصور من جهازك. الأولى تظهر كبطاقة رئيسية؛ استخدم الأسهم لتغيير ترتيبها. PNG أو JPEG أو WebP، حتى 6 م.ب للصورة.</small></div><label className="admin-media-upload">{uploading ? 'جارٍ رفع الصور…' : '+ إضافة صور'}<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={uploading || busy || images.length >= 12} onChange={e => { void addImages(e.target.files); e.target.value = ''; }} /></label></div>
      <div className="admin-media-grid">{images.map((image, index) => <div className="admin-media-card" key={`${image}-${index}`}><img src={mediaUrl(image)} alt={`صورة المنتج ${index + 1}`} /><div>{index === 0 && <span>الرئيسية</span>}<button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)} aria-label="نقل الصورة للأمام">→</button><button type="button" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} aria-label="نقل الصورة للخلف">←</button><button type="button" onClick={() => setImages(current => current.filter((_, i) => i !== index))} aria-label="حذف الصورة">×</button></div></div>)}</div>
      <div className="admin-form-grid"><label className="admin-check"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} />منتج مميز</label><label className="admin-check"><input type="checkbox" checked={newArrival} onChange={e => setNewArrival(e.target.checked)} />وصل حديثًا</label></div>
    </>}
    {editor.kind === 'category' && <>
      <Field label="القسم الأب" hint="الأقسام تدعم ثلاثة مستويات كحد أقصى."><select name="parent_id" defaultValue={category?.parent_id ?? ''}><option value="">قسم رئيسي</option>{parents.map(c => <option key={c.id} value={c.id}>{categoryPath(c)}</option>)}</select></Field>
      <Field label="ترتيب العرض"><input name="sort_order" type="number" min="0" step="1" required defaultValue={category?.sort_order ?? 0} /></Field>
    </>}
    {editor.kind === 'staff' && <>
      <Field label="البريد الإلكتروني"><input name="email" type="email" required dir="ltr" autoComplete="off" defaultValue={employee?.email || ''} /></Field>
      <Field label={employee ? 'كلمة مرور جديدة' : 'كلمة المرور'} hint={employee ? 'اتركها فارغة للإبقاء على كلمة المرور الحالية.' : 'ثمانية أحرف على الأقل.'}><input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={200} required={!employee} /></Field>
      <Field label="الدور"><select value={role} disabled={self} onChange={e => setRole(e.target.value as Role)}>{Object.entries(roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <p className="admin-help">{({ owner: 'إدارة المتجر والموظفين والصلاحيات بالكامل.', catalog: 'إضافة وتعديل منتجات الأقسام المحددة وفروعها فقط.', support: 'الاطلاع على المنتجات والطلبات دون أسعار الشراء. المحادثات في المرحلة الثانية.', fulfillment: 'الاطلاع على الطلبات وتحديث حالتها وبيانات الشحن فقط.', accountant: 'الاطلاع على الطلبات دون تعديل. تقارير المبيعات والأرباح في المرحلة الأخيرة.' })[role]}</p>
      {role === 'catalog' && <fieldset className="admin-category-checks"><legend>الأقسام المسموحة وفروعها</legend>{categories.length ? categories.map(c => <label key={c.id}><input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} /><span>{categoryPath(c)}{!c.is_active && ' (غير نشط)'}</span></label>) : <p>أضف قسمًا قبل إنشاء مسؤول منتجات.</p>}</fieldset>}
    </>}
    <label className="admin-check"><input type="checkbox" checked={active} disabled={self} onChange={e => setActive(e.target.checked)} />{editor.kind === 'staff' ? 'الحساب نشط' : editor.kind === 'category' ? 'القسم نشط' : 'المنتج نشط'}</label>
    {self && <p className="admin-help">لا يمكنك تعطيل حسابك أو إزالة صلاحية المدير من نفسك.</p>}
    <footer className="admin-form-actions"><button type="button" className="admin-btn secondary" onClick={onClose} disabled={busy || uploading}>إلغاء</button><button className="admin-btn" disabled={busy || uploading}>{uploading ? 'جارٍ رفع الصور…' : busy ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}</button></footer>
  </form></Modal>;
}
