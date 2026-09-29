import chairOdin from '../assets/chair-leather-cutout-pexels-11112734.png';
import chairSienna from '../assets/chair-sienna.png';

export type Category = {
  id: string;
  name: string;
  icon: string;
  image: string;
  count: number;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  images: string[];
  description: string;
  badge?: 'new' | 'sale' | 'out';
  stock: number;
  colors?: { name: string; hex: string }[];
  sizes?: string[];
  specs?: Record<string, string>;
  isNew?: boolean;
  isFeatured?: boolean;
};

export const categories: Category[] = [
  {
    id: 'perfumes',
    name: 'عطور',
    icon: '✦',
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&h=400&fit=crop&auto=format',
    count: 48,
  },
  {
    id: 'fashion',
    name: 'أزياء',
    icon: '✦',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop&auto=format',
    count: 124,
  },
  {
    id: 'accessories',
    name: 'إكسسوارات',
    icon: '✦',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop&auto=format',
    count: 67,
  },
  {
    id: 'electronics',
    name: 'إلكترونيات',
    icon: '✦',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&auto=format',
    count: 89,
  },
  {
    id: 'home',
    name: 'منزل',
    icon: '✦',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop&auto=format',
    count: 52,
  },
  {
    id: 'care',
    name: 'عناية',
    icon: '✦',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop&auto=format',
    count: 38,
  },
];

export const products: Product[] = [
  {
    id: '13',
    name: 'كرسي أدون الجلدي',
    brand: 'مابودالا',
    category: 'home',
    price: 895,
    originalPrice: 1050,
    rating: 4.8,
    reviewCount: 64,
    image: chairOdin,
    images: [],
    description: 'كرسي بذراعين من الجلد البني بتفاصيل مسامير معدنية وأرجل خشبية. تصميم كلاسيكي أنيق يضيف دفئاً وفخامة للمكان.',
    badge: 'sale',
    stock: 7,
    colors: [
      { name: 'بني جلدي', hex: '#623B2C' },
    ],
    specs: {
      'الارتفاع': '104 سم',
      'العرض': '82 سم',
      'الخامة': 'جلد بني وخشب',
    },
    isFeatured: true,
    isNew: true,
  },
  {
    id: '14',
    name: 'كرسي سيينا المودرن',
    brand: 'مابودالا',
    category: 'home',
    price: 550,
    originalPrice: 610,
    rating: 4.7,
    reviewCount: 41,
    image: chairSienna,
    images: [
      'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&h=800&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=800&fit=crop&auto=format',
    ],
    description: 'كرسي سيينا بتصميم مودرن — مقعد ملساء بأرجل خشبية طبيعية. مثالي للغرف الهادئة ومساحات العمل.',
    badge: 'new',
    stock: 12,
    colors: [
      { name: 'أخضر زيتي', hex: '#3F6142' },
      { name: 'أخضر فاتح', hex: '#7DA97B' },
    ],
    specs: {
      'الارتفاع': '104 سم',
      'العرض': '82 سم',
      'الوزن': '3.5 كجم',
      'الخامة': 'خشب زان ومعدن',
    },
    isFeatured: true,
    isNew: true,
  },
  {
    id: '1',
    name: 'عطر روز عود الملكي',
    brand: 'دار الطيب',
    category: 'perfumes',
    price: 450,
    originalPrice: 580,
    rating: 4.8,
    reviewCount: 92,
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&h=800&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&h=800&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1506803682981-6e718a9dd3ee?w=800&h=800&fit=crop&auto=format',
    ],
    description: 'عطر فاخر يجمع بين عبق الورد الدمشقي وخشب العود الأصيل. رائحة تدوم طوال اليوم تمنحك ثقةً ورقياً لا يُنسى. مناسب لجميع المناسبات.',
    badge: 'sale',
    stock: 8,
    specs: {
      'الحجم': '100 مل',
      'التركيز': 'Eau de Parfum',
      'العائلة العطرية': 'شرقي - خشبي',
      'مدة الثبات': '8-12 ساعة',
    },
    isFeatured: true,
  },
  {
    id: '2',
    name: 'عباية شيفون الريحانة',
    brand: 'بيت الأزياء',
    category: 'fashion',
    price: 320,
    rating: 4.7,
    reviewCount: 89,
    image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=800&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&h=800&fit=crop&auto=format',
    ],
    description: 'عباية من قماش الشيفون الفاخر، مزينة بتطريز دقيق على الأكمام. تصميم أنيق يناسب المناسبات الرسمية والسهرات.',
    badge: 'new',
    stock: 15,
    colors: [
      { name: 'أسود', hex: '#1A1614' },
      { name: 'رمادي فاتح', hex: '#9CA3AF' },
      { name: 'عنابي', hex: '#7C2D12' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    isFeatured: true,
    isNew: true,
  },
  {
    id: '3',
    name: 'ساعة كلاسيك ذهبية',
    brand: 'تاج الوقت',
    category: 'accessories',
    price: 890,
    originalPrice: 1100,
    rating: 4.9,
    reviewCount: 56,
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&h=800&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=800&h=800&fit=crop&auto=format',
    ],
    description: 'ساعة يد كلاسيكية بإطار من الستانلس ستيل المطلي بالذهب. وجه ساعة أبيض نظيف بأرقام رومانية. آلية يابانية عالية الدقة.',
    badge: 'sale',
    stock: 4,
    colors: [
      { name: 'ذهبي', hex: '#C9973F' },
      { name: 'فضي', hex: '#9CA3AF' },
    ],
    isFeatured: true,
  },
  {
    id: '4',
    name: 'سماعات لاسلكية بريميوم',
    brand: 'سونك برو',
    category: 'electronics',
    price: 550,
    originalPrice: 750,
    rating: 4.6,
    reviewCount: 203,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=800&fit=crop&auto=format',
    ],
    description: 'سماعات لاسلكية بتقنية إلغاء الضوضاء النشط. بطارية تدوم 30 ساعة، اتصال Bluetooth 5.2، صوت استثنائي بجودة Hi-Fi.',
    badge: 'sale',
    stock: 22,
    colors: [
      { name: 'أسود', hex: '#1A1614' },
      { name: 'أبيض', hex: '#FAFAF8' },
      { name: 'ذهبي كمد', hex: '#C9973F' },
    ],
    specs: {
      'النوع': 'Over-Ear',
      'الاتصال': 'Bluetooth 5.2 / سلكي',
      'البطارية': '30 ساعة',
      'الشحن': 'USB-C',
    },
    isFeatured: true,
  },
  {
    id: '5',
    name: 'مجموعة عناية بالبشرة الذهبية',
    brand: 'لومير',
    category: 'care',
    price: 420,
    rating: 4.5,
    reviewCount: 147,
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&h=800&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=800&fit=crop&auto=format',
    ],
    description: 'مجموعة عناية متكاملة تشمل: سيروم الكولاجين، كريم المرطب الليلي، وغسول الوجه المنظف. مستخلصات طبيعية ومكونات فعّالة.',
    badge: 'new',
    stock: 30,
    isNew: true,
  },
  {
    id: '6',
    name: 'أريكة أسطورية ثلاثية',
    brand: 'بيت النخبة',
    category: 'home',
    price: 3200,
    originalPrice: 4100,
    rating: 4.4,
    reviewCount: 28,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=800&fit=crop&auto=format',
    ],
    description: 'أريكة ثلاثية فاخرة بتصميم عصري، مغطاة بقماش المخمل عالي الجودة. إطار خشبي متين، وسادات عميقة مريحة.',
    badge: 'sale',
    stock: 3,
    colors: [
      { name: 'رمادي داكن', hex: '#4B5563' },
      { name: 'بيج كريمي', hex: '#F5F0E8' },
      { name: 'أخضر زيتوني', hex: '#4A5240' },
    ],
    isFeatured: true,
  },
  {
    id: '7',
    name: 'نظارة شمسية أوفرسايز',
    brand: 'لوكس آي',
    category: 'accessories',
    price: 380,
    rating: 4.3,
    reviewCount: 72,
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=800&fit=crop&auto=format',
    ],
    description: 'نظارة شمسية بإطار أوفرسايز أنيق. عدسات بحماية UV400 كاملة، إطار خفيف الوزن من الأسيتات الإيطالي.',
    stock: 18,
    colors: [
      { name: 'أسود', hex: '#1A1614' },
      { name: 'عسلي', hex: '#92400E' },
      { name: 'شفاف', hex: '#F5F0E8' },
    ],
    isNew: true,
  },
  {
    id: '8',
    name: 'حقيبة جلد يد',
    brand: 'فلورنتينا',
    category: 'accessories',
    price: 680,
    originalPrice: 820,
    rating: 4.7,
    reviewCount: 95,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=800&fit=crop&auto=format',
    ],
    description: 'حقيبة يد من جلد العجل الإيطالي الطبيعي. مقصورات داخلية متعددة، مقبض ذهبي، تأتي في علبة هدايا فاخرة.',
    badge: 'sale',
    stock: 6,
    colors: [
      { name: 'كاراميل', hex: '#92400E' },
      { name: 'أسود', hex: '#1A1614' },
      { name: 'بيج', hex: '#D4B896' },
    ],
  },
  {
    id: '9',
    name: 'كنزة كشمير ناعمة',
    brand: 'بيت الأزياء',
    category: 'fashion',
    price: 750,
    rating: 4.6,
    reviewCount: 41,
    image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=600&fit=crop&auto=format',
    ],
    description: 'كنزة مصنوعة من الكشمير الأصيل بنسبة 100%. ناعمة، خفيفة، دافئة. تصميم بسيط وأنيق يناسب جميع المناسبات.',
    stock: 12,
    colors: [
      { name: 'كريمي', hex: '#F5F0E8' },
      { name: 'رمادي', hex: '#9CA3AF' },
      { name: 'كحلي', hex: '#1E3A5F' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    isNew: true,
  },
  {
    id: '10',
    name: 'عطر ورد الطائف الفاخر',
    brand: 'دار الطيب',
    category: 'perfumes',
    price: 280,
    rating: 4.8,
    reviewCount: 63,
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&h=800&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1506803682981-6e718a9dd3ee?w=800&h=800&fit=crop&auto=format',
    ],
    description: 'عطر فاخر بعبق الورد الطائفي الأصيل مع لمسات من الياسمين. زجاجة كريستالية أنيقة بغطاء شفاف، تركيز Eau de Parfum يدوم طويلاً.',
    stock: 25,
    isNew: true,
  },
  {
    id: '11',
    name: 'حذاء جلد كلاسيكي',
    brand: 'فلورنتينا',
    category: 'fashion',
    price: 490,
    rating: 4.5,
    reviewCount: 38,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&auto=format',
    ],
    description: 'حذاء جلدي كلاسيكي متعدد الاستخدامات. نعل داخلي مبطن للراحة الفائقة، جلد خارجي طبيعي ذو متانة عالية.',
    stock: 0,
    badge: 'out',
    sizes: ['40', '41', '42', '43', '44'],
    colors: [
      { name: 'بني', hex: '#78350F' },
      { name: 'أسود', hex: '#1A1614' },
    ],
  },
  {
    id: '12',
    name: 'طقم قهوة ذهبي',
    brand: 'بيت النخبة',
    category: 'home',
    price: 350,
    originalPrice: 420,
    rating: 4.9,
    reviewCount: 87,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop&auto=format',
    ],
    description: 'طقم قهوة فاخر من 6 أكواب وإبريق من الخزف الراقي. مزخرف بالذهب عيار 22 قيراطاً. هدية مثالية.',
    badge: 'sale',
    stock: 9,
    isFeatured: true,
  },
];

export const getProductsByCategory = (cat: string) =>
  products.filter((p) => p.category === cat);

export const getFeaturedProducts = () =>
  products.filter((p) => p.isFeatured);

export const getNewProducts = () =>
  products.filter((p) => p.isNew || p.badge === 'new');

export const getSaleProducts = () =>
  products.filter((p) => p.badge === 'sale' || p.originalPrice);

export const getRelatedProducts = (id: string, category: string) =>
  products.filter((p) => p.id !== id && p.category === category).slice(0, 4);
