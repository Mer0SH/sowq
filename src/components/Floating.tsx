import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { isLowEndDevice, prefersReducedMotion } from '../services/motion';

/**
 * Realistic "floating in air" motion for product cut-outs.
 * - Layered sine waves (non-repeating feel) instead of a single CSS keyframe.
 * - Subtle 3D tilt that follows the pointer (desktop) with spring smoothing.
 * - Ground shadow shrinks / fades as the object rises.
 * - Pauses when off-screen; lighter on weak devices; off for reduced-motion.
 */
export default function Floating({ children, shadowColor = 'rgba(26,22,20,0.28)', intensity = 1, className = '' }: {
  children: ReactNode; shadowColor?: string; intensity?: number; className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = wrap.current, b = body.current, s = shadow.current;
    if (!w || !b || !s || prefersReducedMotion()) return;
    const lite = isLowEndDevice();
    const amp = (lite ? 10 : 16) * intensity;
    const seed = Math.random() * 1000;
    let raf = 0, visible = true, t0 = performance.now();
    // pointer tilt (spring)
    let tx = 0, ty = 0, cx = 0, cy = 0, vx = 0, vy = 0;
    const fine = window.matchMedia('(pointer: fine)').matches && !lite;

    const onMove = (e: PointerEvent) => {
      const r = w.getBoundingClientRect();
      tx = gsapClamp(((e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      ty = gsapClamp(((e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    };
    const onLeave = () => { tx = 0; ty = 0; };
    if (fine) { window.addEventListener('pointermove', onMove, { passive: true }); w.addEventListener('pointerleave', onLeave); }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = (now - t0) / 1000 + seed;
      // layered waves → organic, never-quite-repeating drift
      const y = Math.sin(t * 0.9) * amp + Math.sin(t * 2.1) * amp * 0.18;
      const x = Math.sin(t * 0.55) * amp * 0.25;
      const rz = Math.sin(t * 0.7 + 1.3) * 1.6 * intensity;
      const rxWave = Math.sin(t * 0.8 + 0.6) * 3 * intensity;
      const ryWave = Math.cos(t * 0.6) * 4 * intensity;
      // spring toward pointer target
      vx += (tx - cx) * 0.06; vx *= 0.82; cx += vx;
      vy += (ty - cy) * 0.06; vy *= 0.82; cy += vy;
      const ry = ryWave + cx * 12;
      const rx = rxWave - cy * 9;
      // Whole-pixel translation on purpose: fractional values are what makes a
      // photographic cut-out look soft on non-retina screens.
      b.style.transform = `translate3d(${r(x)}px, ${r(-Math.abs(amp) * 0.4 + y)}px, 0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
      // shadow reacts to height: higher → smaller & softer
      const h = (y + amp) / (2 * amp); // 0 (low) .. 1 (high)
      s.style.transform = `translate3d(${r(x * 0.6 + cx * 10)}px,0,0) scale(${(1.05 - h * 0.28).toFixed(3)}, ${(1 - h * 0.2).toFixed(3)})`;
      s.style.opacity = (0.95 - h * 0.45).toFixed(3);
    };
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '80px' });
    io.observe(w);
    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else { t0 = performance.now() - 1; raf = requestAnimationFrame(frame); } };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove); w.removeEventListener('pointerleave', onLeave);
    };
  }, [intensity]);

  return (
    <div ref={wrap} className={`relative flex flex-col items-center ${className}`} style={{ perspective: 900 }}>
      <div ref={body} className="relative z-10" style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>{children}</div>
      <div ref={shadow} aria-hidden="true" className="pointer-events-none -mt-6 h-7 w-[62%] rounded-[50%]"
        style={{ background: `radial-gradient(ellipse at center, ${shadowColor} 0%, transparent 70%)`, filter: 'blur(6px)', willChange: 'transform, opacity' }} />
    </div>
  );
}

function gsapClamp(v: number) { return Math.max(-1, Math.min(1, v)); }
/** Rounds to whole pixels — crisper cut-outs, and fewer sub-pixel repaints. */
function r(v: number) { return Math.round(v); }
