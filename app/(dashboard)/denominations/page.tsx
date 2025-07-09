"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { DenominationForm } from "@/components/denominations/DenominationForm";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Banknote,
  Plus,
  Pencil,
  Trash2,
  Download,
  Loader2,
  Coins,
  ArrowUpDown,
  Filter
} from "lucide-react";

type SortField = "currencyCode" | "value" | "isCoin";
type SortDirection = "asc" | "desc";

export default function DenominationsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"denominations"> | null>(null);
  const [sortField, setSortField] = useState<SortField>("currencyCode");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [isImporting, setIsImporting] = useState(false);

  // Queries
  const denominations = useQuery(api.denominations.list, {}) || [];
  const currencies = useQuery(api.currencies.list, {}) || [];
  const standardDenominations = useQuery(
    api.denominations.checkStandardDenominations,
    filterCurrency && filterCurrency !== "all" ? { currencyCode: filterCurrency } : "skip"
  ) || {
    availableToImport: 0,
    existing: 0,
    total: 0,
    hasStandard: false,
  };

  const deleteDenomination = useMutation(api.denominations.remove);
  const bulkDelete = useMutation(api.denominations.bulkDelete);
  const loadStandardDenominations = useMutation(api.denominations.loadStandardDenominations);

  // Data processing - memoized to prevent unnecessary re-renders
  const filteredDenominations = useMemo(() => denominations.filter(d =>
    !filterCurrency || filterCurrency === "all" || d.currencyCode === filterCurrency
  ), [denominations, filterCurrency]);

  const sortedDenominations = useMemo(() => [...filteredDenominations].sort((a, b) => {
    let aValue: string | number | boolean = a[sortField];
    let bValue: string | number | boolean = b[sortField];

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  }), [filteredDenominations, sortField, sortDirection]);

  // Handler functions
  const handleNew = () => {
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = () => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0] as Id<"denominations">;
      setEditingId(id);
      setShowForm(true);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} denomination(s)?`
    );

    if (confirmed) {
      try {
        if (selectedIds.size > 1) {
          await bulkDelete({ ids: Array.from(selectedIds) as Id<"denominations">[] });
        } else {
          await deleteDenomination({ id: Array.from(selectedIds)[0] as Id<"denominations"> });
        }
        setSelectedIds(new Set());
        toast.success(`Deleted ${selectedIds.size} denomination(s)`);
      } catch {
        toast.error("Failed to delete denominations");
      }
    }
  };

  const handleLoadStandard = async () => {
    if (!filterCurrency || filterCurrency === "all") {
      toast.error("Please select a currency to load standard denominations");
      return;
    }

    if (!standardDenominations?.hasStandard) {
      toast.error(`No standard denominations available for ${filterCurrency}`);
      return;
    }

    if (standardDenominations.availableToImport === 0) {
      toast.info("All standard denominations are already loaded for this currency");
      return;
    }

    const confirmed = window.confirm(
      `Load ${standardDenominations.availableToImport} standard denominations for ${filterCurrency}?\n\n` +
      `This will add ${standardDenominations.availableToImport} new denominations to your database (${standardDenominations.existing} already exist).`
    );

    if (confirmed) {
      setIsImporting(true);
      try {
        const result = await loadStandardDenominations({ currencyCode: filterCurrency });
        toast.success(
          `Successfully loaded ${result.imported} denominations for ${filterCurrency}` +
          (result.skipped > 0 ? ` (${result.skipped} already existed)` : "")
        );
      } catch {
        toast.error("Failed to load standard denominations");
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  if (showForm) {
    return (
      <DenominationForm
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
          Denominations
        </h1>
        <p className="text-muted-foreground">
          Manage currency denominations and their values
        </p>
      </div>

      {/* Filter and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Manage Denominations
          </CardTitle>
          <CardDescription>
            Filter by currency and manage your denomination records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Currency Filter */}
            <div className="space-y-2">
              <Label htmlFor="currency-filter">Filter by Currency</Label>
              <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                <SelectTrigger id="currency-filter" className="max-w-xs">
                  <SelectValue placeholder="Choose a currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  {currencies.map((currency) => (
                    <SelectItem key={currency._id} value={currency.code}>
                      <div className="flex items-center gap-2">
                        <span>{currency.flag}</span>
                        <span>{currency.code} - {currency.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {filterCurrency && filterCurrency !== "all" && (
                <div className="text-sm text-muted-foreground mt-2">
                  {standardDenominations === null ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Checking for standard denominations...</span>
                    </div>
                  ) : standardDenominations?.hasStandard ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        <span>
                          {standardDenominations.total} standard values available for {filterCurrency}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-600">
                        <Coins className="h-4 w-4" />
                        <span>
                          {standardDenominations.existing} already in your system
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-600">
                      <Banknote className="h-4 w-4" />
                      <span>No standard values available for {filterCurrency}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4" />
                New Denomination
              </Button>

              {filterCurrency && filterCurrency !== "all" && (
                <>
                  {standardDenominations === null ? (
                    <Button variant="outline" disabled>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading standard denominations...
                    </Button>
                  ) : standardDenominations?.hasStandard ? (
                    <Button
                      onClick={handleLoadStandard}
                      disabled={isImporting || standardDenominations.availableToImport === 0}
                      variant="outline"
                      title={`Load ${standardDenominations.availableToImport} standard denominations to database`}
                    >
                      {isImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {isImporting ? "Loading..." : `Load Standard (${standardDenominations.availableToImport})`}
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      No standard denominations available for {filterCurrency}
                    </Button>
                  )}
                </>
              )}

              {selectedIds.size > 0 && (
                <>
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
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete ({selectedIds.size})
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Denominations Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Denominations ({sortedDenominations.length})
            </span>
            {selectedIds.size > 0 && (
              <Badge variant="secondary">
                {selectedIds.size} selected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            All denomination values currently available in your system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === sortedDenominations.length && sortedDenominations.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds(new Set(sortedDenominations.map(d => d._id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("currencyCode")}
                >
                  <div className="flex items-center gap-1">
                    Currency
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("value")}
                >
                  <div className="flex items-center gap-1">
                    Value
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("isCoin")}
                >
                  <div className="flex items-center gap-1">
                    Type
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Image</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDenominations.map((denomination) => (
                <TableRow key={denomination._id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(denomination._id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedIds);
                        if (checked) {
                          newSelected.add(denomination._id);
                        } else {
                          newSelected.delete(denomination._id);
                        }
                        setSelectedIds(newSelected);
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {denomination.currencyCode}
                  </TableCell>
                  <TableCell className="font-mono">
                    {denomination.value}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={denomination.isCoin ? "default" : "secondary"}
                      className="gap-1"
                    >
                      {denomination.isCoin ? (
                        <Coins className="h-3 w-3" />
                      ) : (
                        <Banknote className="h-3 w-3" />
                      )}
                      {denomination.isCoin ? "Coin" : "Note"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {denomination.imageUrl ? (
                      <Image
                        src={denomination.imageUrl}
                        alt={`${denomination.currencyCode} ${denomination.value}`}
                        width={32}
                        height={32}
                        className="object-contain rounded"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">No image</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {sortedDenominations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="text-center py-8">
                      <Banknote className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <div className="text-lg font-medium">
                        {filterCurrency ? "No denominations found" : "No denominations yet"}
                      </div>
                      <div className="text-muted-foreground mb-4">
                        {filterCurrency && filterCurrency !== "all"
                          ? `No denominations found for ${filterCurrency}. Try selecting a different currency or add a new denomination.`
                          : "Choose a currency above to view and manage denominations, or add your first denomination."
                        }
                      </div>
                      <Button onClick={handleNew} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Denomination
                      </Button>
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