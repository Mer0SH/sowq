/* ────────────────────────────────────────────────────────────
   CategoryService — in-memory CRUD, mirrors a real REST API shape.
   Swap the implementations here when a real backend is available;
   all callers stay unchanged.
──────────────────────────────────────────────────────────── */

import { seedCategories } from '../data/categories';
import type { Category } from '../data/categories';

export type ChangeLogEntry = {
  id: string;
  at: Date;
  who: string;
  action: 'create' | 'update' | 'delete' | 'move';
  categoryId: string;
  categoryName: string;
  detail: string;
};

/* ── In-memory store ──────────────────────────────────────── */
let store: Category[] = seedCategories.map((c) => ({ ...c }));
let changeLog: ChangeLogEntry[] = [];

function log(action: ChangeLogEntry['action'], cat: Category, detail: string) {
  changeLog = [
    {
      id: Math.random().toString(36).slice(2),
      at: new Date(),
      who: 'مدير المتجر',
      action,
      categoryId: cat.id,
      categoryName: cat.name,
      detail,
    },
    ...changeLog.slice(0, 49),
  ];
}

/* ── Read helpers ─────────────────────────────────────────── */
export const categoryService = {
  /** All active categories (for storefront) */
  async getActive(): Promise<Category[]> {
    return store.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /** All categories including inactive (for admin) */
  async getAll(): Promise<Category[]> {
    return [...store].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getById(id: string): Promise<Category | undefined> {
    return store.find((c) => c.id === id);
  },

  async getChildren(parentId: string): Promise<Category[]> {
    return store.filter((c) => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /** Root-to-leaf path for breadcrumbs */
  async getAncestors(id: string): Promise<Category[]> {
    const result: Category[] = [];
    let current = store.find((c) => c.id === id);
    while (current) {
      result.unshift(current);
      current = current.parentId ? store.find((c) => c.id === current!.parentId) : undefined;
    }
    return result;
  },

  async getChangeLog(): Promise<ChangeLogEntry[]> {
    return [...changeLog];
  },

  /* ── Mutations ─────────────────────────────────────────── */

  async create(data: {
    name: string;
    parentId: string | null;
    imageUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
  }): Promise<Category> {
    const parent = data.parentId ? store.find((c) => c.id === data.parentId) : null;

    if (parent && parent.level >= 3) {
      throw new Error('الحد الأقصى للتعمق هو 3 مستويات');
    }

    const level = (parent ? parent.level + 1 : 1) as 1 | 2 | 3;
    const siblings = store.filter((c) => c.parentId === data.parentId);
    const maxOrder = siblings.reduce((m, c) => Math.max(m, c.sortOrder), 0);

    const slug = data.name
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^؀-ۿa-z0-9-]/gi, '')
      .toLowerCase() || `cat-${Date.now()}`;

    const newCat: Category = {
      id: `${data.parentId ?? 'root'}-${slug}-${Date.now()}`,
      name: data.name.trim(),
      slug,
      parentId: data.parentId,
      level,
      sortOrder: maxOrder + 1,
      isActive: true,
      imageUrl: data.imageUrl,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    };

    store = [...store, newCat];
    log('create', newCat, `أُضيف تحت: ${parent?.name ?? 'الجذر'}`);
    return newCat;
  },

  async update(id: string, patch: Partial<Pick<Category, 'name' | 'imageUrl' | 'isActive' | 'sortOrder' | 'seoTitle' | 'seoDescription'>>): Promise<Category> {
    const idx = store.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('التصنيف غير موجود');

    const updated = { ...store[idx], ...patch };
    store = store.map((c) => (c.id === id ? updated : c));
    log('update', updated, Object.keys(patch).join(', '));
    return updated;
  },

  /** Move to a different parent (respects 3-level limit) */
  async move(id: string, newParentId: string | null): Promise<Category> {
    const cat = store.find((c) => c.id === id);
    if (!cat) throw new Error('التصنيف غير موجود');

    const newParent = newParentId ? store.find((c) => c.id === newParentId) : null;
    if (newParent && newParent.level >= 3) throw new Error('الحد الأقصى للتعمق هو 3 مستويات');

    const newLevel = (newParent ? newParent.level + 1 : 1) as 1 | 2 | 3;
    const updated = { ...cat, parentId: newParentId, level: newLevel };
    store = store.map((c) => (c.id === id ? updated : c));
    log('move', updated, `نُقل إلى: ${newParent?.name ?? 'الجذر'}`);
    return updated;
  },

  /** Returns false if category has products or children (caller should offer alternatives) */
  async canDelete(id: string): Promise<{ ok: boolean; reason?: string }> {
    const hasChildren = store.some((c) => c.parentId === id);
    if (hasChildren) return { ok: false, reason: 'يحتوي على تصنيفات فرعية' };
    return { ok: true };
  },

  async delete(id: string): Promise<void> {
    const cat = store.find((c) => c.id === id);
    if (!cat) throw new Error('التصنيف غير موجود');
    const check = await categoryService.canDelete(id);
    if (!check.ok) throw new Error(`لا يمكن الحذف: ${check.reason}`);
    store = store.filter((c) => c.id !== id);
    log('delete', cat, 'تم الحذف');
  },

  /** Reorder siblings */
  async reorder(ids: string[]): Promise<void> {
    ids.forEach((id, i) => {
      store = store.map((c) => (c.id === id ? { ...c, sortOrder: i + 1 } : c));
    });
  },
};

/* ── Tree builder utility (pure, no async) ────────────────── */
export type CategoryNode = Category & { children: CategoryNode[] };

export function buildTree(categories: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const node of map.values()) {
    if (!node.parentId) {
      roots.push(node);
    } else {
      const parent = map.get(node.parentId);
      if (parent) parent.children.push(node);
    }
  }

  const sort = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}
