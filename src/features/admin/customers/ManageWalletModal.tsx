// ============================================================================
// MANAGE WALLET MODAL - View balance, credit or debit customer wallet
// ============================================================================

import { useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { toast } from 'sonner';
import { Loader2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// SCHEMAS
// ============================================================================

const walletAmountSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
});

type WalletAmountForm = z.infer<typeof walletAmountSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface ManageWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any | null;
}

export function ManageWalletModal({ open, onOpenChange, customer }: ManageWalletModalProps) {
  const { fetchWallet, fetchWalletTransactions, creditWallet, debitWallet } = useCustomerStore();

  const [wallet, setWallet] = useState<{ _id: string; balance: number } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const customerDoc = customer?.customerId;
  const customerId = customerDoc?._id || customerDoc?.id;

  const creditForm = useForm<WalletAmountForm>({
    resolver: zodResolver(walletAmountSchema),
    defaultValues: { amount: 0, reason: '' },
  });

  const debitForm = useForm<WalletAmountForm>({
    resolver: zodResolver(walletAmountSchema),
    defaultValues: { amount: 0, reason: '' },
  });

  const loadWalletData = async () => {
    if (!customerId) return;
    setLoadingData(true);
    try {
      const [walletData, txData] = await Promise.all([
        fetchWallet(customerId),
        fetchWalletTransactions(customerId),
      ]);
      setWallet(walletData);
      setTransactions(txData);
    } catch {
      toast.error('Failed to load wallet data');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setWallet(null);
      setTransactions([]);
      creditForm.reset({ amount: 0, reason: '' });
      debitForm.reset({ amount: 0, reason: '' });
      return;
    }
    loadWalletData();
  }, [open, customerId]);

  const onCredit = async (data: WalletAmountForm) => {
    if (!customerId) return;
    try {
      const updated = await creditWallet(customerId, data.amount, data.reason);
      setWallet(updated);
      toast.success(`₦${data.amount.toLocaleString()} credited to wallet`);
      creditForm.reset({ amount: 0, reason: '' });
      loadWalletData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to credit wallet');
    }
  };

  const onDebit = async (data: WalletAmountForm) => {
    if (!customerId) return;
    try {
      const updated = await debitWallet(customerId, data.amount, data.reason);
      setWallet(updated);
      toast.success(`₦${data.amount.toLocaleString()} debited from wallet`);
      debitForm.reset({ amount: 0, reason: '' });
      loadWalletData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to debit wallet');
    }
  };

  if (!customer) return null;

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Manage Wallet"
      description={`Wallet for ${customer.name}`}
      className="max-w-lg"
    >
      {/* Balance */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Current Balance</span>
        </div>
        {loadingData ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <span className="text-xl font-bold">
            ₦{(wallet?.balance ?? 0).toLocaleString()}
          </span>
        )}
      </div>

      <Separator className="my-4" />

      {/* Actions */}
      <Tabs defaultValue="credit">
        <TabsList className="w-full">
          <TabsTrigger value="credit" className="flex-1">
            <TrendingUp className="mr-2 h-4 w-4" />
            Credit
          </TabsTrigger>
          <TabsTrigger value="debit" className="flex-1">
            <TrendingDown className="mr-2 h-4 w-4" />
            Debit
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            History
          </TabsTrigger>
        </TabsList>

        {/* Credit tab */}
        <TabsContent value="credit" className="mt-4">
          <Form {...creditForm}>
            <form onSubmit={creditForm.handleSubmit(onCredit)} className="space-y-4">
              <FormField
                control={creditForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₦)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={creditForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Compensation, Refund..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={creditForm.formState.isSubmitting}
              >
                {creditForm.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Funds
              </Button>
            </form>
          </Form>
        </TabsContent>

        {/* Debit tab */}
        <TabsContent value="debit" className="mt-4">
          <Form {...debitForm}>
            <form onSubmit={debitForm.handleSubmit(onDebit)} className="space-y-4">
              <FormField
                control={debitForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₦)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={debitForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Order payment, Fee..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={debitForm.formState.isSubmitting}
              >
                {debitForm.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Deduct Funds
              </Button>
            </form>
          </Form>
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history" className="mt-4">
          {loadingData ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-6">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transactions.map((tx: any, i) => (
                <div
                  key={tx._id || i}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <Badge
                      variant={tx.type === 'credit' ? 'default' : 'destructive'}
                      className="capitalize text-xs"
                    >
                      {tx.type}
                    </Badge>
                    <p className="text-muted-foreground text-xs mt-1">{tx.reason}</p>
                    {tx.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-destructive'}`}
                  >
                    {tx.type === 'credit' ? '+' : '-'}₦{(tx.amount ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </ModalForm>
  );
}
