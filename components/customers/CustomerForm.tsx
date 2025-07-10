"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Shield,
} from "lucide-react";

interface CustomerFormProps {
  editingId?: Id<"customers"> | null;
  onClose: () => void;
  isOpen: boolean;
}

interface CustomerFormData {
  customerType: "individual" | "corporate";
  // Individual fields
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  occupation: string;
  // Corporate fields
  businessName: string;
  incorporationNumber: string;
  businessType: string;
  isMSB: boolean;
  // Contact person for corporate
  contactPersonName: string;
  contactPersonTitle: string;
  contactPersonEmail: string;
  contactPersonPhone: string;
  // Common fields
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  notes: string;
}

export function CustomerForm({ editingId, onClose, isOpen }: CustomerFormProps) {
  const createCustomer = useMutation(api.customers.create);
  const updateCustomer = useMutation(api.customers.update);
  const existingCustomer = useQuery(
    api.customers.get,
    editingId ? { id: editingId } : "skip"
  );

  const [formData, setFormData] = useState<CustomerFormData>({
    customerType: existingCustomer?.type ?? "individual",
    firstName: existingCustomer?.firstName ?? "",
    lastName: existingCustomer?.lastName ?? "",
    dateOfBirth: existingCustomer?.dateOfBirth ?? "",
    occupation: existingCustomer?.occupation ?? "",
    businessName: existingCustomer?.businessName ?? "",
    incorporationNumber: existingCustomer?.incorporationNumber ?? "",
    businessType: existingCustomer?.businessType ?? "",
    isMSB: existingCustomer?.isMSB ?? false,
    contactPersonName: existingCustomer?.contactPersonName ?? "",
    contactPersonTitle: existingCustomer?.contactPersonTitle ?? "",
    contactPersonEmail: existingCustomer?.contactPersonEmail ?? "",
    contactPersonPhone: existingCustomer?.contactPersonPhone ?? "",
    email: existingCustomer?.email ?? "",
    phone: existingCustomer?.phone ?? "",
    address: existingCustomer?.address ?? "",
    city: existingCustomer?.city ?? "",
    province: existingCustomer?.province ?? "",
    postalCode: existingCustomer?.postalCode ?? "",
    country: existingCustomer?.country ?? "Canada",
    notes: existingCustomer?.notes ?? "",
  });

  const updateFormData = (field: keyof CustomerFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.customerType === "individual") {
      if (!formData.firstName || !formData.lastName) {
        toast.error("First name and last name are required for individual customers");
        return;
      }
    } else {
      if (!formData.businessName) {
        toast.error("Business name is required for corporate customers");
        return;
      }
    }

    if (!formData.phone && !formData.email) {
      toast.error("At least one contact method (phone or email) is required");
      return;
    }

    try {
      if (editingId) {
        await updateCustomer({
          id: editingId,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
          occupation: formData.occupation || undefined,
          businessName: formData.businessName || undefined,
          incorporationNumber: formData.incorporationNumber || undefined,
          businessType: formData.businessType || undefined,
          isMSB: formData.isMSB,
          contactPersonName: formData.contactPersonName || undefined,
          contactPersonTitle: formData.contactPersonTitle || undefined,
          contactPersonEmail: formData.contactPersonEmail || undefined,
          contactPersonPhone: formData.contactPersonPhone || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          province: formData.province || undefined,
          postalCode: formData.postalCode || undefined,
          country: formData.country || undefined,
          notes: formData.notes || undefined,
        });
        toast.success("Customer updated successfully");
      } else {
        const result = await createCustomer({
          type: formData.customerType,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
          occupation: formData.occupation || undefined,
          businessName: formData.businessName || undefined,
          incorporationNumber: formData.incorporationNumber || undefined,
          businessType: formData.businessType || undefined,
          isMSB: formData.isMSB,
          contactPersonName: formData.contactPersonName || undefined,
          contactPersonTitle: formData.contactPersonTitle || undefined,
          contactPersonEmail: formData.contactPersonEmail || undefined,
          contactPersonPhone: formData.contactPersonPhone || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          province: formData.province || undefined,
          postalCode: formData.postalCode || undefined,
          country: formData.country || undefined,
          notes: formData.notes || undefined,
        });
        toast.success(`Customer ${result.customerId} created successfully`);
      }

      onClose();
      resetForm();
    } catch {
      toast.error("Failed to save customer");
    }
  };

  const resetForm = () => {
    setFormData({
      customerType: "individual",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      occupation: "",
      businessName: "",
      incorporationNumber: "",
      businessType: "",
      isMSB: false,
      contactPersonName: "",
      contactPersonTitle: "",
      contactPersonEmail: "",
      contactPersonPhone: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      country: "Canada",
      notes: "",
    });
  };

  const complianceIndicator = !existingCustomer ? null :
    existingCustomer.status === "flagged" ? (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Flagged
      </Badge>
    ) : existingCustomer.complianceStatus === "approved" && existingCustomer.sanctionsScreeningStatus === "clear" ? (
      <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3" />
        Verified
      </Badge>
    ) : existingCustomer.complianceStatus === "pending" || existingCustomer.sanctionsScreeningStatus === "pending" ? (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Pending Review
      </Badge>
    ) : (
      <Badge variant="outline" className="flex items-center gap-1">
        <Shield className="h-3 w-3" />
        Under Review
      </Badge>
    );

  if (!isOpen) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {formData.customerType === "individual" ? (
              <User className="h-6 w-6" />
            ) : (
              <Building2 className="h-6 w-6" />
            )}
            {editingId ? "Edit Customer" : "New Customer"}
          </h2>
          <p className="text-muted-foreground">
            {editingId ? "Update customer information" : "Create a new customer profile"}
          </p>
          {existingCustomer && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium">ID: {existingCustomer.customerId}</span>
              {complianceIndicator}
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Type Selection */}
        {!editingId && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Type</CardTitle>
              <CardDescription>
                Select the type of customer account to create
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="customer-type"
                    checked={formData.customerType === "individual"}
                    onCheckedChange={(checked) =>
                      updateFormData("customerType", checked ? "individual" : "corporate")
                    }
                  />
                  <Label htmlFor="customer-type" className="flex items-center gap-2">
                    {formData.customerType === "individual" ? (
                      <>
                        <User className="h-4 w-4" />
                        Individual
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4" />
                        Corporate
                      </>
                    )}
                  </Label>
                </div>
                <Badge variant="outline">
                  {formData.customerType === "individual" ? "Personal Account" : "Business Account"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="contact">Contact & Address</TabsTrigger>
            <TabsTrigger value="additional">Additional Details</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {formData.customerType === "individual" ? (
                    <>
                      <User className="h-5 w-5" />
                      Personal Information
                    </>
                  ) : (
                    <>
                      <Building2 className="h-5 w-5" />
                      Business Information
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.customerType === "individual" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => updateFormData("firstName", e.target.value)}
                          placeholder="Enter first name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => updateFormData("lastName", e.target.value)}
                          placeholder="Enter last name"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => updateFormData("dateOfBirth", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="occupation">Occupation</Label>
                        <Input
                          id="occupation"
                          value={formData.occupation}
                          onChange={(e) => updateFormData("occupation", e.target.value)}
                          placeholder="Enter occupation"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={formData.businessName}
                        onChange={(e) => updateFormData("businessName", e.target.value)}
                        placeholder="Enter business name"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="incorporationNumber">Incorporation Number</Label>
                        <Input
                          id="incorporationNumber"
                          value={formData.incorporationNumber}
                          onChange={(e) => updateFormData("incorporationNumber", e.target.value)}
                          placeholder="Enter incorporation number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type</Label>
                        <Select value={formData.businessType} onValueChange={(value) => updateFormData("businessType", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corporation">Corporation</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                            <SelectItem value="llc">Limited Liability Company</SelectItem>
                            <SelectItem value="trust">Trust</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="msb"
                        checked={formData.isMSB}
                        onCheckedChange={(checked) => updateFormData("isMSB", checked)}
                      />
                      <Label htmlFor="msb" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Money Service Business (MSB)
                      </Label>
                      {formData.isMSB && (
                        <Badge variant="secondary">Requires Enhanced Due Diligence</Badge>
                      )}
                    </div>

                    {/* Contact Person for Corporate */}
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium">Primary Contact Person</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contactPersonName">Contact Name</Label>
                          <Input
                            id="contactPersonName"
                            value={formData.contactPersonName}
                            onChange={(e) => updateFormData("contactPersonName", e.target.value)}
                            placeholder="Enter contact person name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactPersonTitle">Title</Label>
                          <Input
                            id="contactPersonTitle"
                            value={formData.contactPersonTitle}
                            onChange={(e) => updateFormData("contactPersonTitle", e.target.value)}
                            placeholder="Enter title"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contactPersonEmail">Contact Email</Label>
                          <Input
                            id="contactPersonEmail"
                            type="email"
                            value={formData.contactPersonEmail}
                            onChange={(e) => updateFormData("contactPersonEmail", e.target.value)}
                            placeholder="contact@business.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactPersonPhone">Contact Phone</Label>
                          <Input
                            id="contactPersonPhone"
                            type="tel"
                            value={formData.contactPersonPhone}
                            onChange={(e) => updateFormData("contactPersonPhone", e.target.value)}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact & Address Tab */}
          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData("email", e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateFormData("address", e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateFormData("city", e.target.value)}
                      placeholder="Toronto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Province/State</Label>
                    <Select value={formData.province} onValueChange={(value) => updateFormData("province", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AB">Alberta</SelectItem>
                        <SelectItem value="BC">British Columbia</SelectItem>
                        <SelectItem value="MB">Manitoba</SelectItem>
                        <SelectItem value="NB">New Brunswick</SelectItem>
                        <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                        <SelectItem value="NS">Nova Scotia</SelectItem>
                        <SelectItem value="ON">Ontario</SelectItem>
                        <SelectItem value="PE">Prince Edward Island</SelectItem>
                        <SelectItem value="QC">Quebec</SelectItem>
                        <SelectItem value="SK">Saskatchewan</SelectItem>
                        <SelectItem value="NT">Northwest Territories</SelectItem>
                        <SelectItem value="NU">Nunavut</SelectItem>
                        <SelectItem value="YT">Yukon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => updateFormData("postalCode", e.target.value)}
                      placeholder="M5V 3A1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={formData.country} onValueChange={(value) => updateFormData("country", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Additional Details Tab */}
          <TabsContent value="additional" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => updateFormData("notes", e.target.value)}
                    placeholder="Additional notes about this customer..."
                    rows={4}
                  />
                </div>

                {existingCustomer && (
                  <div className="space-y-4">
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Created:</span>
                        <p className="text-muted-foreground">
                          {new Date(existingCustomer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Last Updated:</span>
                        <p className="text-muted-foreground">
                          {new Date(existingCustomer.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <Badge className="ml-2">{existingCustomer.status}</Badge>
                      </div>
                      <div>
                        <span className="font-medium">Risk Level:</span>
                        <Badge
                          variant={existingCustomer.riskLevel === "high" ? "destructive" :
                                  existingCustomer.riskLevel === "medium" ? "secondary" : "default"}
                          className="ml-2"
                        >
                          {existingCustomer.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {editingId ? "Update Customer" : "Create Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}