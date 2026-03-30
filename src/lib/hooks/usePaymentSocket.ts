// ============================================================================
// USE PAYMENT SOCKET - Real-time payment updates via WebSocket
// ============================================================================

import { useEffect } from 'react';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { useAuthStore } from '@/stores/useAuthStore';
import socketClient from '@/lib/socket/client';

export function usePaymentSocket() {
  const fetchPayments = usePaymentStore((s) => s.fetchPayments);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    const socket = socketClient.connect(token);

    const joinWhenConnected = () => {
      socket.emit('join-payments');
    };

    // If already connected, join immediately; otherwise wait for connect
    if (socket.connected) {
      joinWhenConnected();
    } else {
      socket.once('connect', joinWhenConnected);
    }

    const handlePaymentConfirmed = () => {
      fetchPayments();
    };

    socket.on('payment:confirmed', handlePaymentConfirmed);

    return () => {
      socket.off('payment:confirmed', handlePaymentConfirmed);
      socket.off('connect', joinWhenConnected);
      socket.emit('leave-payments');
    };
  }, [token, fetchPayments]);
}
