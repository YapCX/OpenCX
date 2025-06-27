import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { UserForm } from "./UserForm";
import { DuplicateUserDialog } from "./DuplicateUserDialog";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { PageLayout, PageHeader, GridLayout, EmptyState, ActionBar, FlexLayout } from "../layout";
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
  Copy,
  Search,
  ShieldCheck,
  Users,
  UserCheck
} from "lucide-react";

export function UserModule() {
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"users"> | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateSourceId, setDuplicateSourceId] = useState<Id<"users"> | null>(null);

  const users = useQuery(api.users.list, {
    searchTerm,
    includeInactive
  }) || [];
  const deleteUser = useMutation(api.users.remove);

  // Separate templates from regular users
  const templates = users.filter(user => user.isTemplate);
  const regularUsers = users.filter(user => !user.isTemplate);

  const handleNew = () => {
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (id: Id<"users">) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleDuplicate = (id: Id<"users">) => {
    setDuplicateSourceId(id);
    setShowDuplicateDialog(true);
  };

  const handleDelete = async (id: Id<"users">) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");

    if (confirmed) {
      try {
        await deleteUser({ id });
        toast.success("User deleted successfully");
      } catch (error) {
        toast.error("Failed to delete user");
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getStatusVariant = (isActive: boolean) => {
    return isActive ? "secondary" : "outline";
  };

  const getStatusLabel = (isActive: boolean) => {
    return isActive ? "active" : "inactive";
  };

  return (
    <PageLayout>
      {/* Page Header */}
      <PageHeader
        icon={<ShieldCheck className="h-6 w-6" />}
        title="Users"
        description="Manage employee accounts and permissions"
        actions={
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4" />
            Add New User
          </Button>
        }
      />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>
            Find and filter users by name, email, or status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FlexLayout gap={4}>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <FlexLayout gap={2}>
              <Checkbox
                id="includeInactive"
                checked={includeInactive}
                onCheckedChange={(checked) => setIncludeInactive(checked as boolean)}
              />
              <Label htmlFor="includeInactive">Include Inactive Users</Label>
            </FlexLayout>
          </FlexLayout>
        </CardContent>
      </Card>

      {/* User Templates */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              User Templates ({templates.length})
            </CardTitle>
            <CardDescription>
              Pre-configured user templates to quickly create new accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GridLayout cols={1} mdCols={2} lgCols={3}>
              {templates.map((template) => (
                <Card key={template._id} className="border-dashed">
                  <CardContent className="p-4">
                    <FlexLayout align="between" className="mb-2">
                      <h3 className="font-medium">{template.fullName || template.email}</h3>
                      <Badge variant="default">Template</Badge>
                    </FlexLayout>
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.email}
                    </p>
                    <ActionBar>
                      <Button
                        size="sm"
                        onClick={() => handleDuplicate(template._id)}
                        className="flex-1"
                      >
                        <Copy className="h-3 w-3" />
                        Use Template
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template._id)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </ActionBar>
                  </CardContent>
                </Card>
              ))}
            </GridLayout>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>User Accounts ({regularUsers.length})</span>
          </CardTitle>
          <CardDescription>
            Manage all user accounts, permissions, and access controls
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Financial Controls</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regularUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.fullName || user.email}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(user.isManager ?? false) ? "destructive" : "secondary"}>
                      {(user.isManager ?? false) ? "Manager" : "User"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(user.isActive ?? true)}>
                      {getStatusLabel(user.isActive ?? true)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {(user.maxModificationIndividual || user.maxModificationCorporate) && (
                        <Badge variant="outline" className="text-xs">
                          Modification Limits
                        </Badge>
                      )}
                      {user.isComplianceOfficer && (
                        <Badge variant="outline" className="text-xs">
                          Compliance Officer
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user._creationTime)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionBar className="justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(user._id)}
                        title="Edit User"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(user._id)}
                        title="Duplicate User"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user._id)}
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ActionBar>
                  </TableCell>
                </TableRow>
              ))}

              {regularUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={<Users />}
                      title={searchTerm || !includeInactive ? "No users found" : "No users yet"}
                      description={
                        searchTerm || !includeInactive
                          ? "Try adjusting your search or filter settings"
                          : "Get started by adding your first employee account"
                      }
                      action={
                        !searchTerm && includeInactive ? (
                          <Button onClick={handleNew} variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add First User
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

      {/* User Form */}
      {showForm && (
        <UserForm
          editingId={editingId}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      )}

      {/* Duplicate User Dialog */}
      {showDuplicateDialog && duplicateSourceId && (
        <DuplicateUserDialog
          sourceId={duplicateSourceId}
          onClose={() => {
            setShowDuplicateDialog(false);
            setDuplicateSourceId(null);
          }}
        />
      )}
    </PageLayout>
  );
}