import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpLeft, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useCatalog } from '../context/CatalogContext';
import { useCategories } from '../context/CategoryContext';
import type { HomeContent, LinkType } from '../services/storefrontApi';
import { formatPrice, mediaUrl, storefrontRequest } from '../services/storefrontApi';
import ProductCard from '../components/ProductCard';

export default function StorefrontHomePage() {
  const { products, loading, error, refresh } = useCatalog();
  const { tree } = useCategories();
  const { navigate } = useApp();
  const [home, setHome] = useState<HomeContent | null>(null);
  const [homeError, setHomeError] = useState('');
  useEffect(() => { storefrontRequest<HomeContent>('/storefront/home').then(setHome).catch(err => setHomeError((err as Error).message)); }, []);

  function follow(type: LinkType, id: string) {
    if (type === 'product' && id) navigate('product-detail', { productId: id });
    if (type === 'category' && id) navigate('products', { categoryId: id });
    if (type === 'products') navigate('products');
  }

  if (loading || !home) return <main className="min-h-[60vh] flex items-center justify-center text-muted">جارٍ تحميل المتجر…</main>;
  if (error || homeError) return <main className="min-h-[60vh] flex flex-col gap-4 items-center justify-center text-muted"><p>{error || homeError}</p><button className="px-5 py-2 rounded-xl bg-ink text-white" onClick={() => { void refresh(); storefrontRequest<HomeContent>('/storefront/home').then(setHome).catch(err => setHomeError((err as Error).message)); }}>إعادة المحاولة</button></main>;

  const heroProduct = products.find(product => product.id === String(home.hero.productId)) || products.find(product => product.name.includes('سيينا')) || products.find(product => product.isFeatured) || products[0];
  const heroImage = home.hero.desktopImage ? mediaUrl(home.hero.desktopImage) : heroProduct?.image || '';
  const mobileImage = home.hero.mobileImage ? mediaUrl(home.hero.mobileImage) : heroImage;
  const now = Date.now();
  const banners = home.banners.filter(banner => banner.enabled && banner.image && (!banner.startsAt || Date.parse(banner.startsAt) <= now) && (!banner.endsAt || Date.parse(banner.endsAt) >= now));
  const announcementItems = home.announcements.filter(item => item.enabled && item.text);

  return <main className="pb-24 sm:pb-0 bg-[#fafaf7]">
    {announcementItems.length > 0 && <div className="bg-[#253126] text-[#f5f1e9] overflow-x-auto no-scrollbar"><div className="max-w-7xl mx-auto flex items-center justify-center gap-8 sm:gap-14 px-5 py-3 min-w-max text-[11px] sm:text-xs">{announcementItems.map(item => <button key={item.id} onClick={() => follow(item.linkType, item.linkId)} className="flex items-center gap-2 hover:text-white"><Sparkles size={13} className="text-[#c9a976]" />{item.text}</button>)}</div></div>}

    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-9">
      <div className="grid lg:grid-cols-[1fr_1.05fr] rounded-[28px] overflow-hidden min-h-[520px] lg:min-h-[560px] shadow-[0_28px_80px_#26312615]">
        <div className="relative flex flex-col justify-center order-2 lg:order-1 px-7 sm:px-12 lg:px-16 py-11 sm:py-16 bg-[#273428] text-white">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold text-[#dec8a8] mb-5"><span className="h-px w-7 bg-[#dec8a8]" />{home.hero.eyebrow}</span>
          <h1 className="text-[39px] leading-[1.16] sm:text-6xl lg:text-[74px] font-black max-w-[650px] tracking-tight">{home.hero.title}</h1>
          <p className="text-[#d9ded3] text-sm sm:text-base leading-8 mt-6 max-w-[490px]">{home.hero.description}</p>
          <div className="flex flex-wrap gap-3 mt-8"><button onClick={() => follow(home.hero.linkType, home.hero.linkId)} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#d2ad78] text-[#222a21] rounded-full font-bold text-sm hover:bg-[#e4c392] transition-colors">{home.hero.buttonLabel}<ArrowLeft size={16} /></button><button onClick={() => navigate('products')} className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/30 text-white rounded-full text-sm hover:bg-white/10">تصفح المنتجات</button></div>
          <div className="flex items-center gap-5 mt-10 pt-7 border-t border-white/15 text-xs text-[#d5ddcf]"><span className="flex items-center gap-2"><Truck size={16} /> توصيل داخل اليمن</span><span className="flex items-center gap-2"><ShieldCheck size={16} /> طلب آمن</span></div>
        </div>
        <div className="relative order-1 lg:order-2 bg-[#e8e9e1] min-h-[335px] sm:min-h-[460px]"><picture>{mobileImage && <source media="(max-width: 639px)" srcSet={mobileImage} />}{heroImage && <img src={heroImage} alt={heroProduct?.name || home.hero.title} className="absolute inset-0 w-full h-full object-cover" />}</picture><div className="absolute inset-0 bg-gradient-to-t from-[#1d281d]/35 via-transparent to-transparent" />{heroProduct && <button onClick={() => navigate('product-detail', { productId: heroProduct.id })} className="absolute bottom-5 right-5 left-5 sm:right-auto sm:left-6 flex items-center justify-between gap-5 rounded-2xl bg-white/95 backdrop-blur px-4 py-3 text-right shadow-xl"><span><strong className="block text-sm text-ink">{heroProduct.name}</strong><small className="text-muted text-xs">منتج من سوق</small></span><b className="text-brand text-sm whitespace-nowrap">{formatPrice(heroProduct.price)}</b></button>}</div>
      </div>
    </section>

    {home.sections.map(section => {
      if (!section.enabled) return null;
      if (section.id === 'categories') return <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-14"><div className="flex items-end justify-between mb-6"><div><span className="text-xs font-bold text-[#9b7956]">اكتشف ما يناسبك</span><h2 className="text-2xl sm:text-3xl font-black text-ink mt-1">{section.title}</h2></div><button onClick={() => navigate('products')} className="text-sm text-[#566c51] flex items-center gap-1">عرض الكل <ArrowUpLeft size={16} /></button></div><div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">{tree.slice(0, section.limit).map(category => <button key={category.id} onClick={() => navigate('products', { categoryId: category.id })} className="group rounded-2xl bg-white border border-[#eaebe5] overflow-hidden text-right hover:shadow-lg transition-shadow"><div className="aspect-square bg-[#f2f2ed] overflow-hidden">{category.imageUrl && <img src={category.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}</div><span className="block text-xs font-bold text-ink p-3 truncate">{category.name}</span></button>)}</div></section>;
      const selected = (section.id === 'new' ? products.filter(product => product.isNew) : products.filter(product => product.isFeatured)).slice(0, section.limit);
      return <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-10"><div className="flex items-end justify-between mb-6"><div><span className="text-xs font-bold text-[#9b7956]">مختارات سوق</span><h2 className="text-2xl sm:text-3xl font-black text-ink mt-1">{section.title}</h2></div><button onClick={() => navigate('products')} className="text-sm text-[#566c51] flex items-center gap-1">عرض الكل <ArrowUpLeft size={16} /></button></div>{selected.length ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">{selected.map(product => <ProductCard key={product.id} product={product} />)}</div> : <p className="rounded-2xl bg-white p-8 text-muted text-center">أضف منتجات لهذا القسم من لوحة الإدارة.</p>}</section>;
    })}

    {banners.length > 0 && <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-2 gap-5">{banners.map(banner => <button key={banner.id} onClick={() => follow(banner.linkType, banner.linkId)} className="relative min-h-[250px] rounded-[26px] overflow-hidden text-right group"><img src={mediaUrl(banner.image)} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /><span className="absolute inset-0 bg-gradient-to-l from-black/70 to-transparent" /><span className="relative z-10 block p-8 text-white"><small className="text-[#ebd0a8]">{banner.subtitle}</small><strong className="block text-3xl font-black mt-2 max-w-xs">{banner.title}</strong><span className="inline-flex items-center gap-2 mt-6 text-sm">تسوق الآن <ArrowLeft size={16} /></span></span></button>)}</section>}
  </main>;
}
