// ============================================================================
// STAFF PROFILE PAGE - View · Edit · Change Password · Bank Details
// ============================================================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  User, Mail, Phone, MapPin, Briefcase, Calendar, ShieldCheck,
  Building2, CreditCard, DollarSign, Edit2, X, Loader2, KeyRound,
  PhoneCall, AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const profileSchema = z.object({
  phone:                 z.string().optional(),
  address:               z.string().optional(),
  city:                  z.string().optional(),
  gender:                z.enum(['male', 'female', 'prefer_not_to_say', '']).optional(),
  emergencyContactName:  z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword:     z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const bankSchema = z.object({
  otp:               z.string().min(4, 'OTP is required'),
  bankName:          z.string().min(1, 'Bank name is required'),
  bankAccountNumber: z.string().min(6, 'Account number is required'),
  bankAccountName:   z.string().min(1, 'Account name is required'),
});

type ProfileForm   = z.infer<typeof profileSchema>;
type PasswordForm  = z.infer<typeof passwordSchema>;
type BankForm      = z.infer<typeof bankSchema>;

// ============================================================================
// HELPERS
// ============================================================================

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
      </div>
    </div>
  );
}

function maskAccountNumber(num?: string) {
  if (!num) return '—';
  if (num.length <= 4) return num;
  return '•'.repeat(num.length - 4) + num.slice(-4);
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StaffProfilePage() {
  const { setUser } = useAuthStore();

  const [profile, setProfile]         = useState<any>(null);
  const [compensation, setCompensation] = useState<any>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [activeTab, setActiveTab]     = useState('profile');

  // Edit profile state
  const [editMode, setEditMode]         = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // OTP bank flow state
  const [bankStep, setBankStep]       = useState<'view' | 'form'>('view');
  const [sendingOtp, setSendingOtp]   = useState(false);
  const [devOtp, setDevOtp]           = useState<string | null>(null);

  // ── Forms ─────────────────────────────────────────────────────────────────

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone:                 '',
      address:               '',
      city:                  '',
      gender:                '',
      emergencyContactName:  '',
      emergencyContactPhone: '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const bankForm = useForm<BankForm>({
    resolver: zodResolver(bankSchema),
    defaultValues: { otp: '', bankName: '', bankAccountNumber: '', bankAccountName: '' },
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/staff/me');
      const { user, compensation: comp } = res.data.data;
      setProfile(user);
      setCompensation(comp);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // When entering edit mode, seed form with current values
  const enterEditMode = () => {
    profileForm.reset({
      phone:                 profile?.phone                 ?? '',
      address:               profile?.address               ?? '',
      city:                  profile?.city                  ?? '',
      gender:                profile?.gender                ?? '',
      emergencyContactName:  profile?.emergencyContactName  ?? '',
      emergencyContactPhone: profile?.emergencyContactPhone ?? '',
    });
    setEditMode(true);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveProfile = async (data: ProfileForm) => {
    try {
      setSavingProfile(true);
      const res = await apiClient.patch('/staff/me', data);
      const updatedUser = res.data.data.user;
      setProfile(updatedUser);
      // Sync auth store so header/nav reflects changes
      setUser(updatedUser);
      toast.success('Profile updated successfully');
      setEditMode(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (data: PasswordForm) => {
    try {
      await apiClient.put('/auth/updatepassword', {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      });
      toast.success('Password changed successfully');
      passwordForm.reset();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    }
  };

  const handleSendOtp = async () => {
    if (!profile?.phone) {
      toast.error('No phone number on your profile — contact admin to add one first');
      return;
    }
    try {
      setSendingOtp(true);
      const res = await apiClient.post('/auth/request-otp', { phone: profile.phone });
      // Dev-mode: backend returns OTP in response
      if (res.data.otp) setDevOtp(res.data.otp);
      setBankStep('form');
      bankForm.reset({ otp: '', bankName: profile?.bankName ?? '', bankAccountNumber: '', bankAccountName: profile?.bankAccountName ?? '' });
      toast.success(`OTP sent to ${profile.phone}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleUpdateBank = async (data: BankForm) => {
    try {
      await apiClient.patch('/staff/me/bank', data);
      toast.success('Bank details updated successfully');
      setBankStep('view');
      setDevOtp(null);
      await loadProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update bank details');
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const initials = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your personal details and account settings</p>
      </div>

      {/* ── Identity Card ──────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary">{initials}</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">{profile?.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="capitalize">{profile?.role}</Badge>
                {profile?.staffRole && (
                  <Badge variant="outline" className="capitalize">{profile.staffRole}</Badge>
                )}
                {profile?.isActive ? (
                  <Badge variant="secondary" className="text-green-600">Active</Badge>
                ) : (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
        </TabsList>

        {/* ================================================================= */}
        {/* PROFILE TAB                                                        */}
        {/* ================================================================= */}
        <TabsContent value="profile" className="space-y-4">
          {!editMode ? (
            /* ── View mode ──────────────────────────────────────────────── */
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Your contact and personal details</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={enterEditMode}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoRow icon={User}   label="Full Name" value={profile?.name} />
                    <InfoRow icon={Mail}   label="Email"     value={profile?.email} />
                    <InfoRow icon={Phone}  label="Phone"     value={profile?.phone} />
                    <InfoRow icon={MapPin} label="Address"   value={[profile?.address, profile?.city].filter(Boolean).join(', ')} />
                    <InfoRow
                      icon={User}
                      label="Gender"
                      value={
                        profile?.gender === 'male' ? 'Male'
                        : profile?.gender === 'female' ? 'Female'
                        : profile?.gender === 'prefer_not_to_say' ? 'Prefer not to say'
                        : undefined
                      }
                    />
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-semibold mb-3">Emergency Contact</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoRow icon={PhoneCall} label="Name"  value={profile?.emergencyContactName} />
                      <InfoRow icon={PhoneCall} label="Phone" value={profile?.emergencyContactPhone} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Employment Information</CardTitle>
                  <CardDescription>Your role and start date (set by admin)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoRow icon={Briefcase} label="Role"       value={profile?.role} />
                    <InfoRow icon={Briefcase} label="Staff Role" value={profile?.staffRole} />
                    <InfoRow icon={Calendar}  label="Hire Date"  value={profile?.hireDate} />
                    <InfoRow
                      icon={Calendar}
                      label="Member Since"
                      value={profile?.createdAt ? format(new Date(profile.createdAt), 'MMMM yyyy') : undefined}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* ── Edit mode ───────────────────────────────────────────────── */
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Edit Profile</CardTitle>
                  <CardDescription>Update your contact and emergency details</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditMode(false)}
                  disabled={savingProfile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl><Input placeholder="e.g. 08012345678" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl><Input placeholder="e.g. Lagos" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select value={field.value ?? ''} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl><Input placeholder="Street address" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <p className="text-sm font-semibold">Emergency Contact</p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="emergencyContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Name</FormLabel>
                            <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="emergencyContactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl><Input placeholder="Phone number" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditMode(false)}
                        disabled={savingProfile}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={savingProfile}>
                        {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* SECURITY TAB                                                       */}
        {/* ================================================================= */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>
                Enter your current password and choose a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(handleChangePassword)}
                  className="space-y-4 max-w-sm"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min. 6 characters" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Re-enter new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={passwordForm.formState.isSubmitting}
                  >
                    {passwordForm.formState.isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Update Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* BANK DETAILS TAB                                                   */}
        {/* ================================================================= */}
        <TabsContent value="bank">
          {bankStep === 'view' ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Bank Details
                  </CardTitle>
                  <CardDescription>
                    Your salary payment information. OTP verification required to update.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <InfoRow icon={Building2}  label="Bank Name"        value={profile?.bankName} />
                  <InfoRow icon={CreditCard} label="Account Number"   value={maskAccountNumber(profile?.bankAccountNumber)} />
                  <InfoRow icon={User}       label="Account Name"     value={profile?.bankAccountName} />
                </div>

                <Separator />

                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10 p-4">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-400">
                    <p className="font-medium">OTP Verification Required</p>
                    <p className="text-xs mt-1">
                      An OTP will be sent to your registered phone{' '}
                      <span className="font-medium">{profile?.phone ? `(${profile.phone})` : '(not set)'}</span>{' '}
                      to verify your identity before updating bank details.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !profile?.phone}
                  variant="outline"
                >
                  {sendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <PhoneCall className="mr-2 h-4 w-4" />
                  {profile?.bankName ? 'Update Bank Details' : 'Add Bank Details'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Update Bank Details
                  </CardTitle>
                  <CardDescription>
                    Enter the OTP sent to {profile?.phone} and your new bank details
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setBankStep('view'); setDevOtp(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {/* Dev-mode OTP hint */}
                {devOtp && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900/50 p-3 text-sm">
                    <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-blue-800 dark:text-blue-400">
                      Dev mode — OTP: <span className="font-mono font-bold">{devOtp}</span>
                    </span>
                  </div>
                )}

                <Form {...bankForm}>
                  <form
                    onSubmit={bankForm.handleSubmit(handleUpdateBank)}
                    className="space-y-4 max-w-md"
                  >
                    <FormField
                      control={bankForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OTP Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter OTP from your phone"
                              maxLength={6}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <FormField
                      control={bankForm.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. First Bank" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={bankForm.control}
                      name="bankAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="10-digit account number" maxLength={10} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={bankForm.control}
                      name="bankAccountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Name on account" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setBankStep('view'); setDevOtp(null); }}
                        disabled={bankForm.formState.isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={bankForm.formState.isSubmitting}>
                        {bankForm.formState.isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Verify & Save
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* COMPENSATION TAB                                                   */}
        {/* ================================================================= */}
        <TabsContent value="compensation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Compensation Details
              </CardTitle>
              <CardDescription>Your salary and pay structure (view only)</CardDescription>
            </CardHeader>
            <CardContent>
              {compensation ? (
                <div className="space-y-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4 space-y-1">
                      <p className="text-xs text-muted-foreground">Pay Type</p>
                      <p className="text-lg font-semibold capitalize">{compensation.payType}</p>
                    </div>

                    {compensation.payType === 'hourly' ? (
                      <div className="rounded-lg border p-4 space-y-1">
                        <p className="text-xs text-muted-foreground">Hourly Rate</p>
                        <p className="text-lg font-semibold">
                          ₦{(compensation.hourlyRate ?? 0).toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/hr</span>
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border p-4 space-y-1">
                        <p className="text-xs text-muted-foreground">Monthly Salary</p>
                        <p className="text-lg font-semibold">
                          ₦{(compensation.monthlySalary ?? 0).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {compensation.overtimeRate != null && (
                      <div className="rounded-lg border p-4 space-y-1">
                        <p className="text-xs text-muted-foreground">Overtime Rate</p>
                        <p className="text-lg font-semibold">
                          ₦{compensation.overtimeRate.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/hr</span>
                        </p>
                      </div>
                    )}

                    {compensation.bonusPerOrder != null && (
                      <div className="rounded-lg border p-4 space-y-1">
                        <p className="text-xs text-muted-foreground">Bonus Per Order</p>
                        <p className="text-lg font-semibold">
                          ₦{compensation.bonusPerOrder.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {!compensation.active && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-3 text-sm text-amber-800 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Compensation plan is currently inactive. Contact your manager for details.
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No compensation details have been set yet. Contact your manager.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
