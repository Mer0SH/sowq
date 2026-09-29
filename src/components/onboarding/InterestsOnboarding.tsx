import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useCategories } from '../../context/CategoryContext';
import { buildTree } from '../../services/categoryService';
import { readInterestPicks } from '../../services/interests';
import type { CategoryNode } from '../../services/categoryService';
import { seedCategories } from '../../data/categories';
import { EASE_OUT_EXPO, isLowEndDevice, prefersReducedMotion } from '../../services/motion';
import './onboarding.css';

import imgElectronics from '../../assets/onboarding/electronics.jpg';
import imgFashion from '../../assets/onboarding/fashion.jpg';
import imgBeauty from '../../assets/onboarding/beauty.jpg';
import imgHome from '../../assets/onboarding/home.jpg';
import imgAccessories from '../../assets/onboarding/accessories.jpg';
import imgSports from '../../assets/onboarding/sports.jpg';
import imgBaby from '../../assets/onboarding/baby.jpg';
import imgTools from '../../assets/onboarding/tools.jpg';

export const INTERESTS_KEY = 'souq-interests';
export const ONBOARDED_KEY = 'souq-onboarded';
const localImages: Record<string, string> = {
  electronics: imgElectronics, fashion: imgFashion, 'fragrance-beauty': imgBeauty, 'home-kitchen': imgHome,
  accessories: imgAccessories, sports: imgSports, 'mom-baby': imgBaby, tools: imgTools,
};
const blurbs: Record<string, string> = {
  electronics: 'جوالات ولابتوبات وسماعات وأجهزة ذكية من أشهر العلامات، بضمان رسمي وتوصيل سريع.',
  fashion: 'تشكيلات موسمية من الملابس والأحذية والحقائب بتصاميم عصرية وخامات مختارة.',
  'fragrance-beauty': 'عطور عربية وعالمية، ومنتجات عناية بالبشرة والشعر من أفضل الماركات.',
  'home-kitchen': 'كل ما يحتاجه منزلك: أثاث وديكور وأجهزة وأدوات مطبخ أنيقة وعملية.',
  accessories: 'لمسات تكمل إطلالتك: ساعات ونظارات ومجوهرات وجلديات فاخرة.',
  sports: 'معدات اللياقة وملابس الرياضة ومستلزمات الرحلات والأنشطة الخارجية.',
  'mom-baby': 'منتجات آمنة ومختارة بعناية للأم والطفل، من الرضاعة إلى الألعاب.',
  tools: 'عدد يدوية وكهربائية احترافية لأعمال الصيانة والحدائق.',
};

type Group = { title: string; items: { id: string; name: string }[] };
function groupsOf(node: CategoryNode): Group[] {
  const withKids = node.children.filter(c => c.children.length);
  const leaves = node.children.filter(c => !c.children.length);
  const out: Group[] = withKids.map(c => ({ title: c.name, items: c.children.map(g => ({ id: g.id, name: g.name })) }));
  if (leaves.length) out.push({ title: out.length ? 'أقسام أخرى' : 'الأقسام', items: leaves.map(c => ({ id: c.id, name: c.name })) });
  return out;
}

function plural(n: number, one: string, two: string, few: string, many: string) {
  if (n === 0) return `لا ${few === 'أقسام' ? 'أقسام' : many}`;
  if (n === 1) return one; if (n === 2) return two;
  return `${n} ${n <= 10 ? few : many}`;
}
const pad = (n: number) => String(n).padStart(2, '0');
const wrap180 = (a: number) => ((a % 360) + 540) % 360 - 180;

export default function InterestsOnboarding({ onDone }: { onDone: (picked: string[]) => void }) {
  const { tree } = useCategories();
  // Fallback to the bundled seed tree when the API is unreachable, so onboarding never renders empty.
  const cats = useMemo(() => {
    const live = tree.filter(c => c.level === 1);
    return (live.length ? live : buildTree(seedCategories.filter(c => c.isActive)).filter(c => c.level === 1)).slice(0, 10);
  }, [tree]);
  const N = Math.max(cats.length, 1), STEP = 360 / N;
  const lite = useMemo(() => isLowEndDevice(), []);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const [picks, setPicks] = useState<Record<string, string[]>>(() => {
    const stored = readInterestPicks();
    if (!stored.__flat) return stored;
    // A flat list (written from the storefront picker) carries section ids next
    // to child ids — regroup it so the chips come back pre-selected.
    const grouped: Record<string, string[]> = {};
    const sectionIds = new Set(cats.map(c => c.id));
    for (const id of stored.__flat) {
      if (sectionIds.has(id)) { grouped[id] ??= []; continue; }
      const owner = cats.find(c => c.children.some(child => child.id === id));
      if (owner) grouped[owner.id] = [...(grouped[owner.id] || []), id];
    }
    return grouped;
  });
  const [active, setActive] = useState(0);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [temp, setTemp] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const mImgRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  const st = useRef({ target: 0, current: reduced ? 0 : 90, radius: 0, raf: 0, paused: false, active: -1, draggingMouse: false });

  /* ── Ring layout + render loop (lerp → buttery) ── */
  const layout = useCallback(() => {
    const ring = ringRef.current; if (!ring) return;
    const w = ring.offsetWidth;
    st.current.radius = Math.round((w / 2) / Math.tan(Math.PI / N) * 1.12);
    cardRefs.current.forEach((el, i) => { if (el) el.style.transform = `rotateY(${i * STEP}deg) translateZ(${st.current.radius}px)`; });
  }, [N, STEP]);

  useEffect(() => {
    const root = rootRef.current;
    const cw = window.innerWidth < 820 ? Math.min(Math.max(window.innerWidth * 0.58, 190), 260) : Math.min(Math.max(window.innerWidth * 0.22, 210), 290);
    root?.style.setProperty('--ob-cw', `${cw}px`);
    layout();
    const s = st.current;
    const imgs = cardRefs.current.map(el => el?.querySelector('img') as HTMLImageElement | null);
    const shades = cardRefs.current.map(el => el?.querySelector('.ob-shade') as HTMLDivElement | null);
    let idle = 0;
    const tick = () => {
      s.raf = requestAnimationFrame(tick);
      if (s.paused) return;
      const diff = s.target - s.current;
      if (Math.abs(diff) < 0.01) { s.current = s.target; if (++idle > 3) return; } else idle = 0; // sleep when still
      s.current += diff * (reduced ? 1 : s.draggingMouse ? 0.24 : lite ? 0.16 : 0.12);
      if (ringRef.current) ringRef.current.style.transform = `translateZ(${-s.radius}px) rotateY(${s.current}deg)`;
      for (let i = 0; i < N; i++) {
        const rel = wrap180(i * STEP + s.current), f = Math.abs(rel) / 180;
        const sh = shades[i]; if (sh) sh.style.opacity = Math.min(0.82, f * f * 2.2).toFixed(3);
        const im = imgs[i]; if (im && !lite) im.style.transform = `translate3d(${(rel * -0.35).toFixed(1)}px,0,0)`;
      }
      const idx = ((Math.round(-s.current / STEP) % N) + N) % N;
      if (idx !== s.active) { s.active = idx; setActive(idx); }
    };
    s.target = 0;
    s.raf = requestAnimationFrame(tick);
    const onResize = () => { layout(); idle = 0; s.current += 0.001; };
    window.addEventListener('resize', onResize);
    // entrance
    if (!reduced) {
      cardRefs.current.forEach((el, i) => el?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: i * 50, easing: 'ease-out', fill: 'backwards' }));
      root?.querySelectorAll('.ob-intro, .ob-info, .ob-foot').forEach((el, i) =>
        el.animate([{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 250 + i * 100, easing: EASE_OUT_EXPO, fill: 'backwards' }));
    }
    return () => { cancelAnimationFrame(s.raf); window.removeEventListener('resize', onResize); };
  }, [N, STEP, layout, lite, reduced]);

  const wake = () => { st.current.current += 0.0001; };
  const snap = (r: number) => Math.round(r / STEP) * STEP;
  const go = (dir: number) => { st.current.target = snap(st.current.target) + dir * STEP; wake(); };
  const goToIndex = (i: number) => { const s = st.current; s.target = snap(s.target + wrap180(-(i * STEP) - s.target)); wake(); };

  /* ── Title swap animation ── */
  useEffect(() => {
    if (reduced || !titleRef.current) return;
    titleRef.current.querySelectorAll('h2, p').forEach((el, i) =>
      el.animate([{ opacity: 0, transform: 'translateY(100%)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: i * 50, easing: EASE_OUT_EXPO, fill: 'backwards' }));
  }, [active, reduced]);

  /* ── Mouse spins with momentum; touch keeps direct drag control ── */
  const actions = useRef({ open: (_i: number) => {}, close: (_s: boolean) => {}, go, goToIndex });
  actions.current = { open: openModal, close: closeModal, go, goToIndex };
  useEffect(() => {
    const scene = sceneRef.current; if (!scene) return;
    const s = st.current;
    let down = false, dragging = false, mouseDrag = false, sx = 0, startRot = 0, pid = -1;
    let samples: { x: number; t: number }[] = [];
    const DEG_PER_PX = () => STEP / Math.max(180, (ringRef.current?.offsetWidth || 240) * 0.9); // one card ≈ one card-width of drag
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('button') || s.paused) return;
      down = true; dragging = false; mouseDrag = e.pointerType === 'mouse'; sx = e.clientX; pid = e.pointerId;
      startRot = s.current; s.target = s.current;            // grab where it is right now (no jump)
      samples = [{ x: e.clientX, t: performance.now() }];
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== pid) return;
      const dx = e.clientX - sx;
      if (!dragging && Math.abs(dx) > 5) { dragging = true; s.draggingMouse = mouseDrag; scene.setPointerCapture(pid); scene.classList.add('is-drag'); }
      if (!dragging) return;
      s.target = startRot + dx * DEG_PER_PX();
      if (!mouseDrag) s.current = s.target;
      wake();
      const now = performance.now();
      samples.push({ x: e.clientX, t: now });
      while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== pid) return;
      down = false; s.draggingMouse = false; scene.classList.remove('is-drag');
      if (scene.hasPointerCapture(pid)) scene.releasePointerCapture(pid);
      if (!dragging) {                                        // tap
        const el = (e.target as HTMLElement).closest('.ob-card');
        const i = cardRefs.current.findIndex(x => x === el);
        if (i < 0) return;
        if (i === s.active) actions.current.open(i); else actions.current.goToIndex(i);
        return;
      }
      dragging = false;
      const first = samples[0], last = samples[samples.length - 1];
      const v = (last.x - first.x) / Math.max(16, last.t - first.t); // px/ms over last ~90ms
      const base = snap(s.target);
      if (mouseDrag && !reduced && e.type !== 'pointercancel') {
        // Project the last flick into a short free spin, then settle on a card.
        const glide = Math.max(-STEP * 3, Math.min(STEP * 3, v * 210 * DEG_PER_PX()));
        s.target = snap(s.target + glide);
      } else if (!reduced && Math.abs(v) > 0.35 && e.type !== 'pointercancel') {
        const dir = Math.sign(v * DEG_PER_PX());
        const fromStart = snap(startRot);
        s.target = Math.abs(base - fromStart) >= STEP ? base : fromStart + dir * STEP;
      } else s.target = base;
      wake();
    };
    let wheelLock = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); if (s.paused) return;
      const now = Date.now(); if (now - wheelLock < 220) return; wheelLock = now;
      actions.current.go((e.deltaY + e.deltaX) > 0 ? -1 : 1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (s.paused) { if (e.key === 'Escape') actions.current.close(false); return; }
      if (e.key === 'ArrowLeft') actions.current.go(1); if (e.key === 'ArrowRight') actions.current.go(-1);
      if (e.key === 'Enter') actions.current.open(s.active);
    };
    const noDrag = (e: Event) => e.preventDefault();
    scene.addEventListener('pointerdown', onDown);
    scene.addEventListener('pointermove', onMove);
    scene.addEventListener('pointerup', onUp);
    scene.addEventListener('pointercancel', onUp);
    scene.addEventListener('lostpointercapture', onUp as EventListener);
    scene.addEventListener('dragstart', noDrag);
    scene.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      scene.removeEventListener('pointerdown', onDown); scene.removeEventListener('pointermove', onMove);
      scene.removeEventListener('pointerup', onUp); scene.removeEventListener('pointercancel', onUp);
      scene.removeEventListener('lostpointercapture', onUp as EventListener); scene.removeEventListener('dragstart', noDrag);
      scene.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', onKey);
    };
  }, [STEP, reduced]); // rebind only when the number of cards or motion preference changes

  /* ── Modal open / close (FLIP image) ── */
  function openModal(i: number) {
    if (openIdx !== null || !cats[i]) return;
    st.current.paused = true;
    setTemp(new Set(picks[cats[i].id] || []));
    setOpenIdx(i);
  }
  useEffect(() => {
    if (openIdx === null) return;
    const card = cardRefs.current[openIdx], mImg = mImgRef.current, modal = modalRef.current, dim = dimRef.current, scene = sceneRef.current;
    if (!card || !mImg || !modal || !dim || !scene || reduced) return;
    const from = card.getBoundingClientRect(), to = mImg.getBoundingClientRect();
    const d = lite ? 0.7 : 1;
    dim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 * d, easing: 'ease-out', fill: 'both' });
    scene.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.92)', opacity: 0.45 }], { duration: 800 * d, easing: EASE_OUT_EXPO, fill: 'forwards' });
    modal.animate([{ opacity: 0, transform: 'translateY(40px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 900 * d, delay: 50, easing: EASE_OUT_EXPO, fill: 'both' });
    mImg.animate([
      { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})` },
      { transform: 'none' },
    ], { duration: 1100 * d, easing: 'cubic-bezier(0.87, 0, 0.13, 1)', fill: 'both' });
    const seq: [string, number][] = [['h3', 450], ['.ob-msub', 520], ['.ob-mdesc', 590], ['.ob-group', 650], ['.ob-mfoot', 820]];
    seq.forEach(([sel, delay]) => modal.querySelectorAll(sel).forEach((el, k) =>
      el.animate([{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { duration: 750 * d, delay: (delay + k * 60) * d, easing: EASE_OUT_EXPO, fill: 'both' })));
    modal.querySelector('.ob-close')?.animate([{ transform: 'scale(0) rotate(-90deg)' }, { transform: 'none' }], { duration: 600, delay: 700 * d, easing: EASE_OUT_EXPO, fill: 'both' });
  }, [openIdx, lite, reduced]);

  function closeModal(save: boolean) {
    if (openIdx === null) return;
    const i = openIdx, id = cats[i].id;
    if (save) {
      setPicks(p => { const next = { ...p, [id]: [...temp] }; if (!temp.size) delete next[id]; return next; });
    }
    const finish = () => {
      setOpenIdx(null); st.current.paused = false; wake();
      if (save && temp.size && !reduced) cardRefs.current[i]?.animate([{ filter: 'brightness(1.8)' }, { filter: 'brightness(1)' }], { duration: 900, easing: 'ease-out' });
    };
    const modal = modalRef.current, dim = dimRef.current, scene = sceneRef.current;
    if (reduced || !modal || !dim || !scene) { scene?.getAnimations().forEach(a => a.cancel()); finish(); return; }
    modal.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(30px) scale(.97)' }], { duration: 420, easing: 'cubic-bezier(.7,0,.84,0)', fill: 'forwards' });
    dim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, delay: 100, fill: 'forwards' });
    scene.getAnimations().forEach(a => a.cancel());
    scene.animate([{ transform: 'scale(.92)', opacity: 0.45 }, { transform: 'none', opacity: 1 }], { duration: 800, delay: 150, easing: EASE_OUT_EXPO, fill: 'backwards' });
    setTimeout(finish, 560);
  }

  const toggleChip = (id: string) => setTemp(t => { const n = new Set(t); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleGroup = (g: Group) => setTemp(t => { const n = new Set(t); const all = g.items.every(x => n.has(x.id)); g.items.forEach(x => all ? n.delete(x.id) : n.add(x.id)); return n; });
  const openCat = openIdx !== null ? cats[openIdx] : null;
  const openGroups = openCat ? groupsOf(openCat) : [];
  const allIds = openGroups.flatMap(g => g.items.map(x => x.id));
  const toggleAll = () => setTemp(t => t.size === allIds.length ? new Set() : new Set(allIds));

  const catCount = Object.values(picks).filter(v => v.length).length;
  const subCount = Object.values(picks).reduce((a, v) => a + v.length, 0);
  const allPicked = useMemo(() => {
    const names = new Map<string, string>();
    const walk = (n: CategoryNode) => { names.set(n.id, n.name); n.children.forEach(walk); };
    (tree.length ? tree : buildTree(seedCategories)).forEach(walk);
    return Object.entries(picks).flatMap(([cid, ids]) => ids.length ? ids.map(id => names.get(id) || id) : [names.get(cid) || cid]);
  }, [picks, tree]);

  function finishOnboarding(skip = false) {
    const flat = skip ? [] : Object.entries(picks).flatMap(([cid, ids]) => [cid, ...ids]);
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(skip ? {} : picks));
    localStorage.setItem(ONBOARDED_KEY, '1');
    if (skip || reduced) { onDone(flat); return; }
    setDone(true);
    requestAnimationFrame(() => {
      const d = doneRef.current; if (!d) return;
      d.animate([{ clipPath: 'circle(0% at 50% 100%)' }, { clipPath: 'circle(150% at 50% 100%)' }], { duration: 1100, easing: 'cubic-bezier(0.87, 0, 0.13, 1)', fill: 'both' });
      d.querySelector('.ob-okring')?.animate([{ transform: 'scale(0) rotate(-180deg)' }, { transform: 'none' }], { duration: 800, delay: 800, easing: EASE_OUT_EXPO, fill: 'both' });
      d.querySelectorAll('h2, p').forEach((el, k) => el.animate([{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 950 + k * 100, easing: EASE_OUT_EXPO, fill: 'both' }));
      d.querySelectorAll('.ob-tags span').forEach((el, k) => el.animate([{ opacity: 0, transform: 'translateY(14px) scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 1150 + k * 35, easing: EASE_OUT_EXPO, fill: 'both' }));
      setTimeout(() => {
        rootRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).addEventListener('finish', () => onDone(flat));
      }, 3000);
    });
  }

  const cur = cats[active];
  if (!cats.length) return null;

  return (
    <div ref={rootRef} className={`ob-root ${lite ? 'is-lite' : ''}`} dir="rtl" role="dialog" aria-modal="true" aria-label="اختيار الاهتمامات">
      <header className="ob-head">
        <div className="ob-logo">سوق<i /></div>
        <button className="ob-skip" onClick={() => finishOnboarding(true)}>تخطّي</button>
      </header>
      <div className="ob-intro"><h1>ما الذي يهمّك؟</h1><p>اسحب لتدوير الأقسام — اضغط على البطاقة لاختيار التفاصيل</p></div>

      <div ref={sceneRef} className="ob-scene">
        <div className="ob-glow" />
        <div ref={ringRef} className="ob-ring">
          {cats.map((c, i) => (
            <div key={c.id} ref={el => { cardRefs.current[i] = el; }} className={`ob-card ${picks[c.id]?.length ? 'is-sel' : ''}`}>
              <img src={localImages[c.id] || c.imageUrl} alt={c.name} draggable={false} loading={i < 3 ? 'eager' : 'lazy'} decoding="async" />
              <span className="ob-num">{pad(i + 1)}</span>
              <span className="ob-name">{c.name}</span>
              <span className="ob-badge">{picks[c.id]?.length || 0}</span>
              <div className="ob-shade" />
            </div>
          ))}
        </div>
        <div className="ob-arrows">
          <button onClick={() => go(-1)} aria-label="التالي"><ArrowRight size={18} /></button>
          <button onClick={() => go(1)} aria-label="السابق"><ArrowLeft size={18} /></button>
        </div>
      </div>

      <div className="ob-info">
        <div ref={titleRef} className="ob-txt" key={active}><h2>{cur?.name}</h2><p>{cur?.children.slice(0, 3).map(c => c.name).join(' · ') || ' '}</p></div>
        <div className="ob-count"><b>{pad(active + 1)}</b> / {pad(N)}</div>
      </div>
      <footer className="ob-foot">
        <div className="ob-picked">{catCount ? <>اخترت <b>{plural(catCount, 'قسماً واحداً', 'قسمين', 'أقسام', 'قسماً')}</b> — {plural(subCount, 'اهتماماً واحداً', 'اهتمامين', 'اهتمامات', 'اهتماماً')}</> : 'لم تختر أي قسم بعد'}</div>
        <button className={`ob-cta ${catCount ? 'on' : ''}`} onClick={() => finishOnboarding()}>متابعة <ArrowLeft size={18} /></button>
      </footer>

      {openCat && (
        <div className="ob-ov">
          <div ref={dimRef} className="ob-dim" onClick={() => closeModal(false)} />
          <div ref={modalRef} className="ob-modal">
            <button className="ob-close" onClick={() => closeModal(false)} aria-label="إغلاق"><X size={18} /></button>
            <div ref={mImgRef} className="ob-mimg"><img src={localImages[openCat.id] || openCat.imageUrl} alt="" /></div>
            <div className="ob-mbody">
              <h3>{openCat.name}</h3>
              <div className="ob-msub">{openGroups.length} أقسام · {allIds.length} فئة</div>
              <p className="ob-mdesc">{blurbs[openCat.id] || `اكتشف أفضل منتجات ${openCat.name} المختارة لك.`}</p>
              <div className="ob-groups">
                {openGroups.map(g => (
                  <div className="ob-group" key={g.title}>
                    <h4>{g.title}<button onClick={() => toggleGroup(g)}>{g.items.every(x => temp.has(x.id)) ? 'إلغاء' : 'الكل'}</button></h4>
                    <div className="ob-chips">
                      {g.items.map(x => (
                        <button key={x.id} className={`ob-chip ${temp.has(x.id) ? 'on' : ''}`} aria-pressed={temp.has(x.id)} onClick={e => {
                          toggleChip(x.id);
                          if (!reduced) (e.currentTarget as HTMLElement).animate([{ transform: 'scale(.96)' }, { transform: 'none' }], { duration: 180, easing: EASE_OUT_EXPO });
                        }}>{temp.has(x.id) && <span className="t" aria-hidden="true"><Check size={12} /></span>}{x.name}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="ob-mfoot">
                <div className="ob-mcount">محدد: <b>{temp.size}</b></div>
                <div className="ob-mbtns">
                  <button className="ob-ghost" onClick={toggleAll}>{temp.size === allIds.length && allIds.length ? 'إلغاء الكل' : 'تحديد الكل'}</button>
                  <button className="ob-save" onClick={() => closeModal(true)}>حفظ الاختيار ✓</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {done && (
        <div ref={doneRef} className="ob-done">
          <div>
            <div className="ob-okring"><Check size={36} /></div>
            <h2>تم تخصيص متجرك</h2>
            <p>سنعرض لك منتجات تناسب اهتماماتك</p>
            <div className="ob-tags">{allPicked.slice(0, 24).map(t => <span key={t}>{t}</span>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
