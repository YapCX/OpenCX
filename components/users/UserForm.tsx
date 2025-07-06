"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Copy, ExternalLink } from "lucide-react";

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingId: Id<"users"> | null;
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


export function UserForm({ isOpen, onClose, editingId }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    isManager: false,
    isComplianceOfficer: false,
    isTemplate: false,
    isActive: true,
    canModifyExchangeRates: false,
    maxModificationIndividual: "",
    maxModificationCorporate: "",
    canEditFeesCommissions: false,
    canTransferBetweenAccounts: false,
    canReconcileAccounts: false,
  });

  const [defaultPrivileges, setDefaultPrivileges] = useState<Privileges>({
    view: true,
    create: false,
    modify: false,
    delete: false,
    print: true,
  });

  const [moduleExceptions, setModuleExceptions] = useState<ModuleException[]>([]);
  const [invitationLink, setInvitationLink] = useState<string>("");

  const existingUser = useQuery(
    api.users.get,
    editingId ? { id: editingId } : "skip"
  );

  const modules = useQuery(api.users.getModules);
  const createUser = useMutation(api.users.create);
  const updateUser = useMutation(api.users.update);

  useEffect(() => {
    if (existingUser) {
      setFormData({
        email: existingUser.email,
        fullName: existingUser.fullName || "",
        isManager: existingUser.isManager,
        isComplianceOfficer: existingUser.isComplianceOfficer,
        isTemplate: existingUser.isTemplate,
        isActive: existingUser.isActive,
        canModifyExchangeRates: existingUser.canModifyExchangeRates,
        maxModificationIndividual: existingUser.maxModificationIndividual?.toString() || "",
        maxModificationCorporate: existingUser.maxModificationCorporate?.toString() || "",
        canEditFeesCommissions: existingUser.canEditFeesCommissions,
        canTransferBetweenAccounts: existingUser.canTransferBetweenAccounts,
        canReconcileAccounts: existingUser.canReconcileAccounts,
      });
      setDefaultPrivileges(existingUser.defaultPrivileges);
      setModuleExceptions(existingUser.moduleExceptions || []);
    } else {
      // Reset form for new user
      setFormData({
        email: "",
        fullName: "",
        isManager: false,
        isComplianceOfficer: false,
        isTemplate: false,
        isActive: true,
        canModifyExchangeRates: false,
        maxModificationIndividual: "",
        maxModificationCorporate: "",
        canEditFeesCommissions: false,
        canTransferBetweenAccounts: false,
        canReconcileAccounts: false,
      });
      setDefaultPrivileges({
        view: true,
        create: false,
        modify: false,
        delete: false,
        print: true,
      });
      setModuleExceptions([]);
      setInvitationLink("");
    }
  }, [existingUser, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const userData = {
        ...formData,
        maxModificationIndividual: formData.maxModificationIndividual 
          ? parseFloat(formData.maxModificationIndividual) 
          : undefined,
        maxModificationCorporate: formData.maxModificationCorporate 
          ? parseFloat(formData.maxModificationCorporate) 
          : undefined,
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
        toast.success("User created successfully");
        
        // Generate invitation link for new users
        if (result.invitationToken) {
          const baseUrl = window.location.origin;
          const link = `${baseUrl}/accept-invitation?token=${result.invitationToken}`;
          setInvitationLink(link);
        }
      }

      if (!invitationLink) {
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save user");
    }
  };

  const handlePrivilegeChange = (privilege: keyof Privileges, checked: boolean) => {
    setDefaultPrivileges(prev => ({
      ...prev,
      [privilege]: checked,
    }));
  };

  const handleModuleExceptionChange = (moduleName: string, privilege: keyof Privileges, checked: boolean) => {
    setModuleExceptions(prev => {
      const existing = prev.find(e => e.moduleName === moduleName);
      
      if (existing) {
        return prev.map(e => 
          e.moduleName === moduleName 
            ? { ...e, privileges: { ...e.privileges, [privilege]: checked } }
            : e
        );
      } else {
        return [...prev, {
          moduleName,
          privileges: { ...defaultPrivileges, [privilege]: checked }
        }];
      }
    });
  };

  const getEffectivePrivilege = (moduleName: string, privilege: keyof Privileges): boolean => {
    const exception = moduleExceptions.find(e => e.moduleName === moduleName);
    return exception ? exception.privileges[privilege] : defaultPrivileges[privilege];
  };

  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationLink);
    toast.success("Invitation link copied to clipboard");
  };

  const handleClose = () => {
    setInvitationLink("");
    onClose();
  };

  if (invitationLink) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Edit User" : "Add New User"}
          </DialogTitle>
          <DialogDescription>
            {editingId 
              ? "Update user information, roles, and permissions." 
              : "Create a new user account with roles and permissions."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="financial">Financial Controls</TabsTrigger>
              <TabsTrigger value="privileges">Privileges</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    required
                    disabled={!!editingId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Roles</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isManager"
                      checked={formData.isManager}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, isManager: checked as boolean })
                      }
                    />
                    <Label htmlFor="isManager" className="font-normal">
                      Manager
                      <div className="text-xs text-gray-500">Full system access</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isComplianceOfficer"
                      checked={formData.isComplianceOfficer}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, isComplianceOfficer: checked as boolean })
                      }
                    />
                    <Label htmlFor="isComplianceOfficer" className="font-normal">
                      Compliance Officer
                      <div className="text-xs text-gray-500">AML/KYC functions</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isTemplate"
                      checked={formData.isTemplate}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, isTemplate: checked as boolean })
                      }
                    />
                    <Label htmlFor="isTemplate" className="font-normal">
                      Template User
                      <div className="text-xs text-gray-500">For quick user creation</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, isActive: checked as boolean })
                      }
                    />
                    <Label htmlFor="isActive" className="font-normal">
                      Active
                      <div className="text-xs text-gray-500">User can log in</div>
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canModifyExchangeRates"
                    checked={formData.canModifyExchangeRates}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, canModifyExchangeRates: checked as boolean })
                    }
                  />
                  <Label htmlFor="canModifyExchangeRates">Can modify exchange rates</Label>
                </div>

                {formData.canModifyExchangeRates && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div className="space-y-2">
                      <Label htmlFor="maxModificationIndividual">
                        Max Modification - Individual ($)
                      </Label>
                      <Input
                        id="maxModificationIndividual"
                        type="number"
                        value={formData.maxModificationIndividual}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          maxModificationIndividual: e.target.value 
                        })}
                        placeholder="10000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxModificationCorporate">
                        Max Modification - Corporate ($)
                      </Label>
                      <Input
                        id="maxModificationCorporate"
                        type="number"
                        value={formData.maxModificationCorporate}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          maxModificationCorporate: e.target.value 
                        })}
                        placeholder="50000"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditFeesCommissions"
                    checked={formData.canEditFeesCommissions}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, canEditFeesCommissions: checked as boolean })
                    }
                  />
                  <Label htmlFor="canEditFeesCommissions">Can edit fees and commissions</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canTransferBetweenAccounts"
                    checked={formData.canTransferBetweenAccounts}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, canTransferBetweenAccounts: checked as boolean })
                    }
                  />
                  <Label htmlFor="canTransferBetweenAccounts">Can transfer between accounts</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canReconcileAccounts"
                    checked={formData.canReconcileAccounts}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, canReconcileAccounts: checked as boolean })
                    }
                  />
                  <Label htmlFor="canReconcileAccounts">Can reconcile accounts</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="privileges" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Default Privileges</CardTitle>
                  <CardDescription>
                    These privileges apply to all modules unless overridden below.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-4">
                    {(Object.keys(defaultPrivileges) as Array<keyof Privileges>).map(privilege => (
                      <div key={privilege} className="flex items-center space-x-2">
                        <Checkbox
                          id={`default-${privilege}`}
                          checked={defaultPrivileges[privilege]}
                          onCheckedChange={(checked) => 
                            handlePrivilegeChange(privilege, checked as boolean)
                          }
                        />
                        <Label htmlFor={`default-${privilege}`} className="capitalize">
                          {privilege}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {modules && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Module Exceptions</CardTitle>
                    <CardDescription>
                      Override default privileges for specific modules.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {modules.map(moduleName => (
                        <div key={moduleName} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="capitalize font-medium">{moduleName}</Label>
                            {moduleExceptions.some(e => e.moduleName === moduleName) && (
                              <Badge variant="outline">Modified</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-5 gap-4">
                            {(Object.keys(defaultPrivileges) as Array<keyof Privileges>).map(privilege => (
                              <div key={privilege} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${moduleName}-${privilege}`}
                                  checked={getEffectivePrivilege(moduleName, privilege)}
                                  onCheckedChange={(checked) => 
                                    handleModuleExceptionChange(moduleName, privilege, checked as boolean)
                                  }
                                />
                                <Label htmlFor={`${moduleName}-${privilege}`} className="capitalize text-xs">
                                  {privilege}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editingId ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}