import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { Banknote, Plus, Pencil, Trash2 } from "lucide-react";

// Testing Select component issue
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6" />
            Denominations
          </h1>
          <p className="text-gray-600">Manage currency denominations and values</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleNew}>
            New
          </Button>
          {selectedIds.size > 0 && (
            <>
              <Button onClick={handleEdit} disabled={selectedIds.size !== 1}>
                Edit
              </Button>
              <Button onClick={handleDelete} variant="destructive">
                Delete ({selectedIds.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter - testing with aria fix */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <Select value={filterCurrency} onValueChange={setFilterCurrency}>
              <SelectTrigger aria-describedby={undefined}>
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
        </CardContent>
      </Card>

      {/* Table using shadcn Table component */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDenominations.map((denomination) => (
                <TableRow key={denomination._id}>
                  <TableCell className="font-medium">
                    {denomination.currencyCode}
                  </TableCell>
                  <TableCell>
                    {denomination.value}
                  </TableCell>
                  <TableCell>
                    {denomination.isCoin ? "Coin" : "Note"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sortedDenominations.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No denominations found. Click "New" to add your first denomination.
            </div>
          )}
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
    </div>
  );
}