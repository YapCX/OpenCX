import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { VALIDATION_LIMITS, getCurrencySymbol } from "../lib/validation";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import { Settings, AlertTriangle, Globe, Clock, Percent, TrendingDown, TrendingUp, DollarSign, Shield } from "lucide-react";

export function SettingsModule() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingDefaults, setIsUpdatingDefaults] = useState(false);
  const [isUpdatingServiceFee, setIsUpdatingServiceFee] = useState(false);

  const baseCurrency = useQuery(api.settings.getBaseCurrency);
  const currencies = useQuery(api.currencies.list, {});
  const defaultDiscountPercent = useQuery(api.settings.getDefaultDiscountPercent);
  const defaultMarkupPercent = useQuery(api.settings.getDefaultMarkupPercent);
  const defaultServiceFee = useQuery(api.settings.getDefaultServiceFee);

  const setBaseCurrency = useMutation(api.settings.setBaseCurrency);
  const setDefaultDiscountPercent = useMutation(api.settings.setDefaultDiscountPercent);
  const setDefaultMarkupPercent = useMutation(api.settings.setDefaultMarkupPercent);
  const setDefaultServiceFee = useMutation(api.settings.setDefaultServiceFee);

  const [selectedBaseCurrency, setSelectedBaseCurrency] = useState<string>("");
  const [discountInput, setDiscountInput] = useState<string>("");
  const [markupInput, setMarkupInput] = useState<string>("");
  const [serviceFeeInput, setServiceFeeInput] = useState<string>("");

  // AML settings
  const amlSettings = useQuery(api.aml.getAMLSettings);
  const updateAMLSettings = useMutation(api.aml.updateAMLSettings);

  // AML local state
  const [autoScreeningEnabled, setAutoScreeningEnabled] = useState(true);
  const [enabledSanctionLists, setEnabledSanctionLists] = useState<string[]>(["OFAC", "UN"]);
  const [riskThresholds, setRiskThresholds] = useState({
    lowRiskScore: 30,
    mediumRiskScore: 60,
    highRiskScore: 80,
  });
  const [autoHoldOnMatch, setAutoHoldOnMatch] = useState(true);
  const [requireOverrideReason, setRequireOverrideReason] = useState(true);
  const [isUpdatingAML, setIsUpdatingAML] = useState(false);

  // Sync AML settings with server data
  useEffect(() => {
    if (amlSettings) {
      setAutoScreeningEnabled(amlSettings.autoScreeningEnabled);
      setEnabledSanctionLists(amlSettings.enabledSanctionLists);
      setRiskThresholds(amlSettings.riskThresholds);
      setAutoHoldOnMatch(amlSettings.autoHoldOnMatch);
      setRequireOverrideReason(amlSettings.requireOverrideReason);
    }
  }, [amlSettings]);

  const availableSanctionLists = [
    { id: "OFAC", name: "OFAC (US Treasury)", description: "Office of Foreign Assets Control" },
    { id: "UN", name: "UN Security Council", description: "United Nations Sanctions List" },
    { id: "OSFI", name: "OSFI (Canada)", description: "Office of the Superintendent of Financial Institutions" },
    { id: "EU", name: "EU Sanctions", description: "European Union Consolidated List" },
    { id: "UK", name: "UK Sanctions", description: "UK HM Treasury Sanctions List" },
  ];

  const handleSanctionListToggle = (listId: string) => {
    setEnabledSanctionLists((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    );
  };

  const handleSaveAML = async () => {
    setIsUpdatingAML(true);
    try {
      await updateAMLSettings({
        autoScreeningEnabled,
        enabledSanctionLists,
        riskThresholds,
        autoHoldOnMatch,
        requireOverrideReason,
      });
      toast.success("AML settings updated successfully");
    } catch (error) {
      console.error("Failed to update AML settings:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update AML settings");
    } finally {
      setIsUpdatingAML(false);
    }
  };

  const handleSaveBaseCurrency = async () => {
    if (!selectedBaseCurrency) {
      toast.error("Please select a base currency");
      return;
    }

    setIsUpdating(true);
    try {
      const result = await setBaseCurrency({ currencyCode: selectedBaseCurrency });
      toast.success(`Base currency updated to ${result}`);
      setSelectedBaseCurrency("");
    } catch (error) {
      console.error("Failed to update base currency:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update base currency. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveDefaultRates = async () => {
    const discountValue = parseFloat(discountInput);
    const markupValue = parseFloat(markupInput);

    const mutationPromises: Promise<any>[] = [];
    if (!isNaN(discountValue)) {
      if (discountValue < VALIDATION_LIMITS.PERCENTAGE_MIN || discountValue > VALIDATION_LIMITS.PERCENTAGE_MAX) {
        toast.error(`Discount must be between ${VALIDATION_LIMITS.PERCENTAGE_MIN} and ${VALIDATION_LIMITS.PERCENTAGE_MAX}`);
        return;
      }
      mutationPromises.push(setDefaultDiscountPercent({ percent: discountValue }));
    }
    if (!isNaN(markupValue)) {
      if (markupValue < VALIDATION_LIMITS.PERCENTAGE_MIN || markupValue > VALIDATION_LIMITS.PERCENTAGE_MAX) {
        toast.error(`Markup must be between ${VALIDATION_LIMITS.PERCENTAGE_MIN} and ${VALIDATION_LIMITS.PERCENTAGE_MAX}`);
        return;
      }
      mutationPromises.push(setDefaultMarkupPercent({ percent: markupValue }));
    }

    if (mutationPromises.length === 0) {
      toast.error("Enter at least one value to update");
      return;
    }

    setIsUpdatingDefaults(true);
    try {
      await Promise.all(mutationPromises);
      toast.success("Default exchange rate percentages updated successfully");
      setDiscountInput("");
      setMarkupInput("");
    } catch (error) {
      console.error("Failed to update default percentages:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update default percentages. Please try again.");
    } finally {
      setIsUpdatingDefaults(false);
    }
  };

  const handleSaveServiceFee = async () => {
    const feeValue = parseFloat(serviceFeeInput);

    if (isNaN(feeValue) || feeValue < VALIDATION_LIMITS.FEE_MIN) {
      toast.error(`Please enter a valid service fee amount (${VALIDATION_LIMITS.FEE_MIN} or greater)`);
      return;
    }

    setIsUpdatingServiceFee(true);
    try {
      await setDefaultServiceFee({ fee: feeValue });
      toast.success("Default service fee updated successfully");
      setServiceFeeInput("");
    } catch (error) {
      console.error("Failed to update default service fee:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update default service fee. Please try again.");
    } finally {
      setIsUpdatingServiceFee(false);
    }
  };

  // Handle loading and error states
  const isLoading = baseCurrency === undefined || currencies === undefined || 
    defaultDiscountPercent === undefined || defaultMarkupPercent === undefined || 
    defaultServiceFee === undefined || amlSettings === undefined;

  const hasError = baseCurrency === null || currencies === null || 
    defaultDiscountPercent === null || defaultMarkupPercent === null || 
    defaultServiceFee === null || amlSettings === null;

  if (hasError) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6" />
              <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load settings. Please refresh the page or contact support.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6" />
              <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            </div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Configure global system settings and preferences
          </p>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Currency Configuration
            </CardTitle>
            <CardDescription>
              Manage the base currency for all transactions and exchange rate calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label htmlFor="currency-select" className="text-sm font-medium">
                Base Currency
              </Label>

              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {/* Current */}
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {baseCurrency}
                  </Badge>
                  {baseCurrency && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Active</span>
                    </div>
                  )}
                </div>

                {/* Selector */}
                <div className="flex gap-3 flex-1 md:justify-end">
                  <Select
                    value={selectedBaseCurrency}
                    onValueChange={(value) => setSelectedBaseCurrency(value)}
                  >
                    <SelectTrigger id="currency-select" className="flex-1">
                      <SelectValue placeholder="Select new..." />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.length === 0 ? (
                        <div className="p-3 text-center">
                          <p className="text-sm text-muted-foreground">No currencies available</p>
                          <p className="text-xs text-muted-foreground mt-1">Add currencies first</p>
                        </div>
                      ) : (
                        currencies.map((currency) => (
                          <SelectItem key={currency._id} value={currency.code}>
                            <div className="flex items-center gap-2">
                              <span className="text-base">{currency.flag}</span>
                              <span className="font-medium">{currency.code}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{currency.name}</span>
                              <span className="text-muted-foreground">({currency.country})</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleSaveBaseCurrency}
                    disabled={isUpdating || !selectedBaseCurrency || currencies.length === 0}
                    size="default"
                  >
                    {isUpdating ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                This currency serves as the reference for all exchange rate calculations and local transactions.
                Selecting a different currency will update the base for future operations.
              </p>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Important Considerations</p>
                  <ul className="space-y-1 text-sm list-disc list-inside ml-2">
                    <li>Changing the base currency affects all future transactions and calculations</li>
                    <li>Historical transaction data will remain in their original currencies</li>
                    <li>Exchange rates should be updated after changing the base currency</li>
                    <li>Cash ledger accounts will adopt the new base currency naming convention</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Currency Default Rates
            </CardTitle>
            <CardDescription>
              Set default discount and markup percentages for new currencies added to the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Default Discount & Markup Percentages</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Discount */}
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Discount %</p>
                          <p className="text-xs text-muted-foreground">Buy rate discount from spot</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        {defaultDiscountPercent}%
                      </Badge>
                    </div>
                    <Input
                      id="discount-input"
                      type="number"
                      step={VALIDATION_LIMITS.PERCENTAGE_STEP}
                      min={VALIDATION_LIMITS.PERCENTAGE_MIN}
                      max={VALIDATION_LIMITS.PERCENTAGE_MAX}
                      placeholder="Enter new discount %"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                    />
                  </CardContent>
                </Card>

                {/* Markup */}
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Markup %</p>
                          <p className="text-xs text-muted-foreground">Sell rate markup from spot</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        {defaultMarkupPercent}%
                      </Badge>
                    </div>
                    <Input
                      id="markup-input"
                      type="number"
                      step={VALIDATION_LIMITS.PERCENTAGE_STEP}
                      min={VALIDATION_LIMITS.PERCENTAGE_MIN}
                      max={VALIDATION_LIMITS.PERCENTAGE_MAX}
                      placeholder="Enter new markup %"
                      value={markupInput}
                      onChange={(e) => setMarkupInput(e.target.value)}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSaveDefaultRates}
                  disabled={isUpdatingDefaults || (!discountInput && !markupInput)}
                  size="default"
                >
                  {isUpdatingDefaults ? "Updating..." : "Save Percentages"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDiscountInput("");
                    setMarkupInput("");
                  }}
                  disabled={isUpdatingDefaults}
                >
                  Clear
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Values shown are the current defaults automatically applied to new currencies. Enter new percentages and click "Save Percentages" to update.
              </p>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Important Notes</p>
                  <ul className="space-y-1 text-sm list-disc list-inside ml-2">
                    <li>These defaults only apply to newly added currencies</li>
                    <li>Existing currencies will retain their current discount and markup percentages</li>
                    <li>Users can still override these defaults when adding individual currencies</li>
                    <li>Typical values range from 1-5% depending on your business model</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Transaction Settings
            </CardTitle>
            <CardDescription>
              Configure default settings for transaction processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Default Service Fee</Label>
              
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Current Default Service Fee</p>
                    <p className="text-xs text-muted-foreground">Applied to new currency exchange orders</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {getCurrencySymbol(baseCurrency)}{defaultServiceFee}
                </Badge>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="service-fee-input" className="text-sm">
                    New Default Service Fee ({baseCurrency})
                  </Label>
                  <Input
                    id="service-fee-input"
                    type="number"
                    step={VALIDATION_LIMITS.PERCENTAGE_STEP}
                    min={VALIDATION_LIMITS.FEE_MIN}
                    placeholder={defaultServiceFee.toString()}
                    value={serviceFeeInput}
                    onChange={(e) => setServiceFeeInput(e.target.value)}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <Button
                    onClick={handleSaveServiceFee}
                    disabled={isUpdatingServiceFee || !serviceFeeInput}
                    size="default"
                  >
                    {isUpdatingServiceFee ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                This fee is automatically applied to new currency exchange orders and can be adjusted per transaction
              </p>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Service Fee Information</p>
                  <ul className="space-y-1 text-sm list-disc list-inside ml-2">
                    <li>The default service fee is automatically applied to new orders</li>
                    <li>Users can adjust the fee amount for individual transactions</li>
                    <li>Setting the fee to 0 means no service fee by default</li>
                    <li>Changes only affect new orders, existing orders remain unchanged</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Compliance & AML Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance & AML
            </CardTitle>
            <CardDescription>
              Organisation-wide screening rules and risk thresholds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Global toggles */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Global Rules</Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="autoScreening" checked={autoScreeningEnabled} onCheckedChange={(c) => setAutoScreeningEnabled(!!c)} />
                  <Label htmlFor="autoScreening" className="text-sm">Automatically screen new customers</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="autoHold" checked={autoHoldOnMatch} onCheckedChange={(c) => setAutoHoldOnMatch(!!c)} />
                  <Label htmlFor="autoHold" className="text-sm">Place customers on hold when a match is found</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="requireOverride" checked={requireOverrideReason} onCheckedChange={(c) => setRequireOverrideReason(!!c)} />
                  <Label htmlFor="requireOverride" className="text-sm">Require reason to clear a hold</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Sanction list selection */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Enabled Sanction Lists</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableSanctionLists.map((list) => (
                  <div key={list.id} className="flex items-start gap-3 p-3 border rounded-md">
                    <Checkbox id={list.id} checked={enabledSanctionLists.includes(list.id)} onCheckedChange={() => handleSanctionListToggle(list.id)} className="mt-1" />
                    <div>
                      <Label htmlFor={list.id} className="text-sm font-medium cursor-pointer">{list.name}</Label>
                      <p className="text-xs text-muted-foreground">{list.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Risk thresholds */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Risk Score Thresholds</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lowRisk" className="text-sm">Low</Label>
                  <Input id="lowRisk" type="number" value={riskThresholds.lowRiskScore} min="0" max="100" onChange={(e) => setRiskThresholds((p) => ({ ...p, lowRiskScore: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mediumRisk" className="text-sm">Medium</Label>
                  <Input id="mediumRisk" type="number" value={riskThresholds.mediumRiskScore} min="0" max="100" onChange={(e) => setRiskThresholds((p) => ({ ...p, mediumRiskScore: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="highRisk" className="text-sm">High</Label>
                  <Input id="highRisk" type="number" value={riskThresholds.highRiskScore} min="0" max="100" onChange={(e) => setRiskThresholds((p) => ({ ...p, highRiskScore: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Button onClick={handleSaveAML} disabled={isUpdatingAML}>{isUpdatingAML ? "Saving..." : "Save AML Settings"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}