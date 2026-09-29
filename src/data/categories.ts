/* ────────────────────────────────────────────────────────────
   Category seed data — executed once at app bootstrap.
   All future mutations go through CategoryService / admin panel.
   Components must NEVER import this file directly; use CategoryContext.
──────────────────────────────────────────────────────────── */

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: 1 | 2 | 3;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
};

/* Helper to build a category row */
function cat(
  id: string,
  name: string,
  slug: string,
  parentId: string | null,
  level: 1 | 2 | 3,
  sortOrder: number,
  imageUrl?: string,
): Category {
  return { id, name, slug, parentId, level, sortOrder, isActive: true, imageUrl };
}

export const seedCategories: Category[] = [
  /* ── Level 1 ─────────────────────────────────────────── */
  cat('electronics',       'الإلكترونيات',         'electronics',        null, 1, 1,  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'),
  cat('fashion',           'الأزياء',              'fashion',            null, 1, 2,  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop'),
  cat('fragrance-beauty',  'العطور والعناية',       'fragrance-beauty',   null, 1, 3,  'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&h=400&fit=crop'),
  cat('home-kitchen',      'المنزل والمطبخ',        'home-kitchen',       null, 1, 4,  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop'),
  cat('accessories',       'الإكسسوارات',           'accessories',        null, 1, 5,  'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop'),
  cat('sports',            'الرياضة والأنشطة',      'sports',             null, 1, 6,  'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=400&fit=crop'),
  cat('mom-baby',          'الأم والطفل',           'mom-baby',           null, 1, 7,  'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop'),
  cat('tools',             'أدوات',                'tools',              null, 1, 8,  'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400&h=400&fit=crop'),

  /* ── Level 2 · Electronics ───────────────────────────── */
  cat('mobile-tablet',       'جوالات وتابلت',         'mobile-tablet',        'electronics', 2, 1),
  cat('laptops-computers',   'لابتوبات وكمبيوتر',     'laptops-computers',    'electronics', 2, 2),
  cat('audio-visual',        'الصوت والصورة',          'audio-visual',         'electronics', 2, 3),
  cat('cameras',             'الكاميرات والتصوير',     'cameras',              'electronics', 2, 4),
  cat('gaming',              'الألعاب',               'gaming',               'electronics', 2, 5),
  cat('smart-wearables',     'الساعات الذكية والأجهزة القابلة للارتداء', 'smart-wearables', 'electronics', 2, 6),

  /* ── Level 3 · mobile-tablet ─────────────────────────── */
  cat('smartphones',         'هواتف ذكية',            'smartphones',          'mobile-tablet', 3, 1),
  cat('tablets',             'أجهزة لوحية',            'tablets',              'mobile-tablet', 3, 2),
  cat('mobile-accessories',  'ملحقات الجوال',          'mobile-accessories',   'mobile-tablet', 3, 3),

  /* ── Level 3 · laptops-computers ─────────────────────── */
  cat('laptops',             'لابتوبات',              'laptops',              'laptops-computers', 3, 1),
  cat('desktop-computers',   'كمبيوتر مكتب',          'desktop-computers',    'laptops-computers', 3, 2),
  cat('monitors',            'شاشات',                 'monitors',             'laptops-computers', 3, 3),
  cat('printers',            'طابعات',                'printers',             'laptops-computers', 3, 4),
  cat('computer-accessories','ملحقات الكمبيوتر',       'computer-accessories', 'laptops-computers', 3, 5),

  /* ── Level 3 · audio-visual ──────────────────────────── */
  cat('headphones',          'سماعات رأس',            'headphones',           'audio-visual', 3, 1),
  cat('wireless-speakers',   'سماعات لاسلكية',        'wireless-speakers',    'audio-visual', 3, 2),
  cat('speaker-systems',     'مكبرات صوت',            'speaker-systems',      'audio-visual', 3, 3),
  cat('televisions',         'تلفزيونات',             'televisions',          'audio-visual', 3, 4),
  cat('projectors',          'مشروعات',               'projectors',           'audio-visual', 3, 5),

  /* ── Level 3 · cameras ───────────────────────────────── */
  cat('digital-cameras',     'كاميرات رقمية',         'digital-cameras',      'cameras', 3, 1),
  cat('pro-cameras',         'كاميرات احترافية',       'pro-cameras',          'cameras', 3, 2),
  cat('drones',              'درون',                  'drones',               'cameras', 3, 3),
  cat('camera-accessories',  'ملحقات التصوير',         'camera-accessories',   'cameras', 3, 4),

  /* ── Level 3 · gaming ────────────────────────────────── */
  cat('playstation-xbox',    'بلايستيشن / إكس بوكس',  'playstation-xbox',     'gaming', 3, 1),
  cat('pc-gaming',           'أجهزة PC Gaming',        'pc-gaming',            'gaming', 3, 2),
  cat('controllers',         'عصي التحكم',             'controllers',          'gaming', 3, 3),
  cat('gaming-chairs',       'كراسي وأدوات gaming',    'gaming-chairs',        'gaming', 3, 4),

  /* ── Level 3 · smart-wearables ───────────────────────── */
  cat('smart-watches',       'ساعات ذكية',            'smart-watches',        'smart-wearables', 3, 1),
  cat('fitness-bands',       'أساور اللياقة',          'fitness-bands',        'smart-wearables', 3, 2),
  cat('watch-accessories',   'ملحقات الساعات',         'watch-accessories',    'smart-wearables', 3, 3),

  /* ── Level 2 · Fashion ───────────────────────────────── */
  cat('mens-fashion',        'أزياء رجالية',           'mens-fashion',         'fashion', 2, 1),
  cat('womens-fashion',      'أزياء نسائية',           'womens-fashion',       'fashion', 2, 2),
  cat('kids-fashion',        'أزياء أطفال',            'kids-fashion',         'fashion', 2, 3),

  /* ── Level 3 · mens-fashion ──────────────────────────── */
  cat('mens-outerwear',      'ملابس خارجية',           'mens-outerwear',       'mens-fashion', 3, 1),
  cat('mens-shirts',         'قمصان',                 'mens-shirts',          'mens-fashion', 3, 2),
  cat('mens-pants',          'بناطيل',                'mens-pants',           'mens-fashion', 3, 3),
  cat('mens-shoes',          'أحذية',                 'mens-shoes',           'mens-fashion', 3, 4),
  cat('mens-watches-glasses','ساعات ونظارات',          'mens-watches-glasses', 'mens-fashion', 3, 5),

  /* ── Level 3 · womens-fashion ────────────────────────── */
  cat('womens-dresses',      'فساتين',                'womens-dresses',       'womens-fashion', 3, 1),
  cat('abayas',              'عبايات',                'abayas',               'womens-fashion', 3, 2),
  cat('womens-outerwear',    'ملابس خارجية',           'womens-outerwear',     'womens-fashion', 3, 3),
  cat('womens-bags',         'حقائب',                 'womens-bags',          'womens-fashion', 3, 4),
  cat('womens-shoes',        'أحذية',                 'womens-shoes',         'womens-fashion', 3, 5),

  /* ── Level 3 · kids-fashion ──────────────────────────── */
  cat('boys-clothing',       'ملابس أولاد',            'boys-clothing',        'kids-fashion', 3, 1),
  cat('girls-clothing',      'ملابس بنات',             'girls-clothing',       'kids-fashion', 3, 2),
  cat('kids-shoes',          'أحذية أطفال',            'kids-shoes',           'kids-fashion', 3, 3),

  /* ── Level 2 · Fragrance & Beauty ───────────────────── */
  cat('mens-fragrance',      'عطور رجالية',            'mens-fragrance',       'fragrance-beauty', 2, 1),
  cat('womens-fragrance',    'عطور نسائية',            'womens-fragrance',     'fragrance-beauty', 2, 2),
  cat('oriental-fragrance',  'عطور شرقية',             'oriental-fragrance',   'fragrance-beauty', 2, 3),
  cat('fragrance-gifts',     'مجموعات هدايا العطور',   'fragrance-gifts',      'fragrance-beauty', 2, 4),
  cat('skincare',            'العناية بالبشرة',         'skincare',             'fragrance-beauty', 2, 5),
  cat('hair-care',           'العناية بالشعر',          'hair-care',            'fragrance-beauty', 2, 6),
  cat('makeup',              'مكياج',                 'makeup',               'fragrance-beauty', 2, 7),

  /* ── Level 3 · skincare ──────────────────────────────── */
  cat('moisturizers',        'مرطبات',                'moisturizers',         'skincare', 3, 1),
  cat('sunscreen',           'واقي شمس',              'sunscreen',            'skincare', 3, 2),
  cat('cleansers',           'غسولات',                'cleansers',            'skincare', 3, 3),

  /* ── Level 3 · hair-care ─────────────────────────────── */
  cat('shampoo',             'شامبو',                 'shampoo',              'hair-care', 3, 1),
  cat('hair-oils',           'زيوت وعلاجات',           'hair-oils',            'hair-care', 3, 2),

  /* ── Level 3 · makeup ────────────────────────────────── */
  cat('foundations',         'أساسات',                'foundations',          'makeup', 3, 1),
  cat('lipstick',            'أحمر شفاه',              'lipstick',             'makeup', 3, 2),
  cat('eye-makeup',          'عيون',                  'eye-makeup',           'makeup', 3, 3),
  cat('makeup-tools',        'أدوات مكياج',            'makeup-tools',         'makeup', 3, 4),

  /* ── Level 2 · Home & Kitchen ───────────────────────── */
  cat('furniture',           'أثاث',                  'furniture',            'home-kitchen', 2, 1),
  cat('kitchen-tools',       'أدوات المطبخ',           'kitchen-tools',        'home-kitchen', 2, 2),
  cat('large-appliances',    'أجهزة منزلية كبيرة',    'large-appliances',     'home-kitchen', 2, 3),
  cat('decor-lighting',      'ديكور وإضاءة',           'decor-lighting',       'home-kitchen', 2, 4),
  cat('bedding',             'مفروشات',               'bedding',              'home-kitchen', 2, 5),

  /* ── Level 3 · furniture ─────────────────────────────── */
  cat('living-furniture',    'أثاث غرف الجلوس',       'living-furniture',     'furniture', 3, 1),
  cat('bedroom-furniture',   'أثاث غرف النوم',         'bedroom-furniture',    'furniture', 3, 2),
  cat('tables-chairs',       'طاولات وكراسي',          'tables-chairs',        'furniture', 3, 3),

  /* ── Level 3 · kitchen-tools ─────────────────────────── */
  cat('cookware',            'أواني الطهي',            'cookware',             'kitchen-tools', 3, 1),
  cat('serving-tools',       'أدوات تقديم',            'serving-tools',        'kitchen-tools', 3, 2),
  cat('small-appliances',    'أجهزة المطبخ الصغيرة',  'small-appliances',     'kitchen-tools', 3, 3),

  /* ── Level 3 · large-appliances ─────────────────────── */
  cat('refrigerators',       'ثلاجات',                'refrigerators',        'large-appliances', 3, 1),
  cat('washing-machines',    'غسالات',                'washing-machines',     'large-appliances', 3, 2),
  cat('air-conditioners',    'مكيفات',                'air-conditioners',     'large-appliances', 3, 3),
  cat('vacuums',             'مكانس',                 'vacuums',              'large-appliances', 3, 4),

  /* ── Level 3 · decor-lighting ───────────────────────── */
  cat('indoor-lighting',     'إضاءة داخلية',           'indoor-lighting',      'decor-lighting', 3, 1),
  cat('art-decor',           'لوحات وديكور',           'art-decor',            'decor-lighting', 3, 2),
  cat('rugs',                'سجاد',                  'rugs',                 'decor-lighting', 3, 3),

  /* ── Level 3 · bedding ───────────────────────────────── */
  cat('blankets-pillows',    'بطانيات ومخدات',         'blankets-pillows',     'bedding', 3, 1),
  cat('bed-sets',            'أطقم سرير',              'bed-sets',             'bedding', 3, 2),
  cat('towels',              'مناشف',                 'towels',               'bedding', 3, 3),

  /* ── Level 2 · Accessories ───────────────────────────── */
  cat('bags-wallets',        'حقائب ومحافظ',           'bags-wallets',         'accessories', 2, 1),
  cat('belts',               'أحزمة',                 'belts',                'accessories', 2, 2),
  cat('sunglasses',          'نظارات شمسية',           'sunglasses',           'accessories', 2, 3),
  cat('watches',             'ساعات',                 'watches',              'accessories', 2, 4),
  cat('jewelry',             'مجوهرات',               'jewelry',              'accessories', 2, 5),

  /* ── Level 3 · jewelry ───────────────────────────────── */
  cat('gold-jewelry',        'ذهب',                   'gold-jewelry',         'jewelry', 3, 1),
  cat('silver-jewelry',      'فضة',                   'silver-jewelry',       'jewelry', 3, 2),
  cat('traditional-acc',     'إكسسوارات تقليدية',      'traditional-acc',      'jewelry', 3, 3),

  /* ── Level 2 · Sports ────────────────────────────────── */
  cat('sportswear',          'ملابس رياضية',           'sportswear',           'sports', 2, 1),
  cat('sports-shoes',        'أحذية رياضية',           'sports-shoes',         'sports', 2, 2),
  cat('fitness-equipment',   'أدوات اللياقة',          'fitness-equipment',    'sports', 2, 3),
  cat('bicycles',            'دراجات',                'bicycles',             'sports', 2, 4),
  cat('outdoor-sports',      'تجهيزات رياضات خارجية', 'outdoor-sports',       'sports', 2, 5),

  /* ── Level 2 · Mom & Baby ────────────────────────────── */
  cat('strollers',           'عربات أطفال',            'strollers',            'mom-baby', 2, 1),
  cat('baby-essentials',     'مستلزمات الرضيع',        'baby-essentials',      'mom-baby', 2, 2),
  cat('kids-toys',           'ألعاب أطفال',            'kids-toys',            'mom-baby', 2, 3),
  cat('newborn-clothing',    'ملابس مواليد',           'newborn-clothing',     'mom-baby', 2, 4),
  cat('baby-food-care',      'غذاء وعناية بالطفل',     'baby-food-care',       'mom-baby', 2, 5),

  /* ── Level 2 · Tools ─────────────────────────────────── */
  cat('hand-tools',          'أدوات يدوية',            'hand-tools',           'tools', 2, 1),
  cat('power-tools',         'أدوات كهربائية',         'power-tools',          'tools', 2, 2),
  cat('safety-equipment',    'معدات السلامة',          'safety-equipment',     'tools', 2, 3),
];
