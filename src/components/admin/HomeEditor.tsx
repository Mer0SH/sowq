import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, ImagePlus, Plus, Save, Send } from 'lucide-react';
import { adminRequest } from '../../services/adminApi';
import type { Category, Product } from '../../services/adminApi';
import type { HomeContent, LinkType } from '../../services/storefrontApi';
import { mediaUrl, uploadMedia } from '../../services/storefrontApi';
import { Field } from './ui';

type Area = 'hero' | 'announcements' | 'banners' | 'sections';
const areaLabels: Record<Area, string> = { hero: 'بداية الصفحة', announcements: 'شريط الإعلانات', banners: 'بنرات العروض', sections: 'أقسام الصفحة' };
const linkTypes: { id: LinkType; name: string }[] = [{ id: 'products', name: 'كل المنتجات' }, { id: 'product', name: 'منتج' }, { id: 'category', name: 'قسم' }, { id: 'none', name: 'بدون رابط' }];
const sectionNames = { categories: 'الأقسام', new: 'وصل حديثًا', featured: 'منتجات مميزة' };

export default function HomeEditor({ token }: { token: string }) {
  const [draft, setDraft] = useState<HomeContent | null>(null);
  const [published, setPublished] = useState<HomeContent | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [area, setArea] = useState<Area>('hero');
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    Promise.all([adminRequest<{ draft: HomeContent; published: HomeContent }>('/admin/home', token), adminRequest<Product[]>('/products', token), adminRequest<Category[]>('/admin/categories', token)])
      .then(([home, goods, groups]) => { setDraft(home.draft); setPublished(home.published); setProducts(goods); setCategories(groups); setError(''); })
      .catch(err => setError((err as Error).message));
  }, [token]);
  function changeHero(changes: Partial<HomeContent['hero']>) { setDraft(current => current && ({ ...current, hero: { ...current.hero, ...changes } })); }
  function changeAnnouncement(index: number, changes: Partial<HomeContent['announcements'][number]>) { setDraft(current => current && ({ ...current, announcements: current.announcements.map((item, i) => i === index ? { ...item, ...changes } : item) })); }
  function changeBanner(index: number, changes: Partial<HomeContent['banners'][number]>) { setDraft(current => current && ({ ...current, banners: current.banners.map((item, i) => i === index ? { ...item, ...changes } : item) })); }
  function changeSection(index: number, changes: Partial<HomeContent['sections'][number]>) { setDraft(current => current && ({ ...current, sections: current.sections.map((item, i) => i === index ? { ...item, ...changes } : item) })); }
  function swapSection(index: number, delta: number) { setDraft(current => { if (!current) return current; const next = [...current.sections]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return { ...current, sections: next }; }); }
  function linkTarget(type: LinkType, value: string, onChange: (id: string) => void) {
    if (type !== 'product' && type !== 'category') return null;
    return <Field label={type === 'product' ? 'المنتج الذي يفتح عند النقر' : 'القسم الذي يفتح عند النقر'}><select value={value} onChange={e => onChange(e.target.value)}><option value="">اختر {type === 'product' ? 'منتجًا' : 'قسمًا'}</option>{type === 'product' ? products.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : categories.filter(c => c.is_active || String(c.id) === value).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>;
  }
  function validateDraft(content: HomeContent) {
    const links = [{ label: 'زر البداية', ...content.hero }, ...content.announcements.filter(item => item.enabled).map(item => ({ label: 'شريط الإعلانات', ...item })), ...content.banners.filter(item => item.enabled).map(item => ({ label: 'بنر العرض', ...item }))];
    for (const link of links) {
      if (link.linkType === 'product' && !products.some(product => String(product.id) === link.linkId)) throw new Error(`اختر منتجًا صحيحًا لرابط ${link.label}`);
      if (link.linkType === 'category' && !categories.some(category => String(category.id) === link.linkId)) throw new Error(`اختر قسمًا صحيحًا لرابط ${link.label}`);
    }
  }
  async function chooseImage(file: File | undefined, callback: (url: string) => void) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) throw new Error('ارفع PNG أو JPEG أو WebP بحجم أقل من 6 م.ب');
      callback(await uploadMedia(file, token));
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!draft) return;
    setBusy(true); setError(''); setNotice('');
    try { validateDraft(draft); await adminRequest('/admin/home', token, 'PUT', draft); setNotice('حُفظت المسودة. التغيير لم يظهر للزبائن حتى تنشره.'); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!draft) return;
    setBusy(true); setError(''); setNotice('');
    try {
      validateDraft(draft);
      await adminRequest('/admin/home', token, 'PUT', draft);
      await adminRequest('/admin/home/publish', token, 'POST');
      setPublished(structuredClone(draft)); setNotice('نُشرت الرئيسية. افتح المتجر لمشاهدة النتيجة.');
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  if (!draft) return <section className="commerce-card">{error || 'جارٍ تحميل إعدادات الرئيسية…'}</section>;
  const activeAnnouncements = draft.announcements.filter(item => item.enabled);
  const previewImage = mobile && draft.hero.mobileImage || draft.hero.desktopImage || products.find(p => p.id === draft.hero.productId)?.images?.[0] || products.find(p => p.name.includes('أدون'))?.images?.[0] || products.find(p => p.is_featured)?.images?.[0] || '';
  return <div className="commerce-panel">
    <section className="commerce-card"><h2>تحرير الرئيسية</h2><p>غيّر العناصر، عاينها، ثم احفظ المسودة أو انشرها.</p>
      {error && <div className="admin-alert error" role="alert">{error}</div>}{notice && <div className="admin-alert success" role="status">{notice}</div>}
      <div className="commerce-editor-tabs">{(Object.keys(areaLabels) as Area[]).map(key => <button key={key} className={area === key ? 'active' : ''} onClick={() => setArea(key)}>{areaLabels[key]}</button>)}</div>
      {area === 'hero' && <div className="admin-form">
        <Field label="عبارة صغيرة فوق العنوان"><input value={draft.hero.eyebrow} onChange={e => changeHero({ eyebrow: e.target.value })} /></Field>
        <Field label="العنوان الرئيسي"><input value={draft.hero.title} onChange={e => changeHero({ title: e.target.value })} /></Field>
        <Field label="الوصف"><textarea rows={3} value={draft.hero.description} onChange={e => changeHero({ description: e.target.value })} /></Field>
        <Field label="مظهر بداية الصفحة"><select value={draft.hero.theme || 'light'} onChange={e => changeHero({ theme: e.target.value as 'light' | 'dark' })}><option value="light">فاتح</option><option value="dark">داكن للإعلانات</option></select></Field>
        <Field label="المنتج المرتبط بصورة البداية" hint="اختر منتجًا لعرض اسمه وسعره. لإعلان قسم كامل، اختر «بدون منتج محدد» وارفع صورة مخصصة."><select value={draft.hero.productId || ''} onChange={e => changeHero({ productId: e.target.value ? Number(e.target.value) : null })}><option value="">بدون منتج محدد</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field>
        <div className="admin-form-grid"><Field label="نص الزر"><input value={draft.hero.buttonLabel} onChange={e => changeHero({ buttonLabel: e.target.value })} /></Field><Field label="وجهة الزر"><select value={draft.hero.linkType} onChange={e => changeHero({ linkType: e.target.value as LinkType, linkId: '' })}>{linkTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div>
        {linkTarget(draft.hero.linkType, draft.hero.linkId, linkId => changeHero({ linkId }))}
        {(['desktopImage', 'mobileImage'] as const).map((key, index) => <div key={key}><div className="admin-media-section"><div><strong>صورة {index ? 'الجوال' : 'الكمبيوتر'}</strong><small>{index ? 'اختيارية؛ تُستخدم صورة الكمبيوتر عند غيابها.' : 'اختيارية؛ اتركها فارغة لاستخدام صورة المنتج المحدد.'} PNG أو JPEG أو WebP حتى 6 م.ب.</small></div><div className="commerce-form-row"><label className="admin-media-upload"><ImagePlus size={15} style={{ display: 'inline' }} /> رفع صورة<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { void chooseImage(e.target.files?.[0], url => changeHero({ [key]: url })); e.target.value = ''; }} /></label>{draft.hero[key] && <button className="admin-dense-btn" type="button" disabled={busy} onClick={() => changeHero({ [key]: '' })}>إزالة الصورة</button>}</div></div>{draft.hero[key] && <img className="commerce-image-preview" src={mediaUrl(draft.hero[key])} alt="معاينة صورة البداية" />}</div>)}
      </div>}
      {area === 'announcements' && <div>{draft.announcements.map((item, index) => <div className="commerce-repeat" key={item.id}><div className="commerce-repeat-head"><strong>رسالة {index + 1}</strong><button onClick={() => setDraft(current => current && ({ ...current, announcements: current.announcements.filter((_, i) => i !== index) }))}>حذف</button></div><Field label="نص الرسالة"><input value={item.text} onChange={e => changeAnnouncement(index, { text: e.target.value })} /></Field><Field label="الرابط"><select value={item.linkType} onChange={e => changeAnnouncement(index, { linkType: e.target.value as LinkType, linkId: '' })}>{linkTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></Field>{linkTarget(item.linkType, item.linkId, linkId => changeAnnouncement(index, { linkId }))}<label className="admin-check"><input type="checkbox" checked={item.enabled} onChange={e => changeAnnouncement(index, { enabled: e.target.checked })} />ظاهر</label></div>)}<button className="admin-dense-btn" onClick={() => setDraft(current => current && ({ ...current, announcements: [...current.announcements, { id: crypto.randomUUID(), text: '', enabled: true, linkType: 'products', linkId: '' }] }))}><Plus size={14} /> إضافة رسالة</button></div>}
      {area === 'banners' && <div>{draft.banners.map((banner, index) => <div className="commerce-repeat" key={banner.id}><div className="commerce-repeat-head"><strong>بنر {index + 1}</strong><button onClick={() => setDraft(current => current && ({ ...current, banners: current.banners.filter((_, i) => i !== index) }))}>حذف</button></div><Field label="العنوان"><input value={banner.title} onChange={e => changeBanner(index, { title: e.target.value })} /></Field><Field label="وصف قصير"><input value={banner.subtitle} onChange={e => changeBanner(index, { subtitle: e.target.value })} /></Field><div className="admin-media-section"><strong>صورة البنر</strong><label className="admin-media-upload">رفع صورة<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { void chooseImage(e.target.files?.[0], url => changeBanner(index, { image: url })); e.target.value = ''; }} /></label></div>{banner.image && <img className="commerce-image-preview" src={mediaUrl(banner.image)} alt="معاينة البنر" />}<Field label="الرابط"><select value={banner.linkType} onChange={e => changeBanner(index, { linkType: e.target.value as LinkType, linkId: '' })}>{linkTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></Field>{linkTarget(banner.linkType, banner.linkId, linkId => changeBanner(index, { linkId }))}<div className="admin-form-grid"><Field label="يبدأ في"><input type="datetime-local" value={banner.startsAt || ''} onChange={e => changeBanner(index, { startsAt: e.target.value || null })} /></Field><Field label="ينتهي في"><input type="datetime-local" value={banner.endsAt || ''} onChange={e => changeBanner(index, { endsAt: e.target.value || null })} /></Field></div><label className="admin-check"><input type="checkbox" checked={banner.enabled} onChange={e => changeBanner(index, { enabled: e.target.checked })} />ظاهر</label></div>)}<button className="admin-dense-btn" onClick={() => setDraft(current => current && ({ ...current, banners: [...current.banners, { id: crypto.randomUUID(), title: '', subtitle: '', image: '', enabled: false, linkType: 'products', linkId: '', startsAt: null, endsAt: null }] }))}><Plus size={14} /> إضافة بنر</button></div>}
      {area === 'sections' && <div>{draft.sections.map((section, index) => <div className="commerce-repeat" key={section.id}><div className="commerce-repeat-head"><strong>{sectionNames[section.id]}</strong><div><button disabled={index === 0} onClick={() => swapSection(index, -1)} aria-label="نقل للأعلى"><ArrowUp size={16} /></button><button disabled={index === draft.sections.length - 1} onClick={() => swapSection(index, 1)} aria-label="نقل للأسفل"><ArrowDown size={16} /></button></div></div><div className="admin-form-grid"><Field label="عنوان القسم"><input value={section.title} onChange={e => changeSection(index, { title: e.target.value })} /></Field><Field label="عدد العناصر"><input type="number" min="1" max="24" value={section.limit} onChange={e => changeSection(index, { limit: Number(e.target.value) })} /></Field></div><label className="admin-check"><input type="checkbox" checked={section.enabled} onChange={e => changeSection(index, { enabled: e.target.checked })} />ظاهر في المتجر</label></div>)}</div>}
      <div className="commerce-actions"><button className="admin-btn secondary" disabled={busy} onClick={() => void save()}><Save size={15} /> حفظ مسودة</button><button className="admin-btn" disabled={busy} onClick={() => void publish()}><Send size={15} /> نشر في المتجر</button></div>
      <p className="commerce-note" style={{ marginTop: 10 }}>المسودة تُحفظ على الخادم. آخر نسخة منشورة {published ? 'متاحة للزبائن' : 'غير متاحة'}.</p>
    </section>
    <section className="commerce-card"><div className="commerce-form-row" style={{ justifyContent: 'space-between' }}><div><h2>معاينة مباشرة</h2><p className="commerce-note">تتغير أثناء التحرير</p></div><button className="admin-dense-btn" onClick={() => setMobile(value => !value)}><Eye size={14} /> {mobile ? 'كمبيوتر' : 'جوال'}</button></div>
      <div className={`commerce-preview ${mobile ? 'mobile' : ''}`}><div className="commerce-preview-strip">{activeAnnouncements[0]?.text || 'سوق · منتجات مختارة'}</div><div className={`commerce-preview-hero ${draft.hero.theme === 'dark' ? 'dark' : ''}`}><div><small>{draft.hero.eyebrow}</small><h2>{draft.hero.title}</h2><p>{draft.hero.description}</p><span className="commerce-pill">{draft.hero.buttonLabel}</span></div>{previewImage ? <img src={mediaUrl(previewImage)} alt="معاينة البداية" /> : <div className="commerce-preview-empty">اختر منتجًا أو ارفع صورة</div>}</div>{draft.banners.filter(b => b.enabled && b.image).slice(0, 2).map(b => <img key={b.id} src={mediaUrl(b.image)} alt={b.title} style={{ width: '100%', height: 90, objectFit: 'cover' }} />)}{draft.sections.filter(s => s.enabled).map(section => <div className="commerce-preview-section" key={section.id}><h3>{section.title}</h3><div className="commerce-preview-mini"><div /><div /><div /></div></div>)}</div>
    </section>
  </div>;
}
