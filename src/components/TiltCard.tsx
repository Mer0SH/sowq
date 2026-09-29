import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { isLowEndDevice, prefersReducedMotion } from '../services/motion';

/**
 * Pointer-driven 3D tilt with a light sheen sweep — the "product turns toward
 * you" feel used on cards, showcase pieces and the hero product.
 *
 * - The tilted layer uses `preserve-3d`, so an inner image can parallax
 *   (`depth`) and read as a real object instead of a flat picture.
 * - Transform values are rounded to whole pixels: fractional translate makes
 *   photographic cut-outs look soft on non-retina screens.
 * - Attaches nothing at all for reduced-motion, touch-only or weak devices.
 */
export default function TiltCard({
  children, className = '', style, radius = '1rem',
  max = 9, depth = 0, sheen = true, disabled = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Corner radius used to clip the sheen; match the child card. */
  radius?: string;
  /** Max rotation in degrees on each axis. */
  max?: number;
  /** Parallax translation (px) applied to the first inner image. */
  depth?: number;
  sheen?: boolean;
  disabled?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const shift = useRef<HTMLDivElement>(null);
  const gloss = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const w = wrap.current, l = layer.current, sh = depth ? shift.current : null;
    if (!w || !l || disabled) return;
    if (prefersReducedMotion() || isLowEndDevice()) return;
    if (typeof window.matchMedia === 'function' && !window.matchMedia('(pointer: fine)').matches) return;

    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0, idle = 0, active = false;

    const onMove = (e: PointerEvent) => {
      const r = w.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * max;
      ty = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * max;
      active = true;
      idle = 0;
      if (gloss.current) {
        gloss.current.style.backgroundPosition =
          `${(50 + clamp((e.clientX - r.left) / r.width) * 60).toFixed(1)}% ${(50 - clamp((e.clientY - r.top) / r.height) * 60).toFixed(1)}%`;
        gloss.current.style.opacity = '0.85';
      }
    };
    const onLeave = () => {
      tx = 0; ty = 0; active = false; idle = 0;
      if (gloss.current) gloss.current.style.opacity = '0';
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      if (Math.abs(tx - cx) < 0.02 && Math.abs(ty - cy) < 0.02) {
        cx = tx; cy = ty;
        if (!active && ++idle > 2) return; // settled and pointer is gone → stop drawing
      } else idle = 0;
      l.style.transform = `rotateX(${cy.toFixed(2)}deg) rotateY(${cx.toFixed(2)}deg)`;
      // Parallax lands on a dedicated wrapper so it never overwrites a Tailwind
      // transform (hover scale) that the child itself may define.
      if (sh) sh.style.transform = `translate3d(${(cx * depth / max).toFixed(1)}px, ${(-cy * depth / max).toFixed(1)}px, 0)`;
    };

    w.addEventListener('pointermove', onMove, { passive: true });
    w.addEventListener('pointerleave', onLeave);
    w.addEventListener('pointercancel', onLeave);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      w.removeEventListener('pointermove', onMove);
      w.removeEventListener('pointerleave', onLeave);
      w.removeEventListener('pointercancel', onLeave);
      l.style.transform = '';
      if (sh) sh.style.transform = '';
    };
  }, [disabled, depth, max]);

  return (
    <div ref={wrap} className={`tilt-wrap ${className}`} style={{ perspective: 900, ...style }}>
      <div ref={layer} className="tilt-layer">
        <div ref={shift} className="tilt-shift">{children}</div>
        {sheen && <span ref={gloss} className="tilt-gloss" aria-hidden="true" style={{ borderRadius: radius }} />}
      </div>
    </div>
  );
}

function clamp(v: number) { return Math.max(-1, Math.min(1, v)); }
