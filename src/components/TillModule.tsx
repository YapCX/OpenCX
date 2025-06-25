import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { TillForm } from "./TillForm";
import { TillSessionsDialog } from "./TillSessionsDialog";
import { TillStatusIndicator } from "./TillStatusIndicator";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  History,
  Store,
  Info
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
  const signOutOfTill = useMutation(api.tills.signOut);

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

  const handleSignOut = async () => {
    try {
      await signOutOfTill();
      toast.success("Signed out of till successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out of till");
    }
  };

  const handleViewSessions = (tillId: Id<"tills">) => {
    setSelectedTillId(tillId);
    setShowSessionsDialog(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6" />
            Tills
          </h1>
          <p className="text-muted-foreground">Manage cash drawers and till sessions</p>
        </div>

        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          New Till
        </Button>
      </div>

      {/* Current Till Status */}
      <TillStatusIndicator />

      {currentUserTill && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You are currently signed into <strong>{currentUserTill.tillName}</strong> (ID: {currentUserTill.tillId})
            <Button
              variant="outline"
              size="sm"
              className="ml-4 gap-1"
              onClick={handleSignOut}
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      className="gap-1"
                    >
                      <LogIn className="h-3 w-3" />
                      Sign In
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(till._id)}
                    className="gap-1"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewSessions(till._id)}
                    className="gap-1"
                  >
                    <History className="h-3 w-3" />
                    Sessions
                  </Button>

                  {!isCurrentTill && !till.currentUserId && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(till._id)}
                      className="gap-1"
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
            <CardContent className="text-center py-8">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tills configured</h3>
              <p className="text-muted-foreground mb-4">
                Create your first till to start processing transactions
              </p>
              <Button onClick={handleNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Till
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

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
    </div>
  );
}