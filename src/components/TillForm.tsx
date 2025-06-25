import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

// shadcn/ui components
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription } from "./ui/alert";

// Icons
import { Info } from "lucide-react";

interface TillFormProps {
  editingId: Id<"tills"> | null;
  onClose: () => void;
}

export function TillForm({ editingId, onClose }: TillFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tillId, setTillId] = useState("");
  const [tillName, setTillName] = useState("");
  const [reserveForAdmin, setReserveForAdmin] = useState(false);
  const [shareTill, setShareTill] = useState(true);

  const existingTill = useQuery(
    api.tills.get,
    editingId ? { id: editingId } : "skip"
  );

  const createTill = useMutation(api.tills.create);
  const updateTill = useMutation(api.tills.update);

  useEffect(() => {
    if (existingTill) {
      setTillId(existingTill.tillId);
      setTillName(existingTill.tillName);
      setReserveForAdmin(existingTill.reserveForAdmin);
      setShareTill(existingTill.shareTill);
    }
  }, [existingTill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!tillId.trim()) {
        toast.error("Till ID is required");
        return;
      }

      if (!tillName.trim()) {
        toast.error("Till Name is required");
        return;
      }

      const tillData = {
        tillId: tillId.trim(),
        tillName: tillName.trim(),
        reserveForAdmin,
        shareTill,
      };

      if (editingId) {
        await updateTill({
          id: editingId,
          ...tillData,
        });
        toast.success("Till updated successfully");
      } else {
        await createTill(tillData);
        toast.success("Till created successfully with cash ledger accounts");
      }

      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save till");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editingId ? "Edit Till" : "Create New Till"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tillId">
                Till ID *
              </Label>
              <Input
                id="tillId"
                type="text"
                value={tillId}
                onChange={(e) => setTillId(e.target.value)}
                placeholder="01"
                required
                disabled={!!editingId} // Can't change Till ID after creation
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (e.g., "01", "02", "FRONT")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tillName">
                Till Name *
              </Label>
              <Input
                id="tillName"
                type="text"
                value={tillName}
                onChange={(e) => setTillName(e.target.value)}
                placeholder="Front Desk Till"
                required
              />
              <p className="text-xs text-muted-foreground">
                Descriptive name for the till
              </p>
            </div>
          </div>

          {/* Permissions Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Till Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="reserveForAdmin"
                  checked={reserveForAdmin}
                  onCheckedChange={setReserveForAdmin}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="reserveForAdmin" className="text-sm font-medium">
                    Reserve for Administrator
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Only users with Manager or Compliance Officer roles can sign into this till
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="shareTill"
                  checked={shareTill}
                  onCheckedChange={setShareTill}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="shareTill" className="text-sm font-medium">
                    Share Till
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow any authorized user to sign into this till (subject to admin restrictions)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information Box */}
          {!editingId && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Automatic Setup:</strong> When you create this till, cash ledger accounts will be automatically generated 
                for each active currency (e.g., "Cash-USD-{tillId}", "Cash-EUR-{tillId}").
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting 
                ? "Saving..." 
                : editingId 
                  ? "Update Till" 
                  : "Create Till"
              }
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
