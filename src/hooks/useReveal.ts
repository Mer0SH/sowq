import { useEffect, useRef } from 'react';

/**
 * Adds `is-visible` when the element scrolls into view, so the `.reveal`
 * rules in `index.css` finally have something that activates them.
 *
 * One observer is shared by every element on the page and is disposed as soon
 * as the last one has been revealed — scrolling a long home page therefore
 * costs a single observer, not one per section.
 */
let observer: IntersectionObserver | null = null;
let watched = 0;
const pending = new WeakMap<Element, () => void>();

function ensureObserver() {
  if (observer || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return observer;
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      pending.get(entry.target)?.();
      pending.delete(entry.target);
      watched = Math.max(0, watched - 1);
      observer?.unobserve(entry.target);
    }
    if (!watched) { observer?.disconnect(); observer = null; }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  return observer;
}

export function useReveal<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => {
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      el.classList.add('is-visible');
    };
    const io = ensureObserver();
    if (!io) { show(); return; }
    pending.set(el, show);
    watched += 1;
    io.observe(el);
    return () => {
      if (pending.delete(el)) watched = Math.max(0, watched - 1);
      io.unobserve(el);
    };
  }, [delay]);
  return ref;
}
