import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { TillStatusIndicator } from "../tills/TillStatusIndicator";
import { CustomerSelector } from "../customers/CustomerSelector";
import { CustomerForm } from "../customers/CustomerForm";
import { CustomerTransactionReceipt } from "./CustomerTransactionReceipt";
import { useCurrencySymbols } from "../../hooks/useCurrency";

// shadcn/ui components
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from "../ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { PageLayout, PageHeader, GridLayout, EmptyState, FlexLayout, ActionBar } from "../layout";
import { CreditCard, AlertTriangle, ArrowDownUp, TrendingUp, TrendingDown } from "lucide-react";

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
  // All useState hooks first
  const [orderType, setOrderType] = useState<OrderType>("buy");
  const [selectedCustomerId, setSelectedCustomerId] = useState<Id<"customers"> | "walk-in">("walk-in");
  const [foreignCurrency, setForeignCurrency] = useState<string>("EUR");
  const [foreignAmount, setForeignAmount] = useState<string>("");
  const [flatFee, setFlatFee] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);

  const { formatCurrency } = useCurrencySymbols();
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  // All useQuery hooks - must be called unconditionally
  const currentUserTill = useQuery(api.tills.getCurrentUserTill);
  const currencies = useQuery(api.currencies.list, {});
  const defaultServiceFee = useQuery(api.settings.getDefaultServiceFee);
  const baseCurrencyQuery = useQuery(api.settings.getBaseCurrency);
  const selectedCustomer = useQuery(
    api.customers.get,
    selectedCustomerId !== "walk-in" ? { id: selectedCustomerId } : "skip"
  );

  // All useMutation hooks
  const createBuyTransaction = useMutation(api.customerTransactions.createBuyTransaction);
  const createSellTransaction = useMutation(api.customerTransactions.createSellTransaction);

  // All useEffect hooks
  // Initialize flatFee with default service fee
  useEffect(() => {
    if (defaultServiceFee && !flatFee) {
      setFlatFee(defaultServiceFee.toString());
    }
  }, [defaultServiceFee, flatFee]);

  // All useMemo hooks
  const transactionItems = useMemo(() => {
    const foreignAmountNum = parseFloat(foreignAmount) || 0;
    const flatFeeNum = parseFloat(flatFee) || 0;

    if (!currencies || !baseCurrencyQuery || !currentUserTill) {
      return [];
    }

    const baseCurrency = baseCurrencyQuery;
    const selectedForeignCurrencyData = currencies.find(c => c.code === foreignCurrency);
    const rate = orderType === "buy"
      ? selectedForeignCurrencyData?.sellRate || 0
      : selectedForeignCurrencyData?.buyRate || 0;

    const localAmountBeforeFee = rate > 0 ? foreignAmountNum / rate : 0;
    const totalLocalAmount = localAmountBeforeFee + flatFeeNum;

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
  }, [foreignAmount, flatFee, foreignCurrency, currentUserTill?.tillId, orderType, currencies, baseCurrencyQuery]);

  // Now we can do conditional logic and early returns
  // Show loading if required data is not yet loaded
  if (currencies === undefined || defaultServiceFee === undefined || baseCurrencyQuery === undefined) {
    return (
      <PageLayout>
        <PageHeader
          icon={<CreditCard className="h-6 w-6" />}
          title="Currency Exchange"
          description="Loading exchange data..."
        />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // Check if user is signed into a till
  if (!currentUserTill) {
    return (
      <PageLayout>
        <PageHeader
          icon={<CreditCard className="h-6 w-6" />}
          title="Currency Exchange"
          description="Process currency buy and sell orders"
        />

        <TillStatusIndicator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Till Access Required
            </CardTitle>
            <CardDescription>
              You need to be signed into a till to process currency orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You must be signed into a till to process currency orders. Please visit the Tills module to sign in.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const baseCurrency = baseCurrencyQuery;

  // Get base currency from settings
  const localCurrency = currencies.find(c => c.code === baseCurrency);
  const selectedForeignCurrencyData = currencies.find(c => c.code === foreignCurrency);

  // Calculate totals based on order type
  const foreignAmountNum = parseFloat(foreignAmount) || 0;
  const flatFeeNum = parseFloat(flatFee) || 0;

  const rate = orderType === "buy"
    ? selectedForeignCurrencyData?.sellRate || 0
    : selectedForeignCurrencyData?.buyRate || 0;

  const localAmountBeforeFee = rate > 0 ? foreignAmountNum / rate : 0;
  const totalLocalAmount = localAmountBeforeFee + flatFeeNum;

  // Check if transaction exceeds threshold
  const THRESHOLD_AMOUNT = 1000; // $1,000 base currency threshold
  const exceedsThreshold = totalLocalAmount > THRESHOLD_AMOUNT;
  const canUseWalkIn = !exceedsThreshold || selectedCustomerId !== "walk-in";

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
      setFlatFee(defaultServiceFee.toString());
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

  return (
    <PageLayout>
      <PageHeader
        icon={<CreditCard className="h-6 w-6" />}
        title="Currency Exchange"
        description="Process currency buy and sell orders"
        actions={
          currentUserTill && (
            <Badge variant="secondary">
              Till: {currentUserTill.tillId}
            </Badge>
          )
        }
      />

      <TillStatusIndicator />

      {/* Order Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Type</CardTitle>
          <CardDescription>
            Select whether the customer is buying or selling foreign currency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GridLayout cols={2}>
            <Button
              variant={orderType === "buy" ? "default" : "outline"}
              onClick={() => setOrderType("buy")}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <TrendingUp className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Customer Buys</div>
                <div className="text-sm text-muted-foreground">Customer purchases foreign currency</div>
              </div>
            </Button>
            <Button
              variant={orderType === "sell" ? "default" : "outline"}
              onClick={() => setOrderType("sell")}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <TrendingDown className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Customer Sells</div>
                <div className="text-sm text-muted-foreground">Customer sells foreign currency</div>
              </div>
            </Button>
          </GridLayout>
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
                    {orderType === "buy" ? "Foreign Currency Amount" : "Amount Received"}
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
        <CustomerTransactionReceipt
          transactionId={lastTransactionId}
          onClose={() => setShowReceipt(false)}
          isOpen={showReceipt}
        />
      )}

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <CustomerForm
          editingId={null}
          onClose={handleCustomerFormClose}
        />
      )}
    </PageLayout>
  );
}