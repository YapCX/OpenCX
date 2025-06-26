import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CustomerForm } from "./CustomerForm";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
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
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  History,
  Building2,
  User
} from "lucide-react";
import { PageLayout, PageHeader, GridLayout, EmptyState, FlexLayout, ActionBar } from "../layout";

type SortField = "customerId" | "fullName" | "legalBusinessName" | "phoneNumber" | "businessPhone" | "occupation" | "typeOfBusiness" | "createdAt";
type SortDirection = "asc" | "desc";
type CustomerType = "individual" | "corporate" | "all";

export function CustomersModule() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"customers"> | null>(null);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<Id<"customers"> | null>(null);

  const customers = useQuery(api.customers.list, {
    searchTerm,
    customerType: typeFilter === "all" ? undefined : typeFilter as "individual" | "corporate",
  }) || [];
  const deleteCustomer = useMutation(api.customers.remove);

  const handleNew = () => {
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (id: Id<"customers">) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: Id<"customers">) => {
    const confirmed = window.confirm("Are you sure you want to delete this customer?");

    if (confirmed) {
      try {
        await deleteCustomer({ id });
        toast.success("Customer deleted successfully");
      } catch (error) {
        toast.error("Failed to delete customer");
      }
    }
  };

  const handleViewTransactions = (customerId: Id<"customers">) => {
    setSelectedCustomerId(customerId);
    setShowTransactionHistory(true);
    // Note: Transaction history functionality would need to be implemented
    toast.info("Transaction history feature coming soon");
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "secondary";
      case "inactive": return "outline";
      case "pending": return "default";
      case "suspended": return "destructive";
      default: return "outline";
    }
  };

  const getRiskLevelVariant = (riskLevel?: string) => {
    switch (riskLevel) {
      case "low": return "secondary";
      case "medium": return "default";
      case "high": return "destructive";
      default: return "outline";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Filter customers based on search and filters
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm ||
      customer.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.legalBusinessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.businessPhone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    const matchesType = typeFilter === "all" || customer.customerType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <PageLayout>
      <PageHeader
        icon={<Users className="h-6 w-6" />}
        title="Customers"
        description="Manage customer profiles and compliance"
        actions={
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4" />
            Add New Customer
          </Button>
        }
      />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>
            Find and filter customers by name, ID, type, or status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FlexLayout gap={4} className="flex-wrap">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </FlexLayout>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Customer Records ({filteredCustomers.length})</span>
          </CardTitle>
          <CardDescription>
            View and manage all customer profiles and compliance information
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer._id}>
                  <TableCell>
                    <FlexLayout gap={2}>
                      {customer.customerType === "individual" ? (
                        <User className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">
                          {customer.customerType === "individual"
                            ? customer.fullName
                            : customer.legalBusinessName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {customer.customerId}
                        </div>
                      </div>
                    </FlexLayout>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.customerType === "individual" ? "secondary" : "default"}>
                      {customer.customerType === "individual" ? "Individual" : "Corporate"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {customer.customerType === "individual" ? (
                        <>
                          {customer.phoneNumber && (
                            <div className="text-sm">{customer.phoneNumber}</div>
                          )}
                          {customer.fullAddress && (
                            <div className="text-xs text-muted-foreground truncate max-w-32">
                              {customer.fullAddress}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {customer.businessPhone && (
                            <div className="text-sm">{customer.businessPhone}</div>
                          )}
                          {customer.businessAddress && (
                            <div className="text-xs text-muted-foreground truncate max-w-32">
                              {customer.businessAddress}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(customer.status)}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.riskLevel && (
                      <Badge variant={getRiskLevelVariant(customer.riskLevel)}>
                        {customer.riskLevel}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(customer.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionBar className="justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(customer._id)}
                        title="Edit Customer"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewTransactions(customer._id)}
                        title="View Transaction History"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(customer._id)}
                        title="Delete Customer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ActionBar>
                  </TableCell>
                </TableRow>
              ))}

              {filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      icon={<Users />}
                      title={searchTerm || statusFilter !== "all" || typeFilter !== "all" ? "No customers found" : "No customers yet"}
                      description={
                        searchTerm || statusFilter !== "all" || typeFilter !== "all"
                          ? "Try adjusting your search or filter settings to find what you're looking for"
                          : "Get started by adding your first customer profile to begin processing transactions"
                      }
                      action={
                        !searchTerm && statusFilter === "all" && typeFilter === "all" ? (
                          <Button onClick={handleNew} variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Customer
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
    </PageLayout>
  );
}