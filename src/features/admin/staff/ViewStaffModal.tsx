// ============================================================================
// VIEW STAFF MODAL - Display Full Staff Profile
// ============================================================================

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useStaffStore } from '@/stores/useStaffStore';
import { Staff } from '@/types';
import { Loader2, User, Briefcase, Building2, Phone, Shield } from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// COMPONENT
// ============================================================================

interface ViewStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff | null;
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || '—'}</span>
    </div>
  );
}

export function ViewStaffModal({ open, onOpenChange, staff }: ViewStaffModalProps) {
  const { selectedCompensation, isLoadingCompensation, fetchCompensation } = useStaffStore();

  const staffId = staff ? (staff as any)._id || staff.id : null;

  useEffect(() => {
    if (open && staffId) {
      fetchCompensation(staffId);
    }
  }, [open, staffId, fetchCompensation]);

  if (!staff) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      admin: 'Admin',
      manager: 'Manager',
      staff: 'Staff',
    };
    return map[String(role).toLowerCase()] || role;
  };

  const staffRoleLabel = (sr?: string) => {
    if (!sr) return '—';
    const map: Record<string, string> = {
      washer: 'Washer',
      delivery: 'Delivery',
    };
    return map[sr.toLowerCase()] || sr;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Staff Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header Info */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
              {staff.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{staff.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={staff.isActive ? 'default' : 'secondary'}>
                  {staff.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline">{roleLabel(String(staff.role))}</Badge>
                {staff.staffRole && (
                  <Badge variant="outline">{staffRoleLabel(staff.staffRole)}</Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              Personal Information
            </h4>
            <div className="rounded-lg border p-3 space-y-0.5">
              <InfoRow label="Full Name" value={staff.name} />
              <InfoRow label="Email" value={staff.email} />
              <InfoRow label="Phone" value={staff.phone} />
              <InfoRow label="Date of Birth" value={formatDate(staff.dateOfBirth)} />
              <InfoRow label="Address" value={staff.address} />
              <InfoRow label="City" value={staff.city} />
            </div>
          </div>

          {/* Employment Details */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4" />
              Employment Details
            </h4>
            <div className="rounded-lg border p-3 space-y-0.5">
              <InfoRow label="Role" value={roleLabel(String(staff.role))} />
              <InfoRow label="Staff Role" value={staffRoleLabel(staff.staffRole)} />
              <InfoRow label="Hire Date" value={formatDate(staff.hireDate)} />
              <InfoRow label="Date Joined" value={formatDate(staff.createdAt)} />
            </div>
          </div>

          {/* Bank / Account Details */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4" />
              Bank Details
            </h4>
            <div className="rounded-lg border p-3 space-y-0.5">
              <InfoRow label="Bank Name" value={staff.bankName} />
              <InfoRow label="Account Number" value={staff.bankAccountNumber} />
              <InfoRow label="Account Name" value={staff.bankAccountName} />
            </div>
          </div>

          {/* Compensation */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4" />
              Compensation
            </h4>
            <div className="rounded-lg border p-3 space-y-0.5">
              {isLoadingCompensation ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : selectedCompensation ? (
                <>
                  <InfoRow
                    label="Pay Type"
                    value={selectedCompensation.payType === 'hourly' ? 'Hourly' : 'Monthly'}
                  />
                  {(selectedCompensation.payType === 'hourly' || (selectedCompensation as any).hourlyRate > 0) && (
                    <InfoRow
                      label="Hourly Rate"
                      value={`\u20A6${((selectedCompensation as any).hourlyRate || 0).toLocaleString()}`}
                    />
                  )}
                  {(selectedCompensation.payType === 'hourly' || (selectedCompensation as any).overtimeRate > 0) && (
                    <InfoRow
                      label="Overtime Rate"
                      value={`\u20A6${((selectedCompensation as any).overtimeRate || 0).toLocaleString()}`}
                    />
                  )}
                  {(selectedCompensation.payType === 'monthly' || (selectedCompensation as any).monthlySalary > 0) && (
                    <InfoRow
                      label="Monthly Salary"
                      value={`\u20A6${((selectedCompensation as any).monthlySalary || 0).toLocaleString()}`}
                    />
                  )}
                  <InfoRow
                    label="Bonus Per Order"
                    value={`\u20A6${((selectedCompensation as any).bonusPerOrder || 0).toLocaleString()}`}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2 text-center">
                  No compensation data set
                </p>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4" />
              Emergency Contact & Guarantor
            </h4>
            <div className="rounded-lg border p-3 space-y-0.5">
              <InfoRow label="Emergency Contact" value={staff.emergencyContactName} />
              <InfoRow label="Emergency Phone" value={staff.emergencyContactPhone} />
              <InfoRow label="Guarantor Name" value={staff.guarantorName} />
              <InfoRow label="Guarantor Phone" value={staff.guarantorPhone} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
