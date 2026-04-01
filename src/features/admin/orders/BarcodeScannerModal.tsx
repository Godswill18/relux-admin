// ============================================================================
// BARCODE SCANNER MODAL - Scan QR code → redirect to Delivery Confirm page
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

// react-qr-scanner (jsQR based, default export)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no types for this package
import QrReader from 'react-qr-scanner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Path to navigate to after a successful scan. Defaults to /admin/orders/delivery-confirm */
  confirmPath?: string;
}

export function BarcodeScannerModal({ open, onOpenChange, confirmPath = '/admin/orders/delivery-confirm' }: Props) {
  const navigate = useNavigate();
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const scannedRef = useRef(false); // prevent duplicate navigations per session

  // Reset on open
  useEffect(() => {
    if (open) {
      scannedRef.current = false;
      setManualMode(false);
      setManualInput('');
      setCameraError(false);
    }
  }, [open]);

  const navigateToConfirm = (qrCode: string) => {
    const trimmed = qrCode.trim();
    if (!trimmed || scannedRef.current) return;
    scannedRef.current = true;
    onOpenChange(false);
    navigate(`${confirmPath}?qr=${encodeURIComponent(trimmed)}`);
  };

  const handleCameraScan = (data: any) => {
    if (!data) return;
    const text = typeof data === 'string' ? data : data?.text;
    if (text) navigateToConfirm(text);
  };

  const handleCameraError = (err: any) => {
    console.error('Camera error:', err);
    setCameraError(true);
    setManualMode(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) navigateToConfirm(manualInput.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Scan Order QR Code
          </DialogTitle>
          <DialogDescription>
            Scan the QR code on the receipt. You'll be taken to a confirmation page before marking
            the order as delivered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera scanner */}
          {!manualMode && !cameraError && (
            <div className="space-y-2">
              <div className="relative overflow-hidden rounded-lg border bg-black">
                <QrReader
                  delay={300}
                  onScan={handleCameraScan}
                  onError={handleCameraError}
                  style={{ width: '100%' }}
                  constraints={{ audio: false, video: { facingMode: 'environment' } }}
                />
                {/* Corner overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-40 relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Point camera at the QR code on the receipt
              </p>
            </div>
          )}

          <Separator />

          {/* Manual input toggle */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setManualMode((v) => !v)}
            >
              <Keyboard className="mr-2 h-4 w-4" />
              {manualMode && !cameraError ? 'Use Camera Instead' : 'Enter Code Manually'}
            </Button>

            {(manualMode || cameraError) && (
              <form onSubmit={handleManualSubmit} className="space-y-2">
                <Label htmlFor="qr-manual">QR Code / Order Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="qr-manual"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="RELUX-RLX-MAR2026-001-..."
                    className="font-mono text-xs"
                    autoFocus
                  />
                  <Button type="submit" disabled={!manualInput.trim()}>Go</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Enter the full QR code value printed below the barcode on the receipt.
                </p>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
