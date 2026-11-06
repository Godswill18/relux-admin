// ============================================================================
// ANNIVERSARY CELEBRATION BANNER — staff dashboards (admin, staff, delivery)
// Same identity as the customer banner, sized for an operational screen: one
// compact strip above the dashboard heading. Shown only while the Superadmin
// has the global campaign on; nobody here can change it.
// ============================================================================

import { useAnniversaryCampaign } from '@/lib/campaign';
import { Balloon, Confetti, GoldEmblem, Sparkle } from './AnniversaryArt';

export function AnniversaryCelebrationBanner() {
  const active = useAnniversaryCampaign();
  if (!active) return null;

  return (
    <section
      aria-label="Relux is one year old"
      className="relux-rise relative isolate overflow-hidden rounded-2xl bg-[radial-gradient(120%_160%_at_80%_30%,#3d8bff_0%,#1769f5_40%,#0b3fb8_75%,#082a7a_100%)] text-white shadow-lg shadow-blue-950/30"
    >
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
      <Confetti />

      <div className="relative flex items-center gap-4 px-5 py-4 sm:px-7 md:py-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200">One Team. One Vision. One Relux.</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Relux is One!</h2>
          <p className="mt-1 max-w-xl text-sm text-white/90">
            One year of excellence, teamwork, fresh clothes and happy customers.
          </p>
          <p className="relux-ribbon mt-3 inline-block -rotate-1 px-4 py-1 text-xs font-bold italic text-[#3b2405] sm:text-sm">
            Thank you for being part of our journey.
          </p>
        </div>

        <div className="relative h-24 w-28 shrink-0 sm:h-32 sm:w-40 md:h-36 md:w-52">
          <Balloon tone="blue" className="relux-float absolute -left-3 top-2 hidden h-16 w-8 sm:block md:h-20 md:w-10" />
          <Balloon tone="gold" className="relux-float absolute -right-2 -top-1 h-16 w-8 [animation-delay:-2s] md:h-24 md:w-12" />
          <GoldEmblem className="relative h-full w-full drop-shadow-[0_10px_20px_rgba(4,17,38,.45)]" />
          <Sparkle className="relux-twinkle absolute left-[12%] top-[8%] h-3 w-3 text-amber-200" />
          <Sparkle className="relux-twinkle absolute bottom-[12%] right-[10%] h-3 w-3 text-white [animation-delay:-1.4s]" />
        </div>
      </div>
    </section>
  );
}
