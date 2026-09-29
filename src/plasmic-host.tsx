import { PlasmicCanvasHost, registerComponent } from '@plasmicapp/host';
import ProductCard from './components/ProductCard';
import Header from './components/Header';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import { products } from './data/products';
import './index.css';

/* ── Register ProductCard ────────────────────────────────────── */
registerComponent(ProductCard, {
  name: 'ProductCard',
  displayName: 'كارت منتج',
  props: {
    product: {
      type: 'object',
      defaultValue: products[0],
      description: 'بيانات المنتج',
    },
    size: {
      type: 'choice',
      options: ['sm', 'md'],
      defaultValue: 'md',
      description: 'حجم الكارت',
    },
  },
  importPath: './components/ProductCard',
});

/* ── Register Header ─────────────────────────────────────────── */
registerComponent(Header, {
  name: 'Header',
  displayName: 'الهيدر',
  props: {},
  importPath: './components/Header',
});

/* ── Register Footer ─────────────────────────────────────────── */
registerComponent(Footer, {
  name: 'Footer',
  displayName: 'الفوتر',
  props: {},
  importPath: './components/Footer',
});

/* ── Register BottomNav ──────────────────────────────────────── */
registerComponent(BottomNav, {
  name: 'BottomNav',
  displayName: 'شريط التنقل السفلي',
  props: {},
  importPath: './components/BottomNav',
});

/* ── Canvas Host ─────────────────────────────────────────────── */
export default function PlasmicHost() {
  return <PlasmicCanvasHost />;
}
