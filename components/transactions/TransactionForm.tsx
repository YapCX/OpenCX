"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  X,
} from "lucide-react";
import { CustomerSelector } from "@/components/customers/CustomerSelector";

interface TransactionFormProps {
  editingId?: Id<"transactions"> | null;
  onClose: () => void;
  isOpen: boolean;
}

export function TransactionForm({ onClose, isOpen }: TransactionFormProps) {
  const [fromCurrency, setFromCurrency] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toCurrency, setToCurrency] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
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
        }
      : "skip"
  );

  // Derive calculated values from the exchange calculation
  const calculatedToAmount = calculateExchange ? calculateExchange.toAmount.toFixed(4) : "";
  const calculatedExchangeRate = calculateExchange ? calculateExchange.exchangeRate.toFixed(6) : "";
  const calculatedServiceFee = calculateExchange ? calculateExchange.serviceFee.toFixed(2) : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Note: We allow creating pending orders without till access
    
    if (!fromCurrency || !toCurrency || !fromAmount || !calculatedToAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(fromAmount) <= 0 || parseFloat(calculatedToAmount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      const result = await createTransaction({
        fromCurrency,
        fromAmount: parseFloat(fromAmount),
        toCurrency,
        toAmount: parseFloat(calculatedToAmount),
        exchangeRate: parseFloat(calculatedExchangeRate),
        serviceFee: parseFloat(calculatedServiceFee) || 0,
        serviceFeeType: "flat",
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
    setFromCurrency("");
    setFromAmount("");
    setToCurrency("");
    setPaymentMethod("");
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setNotes("");
  };

  const handleSwapCurrencies = () => {
    const tempCurrency = fromCurrency;
    setFromCurrency(toCurrency);
    setFromAmount(calculatedToAmount);
    setToCurrency(tempCurrency);
  };

  const isComplianceRequired = parseFloat(fromAmount) > 1000 || parseFloat(calculatedToAmount) > 1000;

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
                    value={calculatedToAmount}
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
                    value={calculatedExchangeRate}
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
                    value={calculatedServiceFee}
                    className="bg-muted"
                    readOnly
                  />
                </div>
              </div>

              {isComplianceRequired && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Compliance Required</span>
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
                {isComplianceRequired && <Badge variant="destructive">Required</Badge>}
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
                required={isComplianceRequired}
              />

              {/* Manual customer info fields (for walk-in customers or when editing existing customer info) */}
              {!selectedCustomer && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="customer-name" className="text-muted-foreground">Full Name</Label>
                    <Input
                      id="customer-name"
                      placeholder="Not required for walk-in customer"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required={isComplianceRequired}
                      disabled
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer-email" className="text-muted-foreground">Email</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="Not required for walk-in customer"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      disabled
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer-phone" className="text-muted-foreground">Phone</Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      placeholder="Not required for walk-in customer"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      disabled
                      className="bg-muted text-muted-foreground cursor-not-allowed"
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
                <span>Exchange:</span>
                <span className="font-mono">
                  {fromAmount} {fromCurrency} → {calculatedToAmount} {toCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rate:</span>
                <span className="font-mono">{calculatedExchangeRate}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee:</span>
                <span className="font-mono">${calculatedServiceFee}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Customer Pays:</span>
                <span className="font-mono">{fromAmount} {fromCurrency}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Customer Receives:</span>
                <span className="font-mono">{calculatedToAmount} {toCurrency}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!fromCurrency || !toCurrency || !fromAmount || !calculatedToAmount}>
            Create Transaction
          </Button>
        </div>
      </form>
    </div>
  );
}