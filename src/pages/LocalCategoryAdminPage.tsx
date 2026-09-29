import { useState, useMemo } from 'react';
import {
  Plus, Search, ChevronLeft, Edit2, Trash2, Eye, EyeOff,
  X, Check, AlertTriangle, Clock, MoveRight,
} from 'lucide-react';
import { useCategories } from '../context/CategoryContext';
import { categoryService } from '../services/categoryService';
import type { CategoryNode } from '../services/categoryService';
import type { Category } from '../data/categories';
import { useApp } from '../context/useApp';

/* ── Small reusable toggle ─────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${on ? 'bg-brand' : 'bg-border'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-4' : 'left-0.5'}`} />
    </button>
  );
}

/* ── Add/Edit modal ────────────────────────────────────────── */
function CategoryModal({
  mode,
  editTarget,
  parentId,
  allCategories,
  onClose,
  onSave,
}: {
  mode: 'add' | 'edit';
  editTarget?: Category;
  parentId?: string | null;
  allCategories: Category[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(editTarget?.name ?? '');
  const [imageUrl, setImageUrl] = useState(editTarget?.imageUrl ?? '');
  const [seoTitle, setSeoTitle] = useState(editTarget?.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(editTarget?.seoDescription ?? '');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    mode === 'add' ? (parentId ?? null) : (editTarget?.parentId ?? null),
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  /* Parent options: only L1 and L2 (so new child stays ≤ L3) */
  const parentOptions = allCategories.filter((c) => c.level < 3);

  async function handleSave() {
    if (!name.trim()) { setError('الاسم مطلوب'); return; }
    setSaving(true);
    setError('');
    try {
      if (mode === 'add') {
        await categoryService.create({ name: name.trim(), parentId: selectedParentId, imageUrl, seoTitle, seoDescription });
      } else if (editTarget) {
        await categoryService.update(editTarget.id, { name: name.trim(), imageUrl, seoTitle, seoDescription });
      }
      onSave();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-md mx-auto"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-ink">{mode === 'add' ? 'إضافة تصنيف' : 'تعديل التصنيف'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">اسم التصنيف *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: هواتف ذكية"
              className={`w-full h-11 bg-surface border rounded-xl px-3 text-sm outline-none transition-all
                ${error ? 'border-danger focus:ring-2 focus:ring-danger/20' : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
              autoFocus
            />
            {error && <p className="text-xs text-danger mt-1">{error}</p>}
          </div>

          {mode === 'add' && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">التصنيف الأب</label>
              <select
                value={selectedParentId ?? ''}
                onChange={(e) => setSelectedParentId(e.target.value || null)}
                className="w-full h-11 bg-surface border border-border rounded-xl px-3 text-sm outline-none appearance-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              >
                <option value="">قسم رئيسي (المستوى الأول)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {'—'.repeat(c.level - 1)} {c.name} (مستوى {c.level})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">رابط الصورة (اختياري)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full h-11 bg-surface border border-border rounded-xl px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">عنوان SEO (اختياري)</label>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className="w-full h-11 bg-surface border border-border rounded-xl px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">وصف SEO (اختياري)</label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={2}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-bold hover:bg-brand transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? '...' : <><Check size={15} /> حفظ</>}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-border rounded-xl text-sm text-ink hover:bg-surface transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Admin tree node ───────────────────────────────────────── */
function AdminTreeNode({
  node,
  allCategories,
  onRefresh,
  depth = 0,
}: {
  node: CategoryNode;
  allCategories: Category[];
  onRefresh: () => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(depth === 0);
  const [modal, setModal] = useState<'edit' | 'add' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delError, setDelError] = useState('');

  const indent = depth === 0 ? '' : depth === 1 ? 'pr-5' : 'pr-10';

  async function toggleActive() {
    await categoryService.update(node.id, { isActive: !node.isActive });
    onRefresh();
  }

  async function handleDelete() {
    const check = await categoryService.canDelete(node.id);
    if (!check.ok) { setDelError(check.reason!); return; }
    await categoryService.delete(node.id);
    onRefresh();
    setConfirmDelete(false);
  }

  return (
    <li>
      <div
        className={`flex items-center gap-2 py-2 hover:bg-surface rounded-xl px-2 group transition-colors ${indent}`}
      >
        {/* Expand toggle */}
        {node.children.length > 0 ? (
          <button onClick={() => setOpen((v) => !v)} className="shrink-0 w-5 h-5 flex items-center justify-center text-muted">
            <ChevronLeft size={13} className={`transition-transform ${open ? '-rotate-90' : ''}`} />
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Category name */}
        <span className={`flex-1 text-sm truncate ${!node.isActive ? 'line-through text-muted' : depth === 0 ? 'font-bold text-ink' : 'text-ink-soft'}`}>
          {node.name}
        </span>

        {/* Level badge */}
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0
          ${node.level === 1 ? 'bg-brand-50 text-brand-600' : node.level === 2 ? 'bg-surface text-muted' : 'text-muted'}`}>
          م{node.level}
        </span>

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setModal('add')}
            title="إضافة تصنيف فرعي"
            disabled={node.level >= 3}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-brand hover:bg-brand-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={() => setModal('edit')}
            title="تعديل"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={toggleActive}
            title={node.isActive ? 'تعطيل' : 'تفعيل'}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-warning hover:bg-warning-bg transition-colors"
          >
            {node.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button
            onClick={() => { setConfirmDelete(true); setDelError(''); }}
            title="حذف"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger-bg transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Delete confirm inline */}
      {confirmDelete && (
        <div className={`${indent} pr-7 py-2 bg-danger-bg rounded-xl mb-1 px-3`} style={{ animation: 'fadeIn 0.15s ease-out' }}>
          {delError ? (
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-danger mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-danger font-medium">{delError}</p>
                <p className="text-xs text-muted mt-0.5">يمكنك تعطيل التصنيف بدلاً من حذفه</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-danger mb-2">حذف «{node.name}» نهائياً؟</p>
          )}
          <div className="flex gap-2 mt-1">
            {!delError && (
              <button onClick={handleDelete} className="px-3 py-1 bg-danger text-white rounded-lg text-xs font-medium">
                حذف
              </button>
            )}
            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 border border-danger/30 rounded-lg text-xs text-danger">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Recurse */}
      {open && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <AdminTreeNode
              key={child.id}
              node={child}
              allCategories={allCategories}
              onRefresh={onRefresh}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}

      {/* Modals */}
      {modal === 'add' && (
        <CategoryModal
          mode="add"
          parentId={node.id}
          allCategories={allCategories}
          onClose={() => setModal(null)}
          onSave={onRefresh}
        />
      )}
      {modal === 'edit' && (
        <CategoryModal
          mode="edit"
          editTarget={node}
          allCategories={allCategories}
          onClose={() => setModal(null)}
          onSave={onRefresh}
        />
      )}
    </li>
  );
}

/* ── Admin page ────────────────────────────────────────────── */
export default function AdminPage() {
  const { navigate } = useApp();
  const { adminTree, flat, refresh } = useCategories();
  const [searchQ, setSearchQ] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [changeLog, setChangeLog] = useState<Awaited<ReturnType<typeof categoryService.getChangeLog>>>([]);
  const [addModal, setAddModal] = useState(false);

  async function handleRefresh() {
    await refresh();
    const log = await categoryService.getChangeLog();
    setChangeLog(log);
  }

  async function loadLog() {
    const log = await categoryService.getChangeLog();
    setChangeLog(log);
    setShowLog(true);
  }

  const filteredTree = useMemo(() => {
    if (!searchQ.trim()) return adminTree;
    const q = searchQ.toLowerCase();
    const matchIds = new Set(flat.filter((c) => c.name.toLowerCase().includes(q)).map((c) => c.id));

    function filterNode(node: CategoryNode): CategoryNode | null {
      const filteredChildren = node.children.map(filterNode).filter(Boolean) as CategoryNode[];
      if (matchIds.has(node.id) || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }
    return adminTree.map(filterNode).filter(Boolean) as CategoryNode[];
  }, [adminTree, flat, searchQ]);

  const totalActive = flat.length;
  const totalAll = flat.length + adminTree.reduce((a, n) => a + (!n.isActive ? 1 : 0), 0);

  return (
    <main className="page-transition max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate('home')} className="text-sm text-muted hover:text-ink transition-colors">
              الرئيسية
            </button>
            <ChevronLeft size={13} className="rotate-180 text-muted" />
            <span className="text-sm font-medium text-ink">إدارة التصنيفات</span>
          </div>
          <h1 className="text-xl font-bold text-ink">شجرة التصنيفات</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLog}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-ink-soft hover:text-ink hover:bg-surface transition-colors"
          >
            <Clock size={14} />
            سجل التغييرات
          </button>
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand transition-colors"
          >
            <Plus size={15} />
            إضافة قسم
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'الأقسام النشطة', value: totalActive, color: 'text-success' },
          { label: 'الأقسام الرئيسية', value: adminTree.length, color: 'text-brand' },
          { label: 'الحد الأقصى للتعمق', value: '3 مستويات', color: 'text-muted' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-border rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="بحث فوري في التصنيفات..."
          className="w-full h-10 bg-white border border-border rounded-xl pr-9 pl-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted mb-3 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-50 border border-brand-100" /> م1 = مستوى أول</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-surface border border-border" /> م2 = مستوى ثاني</span>
        <span>م3 = مستوى ثالث (أقصى عمق)</span>
        <span className="flex items-center gap-1"><EyeOff size={11} /> تعطيل يُخفي من المتجر</span>
      </div>

      {/* Tree */}
      <div className="bg-white border border-border rounded-xl p-4">
        {filteredTree.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <Search size={32} className="mx-auto mb-2" />
            <p className="text-sm">لا توجد نتائج للبحث</p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filteredTree.map((node) => (
              <AdminTreeNode
                key={node.id}
                node={node}
                allCategories={flat}
                onRefresh={handleRefresh}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Change log panel */}
      {showLog && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowLog(false)} />
          <div
            className="fixed left-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col"
            style={{ animation: 'slideInLeft 0.3s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-ink">سجل التغييرات</h2>
              <button onClick={() => setShowLog(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-muted">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {changeLog.length === 0 ? (
                <div className="text-center py-16 text-muted">
                  <Clock size={32} className="mx-auto mb-2" />
                  <p className="text-sm">لا توجد تغييرات بعد</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {changeLog.map((entry) => (
                    <li key={entry.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded
                          ${entry.action === 'create' ? 'bg-success-bg text-success' :
                            entry.action === 'delete' ? 'bg-danger-bg text-danger' :
                            entry.action === 'move' ? 'bg-brand-50 text-brand' :
                            'bg-surface text-muted'}`}>
                          {entry.action === 'create' ? 'إضافة' :
                           entry.action === 'delete' ? 'حذف' :
                           entry.action === 'move' ? 'نقل' : 'تعديل'}
                        </span>
                        <span className="text-[10px] text-muted shrink-0">{entry.at.toLocaleTimeString('ar-SA')}</span>
                      </div>
                      <p className="text-sm font-medium text-ink">{entry.categoryName}</p>
                      <p className="text-xs text-muted">{entry.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* Root-level add modal */}
      {addModal && (
        <CategoryModal
          mode="add"
          parentId={null}
          allCategories={flat}
          onClose={() => setAddModal(false)}
          onSave={handleRefresh}
        />
      )}
    </main>
  );
}
