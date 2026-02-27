// ============================================================================
// ROLES & PERMISSIONS TAB
// Three-panel: role selector | permission matrix | users in role
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useRoleStore, RoleDoc } from '@/stores/useRoleStore';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '@/lib/permissions';
import { Permission } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lock, Shield, Users, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================================
// HELPERS
// ============================================================================

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================================
// ASSIGN ROLE DIALOG
// ============================================================================

interface AssignRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  roles: RoleDoc[];
  onAssign: (roleId: string) => Promise<void>;
}

function AssignRoleDialog({ open, onOpenChange, user, roles, onAssign }: AssignRoleDialogProps) {
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await onAssign(selectedRoleId);
      toast.success('Role assigned successfully. User must re-login.');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to assign role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Assign a new role to <span className="font-medium">{user?.name}</span>.
            They will be logged out immediately.
          </DialogDescription>
        </DialogHeader>
        <Select onValueChange={setSelectedRoleId} value={selectedRoleId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r._id} value={r._id}>
                {capitalize(r.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedRoleId || saving}>
            {saving ? 'Saving…' : 'Assign Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// PERMISSION GROUP SECTION
// ============================================================================

interface PermissionGroupProps {
  group: string;
  permissions: Permission[];
  draft: Set<string>;
  locked: boolean;
  onToggle: (perm: string) => void;
}

function PermissionGroup({ group, permissions, draft, locked, onToggle }: PermissionGroupProps) {
  const [open, setOpen] = useState(true);
  const checkedCount = permissions.filter((p) => draft.has(p)).length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {group}
        </span>
        <Badge variant="secondary" className="text-xs">
          {checkedCount}/{permissions.length}
        </Badge>
      </button>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 p-4">
          {permissions.map((perm) => (
            <label
              key={perm}
              className={cn(
                'flex items-center gap-2.5 text-sm cursor-pointer select-none',
                locked && 'opacity-60 cursor-not-allowed'
              )}
            >
              <Checkbox
                checked={draft.has(perm)}
                disabled={locked}
                onCheckedChange={() => onToggle(perm)}
              />
              <span>{PERMISSION_LABELS[perm]}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RolesPermissionsTab() {
  const { roles, roleUsers, isLoading, isSaving, fetchRoles, updateRolePermissions, fetchRoleUsers, assignUserToRole } =
    useRoleStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [unsavedWarnTarget, setUnsavedWarnTarget] = useState<string | null>(null);
  const [assignDialogUser, setAssignDialogUser] = useState<any>(null);

  // ── Load roles on mount ────────────────────────────────────────────────────

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ── Auto-select first role when loaded ─────────────────────────────────────

  useEffect(() => {
    if (roles.length > 0 && !selectedId) {
      const adminRole = roles.find((r) => r.name === 'admin');
      selectRole((adminRole ?? roles[0])._id);
    }
  }, [roles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch users for selected role ──────────────────────────────────────────

  useEffect(() => {
    if (selectedId) fetchRoleUsers(selectedId);
  }, [selectedId, fetchRoleUsers]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const selectedRole = roles.find((r) => r._id === selectedId) ?? null;
  const isAdmin = selectedRole?.name === 'admin';
  const isDirty =
    selectedRole !== null &&
    JSON.stringify([...draft].sort()) !== JSON.stringify([...selectedRole.permissions].sort());

  const selectRole = useCallback(
    (id: string) => {
      const role = roles.find((r) => r._id === id);
      if (role) {
        setSelectedId(id);
        setDraft(new Set(role.permissions));
      }
    },
    [roles]
  );

  const handleRoleClick = (id: string) => {
    if (id === selectedId) return;
    if (isDirty) {
      setUnsavedWarnTarget(id);
    } else {
      selectRole(id);
    }
  };

  const togglePermission = (perm: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedId) return;
    try {
      await updateRolePermissions(selectedId, [...draft]);
      toast.success('Permissions saved. Affected users will be prompted to re-login.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save permissions');
    }
  };

  const handleReset = () => {
    if (selectedRole) setDraft(new Set(selectedRole.permissions));
  };

  const usersForRole = selectedId ? (roleUsers[selectedId] ?? []) : [];

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (isLoading && roles.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6 items-start">
      {/* ── Left: Role selector ─────────────────────────────────────────── */}
      <div className="w-52 shrink-0 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-3">
          Roles
        </p>
        {roles.map((role) => {
          const users = roleUsers[role._id] ?? [];
          const active = role._id === selectedId;

          return (
            <button
              key={role._id}
              type="button"
              onClick={() => handleRoleClick(role._id)}
              className={cn(
                'w-full text-left rounded-lg border px-3 py-2.5 transition-colors',
                active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'hover:bg-muted/50 bg-card'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm capitalize">{role.name}</span>
                {role.name === 'admin' && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {role.name === 'admin' ? 'Full access' : `${role.permissions.length} permissions`}
              </p>
              {users.length > 0 && (
                <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1.5">
                  <Users className="h-2.5 w-2.5 mr-1" />
                  {users.length}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Right: Permissions + Users ──────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {selectedRole ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {selectedRole.name} Permissions
                </h3>
                {isAdmin ? (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Admin role always has all permissions and cannot be modified.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {draft.size} of {Object.values(PERMISSION_GROUPS).flat().length} permissions enabled
                  </p>
                )}
              </div>

              {!isAdmin && (
                <div className="flex items-center gap-2">
                  {isDirty && (
                    <span className="text-xs text-orange-500 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Unsaved
                    </span>
                  )}
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={!isDirty}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>

            {/* Permission Matrix */}
            <div className="space-y-3">
              {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                <PermissionGroup
                  key={group}
                  group={group}
                  permissions={perms}
                  draft={draft}
                  locked={isAdmin}
                  onToggle={togglePermission}
                />
              ))}
            </div>

            {/* Users in this role */}
            <Separator />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Users with this role
                </CardTitle>
                <CardDescription>
                  {usersForRole.length === 0
                    ? 'No users currently assigned to this role'
                    : `${usersForRole.length} user${usersForRole.length !== 1 ? 's' : ''} assigned`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersForRole.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users found
                  </p>
                ) : (
                  <div className="space-y-0">
                    {usersForRole.map((u: any, i: number) => (
                      <div key={u._id ?? i}>
                        {i > 0 && <Separator />}
                        <div className="flex items-center justify-between py-3 gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email || u.phone}
                              {u.staffRole ? ` · ${u.staffRole}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={u.isActive ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {u.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => setAssignDialogUser(u)}
                            >
                              Change Role
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-16">
            Select a role on the left to manage its permissions.
          </p>
        )}
      </div>

      {/* ── Unsaved changes guard ────────────────────────────────────────── */}
      <Dialog open={!!unsavedWarnTarget} onOpenChange={() => setUnsavedWarnTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved permission changes. Discard them and switch roles?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnsavedWarnTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (unsavedWarnTarget) selectRole(unsavedWarnTarget);
                setUnsavedWarnTarget(null);
              }}
            >
              Discard & Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign role dialog ───────────────────────────────────────────── */}
      {assignDialogUser && (
        <AssignRoleDialog
          open={!!assignDialogUser}
          onOpenChange={(v) => { if (!v) setAssignDialogUser(null); }}
          user={assignDialogUser}
          roles={roles}
          onAssign={async (roleId) => {
            await assignUserToRole(roleId, assignDialogUser._id);
            // Refresh all role user lists
            roles.forEach((r) => fetchRoleUsers(r._id));
          }}
        />
      )}
    </div>
  );
}
