"use client";

import { useState, useEffect } from "react";
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

export function CustomerForm({ editingId, onClose, isOpen }: CustomerFormProps) {
  const [customerType, setCustomerType] = useState<"individual" | "corporate">("individual");

  // Individual fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [occupation, setOccupation] = useState("");

  // Corporate fields
  const [businessName, setBusinessName] = useState("");
  const [incorporationNumber, setIncorporationNumber] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [isMSB, setIsMSB] = useState(false);

  // Contact person for corporate
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPersonTitle, setContactPersonTitle] = useState("");
  const [contactPersonEmail, setContactPersonEmail] = useState("");
  const [contactPersonPhone, setContactPersonPhone] = useState("");

  // Common fields
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Canada");
  const [notes, setNotes] = useState("");

  const createCustomer = useMutation(api.customers.create);
  const updateCustomer = useMutation(api.customers.update);
  const existingCustomer = useQuery(
    api.customers.get,
    editingId ? { id: editingId } : "skip"
  );

  // Load existing customer data for editing
  useEffect(() => {
    if (existingCustomer) {
      setCustomerType(existingCustomer.type);
      setFirstName(existingCustomer.firstName || "");
      setLastName(existingCustomer.lastName || "");
      setDateOfBirth(existingCustomer.dateOfBirth || "");
      setOccupation(existingCustomer.occupation || "");
      setBusinessName(existingCustomer.businessName || "");
      setIncorporationNumber(existingCustomer.incorporationNumber || "");
      setBusinessType(existingCustomer.businessType || "");
      setIsMSB(existingCustomer.isMSB || false);
      setContactPersonName(existingCustomer.contactPersonName || "");
      setContactPersonTitle(existingCustomer.contactPersonTitle || "");
      setContactPersonEmail(existingCustomer.contactPersonEmail || "");
      setContactPersonPhone(existingCustomer.contactPersonPhone || "");
      setEmail(existingCustomer.email || "");
      setPhone(existingCustomer.phone || "");
      setAddress(existingCustomer.address || "");
      setCity(existingCustomer.city || "");
      setProvince(existingCustomer.province || "");
      setPostalCode(existingCustomer.postalCode || "");
      setCountry(existingCustomer.country || "Canada");
      setNotes(existingCustomer.notes || "");
    }
  }, [existingCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (customerType === "individual") {
      if (!firstName || !lastName) {
        toast.error("First name and last name are required for individual customers");
        return;
      }
    } else {
      if (!businessName) {
        toast.error("Business name is required for corporate customers");
        return;
      }
    }

    if (!phone && !email) {
      toast.error("At least one contact method (phone or email) is required");
      return;
    }

    try {
      if (editingId) {
        await updateCustomer({
          id: editingId,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          dateOfBirth: dateOfBirth || undefined,
          occupation: occupation || undefined,
          businessName: businessName || undefined,
          incorporationNumber: incorporationNumber || undefined,
          businessType: businessType || undefined,
          isMSB,
          contactPersonName: contactPersonName || undefined,
          contactPersonTitle: contactPersonTitle || undefined,
          contactPersonEmail: contactPersonEmail || undefined,
          contactPersonPhone: contactPersonPhone || undefined,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          city: city || undefined,
          province: province || undefined,
          postalCode: postalCode || undefined,
          country: country || undefined,
          notes: notes || undefined,
        });
        toast.success("Customer updated successfully");
      } else {
        const result = await createCustomer({
          type: customerType,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          dateOfBirth: dateOfBirth || undefined,
          occupation: occupation || undefined,
          businessName: businessName || undefined,
          incorporationNumber: incorporationNumber || undefined,
          businessType: businessType || undefined,
          isMSB,
          contactPersonName: contactPersonName || undefined,
          contactPersonTitle: contactPersonTitle || undefined,
          contactPersonEmail: contactPersonEmail || undefined,
          contactPersonPhone: contactPersonPhone || undefined,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          city: city || undefined,
          province: province || undefined,
          postalCode: postalCode || undefined,
          country: country || undefined,
          notes: notes || undefined,
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
    setCustomerType("individual");
    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setOccupation("");
    setBusinessName("");
    setIncorporationNumber("");
    setBusinessType("");
    setIsMSB(false);
    setContactPersonName("");
    setContactPersonTitle("");
    setContactPersonEmail("");
    setContactPersonPhone("");
    setEmail("");
    setPhone("");
    setAddress("");
    setCity("");
    setProvince("");
    setPostalCode("");
    setCountry("Canada");
    setNotes("");
  };

  const getComplianceIndicator = () => {
    if (!existingCustomer) return null;

    const { amlStatus, sanctionsScreeningStatus, status } = existingCustomer;

    if (status === "flagged") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Flagged
        </Badge>
      );
    }

    if (amlStatus === "approved" && sanctionsScreeningStatus === "clear") {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      );
    }

    if (amlStatus === "pending" || sanctionsScreeningStatus === "pending") {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending Review
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Shield className="h-3 w-3" />
        Under Review
      </Badge>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {customerType === "individual" ? (
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
              {getComplianceIndicator()}
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
                    checked={customerType === "individual"}
                    onCheckedChange={(checked) =>
                      setCustomerType(checked ? "individual" : "corporate")
                    }
                  />
                  <Label htmlFor="customer-type" className="flex items-center gap-2">
                    {customerType === "individual" ? (
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
                  {customerType === "individual" ? "Personal Account" : "Business Account"}
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
                  {customerType === "individual" ? (
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
                {customerType === "individual" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Enter first name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
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
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="occupation">Occupation</Label>
                        <Input
                          id="occupation"
                          value={occupation}
                          onChange={(e) => setOccupation(e.target.value)}
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
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Enter business name"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="incorporationNumber">Incorporation Number</Label>
                        <Input
                          id="incorporationNumber"
                          value={incorporationNumber}
                          onChange={(e) => setIncorporationNumber(e.target.value)}
                          placeholder="Enter incorporation number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type</Label>
                        <Select value={businessType} onValueChange={setBusinessType}>
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
                        checked={isMSB}
                        onCheckedChange={setIsMSB}
                      />
                      <Label htmlFor="msb" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Money Service Business (MSB)
                      </Label>
                      {isMSB && (
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
                            value={contactPersonName}
                            onChange={(e) => setContactPersonName(e.target.value)}
                            placeholder="Enter contact person name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactPersonTitle">Title</Label>
                          <Input
                            id="contactPersonTitle"
                            value={contactPersonTitle}
                            onChange={(e) => setContactPersonTitle(e.target.value)}
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
                            value={contactPersonEmail}
                            onChange={(e) => setContactPersonEmail(e.target.value)}
                            placeholder="contact@business.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactPersonPhone">Contact Phone</Label>
                          <Input
                            id="contactPersonPhone"
                            type="tel"
                            value={contactPersonPhone}
                            onChange={(e) => setContactPersonPhone(e.target.value)}
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Toronto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Province/State</Label>
                    <Select value={province} onValueChange={setProvince}>
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
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="M5V 3A1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={setCountry}>
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
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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