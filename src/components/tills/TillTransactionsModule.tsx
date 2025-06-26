import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TillStatusIndicator } from "./TillStatusIndicator";
import { toast } from "sonner";
import { useCurrencySymbols } from "../../hooks/useCurrency";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from "../ui/alert";
import { PageLayout, PageHeader, GridLayout, EmptyState, FlexLayout, ActionBar } from "../layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../ui/table";
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
      <PageLayout>
        <PageHeader
          icon={<Receipt className="h-6 w-6" />}
          title="Till Transactions"
          description="Record till transactions and view balances"
        />

        <TillStatusIndicator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Access Required
            </CardTitle>
            <CardDescription>
              You need to be signed into a till to record transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You must be signed into a till to record transactions. Please visit the Tills module to sign in.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        icon={<Receipt className="h-6 w-6" />}
        title="Till Transactions"
        description="Record till transactions and view balances"
      />

      <TillStatusIndicator />

      {/* Transaction Form */}
      <Card>
        <CardHeader>
          <CardTitle>Record Transaction</CardTitle>
          <CardDescription>
            Add cash in, cash out, or adjustment transactions to your till
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <GridLayout cols={1} mdCols={3}>
              <div className="space-y-2">
                <Label htmlFor="transactionType">Transaction Type</Label>
                <Select value={transactionType} onValueChange={(value) => setTransactionType(value as TransactionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_in">
                      <FlexLayout gap={2}>
                        <Plus className="h-3 w-3" />
                        Cash In
                      </FlexLayout>
                    </SelectItem>
                    <SelectItem value="cash_out">
                      <FlexLayout gap={2}>
                        <Minus className="h-3 w-3" />
                        Cash Out
                      </FlexLayout>
                    </SelectItem>
                    <SelectItem value="adjustment">
                      <FlexLayout gap={2}>
                        <DollarSign className="h-3 w-3" />
                        Adjustment
                      </FlexLayout>
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
            </GridLayout>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter transaction notes..."
              />
            </div>

            <Button type="submit" className="w-full">
              Record Transaction
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Till Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Current Till Balances</CardTitle>
          <CardDescription>
            Real-time balances for all currencies in your till
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tillBalances.length > 0 ? (
            <GridLayout cols={1} mdCols={2} lgCols={3}>
              {tillBalances.map((balance) => (
                <Card key={balance.currencyCode}>
                  <CardContent className="p-4">
                    <FlexLayout align="between">
                      <div>
                        <h3 className="font-medium">{balance.currencyCode}</h3>
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatCurrency(balance.balance, balance.currencyCode)}
                        </div>
                        <Badge variant={balance.balance >= 0 ? "secondary" : "destructive"}>
                          {balance.balance >= 0 ? "Positive" : "Negative"}
                        </Badge>
                      </div>
                    </FlexLayout>
                  </CardContent>
                </Card>
              ))}
            </GridLayout>
          ) : (
            <EmptyState
              icon={<DollarSign />}
              title="No balances yet"
              description="Record your first transaction to see till balances appear here"
            />
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transaction History ({recentTransactions.length})</span>
            <FlexLayout gap={2}>
              <Label htmlFor="tillFilter">Filter by Till:</Label>
              <Select value={tillFilter} onValueChange={setTillFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tills</SelectItem>
                  {tills.map((till) => (
                    <SelectItem key={till._id} value={till.tillId}>
                      {till.tillName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FlexLayout>
          </CardTitle>
          <CardDescription>
            View all recent transactions for your till
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction._id}>
                  <TableCell>
                    <Badge variant={getTransactionTypeVariant(transaction.type)}>
                      <FlexLayout gap={1}>
                        {getTransactionIcon(transaction.type)}
                        {transaction.type.replace('_', ' ').toUpperCase()}
                      </FlexLayout>
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.currency}
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </TableCell>
                  <TableCell>
                    {transaction.notes && (
                      <span className="text-sm text-muted-foreground">
                        {transaction.notes}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.user?.name && (
                      <span className="text-sm">{transaction.user.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(transaction._creationTime)}
                  </TableCell>
                </TableRow>
              ))}

              {recentTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={<Receipt />}
                      title="No transactions yet"
                      description="Record your first transaction using the form above to start tracking till activity"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}