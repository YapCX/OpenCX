"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Copy, ExternalLink, Users, Crown, ShieldCheck, FileText } from "lucide-react";

interface DuplicateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceUserId: Id<"users"> | null;
}

export function DuplicateUserDialog({ 
  isOpen, 
  onClose, 
  sourceUserId 
}: DuplicateUserDialogProps) {
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
  });
  const [invitationLink, setInvitationLink] = useState<string>("");

  const sourceUser = useQuery(
    api.users.get,
    sourceUserId ? { id: sourceUserId } : "skip"
  );

  const duplicateUser = useMutation(api.users.duplicate);

  useEffect(() => {
    if (!isOpen) {
      setFormData({ email: "", fullName: "" });
      setInvitationLink("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceUserId) return;

    try {
      const result = await duplicateUser({
        sourceUserId,
        email: formData.email,
        fullName: formData.fullName,
      });

      toast.success("User duplicated successfully");

      // Generate invitation link
      if (result.invitationToken) {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/accept-invitation?token=${result.invitationToken}`;
        setInvitationLink(link);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate user");
    }
  };

  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationLink);
    toast.success("Invitation link copied to clipboard");
  };

  const handleClose = () => {
    setInvitationLink("");
    onClose();
  };

  const getRoleDisplay = (user: { isManager: boolean; isComplianceOfficer: boolean; isTemplate: boolean }) => {
    const roles = [];
    if (user.isManager) roles.push("Manager");
    if (user.isComplianceOfficer) roles.push("Compliance");
    if (user.isTemplate) roles.push("Template");
    return roles.length > 0 ? roles.join(", ") : "User";
  };

  const getRoleIcon = (user: { isManager: boolean; isComplianceOfficer: boolean; isTemplate: boolean }) => {
    if (user.isManager) return <Crown className="h-4 w-4 text-yellow-600" />;
    if (user.isComplianceOfficer) return <ShieldCheck className="h-4 w-4 text-blue-600" />;
    if (user.isTemplate) return <FileText className="h-4 w-4 text-purple-600" />;
    return <Users className="h-4 w-4 text-gray-400" />;
  };

  if (invitationLink) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Duplicated Successfully</DialogTitle>
            <DialogDescription>
              Send this invitation link to the new user to complete their account setup.
            </DialogDescription>
          </DialogHeader>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Invitation Link</CardTitle>
              <CardDescription>This link will expire in 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  value={invitationLink}
                  readOnly
                  className="text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyInvitationLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(invitationLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Duplicate User</DialogTitle>
          <DialogDescription>
            Create a new user with the same permissions and settings as the selected user.
          </DialogDescription>
        </DialogHeader>

        {sourceUser && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Source User Details</CardTitle>
              <CardDescription>
                The new user will inherit all permissions and settings from this user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                {getRoleIcon(sourceUser)}
                <div>
                  <div className="font-medium">
                    {sourceUser.fullName || "Unnamed User"}
                  </div>
                  <div className="text-sm text-gray-500">{sourceUser.email}</div>
                  <div className="text-sm text-gray-600">{getRoleDisplay(sourceUser)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Financial Controls</h4>
                  <div className="space-y-1">
                    {sourceUser.canModifyExchangeRates && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Exchange Rates</Badge>
                        {sourceUser.maxModificationIndividual && (
                          <span className="text-xs text-gray-500">
                            Ind: ${sourceUser.maxModificationIndividual.toLocaleString()}
                          </span>
                        )}
                        {sourceUser.maxModificationCorporate && (
                          <span className="text-xs text-gray-500">
                            Corp: ${sourceUser.maxModificationCorporate.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                    {sourceUser.canEditFeesCommissions && (
                      <Badge variant="outline" className="text-xs">Fees & Commissions</Badge>
                    )}
                    {sourceUser.canTransferBetweenAccounts && (
                      <Badge variant="outline" className="text-xs">Account Transfers</Badge>
                    )}
                    {sourceUser.canReconcileAccounts && (
                      <Badge variant="outline" className="text-xs">Reconciliation</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Default Privileges</h4>
                  <div className="space-y-1">
                    {Object.entries(sourceUser.defaultPrivileges).map(([key, value]) => (
                      value && (
                        <Badge key={key} variant="outline" className="text-xs capitalize mr-1 mb-1">
                          {key}
                        </Badge>
                      )
                    ))}
                  </div>
                  {sourceUser.moduleExceptions && sourceUser.moduleExceptions.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500">
                        Module exceptions: {sourceUser.moduleExceptions.length}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-email">Email Address</Label>
              <Input
                id="duplicate-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicate-fullName">Full Name</Label>
              <Input
                id="duplicate-fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              Duplicate User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}