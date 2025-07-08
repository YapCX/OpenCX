"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { TillForm } from "@/components/tills/TillForm";
import { TillTransactions } from "@/components/tills/TillTransactions";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Users,
  Lock,
  Share2,
  Clock,
  DollarSign,
  Activity,
  Settings
} from "lucide-react";

export default function TillsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"tills"> | null>(null);

  // Queries
  const tills = useQuery(api.tills.list, {}) || [];
  const currentTill = useQuery(api.tills.getCurrentUserTill, {});
  const tillBalances = useQuery(
    api.tillTransactions.getCurrentTillBalances,
    {}
  ) || [];

  // Mutations
  const deleteTill = useMutation(api.tills.remove);
  const signInToTill = useMutation(api.tills.signIn);
  const signOutFromTill = useMutation(api.tills.signOut);

  const handleNew = () => {
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = () => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0] as Id<"tills">;
      setEditingId(id);
      setShowForm(true);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} till(s)?`
    );

    if (confirmed) {
      try {
        for (const id of selectedIds) {
          await deleteTill({ id: id as Id<"tills"> });
        }
        setSelectedIds(new Set());
        toast.success(`Deleted ${selectedIds.size} till(s)`);
      } catch {
        toast.error("Failed to delete tills");
      }
    }
  };

  const handleSignIn = async (tillId: string) => {
    try {
      await signInToTill({ tillId });
      toast.success(`Signed into till ${tillId}`);
    } catch {
      toast.error("Failed to sign in to till");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutFromTill({});
      toast.success("Signed out from till");
    } catch {
      toast.error("Failed to sign out from till");
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    // Show amount with currency code for clarity
    return `${formatted} ${currency}`;
  };

  if (showForm) {
    return (
      <TillForm
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
          <CreditCard className="h-8 w-8" />
          Tills
        </h1>
        <p className="text-muted-foreground">
          Manage cash registers and till sessions
        </p>
      </div>

      {/* Current Till Status */}
      {currentTill && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Current Till: {currentTill.tillName}
            </CardTitle>
            <CardDescription>
              You are currently signed into {currentTill.tillName} ({currentTill.tillId})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Till Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    Signed in: {new Date(currentTill.session.signInTime).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {currentTill.reserveForAdmin && <Lock className="h-4 w-4" />}
                  {currentTill.shareTill && <Share2 className="h-4 w-4" />}
                  <span className="text-sm">
                    {currentTill.reserveForAdmin ? "Admin Only" : "General Access"}
                    {currentTill.shareTill && " • Shared"}
                  </span>
                </div>
              </div>

              {/* Till Balances */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Cash Balances:</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {tillBalances.map((balance) => (
                    <div key={balance.currencyCode} className="text-sm">
                      <span className="font-mono">
                        {formatCurrency(balance.balance, balance.currencyCode)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={handleSignOut} variant="outline">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tills">Till Management</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="tills" className="space-y-4">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Till Management
              </CardTitle>
              <CardDescription>
                Create and manage your cash registers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleNew}>
                  <Plus className="h-4 w-4" />
                  New Till
                </Button>

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
            </CardContent>
          </Card>

          {/* Tills Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Tills ({tills.length})
                </span>
                {selectedIds.size > 0 && (
                  <Badge variant="secondary">
                    {selectedIds.size} selected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                All cash registers in your system
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === tills.length && tills.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds(new Set(tills.map(t => t._id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Till ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current User</TableHead>
                    <TableHead>Settings</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tills.map((till) => (
                    <TableRow key={till._id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(till._id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedIds);
                            if (checked) {
                              newSelected.add(till._id);
                            } else {
                              newSelected.delete(till._id);
                            }
                            setSelectedIds(newSelected);
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {till.tillId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {till.tillName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={till.isActive ? "default" : "secondary"}>
                          {till.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {till.currentUserId ? (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="text-sm">Occupied</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Available</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {till.reserveForAdmin && (
                            <Badge variant="outline" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {till.shareTill && (
                            <Badge variant="outline" className="text-xs">
                              <Share2 className="h-3 w-3 mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {currentTill?.tillId === till.tillId ? (
                          <Button
                            onClick={handleSignOut}
                            size="sm"
                            variant="outline"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleSignIn(till.tillId)}
                            size="sm"
                            disabled={!till.isActive || (!!till.currentUserId && !till.shareTill)}
                          >
                            <LogIn className="h-4 w-4" />
                            Sign In
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {tills.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="text-center py-8">
                          <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <div className="text-lg font-medium">No tills yet</div>
                          <div className="text-muted-foreground mb-4">
                            Create your first till to start managing cash transactions
                          </div>
                          <Button onClick={handleNew} variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Till
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <TillTransactions />
        </TabsContent>
      </Tabs>
    </div>
  );
}