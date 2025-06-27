import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CurrencyForm } from "./CurrencyForm";
import { toast } from "sonner";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import Papa from "papaparse";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { PageLayout, PageHeader, ActionBar, EmptyState, FlexLayout } from "../layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Coins,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  AlertCircle
} from "lucide-react";

type SortField = "code" | "name" | "marketRate" | "lastUpdated";
type SortDirection = "asc" | "desc";

export function CurrencyModule() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"currencies"> | null>(null);
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchTerm, setSearchTerm] = useState("");

  const currencies = useQuery(api.currencies.list, {}) || [];
  const deleteCurrency = useMutation(api.currencies.remove);
  const updateCurrency = useMutation(api.currencies.update);
  const bulkUpdateRates = useAction(api.currencies.bulkUpdateRates);

  // Import requires create mutation
  const createCurrency = useMutation(api.currencies.create);

  // Define handler functions first
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = () => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0] as Id<"currencies">;
      setEditingId(id);
      setShowForm(true);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} currency(ies)?`
    );

    if (confirmed) {
      try {
        for (const id of selectedIds) {
          await deleteCurrency({ id: id as Id<"currencies"> });
        }
        setSelectedIds(new Set());
        toast.success(`Deleted ${selectedIds.size} currency(ies)`);
      } catch (error) {
        toast.error("Failed to delete currencies");
      }
    }
  };

  const handleRefreshRates = async () => {
    try {
      toast.loading("Refreshing currency rates...", { id: "bulk-refresh" });

      const result = await bulkUpdateRates({});

      if (result.updated > 0) {
        let message = `Successfully updated ${result.updated} currency rates`;
        if (result.failed > 0) {
          message += `, ${result.failed} failed`;
        }

        toast.success(message, { id: "bulk-refresh" });
      } else if (result.failed > 0) {
        toast.error(
          `Failed to update ${result.failed} currencies. Check console for details.`,
          { id: "bulk-refresh" }
        );
      } else {
        toast.info("No currencies to update", { id: "bulk-refresh" });
      }

      // Log detailed errors for debugging
      if (result.errors.length > 0) {
        console.error("Bulk update errors:", result.errors);
      }
    } catch (error) {
      toast.error("Failed to refresh currency rates", { id: "bulk-refresh" });
      console.error("Bulk refresh error:", error);
    }
  };

  const handleExportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Code,Name,Country,Flag,Symbol,MarketRate,DiscountPercent,MarkupPercent,BuyRate,SellRate,ManualBuyRate,ManualSellRate,Updated\n" +
      currencies.map(c =>
        `${c.code},${c.name},${c.country},${c.flag},${c.symbol},${c.marketRate},${c.discountPercent},${c.markupPercent},${c.buyRate},${c.sellRate},${c.manualBuyRate},${c.manualSellRate},${new Date(c.lastUpdated).toISOString()}`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "currencies.csv");
    link.click();
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await processImportFile(file);
      }
    };
    input.click();
  };

  const processImportFile = async (file: File) => {
    try {
      toast.loading("Processing import file...", { id: "csv-import" });

      const text = await file.text();

      // Parse CSV with PapaParse - handles all edge cases automatically
      const results = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim(),
        transform: (value) => value?.trim() || ''
      });

      if (results.errors.length > 0) {
        console.warn("CSV parsing errors:", results.errors);
        toast.warning(`CSV parsing had ${results.errors.length} warnings. Check console for details.`, { id: "csv-import" });
      }

      if (results.data.length === 0) {
        toast.error("CSV file contains no data rows", { id: "csv-import" });
        return;
      }

      // Validate required headers
      const requiredHeaders = ['code', 'name', 'country', 'flag', 'symbol', 'marketrate'];
      const availableHeaders = results.meta.fields || [];
      const missingHeaders = requiredHeaders.filter(h => !availableHeaders.includes(h));

      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`, { id: "csv-import" });
        return;
      }

      // Process and validate data
      const currencies = [];
      const errors = [];

      for (let i = 0; i < results.data.length; i++) {
        const row = results.data[i];
        const rowNum = i + 2; // +2 because: 0-based index + header row

        try {
          // Validate required fields
          if (!row.code || row.code.length !== 3) {
            errors.push(`Row ${rowNum}: Invalid currency code "${row.code}"`);
            continue;
          }

          if (!row.name) {
            errors.push(`Row ${rowNum}: Currency name is required`);
            continue;
          }

          if (!row.country) {
            errors.push(`Row ${rowNum}: Country is required`);
            continue;
          }

          if (!row.flag) {
            errors.push(`Row ${rowNum}: Flag emoji is required`);
            continue;
          }

          if (!row.symbol) {
            errors.push(`Row ${rowNum}: Currency symbol is required`);
            continue;
          }

          const marketRate = parseFloat(row.marketrate);
          if (isNaN(marketRate) || marketRate <= 0) {
            errors.push(`Row ${rowNum}: Invalid market rate "${row.marketrate}"`);
            continue;
          }

          // Optional fields with defaults
          const discountPercent = row.discountpercent ? parseFloat(row.discountpercent) : undefined;
          const markupPercent = row.markuppercent ? parseFloat(row.markuppercent) : undefined;
          const buyRate = row.buyrate ? parseFloat(row.buyrate) : marketRate * 0.975; // Default 2.5% discount
          const sellRate = row.sellrate ? parseFloat(row.sellrate) : marketRate * 1.035; // Default 3.5% markup

          currencies.push({
            code: row.code.toUpperCase(),
            name: row.name,
            country: row.country,
            flag: row.flag,
            symbol: row.symbol,
            marketRate,
            discountPercent,
            markupPercent,
            buyRate,
            sellRate,
            manualBuyRate: row.manualbuyrate?.toLowerCase() === 'true',
            manualSellRate: row.manualsellrate?.toLowerCase() === 'true',
          });
        } catch (error) {
          errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        console.warn("Import validation errors:", errors);
        toast.warning(`${currencies.length} currencies parsed, ${errors.length} validation errors. Check console for details.`, { id: "csv-import" });
      }

      if (currencies.length === 0) {
        toast.error("No valid currencies found to import", { id: "csv-import" });
        return;
      }

      // Import currencies
      let imported = 0;
      let failed = 0;
      const importErrors = [];

      toast.loading(`Importing ${currencies.length} currencies...`, { id: "csv-import" });

      for (const currency of currencies) {
        try {
          await createCurrency(currency);
          imported++;
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          importErrors.push(`${currency.code}: ${errorMsg}`);
        }
      }

      // Show final result
      if (imported > 0) {
        let message = `Successfully imported ${imported} currencies`;
        if (failed > 0) {
          message += `, ${failed} failed`;
        }
        toast.success(message, { id: "csv-import" });
      } else {
        toast.error(`Failed to import currencies. ${importErrors.slice(0, 3).join(', ')}${importErrors.length > 3 ? '...' : ''}`, { id: "csv-import" });
      }

      if (importErrors.length > 0) {
        console.error("Import errors:", importErrors);
      }
    } catch (error) {
      toast.error("Failed to process import file", { id: "csv-import" });
      console.error("Import processing error:", error);
    }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(currencies.map(c => c._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(rate);
  };

  // Filter and sort currencies
  const filteredCurrencies = currencies.filter(currency =>
    !searchTerm ||
    currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCurrencies = [...filteredCurrencies].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Keyboard shortcuts (after functions are defined)
  useKeyboardShortcuts({
    n: handleNew,
    e: handleEdit,
    r: handleRefreshRates
  }, [selectedIds]);

  // Handle loading state (when currencies is undefined due to network issues)
  if (currencies === undefined) {
    return (
      <PageLayout>
        <PageHeader
          icon={<Coins className="h-6 w-6" />}
          title="Currencies"
          description="Loading currency information..."
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

  // Handle connection error state
  if (!Array.isArray(currencies)) {
    return (
      <PageLayout>
        <PageHeader
          icon={<Coins className="h-6 w-6" />}
          title="Currencies"
          description="Manage exchange rates and currency settings"
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Connection Error
            </CardTitle>
            <CardDescription>
              Unable to load currency data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to connect to the backend service. Please check your network connection and try again.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  if (showForm) {
    return (
      <CurrencyForm
        editingId={editingId}
        onClose={() => setShowForm(false)}
        isOpen={showForm}
      />
    );
  }

  return (
    <PageLayout>
      {/* Page Header */}
      <PageHeader
        icon={<Coins className="h-6 w-6" />}
        title="Currencies"
        description="Manage exchange rates and currency settings"
      />

      {/* Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Create, edit, and manage currency exchange rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <ActionBar>
              <Button onClick={handleNew} title="New Currency (Cmd+N)">
                <Plus className="h-4 w-4" />
                New Currency
              </Button>

              <Button
                onClick={handleEdit}
                disabled={selectedIds.size !== 1}
                variant="secondary"
                title="Edit Currency (Cmd+E)"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>

              <Button
                onClick={handleDelete}
                disabled={selectedIds.size === 0}
                variant="destructive"
                title="Delete Selected Currencies"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedIds.size})
              </Button>
            </ActionBar>

            <Separator orientation="vertical" className="h-6" />

            <Button
              onClick={handleRefreshRates}
              variant="outline"
              title="Refresh Exchange Rates and Symbols (Cmd+R)"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Rates & Symbols
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <ActionBar>
              <Button
                onClick={handleExportData}
                variant="outline"
                title="Export Currency Data"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>

              <Button
                onClick={handleImportData}
                variant="outline"
                title="Import Currency Data"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </ActionBar>

            <Separator orientation="vertical" className="h-6" />

            <Input
              placeholder="Search currencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </CardContent>
      </Card>

      {/* Currencies Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Currency Records ({sortedCurrencies.length})</span>
            {selectedIds.size > 0 && (
              <Badge variant="secondary">
                {selectedIds.size} selected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Manage all currency exchange rates and market data
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === sortedCurrencies.length && sortedCurrencies.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("code")}
                >
                  <FlexLayout gap={2}>
                    Code
                    {getSortIcon("code")}
                  </FlexLayout>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("name")}
                >
                  <FlexLayout gap={2}>
                    Name
                    {getSortIcon("name")}
                  </FlexLayout>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("marketRate")}
                >
                  <FlexLayout gap={2}>
                    Market Rate
                    {getSortIcon("marketRate")}
                  </FlexLayout>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("lastUpdated")}
                >
                  <FlexLayout gap={2}>
                    Last Updated
                    {getSortIcon("lastUpdated")}
                  </FlexLayout>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCurrencies.map((currency) => (
                <TableRow key={currency._id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(currency._id)}
                      onCheckedChange={(checked) =>
                        handleRowSelect(currency._id, checked as boolean)
                      }
                      aria-label={`Select ${currency.code}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <FlexLayout gap={2}>
                      <span className="text-lg">{currency.flag}</span>
                      {currency.code}
                    </FlexLayout>
                  </TableCell>
                  <TableCell>
                    {currency.name}
                  </TableCell>
                  <TableCell className="font-mono">
                    <FlexLayout gap={2}>
                      <span>{formatRate(currency.marketRate)}</span>
                    </FlexLayout>
                  </TableCell>
                  <TableCell>
                    <FlexLayout gap={2} className="text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(currency.lastUpdated).toLocaleString()}
                    </FlexLayout>
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionBar className="justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(currency._id);
                          setShowForm(true);
                        }}
                        title="Edit Currency"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this currency?')) {
                            try {
                              await deleteCurrency({ id: currency._id });
                              toast.success('Currency deleted');
                            } catch (error) {
                              toast.error('Failed to delete currency');
                            }
                          }
                        }}
                        title="Delete Currency"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ActionBar>
                  </TableCell>
                </TableRow>
              ))}
              {sortedCurrencies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      icon={<Coins />}
                      title={searchTerm ? "No currencies found" : "No currencies yet"}
                      description={
                        searchTerm
                          ? `No currencies found matching "${searchTerm}". Try adjusting your search.`
                          : "Get started by adding your first currency to enable exchange rate management"
                      }
                      action={
                        !searchTerm ? (
                          <Button onClick={handleNew} variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Currency
                          </Button>
                        ) : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
