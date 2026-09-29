import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { buildTree } from '../services/categoryService';
import type { CategoryNode } from '../services/categoryService';
import type { Category } from '../data/categories';
import { seedCategories } from '../data/categories';
import { storefrontRequest, mediaUrl } from '../services/storefrontApi';

/* ── Synchronous initial state (no blank-before-hydration) ── */
const initialActive = seedCategories.filter((c) => c.isActive);
const initialTree   = buildTree(initialActive);

type CategoryContextType = {
  tree: CategoryNode[];
  adminTree: CategoryNode[];
  flat: Category[];
  isLoading: boolean;
  getById: (id: string) => Category | undefined;
  getChildren: (parentId: string) => Category[];
  getAncestors: (id: string) => Category[];
  refresh: () => Promise<void>;
};

const defaultValue: CategoryContextType = {
  tree: initialTree,
  adminTree: initialTree,
  flat: initialActive,
  isLoading: false,
  getById: (id) => initialActive.find((c) => c.id === id),
  getChildren: (pid) => initialActive.filter((c) => c.parentId === pid),
  getAncestors: (id) => {
    const result: Category[] = [];
    let cur = initialActive.find((c) => c.id === id);
    while (cur) { result.unshift(cur); cur = cur.parentId ? initialActive.find((c) => c.id === cur!.parentId) : undefined; }
    return result;
  },
  refresh: async () => {},
};

const CategoryContext = createContext<CategoryContextType>(defaultValue);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [tree, setTree]           = useState<CategoryNode[]>(initialTree);
  const [adminTree, setAdminTree] = useState<CategoryNode[]>(initialTree);
  const [flat, setFlat]           = useState<Category[]>(initialActive);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const active = (await storefrontRequest<Category[]>('/storefront/categories'))
        .map(category => ({ ...category, imageUrl: category.imageUrl ? mediaUrl(category.imageUrl) : undefined }));
      setFlat(active);
      setTree(buildTree(active));
      setAdminTree(buildTree(active));
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void refresh().catch(() => { setFlat([]); setTree([]); setAdminTree([]); }); }, [refresh]);

  const getById     = useCallback((id: string)  => flat.find((c) => c.id === id), [flat]);
  const getChildren = useCallback((pid: string) => flat.filter((c) => c.parentId === pid), [flat]);
  const getAncestors = useCallback((id: string): Category[] => {
    const result: Category[] = [];
    let cur = flat.find((c) => c.id === id);
    while (cur) { result.unshift(cur); cur = cur.parentId ? flat.find((c) => c.id === cur!.parentId) : undefined; }
    return result;
  }, [flat]);

  return (
    <CategoryContext.Provider value={{ tree, adminTree, flat, isLoading, getById, getChildren, getAncestors, refresh }}>
      {children}
    </CategoryContext.Provider>
  );
}

/* Never throws — returns default values if used outside provider */
export function useCategories() {
  return useContext(CategoryContext);
}
