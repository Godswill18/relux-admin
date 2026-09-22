// ============================================================================
// WALK-IN CUSTOMER MATCH — shared by the admin and staff order screens
// ============================================================================
//
// While staff type a phone or email, look the customer up so the counter can
// see "Existing customer found" before saving. The backend makes the actual
// decision when the order is saved (matching on phone/email only, never name);
// this is informational, plus the picker used when phone and email belong to
// two different customers.

import { useEffect, useState } from 'react';
import { UserCheck, UserPlus, AlertTriangle } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { PortalStatusBadge } from '@/components/shared/StatusBadges';

export interface CustomerLookupResult {
  customerRecordId: string;
  name: string;
  phone: string | null;
  email: string | null;
  portalStatus: string;
  customerStatus: string;
  orderCount: number;
}

export interface ConflictCandidate {
  customerRecordId: string;
  name: string;
  phone: string | null;
  email: string | null;
}

// Last 10 digits — enough to treat 080…, +23480… and 23480… as the same number.
const phoneKey = (p?: string | null) => (p || '').replace(/\D/g, '').slice(-10);
const emailKey = (e?: string | null) => (e || '').trim().toLowerCase();

/** Exact phone/email match for what staff have typed, looked up as they type. */
export function useWalkInCustomerMatch(phone?: string, email?: string) {
  const [match, setMatch] = useState<CustomerLookupResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const p = phoneKey(phone);
    const e = emailKey(email);
    const query = p.length === 10 ? p : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '');
    if (!query) { setMatch(null); return; }

    let cancelled = false;
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await apiClient.get('/customers/lookup', { params: { q: query } });
        const rows: CustomerLookupResult[] = res.data?.data?.customers || [];
        const exact = rows.find((r) =>
          (p.length === 10 && phoneKey(r.phone) === p) || (e && emailKey(r.email) === e)
        );
        if (!cancelled) setMatch(exact || null);
      } catch {
        if (!cancelled) setMatch(null); // informational only — never blocks the form
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [phone, email]);

  return { match, checking };
}

/** "Existing customer found" / "New customer" notice under the contact fields. */
export function CustomerMatchNotice({
  match, checking, hasContact,
}: { match: CustomerLookupResult | null; checking: boolean; hasContact: boolean }) {
  if (!hasContact || checking) return null;
  if (match) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-2.5 text-sm dark:border-green-900 dark:bg-green-950/30">
        <UserCheck className="h-4 w-4 mt-0.5 text-green-700 dark:text-green-400 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-green-900 dark:text-green-300">
            Existing customer found: {match.name}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{match.orderCount} previous order{match.orderCount === 1 ? '' : 's'}</span>
            <PortalStatusBadge status={match.portalStatus} />
            {match.customerStatus === 'DEACTIVATED' && (
              <span className="text-destructive font-medium">Account deactivated</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">This order will be added to their record.</p>
        </div>
      </div>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <UserPlus className="h-3.5 w-3.5" />
      New customer — a customer record will be created with this order.
    </p>
  );
}

/** Shown when the phone belongs to one customer and the email to another. */
export function IdentityConflictPicker({
  candidates, onPick, onCancel,
}: { candidates: ConflictCandidate[]; onPick: (id: string) => void; onCancel: () => void }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2 dark:border-amber-800 dark:bg-amber-950/30">
      <p className="flex items-center gap-1.5 text-sm font-medium text-amber-900 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4" />
        This phone and email belong to two different customers
      </p>
      <p className="text-xs text-muted-foreground">
        Check with the customer which record is theirs. The order is only saved once you choose.
      </p>
      <div className="space-y-1.5">
        {candidates.map((c) => (
          <div key={c.customerRecordId} className="flex items-center justify-between gap-2 rounded border bg-background px-2.5 py-1.5">
            <div className="min-w-0 text-sm">
              <p className="font-medium truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details'}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => onPick(c.customerRecordId)}>
              Use this customer
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

/** Pulls the 409 IDENTITY_CONFLICT candidates out of an API error, if that's what it is. */
export function getIdentityConflict(err: any): ConflictCandidate[] | null {
  const body = err?.response?.data;
  return err?.response?.status === 409 && body?.error?.code === 'IDENTITY_CONFLICT'
    ? (body.data?.candidates || [])
    : null;
}

/** Toast text after a walk-in order is saved, from the API's customerRecord info. */
export function customerOutcomeMessage(customerRecord?: { created?: boolean; selected?: boolean } | null) {
  if (!customerRecord) return 'Order created successfully';
  return customerRecord.created
    ? 'Order created — new customer record added'
    : 'Order created and added to the existing customer';
}
