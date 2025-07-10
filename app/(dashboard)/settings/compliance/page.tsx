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
  CheckCircle2,
  FileText,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const SANCTION_LISTS = [
  { id: "OFAC_SDN", name: "OFAC SDN", description: "US Treasury Office of Foreign Assets Control - Specially Designated Nationals" },
  { id: "OSFI", name: "OSFI", description: "Office of the Superintendent of Financial Institutions (Canada)" },
  { id: "SEMA", name: "SEMA", description: "Securities and Exchange Monitoring Authority" },
  { id: "NZ", name: "New Zealand", description: "New Zealand Sanctions List" },
  { id: "UK", name: "UK Sanctions", description: "UK Government Sanctions List" },
  { id: "UN", name: "UN Sanctions", description: "United Nations Sanctions List" },
  { id: "AUSTRAC", name: "AUSTRAC", description: "Australian Transaction Reports and Analysis Centre" },
  { id: "EU", name: "EU Sanctions", description: "European Union Sanctions List" },
];

export default function ComplianceSettingsPage() {
  // Check current user permissions
  const currentUserPermissions = useQuery(api.users.getCurrentUserPermissions);
  
  // Get current compliance settings
  const complianceSettings = useQuery(api.settings.getComplianceSettings);
  
  // Form state
  const [formData, setFormData] = useState({
    // Master switches
    performComplianceChecks: true,
    activateRuleBasedCompliance: false,
    
    // Thresholds
    requireProfileThreshold: 1000,
    lctThreshold: 10000,
    requireSinThreshold: 3000,
    requirePepThreshold: 1000,
    
    // Sanctions lists
    enabledSanctionLists: [] as string[],
    
    // Warnings
    warnIncompleteKyc: true,
    warnRepeatTransactionsDays: 7,
    autoCheckCustomerBeforeInvoice: false,
    customerProfileReviewDays: 365,
    
    // AML settings
    autoScreeningEnabled: false,
    pepScreeningEnabled: false,
    adverseMediaScreeningEnabled: false,
    autoHoldOnMatch: false,
    requireOverrideReason: true,
    autoReportSuspicious: false,
    retentionPeriodDays: 2555,
    requireTwoPersonApproval: false,
    
    // Transaction limits
    transactionLimits: {
      individualDaily: 10000,
      individualTransaction: 5000,
      corporateDaily: 50000,
      corporateTransaction: 25000,
    },
    
    // Risk thresholds
    riskThresholds: {
      low: 30,
      medium: 70,
      high: 100,
    },
  });
  const [isLoading, setIsLoading] = useState(false);

  // Mutations
  const updateComplianceSettings = useMutation(api.settings.updateComplianceSettings);

  // Initialize form data when settings load
  useEffect(() => {
    if (complianceSettings) {
      setFormData({
        performComplianceChecks: complianceSettings.performComplianceChecks as boolean,
        activateRuleBasedCompliance: complianceSettings.activateRuleBasedCompliance as boolean,
        requireProfileThreshold: complianceSettings.requireProfileThreshold as number,
        lctThreshold: complianceSettings.lctThreshold as number,
        requireSinThreshold: complianceSettings.requireSinThreshold as number,
        requirePepThreshold: complianceSettings.requirePepThreshold as number,
        enabledSanctionLists: complianceSettings.enabledSanctionLists as string[],
        warnIncompleteKyc: complianceSettings.warnIncompleteKyc as boolean,
        warnRepeatTransactionsDays: complianceSettings.warnRepeatTransactionsDays as number,
        autoCheckCustomerBeforeInvoice: complianceSettings.autoCheckCustomerBeforeInvoice as boolean,
        customerProfileReviewDays: complianceSettings.customerProfileReviewDays as number,
        autoScreeningEnabled: complianceSettings.autoScreeningEnabled as boolean,
        pepScreeningEnabled: complianceSettings.pepScreeningEnabled as boolean,
        adverseMediaScreeningEnabled: complianceSettings.adverseMediaScreeningEnabled as boolean,
        autoHoldOnMatch: complianceSettings.autoHoldOnMatch as boolean,
        requireOverrideReason: complianceSettings.requireOverrideReason as boolean,
        autoReportSuspicious: complianceSettings.autoReportSuspicious as boolean,
        retentionPeriodDays: complianceSettings.retentionPeriodDays as number,
        requireTwoPersonApproval: complianceSettings.requireTwoPersonApproval as boolean,
        transactionLimits: complianceSettings.transactionLimits as {
          individualDaily: number;
          individualTransaction: number;
          corporateDaily: number;
          corporateTransaction: number;
        },
        riskThresholds: complianceSettings.riskThresholds as {
          low: number;
          medium: number;
          high: number;
        },
      });
    }
  }, [complianceSettings]);

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
      await updateComplianceSettings(formData);
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
        {/* Master Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Master Compliance Controls
            </CardTitle>
            <CardDescription>
              Primary switches that control all compliance features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="performComplianceChecks" className="text-base font-medium">
                  Perform Compliance Checks & Validations
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Master switch for all compliance and AML features
                </p>
              </div>
              <Switch
                id="performComplianceChecks"
                checked={formData.performComplianceChecks}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, performComplianceChecks: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="activateRuleBasedCompliance" className="text-base font-medium">
                  Activate Rule Based AML Policies
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Enable automated rule-based AML screening and enforcement
                </p>
              </div>
              <Switch
                id="activateRuleBasedCompliance"
                checked={formData.activateRuleBasedCompliance}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activateRuleBasedCompliance: checked }))}
                disabled={!formData.performComplianceChecks}
              />
            </div>
          </CardContent>
        </Card>

        {/* Compliance Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Compliance Thresholds
            </CardTitle>
            <CardDescription>
              Transaction amount thresholds that trigger compliance requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requireProfileThreshold">Customer Profile Required Amount</Label>
                <Input
                  id="requireProfileThreshold"
                  type="number"
                  value={formData.requireProfileThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, requireProfileThreshold: Number(e.target.value) }))}
                  disabled={!formData.performComplianceChecks}
                />
                <p className="text-xs text-gray-500">Require customer profile when local amount exceeds this threshold</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lctThreshold">Large Cash Transaction (LCT) Threshold</Label>
                <Input
                  id="lctThreshold"
                  type="number"
                  value={formData.lctThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, lctThreshold: Number(e.target.value) }))}
                  disabled={!formData.performComplianceChecks}
                />
                <p className="text-xs text-gray-500">Threshold for large cash transaction reporting</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="requireSinThreshold">Social Security Required Amount</Label>
                <Input
                  id="requireSinThreshold"
                  type="number"
                  value={formData.requireSinThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, requireSinThreshold: Number(e.target.value) }))}
                  disabled={!formData.performComplianceChecks}
                />
                <p className="text-xs text-gray-500">Require SSN/SIN for transactions exceeding this amount</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="requirePepThreshold">Additional Documentation Threshold</Label>
                <Input
                  id="requirePepThreshold"
                  type="number"
                  value={formData.requirePepThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirePepThreshold: Number(e.target.value) }))}
                  disabled={!formData.performComplianceChecks}
                />
                <p className="text-xs text-gray-500">Require additional documentation (e.g., PEP) above this amount</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sanctions Lists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Sanctions & Watchlists
            </CardTitle>
            <CardDescription>
              Configure which sanctions lists to check customers against
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SANCTION_LISTS.map((list) => (
                <div key={list.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={list.id}
                    checked={formData.enabledSanctionLists.includes(list.id)}
                    onCheckedChange={(checked) => 
                      handleSanctionListToggle(list.id, checked as boolean)
                    }
                    disabled={!formData.performComplianceChecks || !formData.activateRuleBasedCompliance}
                  />
                  <div className="flex-1">
                    <Label htmlFor={list.id} className="text-sm font-medium">
                      {list.name}
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      {list.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {formData.enabledSanctionLists.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div className="text-sm text-green-800">
                  <strong>{formData.enabledSanctionLists.length} sanctions list(s) enabled:</strong>{" "}
                  {formData.enabledSanctionLists.join(", ")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Warnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Transaction Warnings
            </CardTitle>
            <CardDescription>
              Configure warnings that appear during transaction processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="warnIncompleteKyc" className="text-base font-medium">
                  Warn if Customer Profile is Incomplete (KYC)
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Show warning when customer profile is missing required information
                </p>
              </div>
              <Switch
                id="warnIncompleteKyc"
                checked={formData.warnIncompleteKyc}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, warnIncompleteKyc: checked }))}
                disabled={!formData.performComplianceChecks}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="warnRepeatTransactionsDays">
                Warn Repeat Transactions (Days Apart)
              </Label>
              <Input
                id="warnRepeatTransactionsDays"
                type="number"
                value={formData.warnRepeatTransactionsDays}
                onChange={(e) => setFormData(prev => ({ ...prev, warnRepeatTransactionsDays: Number(e.target.value) }))}
                disabled={!formData.performComplianceChecks}
              />
              <p className="text-xs text-gray-500">
                Warn if customer has made transactions within this many days (0 to disable)
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="autoCheckCustomerBeforeInvoice" className="text-base font-medium">
                  Automatically Check Customer Before Every Invoice
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Perform automated customer screening before creating invoices
                </p>
              </div>
              <Switch
                id="autoCheckCustomerBeforeInvoice"
                checked={formData.autoCheckCustomerBeforeInvoice}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoCheckCustomerBeforeInvoice: checked }))}
                disabled={!formData.performComplianceChecks}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customerProfileReviewDays">
                Customer Profile Review Cycle (Days)
              </Label>
              <Input
                id="customerProfileReviewDays"
                type="number"
                value={formData.customerProfileReviewDays}
                onChange={(e) => setFormData(prev => ({ ...prev, customerProfileReviewDays: Number(e.target.value) }))}
                disabled={!formData.performComplianceChecks}
              />
              <p className="text-xs text-gray-500">
                Request review of customer profile after this many days
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Advanced AML Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Advanced AML Settings
            </CardTitle>
            <CardDescription>
              Configure advanced anti-money laundering features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="autoScreeningEnabled">Auto Screening Enabled</Label>
                  <p className="text-xs text-gray-500">
                    Automatically screen customers against watchlists
                  </p>
                </div>
                <Switch
                  id="autoScreeningEnabled"
                  checked={formData.autoScreeningEnabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoScreeningEnabled: checked }))}
                  disabled={!formData.performComplianceChecks || !formData.activateRuleBasedCompliance}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="pepScreeningEnabled">PEP Screening</Label>
                  <p className="text-xs text-gray-500">
                    Screen for Politically Exposed Persons
                  </p>
                </div>
                <Switch
                  id="pepScreeningEnabled"
                  checked={formData.pepScreeningEnabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, pepScreeningEnabled: checked }))}
                  disabled={!formData.performComplianceChecks || !formData.activateRuleBasedCompliance}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="adverseMediaScreeningEnabled">Adverse Media Screening</Label>
                  <p className="text-xs text-gray-500">
                    Screen for negative media coverage
                  </p>
                </div>
                <Switch
                  id="adverseMediaScreeningEnabled"
                  checked={formData.adverseMediaScreeningEnabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, adverseMediaScreeningEnabled: checked }))}
                  disabled={!formData.performComplianceChecks || !formData.activateRuleBasedCompliance}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="autoHoldOnMatch">Auto Hold on Match</Label>
                  <p className="text-xs text-gray-500">
                    Automatically hold transactions on sanctions match
                  </p>
                </div>
                <Switch
                  id="autoHoldOnMatch"
                  checked={formData.autoHoldOnMatch}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoHoldOnMatch: checked }))}
                  disabled={!formData.performComplianceChecks || !formData.activateRuleBasedCompliance}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="requireOverrideReason">Require Override Reason</Label>
                  <p className="text-xs text-gray-500">
                    Require reason when overriding compliance checks
                  </p>
                </div>
                <Switch
                  id="requireOverrideReason"
                  checked={formData.requireOverrideReason}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireOverrideReason: checked }))}
                  disabled={!formData.performComplianceChecks}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="requireTwoPersonApproval">Two-Person Approval</Label>
                  <p className="text-xs text-gray-500">
                    Require two-person approval for high-risk transactions
                  </p>
                </div>
                <Switch
                  id="requireTwoPersonApproval"
                  checked={formData.requireTwoPersonApproval}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireTwoPersonApproval: checked }))}
                  disabled={!formData.performComplianceChecks}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="retentionPeriodDays">
                Data Retention Period (Days)
              </Label>
              <Input
                id="retentionPeriodDays"
                type="number"
                value={formData.retentionPeriodDays}
                onChange={(e) => setFormData(prev => ({ ...prev, retentionPeriodDays: Number(e.target.value) }))}
                disabled={!formData.performComplianceChecks}
              />
              <p className="text-xs text-gray-500">
                How long to retain compliance data (default: 2555 days = 7 years)
              </p>
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


        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Link href="/settings">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
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