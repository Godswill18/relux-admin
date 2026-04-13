// ============================================================================
// EDIT STAFF MODAL - Edit Staff Member Details
// ============================================================================

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ModalForm } from '@/components/shared/ModalForm';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStaffStore } from '@/stores/useStaffStore';
import { Staff } from '@/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ============================================================================
// SCHEMA
// ============================================================================

const editStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  role: z.enum(['admin', 'manager', 'staff']),
  staffRole: z.enum(['washer', 'delivery']).or(z.literal('')).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  dateOfBirth: z.string().optional(),
  hireDate: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  guarantorName: z.string().optional(),
  guarantorPhone: z.string().optional(),
});

type EditStaffForm = z.infer<typeof editStaffSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface EditStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff | null;
}

export function EditStaffModal({ open, onOpenChange, staff }: EditStaffModalProps) {
  const { updateStaff } = useStaffStore();

  const form = useForm<EditStaffForm>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'staff',
      staffRole: '',
      address: '',
      city: '',
      dateOfBirth: '',
      hireDate: '',
      bankName: '',
      bankAccountNumber: '',
      bankAccountName: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      guarantorName: '',
      guarantorPhone: '',
    },
  });

  useEffect(() => {
    if (staff && open) {
      form.reset({
        name: staff.name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        role: (String(staff.role).toLowerCase() as 'admin' | 'manager' | 'staff') || 'staff',
        staffRole: staff.staffRole || '',
        address: staff.address || '',
        city: staff.city || '',
        dateOfBirth: staff.dateOfBirth || '',
        hireDate: staff.hireDate || '',
        bankName: staff.bankName || '',
        bankAccountNumber: staff.bankAccountNumber || '',
        bankAccountName: staff.bankAccountName || '',
        emergencyContactName: staff.emergencyContactName || '',
        emergencyContactPhone: staff.emergencyContactPhone || '',
        guarantorName: staff.guarantorName || '',
        guarantorPhone: staff.guarantorPhone || '',
      });
    }
  }, [staff, open, form]);

  const isSubmitting = form.formState.isSubmitting;
  const staffId = staff ? (staff as any)._id || staff.id : null;

  const onSubmit = async (data: EditStaffForm) => {
    if (!staffId) return;
    try {
      const payload: any = { ...data };
      if (!payload.staffRole) delete payload.staffRole;
      // Remove empty optional strings
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') delete payload[key];
      });

      await updateStaff(staffId, payload);
      toast.success('Staff member updated successfully');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update staff member');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Staff Member"
      description={`Update details for ${staff?.name || 'staff member'}`}
      className="sm:max-w-2xl"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="bank">Bank</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="jane@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="08012345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="staffRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select staff role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="washer">Washer</SelectItem>
                          <SelectItem value="delivery">Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Lagos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            {/* Bank Details Tab */}
            <TabsContent value="bank" className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Access Bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankAccountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input placeholder="0123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankAccountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            {/* Emergency Contact Tab */}
            <TabsContent value="emergency" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="08012345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guarantorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guarantor Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Mary Johnson" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guarantorPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guarantor Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="08098765432" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
