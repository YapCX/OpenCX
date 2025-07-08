"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeftRight,
  Calculator,
  User,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Save,
} from "lucide-react";
import { CustomerSelector } from "@/components/customers/CustomerSelector";

interface EditTransactionFormProps {
  transactionId: Id<"transactions"> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export function EditTransactionForm({ transactionId, isOpen, onClose, onSave }: EditTransactionFormProps) {
  const [transactionType, setTransactionType] = useState<"currency_buy" | "currency_sell">("currency_buy");
  const [fromCurrency, setFromCurrency] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toCurrency, setToCurrency] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [serviceFee, setServiceFee] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    _id: Id<"customers">;
    customerId: string;
    type: "individual" | "corporate";
    fullName?: string;
    businessName?: string;
    email?: string;
    phone?: string;
  } | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const transaction = useQuery(
    api.transactions.getById,
    transactionId ? { id: transactionId } : "skip"
  );
  const currencies = useQuery(api.currencies.list, {}) || [];
  const updateTransaction = useMutation(api.transactions.update);
  
  const calculateExchange = useQuery(
    api.transactions.calculateExchangeAmount,
    fromCurrency && toCurrency && fromAmount && !isNaN(parseFloat(fromAmount)) && !isCalculating
      ? {
          fromCurrency,
          toCurrency,
          amount: parseFloat(fromAmount),
        }
      : "skip"
  );

  // Load transaction data when it becomes available
  useEffect(() => {
    if (transaction) {
      setTransactionType(transaction.type as "currency_buy" | "currency_sell");
      setFromCurrency(transaction.fromCurrency);
      setFromAmount(transaction.fromAmount.toString());
      setToCurrency(transaction.toCurrency);
      setToAmount(transaction.toAmount.toString());
      setExchangeRate(transaction.exchangeRate.toString());
      setServiceFee((transaction.serviceFee || 0).toString());
      setPaymentMethod(transaction.paymentMethod || "");
      setCustomerName(transaction.customerName || "");
      setCustomerEmail(transaction.customerEmail || "");
      setCustomerPhone(transaction.customerPhone || "");
      setNotes(transaction.notes || "");
    }
  }, [transaction]);

  useEffect(() => {
    if (calculateExchange && !isCalculating) {
      setToAmount(calculateExchange.toAmount.toFixed(4));
      setExchangeRate(calculateExchange.exchangeRate.toFixed(6));
      setServiceFee(calculateExchange.serviceFee.toFixed(2));
    }
  }, [calculateExchange, isCalculating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transaction) {
      toast.error("Transaction not found");
      return;
    }
    
    if (!fromCurrency || !toCurrency || !fromAmount || !toAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(fromAmount) <= 0 || parseFloat(toAmount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsSaving(true);
    try {
      await updateTransaction({
        id: transaction._id,
        type: transactionType,
        fromCurrency,
        fromAmount: parseFloat(fromAmount),
        toCurrency,
        toAmount: parseFloat(toAmount),
        exchangeRate: parseFloat(exchangeRate),
        serviceFee: parseFloat(serviceFee) || 0,
        serviceFeeType: "flat",
        paymentMethod: paymentMethod || undefined,
        customerId: selectedCustomer?.customerId || undefined,
        customerName: customerName || undefined,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
      });

      toast.success(`Transaction ${transaction.transactionId} updated successfully`);
      onSave?.();
      onClose();
    } catch (error) {
      toast.error("Failed to update transaction");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwapCurrencies = () => {
    const tempCurrency = fromCurrency;
    const tempAmount = fromAmount;
    setFromCurrency(toCurrency);
    setFromAmount(toAmount);
    setToCurrency(tempCurrency);
    setToAmount(tempAmount);
    setTransactionType(transactionType === "currency_buy" ? "currency_sell" : "currency_buy");
  };

  const isAMLRequired = parseFloat(fromAmount) > 1000 || parseFloat(toAmount) > 1000;

  if (!transaction) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>Loading transaction details...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Edit Transaction
          </DialogTitle>
          <DialogDescription>
            Modify transaction {transaction.transactionId} (Status: {transaction.status})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transaction Type */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Transaction Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="transaction-type"
                      checked={transactionType === "currency_buy"}
                      onCheckedChange={(checked) => 
                        setTransactionType(checked ? "currency_buy" : "currency_sell")
                      }
                    />
                    <Label htmlFor="transaction-type" className="flex items-center gap-2">
                      {transactionType === "currency_buy" ? (
                        <>
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span>Buy Order</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <span>Sell Order</span>
                        </>
                      )}
                    </Label>
                  </div>
                  <Badge variant={transactionType === "currency_buy" ? "default" : "secondary"}>
                    {transactionType === "currency_buy" ? "Customer buying currency" : "Customer selling currency"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Exchange Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Exchange Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from-currency">From Currency</Label>
                    <Select value={fromCurrency} onValueChange={setFromCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            <div className="flex items-center gap-2">
                              <span>{currency.flag}</span>
                              <span>{currency.code}</span>
                              <span className="text-muted-foreground">- {currency.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="from-amount">Amount</Label>
                    <Input
                      id="from-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={fromAmount}
                      onChange={(e) => {
                        setFromAmount(e.target.value);
                        setIsCalculating(true);
                        setTimeout(() => setIsCalculating(false), 100);
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSwapCurrencies}
                    disabled={!fromCurrency || !toCurrency}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="to-currency">To Currency</Label>
                    <Select value={toCurrency} onValueChange={setToCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            <div className="flex items-center gap-2">
                              <span>{currency.flag}</span>
                              <span>{currency.code}</span>
                              <span className="text-muted-foreground">- {currency.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="to-amount">Amount</Label>
                    <Input
                      id="to-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={toAmount}
                      onChange={(e) => setToAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="exchange-rate">Exchange Rate</Label>
                    <Input
                      id="exchange-rate"
                      type="number"
                      step="0.000001"
                      placeholder="0.000000"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service-fee">Service Fee</Label>
                    <Input
                      id="service-fee"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={serviceFee}
                      onChange={(e) => setServiceFee(e.target.value)}
                    />
                  </div>
                </div>

                {isAMLRequired && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">AML Compliance Required</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      This transaction exceeds $1,000 and requires customer identification.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                  {isAMLRequired && <Badge variant="destructive">Required</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CustomerSelector
                  selectedCustomerId={selectedCustomer?.customerId}
                  onSelectCustomer={(customer) => {
                    setSelectedCustomer(customer);
                    if (customer) {
                      if (customer.type === "individual") {
                        setCustomerName(customer.fullName || "");
                      } else {
                        setCustomerName(customer.businessName || "");
                      }
                      setCustomerEmail(customer.email || "");
                      setCustomerPhone(customer.phone || "");
                    } else {
                      setCustomerName("");
                      setCustomerEmail("");
                      setCustomerPhone("");
                    }
                  }}
                  allowWalkIn={true}
                  required={isAMLRequired}
                />

                {!selectedCustomer && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="customer-name">Full Name</Label>
                      <Input
                        id="customer-name"
                        placeholder="Customer full name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required={isAMLRequired}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer-email">Email</Label>
                      <Input
                        id="customer-email"
                        type="email"
                        placeholder="customer@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer-phone">Phone</Label>
                      <Input
                        id="customer-phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this transaction..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Updated Transaction Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Transaction Type:</span>
                  <Badge variant={transactionType === "currency_buy" ? "default" : "secondary"}>
                    {transactionType === "currency_buy" ? "Buy Order" : "Sell Order"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Exchange:</span>
                  <span className="font-mono">
                    {fromAmount} {fromCurrency} → {toAmount} {toCurrency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Rate:</span>
                  <span className="font-mono">{exchangeRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee:</span>
                  <span className="font-mono">${serviceFee}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Customer {transactionType === "currency_buy" ? "Pays" : "Receives"}:</span>
                  <span className="font-mono">
                    {transactionType === "currency_buy" ? fromAmount : toAmount}{" "}
                    {transactionType === "currency_buy" ? fromCurrency : toCurrency}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!fromCurrency || !toCurrency || !fromAmount || !toAmount || isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}