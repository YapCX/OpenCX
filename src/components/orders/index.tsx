import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { TillStatusIndicator } from "../tills/TillStatusIndicator";
import { CustomerSelector } from "../customers/CustomerSelector";
import { CustomerForm } from "../customers/CustomerForm";
import { CustomerTransactionReceipt } from "./CustomerTransactionReceipt";
import { useCurrencySymbols } from "../../hooks/useCurrency";
import { useCurrencyStep } from "../../hooks/useCurrencyStep";

// shadcn/ui components
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from "../ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { PageLayout, PageHeader, GridLayout, EmptyState, FlexLayout, ActionBar } from "../layout";
import { CreditCard, AlertTriangle, ArrowDownUp, TrendingUp, TrendingDown, Users, Calculator, Receipt, ChevronRight, RotateCcw } from "lucide-react";
import { Spinner } from "../ui/spinner";

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
  const [localAmount, setLocalAmount] = useState<string>("");
  const [lastEditedField, setLastEditedField] = useState<"foreign" | "local">("foreign");
  const [flatFee, setFlatFee] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);

  const { formatCurrency } = useCurrencySymbols();
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  // All useQuery hooks - must be called unconditionally
  const currentUserTill = useQuery(api.tills.getCurrentUserTill);
  const currencies = useQuery(api.currencies.list, {});
  const defaultServiceFee = useQuery(api.settings.getDefaultServiceFee);
  const baseCurrencyQuery = useQuery(api.settings.getBaseCurrency);
  const shouldQueryCustomer = selectedCustomerId !== "walk-in";
  const selectedCustomer = useQuery(
    api.customers.get,
    shouldQueryCustomer ? { id: selectedCustomerId } : "skip"
  );

  // Get currency step values for increment/decrement arrows
  const { step: foreignCurrencyStep, stepString: foreignStepString } = useCurrencyStep(foreignCurrency);
  const { step: baseCurrencyStep, stepString: baseStepString } = useCurrencyStep(baseCurrencyQuery || "");

  // All useMutation hooks
  const createBuyTransaction = useMutation(api.customerTransactions.createBuyTransaction);
  const createSellTransaction = useMutation(api.customerTransactions.createSellTransaction);

  // Debounced calculation function
  const debouncedCalculate = useCallback((
    sourceField: "foreign" | "local",
    sourceValue: string,
    currentForeignCurrency: string,
    currentOrderType: OrderType,
    currentFlatFee: string
  ) => {
    const timeout = setTimeout(() => {
      if (!currencies || !baseCurrencyQuery) return;

      const baseCurrency = baseCurrencyQuery;
      const selectedForeignCurrencyData = currencies.find(c => c.code === currentForeignCurrency);
      const rate = currentOrderType === "buy"
        ? selectedForeignCurrencyData?.sellRate || 0
        : selectedForeignCurrencyData?.buyRate || 0;

      const flatFeeNum = parseFloat(currentFlatFee) || 0;
      const sourceNum = parseFloat(sourceValue) || 0;

      if (sourceNum > 0 && rate > 0) {
        if (sourceField === "foreign") {
          // Calculate local amount from foreign amount
          const localAmountBeforeFee = sourceNum / rate;
          const totalLocalAmount = localAmountBeforeFee + flatFeeNum;
          setLocalAmount(totalLocalAmount.toFixed(2));
        } else {
          // Calculate foreign amount from local amount
          const adjustedLocalAmount = Math.max(0, sourceNum - flatFeeNum);
          const foreignAmountCalculated = adjustedLocalAmount * rate;
          setForeignAmount(foreignAmountCalculated.toFixed(2));
        }
      }
    }, 500); // 500ms delay

    return timeout;
  }, [currencies, baseCurrencyQuery]);

  // All useEffect hooks
  // Initialize flatFee with default service fee
  useEffect(() => {
    if (defaultServiceFee && !flatFee) {
      setFlatFee(defaultServiceFee.toString());
    }
  }, [defaultServiceFee, flatFee]);

  // Debounced calculation effect
  useEffect(() => {
    if (lastEditedField === "foreign" && foreignAmount) {
      const timeout = debouncedCalculate("foreign", foreignAmount, foreignCurrency, orderType, flatFee);
      return () => clearTimeout(timeout);
    } else if (lastEditedField === "local" && localAmount) {
      const timeout = debouncedCalculate("local", localAmount, foreignCurrency, orderType, flatFee);
      return () => clearTimeout(timeout);
    }
  }, [foreignAmount, localAmount, lastEditedField, foreignCurrency, orderType, flatFee, debouncedCalculate]);

  // All useMemo hooks
  const transactionItems = useMemo(() => {
    const foreignAmountNum = parseFloat(foreignAmount) || 0;
    const localAmountNum = parseFloat(localAmount) || 0;
    const flatFeeNum = parseFloat(flatFee) || 0;

    if (!currencies || !baseCurrencyQuery || !currentUserTill) {
      return [];
    }

    const baseCurrency = baseCurrencyQuery;
    const totalLocalAmount = localAmountNum || 0;

    if (foreignAmountNum > 0 && totalLocalAmount > 0) {
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
  }, [foreignAmount, localAmount, flatFee, foreignCurrency, currentUserTill?.tillId, orderType, currencies, baseCurrencyQuery]);

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
            <FlexLayout align="center" className="justify-center">
              <Spinner size="lg" />
            </FlexLayout>
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
  const localAmountNum = parseFloat(localAmount) || 0;
  const flatFeeNum = parseFloat(flatFee) || 0;

  const rate = orderType === "buy"
    ? selectedForeignCurrencyData?.sellRate || 0
    : selectedForeignCurrencyData?.buyRate || 0;

  const totalLocalAmount = localAmountNum || 0;
  const localAmountBeforeFee = Math.max(0, totalLocalAmount - flatFeeNum);

  // Check if transaction exceeds threshold
  const THRESHOLD_AMOUNT = 1000; // $1,000 base currency threshold
  const exceedsThreshold = totalLocalAmount > THRESHOLD_AMOUNT;
  const canUseWalkIn = !exceedsThreshold || selectedCustomerId !== "walk-in";

  const handleCompleteTransaction = async () => {
    // Simple validation
    if (!canUseWalkIn) {
      toast.error(`Transactions over ${formatCurrency(THRESHOLD_AMOUNT, baseCurrency)} require a full customer profile`);
      return;
    }

    if (!currentUserTill) {
      toast.error("You must be signed into a till to create transactions");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Save transaction
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

      // Clear form
      setForeignAmount("");
      setLocalAmount("");
      setFlatFee(defaultServiceFee.toString());
      setSelectedCustomerId("walk-in");
      setLastEditedField("foreign");

      // Show receipt
      setLastTransactionId(transactionId);
      setShowReceipt(true);

      toast.success("Transaction completed successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to complete transaction");
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
      />

      <TillStatusIndicator />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Side - Order/Currency Exchange */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownUp className="h-5 w-5" />
              Currency Exchange
            </CardTitle>
            <CardDescription>
              Process currency buy and sell transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Order Type</Label>
              <Tabs
                value={orderType}
                onValueChange={(value) => setOrderType(value as OrderType)}
              >
                <TabsList>
                  <TabsTrigger value="buy">Buy</TabsTrigger>
                  <TabsTrigger value="sell">Sell</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Currency Exchange Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">{orderType === "buy" ? baseCurrency : "Foreign Currency"}</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      step={baseStepString}
                      value={orderType === "buy" ? localAmount : foreignAmount}
                      onChange={(e) => {
                        if (orderType === "buy") {
                          setLocalAmount(e.target.value);
                          setLastEditedField("local");
                        } else {
                          setForeignAmount(e.target.value);
                          setLastEditedField("foreign");
                        }
                      }}
                      placeholder="0.00"
                      className="text-lg font-mono"
                    />
                    {orderType === "sell" && (
                      <Select value={foreignCurrency} onValueChange={setForeignCurrency}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.filter(c => c.code !== baseCurrency).map((currency) => (
                            <SelectItem key={currency._id} value={currency.code}>
                              {currency.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">{orderType === "buy" ? "Foreign Currency" : baseCurrency}</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      step={foreignStepString}
                      value={orderType === "buy" ? foreignAmount : localAmount}
                      onChange={(e) => {
                        if (orderType === "buy") {
                          setForeignAmount(e.target.value);
                          setLastEditedField("foreign");
                        } else {
                          setLocalAmount(e.target.value);
                          setLastEditedField("local");
                        }
                      }}
                      placeholder="0.00"
                      className="text-lg font-mono"
                    />
                    {orderType === "buy" && (
                      <Select value={foreignCurrency} onValueChange={setForeignCurrency}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.filter(c => c.code !== baseCurrency).map((currency) => (
                            <SelectItem key={currency._id} value={currency.code}>
                              {currency.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>

            {/* Exchange Rate & Fee Section */}
            <div className="space-y-4">
              {selectedForeignCurrencyData && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">1 {foreignCurrency} = {formatCurrency(rate, baseCurrency)}</span>
                  <Badge variant={orderType === "buy" ? "destructive" : "secondary"}>
                    {orderType === "buy" ? "Buy Rate" : "Sell Rate"}
                  </Badge>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceFee" className="text-sm font-medium">Service Fee ({baseCurrency})</Label>
                  <Input
                    id="serviceFee"
                    type="number"
                    step={baseStepString}
                    value={flatFee}
                    onChange={(e) => setFlatFee(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <Input value="Cash" disabled className="bg-muted" />
                </div>
              </div>
            </div>

            {/* Action Button - Moved here for better visibility */}
            <div className="pt-4">
              {/* Always visible transaction button */}
              <Button
                onClick={handleCompleteTransaction}
                disabled={!isTransactionBalanced || !canUseWalkIn || isSubmitting}
                size="lg"
                className="w-full"
              >
                {isSubmitting ? (
                  "Processing..."
                ) : !isTransactionBalanced ? (
                  foreignAmountNum === 0 && localAmountNum === 0
                    ? "Enter Currency Amounts"
                    : "Enter Both Amounts"
                ) : !canUseWalkIn ? (
                  "Customer Required"
                ) : (
                  "Complete Transaction"
                )}
                <Receipt className="ml-2 h-4 w-4" />
              </Button>
            </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Side - Customer Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CustomerSelector
                value={selectedCustomerId === "walk-in" ? null : selectedCustomerId}
                onChange={(customerId) => setSelectedCustomerId(customerId || "walk-in")}
                onNewCustomer={handleNewCustomer}
              />

              {exceedsThreshold && selectedCustomerId === "walk-in" && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Transactions over {formatCurrency(THRESHOLD_AMOUNT, baseCurrency)} require full customer profile
                  </AlertDescription>
                </Alert>
              )}

              {/* Customer Details */}
              {selectedCustomer && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <h4 className="font-medium">Customer Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">ID:</span>
                        <span className="ml-2 font-mono">{selectedCustomer.customerId}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <span className="ml-2 capitalize">{selectedCustomer.customerType}</span>
                      </div>
                    </div>

                    {selectedCustomer.customerType === "individual" ? (
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground text-sm">Full Name:</span>
                          <p className="font-medium">{selectedCustomer.fullName}</p>
                        </div>
                        {selectedCustomer.phoneNumber && (
                          <div>
                            <span className="text-muted-foreground text-sm">Phone:</span>
                            <p className="font-medium">{selectedCustomer.phoneNumber}</p>
                          </div>
                        )}
                        {selectedCustomer.fullAddress && (
                          <div>
                            <span className="text-muted-foreground text-sm">Address:</span>
                            <p className="text-sm">{selectedCustomer.fullAddress}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground text-sm">Business Name:</span>
                          <p className="font-medium">{selectedCustomer.legalBusinessName}</p>
                        </div>
                        {selectedCustomer.contactPersonName && (
                          <div>
                            <span className="text-muted-foreground text-sm">Contact Person:</span>
                            <p className="font-medium">{selectedCustomer.contactPersonName}</p>
                          </div>
                        )}
                        {selectedCustomer.businessPhone && (
                          <div>
                            <span className="text-muted-foreground text-sm">Phone:</span>
                            <p className="font-medium">{selectedCustomer.businessPhone}</p>
                          </div>
                        )}
                        {selectedCustomer.businessAddress && (
                          <div>
                            <span className="text-muted-foreground text-sm">Address:</span>
                            <p className="text-sm">{selectedCustomer.businessAddress}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Summary */}
      {foreignAmountNum > 0 && rate > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {orderType === "buy" ? "Foreign Amount:" : "Selling Amount:"}
                </span>
                <Badge variant="outline">{formatCurrency(foreignAmountNum, foreignCurrency)}</Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {orderType === "buy" ? "Base Amount:" : "Receiving Amount:"}
                </span>
                <Badge variant="outline">{formatCurrency(localAmountBeforeFee, baseCurrency)}</Badge>
              </div>

              {flatFeeNum > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Service Fee:</span>
                  <Badge variant="outline">{formatCurrency(flatFeeNum, baseCurrency)}</Badge>
                </div>
              )}

              <Separator />

              <div className="flex justify-between items-center font-medium">
                <span>{orderType === "buy" ? "Customer Pays:" : "Customer Receives:"}</span>
                <Badge variant={orderType === "buy" ? "destructive" : "secondary"} className="text-base px-3 py-1">
                  {formatCurrency(totalLocalAmount, baseCurrency)}
                </Badge>
              </div>
            </div>

            {/* Transaction Ledger Preview */}
            <div className="pt-4">
              {transactionItems.length > 0 && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full">
                      View Ledger Entries
                      {isTransactionBalanced && (
                        <Badge variant="secondary" className="ml-2">✓ Balanced</Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Transaction Ledger</SheetTitle>
                      <SheetDescription>
                        Review the accounting entries for this transaction
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 mt-6">
                      {transactionItems.map((item) => (
                        <Card key={item.id}>
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <Badge
                                  variant={item.type === "debit" ? "destructive" : "secondary"}
                                >
                                  {item.type.toUpperCase()}
                                </Badge>
                                <Badge variant="outline">
                                  {formatCurrency(item.amount, item.currency)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                              <p className="text-xs font-mono text-muted-foreground">{item.account}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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