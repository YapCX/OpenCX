import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
  Search,
  User,
  UserPlus,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { cn } from "../../lib/utils";

interface CustomerSelectorProps {
  value?: Id<"customers"> | null;
  onChange: (customerId: Id<"customers"> | null) => void;
  onNewCustomer?: () => void;
  required?: boolean;
}

export function CustomerSelector({
  value,
  onChange,
  onNewCustomer,
  required
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const customers = useQuery(api.customers.list, {}) || [];
  const selectedCustomer = useQuery(
    api.customers.get,
    value ? { id: value } : "skip"
  );

  // Helper function to get customer display name
  const getCustomerDisplayName = (customer: any) => {
    if (customer.customerType === "individual") {
      return customer.fullName || "Unknown Customer";
    } else {
      return customer.legalBusinessName || "Unknown Business";
    }
  };

  // Helper function to get customer contact info
  const getCustomerContact = (customer: any) => {
    if (customer.customerType === "individual") {
      return customer.phoneNumber;
    } else {
      return customer.businessPhone || customer.contactPersonEmail;
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();

    // Get all searchable fields based on customer type
    const searchableFields = [
      customer.customerId,
      customer.customerType === "individual" ? customer.fullName : customer.legalBusinessName,
      customer.customerType === "individual" ? customer.phoneNumber : customer.businessPhone,
      customer.contactPersonEmail,
      customer.contactPersonName,
    ].filter(Boolean); // Remove undefined/null values

    return searchableFields.some(field =>
      field && field.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-2">
      <Label>
        Customer {required && <span className="text-destructive">*</span>}
      </Label>

      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
            >
              {selectedCustomer ? (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{getCustomerDisplayName(selectedCustomer)}</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedCustomer.customerType}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Walk-in Customer</span>
                  <Badge variant="outline" className="text-xs">
                    No ID Required
                  </Badge>
                </div>
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
                    <p className="text-sm text-muted-foreground">No customers found.</p>
                    {onNewCustomer && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onNewCustomer();
                          setOpen(false);
                        }}
                        className="mt-2 gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add New Customer
                      </Button>
                    )}
                  </div>
                </CommandEmpty>

                <CommandGroup>
                  {/* Walk-in Customer Option */}
                  <CommandItem
                    value="walk-in-customer"
                    onSelect={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-muted-foreground">
                          Walk-in Customer
                        </span>
                        <Badge variant="outline" className="text-xs">
                          No ID Required
                        </Badge>
                      </div>
                    </div>
                  </CommandItem>

                  {/* New Customer Option */}
                  {onNewCustomer && (
                    <CommandItem
                      value="new-customer"
                      onSelect={() => {
                        onNewCustomer();
                        setOpen(false);
                      }}
                    >
                      <UserPlus className="mr-2 h-4 w-4 text-primary" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary">
                            Add New Customer
                          </span>
                          <Badge variant="default" className="text-xs">
                            Create Profile
                          </Badge>
                        </div>
                      </div>
                    </CommandItem>
                  )}

                  {/* Separator if we have both special options and regular customers */}
                  {filteredCustomers.length > 0 && (
                    <div className="px-2 py-1">
                      <div className="border-t border-border" />
                    </div>
                  )}

                  {filteredCustomers.map((customer) => (
                    <CommandItem
                      key={customer._id}
                      value={`${getCustomerDisplayName(customer)} ${customer.customerId} ${getCustomerContact(customer) || ''}`}
                      onSelect={() => {
                        onChange(customer._id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === customer._id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {getCustomerDisplayName(customer)}
                          </span>
                          <Badge
                            variant={customer.customerType === "individual" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {customer.customerType}
                          </Badge>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            ID: {customer.customerId}
                          </Badge>
                          {getCustomerContact(customer) && (
                            <Badge variant="outline" className="text-xs">
                              {getCustomerContact(customer)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {onNewCustomer && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onNewCustomer}
            title="Add New Customer"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {selectedCustomer && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {getCustomerDisplayName(selectedCustomer)}
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    ID: {selectedCustomer.customerId}
                  </Badge>
                  {getCustomerContact(selectedCustomer) && (
                    <Badge variant="outline" className="text-xs">
                      {getCustomerContact(selectedCustomer)}
                    </Badge>
                  )}
                  <Badge
                    variant={selectedCustomer.customerType === "individual" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {selectedCustomer.customerType}
                  </Badge>
                </div>
              </div>

              {value && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(null)}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
