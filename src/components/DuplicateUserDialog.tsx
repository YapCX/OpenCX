import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

// shadcn/ui components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "./ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";

// Icons
import { Copy, User, Info } from "lucide-react";

interface DuplicateUserDialogProps {
  sourceId: Id<"users">;
  onClose: () => void;
}

export function DuplicateUserDialog({ sourceId, onClose }: DuplicateUserDialogProps) {
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceUser = useQuery(api.users.get, { id: sourceId });
  const duplicateUser = useMutation(api.users.duplicate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!newUsername.trim()) {
        toast.error("Username is required");
        return;
      }

      if (!newEmail.trim()) {
        toast.error("Email is required");
        return;
      }



      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail.trim())) {
        toast.error("Please enter a valid email address");
        return;
      }

      await duplicateUser({
        sourceId,
        newUsername: newUsername.trim(),
        newEmail: newEmail.trim(),
        newFullName: newFullName.trim() || undefined,
      });

      toast.success("User duplicated successfully. Invitation sent to the new user.");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate user");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sourceUser) {
    return null;
  }

  const getUserTypeLabel = (user: any) => {
    const types = [];
    if (user.isManager) types.push("Manager");
    if (user.isComplianceOfficer) types.push("Compliance Officer");
    if (user.isTemplate) types.push("Template");
    return types.length > 0 ? types.join(", ") : "Standard User";
  };

  const getFinancialControls = (user: any) => {
    const controls = [
      user.canModifyExchangeRates && "Exchange Rates",
      user.canEditFeesCommissions && "Fees & Commissions",
      user.canTransferBetweenAccounts && "Account Transfers",
      user.canReconcileAccounts && "Account Reconciliation"
    ].filter(Boolean);
    return controls.length > 0 ? controls : ["None"];
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Source User Info */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                Copying from:
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-blue-700">
              <div><strong>Username:</strong> {sourceUser.username}</div>
              {sourceUser.fullName && <div><strong>Name:</strong> {sourceUser.fullName}</div>}
              <div><strong>Type:</strong> {getUserTypeLabel(sourceUser)}</div>
              <div>
                <strong>Financial Controls:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getFinancialControls(sourceUser).map((control, index) => (
                    <Badge key={index} variant="outline" className="text-xs border-blue-300 text-blue-600">
                      {control}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">New Username *</Label>
              <Input
                id="username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="new.username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">New Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new.user@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">New Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="New User Name"
              />
            </div>

            {/* Info Alert */}
            <Alert className="border-yellow-200 bg-yellow-50">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-2">Important Notes</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• All privileges and permissions will be copied from the source user</li>
                    <li>• The new user will be created as <strong>inactive</strong> by default</li>
                    <li>• You can activate and modify the user after creation</li>
                    <li>• Financial control limits will also be copied</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <DialogFooter className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Creating..." : "Create Duplicate User"}
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
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
