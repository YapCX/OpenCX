import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CurrencyForm } from "./CurrencyForm";
import { toast } from "sonner";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "./ui/table";
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
      "Code,Name,Market Rate,Buy Rate,Sell Rate,Updated\n" +
      currencies.map(c =>
        `${c.code},${c.name},${c.marketRate},${c.buyRate},${c.sellRate},${new Date(c.lastUpdated).toISOString()}`
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
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Note: CSV import functionality can be added here in the future
      }
    };
    input.click();
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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="h-6 w-6" />
              Currencies
            </h1>
            <p className="text-muted-foreground">Loading currency information...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle connection error state
  if (!Array.isArray(currencies)) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="h-6 w-6" />
              Currencies
            </h1>
            <p className="text-muted-foreground">Manage exchange rates and currency settings</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to connect to the backend service. Please check your network connection and try again.
          </AlertDescription>
        </Alert>
      </div>
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
    <Card>
      <CardHeader>
        <CardTitle>
          <Coins />
          Currencies
        </CardTitle>
        <CardDescription>Manage exchange rates and currency settings</CardDescription>
        {filteredCurrencies.length > 0 && (
          <Badge variant="secondary">
            {filteredCurrencies.length} currencies
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {/* Toolbar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleNew} className="gap-2" title="New Currency (Cmd+N)">
                <Plus className="h-4 w-4" />
                New Currency
              </Button>

              <Button
                onClick={handleEdit}
                disabled={selectedIds.size !== 1}
                variant="secondary"
                className="gap-2"
                title="Edit Currency (Cmd+E)"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>

              <Button
                onClick={handleDelete}
                disabled={selectedIds.size === 0}
                variant="destructive"
                className="gap-2"
                title="Delete Selected Currencies"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedIds.size})
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <Button
                onClick={handleRefreshRates}
                variant="outline"
                className="gap-2"
                title="Refresh Exchange Rates and Symbols (Cmd+R)"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Rates & Symbols
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <Button
                onClick={handleExportData}
                variant="outline"
                className="gap-2"
                title="Export Currency Data"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>

              <Button
                onClick={handleImportData}
                variant="outline"
                className="gap-2"
                title="Import Currency Data"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search currencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currencies Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Currencies ({sortedCurrencies.length})</span>
              {selectedIds.size > 0 && (
                <Badge variant="secondary">
                  {selectedIds.size} selected
                </Badge>
              )}
            </CardTitle>
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
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("code")}
                  >
                    <div className="flex items-center gap-2">
                      Code
                      {getSortIcon("code")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {getSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("marketRate")}
                  >
                    <div className="flex items-center gap-2">
                      Market Rate
                      {getSortIcon("marketRate")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("lastUpdated")}
                  >
                    <div className="flex items-center gap-2">
                      Last Updated
                      {getSortIcon("lastUpdated")}
                    </div>
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
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        {currency.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      {currency.name}
                    </TableCell>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <span>{formatRate(currency.marketRate)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(currency.lastUpdated).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedCurrencies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ?
                        `No currencies found matching "${searchTerm}".` :
                        "No currencies found. Click \"New Currency\" to get started."
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
