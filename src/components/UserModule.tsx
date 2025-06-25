import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { UserForm } from "./UserForm";
import { DuplicateUserDialog } from "./DuplicateUserDialog";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
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
  const [editingId, setEditingId] = useState<Id<"systemUsers"> | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateSourceId, setDuplicateSourceId] = useState<Id<"systemUsers"> | null>(null);

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

  const handleEdit = (id: Id<"systemUsers">) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleDuplicate = (id: Id<"systemUsers">) => {
    setDuplicateSourceId(id);
    setShowDuplicateDialog(true);
  };

  const handleDelete = async (id: Id<"systemUsers">) => {
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Users
          </h1>
          <p className="text-muted-foreground">Manage system users and permissions</p>
        </div>

        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeInactive"
                checked={includeInactive}
                onCheckedChange={(checked) => setIncludeInactive(checked as boolean)}
              />
              <Label htmlFor="includeInactive">Include Inactive Users</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Templates */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              User Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template._id} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{template.fullName || template.username}</h3>
                      <Badge variant="default">Template</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.username}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleDuplicate(template._id)}
                        className="flex-1 gap-1"
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            System Users
          </CardTitle>
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
                      <div className="font-medium">{user.fullName || user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.username}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {user.isManager && (
                        <Badge variant="secondary" className="text-xs">Manager</Badge>
                      )}
                      {user.isComplianceOfficer && (
                        <Badge variant="secondary" className="text-xs">Compliance</Badge>
                      )}
                      {user.isTemplate && (
                        <Badge variant="outline" className="text-xs">Template</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(user.isActive)}>
                      {getStatusLabel(user.isActive)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {user.canModifyExchangeRates && (
                        <Badge variant="secondary" className="text-xs">Exchange Rates</Badge>
                      )}
                      {user.canEditFeesCommissions && (
                        <Badge variant="secondary" className="text-xs">Fees/Commissions</Badge>
                      )}
                      {user.canTransferBetweenAccounts && (
                        <Badge variant="secondary" className="text-xs">Account Transfers</Badge>
                      )}
                      {user.canReconcileAccounts && (
                        <Badge variant="secondary" className="text-xs">Reconciliation</Badge>
                      )}
                      {user.maxModificationIndividual && (
                        <div className="text-xs text-muted-foreground">
                          Max Individual: ${user.maxModificationIndividual}
                        </div>
                      )}
                      {user.maxModificationCorporate && (
                        <div className="text-xs text-muted-foreground">
                          Max Corporate: ${user.maxModificationCorporate}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(user._id)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(user._id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(user._id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {regularUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm
                      ? "No users found matching your search."
                      : "No users added yet."}
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
    </div>
  );
}