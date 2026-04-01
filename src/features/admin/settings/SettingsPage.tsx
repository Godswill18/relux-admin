// ============================================================================
// SETTINGS PAGE - System Configuration
// ============================================================================

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Save, Shield } from 'lucide-react';
import { RolesPermissionsTab } from './tabs/RolesPermissionsTab';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground text-sm">Configure system-wide settings</p>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Tab strip — scrollable on mobile */}
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max min-w-full sm:w-auto sm:min-w-0">
            <TabsTrigger value="business" className="flex-1 sm:flex-none text-xs sm:text-sm whitespace-nowrap">
              Business Info
            </TabsTrigger>
            <TabsTrigger value="email" className="flex-1 sm:flex-none text-xs sm:text-sm whitespace-nowrap">
              Email/SMS
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex-1 sm:flex-none text-xs sm:text-sm whitespace-nowrap">
              Payment
            </TabsTrigger>
            <TabsTrigger value="general" className="flex-1 sm:flex-none text-xs sm:text-sm whitespace-nowrap">
              General
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex-1 sm:flex-none text-xs sm:text-sm whitespace-nowrap flex items-center gap-1">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              Roles
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Business Info ──────────────────────────────────────────────── */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Configure your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Relux Laundry Services"
                  defaultValue="Relux Laundry Services"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="businessEmail">Business Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    placeholder="info@reluxlaundry.com"
                    defaultValue="info@reluxlaundry.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="businessPhone">Business Phone</Label>
                  <Input
                    id="businessPhone"
                    type="tel"
                    placeholder="+234 800 000 0000"
                    defaultValue="+234 800 000 0000"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Textarea
                  id="businessAddress"
                  placeholder="123 Main Street, Lagos, Nigeria"
                  defaultValue="123 Main Street, Lagos, Nigeria"
                  rows={3}
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button className="w-full sm:w-auto">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email / SMS ───────────────────────────────────────────────── */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email & SMS Configuration</CardTitle>
              <CardDescription>Configure email and SMS providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SMTP Settings */}
              <div className="space-y-4">
                <h3 className="text-base font-medium">SMTP Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input id="smtpHost" placeholder="smtp.gmail.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input id="smtpPort" type="number" placeholder="587" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="smtpUsername">SMTP Username</Label>
                    <Input id="smtpUsername" placeholder="your-email@gmail.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input id="smtpPassword" type="password" placeholder="••••••••" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Twilio Settings */}
              <div className="space-y-4">
                <h3 className="text-base font-medium">Twilio SMS Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="twilioSid">Account SID</Label>
                    <Input id="twilioSid" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="twilioToken">Auth Token</Label>
                    <Input id="twilioToken" type="password" placeholder="••••••••" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="twilioPhone">Phone Number</Label>
                    <Input id="twilioPhone" placeholder="+1 234 567 8900" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button className="w-full sm:w-auto">
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payment ───────────────────────────────────────────────────── */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway Configuration</CardTitle>
              <CardDescription>Configure payment gateway API keys</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Payment gateway settings are managed in the Payment Management section.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── General ───────────────────────────────────────────────────── */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>System-wide configuration options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Input id="currency" defaultValue="NGN (₦)" disabled />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" defaultValue="Africa/Lagos" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Input id="dateFormat" defaultValue="MMM dd, yyyy" />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button className="w-full sm:w-auto">
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Roles & Permissions ───────────────────────────────────────── */}
        <TabsContent value="roles">
          <RolesPermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
