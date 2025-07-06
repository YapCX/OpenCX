"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserForm } from "@/components/users/UserForm";
import { DuplicateUserDialog } from "@/components/users/DuplicateUserDialog";
import { 
  Users, 
  UserPlus, 
  Search, 
  Settings, 
  Copy,
  Trash2,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  Crown,
  FileText
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Id } from "@/convex/_generated/dataModel";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<Id<"users"> | null>(null);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateSourceUserId, setDuplicateSourceUserId] = useState<Id<"users"> | null>(null);

  // Check current user permissions
  const currentUserPermissions = useQuery(api.users.getCurrentUserPermissions);
  
  // Get users list
  const users = useQuery(api.users.list, {
    searchTerm: searchTerm || undefined,
    includeInactive,
    templatesOnly: showTemplates,
  });

  // Permission check - only managers can access user management
  if (currentUserPermissions === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (currentUserPermissions && !currentUserPermissions.isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only managers can access user management.</p>
        </div>
      </div>
    );
  }

  const handleEditUser = (userId: Id<"users">) => {
    setEditingUserId(userId);
    setIsUserFormOpen(true);
  };

  const handleDuplicateUser = (userId: Id<"users">) => {
    setDuplicateSourceUserId(userId);
    setIsDuplicateDialogOpen(true);
  };

  const handleCloseUserForm = () => {
    setIsUserFormOpen(false);
    setEditingUserId(null);
  };

  const handleCloseDuplicateDialog = () => {
    setIsDuplicateDialogOpen(false);
    setDuplicateSourceUserId(null);
  };

  const getRoleDisplay = (user: { isManager: boolean; isComplianceOfficer: boolean; isTemplate: boolean }) => {
    const roles = [];
    if (user.isManager) roles.push("Manager");
    if (user.isComplianceOfficer) roles.push("Compliance");
    if (user.isTemplate) roles.push("Template");
    return roles.length > 0 ? roles.join(", ") : "User";
  };

  const getStatusBadge = (user: { isActive: boolean; invitationStatus: string }) => {
    if (!user.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (user.invitationStatus === "pending") {
      return <Badge variant="outline">Pending Invitation</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const getRoleIcon = (user: { isManager: boolean; isComplianceOfficer: boolean; isTemplate: boolean }) => {
    if (user.isManager) return <Crown className="h-4 w-4 text-yellow-600" />;
    if (user.isComplianceOfficer) return <ShieldCheck className="h-4 w-4 text-blue-600" />;
    if (user.isTemplate) return <FileText className="h-4 w-4 text-purple-600" />;
    return <Users className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
        </div>
        <Button onClick={() => setIsUserFormOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-inactive"
            checked={includeInactive}
            onCheckedChange={(checked) => setIncludeInactive(checked as boolean)}
          />
          <label
            htmlFor="include-inactive"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Include inactive users
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-templates"
            checked={showTemplates}
            onCheckedChange={(checked) => setShowTemplates(checked as boolean)}
          />
          <label
            htmlFor="show-templates"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Templates only
          </label>
        </div>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Financial Controls</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {getRoleIcon(user)}
                    <div>
                      <div className="font-medium">
                        {user.fullName || "Unnamed User"}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{getRoleDisplay(user)}</div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(user)}
                </TableCell>
                <TableCell>
                  <div className="text-sm space-y-1">
                    {user.canModifyExchangeRates && (
                      <div className="text-green-600">Exchange Rates</div>
                    )}
                    {user.canEditFeesCommissions && (
                      <div className="text-blue-600">Fees & Commissions</div>
                    )}
                    {user.canTransferBetweenAccounts && (
                      <div className="text-purple-600">Account Transfers</div>
                    )}
                    {user.canReconcileAccounts && (
                      <div className="text-orange-600">Reconciliation</div>
                    )}
                    {user.maxModificationIndividual && (
                      <div className="text-xs text-gray-500">
                        Individual: ${user.maxModificationIndividual.toLocaleString()}
                      </div>
                    )}
                    {user.maxModificationCorporate && (
                      <div className="text-xs text-gray-500">
                        Corporate: ${user.maxModificationCorporate.toLocaleString()}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditUser(user._id)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateUser(user._id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {users?.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? "Try adjusting your search criteria"
                : "Get started by adding your first user"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsUserFormOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </div>
        )}
      </div>

      {/* User Form Dialog */}
      <UserForm
        isOpen={isUserFormOpen}
        onClose={handleCloseUserForm}
        editingId={editingUserId}
      />

      {/* Duplicate User Dialog */}
      <DuplicateUserDialog
        isOpen={isDuplicateDialogOpen}
        onClose={handleCloseDuplicateDialog}
        sourceUserId={duplicateSourceUserId}
      />
    </div>
  );
}