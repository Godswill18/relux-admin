// ============================================================================
// SERVICES PAGE - Service & Pricing Management
// ============================================================================

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useServiceStore } from '@/stores/useServiceStore';
import { ServicesTab } from './ServicesTab';
import { CategoriesTab } from './CategoriesTab';
import { ServiceLevelsTab } from './ServiceLevelsTab';
import { PickupWindowsTab } from './PickupWindowsTab';
import { DeliveryZonesTab } from './DeliveryZonesTab';

const TABS = [
  { value: 'services',    label: 'Services' },
  { value: 'categories',  label: 'Categories' },
  { value: 'levels',      label: 'Service Levels' },
  { value: 'pickup',      label: 'Pickup Windows' },
  { value: 'delivery',    label: 'Delivery Zones' },
] as const;

type TabValue = typeof TABS[number]['value'];

const TAB_META: Record<TabValue, { title: string; description: string }> = {
  services:   { title: 'Services',          description: 'Manage available laundry services' },
  categories: { title: 'Service Categories', description: 'Manage item categories and base pricing' },
  levels:     { title: 'Service Levels',     description: 'Configure pricing tiers and delivery speeds' },
  pickup:     { title: 'Pickup Windows',     description: 'Manage available pickup time slots' },
  delivery:   { title: 'Delivery Zones',     description: 'Configure delivery areas and pricing' },
};

export default function ServicesPage() {
  const {
    fetchServices, fetchCategories, fetchServiceLevels,
    fetchPickupWindows, fetchDeliveryZones,
  } = useServiceStore();

  const [activeTab, setActiveTab] = useState<TabValue>('services');

  useEffect(() => {
    fetchServices();
    fetchCategories();
    fetchServiceLevels();
    fetchPickupWindows();
    fetchDeliveryZones();
  }, [fetchServices, fetchCategories, fetchServiceLevels, fetchPickupWindows, fetchDeliveryZones]);

  const meta = TAB_META[activeTab];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Services & Pricing</h1>
        <p className="text-sm text-muted-foreground">Manage services, categories, pricing, and logistics</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-4">
        {/* ── Mobile: select dropdown ───────────────────────────────────────── */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Desktop: tab strip ────────────────────────────────────────────── */}
        <TabsList className="hidden md:flex">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* ── Tab content ───────────────────────────────────────────────────── */}
        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <Card>
              <CardHeader>
                <CardTitle>{TAB_META[t.value].title}</CardTitle>
                <CardDescription>{TAB_META[t.value].description}</CardDescription>
              </CardHeader>
              <CardContent>
                {t.value === 'services'    && <ServicesTab />}
                {t.value === 'categories'  && <CategoriesTab />}
                {t.value === 'levels'      && <ServiceLevelsTab />}
                {t.value === 'pickup'      && <PickupWindowsTab />}
                {t.value === 'delivery'    && <DeliveryZonesTab />}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
