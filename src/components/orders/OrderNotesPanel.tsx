// ============================================================================
// ORDER NOTES PANEL — internal staff handover log for one order.
//
// Separate from, and never shown alongside, anything a customer can see: this
// only ever talks to /orders/:id/notes, a staff-only route the customer app
// never calls. A customer's own instruction (left at checkout) lives on the
// order itself; a customer-staff conversation is the existing Chat feature.
// Neither is this.
//
// Every note is its own row, kept forever (soft-deleted at most) — there is
// no single "the note" field here for one staff member to overwrite another's.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import {
  MessageSquarePlus, Pencil, Trash2, Star, Loader2, StickyNote, Check, X, Shirt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';

// Roles that may open this panel and leave a note at all. Matches the
// server's authorize() list on /orders/:id/notes — kept here only so the
// panel can render nothing (rather than an empty state that invites staff
// who can't use it to wonder why) for a role that can't reach the route.
const NOTE_ROLES = ['staff', 'admin', 'manager', 'receptionist', 'developer'];
const CAN_MANAGE_OTHERS = ['admin', 'manager', 'developer'];

const NOTE_TYPE_LABELS: Record<string, string> = {
  general: 'General',
  customer_instruction: 'Customer Instruction',
  laundry_issue: 'Laundry Issue',
  processing_update: 'Processing Update',
  collection_note: 'Collection Note',
  quality_issue: 'Quality Issue',
};

function authorLabel(role?: string, staffRole?: string): string {
  switch (role) {
    case 'admin': return 'Admin';
    case 'developer': return 'Admin';
    case 'manager': return 'Branch Manager';
    case 'receptionist': return 'Receptionist';
    case 'staff': {
      const sub: Record<string, string> = { washer: 'Washer', ironer: 'Ironer', delivery: 'Delivery', receptionist: 'Receptionist' };
      return staffRole && sub[staffRole] ? `Laundry Staff — ${sub[staffRole]}` : 'Laundry Staff';
    }
    default: return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff';
  }
}

function dayHeading(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'd MMM yyyy');
}

const errMsg = (err: any, fallback: string) => {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : (m || fallback);
};

interface OrderItemOption { _id: string; itemType?: string; serviceName?: string; quantity?: number }

export function OrderNotesPanel({ orderId, items }: { orderId: string; items?: OrderItemOption[] }) {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role || '').toLowerCase();
  const canUse = NOTE_ROLES.includes(role);
  const canManageOthers = CAN_MANAGE_OTHERS.includes(role);

  const [notes, setNotes] = useState<any[] | null>(null);
  const [important, setImportant] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const [comment, setComment] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [markImportant, setMarkImportant] = useState(false);
  const [itemId, setItemId] = useState<string>('');
  const [posting, setPosting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!canUse) return;
    try {
      const res = await apiClient.get(`/orders/${orderId}/notes`);
      setNotes(res.data?.data?.notes ?? []);
      setImportant(res.data?.data?.important ?? 0);
      setLoadError(false);
    } catch {
      setNotes([]);
      setLoadError(true);
    }
  }, [orderId, canUse]);

  useEffect(() => { load(); }, [load]);

  // Group newest-first notes into day sections, preserving order within a day.
  const groups = useMemo(() => {
    const out: { label: string; notes: any[] }[] = [];
    for (const n of notes || []) {
      const label = dayHeading(new Date(n.createdAt));
      const last = out[out.length - 1];
      if (last && last.label === label) last.notes.push(n);
      else out.push({ label, notes: [n] });
    }
    return out;
  }, [notes]);

  if (!canUse) return null;

  const itemLabel = (id?: string) => {
    if (!id) return null;
    const it = (items || []).find((i) => i._id === id);
    return it ? `${it.itemType || 'Item'}${it.quantity ? ` × ${it.quantity}` : ''}${it.serviceName ? ` — ${it.serviceName}` : ''}` : null;
  };

  const handlePost = async () => {
    const text = comment.trim();
    if (!text) return;
    setPosting(true);
    try {
      const res = await apiClient.post(`/orders/${orderId}/notes`, {
        comment: text,
        noteType,
        isImportant: markImportant,
        itemId: itemId || undefined,
      });
      setNotes((prev) => [res.data.data.note, ...(prev || [])]);
      setImportant((n) => n + (markImportant ? 1 : 0));
      setComment(''); setNoteType('general'); setMarkImportant(false); setItemId('');
      toast.success('Note added');
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to add note'));
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (note: any) => { setEditingId(note._id); setEditText(note.comment); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async (note: any) => {
    const text = editText.trim();
    if (!text) { toast.error('Note cannot be empty'); return; }
    setEditBusy(true);
    try {
      const res = await apiClient.patch(`/orders/${orderId}/notes/${note._id}`, { comment: text });
      setNotes((prev) => (prev || []).map((n) => (n._id === note._id ? res.data.data.note : n)));
      cancelEdit();
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to update note'));
    } finally {
      setEditBusy(false);
    }
  };

  const toggleImportant = async (note: any) => {
    try {
      const res = await apiClient.patch(`/orders/${orderId}/notes/${note._id}`, { isImportant: !note.isImportant });
      setNotes((prev) => (prev || []).map((n) => (n._id === note._id ? res.data.data.note : n)));
      setImportant((n) => n + (res.data.data.note.isImportant ? 1 : -1));
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to update note'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/orders/${orderId}/notes/${deleteTarget._id}`);
      setNotes((prev) => (prev || []).filter((n) => n._id !== deleteTarget._id));
      if (deleteTarget.isImportant) setImportant((n) => Math.max(0, n - 1));
      toast.success('Note removed');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to remove note'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <StickyNote className="h-4 w-4" />
          Internal Staff Notes
          {notes && <span className="text-muted-foreground font-normal">— {notes.length}</span>}
        </h3>
        {important > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Star className="h-3.5 w-3.5 fill-current" /> {important} important
          </span>
        )}
      </div>

      {/* Compose — always available, never behind an "edit order" mode */}
      <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
        <Textarea
          placeholder="Leave a note for the next staff member…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={2}
          className="bg-background"
        />
        <div className="flex flex-wrap items-center gap-2">
          {items && items.length > 0 && (
            <Select value={itemId || '__order'} onValueChange={(v) => setItemId(v === '__order' ? '' : v)}>
              <SelectTrigger className="h-8 w-auto text-xs gap-1.5">
                <Shirt className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Whole order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__order">Whole order</SelectItem>
                {items.map((it) => (
                  <SelectItem key={it._id} value={it._id}>{itemLabel(it._id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger className="h-8 w-auto text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(NOTE_TYPE_LABELS).map(([v, label]) => (
                <SelectItem key={v} value={v}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none ml-auto">
            <Checkbox checked={markImportant} onCheckedChange={(v) => setMarkImportant(!!v)} className="h-3.5 w-3.5" />
            Mark important
          </label>
          <Button size="sm" className="h-8" onClick={handlePost} disabled={posting || !comment.trim()}>
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />}
            Post Note
          </Button>
        </div>
      </div>

      {/* History */}
      {notes === null ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : loadError ? (
        <p className="text-sm text-destructive">Couldn't load notes. <button className="underline" onClick={load}>Try again</button></p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No notes yet — leave one for the next person handling this order.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.label} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
              <div className="space-y-2">
                {g.notes.map((note) => {
                  const mine = note.staffId?._id === user?.id;
                  const canEdit = mine || canManageOthers;
                  const isEditing = editingId === note._id;
                  return (
                    <div
                      key={note._id}
                      className={`rounded-lg border p-3 text-sm ${note.isImportant ? 'border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <span className="font-medium">{note.staffId?.name || 'Staff'}</span>
                          <span className="text-muted-foreground"> — {authorLabel(note.authorRole, note.authorStaffRole)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{format(new Date(note.createdAt), 'h:mm a')}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        {note.isImportant && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-400">
                            <Star className="h-3 w-3 fill-current" /> Important
                          </span>
                        )}
                        {note.noteType && note.noteType !== 'general' && (
                          <span className="text-[11px] rounded border px-1.5 py-0.5 text-muted-foreground">{NOTE_TYPE_LABELS[note.noteType]}</span>
                        )}
                        {itemLabel(note.itemId) && (
                          <span className="inline-flex items-center gap-1 text-[11px] rounded border px-1.5 py-0.5 text-muted-foreground">
                            <Shirt className="h-3 w-3" /> {itemLabel(note.itemId)}
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} maxLength={2000} className="text-sm" />
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(note)} disabled={editBusy}>
                              {editBusy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />} Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEdit} disabled={editBusy}>
                              <X className="h-3 w-3 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap break-words">{note.comment}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            {note.edited && <span className="text-[11px] text-muted-foreground italic">Edited</span>}
                            <div className="flex items-center gap-0.5 ml-auto">
                              <button
                                className="text-[11px] text-muted-foreground hover:text-amber-700 dark:hover:text-amber-400 px-1"
                                onClick={() => toggleImportant(note)}
                                title={note.isImportant ? 'Unmark important' : 'Mark important'}
                              >
                                <Star className={`h-3.5 w-3.5 ${note.isImportant ? 'fill-current text-amber-600' : ''}`} />
                              </button>
                              {canEdit && (
                                <button className="text-muted-foreground hover:text-foreground p-1" onClick={() => startEdit(note)} title="Edit note">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {canManageOthers && (
                                <button className="text-muted-foreground hover:text-destructive p-1" onClick={() => setDeleteTarget(note)} title="Remove note">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove note"
        description="This note will be removed from the order's history for other staff. It stays on record for audit purposes and cannot be recovered by staff."
        confirmLabel="Remove"
        destructive
        isLoading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
