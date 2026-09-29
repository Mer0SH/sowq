import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/useApp';
import { formatPrice } from '../services/storefrontApi';

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, cartItems, removeFromCart, updateQuantity, cartTotal, navigate, showToast } = useApp();

  function handleCheckout() {
    setIsCartOpen(false);
    navigate('checkout');
  }

  function handleRemove(productId: string, name: string) {
    removeFromCart(productId);
    showToast(`أُزيل "${name}" من السلة`, 'info');
  }

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer — slides from left (RTL end = left in DOM) */}
      <div
        role="dialog"
        aria-label="سلة التسوق"
        style={{ animation: 'slideInLeft 0.3s cubic-bezier(0.16,1,0.3,1)' }}
        className="fixed top-0 left-0 bottom-0 z-[101] w-full max-w-md bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-lg text-ink">سلة التسوق</h2>
          <div className="flex items-center gap-3">
            {cartItems.length > 0 && (
              <span className="text-sm text-muted">{cartItems.reduce((a, i) => a + i.quantity, 0)} منتج</span>
            )}
            <button
              onClick={() => setIsCartOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface text-muted hover:text-ink transition-colors"
              aria-label="إغلاق السلة"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
              <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center">
                <ShoppingBag size={36} className="text-muted" />
              </div>
              <div>
                <p className="font-medium text-ink mb-1">السلة فارغة</p>
                <p className="text-sm text-muted">تصفح منتجاتنا وأضف ما يعجبك</p>
              </div>
              <button
                onClick={() => { setIsCartOpen(false); navigate('products'); }}
                className="px-6 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand transition-colors"
              >
                تصفح المنتجات
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {cartItems.map((item) => (
                <li key={`${item.product.id}-${item.selectedColor}-${item.selectedSize}`} className="flex gap-4 px-5 py-4">
                  {/* Image */}
                  <div
                    onClick={() => { setIsCartOpen(false); navigate('product-detail', { productId: item.product.id }); }}
                    className="w-20 h-20 rounded-lg overflow-hidden bg-surface shrink-0 cursor-pointer"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink line-clamp-2 leading-snug mb-1">
                      {item.product.name}
                    </p>
                    {(item.selectedColor || item.selectedSize) && (
                      <p className="text-[11px] text-muted mb-1.5">
                        {[item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-sm font-bold text-ink mb-3">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>

                    {/* Qty + delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink hover:bg-surface transition-colors"
                          aria-label="تقليل الكمية"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-ink">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted hover:text-ink hover:bg-surface transition-colors"
                          aria-label="زيادة الكمية"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemove(item.product.id, item.product.name)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger-bg transition-colors"
                        aria-label="حذف من السلة"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-border px-5 py-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-muted">المجموع الفرعي</span>
              <span className="font-medium text-ink">{formatPrice(cartTotal)}</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted">الشحن</span>
              <span className="text-sm text-success font-medium">يُحسب عند الطلب</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full py-3.5 bg-ink text-white rounded-xl font-bold text-[15px] hover:bg-brand transition-colors active:scale-[0.99]"
            >
              المتابعة للدفع
            </button>
            <button
              onClick={() => { setIsCartOpen(false); navigate('products'); }}
              className="w-full py-2.5 text-sm text-muted hover:text-ink transition-colors mt-2"
            >
              متابعة التسوق
            </button>
          </div>
        )}
      </div>
    </>
  );
}
