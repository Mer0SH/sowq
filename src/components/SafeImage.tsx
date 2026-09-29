import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

export default function SafeImage({ src, alt, className = '', fallbackClassName = '', eager = false }: {
  src?: string | null; alt: string; className?: string; fallbackClassName?: string; eager?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return src && !broken
    ? <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setBroken(true)}
        /* Product grids are long: decoding off-screen images eagerly was the
           main source of jank while scrolling the catalogue. */
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    : <div className={`flex flex-col items-center justify-center gap-2 bg-surface text-muted text-xs ${fallbackClassName}`} role="img" aria-label={`${alt}: لا توجد صورة`}><ImageOff size={25} /><span>لا توجد صورة</span></div>;
}
