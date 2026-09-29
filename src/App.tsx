import { Component, useState } from 'react';
import InterestsOnboarding from './components/onboarding/InterestsOnboarding';
import type { ReactNode } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import { isOnboarded, saveInterests } from './services/interests';
import { CategoryProvider } from './context/CategoryContext';
import { CatalogProvider } from './context/CatalogContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import ToastContainer from './components/Toast';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CheckoutPage from './pages/RealCheckoutPage';
import AccountPage from './pages/CustomerAccountPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

/* ── Error boundary ─────────────────────────────────────────── */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-canvas" dir="rtl">
          <AlertTriangle size={40} className="text-warning mb-4" />
          <h1 className="text-xl font-bold text-ink mb-2">حدث خطأ في التطبيق</h1>
          <p className="text-sm text-muted mb-6 max-w-sm font-mono bg-surface rounded-lg p-3 text-right break-all" dir="ltr">
            {(this.state.error as Error).message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-6 py-2.5 bg-ink text-white rounded-xl text-sm font-medium"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Checkout header ─────────────────────────────────────────── */
function CheckoutHeader() {
  const { navigate } = useApp();
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button onClick={() => navigate('home')} className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-ink">سوق</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
        </button>
        <p className="text-sm font-medium text-muted flex items-center gap-1.5">
          إتمام الطلب
          <Lock size={12} />
        </p>
      </div>
    </header>
  );
}

/* ── Router ──────────────────────────────────────────────────── */
function OnboardingGate() {
  const { currentPage, setInterests } = useApp();
  const [show, setShow] = useState(() => {
    if (new URLSearchParams(window.location.search).has('onboarding')) return true;
    return !isOnboarded();
  });
  if (!show || currentPage === 'admin' || currentPage === 'checkout') return null;
  return <InterestsOnboarding onDone={(picked) => {
    // The onboarding result used to be dropped on the floor — the store now
    // receives it, persists it and re-ranks its sections around it.
    if (picked.length) setInterests(picked);
    saveInterests(picked);
    setShow(false);
  }} />;
}

function Router() {
  const { currentPage } = useApp();
  const isCheckout = currentPage === 'checkout';
  const isAdmin = currentPage === 'admin';
  const hideChrome = isCheckout || isAdmin;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#fafaf8' }}>
      {isCheckout ? <CheckoutHeader /> : !isAdmin ? <Header /> : null}

      <div className="flex-1">
        {currentPage === 'home'           && <HomePage />}
        {currentPage === 'products'       && <ProductsPage />}
        {currentPage === 'product-detail' && <ProductDetailPage />}
        {currentPage === 'checkout'       && <CheckoutPage />}
        {currentPage === 'account'        && <AccountPage />}
        {currentPage === 'admin'          && <AdminPage />}
        {currentPage === '404'            && <NotFoundPage />}
      </div>

      {!hideChrome && <Footer />}
      {!hideChrome && <BottomNav />}
      <CartDrawer />
      <ToastContainer />
      <OnboardingGate />
    </div>
  );
}

/* ── App root ────────────────────────────────────────────────── */
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <CatalogProvider><CategoryProvider><Router /></CategoryProvider></CatalogProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
