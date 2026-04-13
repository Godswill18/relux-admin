// ============================================================================
// SERVICES TAB - Service Management with drag-and-drop reordering
// ============================================================================

import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Edit, Trash, Plus, Search, Layers, GripVertical } from 'lucide-react';
import { AddServiceModal } from './AddServiceModal';
import { EditServiceModal } from './EditServiceModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useServiceStore } from '@/stores/useServiceStore';
import { LoadMoreTrigger } from '@/components/shared/LoadMoreTrigger';
import { toast } from 'sonner';

// ── Sortable mobile card ────────────────────────────────────────────────────

function SortableMobileCard({
  service,
  onEdit,
  onDelete,
  onToggle,
}: {
  service: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  // On mobile we do NOT use DragOverlay — the card physically follows the
  // finger via CSS transform. Overlay causes a jump because it anchors its
  // top-left corner to the pointer, not to where inside the card you grabbed.
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        // No transition while actively dragging — instant follow feels natural
        transition: isDragging ? 'none' : transition ?? undefined,
        // Lifted appearance
        zIndex: isDragging ? 999 : undefined,
        position: 'relative',
      }}
    >
      <Card
        style={{
          boxShadow: isDragging ? '0 12px 40px rgba(0,0,0,0.4)' : undefined,
        }}
        className={isDragging ? 'ring-2 ring-primary' : ''}
      >
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Grip handle — touch-action:none inline is required on iOS/Android */}
            <div
              ref={setActivatorNodeRef}
              {...listeners}
              {...attributes}
              aria-label="Drag to reorder"
              style={{ touchAction: 'none' }}
              className="flex items-center justify-center w-11 shrink-0 cursor-grab active:cursor-grabbing rounded-l-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <GripVertical className="h-5 w-5" />
            </div>

            <div className="w-px bg-border self-stretch shrink-0" />

            {/* Content */}
            <div className="flex-1 min-w-0 flex items-start justify-between gap-2 py-3 pl-3 pr-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="font-semibold truncate text-sm">{service.name}</p>
                {service.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                )}
                <div className="flex items-center gap-2 pt-0.5">
                  <Switch checked={service.isActive} onCheckedChange={onToggle} />
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
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />Edit Service
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
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
}

// ── Sortable desktop row ────────────────────────────────────────────────────

function SortableRow({
  service,
  onEdit,
  onDelete,
  onToggle,
}: {
  service: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      }}
    >
      <TableCell className="w-10 pr-0">
        <div
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          aria-label="Drag to reorder"
          style={{ touchAction: 'none' }}
          className="flex items-center justify-center w-8 h-8 cursor-grab active:cursor-grabbing rounded text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{service.name}</TableCell>
      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
        {service.description || '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={service.isActive} onCheckedChange={onToggle} />
          <Badge variant={service.isActive ? 'default' : 'secondary'}>
            {service.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />Edit Service
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ── Static card (search mode) ───────────────────────────────────────────────

function StaticMobileCard({
  service,
  onEdit,
  onDelete,
  onToggle,
}: {
  service: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="font-semibold truncate text-sm">{service.name}</p>
            {service.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
            )}
            <div className="flex items-center gap-2 pt-0.5">
              <Switch checked={service.isActive} onCheckedChange={onToggle} />
              <Badge variant={service.isActive ? 'default' : 'secondary'} className="text-xs">
                {service.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />Edit Service
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />Delete
              </DropdownMenuItem>
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
  const [activeId,       setActiveId]       = useState<string | null>(null);

  const serviceList: any[] = localServices ?? (Array.isArray(services) ? services : []);
  const isSearching = search.trim().length > 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return serviceList;
    return serviceList.filter((s) => (s.name ?? '').toLowerCase().includes(q));
  }, [serviceList, search]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    if (localServices === null) setLocalServices([...serviceList]);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = localServices ?? serviceList;
    const oldIndex = current.findIndex((s) => s.id === active.id);
    const newIndex = current.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(current, oldIndex, newIndex);
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

  const handleDragCancel = () => {
    setActiveId(null);
  };

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

  const activeService = activeId ? serviceList.find((s) => s.id === activeId) : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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

      {/* ── Loading ────────────────────────────────────────────────────────── */}
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
        <>
          <div className="md:hidden space-y-3">
            {filtered.map((service) => (
              <StaticMobileCard
                key={service.id}
                service={service}
                onEdit={() => setEditTarget(service)}
                onDelete={() => setDeleteTarget(service)}
                onToggle={() => handleToggleActive(service)}
              />
            ))}
          </div>
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{service.description || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={service.isActive} onCheckedChange={() => handleToggleActive(service)} />
                        <Badge variant={service.isActive ? 'default' : 'secondary'}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditTarget(service)}>
                            <Edit className="mr-2 h-4 w-4" />Edit Service
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteTarget(service)} className="text-destructive">
                            <Trash className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={serviceList.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* Mobile — card moves in-place, no DragOverlay */}
            <div className="md:hidden space-y-2">
              {serviceList.map((service) => (
                <SortableMobileCard
                  key={service.id}
                  service={service}
                  onEdit={() => setEditTarget(service)}
                  onDelete={() => setDeleteTarget(service)}
                  onToggle={() => handleToggleActive(service)}
                />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Service Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceList.map((service) => (
                    <SortableRow
                      key={service.id}
                      service={service}
                      onEdit={() => setEditTarget(service)}
                      onDelete={() => setDeleteTarget(service)}
                      onToggle={() => handleToggleActive(service)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </SortableContext>

          {/* DragOverlay — desktop only. Mobile cards move in-place (no overlay)
              because DragOverlay anchors its top-left to the pointer, causing
              the ghost to jump above where the user grabbed the card. */}
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
      )}

      <LoadMoreTrigger
        onIntersect={loadMoreServices}
        isFetchingMore={servicesPagination.isFetchingMore}
        hasMore={servicesPagination.hasMore}
      />
    </div>
  );
}
