import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Sparkles, Star, Quote, FolderOpen } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useCategories } from '../context/CategoryContext';
import { useCatalog } from '../context/CatalogContext';
import ProductCard from '../components/ProductCard';
import Floating from '../components/Floating';
import CaseShowcase from '../components/CaseShowcase';
import InterestsPicker from '../components/InterestsPicker';
import { customerRequest } from '../services/customerAuth';
import TiltCard from '../components/TiltCard';
import { useReveal } from '../hooks/useReveal';
import { startProductTransition } from '../services/motion';
import type { HomeContent, LinkType } from '../services/storefrontApi';
import { formatPrice, mediaUrl, storefrontRequest } from '../services/storefrontApi';

let cachedHome: HomeContent | null = null;
const loadingAnnouncement: HomeContent['announcements'] = [
  { id: 'loading', text: 'تسوّق أحدث منتجات سوق', enabled: true, linkType: 'products', linkId: '' },
];

function AnnouncementStrip({ items, follow }: { items: HomeContent['announcements']; follow: (type: LinkType, id: string) => void }) {
  if (!items.length) return null;
  return <div className="announcement-strip" dir="ltr" aria-label="إعلانات المتجر">
    <div className="marquee-track">
      {[0, 1].map(copy => <div className="marquee-set" key={copy} aria-hidden={copy === 1 ? true : undefined}>
        {items.map(item => <button key={item.id} type="button" tabIndex={copy === 1 ? -1 : undefined} onClick={() => follow(item.linkType, item.linkId)} dir="rtl">
          <Sparkles size={12} className="text-brand shrink-0" aria-hidden="true" />{item.text}
        </button>)}
      </div>)}
    </div>
  </div>;
}

export default function HomePage() {
  const { products } = useCatalog();
  const { navigate, interests, setInterests, interestMatches, customer, refreshCustomerProfile } = useApp();
  const { tree: categories } = useCategories();
  const [home, setHome] = useState<HomeContent | null>(() => cachedHome);
  const [homeError, setHomeError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const newReveal = useReveal<HTMLElement>();

  /* Ranked category ids: picked children first, then their sections, then the rest. */
  const interestRank = useMemo(() => {
    const rank = new Map<string, number>();
    const childToSection = new Map<string, string>();
    for (const section of categories) {
      for (const child of section.children) {
        childToSection.set(child.id, section.id);
        for (const grandchild of child.children) childToSection.set(grandchild.id, section.id);
      }
    }
    interests.forEach((id, index) => {
      if (!rank.has(id)) rank.set(id, index + 1);
      const section = childToSection.get(id);
      if (section && !rank.has(section)) rank.set(section, index + 1);
    });
    return rank;
  }, [interests, categories]);

  /* Ids the storefront matches products against: the picks expanded down the
     tree, held in the app context so onboarding, picker and home agree. */
  const interestSet = useMemo(() => new Set(interestMatches), [interestMatches]);

  const rankedCategories = useMemo(() => {
    if (!interestRank.size) return categories;
    return [...categories].sort((a, b) => (interestRank.get(a.id) ?? 999) - (interestRank.get(b.id) ?? 999));
  }, [categories, interestRank]);

  useEffect(() => {
    const controller = new AbortController();
    void storefrontRequest<HomeContent>('/storefront/home', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { cachedHome = data; setHome(data); } })
      .catch(() => { if (!controller.signal.aborted) setHomeError('تعذر تحميل عروض الرئيسية.'); });
    return () => controller.abort();
  }, []);

  function follow(type: LinkType, id: string) {
    if (type === 'product' && id) navigate('product-detail', { productId: id });
    else if (type === 'category' && id) navigate('products', { categoryId: id });
    else if (type === 'products') navigate('products');
  }

  const linkedHero = products.find(p => p.id === String(home?.hero.productId));
  const hero = linkedHero || (home && !home.hero.desktopImage ? products.find((p) => p.name.includes('أدون')) || products[0] : undefined);
  const featured = products.filter((p) => p.isFeatured);
  const newArrivals = products.filter((p) => p.isNew);
  const announcements = home?.announcements.filter(item => item.enabled && item.text) || [];
  const heroTitle = home?.hero.title || 'فخامة تُصنع لك';
  const titleParts = heroTitle.split(/\s+/, 2);
  const heroFirstLine = titleParts[0];
  const heroSecondLine = heroTitle.slice(heroFirstLine.length).trim();
  const heroImage = home?.hero.desktopImage ? mediaUrl(home.hero.desktopImage) : hero?.image;
  const mobileImage = home?.hero.mobileImage ? mediaUrl(home.hero.mobileImage) : heroImage;
  const darkHero = home?.hero.theme === 'dark';
  const sections = home?.sections || [
    { id: 'categories' as const, title: 'تسوّق بالقسم', enabled: true, limit: 8 },
    { id: 'new' as const, title: 'وصل حديثاً', enabled: true, limit: 4 },
    { id: 'featured' as const, title: 'الأكثر رواجاً', enabled: true, limit: 8 },
  ];
  const categorySection = sections.find(section => section.id === 'categories');
  const newSection = sections.find(section => section.id === 'new');
  const featuredSection = sections.find(section => section.id === 'featured');
  const sectionOrder = (id: HomeContent['sections'][number]['id']) => 10 + Math.max(0, sections.findIndex(section => section.id === id)) * 10;
  const now = Date.now();
  const banners = home?.banners.filter(b => b.enabled && b.image && (!b.startsAt || Date.parse(b.startsAt) <= now) && (!b.endsAt || Date.parse(b.endsAt) >= now)) || [];

  /* Personalisation: products inside a picked interest float to the front of
     every grid, and the showcase is built from them before anything else.
     A stable sort keeps the server order within each group. */
  function rankProducts(list: typeof products) {
    if (!interestSet.size) return list;
    return list
      .map((product, index) => ({ product, picked: interestSet.has(product.category) ? 0 : 1, index }))
      .sort((a, b) => a.picked - b.picked || a.index - b.index)
      .map(entry => entry.product);
  }
  const rankedNew = rankProducts(newArrivals);
  const rankedFeatured = rankProducts(featured);
  const showcaseItems = useMemo(() => {
    const source = featured.length ? featured : products;
    const picked = interestSet.size ? source.filter(product => interestSet.has(product.category)) : [];
    return [...picked, ...source.filter(product => !picked.includes(product))];
  }, [featured, products, interestSet]);
  const pickedCount = interestSet.size ? products.filter(product => interestSet.has(product.category)).length : 0;

  if (!home) return <main aria-busy={!homeError}>
    <AnnouncementStrip items={loadingAnnouncement} follow={follow} />
    <div className="min-h-[min(760px,80dvh)] bg-[#eff1eb] px-4 py-16 flex items-center justify-center">
      {homeError ? <div className="text-center text-ink"><p>{homeError}</p><button className="mt-4 min-h-12 rounded-xl bg-ink px-6 text-white" onClick={() => { setHomeError(''); void storefrontRequest<HomeContent>('/storefront/home').then(data => { cachedHome = data; setHome(data); }).catch(() => setHomeError('تعذر تحميل عروض الرئيسية.')); }}>إعادة المحاولة</button></div> : <span role="status" className="text-muted">جارٍ تحميل عروض المتجر…</span>}
    </div>
  </main>;
  if (!hero && !heroImage) return <main className="max-w-7xl mx-auto px-6 py-24 text-center">لا توجد صورة للعرض حالياً.</main>;

  return (
    <main className="page-transition flex flex-col">
      {/* ── Promotional marquee ─────────────────────────────── */}
      <AnnouncementStrip items={announcements} follow={follow} />

      {/* ── Interests (personalisation entry point) ─────────── */}
      <section ref={newReveal} className="reveal-up w-full max-w-7xl mx-auto px-4 pt-5 sm:px-6 sm:pt-7">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand"><Sparkles size={20} /></span>
            <div className="min-w-0">
              <p className="text-sm font-black text-ink sm:text-base">
                {interests.length ? 'رُتّبت الرئيسية على اهتماماتك' : 'أخبرنا بما يهمّك'}
              </p>
              <p className="truncate text-xs text-muted">
                {interests.length
                  ? `${pickedCount} منتج مطابق لاختياراتك — الأقرب لك أولاً.`
                  : 'اختر أقسامك مرة واحدة وسنرتّب لك الأقرب.'}
              </p>
            </div>
          </div>
          <button onClick={() => customer ? setPickerOpen(true) : navigate('login')} className="press shrink-0 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-brand hover:text-brand">
            {interests.length ? 'تعديل اهتماماتي' : 'اختيار اهتماماتي'}
          </button>
        </div>
      </section>

      <InterestsPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSaved={async ids => {
        if (!customer) throw new Error('سجّل الدخول أولًا.');
        await customerRequest('/storefront/me/interests', customer, 'PUT', { interests: ids });
        setInterests(ids);
        await refreshCustomerProfile();
      }} />

      {/* ── Hero with ghost word ────────────────────────────── */}
      <section className={`relative overflow-hidden pt-4 pb-[calc(88px+var(--app-safe-bottom))] sm:pt-16 sm:pb-24 ${darkHero ? 'text-white' : 'bg-canvas'}`} style={darkHero ? { background: 'radial-gradient(circle at 52% 35%, #2b5958 0%, #163b3b 45%, #0b2528 100%)' } : undefined}>
        <div
          aria-hidden="true"
          className="ghost-word text-[34vw] sm:text-[22vw] lg:text-[16vw]"
          style={{ WebkitTextStroke: darkHero ? '1.5px rgba(255,255,255,0.12)' : '1.5px rgba(26,22,20,0.09)' }}
        >
          تسوق
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 items-center gap-6 lg:gap-8">
            <div className="fade-up text-center lg:text-right order-1 flex min-w-0 flex-col items-center gap-4 lg:items-start">
              <span className={`order-1 inline-flex items-center gap-2 text-xs font-bold tracking-wide border rounded-full px-3 py-1.5 ${darkHero ? 'text-[#f0d3a0] border-[#e4ba74]/50 bg-white/10' : 'text-brand border-brand/40 bg-brand-50'}`}>
                <Sparkles size={13} />
                {home?.hero.eyebrow || 'تشكيلة مختارة لك'}
              </span>
              <h1 className={`hero-mobile-title order-2 ${darkHero ? 'text-white' : 'text-ink'}`}>
                {heroFirstLine}{' '}
                <span className={darkHero ? 'text-[#edc987]' : 'text-brand'}>{heroSecondLine}</span>
              </h1>
              <p className={`${darkHero ? 'text-white/75' : 'text-muted'} order-4 sm:order-3 text-base sm:text-lg leading-relaxed max-w-md`}>
                {home?.hero.description || 'قطع مختارة بعناية من أفضل الماركات — جودة لا تُقارن، وأسلوب يشبهك.'}
              </p>
              <div className="order-3 sm:order-4 flex items-center gap-2 flex-wrap justify-center lg:justify-start">
                <button
                  onClick={() => follow(home?.hero.linkType || 'products', home?.hero.linkId || '')}
                  className={`animate-pulse-soft flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95 ${darkHero ? 'bg-[#e9bf77] text-[#183331] hover:bg-[#f4d396]' : 'bg-brand text-white hover:bg-brand-600'}`}
                >
                  {home?.hero.buttonLabel || 'اكتشف المزيد'}
                  <ArrowLeft size={18} />
                </button>
                <button
                  onClick={() => navigate('products')}
                  className={`px-6 py-3 border rounded-2xl font-medium transition-colors ${darkHero ? 'border-white/35 text-white hover:bg-white/10' : 'border-border-strong text-ink hover:border-ink'}`}
                >
                  تصفح المنتجات
                </button>
              </div>

              {/* Stats like TSSF 120+ / 4.9 */}
              <div className="order-5 flex items-center gap-6 sm:gap-10 mt-2 sm:mt-6 justify-center lg:justify-start">
                {[
                  { num: String(products.length), label: 'منتج مختار' },
                  { num: String(featured.length), label: 'منتج مميز' },
                  { num: String(new Set(products.map(p => p.brand).filter(Boolean)).size), label: 'علامة تجارية' },
                ].map(({ num, label }) => (
                  <div key={label} className="text-center lg:text-right">
                    <p className={`text-2xl sm:text-3xl font-black flex items-center gap-1 justify-center lg:justify-start ${darkHero ? 'text-white' : 'text-ink'}`}>
                      {num}
                      {label === 'منتج مميز' && (
                        <Star size={18} className={darkHero ? 'fill-[#e9bf77] text-[#e9bf77]' : 'fill-brand text-brand'} />
                      )}
                    </p>
                    <p className={`text-xs mt-0.5 ${darkHero ? 'text-white/60' : 'text-muted'}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating product panel */}
            <div className="order-2 fade-up fade-up-2 flex justify-center items-center sm:min-h-[440px]">
              <div
                className="relative w-full flex items-center justify-center py-4 sm:py-8"
              >
                <div
                  className="absolute bottom-4 w-44 h-8 rounded-full blur-2xl opacity-60"
                  style={{ backgroundColor: darkHero ? 'rgba(226,190,122,0.25)' : 'rgba(179,38,30,0.25)' }}
                />
                {heroImage ? <Floating shadowColor={darkHero ? 'rgba(0,0,0,0.45)' : 'rgba(26,22,20,0.28)'} className="relative z-10"><TiltCard max={7} depth={10} radius="24px" className="relative z-10"><picture className="relative z-10 block"><source media="(max-width: 639px)" srcSet={mobileImage || undefined} /><img
                  src={heroImage}
                  alt={hero?.name || heroTitle}
                  loading="eager"
                  decoding="async"
                  width={640}
                  height={640}
                  onClick={e => { if (hero) { startProductTransition(e.currentTarget); navigate('product-detail', { productId: hero.id }); } else follow(home?.hero.linkType || 'products', home?.hero.linkId || ''); }}
                  className={`product-crisp cursor-pointer transition-transform duration-500 hover:scale-[1.03] ${home?.hero.desktopImage || hero?.name.includes('أدون') ? 'studio-chair-cutout' : 'product-float'} ${darkHero ? 'w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[30rem] max-h-[420px] object-contain' : 'w-full max-w-[240px] sm:max-w-[288px] lg:max-w-96 object-contain'}`}
                /></picture></TiltCard></Floating> : <div className="relative z-10 flex h-64 w-64 items-center justify-center rounded-2xl bg-surface text-muted">لا توجد صورة للمنتج</div>}
                {/* Floating price tag */}
                {hero && <button
                  onClick={() => navigate('product-detail', { productId: hero.id })}
                  className="animate-pop absolute top-5 left-5 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-2.5 text-right"
                >
                  <p className="text-[10px] text-muted">{hero.name}</p>
                  <p className="text-sm font-black text-ink">
                    {formatPrice(hero.price)}
                  </p>
                </button>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories pills ────────────────────────────────── */}
      {categorySection?.enabled && <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10" style={{ order: sectionOrder('categories') }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="display-lg text-ink">{categorySection.title}</h2>
          <button
            onClick={() => navigate('products')}
            className="flex items-center gap-1 text-sm text-muted hover:text-brand transition-colors"
          >
            عرض الكل
          </button>
        </div>
        <div className="stagger grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {rankedCategories.slice(0, categorySection.limit).map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate('products', { categoryId: cat.id })}
              className="group press relative flex flex-col items-center gap-2.5 p-3 sm:p-4 bg-white rounded-2xl border border-border hover:border-brand hover:shadow-lg hover:shadow-brand/10 hover:-translate-y-1 transition-all active:scale-[0.97]"
              title={interestRank.has(cat.id) ? 'من اهتماماتك' : undefined}
            >
              {interestRank.has(cat.id) && (
                <span className="absolute -top-1.5 right-3 rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold text-white">لك</span>
              )}
              <div className="w-full aspect-[1.16/1] sm:aspect-square rounded-xl overflow-hidden bg-surface">
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#f6f3e9] via-[#eeeee6] to-[#e7ebdf] flex items-center justify-center">
                    <span className="w-14 h-14 rounded-2xl bg-white/70 border border-white shadow-sm flex items-center justify-center text-[#8c936f] group-hover:text-brand transition-colors">
                      <FolderOpen size={26} strokeWidth={1.5} />
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-ink-soft group-hover:text-brand transition-colors text-center leading-tight">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </section>}

      {/* ── 3D case showcase (personalised order) ────────────── */}
      <div className="w-full" style={{ order: sectionOrder('categories') + 1 }}><CaseShowcase products={showcaseItems} /></div>

      {/* ── New arrivals strip ───────────────────────────────── */}
      {newSection?.enabled && <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10" style={{ order: sectionOrder('new') }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="display-lg text-ink">{newSection.title}</h2>
          <button
            onClick={() => navigate('products')}
            className="flex items-center gap-1 text-sm text-muted hover:text-brand transition-colors"
          >
            + {products.filter((p) => p.isNew).length} منتجات جديدة
          </button>
        </div>
        <div className="stagger grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {rankedNew.slice(0, newSection.limit).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>}

      {/* ── Photo banners (DROPSET style) ───────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10" style={{ order: sectionOrder('new') + 1 }}>
        <div className="grid sm:grid-cols-2 gap-4">
          {banners.map(({ title, subtitle, image, linkType, linkId }) => (
            <button
              type="button"
              key={title}
              onClick={() => follow(linkType, linkId)}
              className="relative isolate flex min-h-[256px] flex-col justify-end gap-2 overflow-hidden rounded-3xl bg-surface p-4 text-right cursor-pointer group sm:p-6"
            >
              <img
                src={mediaUrl(image)}
                alt=""
                className="absolute inset-0 -z-20 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <span className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
              <span className="text-white/85 text-sm">{subtitle}</span>
              <strong className="text-white text-[clamp(28px,8vw,36px)] leading-[1.1] font-black break-words">{title}</strong>
              <span className="inline-flex items-center gap-2 text-white font-bold">تسوق الآن <ArrowLeft size={18} /></span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Featured products ───────────────────────────────── */}
      {featuredSection?.enabled && <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10" style={{ order: sectionOrder('featured') }}>
        <h2 className="display-lg text-ink mb-6">{featuredSection.title}</h2>
        <div className="stagger grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {rankedFeatured.slice(0, featuredSection.limit).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>}

      {/* ── Testimonial ─────────────────────────────────────── */}
      <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center" style={{ order: 90 }}>
        <Quote size={36} className="mx-auto text-brand mb-5" />
        <p className="text-lg sm:text-2xl font-bold text-ink leading-relaxed mb-6">
          اختيارات متنوعة، صور واضحة، وطلب تتابع حالته خطوة بخطوة.
        </p>
        <p className="text-sm font-medium text-ink">سوق، بكل بساطة</p>
      </section>

      {/* ── Partners strip ──────────────────────────────────── */}
      <section className="border-t border-border py-10" style={{ order: 91 }}>
        <p className="text-center text-xs text-muted tracking-widest mb-6">
          علامات نثق بها
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4">
          {['دار الطيب', 'بيت الأزياء', 'فلورنتينا', 'مابودالا', 'لومير', 'تاج الوقت'].map(
            (brand) => (
              <span
                key={brand}
                className="text-lg font-black text-ink/20 hover:text-brand/60 transition-colors cursor-default"
              >
                {brand}
              </span>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
