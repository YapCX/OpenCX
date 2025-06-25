import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CustomerForm } from "./CustomerForm";
import { AMLSettingsDialog } from "./AMLSettingsDialog";
import { toast } from "sonner";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
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
  Search,
  Shield,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users
} from "lucide-react";

type SortField = "customerId" | "fullName" | "legalBusinessName" | "phoneNumber" | "businessPhone" | "occupation" | "typeOfBusiness" | "createdAt";
type SortDirection = "asc" | "desc";
type CustomerType = "individual" | "corporate" | "all";

export function CustomersModule() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"customers"> | null>(null);
  const [sortField, setSortField] = useState<SortField>("customerId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType>("all");
  const [showAMLSettings, setShowAMLSettings] = useState(false);

  const customers = useQuery(api.customers.list, {
    searchTerm,
    customerType: customerTypeFilter === "all" ? undefined : customerTypeFilter
  }) || [];
  const deleteCustomer = useMutation(api.customers.remove);

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
      const id = Array.from(selectedIds)[0] as Id<"customers">;
      setEditingId(id);
      setShowForm(true);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} customer record(s)?`
    );

    if (confirmed) {
      try {
        for (const id of selectedIds) {
          await deleteCustomer({ id: id as Id<"customers"> });
        }
        setSelectedIds(new Set());
        toast.success(`Deleted ${selectedIds.size} customer record(s)`);
      } catch (error) {
        toast.error("Failed to delete customer records");
      }
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
      setSelectedIds(new Set(sortedCustomers.map(c => c._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Sort customers
  const sortedCustomers = [...customers].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle null/undefined values
    if (!aValue && !bValue) return 0;
    if (!aValue) return 1;
    if (!bValue) return -1;

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Keyboard shortcuts (now after functions are defined)
  useKeyboardShortcuts({
    n: handleNew,
    e: handleEdit
  }, [selectedIds]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "secondary";
      case "inactive": return "outline";
      case "pending": return "destructive";
      default: return "secondary";
    }
  };

  const getSanctionsVariant = (status?: string) => {
    switch (status) {
      case "pending": return "destructive";
      case "clear": return "secondary";
      case "flagged": return "destructive";
      case "error": return "outline";
      default: return "outline";
    }
  };

  const getCustomerDisplayName = (customer: any) => {
    return customer.customerType === "individual" ? customer.fullName : customer.legalBusinessName;
  };

  const getCustomerPhone = (customer: any) => {
    return customer.customerType === "individual" ? customer.phoneNumber : customer.businessPhone;
  };

  const getCustomerOccupationOrBusiness = (customer: any) => {
    return customer.customerType === "individual" ? customer.occupation : customer.typeOfBusiness;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Customers
          </h1>
          <p className="text-muted-foreground">Manage customer profiles and compliance</p>
        </div>

        {searchTerm && (
          <Badge variant="secondary" className="text-sm">
            Found: {sortedCustomers.length} customer(s)
          </Badge>
        )}
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleNew} className="gap-2" title="New Customer (Cmd+N)">
              <Plus className="h-4 w-4" />
              New Customer
            </Button>

            <Button
              onClick={handleEdit}
              disabled={selectedIds.size !== 1}
              variant="secondary"
              className="gap-2"
              title="Edit Customer (Cmd+E)"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>

            <Button
              onClick={handleDelete}
              disabled={selectedIds.size === 0}
              variant="destructive"
              className="gap-2"
              title="Delete Selected Customers"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              onClick={() => setShowAMLSettings(true)}
              variant="secondary"
              className="gap-2"
              title="AML/Sanctions Settings"
            >
              <Shield className="h-4 w-4" />
              AML Settings
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Select value={customerTypeFilter} onValueChange={(value) => setCustomerTypeFilter(value as CustomerType)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === sortedCustomers.length && sortedCustomers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort("customerId")}
                >
                  <div className="flex items-center gap-2">
                    Customer ID {getSortIcon("customerId")}
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort("fullName")}
                >
                  <div className="flex items-center gap-2">
                    Name/Business {getSortIcon("fullName")}
                  </div>
                </TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Occupation/Business</TableHead>
                <TableHead className="text-center">Classification</TableHead>
                <TableHead className="text-center">ID Documents</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Sanctions</TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center justify-center gap-2">
                    Created {getSortIcon("createdAt")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCustomers.map((customer) => (
                <TableRow
                  key={customer._id}
                  className={selectedIds.has(customer._id) ? "bg-muted/50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(customer._id)}
                      onCheckedChange={(checked) => handleRowSelect(customer._id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-medium text-primary">
                    {customer.customerId}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.customerType === "individual" ? "default" : "secondary"}>
                      {customer.customerType === "individual" ? "Individual" : "Corporate"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {getCustomerDisplayName(customer)}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {getCustomerPhone(customer)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getCustomerOccupationOrBusiness(customer)}
                  </TableCell>
                  <TableCell className="text-center">
                    {customer.customerType === "corporate" && (
                      <div className="flex flex-col gap-1">
                        {customer.isWholesalerOrBank && (
                          <Badge variant="secondary">Wholesaler/Bank</Badge>
                        )}
                        {customer.isMSB && (
                          <Badge variant="destructive">MSB</Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {customer.idDocuments?.length || 0} docs
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusVariant(customer.status)}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {customer.sanctionsScreeningStatus && (
                      <Badge variant={getSanctionsVariant(customer.sanctionsScreeningStatus) as any}>
                        {customer.sanctionsScreeningStatus}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {formatDate(customer.createdAt)}
                  </TableCell>
                </TableRow>
              ))}

              {sortedCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    {searchTerm || customerTypeFilter !== "all"
                      ? "No customers found matching your filters."
                      : "No customers added yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Form */}
      {showForm && (
        <CustomerForm
          editingId={editingId}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      )}

      {/* AML Settings Dialog */}
      {showAMLSettings && (
        <AMLSettingsDialog
          isOpen={showAMLSettings}
          onClose={() => setShowAMLSettings(false)}
        />
      )}
    </div>
  );
}