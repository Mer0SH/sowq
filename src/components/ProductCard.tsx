import { Heart, ShoppingCart, Star } from 'lucide-react';
import type { Product } from '../data/products';
import { useApp } from '../context/useApp';
import SafeImage from './SafeImage';
import TiltCard from './TiltCard';
import { startProductTransition } from '../services/motion';
import { formatPrice } from '../services/storefrontApi';

type Props = {
  product: Product;
  size?: 'sm' | 'md';
};

export default function ProductCard({ product, size = 'md' }: Props) {
  const { addToCart, toggleFavorite, favorites, showToast, navigate } = useApp();
  const isFav = favorites.includes(product.id);
  const isOut = product.stock === 0;
  const isLow = product.stock > 0 && product.stock <= 5;
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation();
    if (isOut) return;
    if (addToCart({ product, quantity: 1 })) showToast(`تمت إضافة "${product.name}" إلى السلة`);
  }

  function handleToggleFav(e: React.MouseEvent) {
    e.stopPropagation();
    toggleFavorite(product.id);
    showToast(isFav ? 'أُزيل من المفضلة' : 'أُضيف إلى المفضلة');
  }

  return (
    <article
      onClick={e => { startProductTransition(e.currentTarget.querySelector('img')); navigate('product-detail', { productId: product.id }); }}
      className={`group relative flex flex-col bg-card rounded-2xl border border-border overflow-hidden cursor-pointer
        transition-all duration-300 hover:shadow-xl hover:shadow-ink/5 hover:-translate-y-1.5 active:scale-[0.98]
        ${isOut ? 'opacity-70' : ''}
      `}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-surface">
        <TiltCard max={7} depth={9} radius="0px" disabled={isOut}>
          <SafeImage
            src={product.image}
            alt={product.name}
            className="product-crisp h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            fallbackClassName="w-full h-full"
          />
          <span aria-hidden="true" className="case-shine absolute inset-0" />
        </TiltCard>

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {isOut && (
          <span className="text-[11px] font-bold bg-ink text-white px-2.5 py-1 rounded-lg">
              نفذ المخزون
            </span>
          )}
          {!isOut && product.badge === 'new' && (
            <span className="text-[11px] font-bold bg-brand text-white px-2.5 py-1 rounded-lg">
              جديد
            </span>
          )}
          {!isOut && discount > 0 && (
            <span className="text-[11px] font-bold bg-danger text-white px-2.5 py-1 rounded-lg">
              -{discount}%
            </span>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={handleToggleFav}
          aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          className={`absolute top-2 left-2 w-8 h-8 flex items-center justify-center rounded-full
            bg-white/90 backdrop-blur-sm border border-border transition-all duration-200
            hover:scale-110 active:scale-95
            ${isFav ? 'text-danger' : 'text-muted'}
          `}
        >
          <Heart size={15} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Info */}
      <div className={`flex flex-1 flex-col p-3 ${size === 'sm' ? 'p-2.5' : 'p-3'}`}>
        <p className="text-[11px] text-muted mb-1">{product.brand}</p>
        <h3 className="text-sm font-medium text-ink line-clamp-2 leading-snug mb-2">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2.5">
          <Star size={12} className="text-brand fill-brand" />
          <span className="text-[12px] font-medium text-ink-soft">{product.rating}</span>
          <span className="text-[11px] text-muted">({product.reviewCount})</span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-ink text-[15px]">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-[11px] text-muted line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Low stock warning */}
        <div className="min-h-[18px] mt-1.5">
          {isLow && (
            <p className="text-[11px] text-warning leading-[18px]">
              متبقي {product.stock} قطع فقط
            </p>
          )}
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          disabled={isOut}
          className={`mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold
            transition-all duration-200 active:scale-[0.98]
            ${isOut
              ? 'bg-surface text-muted cursor-not-allowed'
              : 'bg-ink text-white hover:bg-brand active:bg-brand-600'
            }
          `}
        >
          <ShoppingCart size={14} />
          {isOut ? 'غير متوفر' : 'أضف للسلة'}
        </button>
      </div>
    </article>
  );
}
