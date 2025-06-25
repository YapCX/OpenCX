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
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";

interface UserFormProps {
  editingId: Id<"systemUsers"> | null;
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

  // Basic Information
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordReminder, setPasswordReminder] = useState("");
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
      setUsername(existingUser.username);
      setPasswordReminder(existingUser.passwordReminder);
      setFullName(existingUser.fullName || "");
      setIsManager(existingUser.isManager);
      setIsComplianceOfficer(existingUser.isComplianceOfficer);
      setIsTemplate(existingUser.isTemplate);
      setIsActive(existingUser.isActive);

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
      if (!username.trim()) {
        toast.error("Username is required");
        return;
      }

      if (!editingId && !password.trim()) {
        toast.error("Password is required for new users");
        return;
      }

      if (!passwordReminder.trim()) {
        toast.error("Password reminder is required");
        return;
      }

      const userData = {
        username: username.trim(),
        passwordReminder: passwordReminder.trim(),
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
        await createUser({
          ...userData,
          password: password.trim(),
        });
        toast.success("User created successfully");
      }

      onClose();
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
                      <Label htmlFor="username">
                        Username *
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="john.doe"
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

                    {!editingId && (
                      <div className="space-y-2">
                        <Label htmlFor="password">
                          Password *
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required={!editingId}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="passwordReminder">
                        Password Reminder *
                      </Label>
                      <Input
                        id="passwordReminder"
                        type="text"
                        value={passwordReminder}
                        onChange={(e) => setPasswordReminder(e.target.value)}
                        placeholder="Mother's maiden name"
                        required
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
                            step="0.1"
                            min="0"
                            max="100"
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
                            step="0.1"
                            min="0"
                            max="100"
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
