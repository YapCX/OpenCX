import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { VALIDATION_LIMITS } from "../../lib/validation";

// shadcn/ui components
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Copy, Check } from "lucide-react";

interface UserFormProps {
  editingId: Id<"users"> | null;
  onClose: () => void;
}

interface Privileges {
  view: boolean;
  create: boolean;
  modify: boolean;
  delete: boolean;
  print: boolean;
}

interface ModuleException {
  moduleName: string;
  privileges: Privileges;
}

export function UserForm({ editingId, onClose }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "financial" | "privileges">("basic");
  const [invitationResult, setInvitationResult] = useState<{ email: string; token: string; } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Basic Information
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [isComplianceOfficer, setIsComplianceOfficer] = useState(false);
  const [isTemplate, setIsTemplate] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Financial Controls
  const [canModifyExchangeRates, setCanModifyExchangeRates] = useState(false);
  const [maxModificationIndividual, setMaxModificationIndividual] = useState<number | undefined>(undefined);
  const [maxModificationCorporate, setMaxModificationCorporate] = useState<number | undefined>(undefined);
  const [canEditFeesCommissions, setCanEditFeesCommissions] = useState(false);
  const [canTransferBetweenAccounts, setCanTransferBetweenAccounts] = useState(false);
  const [canReconcileAccounts, setCanReconcileAccounts] = useState(false);

  // Default Privileges
  const [defaultPrivileges, setDefaultPrivileges] = useState<Privileges>({
    view: true,
    create: false,
    modify: false,
    delete: false,
    print: false,
  });

  // Module Exceptions
  const [moduleExceptions, setModuleExceptions] = useState<ModuleException[]>([]);

  const existingUser = useQuery(
    api.users.get,
    editingId ? { id: editingId } : "skip"
  );

  const modules = useQuery(api.users.getModules) || [];
  const createUser = useMutation(api.users.create);
  const updateUser = useMutation(api.users.update);

  useEffect(() => {
    if (existingUser) {
      setEmail(existingUser.email || "");
      setFullName(existingUser.fullName || "");
      setIsManager(existingUser.isManager || false);
      setIsComplianceOfficer(existingUser.isComplianceOfficer || false);
      setIsTemplate(existingUser.isTemplate || false);
      setIsActive(existingUser.isActive !== false);

      // Financial Controls
      setCanModifyExchangeRates(existingUser.canModifyExchangeRates);
      setMaxModificationIndividual(existingUser.maxModificationIndividual);
      setMaxModificationCorporate(existingUser.maxModificationCorporate);
      setCanEditFeesCommissions(existingUser.canEditFeesCommissions);
      setCanTransferBetweenAccounts(existingUser.canTransferBetweenAccounts);
      setCanReconcileAccounts(existingUser.canReconcileAccounts);

      // Privileges
      setDefaultPrivileges(existingUser.defaultPrivileges);
      setModuleExceptions(existingUser.moduleExceptions);
    }
  }, [existingUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!email.trim()) {
        toast.error("Email is required");
        return;
      }



      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error("Please enter a valid email address");
        return;
      }

      const userData = {
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        isManager,
        isComplianceOfficer,
        isTemplate,
        isActive,
        canModifyExchangeRates,
        maxModificationIndividual,
        maxModificationCorporate,
        canEditFeesCommissions,
        canTransferBetweenAccounts,
        canReconcileAccounts,
        defaultPrivileges,
        moduleExceptions,
      };

      if (editingId) {
        await updateUser({
          id: editingId,
          ...userData,
        });
        toast.success("User updated successfully");
      } else {
        const result = await createUser(userData);
        setInvitationResult({
          email: email.trim(),
          token: result.invitationToken
        });
        // Don't close the dialog yet - show the invitation link first
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrivilegeChange = (privilege: keyof Privileges, value: boolean) => {
    setDefaultPrivileges(prev => ({ ...prev, [privilege]: value }));
  };

  const handleModuleExceptionChange = (moduleName: string, privilege: keyof Privileges, value: boolean) => {
    setModuleExceptions(prev => {
      const existing = prev.find(ex => ex.moduleName === moduleName);
      if (existing) {
        return prev.map(ex =>
          ex.moduleName === moduleName
            ? { ...ex, privileges: { ...ex.privileges, [privilege]: value } }
            : ex
        );
      } else {
        return [...prev, {
          moduleName,
          privileges: {
            view: privilege === "view" ? value : defaultPrivileges.view,
            create: privilege === "create" ? value : defaultPrivileges.create,
            modify: privilege === "modify" ? value : defaultPrivileges.modify,
            delete: privilege === "delete" ? value : defaultPrivileges.delete,
            print: privilege === "print" ? value : defaultPrivileges.print,
          }
        }];
      }
    });
  };

  const getModulePrivilege = (moduleName: string, privilege: keyof Privileges): boolean => {
    const exception = moduleExceptions.find(ex => ex.moduleName === moduleName);
    return exception ? exception.privileges[privilege] : defaultPrivileges[privilege];
  };

  const removeModuleException = (moduleName: string) => {
    setModuleExceptions(prev => prev.filter(ex => ex.moduleName !== moduleName));
  };

  const handleCopyInvitationLink = async () => {
    if (!invitationResult) return;

    const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitationResult.token}`;

    try {
      await navigator.clipboard.writeText(invitationUrl);
      setLinkCopied(true);
      toast.success("Invitation link copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link. Please copy it manually.");
    }
  };

  const handleCloseInvitation = () => {
    setInvitationResult(null);
    setLinkCopied(false);
    onClose();
  };

  // Show invitation success dialog if we have invitation result
  if (invitationResult) {
    return (
      <InvitationSuccessDialog
        invitationResult={invitationResult}
        onClose={handleCloseInvitation}
        onCopyLink={handleCopyInvitationLink}
        linkCopied={linkCopied}
      />
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editingId ? "Edit User" : "Create New User"}
          </DialogTitle>
          <DialogDescription>
            Configure user account settings, permissions, and financial controls
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "basic" | "financial" | "privileges")}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="financial">Financial Controls</TabsTrigger>
            <TabsTrigger value="privileges">Privileges</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-6">
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Basic user account details and credentials</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john.doe@company.com"
                        required
                        disabled={!!editingId}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName">
                        Full Name
                      </Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Alert>
                  <AlertDescription>
                    <h4 className="font-medium mb-3">User Type</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isManager"
                          checked={isManager}
                          onCheckedChange={(checked) => setIsManager(!!checked)}
                        />
                        <Label htmlFor="isManager" className="text-sm font-medium">
                          Manager (High-level permissions)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isComplianceOfficer"
                          checked={isComplianceOfficer}
                          onCheckedChange={(checked) => setIsComplianceOfficer(!!checked)}
                        />
                        <Label htmlFor="isComplianceOfficer" className="text-sm font-medium">
                          Compliance Officer
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isTemplate"
                          checked={isTemplate}
                          onCheckedChange={(checked) => setIsTemplate(!!checked)}
                        />
                        <Label htmlFor="isTemplate" className="text-sm font-medium">
                          User Template (for duplication)
                        </Label>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                {editingId && existingUser && (
                  <Alert variant={existingUser.invitationStatus === "pending" ? "destructive" : "default"}>
                    <AlertDescription>
                      <h4 className="font-medium mb-3">Invitation Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Status:</span>
                          <Badge variant={
                            existingUser.invitationStatus === "accepted" ? "default" :
                            existingUser.invitationStatus === "pending" ? "secondary" : "destructive"
                          }>
                            {existingUser.invitationStatus || "N/A"}
                          </Badge>
                        </div>
                        {existingUser.invitationStatus === "pending" && (
                          <div className="text-sm text-muted-foreground">
                            Employee needs to accept invitation to activate account
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Alert variant="default">
                  <AlertDescription>
                    <h4 className="font-medium mb-3">Status</h4>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        checked={isActive}
                        onCheckedChange={(checked) => setIsActive(!!checked)}
                      />
                      <Label htmlFor="isActive" className="text-sm font-medium">
                        Active User
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inactive users cannot log in to the system
                    </p>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              <Alert className="mb-6">
                <AlertDescription>
                  <h4 className="font-medium mb-3">Exchange Rate Modifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="canModifyExchangeRates"
                        checked={canModifyExchangeRates}
                        onCheckedChange={(checked) => setCanModifyExchangeRates(!!checked)}
                      />
                      <Label htmlFor="canModifyExchangeRates" className="text-sm font-medium">
                        Allow user to modify exchange rates
                      </Label>
                    </div>

                    {canModifyExchangeRates && (
                      <div className="grid grid-cols-2 gap-3 ml-6">
                        <div className="space-y-2">
                          <Label htmlFor="maxIndividual">
                            Max % for Individuals
                          </Label>
                          <Input
                            id="maxIndividual"
                            type="number"
                            step={VALIDATION_LIMITS.USER_PERMISSION_STEP}
                            min={VALIDATION_LIMITS.PERCENTAGE_MIN}
                            max={VALIDATION_LIMITS.PERCENTAGE_MAX}
                            value={maxModificationIndividual || ""}
                            onChange={(e) => setMaxModificationIndividual(e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="2.0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxCorporate">
                            Max % for Companies
                          </Label>
                          <Input
                            id="maxCorporate"
                            type="number"
                            step={VALIDATION_LIMITS.USER_PERMISSION_STEP}
                            min={VALIDATION_LIMITS.PERCENTAGE_MIN}
                            max={VALIDATION_LIMITS.PERCENTAGE_MAX}
                            value={maxModificationCorporate || ""}
                            onChange={(e) => setMaxModificationCorporate(e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="1.5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertDescription>
                  <h4 className="font-medium mb-3">Other Financial Permissions</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="canEditFeesCommissions"
                        checked={canEditFeesCommissions}
                        onCheckedChange={(checked) => setCanEditFeesCommissions(!!checked)}
                      />
                      <Label htmlFor="canEditFeesCommissions" className="text-sm font-medium">
                        Allow editing fees and commissions in invoices
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="canTransferBetweenAccounts"
                        checked={canTransferBetweenAccounts}
                        onCheckedChange={(checked) => setCanTransferBetweenAccounts(!!checked)}
                      />
                      <Label htmlFor="canTransferBetweenAccounts" className="text-sm font-medium">
                        Allow transferring between accounts
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="canReconcileAccounts"
                        checked={canReconcileAccounts}
                        onCheckedChange={(checked) => setCanReconcileAccounts(!!checked)}
                      />
                      <Label htmlFor="canReconcileAccounts" className="text-sm font-medium">
                        Allow account reconciliation
                      </Label>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="privileges" className="space-y-6">
              {/* Default Privileges */}
              <Alert variant="default">
                <AlertDescription>
                  <h4 className="font-medium mb-3">Default Privileges (Applied to all modules)</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(defaultPrivileges).map(([privilege, value]) => (
                      <div key={privilege} className="flex items-center space-x-2">
                        <Checkbox
                          id={`default-${privilege}`}
                          checked={value}
                          onCheckedChange={(checked) => handlePrivilegeChange(privilege as keyof Privileges, !!checked)}
                        />
                        <Label htmlFor={`default-${privilege}`} className="text-sm font-medium capitalize">
                          {privilege}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Module-Specific Exceptions */}
              <Alert>
                <AlertDescription>
                  <h4 className="font-medium mb-3">Module-Specific Exceptions</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Override default privileges for specific modules. Only modules with different privileges than defaults are shown.
                  </p>

                  <div className="space-y-4">
                  {modules.map((moduleName) => {
                    const hasException = moduleExceptions.some(ex => ex.moduleName === moduleName);
                    const currentPrivileges = hasException
                      ? moduleExceptions.find(ex => ex.moduleName === moduleName)!.privileges
                      : defaultPrivileges;

                    const isDifferentFromDefault = Object.entries(currentPrivileges).some(
                      ([key, value]) => value !== defaultPrivileges[key as keyof Privileges]
                    );

                    if (!isDifferentFromDefault && !hasException) return null;

                    return (
                      <div key={moduleName} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium text-gray-800">{moduleName}</h5>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeModuleException(moduleName)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Reset to Default
                          </Button>
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                          {Object.entries(currentPrivileges).map(([privilege, value]) => (
                            <div key={privilege} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${moduleName}-${privilege}`}
                                checked={value}
                                onCheckedChange={(checked) => handleModuleExceptionChange(moduleName, privilege as keyof Privileges, !!checked)}
                              />
                              <Label htmlFor={`${moduleName}-${privilege}`} className="text-sm capitalize">
                                {privilege}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  </div>

                  {/* Add Exception */}
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-800 mb-2">Add Module Exception</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {modules.filter(moduleName =>
                        !moduleExceptions.some(ex => ex.moduleName === moduleName)
                      ).map((moduleName) => (
                        <Button
                          key={moduleName}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setModuleExceptions(prev => [...prev, {
                              moduleName,
                              privileges: { ...defaultPrivileges }
                            }]);
                          }}
                        >
                          {moduleName}
                        </Button>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </TabsContent>

            <Separator className="my-6" />

            {/* Form Actions */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingId
                    ? "Update User"
                    : "Create User"
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Invitation Success Dialog Component
function InvitationSuccessDialog({
  invitationResult,
  onClose,
  onCopyLink,
  linkCopied
}: {
  invitationResult: { email: string; token: string; };
  onClose: () => void;
  onCopyLink: () => void;
  linkCopied: boolean;
}) {
  const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitationResult.token}`;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-green-600">
            ✅ User Created Successfully!
          </DialogTitle>
          <DialogDescription>
            Share this invitation link with {invitationResult.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              <div className="space-y-3">
                <div className="font-medium">Invitation Link:</div>
                <div className="bg-gray-50 p-3 rounded border font-mono text-sm break-all">
                  {invitationUrl}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={onCopyLink}
                    className="gap-2"
                    variant={linkCopied ? "secondary" : "default"}
                  >
                    {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {linkCopied ? "Copied!" : "Copy Link"}
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <Alert variant="default">
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">📧 How to share:</div>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Copy the link and send via email, Slack, or SMS</li>
                  <li>• Share it in person or over the phone</li>
                  <li>• Link expires in 7 days</li>
                  <li>• User will set their password when accepting</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} className="min-w-24">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
