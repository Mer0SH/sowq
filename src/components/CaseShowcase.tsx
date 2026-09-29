import { useEffect, useMemo, useRef, useState } from 'react';
import SafeImage from './SafeImage';
import { startProductTransition } from '../services/motion';
import { useApp } from '../context/useApp';
import { formatPrice } from '../services/storefrontApi';
import { useReveal } from '../hooks/useReveal';

const STEP = 150;      // px advanced per step — larger than the side peeks, so cards never overlap
const VISIBLE = 2;     // cards rendered either side of the active one (outer pair fades out)

/**
 * 3D coverflow showcase.
 *
 * Replaces the two-slide carousel: a flat track (`translateX`) with per-card
 * 3D (rotateY + translateZ). A flat track plus per-card perspective is far
 * cheaper to composite than a real cylinder, and it keeps the side cards
 * readable instead of collapsing around a curve.
 */
export default function CaseShowcase({ products }: { products: { id: string; name: string; image: string; price: number; brand?: string }[] }) {
  const { navigate } = useApp();
  /* The reel is capped: rotating over more cards than are rendered would leave
     the stage empty. Everything below indexes into `cases`, never `products`. */
  const cases = useMemo(() => products.slice(0, 6), [products]);
  const total = cases.length;
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const drag = useRef<{ x: number } | null>(null);
  /* A drag ends with a click event too — without this, swiping the reel would
     also open the product under the finger. */
  const dragged = useRef(false);
  const reveal = useReveal<HTMLElement>();

  useEffect(() => { if (active >= total) setActive(0); }, [total, active]);
  useEffect(() => {
    if (paused || total < 2) return;
    const id = setInterval(() => setActive(i => (i + 1) % total), 6500);
    return () => clearInterval(id);
  }, [paused, total]);

  if (!total) return null;

  const goTo = (index: number) => setActive(((index % total) + total) % total);
  const open = (index: number) => {
    const product = cases[index];
    if (!product) return;
    startProductTransition(document.querySelector<HTMLImageElement>(`#case-${product.id} img`));
    navigate('product-detail', { productId: product.id });
  };
  const step = (direction: number) => goTo(active + direction);

  return <section
    ref={reveal}
    onMouseEnter={() => setPaused(true)}
    onMouseLeave={() => { setPaused(false); setDragging(false); drag.current = null; }}
    className="reveal-up w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-10 sm:pt-10 sm:pb-14 select-none"
    aria-label="معرض المنتجات"
  >
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold tracking-[0.28em] text-brand">معرض سوق</p>
        <h2 className="display-lg text-ink mt-1">اختيارات هذا الأسبوع</h2>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <button onClick={() => step(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-border text-ink transition-colors hover:border-ink" aria-label="السابق">‹</button>
        <button onClick={() => step(1)} className="grid h-10 w-10 place-items-center rounded-full border border-border text-ink transition-colors hover:border-ink" aria-label="التالي">›</button>
      </div>
    </div>

    <div
      className="relative"
      style={{ perspective: 1400, touchAction: 'pan-y' }}
      onPointerDown={event => { drag.current = { x: event.clientX }; dragged.current = false; setDragging(true); }}
      onPointerMove={event => {
        const state = drag.current;
        if (!state) return;
        if (Math.abs(event.clientX - state.x) > 70) {
          dragged.current = true;
          step(event.clientX < state.x ? 1 : -1); // RTL: dragging left advances
          drag.current = null;
        }
      }}
      onPointerUp={() => { drag.current = null; setDragging(false); }}
      onPointerCancel={() => { drag.current = null; setDragging(false); }}
      onPointerLeave={() => { drag.current = null; setDragging(false); }}
      onClickCapture={event => { if (dragged.current) { event.stopPropagation(); dragged.current = false; } }}
    >
      <div className="relative mx-auto flex h-[420px] items-center justify-center sm:h-[500px]">
        <span aria-hidden="true" className="absolute bottom-8 h-24 w-[62%] rounded-[50%] blur-2xl" style={{ background: 'radial-gradient(ellipse at center, rgba(26,22,20,0.16), transparent 70%)' }} />

        <div className="relative h-full w-full">
          {cases.map((product, i) => {
            const offset = i - active;
            const distance = Math.abs(offset);
            if (distance > VISIBLE) return null;
            const isActive = offset === 0;
            const activate = () => (isActive ? open(i) : goTo(i));
            return (
              /* Outer div owns the layout offset (deterministic centring),
                 inner div owns the 3D look — no fighting over `transform`. */
              <div
                key={product.id}
                className="absolute left-1/2 top-1/2"
                style={{
                  zIndex: isActive ? 5 : 4 - distance,
                  transition: dragging ? 'none' : 'transform var(--m-slow) var(--e-out), opacity var(--m-slow) var(--e-out)',
                  transform: `translate(-50%, -50%) translateX(${offset * STEP}px)`,
                  opacity: distance >= 2 ? 0 : distance === 1 ? 0.85 : 1,
                  pointerEvents: distance >= 2 ? 'none' : 'auto',
                }}
              >
                <div
                  id={`case-${product.id}`}
                  role="button"
                  tabIndex={isActive ? 0 : -1}
                  aria-pressed={isActive}
                  aria-label={isActive ? `افتح ${product.name}` : `اعرض ${product.name}`}
                  onClick={activate}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } }}
                  className="case-card"
                  style={{
                    transformStyle: 'preserve-3d',
                    transition: dragging ? 'none' : 'transform var(--m-slow) var(--e-out), filter var(--m-slow) var(--e-out)',
                    transform: `translateZ(${isActive ? 90 : -distance * 70}px) rotateY(${offset * -26}deg) scale(${isActive ? 1 : 0.92})`,
                    filter: isActive ? 'none' : 'saturate(0.7) brightness(0.96)',
                  }}
                >
                  <div className="case-inner w-[232px] overflow-hidden rounded-3xl border border-border bg-card sm:w-[272px] lg:w-[300px]">
                    <SafeImage
                      src={product.image}
                      alt={product.name}
                      className="product-crisp h-[286px] w-full object-cover sm:h-[336px] lg:h-[362px]"
                      fallbackClassName="h-[286px] w-full sm:h-[336px] lg:h-[362px]"
                      eager={isActive}
                    />
                    <span aria-hidden="true" className="case-shine absolute inset-0" />
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink-soft backdrop-blur-sm">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

      {/* Active details */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
        <div className="min-w-0">
          <p className="text-[11px] tracking-widest text-muted">{cases[active]?.brand || 'سوق'}</p>
          <h3 className="truncate text-lg font-black text-ink sm:text-xl">{cases[active]?.name}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-black text-ink">{formatPrice(cases[active]?.price ?? 0)}</span>
          <button onClick={() => open(active)} className="press rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand">
            اعرض المنتج
          </button>
        </div>
      </div>

      {/* Dots */}
      <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="اختيار المنتج">
        {cases.map((product, i) => (
          <button
            key={product.id}
            role="tab"
            aria-selected={i === active}
            aria-current={i === active}
            onClick={() => goTo(i)}
            className="case-dot"
            aria-label={`المنتج ${i + 1}`}
          />
        ))}
      </div>
    </section>;
}
