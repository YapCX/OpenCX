import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { TillStatusIndicator } from "./TillStatusIndicator";
import { CustomerSelector } from "./CustomerSelector";
import { CustomerForm } from "./CustomerForm";
import { TransactionReceipt } from "./TransactionReceipt";
import { formatCurrency } from "../lib/utils";

// shadcn/ui components
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { CreditCard, AlertTriangle, ArrowDownUp, TrendingUp } from "lucide-react";

interface TransactionLineItem {
  id: string;
  type: "debit" | "credit";
  account: string;
  currency: string;
  amount: number;
  description: string;
}

type OrderType = "buy" | "sell";

export function OrderModule() {
  const [orderType, setOrderType] = useState<OrderType>("buy");
  const [selectedCustomerId, setSelectedCustomerId] = useState<Id<"customers"> | "walk-in">("walk-in");
  const [foreignCurrency, setForeignCurrency] = useState<string>("EUR");
  const [foreignAmount, setForeignAmount] = useState<string>("");
  const [flatFee, setFlatFee] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const currentUserTill = useQuery(api.tills.getCurrentUserTill);
  const currencies = useQuery(api.currencies.list, {}) || [];
  const selectedCustomer = useQuery(
    api.customers.get,
    selectedCustomerId !== "walk-in" ? { id: selectedCustomerId } : "skip"
  );

  const createBuyTransaction = useMutation(api.transactions.createBuyTransaction);
  const createSellTransaction = useMutation(api.transactions.createSellTransaction);

  // Get base currency from settings
  const baseCurrency = useQuery(api.settings.getBaseCurrency) || "USD";
  const localCurrency = currencies.find(c => c.code === baseCurrency);
  const selectedForeignCurrencyData = currencies.find(c => c.code === foreignCurrency);

  // Calculate totals based on order type
  const foreignAmountNum = parseFloat(foreignAmount) || 0;
  const flatFeeNum = parseFloat(flatFee) || 0;

  const rate = orderType === "buy"
    ? selectedForeignCurrencyData?.buyRate || 0
    : selectedForeignCurrencyData?.sellRate || 0;

  const localAmountBeforeFee = foreignAmountNum * rate;
  const totalLocalAmount = localAmountBeforeFee + flatFeeNum;

  // Check if transaction exceeds threshold
  const THRESHOLD_AMOUNT = 1000; // $1,000 base currency threshold
  const exceedsThreshold = totalLocalAmount > THRESHOLD_AMOUNT;
  const canUseWalkIn = !exceedsThreshold || selectedCustomerId !== "walk-in";

  const transactionItems = useMemo(() => {
    if (foreignAmountNum > 0 && rate > 0) {
      if (orderType === "buy") {
        // Customer buys foreign currency from us
        return [
          {
            id: "foreign-credit",
            type: "credit" as const,
            account: `Cash-${foreignCurrency}-${currentUserTill?.tillId || "01"}`,
            currency: foreignCurrency,
            amount: foreignAmountNum,
            description: `Foreign currency sold to customer (${foreignCurrency})`
          },
          {
            id: "local-debit",
            type: "debit" as const,
            account: `Cash-${baseCurrency}-${currentUserTill?.tillId || "01"}`,
            currency: baseCurrency,
            amount: totalLocalAmount,
            description: `Local currency received from customer (${baseCurrency}) ${flatFeeNum > 0 ? `including ${formatCurrency(flatFeeNum, baseCurrency)} fee` : ""}`
          }
        ];
      } else {
        // Customer sells foreign currency to us
        return [
          {
            id: "foreign-debit",
            type: "debit" as const,
            account: `Cash-${foreignCurrency}-${currentUserTill?.tillId || "01"}`,
            currency: foreignCurrency,
            amount: foreignAmountNum,
            description: `Foreign currency received from customer (${foreignCurrency})`
          },
          {
            id: "local-credit",
            type: "credit" as const,
            account: `Cash-${baseCurrency}-${currentUserTill?.tillId || "01"}`,
            currency: baseCurrency,
            amount: totalLocalAmount,
            description: `Local currency paid to customer (${baseCurrency}) ${flatFeeNum > 0 ? `minus ${formatCurrency(flatFeeNum, baseCurrency)} fee` : ""}`
          }
        ];
      }
    }
    return [];
  }, [foreignAmountNum, rate, totalLocalAmount, flatFeeNum, foreignCurrency, currentUserTill?.tillId, orderType, baseCurrency]);

  const handleAddToTransaction = () => {
    if (!canUseWalkIn) {
      toast.error(`Transactions over ${formatCurrency(THRESHOLD_AMOUNT, baseCurrency)} require a full customer profile`);
      return;
    }

    if (transactionItems.length === 2) {
      setIsFinalized(true);
      toast.success("Transaction finalized and balanced");
    }
  };

  const handleSave = async () => {
    if (!currentUserTill) {
      toast.error("You must be signed into a till to create transactions");
      return;
    }

    if (!isFinalized) {
      toast.error("Please finalize the transaction first");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let transactionId: string;

      if (orderType === "buy") {
        transactionId = await createBuyTransaction({
          customerId: selectedCustomerId === "walk-in" ? null : selectedCustomerId,
          foreignCurrency,
          foreignAmount: foreignAmountNum,
          localCurrency: baseCurrency,
          localAmount: totalLocalAmount,
          exchangeRate: rate,
          flatFee: flatFeeNum,
          paymentMethod: "cash"
        });
      } else {
        transactionId = await createSellTransaction({
          customerId: selectedCustomerId === "walk-in" ? null : selectedCustomerId,
          foreignCurrency,
          foreignAmount: foreignAmountNum,
          localCurrency: baseCurrency,
          localAmount: totalLocalAmount,
          exchangeRate: rate,
          flatFee: flatFeeNum,
          paymentMethod: "cash"
        });
      }

      setLastTransactionId(transactionId);
      toast.success("Transaction saved successfully");

      // Reset form
      setForeignAmount("");
      setFlatFee("");
      setIsFinalized(false);
      setSelectedCustomerId("walk-in");

      // Show receipt
      setShowReceipt(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to save transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTransactionBalanced = transactionItems.length === 2;

  const handleNewCustomer = () => {
    setShowCustomerForm(true);
  };

  const handleCustomerFormClose = () => {
    setShowCustomerForm(false);
    // Note: The CustomerForm doesn't currently return the new customer ID
    // Users will need to manually select the new customer from the dropdown
  };

  if (!currentUserTill) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <CreditCard />
            Orders
          </CardTitle>
          <CardDescription>Process currency buy and sell orders</CardDescription>
        </CardHeader>
        <CardContent>
          <TillStatusIndicator />
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must be signed into a till to process currency orders.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <CreditCard />
          Orders
        </CardTitle>
        <CardDescription>Process currency buy and sell orders</CardDescription>
        {currentUserTill && (
          <Badge variant="secondary">
            Till: {currentUserTill.tillId}
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        <TillStatusIndicator />

        {/* Order Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Order Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setOrderType("buy")}
              variant={orderType === "buy" ? "default" : "outline"}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Customer Buys Foreign Currency
            </Button>
            <Button
              onClick={() => setOrderType("sell")}
              variant={orderType === "sell" ? "default" : "outline"}
              className="gap-2"
            >
              <ArrowDownUp className="h-4 w-4" />
              Customer Sells Foreign Currency
            </Button>
          </CardContent>
        </Card>

        {/* Transaction Form */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Customer Selection */}
            <Card>
              <CardHeader>
                <Label>Customer</Label>
              </CardHeader>
              <CardContent>
                <CustomerSelector
                  value={selectedCustomerId === "walk-in" ? null : selectedCustomerId}
                  onChange={(customerId) => setSelectedCustomerId(customerId || "walk-in")}
                  onNewCustomer={handleNewCustomer}
                />
                {exceedsThreshold && selectedCustomerId === "walk-in" && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Transactions over {formatCurrency(THRESHOLD_AMOUNT, baseCurrency)} require a full customer profile
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Currency Input Section */}
            <Card>
              <CardHeader>
                <CardTitle>Currency Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Card>
                  <CardHeader>
                    <Label htmlFor="foreignCurrency">Foreign Currency</Label>
                  </CardHeader>
                  <CardContent>
                    <Select value={foreignCurrency} onValueChange={setForeignCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.filter(c => c.code !== baseCurrency).map((currency) => (
                          <SelectItem key={currency._id} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Label htmlFor="foreignAmount">
                      {orderType === "buy" ? "Amount to Sell" : "Amount Received"}
                    </Label>
                  </CardHeader>
                  <CardContent>
                    <Input
                      id="foreignAmount"
                      type="number"
                      step="0.01"
                      value={foreignAmount}
                      onChange={(e) => setForeignAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* Payment & Fee Section */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Card>
                  <CardHeader>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                  </CardHeader>
                  <CardContent>
                    <Input
                      id="paymentMethod"
                      type="text"
                      value="Cash"
                      disabled
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Label htmlFor="serviceFee">Service Fee ({baseCurrency})</Label>
                  </CardHeader>
                  <CardContent>
                    <Input
                      id="serviceFee"
                      type="number"
                      step="0.01"
                      value={flatFee}
                      onChange={(e) => setFlatFee(e.target.value)}
                      placeholder="0.00"
                    />
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* Exchange Rate Display */}
            {selectedForeignCurrencyData && (
              <Alert>
                <AlertDescription>
                  <Card>
                    <CardContent>
                      Current {orderType === "buy" ? "Buy" : "Sell"} Rate:
                      <Badge>
                        1 {foreignCurrency} = {formatCurrency(rate, baseCurrency)}
                      </Badge>
                    </CardContent>
                  </Card>
                </AlertDescription>
              </Alert>
            )}

            {/* Calculation Summary */}
            {foreignAmountNum > 0 && rate > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Card>
                    <CardContent>
                      Foreign currency {orderType === "buy" ? "sold" : "received"}:
                      <Badge>{formatCurrency(foreignAmountNum, foreignCurrency)}</Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      Exchange amount:
                      <Badge>{formatCurrency(localAmountBeforeFee, baseCurrency)}</Badge>
                    </CardContent>
                  </Card>
                  {flatFeeNum > 0 && (
                    <Card>
                      <CardContent>
                        Service fee:
                        <Badge>{formatCurrency(flatFeeNum, baseCurrency)}</Badge>
                      </CardContent>
                    </Card>
                  )}
                  <Separator />
                  <Card>
                    <CardContent>
                      {orderType === "buy" ? "Customer pays:" : "Customer receives:"}
                      <Badge variant={orderType === "buy" ? "destructive" : "secondary"}>
                        {formatCurrency(totalLocalAmount, baseCurrency)}
                      </Badge>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            )}

            {/* Transaction Items */}
            {transactionItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ledger Entries</CardTitle>
                  {isTransactionBalanced && (
                    <Badge variant="secondary">
                      ✓ Balanced
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  {transactionItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent>
                        <Badge
                          variant={item.type === "debit" ? "destructive" : "secondary"}
                        >
                          {item.type.toUpperCase()}
                        </Badge>
                        {item.description}
                        <Badge>
                          {formatCurrency(item.amount, item.currency)}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            {((!isFinalized && isTransactionBalanced) || isFinalized) && (
              <Card>
                <CardContent>
                  <Separator />
                  {!isFinalized && isTransactionBalanced && (
                    <Button
                      onClick={handleAddToTransaction}
                      disabled={!canUseWalkIn}
                      size="lg"
                    >
                      Finalize Order
                    </Button>
                  )}

                  {isFinalized && (
                    <Button
                      onClick={handleSave}
                      disabled={isSubmitting}
                      size="lg"
                    >
                      {isSubmitting ? "Saving..." : "Save & Print Receipt"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Transaction Receipt Modal */}
        {showReceipt && lastTransactionId && (
          <TransactionReceipt
            transactionId={lastTransactionId as Id<"transactions">}
            onClose={() => setShowReceipt(false)}
          />
        )}

        {/* Customer Form Modal */}
        {showCustomerForm && (
          <CustomerForm
            editingId={null}
            onClose={handleCustomerFormClose}
          />
        )}
      </CardContent>
    </Card>
  );
}