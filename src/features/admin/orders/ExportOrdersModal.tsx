// ============================================================================
// EXPORT ORDERS MODAL — PDF & Excel with date range + optional filters
// ============================================================================

import { useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { ModalForm } from '@/components/shared/ModalForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

interface ExportOrdersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

async function triggerDownload(
  endpoint: string,
  params: Record<string, string>,
  filename: string,
  mimeType: string,
) {
  const response = await apiClient.get(endpoint, {
    params,
    responseType: 'blob',
  });

  const url  = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }));
  const link = document.createElement('a');
  link.href  = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function buildFilename(startDate: string, endDate: string, ext: string): string {
  const start = startDate || 'all';
  const end   = endDate   || 'all';
  return `orders-report-${start}_to_${end}.${ext}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExportOrdersModal({ open, onOpenChange }: ExportOrdersModalProps) {
  const [startDate,     setStartDate]     = useState('');
  const [endDate,       setEndDate]       = useState('');
  const [status,        setStatus]        = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [orderType,     setOrderType]     = useState('all');
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingPdf,  setExportingPdf]  = useState(false);

  const buildParams = (): Record<string, string> => {
    const p: Record<string, string> = {};
    if (startDate)                   p.startDate     = startDate;
    if (endDate)                     p.endDate       = endDate;
    if (status        !== 'all')     p.status        = status;
    if (paymentStatus !== 'all')     p.paymentStatus = paymentStatus;
    if (orderType     !== 'all')     p.orderType     = orderType;
    return p;
  };

  const handleExcelExport = async () => {
    setExportingXlsx(true);
    try {
      await triggerDownload(
        '/orders/export/excel',
        buildParams(),
        buildFilename(startDate, endDate, 'xlsx'),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      toast.success('Excel report downloaded');
    } catch {
      toast.error('Failed to export Excel report');
    } finally {
      setExportingXlsx(false);
    }
  };

  const handlePdfExport = async () => {
    setExportingPdf(true);
    try {
      await triggerDownload(
        '/orders/export/pdf',
        buildParams(),
        buildFilename(startDate, endDate, 'pdf'),
        'application/pdf',
      );
      toast.success('PDF report downloaded');
    } catch {
      toast.error('Failed to export PDF report');
    } finally {
      setExportingPdf(false);
    }
  };

  const isExporting = exportingXlsx || exportingPdf;

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Export Orders"
      description="Download a full report of orders filtered by date range and status."
    >
      <div className="space-y-5">

        {/* Date Range */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Date Range</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="export-start">Start Date</Label>
              <Input
                id="export-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-end">End Date</Label>
              <Input
                id="export-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
          </div>
          {!startDate && !endDate && (
            <p className="text-xs text-muted-foreground">
              No date selected — all orders will be exported.
            </p>
          )}
        </div>

        <Separator />

        {/* Optional Filters */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Optional Filters</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Order Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="picked-up">Picked Up</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="washing">Washing</SelectItem>
                  <SelectItem value="ironing">Ironing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pickup-delivery">Pickup & Delivery</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Export Buttons */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Export Format</div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleExcelExport}
              disabled={isExporting}
              variant="outline"
              className="h-16 flex-col gap-1.5 border-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20"
            >
              {exportingXlsx
                ? <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                : <FileSpreadsheet className="h-5 w-5 text-green-600" />
              }
              <span className="text-xs font-medium">
                {exportingXlsx ? 'Generating…' : 'Export Excel (.xlsx)'}
              </span>
            </Button>

            <Button
              onClick={handlePdfExport}
              disabled={isExporting}
              variant="outline"
              className="h-16 flex-col gap-1.5 border-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              {exportingPdf
                ? <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                : <FileText className="h-5 w-5 text-red-600" />
              }
              <span className="text-xs font-medium">
                {exportingPdf ? 'Generating…' : 'Export PDF'}
              </span>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-1">
            <FileDown className="inline h-3 w-3 mr-1" />
            Exports full database records — not just the current page view.
          </p>
        </div>
      </div>
    </ModalForm>
  );
}
