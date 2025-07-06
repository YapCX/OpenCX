"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Save, 
  ArrowLeft,
  Lock,
  Percent
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { currencyData } from "@/lib/currency-data";
import React from "react";

const VALIDATION_LIMITS = {
  discountPercent: { min: 0, max: 15 },
  markupPercent: { min: 0, max: 20 },
  serviceFee: { min: 0, max: 100 },
};

export default function CurrencySettingsPage() {
  // Check current user permissions
  const currentUserPermissions = useQuery(api.users.getCurrentUserPermissions);
  
  // Get current settings
  const baseCurrency = useQuery(api.settings.getBaseCurrency);
  const defaultDiscountPercent = useQuery(api.settings.getDefaultDiscountPercent);
  const defaultMarkupPercent = useQuery(api.settings.getDefaultMarkupPercent);
  const defaultServiceFee = useQuery(api.settings.getDefaultServiceFee);
  
  // Form state
  const [formData, setFormData] = useState({
    baseCurrency: "",
    discountPercent: "",
    markupPercent: "",
    serviceFee: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Mutations
  const setBaseCurrency = useMutation(api.settings.setBaseCurrency);
  const setDefaultDiscountPercent = useMutation(api.settings.setDefaultDiscountPercent);
  const setDefaultMarkupPercent = useMutation(api.settings.setDefaultMarkupPercent);
  const setDefaultServiceFee = useMutation(api.settings.setDefaultServiceFee);

  // Initialize form data when settings load
  React.useEffect(() => {
    if (baseCurrency && defaultDiscountPercent !== undefined && 
        defaultMarkupPercent !== undefined && defaultServiceFee !== undefined) {
      setFormData({
        baseCurrency,
        discountPercent: defaultDiscountPercent.toString(),
        markupPercent: defaultMarkupPercent.toString(),
        serviceFee: defaultServiceFee.toString(),
      });
    }
  }, [baseCurrency, defaultDiscountPercent, defaultMarkupPercent, defaultServiceFee]);

  // Permission check
  if (currentUserPermissions === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!currentUserPermissions?.isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only managers can modify currency settings.</p>
          <Link href="/settings">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const validateField = (field: string, value: number) => {
    const limits = VALIDATION_LIMITS[field as keyof typeof VALIDATION_LIMITS];
    if (limits && (value < limits.min || value > limits.max)) {
      return `Value must be between ${limits.min}% and ${limits.max}%`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      const discountPercent = parseFloat(formData.discountPercent);
      const markupPercent = parseFloat(formData.markupPercent);
      const serviceFee = parseFloat(formData.serviceFee);

      // Validation
      const discountError = validateField("discountPercent", discountPercent);
      const markupError = validateField("markupPercent", markupPercent);
      const serviceFeeError = validateField("serviceFee", serviceFee);

      if (discountError || markupError || serviceFeeError) {
        toast.error(discountError || markupError || serviceFeeError);
        setIsLoading(false);
        return;
      }

      // Update settings
      const promises = [];
      
      if (formData.baseCurrency !== baseCurrency) {
        promises.push(setBaseCurrency({ currencyCode: formData.baseCurrency }));
      }
      
      if (discountPercent !== defaultDiscountPercent) {
        promises.push(setDefaultDiscountPercent({ percent: discountPercent }));
      }
      
      if (markupPercent !== defaultMarkupPercent) {
        promises.push(setDefaultMarkupPercent({ percent: markupPercent }));
      }
      
      if (serviceFee !== defaultServiceFee) {
        promises.push(setDefaultServiceFee({ fee: serviceFee }));
      }

      await Promise.all(promises);
      
      toast.success("Currency settings updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedCurrencyInfo = () => {
    return currencyData.find(currency => currency.code === formData.baseCurrency);
  };

  const selectedCurrency = getSelectedCurrencyInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Currency Settings</h1>
          <p className="text-gray-600">Configure base currency and default exchange rates</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Base Currency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Base Currency
            </CardTitle>
            <CardDescription>
              The primary currency used for exchange rate calculations and system defaults
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="baseCurrency">Base Currency</Label>
                <Select
                  value={formData.baseCurrency}
                  onValueChange={(value) => setFormData({ ...formData, baseCurrency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select base currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyData.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{currency.flag}</span>
                          <span className="font-medium">{currency.code}</span>
                          <span className="text-gray-500">- {currency.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedCurrency && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedCurrency.flag}</span>
                    <div>
                      <div className="font-medium">{selectedCurrency.name}</div>
                      <div className="text-sm text-gray-500">
                        {selectedCurrency.country} • {selectedCurrency.symbol}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exchange Rate Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Default Exchange Rates
            </CardTitle>
            <CardDescription>
              Default percentage adjustments for buying and selling currencies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Discount Percent */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  <Label htmlFor="discountPercent">Default Discount (Buy Rate)</Label>
                  <Badge variant="outline" className="text-green-600">
                    Customer Buys
                  </Badge>
                </div>
                <div className="relative">
                  <Input
                    id="discountPercent"
                    type="number"
                    step="0.1"
                    min={VALIDATION_LIMITS.discountPercent.min}
                    max={VALIDATION_LIMITS.discountPercent.max}
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    placeholder="2.5"
                    required
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center text-gray-500">
                    %
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Discount applied when customers buy foreign currency 
                  (Range: {VALIDATION_LIMITS.discountPercent.min}% - {VALIDATION_LIMITS.discountPercent.max}%)
                </p>
              </div>

              {/* Markup Percent */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  <Label htmlFor="markupPercent">Default Markup (Sell Rate)</Label>
                  <Badge variant="outline" className="text-red-600">
                    Customer Sells
                  </Badge>
                </div>
                <div className="relative">
                  <Input
                    id="markupPercent"
                    type="number"
                    step="0.1"
                    min={VALIDATION_LIMITS.markupPercent.min}
                    max={VALIDATION_LIMITS.markupPercent.max}
                    value={formData.markupPercent}
                    onChange={(e) => setFormData({ ...formData, markupPercent: e.target.value })}
                    placeholder="3.5"
                    required
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center text-gray-500">
                    %
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Markup applied when customers sell foreign currency 
                  (Range: {VALIDATION_LIMITS.markupPercent.min}% - {VALIDATION_LIMITS.markupPercent.max}%)
                </p>
              </div>
            </div>

            {/* Rate Calculation Preview */}
            {formData.discountPercent && formData.markupPercent && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Rate Calculation Preview</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Market Rate:</span>
                    <span className="font-medium">1.0000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Buy Rate (Customer Buys):</span>
                    <span className="font-medium">
                      {(1 + parseFloat(formData.discountPercent || "0") / 100).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700">Sell Rate (Customer Sells):</span>
                    <span className="font-medium">
                      {(1 - parseFloat(formData.markupPercent || "0") / 100).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Fee */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Default Service Fee
            </CardTitle>
            <CardDescription>
              Standard service fee applied to transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-w-md">
              <Label htmlFor="serviceFee">Service Fee Amount</Label>
              <div className="relative">
                <Input
                  id="serviceFee"
                  type="number"
                  step="0.01"
                  min={VALIDATION_LIMITS.serviceFee.min}
                  max={VALIDATION_LIMITS.serviceFee.max}
                  value={formData.serviceFee}
                  onChange={(e) => setFormData({ ...formData, serviceFee: e.target.value })}
                  placeholder="2.00"
                  required
                />
                <div className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                  $
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Flat fee charged per transaction (Range: ${VALIDATION_LIMITS.serviceFee.min} - ${VALIDATION_LIMITS.serviceFee.max})
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Link href="/settings">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}