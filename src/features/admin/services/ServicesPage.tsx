// ============================================================================
// SERVICES PAGE - Service & Pricing Management
// ============================================================================

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useServiceStore } from '@/stores/useServiceStore';
import { ServicesTab } from './ServicesTab';
import { CategoriesTab } from './CategoriesTab';
import { ServiceLevelsTab } from './ServiceLevelsTab';
import { PickupWindowsTab } from './PickupWindowsTab';
import { DeliveryZonesTab } from './DeliveryZonesTab';

// ============================================================================
// SERVICES PAGE COMPONENT
// ============================================================================

export default function ServicesPage() {
  const {
    fetchServices,
    fetchCategories,
    fetchServiceLevels,
    fetchPickupWindows,
    fetchDeliveryZones,
  } = useServiceStore();

  const [activeTab, setActiveTab] = useState('services');

  // Fetch all data on mount
  useEffect(() => {
    fetchServices();
    fetchCategories();
    fetchServiceLevels();
    fetchPickupWindows();
    fetchDeliveryZones();
  }, [fetchServices, fetchCategories, fetchServiceLevels, fetchPickupWindows, fetchDeliveryZones]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Services & Pricing</h1>
        <p className="text-muted-foreground">Manage services, categories, pricing, and logistics</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="levels">Service Levels</TabsTrigger>
          <TabsTrigger value="pickup">Pickup Windows</TabsTrigger>
          <TabsTrigger value="delivery">Delivery Zones</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
              <CardDescription>Manage available laundry services</CardDescription>
            </CardHeader>
            <CardContent>
              <ServicesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Service Categories</CardTitle>
              <CardDescription>Manage item categories and base pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoriesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="levels">
          <Card>
            <CardHeader>
              <CardTitle>Service Levels</CardTitle>
              <CardDescription>Configure pricing tiers and delivery speeds</CardDescription>
            </CardHeader>
            <CardContent>
              <ServiceLevelsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pickup">
          <Card>
            <CardHeader>
              <CardTitle>Pickup Windows</CardTitle>
              <CardDescription>Manage available pickup time slots</CardDescription>
            </CardHeader>
            <CardContent>
              <PickupWindowsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Zones</CardTitle>
              <CardDescription>Configure delivery areas and pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <DeliveryZonesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
