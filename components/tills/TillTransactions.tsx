"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PlusCircle,
  MinusCircle,
  ArrowUpDown,
  Settings,
  Activity,
  Clock,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  History
} from "lucide-react";

export function TillTransactions() {
  const [transactionType, setTransactionType] = useState<"cash_in" | "cash_out" | "adjustment">("cash_in");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [notes, setNotes] = useState("");
  const [currentSessionOnly, setCurrentSessionOnly] = useState(true);

  // Queries
  const currentTill = useQuery(api.tills.getCurrentUserTill, {});
  const tillBalances = useQuery(api.tillTransactions.getCurrentTillBalances, {}) || [];
  const transactions = useQuery(api.tillTransactions.getCurrentTillTransactions, { 
    limit: 50,
    currentSessionOnly,
  }) || [];
  const currencies = useQuery(api.currencies.list, {}) || [];
  const userPermissions = useQuery(api.users.getCurrentUserPermissions, {});

  // Mutations
  const createTransaction = useMutation(api.tillTransactions.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentTill) {
      toast.error("You must be signed into a till to create transactions");
      return;
    }

    if (!amount || !currency) {
      toast.error("Please fill in all required fields");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    try {
      await createTransaction({
        tillId: currentTill.tillId,
        type: transactionType,
        amount: numAmount,
        currency,
        notes: notes || undefined,
      });

      // Reset form
      setAmount("");
      setNotes("");
      toast.success("Transaction created successfully");
    } catch {
      toast.error("Failed to create transaction");
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    // Show amount with currency code for clarity
    return `${formatted} ${currency}`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "cash_in":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "cash_out":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "currency_buy":
      case "currency_sell":
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "cash_in":
        return "text-green-600";
      case "cash_out":
        return "text-red-600";
      case "currency_buy":
      case "currency_sell":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  if (!currentTill) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Till Session</h3>
            <p className="text-muted-foreground mb-4">
              You need to sign into a till to manage transactions.
            </p>
            <p className="text-sm text-muted-foreground">
              Go to the Till Management tab to sign into a till.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Till Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Current Till: {currentTill.tillName}
          </CardTitle>
          <CardDescription>
            Cash balances and transaction management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tillBalances.map((balance) => (
              <div key={balance.currencyCode} className="text-center">
                <div className="text-2xl font-bold">
                  {formatCurrency(balance.balance, balance.currencyCode)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {balance.currencyCode}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="new-transaction" className="space-y-4">
        <TabsList>
          <TabsTrigger value="new-transaction">New Transaction</TabsTrigger>
          <TabsTrigger value="transaction-history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="new-transaction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Record Cash Movement
              </CardTitle>
              <CardDescription>
                Add or remove cash from the till
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Transaction Type */}
                  <div className="space-y-2">
                    <Label htmlFor="transactionType">Transaction Type *</Label>
                    <Select value={transactionType} onValueChange={(value: "cash_in" | "cash_out" | "adjustment") => setTransactionType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash_in">
                          <div className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4 text-green-600" />
                            Cash In
                          </div>
                        </SelectItem>
                        <SelectItem value="cash_out">
                          <div className="flex items-center gap-2">
                            <MinusCircle className="h-4 w-4 text-red-600" />
                            Cash Out
                          </div>
                        </SelectItem>
                        <SelectItem value="adjustment">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-blue-600" />
                            Balance Adjustment
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency *</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((curr) => (
                          <SelectItem key={curr._id} value={curr.code}>
                            <div className="flex items-center gap-2">
                              <span>{curr.flag}</span>
                              <span>{curr.code} - {curr.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes about this transaction..."
                    rows={3}
                  />
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">Transaction Types</p>
                      <ul className="text-blue-700 space-y-1">
                        <li>• <strong>Cash In:</strong> Add cash to the till (increases balance)</li>
                        <li>• <strong>Cash Out:</strong> Remove cash from the till (decreases balance)</li>
                        <li>• <strong>Balance Adjustment:</strong> Set balance to specific amount</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button type="submit" disabled={!amount || !currency}>
                  Record Transaction
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transaction-history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col space-y-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                  <CardDescription>
                    Recent transactions for {currentTill.tillName}
                  </CardDescription>
                </div>
                
                {/* Session Filter Toggle for Tellers */}
                {userPermissions && !userPermissions.isManager && !userPermissions.isComplianceOfficer && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={currentSessionOnly ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentSessionOnly(true)}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Current Session
                    </Button>
                    <Button
                      variant={!currentSessionOnly ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentSessionOnly(false)}
                    >
                      <History className="h-4 w-4 mr-2" />
                      All Sessions
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction._id}>
                      <TableCell className="text-sm">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <span className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                            {transaction.type.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {transaction.amount !== undefined 
                          ? formatCurrency(transaction.amount, transaction.currency || "USD")
                          : `${formatCurrency(transaction.fromAmount, transaction.fromCurrency)} → ${formatCurrency(transaction.toAmount, transaction.toCurrency)}`
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.currency || `${transaction.fromCurrency}→${transaction.toCurrency}`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {transaction.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}

                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="text-center py-8">
                          <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <div className="text-lg font-medium">No transactions yet</div>
                          <div className="text-muted-foreground">
                            Start recording cash movements to see transaction history
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}