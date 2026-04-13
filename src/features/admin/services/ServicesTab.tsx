// ============================================================================
// SERVICES TAB
// Desktop: dnd-kit (PointerSensor only — mouse drag with DragOverlay)
// Mobile:  fully custom touch implementation
//          - position:fixed clone follows finger at captured offset
//          - dashed placeholder shows landing position
//          - no DragOverlay, no coordinate jump
// ============================================================================

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverlay, DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import {
  MoreHorizontal, Edit, Trash, Plus, Search, Layers, GripVertical,
} from 'lucide-react';
import { AddServiceModal }     from './AddServiceModal';
import { EditServiceModal }    from './EditServiceModal';
import { DeleteConfirmModal }  from './DeleteConfirmModal';
import { Button }              from '@/components/ui/button';
import { Input }               from '@/components/ui/input';
import { Badge }               from '@/components/ui/badge';
import { Switch }              from '@/components/ui/switch';
import { Card, CardContent }   from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useServiceStore }     from '@/stores/useServiceStore';
import { LoadMoreTrigger }     from '@/components/shared/LoadMoreTrigger';
import { toast }               from 'sonner';

// ── Types ───────────────────────────────────────────────────────────────────

interface MobileDrag {
  id: string;
  /** Insertion point in the "others" (without-dragged) array */
  overIndex: number;
  itemHeight: number;
  /** Captured once: finger Y relative to card top */
  offsetY: number;
  /** Current fixed-position top for the clone */
  fixedTop: number;
  fixedLeft: number;
  fixedWidth: number;
}

// ── Desktop sortable row (dnd-kit) ──────────────────────────────────────────

function SortableRow({ service, onEdit, onDelete, onToggle }: {
  service: any; onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: service.id });

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 }}
    >
      <TableCell className="w-10 pr-0">
        <div
          ref={setActivatorNodeRef} {...listeners} {...attributes}
          style={{ touchAction: 'none' }}
          className="flex items-center justify-center w-8 h-8 cursor-grab active:cursor-grabbing rounded text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{service.name}</TableCell>
      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{service.description || '—'}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={service.isActive} onCheckedChange={onToggle} />
          <Badge variant={service.isActive ? 'default' : 'secondary'}>{service.isActive ? 'Active' : 'Inactive'}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Edit Service</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ── Static mobile card (search mode) ───────────────────────────────────────

function StaticMobileCard({ service, onEdit, onDelete, onToggle }: {
  service: any; onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="font-semibold truncate text-sm">{service.name}</p>
            {service.description && <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>}
            <div className="flex items-center gap-2 pt-0.5">
              <Switch checked={service.isActive} onCheckedChange={onToggle} />
              <Badge variant={service.isActive ? 'default' : 'secondary'} className="text-xs">
                {service.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Edit Service</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function ServicesTab() {
  const {
    services, isLoading, updateService, deleteService,
    reorderServices, servicesPagination, loadMoreServices,
  } = useServiceStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget,     setEditTarget]     = useState<any>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<any>(null);
  const [search,         setSearch]         = useState('');
  const [localServices,  setLocalServices]  = useState<any[] | null>(null);

  // Desktop dnd-kit
  const [activeId, setActiveId] = useState<string | null>(null);

  // Mobile custom drag
  const [mobileDrag, setMobileDrag]     = useState<MobileDrag | null>(null);
  const mobileDragRef                   = useRef<MobileDrag | null>(null);
  // Refs keyed by service id — used to read live bounding rects during drag
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Keep serviceList accessible in document-level event handlers without stale closure
  const serviceListRef = useRef<any[]>([]);

  const serviceList: any[] = localServices ?? (Array.isArray(services) ? services : []);
  serviceListRef.current = serviceList;

  const isSearching = search.trim().length > 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return serviceList;
    return serviceList.filter((s) => (s.name ?? '').toLowerCase().includes(q));
  }, [serviceList, search]);

  // ── Desktop sensors (PointerSensor = mouse only on desktop) ─────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDesktopDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    if (localServices === null) setLocalServices([...serviceList]);
  };

  const handleDesktopDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = localServices ?? serviceList;
    const oldIdx  = current.findIndex((s) => s.id === active.id);
    const newIdx  = current.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered      = arrayMove(current, oldIdx, newIdx);
    const withPositions  = reordered.map((s, i) => ({ ...s, position: i }));
    setLocalServices(withPositions);
    try {
      await reorderServices(withPositions.map((s) => ({ id: s.id, position: s.position })));
      setLocalServices(null);
      toast.success('Service order saved');
    } catch {
      setLocalServices(current);
      toast.error('Failed to save order');
    }
  };

  // ── Mobile touch drag ────────────────────────────────────────────────────

  const handleGripTouchStart = (serviceId: string, e: React.TouchEvent) => {
    e.preventDefault(); // block scroll & long-press context menu
    const touch  = e.touches[0];
    const el     = itemRefs.current.get(serviceId);
    if (!el) return;

    const rect    = el.getBoundingClientRect();
    const offsetY = touch.clientY - rect.top;   // ← the key: finger offset within card

    // overIndex = where in the "without-dragged" array the placeholder starts
    const sourceIdx   = serviceListRef.current.findIndex((s) => s.id === serviceId);
    const initialOver = Math.min(sourceIdx, serviceListRef.current.length - 1);

    const drag: MobileDrag = {
      id:         serviceId,
      overIndex:  initialOver,
      itemHeight: rect.height,
      offsetY,
      fixedTop:   touch.clientY - offsetY,   // correct from frame 1
      fixedLeft:  rect.left,
      fixedWidth: rect.width,
    };
    mobileDragRef.current = drag;
    setMobileDrag(drag);
    if (localServices === null) setLocalServices([...serviceListRef.current]);
  };

  // Document-level touch listeners — registered once per drag session
  useEffect(() => {
    if (!mobileDrag) return;

    const onMove = (e: TouchEvent) => {
      e.preventDefault(); // prevent page scroll while dragging
      const touch   = e.touches[0];
      const current = mobileDragRef.current!;
      const fixedTop = touch.clientY - current.offsetY;

      // Find insertion point: scan non-dragged items, count how many midpoints
      // are above the finger position
      const others = serviceListRef.current.filter((s) => s.id !== current.id);
      let overIndex = 0;
      for (let i = 0; i < others.length; i++) {
        const el = itemRefs.current.get(others[i].id);
        if (!el) continue;
        const r   = el.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        if (touch.clientY > mid) overIndex = i + 1;
      }

      const updated = { ...current, fixedTop, overIndex };
      mobileDragRef.current = updated;
      setMobileDrag(updated);         // triggers re-render → placeholder moves
    };

    const onEnd = async () => {
      const drag = mobileDragRef.current!;
      mobileDragRef.current = null;
      setMobileDrag(null);

      const current = serviceListRef.current;
      const others  = current.filter((s) => s.id !== drag.id);
      const dragged = current.find((s)  => s.id === drag.id);
      if (!dragged) return;

      const reordered = [...others];
      reordered.splice(drag.overIndex, 0, dragged);

      const changed = reordered.some((s, i) => s.id !== current[i]?.id);
      if (!changed) return;

      const withPositions = reordered.map((s, i) => ({ ...s, position: i }));
      setLocalServices(withPositions);
      try {
        await reorderServices(withPositions.map((s) => ({ id: s.id, position: s.position })));
        setLocalServices(null);
        toast.success('Service order saved');
      } catch {
        setLocalServices(current);
        toast.error('Failed to save order');
      }
    };

    const onCancel = () => {
      mobileDragRef.current = null;
      setMobileDrag(null);
    };

    document.addEventListener('touchmove',   onMove,   { passive: false });
    document.addEventListener('touchend',    onEnd);
    document.addEventListener('touchcancel', onCancel);
    return () => {
      document.removeEventListener('touchmove',   onMove);
      document.removeEventListener('touchend',    onEnd);
      document.removeEventListener('touchcancel', onCancel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileDrag !== null]); // re-register only on drag start / end, not on every move

  // ── Visual list for mobile ───────────────────────────────────────────────
  // During drag: dragged item removed, placeholder inserted at overIndex
  type VisualItem = { type: 'item'; service: any } | { type: 'placeholder' };

  const mobileVisualItems = useMemo((): VisualItem[] => {
    if (!mobileDrag) return serviceList.map((s) => ({ type: 'item', service: s }));
    const others = serviceList.filter((s) => s.id !== mobileDrag.id);
    const result: VisualItem[] = others.map((s) => ({ type: 'item', service: s }));
    result.splice(mobileDrag.overIndex, 0, { type: 'placeholder' });
    return result;
  }, [serviceList, mobileDrag?.id, mobileDrag?.overIndex]);

  // ── General handlers ─────────────────────────────────────────────────────

  const handleToggleActive = async (service: any) => {
    try {
      await updateService(service.id, { isActive: !service.isActive });
      toast.success(`Service ${service.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to update service');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteService(deleteTarget.id);
      setLocalServices(null);
      toast.success('Service deleted successfully');
    } catch {
      toast.error('Failed to delete service');
    }
  };

  const activeService  = activeId   ? serviceList.find((s) => s.id === activeId)       : null;
  const draggedService = mobileDrag ? serviceList.find((s) => s.id === mobileDrag.id)  : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search services…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Add
        </Button>
      </div>

      {!isSearching && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <GripVertical className="h-3.5 w-3.5 shrink-0" />
          Drag the handle to reorder. Customers see services in this exact order.
        </p>
      )}

      <AddServiceModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <EditServiceModal open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)} service={editTarget} />
      <DeleteConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Service"
        itemName={deleteTarget?.name}
        onConfirm={handleDeleteConfirm}
      />

      {/* ── Loading ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <>
          <div className="md:hidden space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>
            ))}
          </div>
          <div className="hidden md:block space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted animate-pulse" />
            ))}
          </div>
        </>

      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10">
            <Layers className="h-8 w-8 opacity-30 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No services found</p>
          </CardContent>
        </Card>

      ) : isSearching ? (
        /* ── Search mode ─────────────────────────────────────────────── */
        <>
          <div className="md:hidden space-y-3">
            {filtered.map((s) => (
              <StaticMobileCard key={s.id} service={s}
                onEdit={() => setEditTarget(s)} onDelete={() => setDeleteTarget(s)} onToggle={() => handleToggleActive(s)} />
            ))}
          </div>
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead><TableHead>Description</TableHead>
                  <TableHead>Status</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{s.description || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={s.isActive} onCheckedChange={() => handleToggleActive(s)} />
                        <Badge variant={s.isActive ? 'default' : 'secondary'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditTarget(s)}><Edit className="mr-2 h-4 w-4" />Edit Service</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteTarget(s)} className="text-destructive"><Trash className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>

      ) : (
        /* ── Drag mode ───────────────────────────────────────────────── */
        <>
          {/* ── MOBILE: custom touch drag ── */}
          <div className="md:hidden space-y-2">
            {mobileVisualItems.map((item, idx) => {
              if (item.type === 'placeholder') {
                return (
                  <div
                    key="__placeholder"
                    style={{ height: mobileDrag?.itemHeight ?? 80 }}
                    className="rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
                  />
                );
              }
              const { service } = item;
              return (
                <div
                  key={service.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(service.id, el);
                    else    itemRefs.current.delete(service.id);
                  }}
                >
                  <Card>
                    <CardContent className="p-0">
                      <div className="flex items-stretch">
                        {/* Grip — touchAction:none inline prevents browser scroll hijack */}
                        <div
                          style={{ touchAction: 'none' }}
                          onTouchStart={(e) => handleGripTouchStart(service.id, e)}
                          className="flex items-center justify-center w-11 shrink-0 cursor-grab active:cursor-grabbing rounded-l-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>

                        <div className="w-px bg-border self-stretch shrink-0" />

                        <div className="flex-1 min-w-0 flex items-start justify-between gap-2 py-3 pl-3 pr-2">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="font-semibold truncate text-sm">{service.name}</p>
                            {service.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                            )}
                            <div className="flex items-center gap-2 pt-0.5">
                              <Switch checked={service.isActive} onCheckedChange={() => handleToggleActive(service)} />
                              <Badge variant={service.isActive ? 'default' : 'secondary'} className="text-xs">
                                {service.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 shrink-0 mt-0.5">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditTarget(service)}>
                                <Edit className="mr-2 h-4 w-4" />Edit Service
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteTarget(service)} className="text-destructive">
                                <Trash className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* ── MOBILE: fixed-position drag clone ── */}
          {mobileDrag && draggedService && (
            <div
              style={{
                position:      'fixed',
                top:           mobileDrag.fixedTop,
                left:          mobileDrag.fixedLeft,
                width:         mobileDrag.fixedWidth,
                zIndex:        9999,
                pointerEvents: 'none',
              }}
            >
              <Card className="shadow-2xl ring-2 ring-primary">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    <div className="flex items-center justify-center w-11 shrink-0 text-primary">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="w-px bg-border self-stretch shrink-0" />
                    <div className="flex-1 min-w-0 py-3 pl-3 pr-2 space-y-1.5">
                      <p className="font-semibold truncate text-sm">{draggedService.name}</p>
                      {draggedService.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{draggedService.description}</p>
                      )}
                      <Badge variant={draggedService.isActive ? 'default' : 'secondary'} className="text-xs">
                        {draggedService.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── DESKTOP: dnd-kit ── */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={handleDesktopDragStart}
            onDragEnd={handleDesktopDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <SortableContext items={serviceList.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" /><TableHead>Service Name</TableHead>
                      <TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceList.map((s) => (
                      <SortableRow key={s.id} service={s}
                        onEdit={() => setEditTarget(s)} onDelete={() => setDeleteTarget(s)} onToggle={() => handleToggleActive(s)} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 120, easing: 'ease' }}>
              {activeService ? (
                <div className="flex items-center gap-4 px-4 py-3 bg-background shadow-2xl ring-2 ring-primary rounded-md text-sm min-w-[320px]">
                  <GripVertical className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium flex-1 truncate">{activeService.name}</span>
                  <Badge variant={activeService.isActive ? 'default' : 'secondary'}>
                    {activeService.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}

      <LoadMoreTrigger
        onIntersect={loadMoreServices}
        isFetchingMore={servicesPagination.isFetchingMore}
        hasMore={servicesPagination.hasMore}
      />
    </div>
  );
}
