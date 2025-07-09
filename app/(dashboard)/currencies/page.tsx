"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CurrencyForm } from "@/components/currencies/CurrencyForm";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Coins,
  Calendar,
  RefreshCw
} from "lucide-react";

type SortField = "code" | "name" | "marketRate" | "lastUpdated";
type SortDirection = "asc" | "desc";

export default function CurrenciesPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"currencies"> | null>(null);
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchTerm, setSearchTerm] = useState("");

  const currencies = useQuery(api.currencies.list, { searchTerm }) || [];
  const deleteCurrency = useMutation(api.currencies.remove);
  const bulkUpdateRates = useAction(api.currencies.bulkUpdateRates);

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
      } catch {
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

      if (result.errors.length > 0) {
        console.error("Bulk update errors:", result.errors);
      }
    } catch (error) {
      toast.error("Failed to refresh currency rates", { id: "bulk-refresh" });
      console.error("Bulk refresh error:", error);
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

  // Sort currencies - memoized to prevent unnecessary re-renders
  const sortedCurrencies = useMemo(() => {
    return [...currencies].sort((a, b) => {
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
  }, [currencies, sortField, sortDirection]);

  if (showForm) {
    return (
      <CurrencyForm
        editingId={editingId}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        isOpen={showForm}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Coins className="h-8 w-8" />
          Currencies
        </h1>
        <p className="text-muted-foreground">
          Manage exchange rates and currency settings
        </p>
      </div>

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
            <div className="flex items-center gap-2">
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4" />
                New Currency
              </Button>

              <Button
                onClick={handleEdit}
                disabled={selectedIds.size !== 1}
                variant="secondary"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>

              <Button
                onClick={handleDelete}
                disabled={selectedIds.size === 0}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedIds.size})
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <Button
              onClick={handleRefreshRates}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Rates
            </Button>

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
                  <div className="flex items-center gap-2">
                    Code
                    {getSortIcon("code")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-2">
                    Name
                    {getSortIcon("name")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("marketRate")}
                >
                  <div className="flex items-center gap-2">
                    Market Rate
                    {getSortIcon("marketRate")}
                  </div>
                </TableHead>
                <TableHead>Buy Rate</TableHead>
                <TableHead>Sell Rate</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
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
                      <span className="text-lg">{currency.flag}</span>
                      {currency.code}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{currency.name}</div>
                      <div className="text-sm text-muted-foreground">{currency.country}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatRate(currency.marketRate)}
                  </TableCell>
                  <TableCell className="font-mono text-green-600">
                    {formatRate(currency.buyRate)}
                    {currency.manualBuyRate && <Badge variant="outline" className="ml-1 text-xs">Manual</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-red-600">
                    {formatRate(currency.sellRate)}
                    {currency.manualSellRate && <Badge variant="outline" className="ml-1 text-xs">Manual</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(currency.lastUpdated).toLocaleDateString()}
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
                            } catch {
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
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Coins className="h-8 w-8 text-muted-foreground" />
                      <div className="text-lg font-medium">No currencies found</div>
                      <div className="text-muted-foreground">
                        {searchTerm ? "Try adjusting your search" : "Get started by adding your first currency"}
                      </div>
                      {!searchTerm && (
                        <Button onClick={handleNew} variant="outline" className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Currency
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}