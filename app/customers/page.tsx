"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  User,
  Building2,
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  Shield,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
} from "lucide-react";

type SortField = "createdAt" | "customerId" | "fullName" | "status";
type SortDirection = "asc" | "desc";

export default function CustomersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"customers"> | null>(null);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<string>("");

  const customers = useQuery(api.customers.list, {
    searchTerm: searchTerm || undefined,
    type: typeFilter && typeFilter !== "all" ? typeFilter as "individual" | "corporate" : undefined,
    status: statusFilter && statusFilter !== "all" ? statusFilter as "active" | "inactive" | "pending" | "suspended" | "flagged" : undefined,
    riskLevel: riskFilter && riskFilter !== "all" ? riskFilter as "low" | "medium" | "high" : undefined,
  }) || [];

  const stats = useQuery(api.customers.getStats, {}) || {
    total: 0,
    individual: 0,
    corporate: 0,
    active: 0,
    pending: 0,
    verified: 0,
    pendingVerification: 0,
    suspended: 0,
    flagged: 0,
    lowRisk: 0,
    mediumRisk: 0,
    highRisk: 0,
  };

  const deleteCustomer = useMutation(api.customers.remove);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleEdit = (id: Id<"customers">) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: Id<"customers">) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer({ id });
        toast.success('Customer deleted');
      } catch {
        toast.error('Failed to delete customer');
      }
    }
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "suspended":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "flagged":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-orange-100 text-orange-800";
      case "flagged":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCustomerName = (customer: typeof customers[0]) => {
    if (customer.type === "individual") {
      return customer.fullName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
    }
    return customer.businessName || "Unnamed Business";
  };

  const getAMLStatus = (customer: typeof customers[0]) => {
    if (customer.amlStatus === "approved" && customer.sanctionsScreeningStatus === "clear") {
      return { label: "Verified", color: "bg-green-100 text-green-800", icon: <Shield className="h-3 w-3" /> };
    }
    if (customer.amlStatus === "pending" || customer.sanctionsScreeningStatus === "pending") {
      return { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> };
    }
    if (customer.sanctionsScreeningStatus === "match") {
      return { label: "Review Required", color: "bg-red-100 text-red-800", icon: <AlertTriangle className="h-3 w-3" /> };
    }
    return { label: "Under Review", color: "bg-gray-100 text-gray-800", icon: <Clock className="h-3 w-3" /> };
  };

  // Sort customers
  const sortedCustomers = [...customers].sort((a, b) => {
    let aValue: string | number | undefined = a[sortField];
    let bValue: string | number | undefined = b[sortField];

    if (sortField === "fullName") {
      aValue = getCustomerName(a);
      bValue = getCustomerName(b);
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  if (showForm) {
    return (
      <DashboardLayout>
        <CustomerForm
          editingId={editingId}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          isOpen={showForm}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Customers
          </h1>
          <p className="text-muted-foreground">
            Manage customer accounts and KYC information
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.individual} individual • {stats.corporate} corporate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Customers</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.verified}</div>
              <p className="text-xs text-muted-foreground">KYC approved accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingVerification}</div>
              <p className="text-xs text-muted-foreground">Awaiting KYC approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highRisk}</div>
              <p className="text-xs text-muted-foreground">
                High: {stats.highRisk} • Med: {stats.mediumRisk} • Low: {stats.lowRisk}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Create and manage customer profiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                New Customer
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Customers ({sortedCustomers.length})</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{stats.individual} Individual</Badge>
                <Badge variant="outline">{stats.corporate} Corporate</Badge>
              </div>
            </CardTitle>
            <CardDescription>
              All customer accounts and their verification status
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("customerId")}
                  >
                    Customer ID
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("fullName")}
                  >
                    Name/Business
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("status")}
                  >
                    Status
                  </TableHead>
                  <TableHead>AML Status</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("createdAt")}
                  >
                    Created
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCustomers.map((customer) => {
                  const amlStatus = getAMLStatus(customer);
                  return (
                    <TableRow key={customer._id}>
                      <TableCell className="font-mono text-sm">
                        {customer.customerId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {customer.type === "individual" ? (
                            <User className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{getCustomerName(customer)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {customer.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-xs">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1 text-xs">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(customer.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(customer.status)}
                            {customer.status}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={amlStatus.color}>
                          <div className="flex items-center gap-1">
                            {amlStatus.icon}
                            {amlStatus.label}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(customer.riskLevel)}>
                          {customer.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(customer._id)}
                            title="Edit Customer"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {customer.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(customer._id)}
                              title="Delete Customer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sortedCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <div className="text-lg font-medium">No customers found</div>
                        <div className="text-muted-foreground">
                          {searchTerm ? "Try adjusting your search" : "Get started by creating your first customer"}
                        </div>
                        {!searchTerm && (
                          <Button onClick={() => setShowForm(true)} variant="outline" className="mt-2">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Customer
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
    </DashboardLayout>
  );
}