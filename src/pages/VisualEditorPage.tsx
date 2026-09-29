import { useMemo, useState } from 'react';
import { Puck, type Config, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { products, getFeaturedProducts, getNewProducts, getSaleProducts } from '../data/products';
import { seedCategories } from '../data/categories';
import { Star, Truck, ShieldCheck, RotateCcw, Headphones, Heart, ShoppingCart, Quote } from 'lucide-react';
import SafeImage from '../components/SafeImage';

/* ── Types ───────────────────────────────────────────────────── */
type EditorProps = {
  Hero: { title: string; subtitle: string; buttonLabel: string; background: string; textColor: string };
  Heading: { text: string; size: 'small' | 'medium' | 'large'; color: string; align: 'right' | 'center' | 'left' };
  Paragraph: { text: string; color: string; align: 'right' | 'center' | 'left' };
  Button: { label: string; background: string; color: string; radius: number };
  Spacer: { height: number };
  ProductGrid: { filter: 'featured' | 'new' | 'sale' | 'all'; columns: number; count: number };
  CategoryGrid: { columns: number; count: number };
  PromoBanner: { title: string; subtitle: string; coupon: string; bgImage: string; bgColor: string; textColor: string };
  ImageCard: { image: string; title: string; subtitle: string; height: number; overlay: boolean };
  FeatureGrid: { columns: number };
  Divider: { thickness: number; color: string; margin: number };
  ImageBanner: { image: string; title: string; subtitle: string; buttonLabel: string; height: number; overlayOpacity: number };
  Testimonial: { name: string; rating: number; text: string; avatar: string };
};

const STORAGE_KEY = 'souq-visual-editor-v1';

/* ── Helpers ─────────────────────────────────────────────────── */
const topCategories = seedCategories.filter((c) => c.level === 1 && c.isActive);

function getFilteredProducts(filter: string) {
  switch (filter) {
    case 'featured': return getFeaturedProducts();
    case 'new': return getNewProducts();
    case 'sale': return getSaleProducts();
    default: return products;
  }
}

const featureItems = [
  { icon: 'truck', title: 'شحن مجاني', desc: 'للطلبات فوق 200 ر.س' },
  { icon: 'shield', title: 'ضمان الجودة', desc: 'منتجات أصلية 100%' },
  { icon: 'return', title: 'إرجاع سهل', desc: 'خلال 15 يوم' },
  { icon: 'support', title: 'دعم متواصل', desc: 'خدمة عملاء 24/7' },
];

function FeatureIcon({ icon, size = 22 }: { icon: string; size?: number }) {
  switch (icon) {
    case 'truck': return <Truck size={size} />;
    case 'shield': return <ShieldCheck size={size} />;
    case 'return': return <RotateCcw size={size} />;
    case 'support': return <Headphones size={size} />;
    default: return <Star size={size} />;
  }
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          className={i < Math.round(rating) ? 'text-brand fill-brand' : 'text-border'}
        />
      ))}
    </div>
  );
}

/* ── Config ──────────────────────────────────────────────────── */
const config: Config<EditorProps> = {
  categories: {
    content: { title: 'المحتوى', components: ['Heading', 'Paragraph', 'Button', 'Spacer', 'Divider'] },
    sections: { title: 'الأقسام', components: ['Hero', 'ImageBanner', 'ImageCard'] },
    products: { title: 'المنتجات', components: ['ProductGrid', 'CategoryGrid'] },
    promo: { title: 'الترويج', components: ['PromoBanner', 'FeatureGrid', 'Testimonial'] },
  },
  components: {
    /* ── Hero (existing) ─────────────────────────────────── */
    Hero: {
      label: 'واجهة رئيسية',
      fields: {
        title: { type: 'text', label: 'العنوان' },
        subtitle: { type: 'textarea', label: 'الوصف' },
        buttonLabel: { type: 'text', label: 'نص الزر' },
        background: { type: 'text', label: 'لون الخلفية' },
        textColor: { type: 'text', label: 'لون النص' },
      },
      defaultProps: {
        title: 'أناقتك، بأسلوبك',
        subtitle: 'منتجات مختارة بعناية وجودة تناسبك.',
        buttonLabel: 'تسوق الآن',
        background: '#1a1614',
        textColor: '#ffffff',
      },
      render: ({ title, subtitle, buttonLabel, background, textColor }) => (
        <section dir="rtl" style={{ background, color: textColor }} className="px-8 py-20 sm:px-16 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <h1 className="mb-4 text-4xl font-bold sm:text-6xl">{title}</h1>
            <p className="mb-8 max-w-xl text-lg opacity-75">{subtitle}</p>
            <button className="rounded-xl bg-[#c9973f] px-6 py-3 font-bold text-white">{buttonLabel}</button>
          </div>
        </section>
      ),
    },

    /* ── Heading (existing) ──────────────────────────────── */
    Heading: {
      label: 'عنوان',
      fields: {
        text: { type: 'text', label: 'النص' },
        size: { type: 'select', label: 'الحجم', options: [
          { label: 'صغير', value: 'small' }, { label: 'متوسط', value: 'medium' }, { label: 'كبير', value: 'large' },
        ] },
        color: { type: 'text', label: 'اللون' },
        align: { type: 'select', label: 'المحاذاة', options: [
          { label: 'يمين', value: 'right' }, { label: 'وسط', value: 'center' }, { label: 'يسار', value: 'left' },
        ] },
      },
      defaultProps: { text: 'عنوان جديد', size: 'medium', color: '#1a1614', align: 'right' },
      render: ({ text, size, color, align }) => (
        <h2 dir="rtl" style={{ color, textAlign: align }} className={`mx-auto max-w-7xl px-6 py-5 font-bold ${size === 'large' ? 'text-4xl' : size === 'small' ? 'text-xl' : 'text-3xl'}`}>{text}</h2>
      ),
    },

    /* ── Paragraph (existing) ────────────────────────────── */
    Paragraph: {
      label: 'فقرة',
      fields: {
        text: { type: 'textarea', label: 'النص' },
        color: { type: 'text', label: 'اللون' },
        align: { type: 'select', label: 'المحاذاة', options: [
          { label: 'يمين', value: 'right' }, { label: 'وسط', value: 'center' }, { label: 'يسار', value: 'left' },
        ] },
      },
      defaultProps: { text: 'اكتب النص هنا', color: '#4a4540', align: 'right' },
      render: ({ text, color, align }) => <p dir="rtl" style={{ color, textAlign: align }} className="mx-auto max-w-7xl px-6 py-4 text-lg leading-8">{text}</p>,
    },

    /* ── Button (existing) ───────────────────────────────── */
    Button: {
      label: 'زر',
      fields: {
        label: { type: 'text', label: 'النص' },
        background: { type: 'text', label: 'لون الخلفية' },
        color: { type: 'text', label: 'لون النص' },
        radius: { type: 'number', label: 'استدارة الحواف', min: 0, max: 40 },
      },
      defaultProps: { label: 'اضغط هنا', background: '#c9973f', color: '#ffffff', radius: 12 },
      render: ({ label, background, color, radius }) => (
        <div dir="rtl" className="mx-auto max-w-7xl px-6 py-4"><button style={{ background, color, borderRadius: radius }} className="px-6 py-3 font-bold">{label}</button></div>
      ),
    },

    /* ── Spacer (existing) ───────────────────────────────── */
    Spacer: {
      label: 'مسافة',
      fields: { height: { type: 'number', label: 'الارتفاع', min: 8, max: 300 } },
      defaultProps: { height: 48 },
      render: ({ height }) => <div style={{ height }} />,
    },

    /* ── ProductGrid (NEW) ───────────────────────────────── */
    ProductGrid: {
      label: 'شبكة منتجات',
      fields: {
        filter: { type: 'select', label: 'نوع المنتجات', options: [
          { label: 'الكل', value: 'all' },
          { label: 'المميزة', value: 'featured' },
          { label: 'الجديدة', value: 'new' },
          { label: 'العروض', value: 'sale' },
        ] },
        columns: { type: 'select', label: 'عدد الأعمدة', options: [
          { label: '2 أعمدة', value: '2' },
          { label: '3 أعمدة', value: '3' },
          { label: '4 أعمدة', value: '4' },
        ] },
        count: { type: 'number', label: 'عدد المنتجات', min: 1, max: 12 },
      },
      defaultProps: { filter: 'featured', columns: 4, count: 4 },
      render: ({ filter, columns, count }) => {
        const items = getFilteredProducts(filter).slice(0, count);
        const colsClass = columns >= 4 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : columns >= 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2';
        return (
          <div dir="rtl" className="mx-auto max-w-7xl px-6 py-6">
            <div className={`grid ${colsClass} gap-3 sm:gap-4`}>
              {items.map((product) => {
                const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
                return (
                  <article key={product.id} className="group relative flex flex-col bg-white rounded-xl border border-[#e8e4dc] overflow-hidden">
                    <div className="relative aspect-square overflow-hidden bg-[#f4f2ee]">
                      <SafeImage src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" fallbackClassName="w-full h-full" />
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {product.badge === 'new' && <span className="text-[11px] font-bold bg-[#c9973f] text-white px-2 py-0.5 rounded-md">جديد</span>}
                        {discount > 0 && <span className="text-[11px] font-bold bg-[#dc2626] text-white px-2 py-0.5 rounded-md">-{discount}%</span>}
                      </div>
                      <button className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-[#e8e4dc] text-[#7a7570]">
                        <Heart size={15} />
                      </button>
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <p className="text-[11px] text-[#7a7570] mb-1">{product.brand}</p>
                      <h3 className="text-sm font-medium text-[#1a1614] line-clamp-2 leading-snug mb-2">{product.name}</h3>
                      <div className="flex items-center gap-1 mb-2.5">
                        <Star size={12} className="text-[#c9973f] fill-[#c9973f]" />
                        <span className="text-[12px] font-medium text-[#4a4540]">{product.rating}</span>
                        <span className="text-[11px] text-[#7a7570]">({product.reviewCount})</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-[#1a1614] text-[15px]">{product.price.toLocaleString('ar-SA')} ر.س</span>
                        {product.originalPrice && <span className="text-[11px] text-[#7a7570] line-through">{product.originalPrice.toLocaleString('ar-SA')}</span>}
                      </div>
                      <button className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-[#1a1614] text-white">
                        <ShoppingCart size={14} />
                        أضف للسلة
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {items.length === 0 && <p className="text-center text-[#7a7570] py-10">لا توجد منتجات لعرضها</p>}
          </div>
        );
      },
    },

    /* ── CategoryGrid (NEW) ──────────────────────────────── */
    CategoryGrid: {
      label: 'شبكة أقسام',
      fields: {
        columns: { type: 'select', label: 'عدد الأعمدة', options: [
          { label: '3 أعمدة', value: '3' },
          { label: '4 أعمدة', value: '4' },
          { label: '6 أعمدة', value: '6' },
          { label: '8 أعمدة', value: '8' },
        ] },
        count: { type: 'number', label: 'عدد الأقسام', min: 1, max: 12 },
      },
      defaultProps: { columns: 4, count: 8 },
      render: ({ columns, count }) => {
        const cats = topCategories.slice(0, count);
        const colsClass =
          columns >= 8 ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-8' :
          columns >= 6 ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6' :
          columns >= 4 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' :
          'grid-cols-2 sm:grid-cols-3';
        return (
          <div dir="rtl" className="mx-auto max-w-7xl px-6 py-6">
            <div className={`grid ${colsClass} gap-3`}>
              {cats.map((cat) => (
                <div key={cat.id} className="group flex flex-col items-center gap-2.5 p-3 bg-white rounded-xl border border-[#e8e4dc] hover:border-[#c9973f] hover:shadow-sm transition-all cursor-pointer">
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#f4f2ee]">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full bg-[#f4f2ee] flex items-center justify-center text-[#7a7570] text-2xl">🗂</div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-[#4a4540] group-hover:text-[#c9973f] transition-colors text-center leading-tight">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      },
    },

    /* ── PromoBanner (NEW) ───────────────────────────────── */
    PromoBanner: {
      label: 'بانر ترويجي',
      fields: {
        title: { type: 'text', label: 'العنوان' },
        subtitle: { type: 'text', label: 'الوصف' },
        coupon: { type: 'text', label: 'كود الخصم' },
        bgImage: { type: 'text', label: 'رابط صورة الخلفية' },
        bgColor: { type: 'text', label: 'لون الخلفية' },
        textColor: { type: 'text', label: 'لون النص' },
      },
      defaultProps: {
        title: 'خصم 25% على العطور',
        subtitle: 'عرض محدود لفترة قصيرة',
        coupon: 'SILMA25',
        bgImage: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&h=300&fit=crop&auto=format',
        bgColor: '#5c4218',
        textColor: '#ffffff',
      },
      render: ({ title, subtitle, coupon, bgImage, bgColor, textColor }) => (
        <div dir="rtl" className="mx-auto max-w-7xl px-6 py-4">
          <div className="relative overflow-hidden rounded-2xl cursor-pointer group" style={{ backgroundColor: bgColor }}>
            {bgImage && (
              <img src={bgImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-30 transition-opacity" />
            )}
            <div className="relative px-8 py-10 sm:py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ color: textColor }}>
              <div>
                <p className="text-sm mb-2 font-medium opacity-80">{subtitle}</p>
                <h3 className="text-2xl sm:text-3xl font-bold mb-1">{title}</h3>
                {coupon && <p className="text-sm opacity-60">استخدم كود: {coupon} عند الدفع</p>}
              </div>
              <button className="shrink-0 flex items-center gap-2 bg-white text-[#1a1614] px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#c9973f] hover:text-white transition-colors">
                تسوق الآن
              </button>
            </div>
          </div>
        </div>
      ),
    },

    /* ── ImageCard (NEW) ─────────────────────────────────── */
    ImageCard: {
      label: 'كارت صورة',
      fields: {
        image: { type: 'text', label: 'رابط الصورة' },
        title: { type: 'text', label: 'العنوان' },
        subtitle: { type: 'text', label: 'الوصف' },
        height: { type: 'number', label: 'الارتفاع (px)', min: 150, max: 500 },
        overlay: { type: 'radio', label: 'طبقة داكنة', options: [
          { label: 'نعم', value: true }, { label: 'لا', value: false },
        ] },
      },
      defaultProps: {
        image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=700&h=500&fit=crop&auto=format',
        title: 'أحدث الأزياء',
        subtitle: 'اكتشف',
        height: 256,
        overlay: true,
      },
      render: ({ image, title, subtitle, height, overlay }) => (
        <div dir="rtl" className="mx-auto max-w-7xl px-6 py-3">
          <div className="relative overflow-hidden rounded-2xl bg-[#f4f2ee] cursor-pointer group" style={{ height }}>
            <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            {overlay && <div className="absolute inset-0 bg-gradient-to-t from-[#1a1614]/70 via-transparent" />}
            <div className="absolute bottom-5 right-5">
              {subtitle && <p className="text-white/70 text-sm mb-1">{subtitle}</p>}
              <h3 className="text-white text-xl font-bold">{title}</h3>
            </div>
          </div>
        </div>
      ),
    },

    /* ── FeatureGrid (NEW) ───────────────────────────────── */
    FeatureGrid: {
      label: 'شبكة مميزات',
      fields: {
        columns: { type: 'select', label: 'عدد الأعمدة', options: [
          { label: '2 أعمدة', value: '2' },
          { label: '4 أعمدة', value: '4' },
        ] },
      },
      defaultProps: { columns: 4 },
      render: ({ columns }) => (
        <div dir="rtl" className="mx-auto max-w-7xl px-6 py-8">
          <div className={`grid ${columns >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
            {featureItems.map((item) => (
              <div key={item.title} className="flex flex-col items-center text-center gap-3 p-5 bg-white rounded-xl border border-[#e8e4dc]">
                <div className="w-12 h-12 rounded-full bg-[#fbf5e9] flex items-center justify-center text-[#c9973f]">
                  <FeatureIcon icon={item.icon} />
                </div>
                <h4 className="font-bold text-[#1a1614] text-sm">{item.title}</h4>
                <p className="text-[#7a7570] text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    /* ── Divider (NEW) ───────────────────────────────────── */
    Divider: {
      label: 'فاصل',
      fields: {
        thickness: { type: 'number', label: 'السُمك (px)', min: 1, max: 8 },
        color: { type: 'text', label: 'اللون' },
        margin: { type: 'number', label: 'الهامش (px)', min: 0, max: 80 },
      },
      defaultProps: { thickness: 1, color: '#e8e4dc', margin: 16 },
      render: ({ thickness, color, margin }) => (
        <div className="mx-auto max-w-7xl px-6" style={{ paddingTop: margin, paddingBottom: margin }}>
          <hr style={{ border: 'none', height: thickness, backgroundColor: color }} />
        </div>
      ),
    },

    /* ── ImageBanner (NEW) ───────────────────────────────── */
    ImageBanner: {
      label: 'بانر صورة كامل',
      fields: {
        image: { type: 'text', label: 'رابط الصورة' },
        title: { type: 'text', label: 'العنوان' },
        subtitle: { type: 'text', label: 'الوصف' },
        buttonLabel: { type: 'text', label: 'نص الزر' },
        height: { type: 'number', label: 'الارتفاع (px)', min: 200, max: 600 },
        overlayOpacity: { type: 'number', label: 'شفافية الطبقة (%)', min: 0, max: 90 },
      },
      defaultProps: {
        image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&h=700&fit=crop&auto=format',
        title: 'مجموعة خريف 2026',
        subtitle: 'تشكيلة مميزة من أحدث الموديلات',
        buttonLabel: 'اكتشف المجموعة',
        height: 400,
        overlayOpacity: 50,
      },
      render: ({ image, title, subtitle, buttonLabel, height, overlayOpacity }) => (
        <div dir="rtl" className="relative overflow-hidden" style={{ height }}>
          <img src={image} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(26,22,20,${overlayOpacity / 100})` }} />
          <div className="relative h-full flex flex-col items-center justify-center text-center text-white px-6">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">{title}</h2>
            {subtitle && <p className="text-lg opacity-80 mb-6 max-w-xl">{subtitle}</p>}
            {buttonLabel && (
              <button className="bg-[#c9973f] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#a67c2e] transition-colors">
                {buttonLabel}
              </button>
            )}
          </div>
        </div>
      ),
    },

    /* ── Testimonial (NEW) ───────────────────────────────── */
    Testimonial: {
      label: 'تقييم عميل',
      fields: {
        name: { type: 'text', label: 'اسم العميل' },
        rating: { type: 'number', label: 'التقييم (1-5)', min: 1, max: 5 },
        text: { type: 'textarea', label: 'نص التقييم' },
        avatar: { type: 'text', label: 'رابط صورة العميل' },
      },
      defaultProps: {
        name: 'محمد العريفي',
        rating: 5,
        text: 'تجربة تسوق ممتازة! المنتجات وصلت بسرعة وبجودة عالية. أنصح الجميع بالتعامل مع سوق.',
        avatar: '',
      },
      render: ({ name, rating, text, avatar }) => (
        <div dir="rtl" className="mx-auto max-w-7xl px-6 py-4">
          <div className="bg-white rounded-2xl border border-[#e8e4dc] p-6 sm:p-8 relative">
            <Quote size={32} className="text-[#c9973f] opacity-20 absolute top-4 left-4" />
            <div className="flex items-center gap-3 mb-4">
              {avatar ? (
                <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover border-2 border-[#c9973f]" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#fbf5e9] flex items-center justify-center text-[#c9973f] font-bold text-lg">
                  {name.charAt(0)}
                </div>
              )}
              <div>
                <h4 className="font-bold text-[#1a1614] text-sm">{name}</h4>
                <RatingStars rating={rating} />
              </div>
            </div>
            <p className="text-[#4a4540] leading-7 text-sm">{text}</p>
          </div>
        </div>
      ),
    },
  },
};

/* ── Starter data ────────────────────────────────────────────── */
const starterData: Data = {
  root: { props: { title: 'محرر سوق البصري' } },
  content: [
    { type: 'Hero', props: { id: 'hero-1', title: 'أناقتك، بأسلوبك', subtitle: 'جرّب تحديد هذا القسم ثم غيّر النص والألوان من لوحة الخصائص.', buttonLabel: 'تسوق الآن', background: '#1a1614', textColor: '#ffffff' } },
    { type: 'Spacer', props: { id: 'spacer-1', height: 32 } },
    { type: 'Heading', props: { id: 'heading-cats', text: 'تسوق حسب القسم', size: 'medium', color: '#1a1614', align: 'right' } },
    { type: 'CategoryGrid', props: { id: 'cat-grid-1', columns: 8, count: 8 } },
    { type: 'Spacer', props: { id: 'spacer-2', height: 16 } },
    { type: 'PromoBanner', props: { id: 'promo-1', title: 'خصم 25% على العطور', subtitle: 'عرض محدود لفترة قصيرة', coupon: 'SILMA25', bgImage: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&h=300&fit=crop&auto=format', bgColor: '#5c4218', textColor: '#ffffff' } },
    { type: 'Spacer', props: { id: 'spacer-3', height: 16 } },
    { type: 'Heading', props: { id: 'heading-prods', text: 'المنتجات المميزة', size: 'medium', color: '#1a1614', align: 'right' } },
    { type: 'ProductGrid', props: { id: 'prod-grid-1', filter: 'featured', columns: 4, count: 4 } },
    { type: 'Spacer', props: { id: 'spacer-4', height: 16 } },
    { type: 'FeatureGrid', props: { id: 'features-1', columns: 4 } },
    { type: 'Divider', props: { id: 'divider-1', thickness: 1, color: '#e8e4dc', margin: 24 } },
    { type: 'Testimonial', props: { id: 'testimonial-1', name: 'محمد العريفي', rating: 5, text: 'تجربة تسوق ممتازة! المنتجات وصلت بسرعة وبجودة عالية. أنصح الجميع بالتعامل مع سوق.', avatar: '' } },
  ],
  zones: {},
};

/* ── Editor page ─────────────────────────────────────────────── */
export default function VisualEditorPage() {
  const initialData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as Data; }
    catch { return starterData; }
  }, []);
  const [saved, setSaved] = useState(false);

  return (
    <div dir="ltr" className="h-screen">
      {saved && <div className="fixed left-1/2 top-3 z-[9999] -translate-x-1/2 rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white shadow-lg">تم حفظ التصميم محلياً</div>}
      <Puck
        config={config}
        data={initialData}
        onPublish={(data) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          setSaved(true);
          window.setTimeout(() => setSaved(false), 1800);
        }}
      />
    </div>
  );
}
