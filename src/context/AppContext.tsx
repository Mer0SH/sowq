import React, { useReducer, useState, useCallback, useEffect } from 'react';
import type { Product } from '../data/products';
import { AppContext } from './AppContextValue';
import { setSystemBarsDark } from '../services/systemBars';
import { readInterests, saveInterests, expandInterests } from '../services/interests';
import { customerAuth, customerRequest, onAuthStateChanged } from '../services/customerAuth';
import type { CustomerProfile, User } from '../services/customerAuth';

/* ── Types ─────────────────────────────────────────────── */

export type Page =
  | 'home'
  | 'products'
  | 'product-detail'
  | 'checkout'
  | 'account'
  | 'login'
  | 'admin'
  | '404';

export type CartItem = {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
};

export type ToastType = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

export type NavParams = {
  productId?: string;
  categoryId?: string;
};

/* ── Cart Reducer ───────────────────────────────────────── */

type CartAction =
  | { type: 'ADD'; payload: CartItem }
  | { type: 'REMOVE'; payload: string }
  | { type: 'UPDATE_QTY'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR' };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find(
        (i) =>
          i.product.id === action.payload.product.id &&
          i.selectedColor === action.payload.selectedColor &&
          i.selectedSize === action.payload.selectedSize,
      );
      if (existing) {
        return state.map((i) =>
          i.product.id === action.payload.product.id && i.selectedColor === action.payload.selectedColor && i.selectedSize === action.payload.selectedSize
            ? { ...i, quantity: i.quantity + action.payload.quantity }
            : i,
        );
      }
      return [...state, action.payload];
    }
    case 'REMOVE':
      return state.filter((i) => i.product.id !== action.payload);
    case 'UPDATE_QTY':
      return state.map((i) =>
        i.product.id === action.payload.productId
          ? { ...i, quantity: action.payload.quantity }
          : i,
      );
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

/* ── Context ────────────────────────────────────────────── */

export type AppContextType = {
  currentPage: Page;
  navParams: NavParams;
  navigate: (page: Page, params?: NavParams) => void;

  cartItems: CartItem[];
  addToCart: (item: CartItem) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (v: boolean) => void;

  favorites: string[];
  toggleFavorite: (productId: string) => void;

  toasts: Toast[];
  showToast: (msg: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  interests: string[];
  setInterests: (ids: string[]) => void;
  /* Ids expanded down the category tree — what the storefront matches against. */
  interestMatches: string[];

  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  customer: User | null;
  customerProfile: CustomerProfile | null;
  authReady: boolean;
  refreshCustomerProfile: () => Promise<void>;
  continueAfterLogin: () => void;
};

// This component has its own Fast Refresh boundary; the context object lives in AppContextValue.
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>((window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')) ? 'admin' : 'home');
  const [navParams, setNavParams] = useState<NavParams>({});
  const [cartItems, dispatch] = useReducer(cartReducer, [], () => {
    try { return JSON.parse(localStorage.getItem('souq-cart') || '[]') as CartItem[]; } catch { return []; }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('souq-favorites') || '[]') as string[]; } catch { return []; }
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customer, setCustomer] = useState<User | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<CartItem | null>(null);
  const [returnPage, setReturnPage] = useState<Page>('home');
  const [returnParams, setReturnParams] = useState<NavParams>({});
  /* Kept in sync with `souq-interests` so onboarding, the picker and the
     personalised home sections share one source of truth. */
  const [interests, setInterestsState] = useState<string[]>(() => readInterests());
  /* `interestMatches` is the expanded id set the storefront ranks products
     against — the raw picks alone would only ever match a handful of rows. */
  const [interestMatches, setInterestMatches] = useState<string[]>(() => [...expandInterests(readInterests())]);
  const setInterests = useCallback((ids: string[]) => {
    setInterestsState(ids);
    setInterestMatches([...expandInterests(ids)]);
    saveInterests(ids);
  }, []);
  const refreshCustomerProfile = useCallback(async () => {
    const user = customerAuth.currentUser;
    if (!user) return;
    const profile = await customerRequest<CustomerProfile>('/storefront/me', user);
    setCustomerProfile(profile);
    if (profile.interests.length) {
      setInterestsState(profile.interests);
      setInterestMatches([...expandInterests(profile.interests)]);
      saveInterests(profile.interests);
    }
  }, []);
  useEffect(() => onAuthStateChanged(customerAuth, async user => {
    setCustomer(user);
    if (!user) { setCustomerProfile(null); setAuthReady(true); return; }
    try { await refreshCustomerProfile(); } catch { setCustomerProfile(null); }
    setAuthReady(true);
  }), [refreshCustomerProfile]);

  useEffect(() => { if (currentPage !== 'admin') setSystemBarsDark(false); }, [currentPage]);
  useEffect(() => {
    const closeCart = (event: Event) => { if (isCartOpen) { setIsCartOpen(false); event.preventDefault(); } };
    window.addEventListener('souq-before-back', closeCart);
    return () => window.removeEventListener('souq-before-back', closeCart);
  }, [isCartOpen]);

  useEffect(() => { localStorage.setItem('souq-cart', JSON.stringify(cartItems)); }, [cartItems]);
  useEffect(() => { localStorage.setItem('souq-favorites', JSON.stringify(favorites)); }, [favorites]);

  useEffect(() => {
    const syncAdminRoute = () => {
      const isAdminRoute = /^\/admin(?:\/|$)/.test(window.location.pathname);
      if (isAdminRoute) { setCurrentPage('admin'); return; }
      const previous = window.history.state as { souqPage?: Page; souqParams?: NavParams } | null;
      setCurrentPage(previous?.souqPage || 'home');
      setNavParams(previous?.souqParams || {});
      window.scrollTo(0, 0);
    };
    if (!/^\/admin(?:\/|$)/.test(window.location.pathname) && !window.history.state?.souqPage) {
      window.history.replaceState({ ...window.history.state, souqPage: 'home', souqParams: {}, souqIndex: 0 }, '', window.location.href);
    }
    window.addEventListener('popstate', syncAdminRoute);
    return () => window.removeEventListener('popstate', syncAdminRoute);
  }, []);

  /* Set RTL direction */
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    document.title = 'سوق — متجر راقٍ';
  }, []);

  const navigate = useCallback((page: Page, params: NavParams = {}) => {
    if ((page === 'checkout' || page === 'account') && !customerAuth.currentUser) {
      setReturnPage(page); page = 'login';
      setReturnParams(params);
    }
    const previous = window.history.state as { souqPage?: Page; souqParams?: NavParams; souqIndex?: number } | null;
    const sameStorePage = page !== 'admin' && previous?.souqPage === page && JSON.stringify(previous.souqParams || {}) === JSON.stringify(params);
    if (page === 'admin' && !/^\/admin(?:\/|$)/.test(window.location.pathname)) {
      window.history.pushState(null, '', '/admin');
    } else if (page !== 'admin' && /^\/admin(?:\/|$)/.test(window.location.pathname)) {
      window.history.pushState({ souqPage: page, souqParams: params, souqIndex: 0 }, '', '/');
    } else if (page !== 'admin' && !sameStorePage) {
      window.history.pushState({ souqPage: page, souqParams: params, souqIndex: (previous?.souqIndex || 0) + 1 }, '', window.location.href);
    }
    setCurrentPage(page);
    setNavParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const continueAfterLogin = useCallback(() => {
    if (pendingCartItem) {
      dispatch({ type: 'ADD', payload: pendingCartItem });
      setPendingCartItem(null);
      setIsCartOpen(true);
    }
    navigate(returnPage, returnParams);
    setReturnPage('home');
    setReturnParams({});
  }, [navigate, pendingCartItem, returnPage, returnParams]);

  const addToCart = useCallback((item: CartItem) => {
    if (!customerAuth.currentUser) {
      setPendingCartItem(item);
      setReturnPage(currentPage);
      setReturnParams(navParams);
      navigate('login');
      return false;
    }
    dispatch({ type: 'ADD', payload: item });
    return true;
  }, [currentPage, navParams, navigate]);

  const removeFromCart = useCallback((productId: string) => {
    dispatch({ type: 'REMOVE', payload: productId });
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    if (qty < 1) {
      dispatch({ type: 'REMOVE', payload: productId });
    } else {
      dispatch({ type: 'UPDATE_QTY', payload: { productId, quantity: qty } });
    }
  }, []);

  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  }, []);

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message: msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = cartItems.reduce(
    (acc, i) => acc + i.product.price * i.quantity,
    0,
  );

  return (
    <AppContext.Provider
      value={{
        currentPage,
        navParams,
        navigate,
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        isCartOpen,
        setIsCartOpen,
        favorites,
        toggleFavorite,
        toasts,
        showToast,
        dismissToast,
        searchQuery,
        setSearchQuery,
        interests,
        setInterests,
        interestMatches,
        isLoggedIn,
        setIsLoggedIn,
        customer,
        customerProfile,
        authReady,
        refreshCustomerProfile,
        continueAfterLogin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
