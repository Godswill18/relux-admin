// ─── "Relux Is One!" anniversary campaign — staff side ──────────────────────
// The SAME global switch the customer app reads: one CampaignSetting, owned by
// the Superadmin (Settings → Campaigns). Staff only see it. Read once for the
// whole app, then follow the server's existing `campaign:updated` broadcast;
// re-read on reconnect. Fails closed (no celebration) if unreachable.

import { useEffect } from 'react';
import { create } from 'zustand';
import apiClient from '@/lib/api/client';
import { socketClient } from '@/lib/socket/client';
import { useAuthStore } from '@/stores/useAuthStore';

interface CampaignState {
  active: boolean;
  fetch: () => Promise<void>;
  set: (active: boolean) => void;
}

let inflight: Promise<void> | null = null;

export const useCampaignStore = create<CampaignState>((set) => ({
  active: false,
  fetch: () => {
    if (!inflight) {
      inflight = apiClient.get('/campaigns/anniversary')
        .then((r) => set({ active: !!r.data?.data?.active }))
        .catch(() => { /* keep the last known state */ })
        .finally(() => { inflight = null; });
    }
    return inflight;
  },
  set: (active) => set({ active }),
}));

export function useAnniversaryCampaign(): boolean {
  const active = useCampaignStore((s) => s.active);

  useEffect(() => {
    const { fetch, set } = useCampaignStore.getState();
    fetch();
    const onUpdate = (p: { key?: string; active?: boolean }) => { if (p?.key === 'anniversary') set(!!p.active); };
    const onConnect = () => { fetch(); };
    let attached: ReturnType<typeof socketClient.getSocket> = null;
    // Reuse the shared socket; after a page reload nothing else may have
    // opened it yet, so open it here (same as usePaymentSocket).
    const attach = () => {
      if (attached) return true;
      const token = useAuthStore.getState().token;
      const s = socketClient.getSocket() ?? (token ? socketClient.connect(token) : null);
      if (!s) return false;
      s.on('campaign:updated', onUpdate);
      s.on('connect', onConnect);
      attached = s;
      return true;
    };
    const timer = attach() ? null : setInterval(() => { if (attach() && timer) clearInterval(timer); }, 1000);
    return () => {
      if (timer) clearInterval(timer);
      attached?.off('campaign:updated', onUpdate);
      attached?.off('connect', onConnect);
    };
  }, []);

  return active;
}
