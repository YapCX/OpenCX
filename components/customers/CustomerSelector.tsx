"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Building2,
  Plus,
  Check,
  ChevronsUpDown,
  Phone,
  Mail,
  AlertTriangle,
  Shield,
  UserPlus,
} from "lucide-react";
import { CustomerForm } from "./CustomerForm";

interface Customer {
  _id: Id<"customers">;
  customerId: string;
  type: "individual" | "corporate";
  fullName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  status: string;
  riskLevel: string;
  amlStatus: string;
  sanctionsScreeningStatus: string;
}

interface CustomerSelectorProps {
  selectedCustomerId?: string;
  onSelectCustomer: (customer: Customer | null) => void;
  allowWalkIn?: boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function CustomerSelector({
  selectedCustomerId,
  onSelectCustomer,
  allowWalkIn = true,
  label = "Customer",
  placeholder = "Search customers...",
  required = false,
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const customersQuery = useQuery(api.customers.list, {
    searchTerm: searchTerm || undefined,
    limit: 50,
  });

  const customers = useMemo(() => {
    return (customersQuery as Customer[]) || [];
  }, [customersQuery]);

  // Find selected customer when selectedCustomerId changes
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.customerId === selectedCustomerId);
      if (customer) {
        setSelectedCustomer(customer);
      }
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, customers]);

  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    onSelectCustomer(customer);
    setOpen(false);
  };

  const handleWalkIn = () => {
    setSelectedCustomer(null);
    onSelectCustomer(null);
    setOpen(false);
  };

  const getCustomerDisplayName = (customer: Customer) => {
    if (customer.type === "individual") {
      return customer.fullName || "Unnamed Individual";
    } else {
      return customer.businessName || "Unnamed Business";
    }
  };

  const getCustomerSubtext = (customer: Customer) => {
    const parts = [];
    if (customer.phone) parts.push(customer.phone);
    if (customer.email) parts.push(customer.email);
    return parts.join(" • ");
  };

  const getStatusColor = (customer: Customer) => {
    if (customer.status === "flagged") return "destructive";
    if (customer.amlStatus === "approved" && customer.sanctionsScreeningStatus === "clear") {
      return "default";
    }
    if (customer.status === "suspended") return "secondary";
    return "outline";
  };

  const getStatusIcon = (customer: Customer) => {
    if (customer.status === "flagged") {
      return <AlertTriangle className="h-3 w-3" />;
    }
    if (customer.amlStatus === "approved" && customer.sanctionsScreeningStatus === "clear") {
      return <Shield className="h-3 w-3" />;
    }
    return null;
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    const name = getCustomerDisplayName(customer).toLowerCase();
    const id = customer.customerId.toLowerCase();
    const phone = customer.phone?.toLowerCase() || "";
    const email = customer.email?.toLowerCase() || "";
    
    return name.includes(searchLower) || 
           id.includes(searchLower) || 
           phone.includes(searchLower) || 
           email.includes(searchLower);
  });

  return (
    <div className="space-y-2">
      <Label htmlFor="customer-selector" className="flex items-center gap-2">
        <User className="h-4 w-4" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between h-auto min-h-[40px]"
            >
              {selectedCustomer ? (
                <div className="flex items-center gap-2 text-left">
                  {selectedCustomer.type === "individual" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getCustomerDisplayName(selectedCustomer)}
                      </span>
                      <Badge 
                        variant={getStatusColor(selectedCustomer)}
                        className="text-xs"
                      >
                        {getStatusIcon(selectedCustomer)}
                        {selectedCustomer.customerId}
                      </Badge>
                    </div>
                    {getCustomerSubtext(selectedCustomer) && (
                      <span className="text-xs text-muted-foreground">
                        {getCustomerSubtext(selectedCustomer)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput 
                placeholder="Search customers..." 
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="text-center py-4">
                    <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No customers found</p>
                    <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Customer
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>Create New Customer</DialogTitle>
                          <DialogDescription>
                            Add a new customer to the system
                          </DialogDescription>
                        </DialogHeader>
                        <CustomerForm
                          onClose={() => setShowNewCustomerDialog(false)}
                          isOpen={showNewCustomerDialog}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CommandEmpty>

                <CommandGroup>
                  {allowWalkIn && (
                    <CommandItem onSelect={handleWalkIn}>
                      <div className="flex items-center gap-2 w-full">
                        <UserPlus className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Walk-in Customer</div>
                          <div className="text-xs text-muted-foreground">
                            No customer profile required
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  )}

                  {filteredCustomers.map((customer) => (
                    <CommandItem
                      key={customer._id}
                      onSelect={() => handleSelectCustomer(customer)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {customer.type === "individual" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {getCustomerDisplayName(customer)}
                            </span>
                            <Badge 
                              variant={getStatusColor(customer)}
                              className="text-xs"
                            >
                              {getStatusIcon(customer)}
                              {customer.customerId}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {customer.riskLevel}
                            </Badge>
                          </div>
                          {getCustomerSubtext(customer) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {getCustomerSubtext(customer)}
                            </div>
                          )}
                        </div>
                        {selectedCustomer?.customerId === customer.customerId && (
                          <Check className="h-4 w-4" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>

            <div className="border-t p-2">
              <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Customer</DialogTitle>
                    <DialogDescription>
                      Add a new customer to the system
                    </DialogDescription>
                  </DialogHeader>
                  <CustomerForm
                    onClose={() => setShowNewCustomerDialog(false)}
                    isOpen={showNewCustomerDialog}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Customer Details Card */}
      {selectedCustomer && (
        <Card className="mt-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {selectedCustomer.type === "individual" ? (
                <User className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">ID:</span>
                <Badge variant="outline">{selectedCustomer.customerId}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Type:</span>
                <span className="capitalize">{selectedCustomer.type}</span>
              </div>
              {selectedCustomer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <span>{selectedCustomer.phone}</span>
                </div>
              )}
              {selectedCustomer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  <span>{selectedCustomer.email}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Status:</span>
              <Badge variant={getStatusColor(selectedCustomer)} className="text-xs">
                {getStatusIcon(selectedCustomer)}
                {selectedCustomer.status}
              </Badge>
              <Badge 
                variant={
                  selectedCustomer.riskLevel === "high" ? "destructive" : 
                  selectedCustomer.riskLevel === "medium" ? "secondary" : "default"
                }
                className="text-xs"
              >
                {selectedCustomer.riskLevel} risk
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}