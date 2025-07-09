"use client";

import React, { useState } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, TrendingUp, Calculator } from "lucide-react";
import { getCurrencyInfo } from "@/lib/currency-data";

interface CurrencyFormProps {
  editingId: Id<"currencies"> | null;
  onClose: () => void;
  isOpen: boolean;
}

export function CurrencyForm({ editingId, onClose, isOpen }: CurrencyFormProps) {
  const baseCurrencyQuery = useQuery(api.settings.getBaseCurrency);
  const defaultDiscountQuery = useQuery(api.settings.getSetting, { key: "default_discount_percent" });
  const defaultMarkupQuery = useQuery(api.settings.getSetting, { key: "default_markup_percent" });

  const existingCurrency = useQuery(
    api.currencies.get,
    editingId ? { id: editingId } : "skip"
  );

  const createCurrency = useMutation(api.currencies.create);
  const updateCurrency = useMutation(api.currencies.update);
  const fetchMarketRate = useAction(api.currencies.fetchMarketRate);

  const [formData, setFormData] = useState({
    code: existingCurrency?.code ?? "",
    name: existingCurrency?.name ?? "",
    country: existingCurrency?.country ?? "",
    flag: existingCurrency?.flag ?? "",
    symbol: existingCurrency?.symbol ?? "",
    marketRate: existingCurrency?.marketRate.toString() ?? "",
    discountPercent: existingCurrency?.discountPercent.toString() ?? defaultDiscountQuery?.toString() ?? "",
    markupPercent: existingCurrency?.markupPercent.toString() ?? defaultMarkupQuery?.toString() ?? "",
    buyRate: existingCurrency?.buyRate.toString() ?? "",
    sellRate: existingCurrency?.sellRate.toString() ?? "",
    manualBuyRate: existingCurrency?.manualBuyRate ?? false,
    manualSellRate: existingCurrency?.manualSellRate ?? false,
  });

  const [isUpdatingRate, setIsUpdatingRate] = useState(false);

  // Auto-populate currency info when code changes
  const handleCurrencyCodeChange = React.useCallback(async (code: string) => {
    setFormData(prev => ({ ...prev, code: code.toUpperCase() }));
    
    if (!code || code.length !== 3 || editingId) {
      return;
    }

    if (formData.name || formData.country || formData.flag) {
      return;
    }

    try {
      const currencyInfo = getCurrencyInfo(code);

      if (currencyInfo) {
        setFormData(prev => ({
          ...prev,
          name: currencyInfo.name,
          country: currencyInfo.country || "",
          flag: currencyInfo.flag || "",
          symbol: currencyInfo.symbol,
        }));

        // Auto-fetch market rate as well
        try {
          const rateResult = await fetchMarketRate({
            currencyCode: code,
            baseCurrency: baseCurrencyQuery
          });

          setFormData(prev => ({
            ...prev,
            marketRate: rateResult.rate.toString()
          }));
        } catch (error) {
          console.error("Failed to auto-fetch market rate:", error);
        }
      }
    } catch (error) {
      console.error("Failed to auto-populate currency info:", error);
    }
  }, [editingId, formData.name, formData.country, formData.flag, baseCurrencyQuery, fetchMarketRate]);

  const deferredCurrencyCodeChange = React.useDeferredValue(handleCurrencyCodeChange);

  // Calculate rates when market rate or percentages change
  const marketRate = parseFloat(formData.marketRate);
  const discountPercent = parseFloat(formData.discountPercent);
  const markupPercent = parseFloat(formData.markupPercent);

  const calculatedBuyRate = React.useMemo(() => {
    return !isNaN(marketRate) && marketRate > 0 && !formData.manualBuyRate && !isNaN(discountPercent)
      ? (marketRate * (1 - discountPercent / 100)).toFixed(4)
      : formData.buyRate;
  }, [marketRate, discountPercent, formData.manualBuyRate, formData.buyRate]);

  const calculatedSellRate = React.useMemo(() => {
    return !isNaN(marketRate) && marketRate > 0 && !formData.manualSellRate && !isNaN(markupPercent)
      ? (marketRate * (1 + markupPercent / 100)).toFixed(4)
      : formData.sellRate;
  }, [marketRate, markupPercent, formData.manualSellRate, formData.sellRate]);

  // Update buy/sell rates when they change
  React.useEffect(() => {
    setFormData(prev => ({ 
      ...prev, 
      buyRate: calculatedBuyRate, 
      sellRate: calculatedSellRate 
    }));
  }, [calculatedBuyRate, calculatedSellRate]);

  const handleUpdateMarketRate = async () => {
    if (!formData.code) {
      toast.error("Please enter a currency code first");
      return;
    }

    setIsUpdatingRate(true);
    try {
      const result = await fetchMarketRate({
        currencyCode: formData.code,
        baseCurrency: baseCurrencyQuery
      });

      setFormData(prev => ({
        ...prev,
        marketRate: result.rate.toString()
      }));

      toast.success(`Updated rate: ${baseCurrencyQuery} → ${result.target} = ${result.rate.toFixed(4)}`);
    } catch {
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

    if (!formData.marketRate || isNaN(marketRate) || marketRate <= 0) {
      toast.error("Market rate is required. Please fetch the current rate.");
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
          symbol: formData.symbol,
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
          symbol: formData.symbol,
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
    } catch {
      toast.error("Failed to save currency");
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    if (field === 'code' && typeof value === 'string') {
      deferredCurrencyCodeChange(value);
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  if (baseCurrencyQuery === undefined || defaultDiscountQuery === undefined || defaultMarkupQuery === undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
            <DialogDescription>Loading currency settings...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {editingId ? "Edit Currency" : "New Currency"}
          </DialogTitle>
          <DialogDescription>
            {editingId ? "Update currency information and exchange rates" : "Add a new currency to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="USD"
                    maxLength={3}
                    required
                    disabled={!!editingId}
                    className="uppercase"
                  />
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

              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) => handleChange("symbol", e.target.value)}
                  placeholder="$"
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="marketRate">Market Rate (Spot)</Label>
                </div>

                <div className="flex gap-2">
                  <Input
                    id="marketRate"
                    type="number"
                    step="0.000001"
                    value={formData.marketRate}
                    readOnly
                    placeholder="Auto-fetched..."
                    className="bg-muted/50"
                  />
                  <Button
                    type="button"
                    onClick={handleUpdateMarketRate}
                    disabled={isUpdatingRate || !formData.code}
                    variant="outline"
                    size="default"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isUpdatingRate ? 'animate-spin' : ''}`} />
                    {isUpdatingRate ? "Fetching..." : "Refresh"}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discountPercent">Discount % from Spot</Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    step="0.01"
                    value={formData.discountPercent}
                    onChange={(e) => handleChange("discountPercent", e.target.value)}
                    disabled={formData.manualBuyRate}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="markupPercent">Markup % from Spot</Label>
                  <Input
                    id="markupPercent"
                    type="number"
                    step="0.01"
                    value={formData.markupPercent}
                    onChange={(e) => handleChange("markupPercent", e.target.value)}
                    disabled={formData.manualSellRate}
                    required
                  />
                </div>
              </div>

              <Separator />

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
                    step="0.000001"
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
                    step="0.000001"
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