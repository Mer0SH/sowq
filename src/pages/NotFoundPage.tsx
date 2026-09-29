import { useApp } from '../context/useApp';
import { Search, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const { navigate } = useApp();

  return (
    <main className="page-transition flex flex-col items-center justify-center min-h-[70vh] px-4 text-center pb-8 sm:pb-0">
      <div className="mb-8">
        <p className="text-8xl font-bold text-border select-none" aria-hidden="true">404</p>
        <div className="w-16 h-0.5 bg-brand mx-auto mt-4" />
      </div>

      <h1 className="text-2xl font-bold text-ink mb-2">الصفحة غير موجودة</h1>
      <p className="text-muted mb-8 max-w-sm">
        عذراً، الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => navigate('home')}
          className="flex items-center gap-2 px-6 py-3 bg-ink text-white rounded-xl font-medium hover:bg-brand transition-colors"
        >
          <Home size={17} />
          العودة للرئيسية
        </button>
        <button
          onClick={() => navigate('products')}
          className="flex items-center gap-2 px-6 py-3 border border-border rounded-xl font-medium text-ink hover:bg-surface transition-colors"
        >
          <Search size={17} />
          تصفح المنتجات
        </button>
      </div>
    </main>
  );
}
