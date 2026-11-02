// ============================================================================
// ORDER TRANSFER — change the phone on an order; if it belongs to another
// customer account, move the order there once that customer gives the code sent
// to their account. Shown only with EDIT_ORDER; the backend enforces it anyway.
// Never says "transferred" until the server has actually moved the order.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHasPermission } from '@/stores/useAuthStore';
import { Permission } from '@/types';
import { toast } from '@/lib/toast';

interface PendingTransfer { status: 'PENDING_VERIFICATION' | 'PENDING_ACCOUNT'; toPhone: string; expiresAt: string | null }
interface Result { outcome: string; message: string; account?: { name: string; phone: string; email: string }; sentTo?: string }

const errorText = (e: any) => e?.response?.data?.message || 'That did not work. Please try again.';

export function OrderTransferPanel({ orderId, onChanged }: { orderId: string; onChanged: () => void }) {
  const canEdit = useHasPermission(Permission.EDIT_ORDER);
  const [pending, setPending] = useState<PendingTransfer | null>(null);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiClient.get(`/orders/${orderId}/transfer`);
      setPending(r.data?.data?.transfer ?? null);
    } catch { setPending(null); }
  }, [orderId]);

  useEffect(() => { if (canEdit) load(); }, [canEdit, load]);

  if (!canEdit) return null;

  const start = async (number: string) => {
    setBusy(true);
    try {
      const r = await apiClient.post(`/orders/${orderId}/transfer`, { phone: number });
      setResult(r.data.data);
      setPhone(number);
      setCode('');
      if (['contact_updated', 'pending_account'].includes(r.data.data.outcome)) onChanged();
      await load();
    } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const r = await apiClient.post(`/orders/${orderId}/transfer/verify`, { code });
      toast.success(r.data.data.message);
      setResult(null); setOpen(false); setCode(''); setPhone('');
      await load();
      onChanged();
    } catch (e) {
      toast.error(errorText(e));
      await load();
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await apiClient.delete(`/orders/${orderId}/transfer`);
      toast.success('Transfer cancelled. The order stays where it is.');
      setResult(null); setCode('');
      await load();
    } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };

  if (!pending && !open) {
    return (
      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setOpen(true); setResult(null); }}>
        <ArrowRightLeft className="mr-2 h-3.5 w-3.5" /> Change phone number
      </Button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border p-3 text-sm">
      {pending?.status === 'PENDING_VERIFICATION' && (
        <>
          <p className="font-medium">Transfer pending — not moved yet</p>
          <p className="text-muted-foreground">
            {result?.message ?? `Waiting for the customer to verify ${pending.toPhone}.`}
          </p>
          {result?.account && (
            <p className="text-muted-foreground">
              Account: <strong>{result.account.name}</strong> · {result.account.phone}
              <br />Code sent to {result.sentTo}
            </p>
          )}
          <Input inputMode="numeric" maxLength={6} placeholder="6-digit code from the customer" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="Verification code" />
          {/* After a reload the full number isn't kept client-side: resending needs it re-entered */}
          {!result && (
            <Input placeholder="Phone number (to resend the code)" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone number" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || code.length !== 6} onClick={verify}>Verify and transfer</Button>
            <Button size="sm" variant="outline" disabled={busy || !phone} onClick={() => start(phone)}>Resend code</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={cancel}>Cancel</Button>
          </div>
        </>
      )}

      {pending?.status === 'PENDING_ACCOUNT' && (
        <>
          <p className="font-medium">Transfer pending — no account yet</p>
          <p className="text-muted-foreground">
            No registered account was found for {pending.toPhone}. Once the customer has registered, enter the number again to send them a code.
          </p>
          <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone number" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !phone.trim()} onClick={() => start(phone.trim())}>Check again</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={cancel}>Cancel</Button>
          </div>
        </>
      )}

      {!pending && (
        <>
          <Input placeholder="New phone number" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="New phone number" />
          {result && <p className="text-muted-foreground">{result.message}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !phone.trim()} onClick={() => start(phone.trim())}>Continue</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setOpen(false); setResult(null); }}>Close</Button>
          </div>
        </>
      )}
    </div>
  );
}
