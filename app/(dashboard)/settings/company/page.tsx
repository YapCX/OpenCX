"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2,
  Save,
  ArrowLeft,
  Lock,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText
} from "lucide-react";
import { LogoUpload } from "@/components/ui/logo-upload";
import Link from "next/link";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

const BUSINESS_TYPES = [
  "Money Service Business (MSB)",
  "Foreign Exchange Dealer",
  "Financial Institution",
  "Currency Exchange",
  "Money Transfer Service",
  "Other"
];

const PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec",
  "Saskatchewan", "Yukon"
];

export default function CompanySettingsPage() {
  // Check current user permissions
  const currentUserPermissions = useQuery(api.users.getCurrentUserPermissions);

  // Get current company settings
  const companySettings = useQuery(api.settings.getCompanySettings);

  // Form state
  const [formData, setFormData] = useState({
    companyName: "",
    businessNumber: "",
    licenseNumber: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Canada",
    phone: "",
    email: "",
    website: "",
    businessType: "",
    establishedDate: "",
    regulatoryBody: "",
    complianceOfficer: "",
    logoImageId: undefined as Id<"_storage"> | undefined,
    branchId: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Mutations
  const updateCompanySettings = useMutation(api.settings.updateCompanySettings);

  // Initialize form data when settings load
  useEffect(() => {
    if (companySettings) {
      const settings = companySettings as any;
      setFormData({
        companyName: settings.companyName || "",
        businessNumber: settings.businessNumber || "",
        licenseNumber: settings.licenseNumber || "",
        address: settings.address || "",
        city: settings.city || "",
        province: settings.province || "",
        postalCode: settings.postalCode || "",
        country: settings.country || "Canada",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        businessType: settings.businessType || "",
        establishedDate: settings.establishedDate || "",
        regulatoryBody: settings.regulatoryBody || "",
        complianceOfficer: settings.complianceOfficer || "",
        logoImageId: settings.logoImageId || undefined,
        branchId: settings.branchId || "",
      });
    }
  }, [companySettings]);

  // Permission check
  if (currentUserPermissions === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!currentUserPermissions?.isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only managers can modify company settings.</p>
          <Link href="/settings">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateCompanySettings(formData);
      toast.success("Company settings updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPostalCode = (value: string) => {
    // Format Canadian postal code (A1A 1A1)
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    if (cleaned.length <= 3) {
      return cleaned;
    }
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-gray-600">Manage your business information and branding</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </CardTitle>
            <CardDescription>
              Basic company details and registration information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Your Exchange Company Ltd."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessNumber">Business Number</Label>
                <Input
                  id="businessNumber"
                  value={formData.businessNumber}
                  onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                  placeholder="123456789RC0001"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  placeholder="MSB License #"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="establishedDate">Established Date</Label>
              <Input
                id="establishedDate"
                type="date"
                value={formData.establishedDate}
                onChange={(e) => setFormData({ ...formData, establishedDate: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Address and contact details for your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Toronto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Select
                  value={formData.province}
                  onValueChange={(value) => setFormData({ ...formData, province: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({
                    ...formData,
                    postalCode: formatPostalCode(e.target.value)
                  })}
                  placeholder="A1A 1A1"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">
                  <Globe className="h-4 w-4 inline mr-1" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.company.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regulatory Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Regulatory Information
            </CardTitle>
            <CardDescription>
              Compliance and regulatory details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="regulatoryBody">Regulatory Body</Label>
                <Input
                  id="regulatoryBody"
                  value={formData.regulatoryBody}
                  onChange={(e) => setFormData({ ...formData, regulatoryBody: e.target.value })}
                  placeholder="FINTRAC, Provincial Regulator, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complianceOfficer">Compliance Officer</Label>
                <Input
                  id="complianceOfficer"
                  value={formData.complianceOfficer}
                  onChange={(e) => setFormData({ ...formData, complianceOfficer: e.target.value })}
                  placeholder="Name of designated compliance officer"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Branding & Multi-Branch Support
            </CardTitle>
            <CardDescription>
              Upload your company logo and configure branch settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="branchId">Branch ID (Optional)</Label>
                <Input
                  id="branchId"
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  placeholder="e.g., MTL-001, TOR-MAIN"
                />
                <p className="text-xs text-gray-500">
                  For multi-branch operations, specify a unique branch identifier
                </p>
              </div>
              <div className="space-y-2">
                <LogoUpload
                  currentLogoId={formData.logoImageId}
                  onLogoChange={(logoId) => setFormData({ ...formData, logoImageId: logoId })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Link href="/settings">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}