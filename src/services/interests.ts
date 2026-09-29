/* ────────────────────────────────────────────────────────────
   Interest preferences — the single place that reads/writes the
   `souq-interests` localStorage entry.

   Two shapes exist in the wild:
     · legacy (written by the onboarding screen): { "<section id>": ["<child id>", …] }
     · flat id list (written from inside the storefront).
   readInterests() accepts both and always returns one de-duplicated flat
   array, so every consumer (personalised sections, picker, onboarding
   restore) agrees on the same vocabulary.
──────────────────────────────────────────────────────────── */

import { seedCategories } from '../data/categories';
import { buildTree } from './categoryService';
import type { CategoryNode } from './categoryService';

export const INTERESTS_KEY = 'souq-interests';
export const ONBOARDED_KEY = 'souq-onboarded';

/** Section id → picked child ids (the shape the onboarding screen edits). */
export type InterestPicks = Record<string, string[]>;

function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

/** Flat, de-duplicated list of picked category ids (sections + children). */
export function readInterests(): string[] {
  const raw = storage()?.getItem(INTERESTS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return [...new Set(parsed.filter((v): v is string => typeof v === 'string' && !!v))];
    if (parsed && typeof parsed === 'object') {
      const out = new Set<string>();
      for (const [section, children] of Object.entries(parsed as Record<string, unknown>)) {
        if (section) out.add(section);
        if (Array.isArray(children)) children.forEach(id => { if (typeof id === 'string' && id) out.add(id); });
      }
      return [...out];
    }
  } catch { /* corrupt entry → treated as "no interests" */ }
  return [];
}

/** Grouped view used by the onboarding screen to restore its chips. */
export function readInterestPicks(): InterestPicks {
  const raw = storage()?.getItem(INTERESTS_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
      const out: InterestPicks = {};
      for (const [section, children] of Object.entries(parsed as Record<string, unknown>)) {
        if (Array.isArray(children)) out[section] = children.filter((v): v is string => typeof v === 'string' && !!v);
      }
      return out;
    }
    // A flat list has no section grouping; the picker rebuilds it from the tree.
    if (Array.isArray(parsed)) return { __flat: parsed.filter((v): v is string => typeof v === 'string' && !!v) };
  } catch { /* ignore */ }
  return {};
}

function write(value: InterestPicks | string[]) {
  try { storage()?.setItem(INTERESTS_KEY, JSON.stringify(value)); } catch { /* private mode / quota */ }
}

/** Persists the grouped shape (keeps onboarding pre-selection working). */
export function saveInterestPicks(picks: InterestPicks) { write(picks); }

/** Persists a flat id list. */
export function saveInterests(ids: string[]) { write([...new Set(ids.filter(Boolean))]); }

export function clearInterests() {
  try { storage()?.removeItem(INTERESTS_KEY); } catch { /* ignore */ }
}

export function hasInterests() { return readInterests().length > 0; }

export function isOnboarded() {
  try { return !!storage()?.getItem(ONBOARDED_KEY); } catch { return false; }
}

export function markOnboarded() {
  try { storage()?.setItem(ONBOARDED_KEY, '1'); } catch { /* ignore */ }
}

/**
 * Resolves a stored id (section, branch or leaf) into the full set of ids the
 * storefront should treat as "interesting": the id itself, the section it
 * belongs to, and its sibling leaves. Products are filed on every level of the
 * tree, so a single leaf match alone would miss most of a section's catalogue.
 */
export function expandInterests(ids: string[], tree?: CategoryNode[]): Set<string> {
  const roots: CategoryNode[] = tree ?? buildTree(seedCategories.filter(category => category.isActive));
  const out = new Set<string>(ids);
  for (const id of ids) {
    for (const section of roots) {
      const child = section.children.find(entry => entry.id === id);
      const branch = section.children.find(entry => entry.children.some(leaf => leaf.id === id));
      if (section.id === id || child) {
        out.add(section.id);
        section.children.forEach(entry => out.add(entry.id));
      } else if (branch) {
        out.add(section.id);
        out.add(branch.id);
        branch.children.forEach(leaf => out.add(leaf.id));
      }
    }
  }
  return out;
}

