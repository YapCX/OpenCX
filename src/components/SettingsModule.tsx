import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Settings, AlertTriangle, Globe, Clock } from "lucide-react";

export function SettingsModule() {
  const [isUpdating, setIsUpdating] = useState(false);

  const baseCurrency = useQuery(api.settings.getBaseCurrency);
  const currencies = useQuery(api.currencies.list, {}) || [];
  const setBaseCurrency = useMutation(api.settings.setBaseCurrency);

  const [selectedBaseCurrency, setSelectedBaseCurrency] = useState<string>("");

  const handleSaveBaseCurrency = async () => {
    if (!selectedBaseCurrency) {
      toast.error("Please select a base currency");
      return;
    }

    setIsUpdating(true);
    try {
      const result = await setBaseCurrency({ currencyCode: selectedBaseCurrency });
      toast.success(`Base currency updated to ${result}`);
      setSelectedBaseCurrency(""); // Reset selection after successful update
    } catch (error: any) {
      console.error("Failed to update base currency:", error);
      toast.error(error.message || "Failed to update base currency. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="space-y-6">
        {/* Header */}
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

        {/* Currency Settings Card */}
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
            {/* Current Base Currency Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Current Base Currency</Label>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {baseCurrency || "Loading..."}
                  </Badge>
                  {baseCurrency && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Active</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This currency serves as the reference for all exchange rate calculations and local transactions
              </p>
            </div>

            <Separator />

            {/* Change Base Currency Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency-select" className="text-sm font-medium">
                  Change Base Currency
                </Label>
                <div className="flex gap-3">
                  <Select
                    value={selectedBaseCurrency}
                    onValueChange={(value) => {
                      console.log("Selected currency:", value);
                      setSelectedBaseCurrency(value);
                    }}
                  >
                    <SelectTrigger id="currency-select" className="flex-1">
                      <SelectValue placeholder="Select a new base currency..." />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.length === 0 ? (
                        <div className="p-3 text-center">
                          <p className="text-sm text-muted-foreground">
                            No currencies available
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Add currencies first to change the base currency
                          </p>
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
                    className="min-w-[100px]"
                  >
                    {isUpdating ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Select a currency from your configured currencies to set as the new base currency
              </p>
            </div>

            {/* Warning Alert */}
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
      </div>
    </div>
  );
}