import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '../data/products';
import { adaptProduct, storefrontRequest } from '../services/storefrontApi';

type CatalogValue = { products: Product[]; loading: boolean; error: string; refresh: () => Promise<void> };
const CatalogContext = createContext<CatalogValue>({ products: [], loading: true, error: '', refresh: async () => {} });

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await storefrontRequest<Product[]>('/storefront/products');
      setProducts(rows.map(adaptProduct));
      setError('');
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return <CatalogContext.Provider value={{ products, loading, error, refresh }}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
