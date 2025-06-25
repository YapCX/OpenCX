import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Alert, AlertDescription } from "./ui/alert";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { SupportedCurrenciesDialog } from "./SupportedCurrenciesDialog";
import { Info, RefreshCw, Loader2, CheckCircle, TrendingUp, Calculator } from "lucide-react";
import { VALIDATION_LIMITS } from "../lib/validation";

interface CurrencyFormProps {
  editingId: Id<"currencies"> | null;
  onClose: () => void;
  isOpen: boolean;
}

export function CurrencyForm({ editingId, onClose, isOpen }: CurrencyFormProps) {
  const baseCurrencyQuery = useQuery(api.settings.getBaseCurrency);
  const defaultDiscountQuery = useQuery(api.settings.getDefaultDiscountPercent);
  const defaultMarkupQuery = useQuery(api.settings.getDefaultMarkupPercent);

  // Show loading if any required data is not yet loaded
  if (baseCurrencyQuery === undefined || defaultDiscountQuery === undefined || defaultMarkupQuery === undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Currency" : "Add New Currency"}</DialogTitle>
            <DialogDescription>Loading currency settings...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const baseCurrency = baseCurrencyQuery;
  const defaultDiscountPercent = defaultDiscountQuery;
  const defaultMarkupPercent = defaultMarkupQuery;

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    country: "",
    flag: "",
    marketRate: "",
    discountPercent: "",
    markupPercent: "",
    buyRate: "",
    sellRate: "",
    manualBuyRate: false,
    manualSellRate: false,
  });

  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [autoPopulateEnabled, setAutoPopulateEnabled] = useState(true);
  const [lastRateUpdate, setLastRateUpdate] = useState<Date | null>(null);

  const existingCurrency = useQuery(
    api.currencies.get,
    editingId ? { id: editingId } : "skip"
  );

  const createCurrency = useMutation(api.currencies.create);
  const updateCurrency = useMutation(api.currencies.update);
  const fetchMarketRate = useAction(api.currencies.fetchMarketRate);
  const getCurrencyInfo = useAction(api.currencyData.getCurrencyInfo);

  useEffect(() => {
    if (existingCurrency) {
      setFormData({
        code: existingCurrency.code,
        name: existingCurrency.name,
        country: existingCurrency.country,
        flag: existingCurrency.flag,
        marketRate: existingCurrency.marketRate.toString(),
        discountPercent: existingCurrency.discountPercent.toString(),
        markupPercent: existingCurrency.markupPercent.toString(),
        buyRate: existingCurrency.buyRate.toString(),
        sellRate: existingCurrency.sellRate.toString(),
        manualBuyRate: existingCurrency.manualBuyRate,
        manualSellRate: existingCurrency.manualSellRate,
      });
    }
  }, [existingCurrency]);

  // Set default discount and markup percentages for new currencies
  useEffect(() => {
    if (!editingId && defaultDiscountQuery !== undefined && defaultMarkupQuery !== undefined) {
      setFormData(prev => ({
        ...prev,
        discountPercent: prev.discountPercent === "" ? defaultDiscountPercent.toString() : prev.discountPercent,
        markupPercent: prev.markupPercent === "" ? defaultMarkupPercent.toString() : prev.markupPercent,
      }));
    }
  }, [editingId, defaultDiscountQuery, defaultMarkupQuery, defaultDiscountPercent, defaultMarkupPercent]);

  // Reset form when dialog opens for new currency
  useEffect(() => {
    if (isOpen && !editingId) {
      setFormData({
        code: "",
        name: "",
        country: "",
        flag: "",
        marketRate: "",
        discountPercent: defaultDiscountPercent.toString(),
        markupPercent: defaultMarkupPercent.toString(),
        buyRate: "",
        sellRate: "",
        manualBuyRate: false,
        manualSellRate: false,
      });
    }
  }, [isOpen, editingId, defaultDiscountPercent, defaultMarkupPercent]);

  // Auto-populate currency info when code changes
  useEffect(() => {
    const autoPopulateCurrencyInfo = async () => {
      if (!formData.code || formData.code.length !== 3 || !autoPopulateEnabled || editingId) {
        return;
      }

      // Don't auto-populate if user has already entered custom data
      if (formData.name || formData.country || formData.flag) {
        return;
      }

      setIsAutoPopulating(true);
      try {
        const result = await getCurrencyInfo({ code: formData.code });

        if (result.found) {
          setFormData(prev => ({
            ...prev,
            name: result.data.name,
            country: result.data.country,
            flag: result.data.flag,
          }));

          toast.success(`Auto-populated ${result.data.name} details`);
        }
      } catch (error) {
        console.error("Failed to auto-populate currency info:", error);
      } finally {
        setIsAutoPopulating(false);
      }
    };

    const timeoutId = setTimeout(autoPopulateCurrencyInfo, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [formData.code, autoPopulateEnabled, editingId, getCurrencyInfo, formData.name, formData.country, formData.flag]);

  // Auto-fetch market rate when currency code changes
  useEffect(() => {
    const autoFetchMarketRate = async () => {
      if (!formData.code || formData.code.length !== 3 || editingId) {
        return;
      }

      // Skip if rate is already set (editing existing currency)
      if (formData.marketRate && parseFloat(formData.marketRate) > 0) {
        return;
      }

      setIsUpdatingRate(true);
      try {
        const result = await fetchMarketRate({
          currencyCode: formData.code,
          baseCurrency: baseCurrency
        });

        setFormData(prev => ({
          ...prev,
          marketRate: result.rate.toString()
        }));

        setLastRateUpdate(new Date());
        toast.success(`Updated rate: ${baseCurrency} → ${result.target} = ${result.rate.toFixed(4)}`);
      } catch (error) {
        console.error("Failed to auto-fetch market rate:", error);
        // Don't show error toast for auto-fetch, user can manually update if needed
      } finally {
        setIsUpdatingRate(false);
      }
    };

    const timeoutId = setTimeout(autoFetchMarketRate, 800); // Debounce, slightly longer than currency info
    return () => clearTimeout(timeoutId);
  }, [formData.code, editingId, fetchMarketRate, baseCurrency, formData.marketRate]);

  // Calculate rates when market rate or percentages change
  const calculatedRates = useMemo(() => {
    const marketRate = parseFloat(formData.marketRate);
    const discountPercent = parseFloat(formData.discountPercent);
    const markupPercent = parseFloat(formData.markupPercent);

    if (!isNaN(marketRate) && marketRate > 0) {
      return {
        buyRate: !formData.manualBuyRate && !isNaN(discountPercent)
          ? (marketRate * (1 - discountPercent / 100)).toFixed(4)
          : formData.buyRate,
        sellRate: !formData.manualSellRate && !isNaN(markupPercent)
          ? (marketRate * (1 + markupPercent / 100)).toFixed(4)
          : formData.sellRate
      };
    }
    return { buyRate: formData.buyRate, sellRate: formData.sellRate };
  }, [formData.marketRate, formData.discountPercent, formData.markupPercent, formData.manualBuyRate, formData.manualSellRate, formData.buyRate, formData.sellRate]);

  // Update form data when calculated rates change
  useEffect(() => {
    if (calculatedRates.buyRate !== formData.buyRate || calculatedRates.sellRate !== formData.sellRate) {
      setFormData(prev => ({
        ...prev,
        buyRate: calculatedRates.buyRate,
        sellRate: calculatedRates.sellRate
      }));
    }
  }, [calculatedRates.buyRate, calculatedRates.sellRate, formData.buyRate, formData.sellRate]);

  const handleUpdateMarketRate = async () => {
    if (!formData.code) {
      toast.error("Please enter a currency code first");
      return;
    }

    setIsUpdatingRate(true);
    try {
      const result = await fetchMarketRate({
        currencyCode: formData.code,
        baseCurrency: baseCurrency
      });

      setFormData(prev => ({
        ...prev,
        marketRate: result.rate.toString()
      }));

      setLastRateUpdate(new Date());
      toast.success(`Updated rate: ${baseCurrency} → ${result.target} = ${result.rate.toFixed(4)}`);
    } catch (error) {
      toast.error("Failed to fetch market rate");
    } finally {
      setIsUpdatingRate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const marketRate = parseFloat(formData.marketRate);
    const discountPercent = parseFloat(formData.discountPercent);
    const markupPercent = parseFloat(formData.markupPercent);
    const buyRate = parseFloat(formData.buyRate);
    const sellRate = parseFloat(formData.sellRate);

    // Check if market rate is available
    if (!formData.marketRate || isNaN(marketRate) || marketRate <= 0) {
      toast.error("Market rate is required. Please wait for auto-fetch or click Refresh to get the current rate.");
      return;
    }

    if (isNaN(discountPercent) || isNaN(markupPercent) || isNaN(buyRate) || isNaN(sellRate)) {
      toast.error("Please enter valid numbers for all rate fields");
      return;
    }

    try {
      if (editingId) {
        await updateCurrency({
          id: editingId,
          code: formData.code,
          name: formData.name,
          country: formData.country,
          flag: formData.flag,
          marketRate,
          discountPercent,
          markupPercent,
          buyRate,
          sellRate,
          manualBuyRate: formData.manualBuyRate,
          manualSellRate: formData.manualSellRate,
        });
        toast.success("Currency updated successfully");
      } else {
        await createCurrency({
          code: formData.code,
          name: formData.name,
          country: formData.country,
          flag: formData.flag,
          marketRate,
          discountPercent,
          markupPercent,
          buyRate,
          sellRate,
          manualBuyRate: formData.manualBuyRate,
          manualSellRate: formData.manualSellRate,
        });
        toast.success("Currency created successfully");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save currency");
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClearAutoPopulated = () => {
    setFormData(prev => ({
      ...prev,
      name: "",
      country: "",
      flag: "",
    }));
    toast.info("Cleared auto-populated fields");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {editingId ? "Edit Currency" : "New Currency"}
          </DialogTitle>
          <DialogDescription>
            {editingId ? "Update currency information and exchange rates" : "Add a new currency to the system with automatic data population"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Auto-populate Notice */}
          {!editingId && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="auto-populate"
                        checked={autoPopulateEnabled}
                        onCheckedChange={setAutoPopulateEnabled}
                      />
                      <Label htmlFor="auto-populate" className="text-sm font-medium">
                        Auto-populate currency details
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <SupportedCurrenciesDialog />
                      {(formData.name || formData.country || formData.flag) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearAutoPopulated}
                        >
                          Clear Auto-filled
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When enabled, currency name, country, flag, and <strong>live market rate</strong> will be automatically filled when you enter a 3-letter currency code (e.g., CAD, EUR, JPY).
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>
                Enter the basic currency details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Currency Code</Label>
                  <div className="relative">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                      placeholder={baseCurrency}
                      maxLength={3}
                      required
                      disabled={!!editingId}
                      className="uppercase"
                    />
                    {isAutoPopulating && (
                      <div className="absolute right-2 top-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                  </div>
                  {autoPopulateEnabled && !editingId && (
                    <p className="text-xs text-muted-foreground">
                      Enter 3-letter code to auto-populate details
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flag">Flag Emoji</Label>
                  <Input
                    id="flag"
                    value={formData.flag}
                    onChange={(e) => handleChange("flag", e.target.value)}
                    placeholder="🇺🇸"
                    maxLength={2}
                    required
                  />
                  {formData.flag && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Preview:</span>
                      <span className="text-lg">{formData.flag}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Currency Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="US Dollar"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  placeholder="United States"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Rate Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Rate Configuration
              </CardTitle>
              <CardDescription>
                Configure exchange rates and pricing for this currency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Market Rate Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="marketRate" className="flex items-center gap-2">
                    Market Rate (Spot)
                    {baseCurrencyQuery === undefined ? (
                      <Skeleton className="h-5 w-16" />
                    ) : (
                      <Badge variant="secondary" className="text-xs font-mono">
                        {baseCurrency} → {formData.code || "???"}
                      </Badge>
                    )}
                  </Label>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="marketRate"
                      type="number"
                      step={VALIDATION_LIMITS.CURRENCY_MARKET_STEP}
                      value={formData.marketRate}
                      readOnly
                      placeholder={baseCurrencyQuery === undefined ? "Loading base currency..." : "Auto-fetched..."}
                      className="bg-muted/50"
                    />
                    {isUpdatingRate && (
                      <div className="absolute right-2 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={handleUpdateMarketRate}
                    disabled={isUpdatingRate || !formData.code || baseCurrencyQuery === undefined}
                    variant="outline"
                    size="default"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isUpdatingRate ? 'animate-spin' : ''}`} />
                    {isUpdatingRate ? "Fetching..." : "Refresh"}
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  {baseCurrencyQuery === undefined ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Loading base currency settings...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p>
                        Live exchange rate from <strong>{baseCurrency}</strong> to <strong>{formData.code || "target currency"}</strong>.
                        Rate updates automatically when you enter a currency code.
                      </p>
                      {lastRateUpdate && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          <span>Last updated: {lastRateUpdate.toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Discount and Markup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discountPercent">Discount % from Spot</Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    step={VALIDATION_LIMITS.PERCENTAGE_STEP}
                    value={formData.discountPercent}
                    onChange={(e) => handleChange("discountPercent", e.target.value)}
                    disabled={formData.manualBuyRate}
                    placeholder={defaultDiscountPercent.toString()}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage below market rate for buying
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="markupPercent">Markup % from Spot</Label>
                  <Input
                    id="markupPercent"
                    type="number"
                    step={VALIDATION_LIMITS.PERCENTAGE_STEP}
                    value={formData.markupPercent}
                    onChange={(e) => handleChange("markupPercent", e.target.value)}
                    disabled={formData.manualSellRate}
                    placeholder={defaultMarkupPercent.toString()}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage above market rate for selling
                  </p>
                </div>
              </div>

              <Separator />

              {/* Buy and Sell Rates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="manualBuyRate"
                      checked={formData.manualBuyRate}
                      onCheckedChange={(checked) => handleChange("manualBuyRate", checked)}
                    />
                    <Label htmlFor="manualBuyRate" className="text-sm font-medium">
                      Manual Buy Rate
                    </Label>
                  </div>
                  <Input
                    type="number"
                    step={VALIDATION_LIMITS.CURRENCY_PRECISION_STEP}
                    value={formData.buyRate}
                    onChange={(e) => handleChange("buyRate", e.target.value)}
                    readOnly={!formData.manualBuyRate}
                    placeholder="0.9750"
                    required
                    className={!formData.manualBuyRate ? "bg-muted/50" : ""}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="manualSellRate"
                      checked={formData.manualSellRate}
                      onCheckedChange={(checked) => handleChange("manualSellRate", checked)}
                    />
                    <Label htmlFor="manualSellRate" className="text-sm font-medium">
                      Manual Sell Rate
                    </Label>
                  </div>
                  <Input
                    type="number"
                    step={VALIDATION_LIMITS.CURRENCY_PRECISION_STEP}
                    value={formData.sellRate}
                    onChange={(e) => handleChange("sellRate", e.target.value)}
                    readOnly={!formData.manualSellRate}
                    placeholder="1.0350"
                    required
                    className={!formData.manualSellRate ? "bg-muted/50" : ""}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingId ? "Update Currency" : "Create Currency"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}