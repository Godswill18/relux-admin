// ============================================================================
// SOCKET.IO LISTENER INITIALIZER - Centralized Socket Event Listeners
// ============================================================================

import socketClient from './client';
import { useOrderStore } from '@/stores/useOrderStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useLoyaltyStore } from '@/stores/useLoyaltyStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';

/**
 * Initialize all Socket.io event listeners for realtime updates
 * Should be called after successful authentication
 */
export const initializeSocketListeners = () => {
  const socket = socketClient.getSocket();

  if (!socket) {
    console.warn('Socket.io not connected. Cannot initialize listeners.');
    return;
  }

  console.log('🚀 Initializing all Socket.io listeners');

  // Initialize order store listeners
  try {
    useOrderStore.getState().initializeSocketListeners();
  } catch (error) {
    console.error('Failed to initialize order listeners:', error);
  }

  // Wallet balance updates
  socket.on('wallet:balance-updated', (data: { balance: number; transaction: any }) => {
    console.log('💰 Wallet balance updated:', data);

    // Update customer store if it has the customer data
    const customerStore = useCustomerStore.getState();
    if (customerStore.customers && Array.isArray(customerStore.customers)) {
      // Find and update the customer with the new wallet balance
      const updatedCustomers = customerStore.customers.map(customer => {
        if (customer.wallet) {
          return { ...customer, wallet: { ...customer.wallet, balance: data.balance } };
        }
        return customer;
      });

      // This assumes there's a way to update customers in the store
      // If not, we'll need to add a method to update wallet balance
    }

    // Show toast notification
    toast.success(`Wallet ${data.transaction?.type === 'credit' ? 'credited' : 'debited'}: ₦${data.transaction?.amount?.toLocaleString() || 0}`);
  });

  // Loyalty points updates
  socket.on('loyalty:points-updated', (data: { balance: number; transaction: any }) => {
    console.log('⭐ Loyalty points updated:', data);

    // Update customer store
    const customerStore = useCustomerStore.getState();
    if (customerStore.customers && Array.isArray(customerStore.customers)) {
      const updatedCustomers = customerStore.customers.map(customer => {
        return { ...customer, loyaltyPoints: data.balance };
      });
    }

    // Show toast notification
    toast.info(`Loyalty points ${data.transaction?.type === 'redeem' ? 'redeemed' : 'earned'}: ${Math.abs(data.transaction?.points || 0)} points`);
  });

  // Referral rewards
  socket.on('referral:rewarded', (data: { referralId: string; amount: number; refereeName: string }) => {
    console.log('🎁 Referral reward received:', data);
    toast.success(`You earned ₦${data.amount?.toLocaleString()} for referring ${data.refereeName}!`);
  });

  // New notifications
  socket.on('notification:new', (notification: any) => {
    console.log('🔔 New notification:', notification);
    toast.info(notification.title, {
      description: notification.body,
    });
  });

  // Payment status updates
  socket.on('payment:status-updated', (data: { orderId: string; status: string }) => {
    console.log('💳 Payment status updated:', data);
    toast.success(`Payment ${data.status.toLowerCase()}`);
  });

  // Shift ending soon — start countdown timer
  socket.on('shift:ending-soon', (data: { shiftId: string; endAt: string; remainingMs: number }) => {
    console.log('Shift ending soon:', data);
    const endTime = new Date(data.endAt).getTime();
    useAuthStore.getState().setShiftEnd(endTime);
    toast.warning('Your shift is ending soon!', {
      description: `You will be logged out in ${Math.ceil(data.remainingMs / 60000)} minute(s)`,
    });
  });

  // Shift ended — trigger auto-logout
  socket.on('shift:ended', (data: { shiftId: string; endAt: string }) => {
    console.log('Shift ended:', data);
    toast.error('Your shift has ended. You are being logged out.');
    // The ShiftCountdown component handles the actual logout via the auth store
    useAuthStore.getState().setShiftEnd(Date.now());
  });

  // Emergency override granted
  socket.on('shift:emergency-override', (data: { grantedBy: string; reason: string }) => {
    console.log('Emergency override granted:', data);
    toast.success(`Emergency access granted by ${data.grantedBy}`, {
      description: data.reason,
    });
  });

  console.log('All Socket.io listeners initialized successfully');
};

/**
 * Cleanup all Socket.io event listeners
 * Should be called on logout
 */
export const cleanupSocketListeners = () => {
  const socket = socketClient.getSocket();

  if (!socket) return;

  console.log('🧹 Cleaning up Socket.io listeners');

  // Remove all custom event listeners
  socket.off('wallet:balance-updated');
  socket.off('loyalty:points-updated');
  socket.off('referral:rewarded');
  socket.off('notification:new');
  socket.off('payment:status-updated');
  socket.off('order:status-updated');
  socket.off('order:created');
  socket.off('order:updated');
  socket.off('order:assigned');
  socket.off('shift:ending-soon');
  socket.off('shift:ended');
  socket.off('shift:emergency-override');

  console.log('✅ Socket.io listeners cleaned up');
};
