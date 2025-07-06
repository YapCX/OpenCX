"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Save, 
  ArrowLeft,
  Lock,
  AlertTriangle,
  Users,
  DollarSign,
  Database,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const SANCTION_LISTS = [
  { id: "OFAC", name: "OFAC (US Treasury)", description: "Office of Foreign Assets Control" },
  { id: "UN", name: "UN Security Council", description: "United Nations sanctions list" },
  { id: "EU", name: "EU Sanctions", description: "European Union consolidated list" },
  { id: "UK", name: "UK HMT Sanctions", description: "UK Treasury sanctions list" },
  { id: "CANADA", name: "Canada OSFI", description: "Canadian sanctions list" },
];

const SERVICE_FEE_TYPES = [
  { value: "flat", label: "Flat Fee", description: "Fixed amount per transaction" },
  { value: "percentage", label: "Percentage", description: "Percentage of transaction amount" },
];

export default function ComplianceSettingsPage() {
  // Check current user permissions
  const currentUserPermissions = useQuery(api.users.getCurrentUserPermissions);
  
  // Get current AML settings
  const amlSettings = useQuery(api.settings.getAMLSettings);
  
  // Form state
  const [formData, setFormData] = useState({
    autoScreeningEnabled: true,
    enabledSanctionLists: ["OFAC", "UN", "EU"],
    riskThresholds: {
      low: 30,
      medium: 70,
      high: 100,
    },
    transactionLimits: {
      individualDaily: 10000,
      individualTransaction: 3000,
      corporateDaily: 50000,
      corporateTransaction: 15000,
    },
    autoHoldOnMatch: true,
    requireOverrideReason: true,
    autoReportSuspicious: false,
    defaultServiceFee: 2.0,
    serviceFeeType: "flat" as "flat" | "percentage",
    pepScreeningEnabled: true,
    adverseMediaScreeningEnabled: false,
    retentionPeriodDays: 2555,
    requireTwoPersonApproval: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Mutations
  const updateAMLSettings = useMutation(api.settings.updateAMLSettings);

  // Initialize form data when settings load
  useEffect(() => {
    if (amlSettings) {
      setFormData({
        autoScreeningEnabled: amlSettings.autoScreeningEnabled,
        enabledSanctionLists: amlSettings.enabledSanctionLists,
        riskThresholds: amlSettings.riskThresholds,
        transactionLimits: amlSettings.transactionLimits,
        autoHoldOnMatch: amlSettings.autoHoldOnMatch,
        requireOverrideReason: amlSettings.requireOverrideReason,
        autoReportSuspicious: amlSettings.autoReportSuspicious,
        defaultServiceFee: amlSettings.defaultServiceFee,
        serviceFeeType: amlSettings.serviceFeeType,
        pepScreeningEnabled: amlSettings.pepScreeningEnabled,
        adverseMediaScreeningEnabled: amlSettings.adverseMediaScreeningEnabled,
        retentionPeriodDays: amlSettings.retentionPeriodDays,
        requireTwoPersonApproval: amlSettings.requireTwoPersonApproval,
      });
    }
  }, [amlSettings]);

  // Permission check
  if (currentUserPermissions === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!currentUserPermissions?.isManager && !currentUserPermissions?.isComplianceOfficer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only managers and compliance officers can modify compliance settings.</p>
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
      await updateAMLSettings(formData);
      toast.success("Compliance settings updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSanctionListToggle = (listId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      enabledSanctionLists: checked 
        ? [...prev.enabledSanctionLists, listId]
        : prev.enabledSanctionLists.filter(id => id !== listId)
    }));
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "low": return "text-green-600 bg-green-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "high": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Compliance & AML Settings</h1>
          <p className="text-gray-600">Configure anti-money laundering and compliance controls</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Screening Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Screening Configuration
            </CardTitle>
            <CardDescription>
              Configure automatic customer screening and sanctions checking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto Screening */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="autoScreening">Automatic Screening</Label>
                <p className="text-sm text-gray-500">
                  Automatically screen customers against sanctions lists
                </p>
              </div>
              <Switch
                id="autoScreening"
                checked={formData.autoScreeningEnabled}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, autoScreeningEnabled: checked })
                }
              />
            </div>

            {/* Sanctions Lists */}
            <div className="space-y-3">
              <Label>Enabled Sanctions Lists</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {SANCTION_LISTS.map((list) => (
                  <div key={list.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={list.id}
                      checked={formData.enabledSanctionLists.includes(list.id)}
                      onCheckedChange={(checked) => 
                        handleSanctionListToggle(list.id, checked as boolean)
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor={list.id} className="font-medium">
                        {list.name}
                      </Label>
                      <p className="text-xs text-gray-500">
                        {list.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Screening Options */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="pepScreening">PEP Screening</Label>
                  <p className="text-xs text-gray-500">
                    Politically Exposed Persons
                  </p>
                </div>
                <Switch
                  id="pepScreening"
                  checked={formData.pepScreeningEnabled}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, pepScreeningEnabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="adverseMedia">Adverse Media</Label>
                  <p className="text-xs text-gray-500">
                    Negative news screening
                  </p>
                </div>
                <Switch
                  id="adverseMedia"
                  checked={formData.adverseMediaScreeningEnabled}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, adverseMediaScreeningEnabled: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Thresholds
            </CardTitle>
            <CardDescription>
              Configure risk assessment score ranges (0-100 scale)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="lowRisk">
                  <Badge className={getRiskLevelColor("low")}>Low Risk</Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="lowRisk"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.riskThresholds.low}
                    onChange={(e) => setFormData({
                      ...formData,
                      riskThresholds: {
                        ...formData.riskThresholds,
                        low: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                  <span className="text-sm text-gray-500">and below</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mediumRisk">
                  <Badge className={getRiskLevelColor("medium")}>Medium Risk</Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="mediumRisk"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.riskThresholds.medium}
                    onChange={(e) => setFormData({
                      ...formData,
                      riskThresholds: {
                        ...formData.riskThresholds,
                        medium: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                  <span className="text-sm text-gray-500">and below</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="highRisk">
                  <Badge className={getRiskLevelColor("high")}>High Risk</Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="highRisk"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.riskThresholds.high}
                    onChange={(e) => setFormData({
                      ...formData,
                      riskThresholds: {
                        ...formData.riskThresholds,
                        high: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                  <span className="text-sm text-gray-500">and above</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Transaction Limits
            </CardTitle>
            <CardDescription>
              Configure transaction amount thresholds for reporting and controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Individual Limits */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <h4 className="font-medium">Individual Customers</h4>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="indDaily">Daily Limit</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="indDaily"
                      type="number"
                      min="0"
                      value={formData.transactionLimits.individualDaily}
                      onChange={(e) => setFormData({
                        ...formData,
                        transactionLimits: {
                          ...formData.transactionLimits,
                          individualDaily: parseInt(e.target.value) || 0
                        }
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="indTransaction">Per Transaction</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="indTransaction"
                      type="number"
                      min="0"
                      value={formData.transactionLimits.individualTransaction}
                      onChange={(e) => setFormData({
                        ...formData,
                        transactionLimits: {
                          ...formData.transactionLimits,
                          individualTransaction: parseInt(e.target.value) || 0
                        }
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              {/* Corporate Limits */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <h4 className="font-medium">Corporate Customers</h4>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="corpDaily">Daily Limit</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="corpDaily"
                      type="number"
                      min="0"
                      value={formData.transactionLimits.corporateDaily}
                      onChange={(e) => setFormData({
                        ...formData,
                        transactionLimits: {
                          ...formData.transactionLimits,
                          corporateDaily: parseInt(e.target.value) || 0
                        }
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corpTransaction">Per Transaction</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="corpTransaction"
                      type="number"
                      min="0"
                      value={formData.transactionLimits.corporateTransaction}
                      onChange={(e) => setFormData({
                        ...formData,
                        transactionLimits: {
                          ...formData.transactionLimits,
                          corporateTransaction: parseInt(e.target.value) || 0
                        }
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automated Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Automated Actions
            </CardTitle>
            <CardDescription>
              Configure automatic system responses to screening results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="autoHold">Auto-hold on Match</Label>
                  <p className="text-xs text-gray-500">
                    Automatically hold transactions on screening matches
                  </p>
                </div>
                <Switch
                  id="autoHold"
                  checked={formData.autoHoldOnMatch}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, autoHoldOnMatch: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="requireReason">Require Override Reason</Label>
                  <p className="text-xs text-gray-500">
                    Require justification for overriding screening alerts
                  </p>
                </div>
                <Switch
                  id="requireReason"
                  checked={formData.requireOverrideReason}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, requireOverrideReason: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="autoReport">Auto-report Suspicious</Label>
                  <p className="text-xs text-gray-500">
                    Automatically generate suspicious activity reports
                  </p>
                </div>
                <Switch
                  id="autoReport"
                  checked={formData.autoReportSuspicious}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, autoReportSuspicious: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="twoPersonApproval">Two-Person Approval</Label>
                  <p className="text-xs text-gray-500">
                    Require dual approval for high-risk transactions
                  </p>
                </div>
                <Switch
                  id="twoPersonApproval"
                  checked={formData.requireTwoPersonApproval}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, requireTwoPersonApproval: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Retention
            </CardTitle>
            <CardDescription>
              Configure how long compliance data is retained
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-md">
              <Label htmlFor="retention">Retention Period (Days)</Label>
              <Input
                id="retention"
                type="number"
                min="1"
                value={formData.retentionPeriodDays}
                onChange={(e) => setFormData({
                  ...formData,
                  retentionPeriodDays: parseInt(e.target.value) || 1
                })}
              />
              <p className="text-xs text-gray-500">
                Recommended: 2555 days (7 years) for regulatory compliance
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Service Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Service Fees
            </CardTitle>
            <CardDescription>
              Configure default service fee structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serviceFeeType">Fee Type</Label>
                <Select
                  value={formData.serviceFeeType}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    serviceFeeType: value as "flat" | "percentage"
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_FEE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceFee">
                  {formData.serviceFeeType === "flat" ? "Fee Amount ($)" : "Fee Percentage (%)"}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {formData.serviceFeeType === "flat" ? "$" : "%"}
                  </span>
                  <Input
                    id="serviceFee"
                    type="number"
                    step={formData.serviceFeeType === "flat" ? "0.01" : "0.1"}
                    min="0"
                    value={formData.defaultServiceFee}
                    onChange={(e) => setFormData({
                      ...formData,
                      defaultServiceFee: parseFloat(e.target.value) || 0
                    })}
                    className="pl-8"
                  />
                </div>
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

function Building2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}