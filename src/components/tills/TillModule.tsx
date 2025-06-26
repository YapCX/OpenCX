import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { TillForm } from "./TillForm";
import { TillSessionsDialog } from "./TillSessionsDialog";
import { TillStatusIndicator } from "./TillStatusIndicator";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { PageLayout, PageHeader, GridLayout, EmptyState, ActionBar } from "../layout";
import {
  Plus,
  Pencil,
  Trash2,
  LogIn,
  History,
  Store
} from "lucide-react";

export function TillModule() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"tills"> | null>(null);
  const [showSessionsDialog, setShowSessionsDialog] = useState(false);
  const [selectedTillId, setSelectedTillId] = useState<Id<"tills"> | null>(null);

  const tills = useQuery(api.tills.list, { searchTerm: "" }) || [];
  const currentUserTill = useQuery(api.tills.getCurrentUserTill);
  const deleteTill = useMutation(api.tills.remove);
  const signIntoTill = useMutation(api.tills.signIn);

  const handleNew = () => {
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (id: Id<"tills">) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: Id<"tills">) => {
    const confirmed = window.confirm("Are you sure you want to delete this till?");

    if (confirmed) {
      try {
        await deleteTill({ id });
        toast.success("Till deleted successfully");
      } catch (error) {
        toast.error("Failed to delete till");
      }
    }
  };

  const handleSignIn = async (tillId: Id<"tills">) => {
    try {
      const till = tills.find(t => t._id === tillId);
      if (till) {
        await signIntoTill({ tillId: till.tillId });
        toast.success("Signed into till successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign into till");
    }
  };

  const handleViewSessions = (tillId: Id<"tills">) => {
    setSelectedTillId(tillId);
    setShowSessionsDialog(true);
  };

  return (
    <PageLayout>
      {/* Page Header */}
      <PageHeader
        icon={<Store className="h-6 w-6" />}
        title="Tills"
        description="Manage cash drawers and till sessions"
        actions={
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4" />
            New Till
          </Button>
        }
      />

      {/* Current Till Status */}
      <TillStatusIndicator />

      {/* Till Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Till Management ({tills.length})</span>
          </CardTitle>
          <CardDescription>
            View and manage all cash drawers and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tills Grid */}
          <GridLayout cols={1} mdCols={2} lgCols={3} gap={6}>
            {tills.map((till) => {
              const isCurrentTill = currentUserTill?._id === till._id;
              const canSignIn = !till.currentUserId || till.shareTill;

              return (
                <Card key={till._id} className={isCurrentTill ? "ring-2 ring-primary" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{till.tillName}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant={till.currentUserId ? "destructive" : "secondary"}>
                          {till.currentUserId ? "occupied" : "available"}
                        </Badge>
                        {till.shareTill && (
                          <Badge variant="default">shared</Badge>
                        )}
                        {till.reserveForAdmin && (
                          <Badge variant="outline">admin only</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ID: {till.tillId}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {isCurrentTill && (
                      <Alert>
                        <AlertDescription className="text-sm">
                          You are currently signed into this till
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {!isCurrentTill && canSignIn && (
                        <Button
                          size="sm"
                          onClick={() => handleSignIn(till._id)}
                        >
                          <LogIn className="h-3 w-3" />
                          Sign In
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(till._id)}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewSessions(till._id)}
                      >
                        <History className="h-3 w-3" />
                        Sessions
                      </Button>

                      {!isCurrentTill && !till.currentUserId && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(till._id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      )}
                    </div>

                    {till.currentUserName && (
                      <div className="text-xs text-muted-foreground border-t pt-2">
                        Current user: {till.currentUserName}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {tills.length === 0 && (
              <Card className="col-span-full">
                <CardContent>
                  <EmptyState
                    icon={<Store />}
                    title="No tills configured"
                    description="Create your first till to start processing transactions and managing cash flow"
                    action={
                      <Button onClick={handleNew} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Till
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            )}
          </GridLayout>
        </CardContent>
      </Card>

      {/* Till Form */}
      {showForm && (
        <TillForm
          editingId={editingId}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      )}

      {/* Till Sessions Dialog */}
      {showSessionsDialog && selectedTillId && (
        <TillSessionsDialog
          tillId={selectedTillId}
          onClose={() => {
            setShowSessionsDialog(false);
            setSelectedTillId(null);
          }}
        />
      )}
    </PageLayout>
  );
}