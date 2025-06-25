import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Search, HelpCircle, Globe, CheckCircle } from "lucide-react";

interface SupportedCurrency {
  code: string;
  name: string;
  country: string;
  flag: string;
}

export function SupportedCurrenciesDialog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currencies, setCurrencies] = useState<SupportedCurrency[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const getAvailableCurrencies = useAction(api.currencyData.getAvailableCurrencies);
  const searchCurrencies = useAction(api.currencyData.searchCurrencies);

  const handleOpenDialog = async () => {
    setIsOpen(true);
    if (currencies.length === 0) {
      setIsLoading(true);
      try {
        const result = await getAvailableCurrencies();
        setCurrencies(result);
      } catch (error) {
        console.error("Failed to load currencies:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      // Show all currencies when search is cleared
      const result = await getAvailableCurrencies();
      setCurrencies(result);
      return;
    }

    setIsLoading(true);
    try {
      const result = await searchCurrencies({ searchTerm: term });
      setCurrencies(result);
    } catch (error) {
      console.error("Failed to search currencies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleOpenDialog}>
          <HelpCircle className="h-4 w-4 mr-2" />
          Browse Currencies
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Available Currencies for Auto-Population
          </DialogTitle>
          <DialogDescription>
            Our system now supports <strong>all world currencies</strong> with automatic population!
            Simply type any 3-letter currency code (e.g., "CAD", "EUR", "JPY") and the details will be filled automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3.5 text-muted-foreground" />
            <Input
              placeholder="Search currencies by code, name, or country..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Info Card */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  Comprehensive Currency Database
                </h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                We now use the official ISO 4217 currency database with real-time data from all countries worldwide.
                This includes current currencies, recent changes (like Croatia adopting the Euro), and accurate flag emojis.
              </p>
            </CardContent>
          </Card>

          {/* Currency Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {currencies.length} currencies {searchTerm ? `found for "${searchTerm}"` : 'available'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {currencies.slice(0, 50).map((currency) => (
                  <Card key={currency.code} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="font-mono text-sm">
                          {currency.code}
                        </Badge>
                        <span className="text-2xl">{currency.flag}</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">{currency.name}</h4>
                        <p className="text-xs text-muted-foreground">{currency.country}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {currencies.length > 50 && (
                <div className="text-center py-4">
                  <Badge variant="outline">
                    Showing first 50 results. Use search to find specific currencies.
                  </Badge>
                </div>
              )}

              {currencies.length === 0 && searchTerm && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No currencies found matching "{searchTerm}"</p>
                  <p className="text-xs mt-2">
                    Try searching by currency code (e.g., "USD"), name (e.g., "Dollar"), or country (e.g., "United States")
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Popular Currencies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Popular Currencies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "SEK", "NOK", "INR", "BRL"].map((code) => {
                  const currency = currencies.find(c => c.code === code);
                  return currency ? (
                    <Badge key={code} variant="secondary" className="flex items-center gap-1">
                      <span>{currency.flag}</span>
                      <span className="font-mono">{currency.code}</span>
                    </Badge>
                  ) : (
                    <Badge key={code} variant="outline" className="font-mono">
                      {code}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}