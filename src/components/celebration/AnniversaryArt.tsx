// Same artwork as the customer app (relux-shine/src/components/celebration).
// The apps are separate repos, so it is copied verbatim — change both together.
// Anniversary artwork, drawn as inline SVG: sharp at any size, a few KB, no
// image requests, and nothing to download before the dashboard paints.
// All decorative — hidden from screen readers.

import { useId } from 'react';

/** Gold 3D "1st" with an arched ANNIVERSARY ribbon. */
export function GoldEmblem({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const g = (n: string) => `${id}-${n}`;
  return (
    <svg viewBox="0 0 340 300" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={g('glow')} cx="50%" cy="45%" r="50%">
          <stop offset="0" stopColor="#fff6cc" stopOpacity=".9" />
          <stop offset=".45" stopColor="#ffd75e" stopOpacity=".35" />
          <stop offset="1" stopColor="#ffd75e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g('face')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff7c2" />
          <stop offset=".28" stopColor="#ffd34d" />
          <stop offset=".62" stopColor="#f2a91c" />
          <stop offset="1" stopColor="#b8740b" />
        </linearGradient>
        <linearGradient id={g('side')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a8650a" />
          <stop offset="1" stopColor="#6e3f05" />
        </linearGradient>
        <linearGradient id={g('rib')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset=".5" stopColor="#f5b82e" />
          <stop offset="1" stopColor="#c47f0e" />
        </linearGradient>
        <linearGradient id={g('ribDark')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c98a14" />
          <stop offset="1" stopColor="#8a5508" />
        </linearGradient>
        <path id={g('arc')} d="M48 222 Q170 168 292 222" />
      </defs>

      <ellipse cx="170" cy="140" rx="165" ry="140" fill={`url(#${g('glow')})`} className="relux-glow" />

      {/* the "1": extruded back face, then the bevelled front */}
      <g transform="translate(9 10)">
        <path d="M120 22h62v162h28v34H96v-34h28V82l-26 14-14-30z" fill={`url(#${g('side')})`} />
      </g>
      <path d="M120 22h62v162h28v34H96v-34h28V82l-26 14-14-30z" fill={`url(#${g('face')})`} stroke="#fff1a8" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M128 30h44v6h-44z" fill="#fffbe0" opacity=".85" />
      <path d="M176 32v150" stroke="#fff7cc" strokeWidth="4" strokeLinecap="round" opacity=".55" />

      {/* "st" */}
      <g fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif" fontWeight="900" fontSize="64" fontStyle="italic">
        <text x="200" y="104" fill="#7a4606">st</text>
        <text x="194" y="98" fill={`url(#${g('face')})`} stroke="#fff1a8" strokeWidth="1.5">st</text>
      </g>

      {/* ribbon: tails, then the arched band with its lettering */}
      <path d="M22 236l40-28 6 46-36 6 10-12z" fill={`url(#${g('ribDark')})`} />
      <path d="M318 236l-40-28-6 46 36 6-10-12z" fill={`url(#${g('ribDark')})`} />
      <path d="M40 204 Q170 148 300 204 L292 250 Q170 196 48 250z" fill={`url(#${g('rib')})`} stroke="#fff0a0" strokeWidth="2" />
      <path d="M44 214 Q170 160 296 214" stroke="#fff6c8" strokeWidth="2" fill="none" opacity=".7" />
      <text fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif" fontWeight="900" fontSize="27" letterSpacing="1.5" fill="#3b2405">
        <textPath href={`#${g('arc')}`} startOffset="50%" textAnchor="middle">ANNIVERSARY</textPath>
      </text>
    </svg>
  );
}

/** Glossy party balloon. */
export function Balloon({ tone = 'blue', className }: { tone?: 'blue' | 'gold'; className?: string }) {
  const id = useId().replace(/:/g, '');
  const [a, b, c] = tone === 'gold' ? ['#fff3b3', '#f5b82e', '#b9780c'] : ['#9cc7ff', '#1d6cf2', '#0b2f8a'];
  return (
    <svg viewBox="0 0 80 150" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-b`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={a} />
          <stop offset=".55" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </radialGradient>
      </defs>
      <path d="M40 98 C38 112 46 122 40 136 C36 144 42 148 40 150" stroke="#e8eef8" strokeOpacity=".7" strokeWidth="1.2" fill="none" />
      <ellipse cx="40" cy="48" rx="34" ry="44" fill={`url(#${id}-b)`} />
      <path d="M35 91 L45 91 L40 99 Z" fill={c} />
      <ellipse cx="27" cy="30" rx="8" ry="13" fill="#fff" opacity=".45" transform="rotate(-20 27 30)" />
    </svg>
  );
}

/** Four-point twinkle. */
export function Sparkle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true">
      <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" fill="currentColor" />
    </svg>
  );
}

// Fixed layout so confetti looks the same on every render (no random churn).
const PIECES = [
  [4, 0, 7, '#f5b82e', 'r'], [11, 2.4, 9, '#ffffff', 's'], [18, 1.1, 8, '#12c8e8', 'r'], [26, 3.6, 10, '#f5b82e', 's'],
  [33, 0.6, 7.5, '#1d6cf2', 'r'], [41, 2.9, 9.5, '#ffffff', 'r'], [49, 1.7, 8.5, '#f5b82e', 's'], [57, 4.2, 7, '#12c8e8', 'r'],
  [64, 0.3, 9, '#f5b82e', 'r'], [72, 2.2, 8, '#ffffff', 's'], [79, 3.3, 10, '#f5b82e', 'r'], [86, 1.4, 7.5, '#12c8e8', 's'],
  [93, 2.7, 9, '#f5b82e', 'r'], [97, 0.9, 8, '#ffffff', 'r'],
] as const;

/** Light CSS confetti (transform/opacity only — GPU-cheap). */
export function Confetti() {
  return (
    <div className="relux-confetti pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {PIECES.map(([left, delay, dur, color, shape], i) => (
        <span
          key={i}
          style={{
            left: `${left}%`,
            background: color,
            animationDelay: `${delay}s`,
            animationDuration: `${dur}s`,
            width: shape === 's' ? 6 : 5,
            height: shape === 's' ? 6 : 11,
            borderRadius: shape === 's' ? 9999 : 2,
          }}
        />
      ))}
    </div>
  );
}
