// ============================================================================
// STAFF PAGE - Staff Management Interface
// ============================================================================

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, MoreHorizontal, Eye, Edit, Trash, UserCheck, UserX, ShieldAlert } from 'lucide-react';
import { AddStaffModal } from './AddStaffModal';
import { ViewStaffModal } from './ViewStaffModal';
import { EditStaffModal } from './EditStaffModal';
import { DeleteStaffModal } from './DeleteStaffModal';
import { DeactivateStaffModal } from './DeactivateStaffModal';
import { EmergencyOverrideModal } from './EmergencyOverrideModal';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStaffStore } from '@/stores/useStaffStore';
import { useHasPermission } from '@/stores/useAuthStore';
import { Staff, Permission } from '@/types';

// ============================================================================
// HELPER
// ============================================================================

const getStaffId = (s: Staff) => (s as any)._id || s.id;

// ============================================================================
// ROLE BADGE COMPONENT
// ============================================================================

function RoleBadge({ role }: { role: string }) {
  const roleConfig: Record<string, { variant: any; label: string }> = {
    admin: { variant: 'default', label: 'Admin' },
    manager: { variant: 'default', label: 'Manager' },
    receptionist: { variant: 'secondary', label: 'Receptionist' },
    staff: { variant: 'outline', label: 'Staff' },
  };

  const config = roleConfig[String(role).toLowerCase()] || { variant: 'outline', label: role };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ============================================================================
// STAFF PAGE COMPONENT
// ============================================================================

export default function StaffPage() {
  const { staff, isLoading, fetchStaff } = useStaffStore();
  const canCreate = useHasPermission(Permission.CREATE_STAFF);
  const canEdit = useHasPermission(Permission.EDIT_STAFF);
  const canDelete = useHasPermission(Permission.DELETE_STAFF);
  const canManageShifts = useHasPermission(Permission.MANAGE_SHIFTS);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Staff | null>(null);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Staff | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<{ id: string; name: string } | null>(null);

  // Fetch staff on mount
  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Define columns
  const columns: ColumnDef<Staff>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => <RoleBadge role={String(row.original.role)} />,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const staffMember = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setViewTarget(staffMember)}>
                <Eye className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={() => setEditTarget(staffMember)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Staff
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={() => setDeactivateTarget(staffMember)}>
                  {staffMember.isActive ? (
                    <>
                      <UserX className="mr-2 h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {canManageShifts && (
                <DropdownMenuItem
                  onClick={() =>
                    setOverrideTarget({
                      id: getStaffId(staffMember),
                      name: staffMember.name,
                    })
                  }
                >
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Emergency Access
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(staffMember)}
                    className="text-destructive"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Calculate stats
  const staffList = Array.isArray(staff) ? staff : [];
  const stats = {
    total: staffList.length,
    active: staffList.filter((s) => s.isActive).length,
    admins: staffList.filter((s) => String(s.role).toLowerCase() === 'admin').length,
    staffCount: staffList.filter((s) => String(s.role).toLowerCase() === 'staff').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff members and their roles</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Modals */}
      <AddStaffModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />

      <ViewStaffModal
        open={!!viewTarget}
        onOpenChange={(open) => !open && setViewTarget(null)}
        staff={viewTarget}
      />

      <EditStaffModal
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        staff={editTarget}
      />

      <DeleteStaffModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        staff={deleteTarget}
      />

      <DeactivateStaffModal
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        staff={deactivateTarget}
      />

      {overrideTarget && (
        <EmergencyOverrideModal
          open={!!overrideTarget}
          onOpenChange={(open) => !open && setOverrideTarget(null)}
          staffId={overrideTarget.id}
          staffName={overrideTarget.name}
        />
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.staffCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Staff Members</CardTitle>
          <CardDescription>View and manage all staff accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={staffList}
            searchKey="name"
            searchPlaceholder="Search by name, email, or phone..."
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
