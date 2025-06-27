import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { Banknote, Plus, Pencil, Trash2, Download, Loader2 } from "lucide-react";
import { DenominationForm } from "./DenominationForm";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { PageLayout, PageHeader, GridLayout, ActionBar, EmptyState } from "../layout";

type SortField = "currencyCode" | "value" | "isCoin";
type SortDirection = "asc" | "desc";

export function DenominationsModule() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"denominations"> | null>(null);
  const [sortField, setSortField] = useState<SortField>("currencyCode");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterCurrency, setFilterCurrency] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Queries with proper null handling
  const denominations = useQuery(api.denominations.list, {}) || [];
  const currencies = useQuery(api.currencies.list, {}) || [];
  const standardDenominations = (
    useQuery(
      api.denominations.checkStandardDenominations,
      filterCurrency ? { currencyCode: filterCurrency } : "skip"
    ) || {
      availableToImport: 0,
      existing: 0,
      total: 0,
      hasStandard: false,
    }
  ) as {
    availableToImport: number;
    existing: number;
    total: number;
    hasStandard: boolean;
  };


  const deleteDenomination = useMutation(api.denominations.remove);
  const loadStandardDenominations = useMutation(api.denominations.loadStandardDenominations);

  // Data processing with safe array operations
  const filteredDenominations = denominations.filter(d =>
    !filterCurrency || d.currencyCode === filterCurrency
  );

  const sortedDenominations = [...filteredDenominations].sort((a, b) => {
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
        for (const id of selectedIds) {
          await deleteDenomination({ id: id as Id<"denominations"> });
        }
        setSelectedIds(new Set());
        toast.success(`Deleted ${selectedIds.size} denomination(s)`);
      } catch (error) {
        toast.error("Failed to delete denominations");
      }
    }
  };

  const handleLoadStandard = async () => {
    if (!filterCurrency) {
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
          `Successfully loaded ${result.imported} denominations to database for ${filterCurrency}` +
          (result.skipped > 0 ? ` (${result.skipped} already existed)` : "")
        );
      } catch (error) {
        toast.error("Failed to load standard denominations");
      } finally {
        setIsImporting(false);
      }
    }
  };


  // Keyboard shortcuts
  useKeyboardShortcuts({
    n: handleNew,
    e: handleEdit
  }, [selectedIds]);

  return (
    <PageLayout>
      {/* Page Header */}
      <PageHeader
        icon={<Banknote className="h-6 w-6" />}
        title="Denominations"
        description="Manage currency denominations and values"
      />

      {/* Filter and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Denominations</CardTitle>
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
                  {currencies.map((currency) => (
                    <SelectItem key={currency._id} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {filterCurrency && (
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
                        <span className="w-4 h-4 flex items-center justify-center text-xs">💰</span>
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
            <ActionBar>
            <Button onClick={handleNew} title="New Denomination (Cmd+N)">
              <Plus className="h-4 w-4" />
              New Denomination
            </Button>

            {filterCurrency && (
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
                  title="Edit Denomination (Cmd+E)"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  title="Delete Selected Denominations from Database"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedIds.size})
                </Button>
              </>
            )}
            </ActionBar>
          </div>
        </CardContent>
      </Card>


      {/* Denominations Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Your Denominations ({sortedDenominations.length})
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
                <TableHead>Currency</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
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
                  <TableCell>
                    {denomination.value}
                  </TableCell>
                  <TableCell>
                    <Badge variant={denomination.isCoin ? "default" : "secondary"}>
                      {denomination.isCoin ? "Coin" : "Note"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}

              {sortedDenominations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <EmptyState
                      icon={<Banknote />}
                      title={filterCurrency ? "No denominations found" : "No denominations yet"}
                      description={
                        filterCurrency
                          ? `No denominations found for ${filterCurrency}. Try selecting a different currency or add a new denomination.`
                          : "Choose a currency above to view and manage denominations, or add your first denomination."
                      }
                      action={
                        <Button onClick={handleNew} variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Denomination
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingId(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DenominationForm
            editingId={editingId}
            onClose={() => {
              setShowForm(false);
              setEditingId(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}