// ============================================================================
// ANNOUNCEMENTS & PROMOTIONS PAGE — Admin CRUD
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import {
  Plus, Pencil, Trash2, Loader2, Megaphone, Image as ImageIcon,
  Calendar, Users, Upload, X as XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Announcement {
  _id: string;
  title: string;
  message: string;
  type: 'announcement' | 'promotion';
  targetAudience: 'staff' | 'customer' | 'both';
  displayMode: 'popup' | 'banner';
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  startDate: string;
  endDate: string;
  priority: number;
  active: boolean;
  createdAt: string;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  title:          z.string().min(1, 'Title is required').max(100),
  message:        z.string().min(1, 'Message is required').max(1000),
  type:           z.enum(['announcement', 'promotion']),
  targetAudience: z.enum(['staff', 'customer', 'both']),
  displayMode:    z.enum(['popup', 'banner']),
  imageUrl:       z.string().optional(),        // stored server path or empty
  ctaLabel:       z.string().max(40).optional(),
  ctaUrl:         z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  startDate:      z.string().min(1, 'Start date required'),
  endDate:        z.string().min(1, 'End date required'),
  priority:       z.coerce.number().min(0).optional(),
}).refine((d) => new Date(d.endDate) > new Date(d.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});
type AnnouncementForm = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const toDateInput = (iso: string) => iso ? iso.slice(0, 10) : '';

const isLive = (a: Announcement) => {
  const now = new Date();
  return a.active && new Date(a.startDate) <= now && new Date(a.endDate) >= now;
};

// Resolve a stored imageUrl (may be a /uploads/ path or empty) to a displayable URL.
const SERVER_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1')
  .replace(/\/api\/v\d+\/?$/, '');

function resolveImageUrl(imageUrl: string | undefined): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${SERVER_ORIGIN}${imageUrl}`;
}

// ── Image Picker ──────────────────────────────────────────────────────────────

function ImagePicker({
  value,
  onChange,
}: {
  value: string;          // current stored imageUrl
  onChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview]         = useState<string>(resolveImageUrl(value));
  const [uploading, setUploading]     = useState(false);

  // Sync preview when saved value changes (e.g. on edit open)
  useEffect(() => {
    if (!pendingFile) setPreview(resolveImageUrl(value));
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setPendingFile(file);

    // Upload straight away so the parent form gets the path
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await apiClient.post('/announcements/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedPath: string = res.data.data.imageUrl;
      onChange(uploadedPath);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Image upload failed');
      setPreview(resolveImageUrl(value)); // revert preview
      setPendingFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPendingFile(null);
    setPreview('');
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview ? (
        <div className="relative rounded-lg overflow-hidden border bg-muted h-40">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          {!uploading && (
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                title="Change image"
              >
                <Upload className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                title="Remove image"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors gap-2 text-muted-foreground hover:text-foreground"
        >
          <ImageIcon className="h-8 w-8 opacity-40" />
          <span className="text-xs">Click to upload image</span>
          <span className="text-xs opacity-60">JPG, PNG, WebP, GIF · max 5 MB</span>
        </button>
      )}
    </div>
  );
}

// ── Form Dialog ───────────────────────────────────────────────────────────────

function AnnouncementFormDialog({
  open, onOpenChange, initial, onSave, title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Announcement;
  onSave: (values: AnnouncementForm) => Promise<void>;
  title: string;
}) {
  const form = useForm<AnnouncementForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:          initial?.title          ?? '',
      message:        initial?.message        ?? '',
      type:           initial?.type           ?? 'announcement',
      targetAudience: initial?.targetAudience ?? 'both',
      displayMode:    initial?.displayMode    ?? 'banner',
      imageUrl:       initial?.imageUrl       ?? '',
      ctaLabel:       initial?.ctaLabel       ?? '',
      ctaUrl:         initial?.ctaUrl         ?? '',
      startDate:      initial ? toDateInput(initial.startDate) : toDateInput(new Date().toISOString()),
      endDate:        initial ? toDateInput(initial.endDate)   : '',
      priority:       initial?.priority       ?? 0,
    },
  });

  const watchType = form.watch('type');
  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (values: AnnouncementForm) => {
    await onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="e.g. New Year Promotion!" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="message" render={({ field }) => (
              <FormItem>
                <FormLabel>Message <span className="text-destructive">*</span></FormLabel>
                <FormControl><Textarea rows={3} placeholder="Detailed message shown to users..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="displayMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="popup">Popup</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="targetAudience" render={({ field }) => (
              <FormItem>
                <FormLabel>Target Audience</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="both">Everyone (Staff + Customers)</SelectItem>
                    <SelectItem value="customer">Customers Only</SelectItem>
                    <SelectItem value="staff">Staff Only</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Image upload */}
            <FormField control={form.control} name="imageUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Image <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <ImagePicker value={field.value ?? ''} onChange={field.onChange} />
                </FormControl>
                <FormDescription className="text-xs">
                  Shown as banner/popup image. Upload from your device.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* CTA — for promotions */}
            {watchType === 'promotion' && (
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="ctaLabel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTA Label</FormLabel>
                    <FormControl><Input placeholder="Shop Now" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ctaUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTA URL</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl><Input type="number" min={0} placeholder="0" {...field} /></FormControl>
                <FormDescription className="text-xs">Higher priority shown first. Default 0.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const [items, setItems]           = useState<Announcement[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [filterTab, setFilterTab]   = useState<'all' | 'active' | 'inactive'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};
      if (filterTab !== 'all') params.active = filterTab === 'active' ? 'true' : 'false';
      const res = await apiClient.get('/announcements', { params });
      setItems(res.data.data?.announcements || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterTab]);

  const handleCreate = async (values: AnnouncementForm) => {
    try {
      await apiClient.post('/announcements', values);
      toast.success('Announcement created');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create');
      throw err;
    }
  };

  const handleEdit = async (values: AnnouncementForm) => {
    if (!editTarget) return;
    try {
      await apiClient.put(`/announcements/${editTarget._id}`, values);
      toast.success('Announcement updated');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update');
      throw err;
    }
  };

  const handleToggleActive = async (item: Announcement) => {
    try {
      await apiClient.put(`/announcements/${item._id}`, { active: !item.active });
      toast.success(`${item.title} ${item.active ? 'deactivated' : 'activated'}`);
      await load();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/announcements/${deleteTarget._id}`);
      toast.success(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const audienceLabel = (a: string) => ({ staff: 'Staff', customer: 'Customers', both: 'Everyone' }[a] || a);
  const typeColor     = (t: string) => t === 'promotion'
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
  const modeColor = (m: string) => m === 'popup'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Announcements & Promotions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage targeted messages for staff and customers</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Announcement
        </Button>
      </div>

      {/* Filter tabs */}
      <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as typeof filterTab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-44" /></Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Megaphone className="h-12 w-12 opacity-20" />
          <p className="text-sm">No announcements found.</p>
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create one
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => {
            const live = isLive(item);
            const imgSrc = resolveImageUrl(item.imageUrl);
            return (
              <Card key={item._id} className={!item.active ? 'opacity-60' : ''}>
                <CardContent className="p-4 space-y-3">
                  {/* Image preview */}
                  {imgSrc && (
                    <div className="rounded-lg overflow-hidden h-32 bg-muted">
                      <img
                        src={imgSrc}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${typeColor(item.type)}`}>
                          {item.type === 'promotion' ? <ImageIcon className="h-3 w-3" /> : <Megaphone className="h-3 w-3" />}
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${modeColor(item.displayMode)}`}>
                          {item.displayMode}
                        </span>
                        {live && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Live
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm leading-snug">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {audienceLabel(item.targetAudience)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(item.startDate), 'MMM d')} – {format(parseISO(item.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={item.active} onCheckedChange={() => handleToggleActive(item)} />
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditTarget(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <AnnouncementFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Announcement"
        onSave={handleCreate}
      />

      {/* Edit Dialog */}
      {editTarget && (
        <AnnouncementFormDialog
          key={editTarget._id}
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
          initial={editTarget}
          title={`Edit "${editTarget.title}"`}
          onSave={handleEdit}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Announcement"
        description={<>Permanently delete <strong>{deleteTarget?.title}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        destructive
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
