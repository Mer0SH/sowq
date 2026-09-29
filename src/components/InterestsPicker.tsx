import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Sparkles, X } from 'lucide-react';
import { useCategories } from '../context/CategoryContext';
import { useApp } from '../context/useApp';
import { useCatalog } from '../context/CatalogContext';
import { buildTree } from '../services/categoryService';
import type { CategoryNode } from '../services/categoryService';
import { seedCategories } from '../data/categories';
import { readInterestPicks } from '../services/interests';
import TiltCard from './TiltCard';

type Group = { title: string; items: { id: string; name: string }[] };

/** Two levels of the tree, flattened into titled chip groups. */
function groupsOf(node: CategoryNode): Group[] {
  const withKids = node.children.filter(child => child.children.length);
  const leaves = node.children.filter(child => !child.children.length);
  const out: Group[] = withKids.map(child => ({ title: child.name, items: child.children.map(g => ({ id: g.id, name: g.name })) }));
  if (leaves.length) out.push({ title: out.length ? 'أقسام أخرى' : 'الأقسام', items: leaves.map(child => ({ id: child.id, name: child.name })) });
  return out;
}

/**
 * Interests manager — the "تعديل اهتماماتي" entry point that was missing.
 *
 * Preferences used to be write-once: whatever you tapped during onboarding
 * could never be changed, and nothing in the shop read them. This sheet is the
 * editable side of that same `souq-interests` entry and pushes the new
 * selection straight into the personalised home sections through `onSaved`.
 */
export default function InterestsPicker({ open, onClose, onSaved }: {
  open: boolean;
  onClose: () => void;
  onSaved?: (ids: string[]) => Promise<void> | void;
}) {
  const { tree } = useCategories();
  const { products } = useCatalog();
  const { showToast } = useApp();

  const sections = useMemo(() => {
    const live = tree.filter(node => node.level === 1);
    return (live.length ? live : buildTree(seedCategories.filter(c => c.isActive))).slice(0, 10);
  }, [tree]);

  const [picks, setPicks] = useState<Record<string, Set<string>>>({});
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* Seed the draft from storage every time the sheet opens. */
  useEffect(() => {
    if (!open) return;
    const stored = readInterestPicks();
    const next: Record<string, Set<string>> = {};
    for (const section of sections) {
      // Mirrors groupsOf(): leaves contribute themselves, branches contribute
      // their children — the exact ids the chips can produce.
      const offered = new Set(section.children.flatMap(child => child.children.length ? child.children.map(g => g.id) : [child.id]));
      const ids = new Set<string>();
      (stored[section.id] || []).forEach(id => { if (offered.has(id)) ids.add(id); });
      // Flat lists (written from the storefront) may point straight at a child.
      (stored.__flat || []).forEach(id => { if (offered.has(id)) ids.add(id); });
      if (ids.size) next[section.id] = ids;
    }
    setPicks(next);
    setOpenSection(sections[0]?.id ?? null);
  }, [open, sections]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [open, onClose]);

  if (!open) return null;

  const selectedCount = Object.values(picks).reduce((total, set) => total + set.size, 0);
  const sectionCount = Object.values(picks).filter(set => set.size).length;
  const activeSection = sections.find(section => section.id === openSection) ?? sections[0];
  const activeIds = picks[activeSection?.id ?? ''] ?? new Set<string>();

  function productsFor(sectionId: string) {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return 0;
    const ids = new Set<string>([section.id, ...section.children.map(c => c.id), ...section.children.flatMap(c => c.children.map(g => g.id))]);
    return products.filter(product => ids.has(product.category)).length;
  }

  function toggleChild(sectionId: string, childId: string) {
    setPicks(current => {
      const ids = new Set(current[sectionId] || []);
      if (ids.has(childId)) ids.delete(childId); else ids.add(childId);
      return { ...current, [sectionId]: ids };
    });
  }

  function toggleSection(sectionId: string) {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    setPicks(current => {
      if ((current[sectionId]?.size ?? 0) > 0) return { ...current, [sectionId]: new Set<string>() };
      const ids = new Set<string>();
      section.children.forEach(child => {
        if (child.children.length) child.children.forEach(g => ids.add(g.id));
        else ids.add(child.id);
      });
      return { ...current, [sectionId]: ids };
    });
  }

  async function save() {
    if (saving) return;
    const grouped: Record<string, string[]> = {};
    for (const [sectionId, ids] of Object.entries(picks)) if (ids.size) grouped[sectionId] = [...ids];
    const flat = Object.entries(grouped).flatMap(([sectionId, ids]) => [...ids]);
    // The flat list is the canonical stored shape; `onSaved` (the app context)
    // is what persists it, so the picker and the storefront never race.
    setSaving(true);
    try {
      await onSaved?.(flat);
      showToast(flat.length ? 'تم تحديث اهتماماتك' : 'أُزيلت كل الاهتمامات', flat.length ? 'success' : 'info');
      onClose();
    } catch (error) { showToast((error as Error).message || 'تعذر حفظ الاهتمامات', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center" dir="rtl">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm anim-fade-in" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="تعديل الاهتمامات"
        className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card anim-sheet-up sm:rounded-3xl sm:anim-pop-in"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-7">
          <div>
            <h2 className="text-lg font-black text-ink sm:text-xl">اهتماماتك</h2>
            <p className="mt-0.5 text-xs text-muted">
              {selectedCount
                ? `اخترت ${sectionCount} ${sectionCount === 1 ? 'قسم' : 'أقسام'} و${selectedCount} اهتماماً — سنرتّب الرئيسية على أساسها.`
                : 'لم تختر بعد — سنعرض لك كل شيء بالتساوي.'}
            </p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink" aria-label="إغلاق">
            <X size={18} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Sections rail */}
          <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 scrollbar-none sm:w-52 sm:shrink-0 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-l sm:px-3 sm:py-4">
            {sections.map(section => {
              const count = picks[section.id]?.size ?? 0;
              const isActive = activeSection?.id === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setOpenSection(section.id)}
                  className={`flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-right text-sm transition-colors
                    ${isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface'}`}
                >
                  <span className="whitespace-nowrap font-medium">{section.name}</span>
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-brand-50 text-brand-600'}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Chips */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            {activeSection && (
              <TiltCard max={4} depth={4} radius="1rem" className="mb-4">
                <div className="flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-3">
                  {activeSection.imageUrl
                    ? <img src={activeSection.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy" decoding="async" />
                    : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white text-brand"><Sparkles size={20} /></span>}
                  <div className="min-w-0">
                    <p className="text-sm font-black text-ink">{activeSection.name}</p>
                    <p className="text-xs text-muted">
                      {productsFor(activeSection.id)} منتج في هذا القسم — اختر التفاصيل التي تهمك.
                    </p>
                  </div>
                </div>
              </TiltCard>
            )}

            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-ink-soft">
                {activeIds.size ? `محدد ${activeIds.size}` : 'لم تحدد شيئاً في هذا القسم'}
              </p>
              <button
                onClick={() => activeSection && toggleSection(activeSection.id)}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand transition-colors hover:text-brand-600"
              >
                {activeIds.size ? 'مسح القسم' : 'تحديد الكل'}
              </button>
            </div>

            <div className="space-y-5">
              {activeSection && groupsOf(activeSection).map(group => (
                <div key={group.title}>
                  <h3 className="mb-2 text-sm font-bold text-ink">{group.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map(item => {
                      const on = activeIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleChild(activeSection.id, item.id)}
                          aria-pressed={on}
                          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-all active:scale-95
                            ${on ? 'border-brand bg-brand-50 font-bold text-brand-600' : 'border-border text-ink-soft hover:border-border-strong'}`}
                        >
                          {on ? <Check size={13} /> : <Plus size={13} />}
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-7">
          <p className="text-xs text-muted">
            {selectedCount ? <>اخترت <b className="text-ink">{selectedCount}</b> اهتماماً</> : 'بلا اهتمامات'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink-soft transition-colors hover:border-border-strong">إلغاء</button>
            <button onClick={() => void save()} disabled={saving} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand disabled:opacity-60">{saving ? 'جارٍ الحفظ…' : 'حفظ الاهتمامات'}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

