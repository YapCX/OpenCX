import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { TillStatusIndicator } from "./TillStatusIndicator";
import { toast } from "sonner";
import { useCurrencySymbols } from "../hooks/useCurrency";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "./ui/table";
import {
  Receipt,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Minus
} from "lucide-react";

type TransactionType = "cash_in" | "cash_out" | "adjustment";

export function TillTransactionsModule() {
  const [transactionType, setTransactionType] = useState<TransactionType>("cash_in");
  const [selectedCurrency, setSelectedCurrency] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [tillFilter, setTillFilter] = useState("all");

  const currentUserTill = useQuery(api.tills.getCurrentUserTill);
  const currencies = useQuery(api.currencies.list, {}) || [];
  const baseCurrency = useQuery(api.settings.getBaseCurrency) || "USD";
  const { formatCurrency } = useCurrencySymbols();

  // Re-enabled till balances query
  const tillBalances = useQuery(
    api.tillTransactions.getTillBalance,
    currentUserTill ? { tillId: currentUserTill.tillId } : "skip"
  ) || [];

  const recentTransactions = useQuery(
    api.tillTransactions.list,
    currentUserTill ? {
      tillId: tillFilter && tillFilter !== "all" ? tillFilter : undefined,
      limit: 50,
    } : "skip"
  ) || [];
  const tills = useQuery(
    api.tills.list,
    currentUserTill ? { searchTerm: "" } : "skip"
  ) || [];

  const createTransaction = useMutation(api.tillTransactions.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserTill) {
      toast.error("You must be signed into a till to create transactions");
      return;
    }

    if (!selectedCurrency || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createTransaction({
        type: transactionType,
        currency: selectedCurrency,
        amount: parseFloat(amount),
        notes: notes || undefined
      });

      toast.success("Transaction recorded successfully");

      // Reset form
      setAmount("");
      setNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to record transaction");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTransactionTypeVariant = (type: string) => {
    switch (type) {
      case "cash_in": return "secondary";
      case "cash_out": return "destructive";
      case "adjustment": return "default";
      case "currency_buy": return "secondary";
      case "currency_sell": return "default";
      default: return "outline";
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "cash_in":
      case "currency_buy":
        return <TrendingUp className="h-3 w-3" />;
      case "cash_out":
      case "currency_sell":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <DollarSign className="h-3 w-3" />;
    }
  };

  if (!currentUserTill) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Till Transactions
          </h1>
          <p className="text-muted-foreground">Record till transactions and view balances</p>
        </div>

        <TillStatusIndicator />

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must be signed into a till to record transactions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Till Transactions
        </h1>
        <p className="text-muted-foreground">Record till transactions and view balances</p>
      </div>

      <TillStatusIndicator />

      {/* Transaction Form */}
      <Card>
        <CardHeader>
          <CardTitle>Record Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transactionType">Transaction Type</Label>
                <Select value={transactionType} onValueChange={(value) => setTransactionType(value as TransactionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_in">
                      <div className="flex items-center gap-2">
                        <Plus className="h-3 w-3" />
                        Cash In
                      </div>
                    </SelectItem>
                    <SelectItem value="cash_out">
                      <div className="flex items-center gap-2">
                        <Minus className="h-3 w-3" />
                        Cash Out
                      </div>
                    </SelectItem>
                    <SelectItem value="adjustment">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />
                        Adjustment
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency._id} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Transaction notes..."
              />
            </div>

            <Button type="submit" className="gap-2">
              <Receipt className="h-4 w-4" />
              Record Transaction
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Till Balances */}
      {tillBalances.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tillBalances.map((balance: any) => (
            <Card key={balance.currencyCode} className="border-dashed">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{balance.currencyCode}</h3>
                    <p className="text-2xl font-bold">
                      {formatCurrency(balance.balance, balance.currencyCode)}
                    </p>
                  </div>
                  <Badge variant={balance.currencyCode === baseCurrency ? "default" : "secondary"}>
                    {balance.currencyCode === baseCurrency ? "Base" : "Foreign"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No till balances found. Record your first transaction to see balances.
        </div>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Select value={tillFilter} onValueChange={setTillFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Tills" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tills</SelectItem>
                {tills.map((till) => (
                  <SelectItem key={till._id} value={till.tillId}>
                    {till.tillName} ({till.tillId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Till</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((transaction: any) => (
                <TableRow key={transaction._id}>
                  <TableCell className="text-sm">
                    {formatDate(transaction._creationTime)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTransactionTypeVariant(transaction.type)} className="gap-1">
                      {getTransactionIcon(transaction.type)}
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {transaction.foreignCurrency || transaction.localCurrency || transaction.currency}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {transaction.foreignAmount && transaction.foreignCurrency
                      ? formatCurrency(transaction.foreignAmount, transaction.foreignCurrency)
                      : transaction.localAmount && transaction.localCurrency
                        ? formatCurrency(transaction.localAmount, transaction.localCurrency)
                        : transaction.amount && transaction.currency
                          ? formatCurrency(transaction.amount, transaction.currency)
                          : "—"
                    }
                  </TableCell>
                  <TableCell className="text-sm">
                    {transaction.tillId || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {transaction.user?.name || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.notes || "—"}
                  </TableCell>
                </TableRow>
              ))}

              {recentTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {tillFilter && tillFilter !== "all"
                      ? "No transactions found for the selected till."
                      : "No recent transactions found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}