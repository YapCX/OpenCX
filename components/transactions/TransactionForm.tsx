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
  X,
} from "lucide-react";
import { CustomerSelector } from "@/components/customers/CustomerSelector";

interface TransactionFormProps {
  editingId?: Id<"transactions"> | null;
  onClose: () => void;
  isOpen: boolean;
}

export function TransactionForm({ onClose, isOpen }: TransactionFormProps) {
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
  const [isCalculating] = useState(false);

  const currencies = useQuery(api.currencies.list, {}) || [];
  const currentTill = useQuery(api.tills.getCurrentUserTill, {});
  const createTransaction = useMutation(api.transactions.create);
  const calculateExchange = useQuery(
    api.transactions.calculateExchangeAmount,
    fromCurrency && toCurrency && fromAmount && !isNaN(parseFloat(fromAmount))
      ? {
          fromCurrency,
          toCurrency,
          amount: parseFloat(fromAmount),
          type: transactionType === "currency_buy" ? "buy" : "sell",
        }
      : "skip"
  );

  useEffect(() => {
    if (calculateExchange && !isCalculating) {
      setToAmount(calculateExchange.toAmount.toFixed(4));
      setExchangeRate(calculateExchange.exchangeRate.toFixed(6));
      setServiceFee(calculateExchange.serviceFee.toFixed(2));
    }
  }, [calculateExchange, isCalculating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Note: We allow creating pending orders without till access
    
    if (!fromCurrency || !toCurrency || !fromAmount || !toAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(fromAmount) <= 0 || parseFloat(toAmount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      const result = await createTransaction({
        type: transactionType,
        fromCurrency,
        fromAmount: parseFloat(fromAmount),
        toCurrency,
        toAmount: parseFloat(toAmount),
        exchangeRate: parseFloat(exchangeRate),
        serviceFee: parseFloat(serviceFee) || 0,
        serviceFeeType: "percentage",
        paymentMethod: paymentMethod || undefined,
        customerId: selectedCustomer?.customerId || undefined,
        customerName: customerName || undefined,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
      });

      const statusMessage = currentTill ? "created and ready for processing" : "created as pending order";
      toast.success(`Transaction ${result.transactionId} ${statusMessage}`);
      onClose();
      resetForm();
    } catch (error) {
      toast.error("Failed to create transaction");
      console.error(error);
    }
  };

  const resetForm = () => {
    setTransactionType("currency_buy");
    setFromCurrency("");
    setFromAmount("");
    setToCurrency("");
    setToAmount("");
    setExchangeRate("");
    setServiceFee("");
    setPaymentMethod("");
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setNotes("");
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

  if (!isOpen) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">New Currency Exchange</h2>
          <p className="text-muted-foreground">Create a new currency exchange transaction</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

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
                    onChange={(e) => setFromAmount(e.target.value)}
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
                    className="bg-muted"
                    readOnly
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
                    className="bg-muted font-mono"
                    readOnly
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
                    className="bg-muted"
                    readOnly
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
                    // Auto-fill customer information if customer is selected
                    if (customer.type === "individual") {
                      setCustomerName(customer.fullName || "");
                    } else {
                      setCustomerName(customer.businessName || "");
                    }
                    setCustomerEmail(customer.email || "");
                    setCustomerPhone(customer.phone || "");
                  } else {
                    // Clear fields for walk-in customers
                    setCustomerName("");
                    setCustomerEmail("");
                    setCustomerPhone("");
                  }
                }}
                allowWalkIn={true}
                required={isAMLRequired}
              />

              {/* Manual customer info fields (for walk-in customers or when editing existing customer info) */}
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Transaction Summary
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
                <span className="font-mono">{serviceFee} {fromCurrency}</span>
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
          <Button type="submit" disabled={!fromCurrency || !toCurrency || !fromAmount || !toAmount}>
            Create Transaction
          </Button>
        </div>
      </form>
    </div>
  );
}