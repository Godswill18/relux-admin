// ============================================================================
// USE PAYMENT SOCKET - Real-time payment updates via WebSocket
// ============================================================================

import { useEffect } from 'react';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { useAuthStore } from '@/stores/useAuthStore';
import socketClient from '@/lib/socket/client';

export function usePaymentSocket() {
  const fetchPayments               = usePaymentStore((s) => s.fetchPayments);
  const prependPaystackTransaction  = usePaymentStore((s) => s.prependPaystackTransaction);
  const token                       = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    const socket = socketClient.connect(token);

    const joinWhenConnected = () => { socket.emit('join-payments'); };

    if (socket.connected) {
      joinWhenConnected();
    } else {
      socket.once('connect', joinWhenConnected);
    }

    // Existing order payment confirmed — refresh the order payments list
    const handlePaymentConfirmed = () => { fetchPayments(); };

    // Paystack charge.success — upsert (updates pending row or prepends new one)
    const handlePaystackSuccess = (data: any) => {
      prependPaystackTransaction({
        ...data,
        _id: data.transactionId,
        status: 'paid',
        paidAt: data.paidAt || new Date().toISOString(),
        createdAt: data.paidAt || new Date().toISOString(),
      });
    };

    // Paystack charge.failed — upsert with failed status
    const handlePaystackFailed = (data: any) => {
      prependPaystackTransaction({
        ...data,
        _id: data.transactionId,
        status: 'failed',
        createdAt: new Date().toISOString(),
      });
    };

    socket.on('payment:confirmed',        handlePaymentConfirmed);
    socket.on('payment:paystack-success', handlePaystackSuccess);
    socket.on('payment:paystack-failed',  handlePaystackFailed);

    return () => {
      socket.off('payment:confirmed',        handlePaymentConfirmed);
      socket.off('payment:paystack-success', handlePaystackSuccess);
      socket.off('payment:paystack-failed',  handlePaystackFailed);
      socket.off('connect', joinWhenConnected);
      socket.emit('leave-payments');
    };
  }, [token, fetchPayments, prependPaystackTransaction]);
}
