import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { Banknote, Plus, Pencil, Trash2 } from "lucide-react";

// Testing Select component issue
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
  const [filterCurrency, setFilterCurrency] = useState("all");

  // Queries with proper null handling
  const denominations = useQuery(api.denominations.list, {}) || [];
  const currencies = useQuery(api.currencies.list, {}) || [];
  const deleteDenomination = useMutation(api.denominations.remove);

  // Data processing with safe array operations
  const filteredDenominations = denominations.filter(d =>
    filterCurrency === "all" || d.currencyCode === filterCurrency
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

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
          <CardDescription>
            Filter denominations by currency and other criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GridLayout cols={1} mdCols={2} lgCols={3}>
            <div className="space-y-2">
              <Label htmlFor="currency-filter">Currency</Label>
              <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                <SelectTrigger id="currency-filter">
                  <SelectValue placeholder="All currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All currencies</SelectItem>
                  {currencies.map((currency) => (
                    <SelectItem key={currency._id} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </GridLayout>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Create and manage denomination records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionBar>
            <Button onClick={handleNew} title="New Denomination (Cmd+N)">
              <Plus className="h-4 w-4" />
              New Denomination
            </Button>
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
                  title="Delete Selected Denominations"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedIds.size})
                </Button>
              </>
            )}
          </ActionBar>
        </CardContent>
      </Card>

      {/* Denominations Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Denomination Records ({sortedDenominations.length})</span>
            {selectedIds.size > 0 && (
              <Badge variant="secondary">
                {selectedIds.size} selected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            View and manage currency denominations and their values
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
                      title={filterCurrency !== "all" ? "No denominations found" : "No denominations yet"}
                      description={
                        filterCurrency !== "all"
                          ? "Try adjusting your filter settings to find what you're looking for"
                          : "Get started by adding your first denomination to define currency values"
                      }
                      action={
                        filterCurrency === "all" ? (
                          <Button onClick={handleNew} variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Denomination
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

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingId(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Denomination" : "New Denomination"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Form temporarily disabled for debugging</p>
            <Button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}