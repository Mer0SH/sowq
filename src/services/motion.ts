/* Motion helpers shared by onboarding, floating images and product transitions.
   No external animation library: rAF + Web Animations API (GPU-friendly transforms only). */

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Weak devices get a lighter version (no blur, fewer layers, shorter durations). */
export const isLowEndDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as NavigatorWithMemory;
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 3;
};

export const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const EASE_IN_OUT_EXPO = 'cubic-bezier(0.87, 0, 0.13, 1)';

/* ── Shared-element product transition ─────────────────────── */
type PendingTransition = { src: string; rect: DOMRect; fill: 'cover' | 'contain'; radius: string; at: number };
let pending: PendingTransition | null = null;

/** Call on the source image right before navigating to product-detail. */
export function startProductTransition(img: HTMLImageElement | null | undefined) {
  if (!img || prefersReducedMotion()) { pending = null; return; }
  const rect = img.getBoundingClientRect();
  if (!rect.width || !rect.height) { pending = null; return; }
  pending = {
    src: img.currentSrc || img.src,
    rect,
    fill: getComputedStyle(img).objectFit === 'cover' ? 'cover' : 'contain',
    radius: getComputedStyle(img.parentElement ?? img).borderRadius || '16px',
    at: performance.now(),
  };
}

/** Call from the destination page once its main image is mounted. */
export function playProductTransition(target: HTMLImageElement | null) {
  const p = pending; pending = null;
  if (!target || !p || performance.now() - p.at > 1500) return false;

  const lite = isLowEndDevice();
  const to = target.getBoundingClientRect();
  // navigate() scrolls to top smoothly → aim at the final (top-of-page) position.
  const finalTop = to.top + window.scrollY;
  const scaleX = p.rect.width / to.width, scaleY = p.rect.height / to.height;
  const dx = p.rect.left - to.left, dy = p.rect.top - finalTop;
  // The clone starts with the source's corner radius and ends on the target's.
  const fromRadius = p.radius;

  const clone = document.createElement('img');
  clone.src = p.src; clone.alt = '';
  Object.assign(clone.style, {
    position: 'fixed', left: `${to.left}px`, top: `${finalTop}px`, width: `${to.width}px`, height: `${to.height}px`,
    objectFit: p.fill, zIndex: '9999', pointerEvents: 'none', transformOrigin: '0 0', willChange: 'transform',
    borderRadius: fromRadius, filter: 'drop-shadow(0 30px 40px rgba(26,22,20,.25))',
  } as CSSStyleDeclaration);
  document.body.appendChild(clone);
  target.style.opacity = '0';

  const dur = lite ? 520 : 820;

  // A light sweep across the clone while it is in the air sells the "3D object
  // turning in your hand" feel. Skipped on weak devices.
  if (!lite) {
    const sheen = document.createElement('span');
    Object.assign(sheen.style, {
      position: 'fixed', left: `${to.left}px`, top: `${finalTop}px`, width: `${to.width}px`, height: `${to.height}px`,
      zIndex: '10000', pointerEvents: 'none', borderRadius: fromRadius, overflow: 'hidden',
    } as CSSStyleDeclaration);
    const gloss = document.createElement('span');
    Object.assign(gloss.style, {
      position: 'absolute', inset: '0', display: 'block',
      background: 'linear-gradient(115deg, transparent 34%, rgba(255,255,255,.62) 50%, transparent 66%)',
      backgroundSize: '260% 100%', backgroundPosition: '50% 50%', transform: 'translateX(-120%)',
    } as CSSStyleDeclaration);
    sheen.appendChild(gloss);
    document.body.appendChild(sheen);
    gloss.animate(
      [{ transform: 'translateX(-120%)' }, { transform: 'translateX(120%)' }],
      { duration: dur * 0.85, delay: dur * 0.1, easing: 'ease-out', fill: 'forwards' },
    );
    setTimeout(() => sheen.remove(), dur * 1.1);
  }

  const anim = clone.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`, borderRadius: fromRadius },
    { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 30}px) scale(${(scaleX + 1) / 2 * 1.04}, ${(scaleY + 1) / 2 * 1.04}) rotate(-1.5deg)`, offset: 0.55 },
    { transform: 'translate(0,0) scale(1,1) rotate(0deg)', borderRadius: '24px' },
  ], { duration: dur, easing: EASE_OUT_EXPO, fill: 'forwards' });

  // backdrop veil that softly reveals the new page
  const veil = document.createElement('div');
  Object.assign(veil.style, { position: 'fixed', inset: '0', background: '#fafaf8', zIndex: '9998', pointerEvents: 'none' } as CSSStyleDeclaration);
  document.body.appendChild(veil);
  veil.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: dur * 0.9, easing: 'ease-out', fill: 'forwards' });

  anim.onfinish = () => {
    target.style.opacity = '';
    target.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, fill: 'both' });
    clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = () => clone.remove();
    veil.remove();
  };
  return true;
}
