"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  DollarSign,
  Shield,
  FileText,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  MapPin,
  Phone,
} from "lucide-react";
import { LogoUpload } from "@/components/ui/logo-upload";
import { LogoDisplay } from "@/components/ui/logo-display";
import defaults from "@/config/defaults.json";
import { Id } from "@/convex/_generated/dataModel";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface CompanyData {
  companyName: string;
  businessNumber: string;
  licenseNumber: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  businessType: string;
  establishedDate: string;
  regulatoryBody: string;
  complianceOfficer: string;
  logoImageId?: Id<"_storage">;
  branchId?: string;
}

interface CurrencySelection {
  code: string;
  selected: boolean;
  priority: number;
}

interface AMLData {
  autoScreeningEnabled: boolean;
  enabledSanctionLists: string[];
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  transactionLimits: {
    individualDaily: number;
    individualTransaction: number;
    corporateDaily: number;
    corporateTransaction: number;
  };
  autoHoldOnMatch: boolean;
  requireOverrideReason: boolean;
  autoReportSuspicious: boolean;
  pepScreeningEnabled: boolean;
  adverseMediaScreeningEnabled: boolean;
  retentionPeriodDays: number;
  requireTwoPersonApproval: boolean;
}

interface IDTypeSelection {
  name: string;
  description: string;
  requiresExpiry: boolean;
  country: string | null;
  selected: boolean;
}

interface InitializationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const steps: WizardStep[] = [
  {
    id: "company",
    title: "Company Information",
    description: "Set up your business details and contact information",
    icon: Building2,
  },
  {
    id: "currencies",
    title: "Currencies",
    description: "Select which currencies you want to trade",
    icon: DollarSign,
  },
  {
    id: "aml",
    title: "Compliance",
    description: "Configure anti-money laundering settings",
    icon: Shield,
  },
  {
    id: "idtypes",
    title: "ID Types",
    description: "Choose accepted identification types",
    icon: FileText,
  },
  {
    id: "review",
    title: "Review & Confirm",
    description: "Review your settings before initialization",
    icon: CheckCircle,
  },
];

export function InitializationWizard({ isOpen, onClose, onComplete }: InitializationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data states
  const [companyData, setCompanyData] = useState<CompanyData>({
    ...defaults.companySettings,
    businessNumber: "",
    licenseNumber: "",
    address: "",
    postalCode: "",
    phone: "",
    email: "",
    website: "",
    establishedDate: "",
    complianceOfficer: "",
  });

  const [selectedCurrencies, setSelectedCurrencies] = useState<CurrencySelection[]>(
    defaults.currencies.slice(0, 10).map((currency, index) => ({
      code: currency.code,
      selected: index < 5, // Pre-select first 5 currencies
      priority: index + 1,
    }))
  );

  const [complianceData, setComplianceData] = useState<AMLData>({
    ...defaults.complianceSettings,
  });

  const [selectedIDTypes, setSelectedIDTypes] = useState<IDTypeSelection[]>(
    defaults.idTypes.map((idType) => ({
      ...idType,
      country: idType.country || null, // Handle missing country field
      selected: true, // Pre-select all ID types
    }))
  );

  // Mutation hooks
  const updateCompanySettings = useMutation(api.settings.updateCompanySettings);
  const updateComplianceSettings = useMutation(api.settings.updateComplianceSettings);
  const createCurrency = useMutation(api.currencies.create);
  const createIDType = useMutation(api.idTypes.create);
  const setSetting = useMutation(api.settings.setSetting);
  const markSystemInitialized = useMutation(api.settings.markSystemInitialized);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 1. Initialize basic system settings
      await setSetting({
        key: "base_currency",
        value: defaults.settings.base_currency,
        description: "Base currency for exchange rate calculations",
        category: "currency"
      });

      await setSetting({
        key: "default_discount_percent",
        value: defaults.settings.default_discount_percent,
        description: "Default discount percentage for buying currency",
        category: "currency"
      });

      await setSetting({
        key: "default_markup_percent",
        value: defaults.settings.default_markup_percent,
        description: "Default markup percentage for selling currency",
        category: "currency"
      });

      await setSetting({
        key: "default_service_fee",
        value: defaults.settings.default_service_fee,
        description: "Default service fee percentage for transactions",
        category: "currency"
      });

      // 2. Create selected ID types
      for (const idType of selectedIDTypes.filter(id => id.selected)) {
        try {
          await createIDType({
            name: idType.name,
            description: idType.description,
            requiresExpiry: idType.requiresExpiry,
            country: idType.country || undefined,
          });
        } catch (error) {
          // ID type might already exist, continue with others
          console.warn(`Failed to create ID type ${idType.name}:`, error);
        }
      }

      // 3. Update company settings
      await updateCompanySettings(companyData);

      // 4. Update compliance settings
      await updateComplianceSettings(complianceData);

      // 5. Create selected currencies
      const currenciesToCreate = selectedCurrencies
        .filter(c => c.selected)
        .sort((a, b) => a.priority - b.priority);

      for (const currencySelection of currenciesToCreate) {
        const currencyData = defaults.currencies.find(c => c.code === currencySelection.code);
        if (currencyData) {
          try {
            await createCurrency({
              code: currencyData.code,
              name: currencyData.name,
              symbol: currencyData.symbol,
              country: currencyData.country,
              flag: currencyData.flag,
              marketRate: 1.0,
              buyRate: 1.0,
              sellRate: 1.0,
              manualBuyRate: false,
              manualSellRate: false,
            });
          } catch (error) {
            // Currency might already exist, continue with others
            console.warn(`Failed to create currency ${currencyData.code}:`, error);
          }
        }
      }

      // 6. Mark system as fully initialized
      await markSystemInitialized({});

      onComplete();
      onClose();
    } catch (error) {
      console.error("Initialization failed:", error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case "company":
        return <CompanyStep data={companyData} onChange={setCompanyData} />;
      case "currencies":
        return <CurrenciesStep data={selectedCurrencies} onChange={setSelectedCurrencies} />;
      case "aml":
        return <AMLStep data={complianceData} onChange={setComplianceData} />;
      case "idtypes":
        return <IDTypesStep data={selectedIDTypes} onChange={setSelectedIDTypes} />;
      case "review":
        return (
          <ReviewStep
            companyData={companyData}
            selectedCurrencies={selectedCurrencies}
            complianceData={complianceData}
            selectedIDTypes={selectedIDTypes}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <currentStepData.icon className="h-5 w-5" />
            System Initialization Wizard
          </DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {steps.length}: {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-2 ${
                      isCompleted ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <currentStepData.icon className="h-5 w-5" />
                {currentStepData.title}
              </CardTitle>
              <CardDescription>{currentStepData.description}</CardDescription>
            </CardHeader>
            <CardContent>{renderStepContent()}</CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep || isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Initialize System
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step Components
function CompanyStep({ data, onChange }: { data: CompanyData; onChange: (data: CompanyData) => void }) {
  const updateField = (field: keyof CompanyData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleLogoChange = (logoId: Id<"_storage"> | undefined) => {
    onChange({ ...data, logoImageId: logoId });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            value={data.companyName}
            onChange={(e) => updateField("companyName", e.target.value)}
            placeholder="Your Exchange Company"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessType">Business Type</Label>
          <Select value={data.businessType} onValueChange={(value) => updateField("businessType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Money Services Business">Money Services Business</SelectItem>
              <SelectItem value="Currency Exchange">Currency Exchange</SelectItem>
              <SelectItem value="Financial Services">Financial Services</SelectItem>
              <SelectItem value="Remittance Service">Remittance Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="branchId">Branch ID (Optional)</Label>
          <Input
            id="branchId"
            value={data.branchId || ""}
            onChange={(e) => updateField("branchId", e.target.value)}
            placeholder="e.g., MTL-001, TOR-MAIN"
          />
          <p className="text-xs text-gray-500">
            For multi-branch operations, specify a unique branch identifier
          </p>
        </div>
        <div className="space-y-2">
          <LogoUpload
            currentLogoId={data.logoImageId}
            onLogoChange={handleLogoChange}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="businessNumber">Business Number</Label>
          <Input
            id="businessNumber"
            value={data.businessNumber}
            onChange={(e) => updateField("businessNumber", e.target.value)}
            placeholder="123456789RC0001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="licenseNumber">License Number</Label>
          <Input
            id="licenseNumber"
            value={data.licenseNumber}
            onChange={(e) => updateField("licenseNumber", e.target.value)}
            placeholder="MSB License Number"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <Label className="text-base font-medium">Business Address</Label>
        </div>
        <div className="space-y-2">
          <Input
            value={data.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="Street address"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            value={data.city}
            onChange={(e) => updateField("city", e.target.value)}
            placeholder="City"
          />
          <Input
            value={data.province}
            onChange={(e) => updateField("province", e.target.value)}
            placeholder="Province"
          />
          <Input
            value={data.postalCode}
            onChange={(e) => updateField("postalCode", e.target.value)}
            placeholder="Postal Code"
          />
        </div>
        <Input
          value={data.country}
          onChange={(e) => updateField("country", e.target.value)}
          placeholder="Country"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-500" />
          <Label className="text-base font-medium">Contact Information</Label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            value={data.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="Phone number"
          />
          <Input
            value={data.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="Email address"
            type="email"
          />
        </div>
        <Input
          value={data.website}
          onChange={(e) => updateField("website", e.target.value)}
          placeholder="Website URL"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="regulatoryBody">Regulatory Body</Label>
          <Input
            id="regulatoryBody"
            value={data.regulatoryBody}
            onChange={(e) => updateField("regulatoryBody", e.target.value)}
            placeholder="FINTRAC"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="complianceOfficer">Compliance Officer</Label>
          <Input
            id="complianceOfficer"
            value={data.complianceOfficer}
            onChange={(e) => updateField("complianceOfficer", e.target.value)}
            placeholder="Name of compliance officer"
          />
        </div>
      </div>
    </div>
  );
}

function CurrenciesStep({ data, onChange }: { data: CurrencySelection[]; onChange: (data: CurrencySelection[]) => void }) {
  const toggleCurrency = (code: string) => {
    onChange(
      data.map((currency) =>
        currency.code === code
          ? { ...currency, selected: !currency.selected }
          : currency
      )
    );
  };

  const selectedCount = data.filter(c => c.selected).length;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Currency Selection</h4>
        <p className="text-sm text-blue-700 mb-3">
          Select the currencies you want to offer for exchange. You can add more currencies later.
        </p>
        <Badge variant="secondary">
          {selectedCount} currencies selected
        </Badge>
      </div>

      <div className="grid gap-3">
        {data.map((currency) => {
          const currencyInfo = defaults.currencies.find(c => c.code === currency.code);
          if (!currencyInfo) return null;

          return (
            <div
              key={currency.code}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                currency.selected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => toggleCurrency(currency.code)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={currency.selected}
                    onChange={() => toggleCurrency(currency.code)}
                  />
                  <div className="text-2xl">{currencyInfo.flag}</div>
                  <div>
                    <div className="font-medium">{currencyInfo.code}</div>
                    <div className="text-sm text-gray-600">{currencyInfo.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{currencyInfo.symbol}</div>
                  <div className="text-sm text-gray-600">{currencyInfo.country}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AMLStep({ data, onChange }: { data: AMLData; onChange: (data: AMLData) => void }) {
  const updateField = <K extends keyof AMLData>(field: K, value: AMLData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const updateTransactionLimit = (field: keyof AMLData['transactionLimits'], value: number) => {
    onChange({
      ...data,
      transactionLimits: {
        ...data.transactionLimits,
        [field]: value,
      },
    });
  };

  const updateRiskThreshold = (field: keyof AMLData['riskThresholds'], value: number) => {
    onChange({
      ...data,
      riskThresholds: {
        ...data.riskThresholds,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-red-50 p-4 rounded-lg">
        <h4 className="font-medium text-red-900 mb-2">Compliance Settings</h4>
        <p className="text-sm text-red-700">
          These settings help ensure compliance with anti-money laundering regulations.
          The defaults are set for Canadian MSB requirements.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Auto Screening</Label>
            <p className="text-sm text-gray-600">Automatically screen customers against sanction lists</p>
          </div>
          <Checkbox
            checked={data.autoScreeningEnabled}
            onCheckedChange={(checked) => updateField("autoScreeningEnabled", !!checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Auto Hold on Match</Label>
            <p className="text-sm text-gray-600">Automatically hold transactions when sanctions match found</p>
          </div>
          <Checkbox
            checked={data.autoHoldOnMatch}
            onCheckedChange={(checked) => updateField("autoHoldOnMatch", !!checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Require Two-Person Approval</Label>
            <p className="text-sm text-gray-600">Require two-person approval for high-risk transactions</p>
          </div>
          <Checkbox
            checked={data.requireTwoPersonApproval}
            onCheckedChange={(checked) => updateField("requireTwoPersonApproval", !!checked)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-base font-medium">Transaction Limits (CAD)</Label>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="individualTransaction">Individual Transaction Limit</Label>
            <Input
              id="individualTransaction"
              type="number"
              value={data.transactionLimits.individualTransaction}
              onChange={(e) => updateTransactionLimit("individualTransaction", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="individualDaily">Individual Daily Limit</Label>
            <Input
              id="individualDaily"
              type="number"
              value={data.transactionLimits.individualDaily}
              onChange={(e) => updateTransactionLimit("individualDaily", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="corporateTransaction">Corporate Transaction Limit</Label>
            <Input
              id="corporateTransaction"
              type="number"
              value={data.transactionLimits.corporateTransaction}
              onChange={(e) => updateTransactionLimit("corporateTransaction", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="corporateDaily">Corporate Daily Limit</Label>
            <Input
              id="corporateDaily"
              type="number"
              value={data.transactionLimits.corporateDaily}
              onChange={(e) => updateTransactionLimit("corporateDaily", Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-base font-medium">Risk Score Thresholds</Label>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="lowRisk">Low Risk Threshold</Label>
            <Input
              id="lowRisk"
              type="number"
              value={data.riskThresholds.low}
              onChange={(e) => updateRiskThreshold("low", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mediumRisk">Medium Risk Threshold</Label>
            <Input
              id="mediumRisk"
              type="number"
              value={data.riskThresholds.medium}
              onChange={(e) => updateRiskThreshold("medium", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="highRisk">High Risk Threshold</Label>
            <Input
              id="highRisk"
              type="number"
              value={data.riskThresholds.high}
              onChange={(e) => updateRiskThreshold("high", Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function IDTypesStep({ data, onChange }: { data: IDTypeSelection[]; onChange: (data: IDTypeSelection[]) => void }) {
  const toggleIDType = (name: string) => {
    onChange(
      data.map((idType) =>
        idType.name === name
          ? { ...idType, selected: !idType.selected }
          : idType
      )
    );
  };

  const selectedCount = data.filter(id => id.selected).length;

  return (
    <div className="space-y-6">
      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">Accepted ID Types</h4>
        <p className="text-sm text-green-700 mb-3">
          Select which types of identification you will accept from customers.
          These are pre-configured for Canadian/Quebec regulations.
        </p>
        <Badge variant="secondary">
          {selectedCount} ID types selected
        </Badge>
      </div>

      <div className="grid gap-3">
        {data.map((idType) => (
          <div
            key={idType.name}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              idType.selected
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => toggleIDType(idType.name)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={idType.selected}
                  onChange={() => toggleIDType(idType.name)}
                />
                <div>
                  <div className="font-medium">{idType.name}</div>
                  <div className="text-sm text-gray-600">{idType.description}</div>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className={`px-2 py-1 rounded text-xs ${
                  idType.requiresExpiry
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {idType.requiresExpiry ? "Expires" : "No Expiry"}
                </div>
                {idType.country && (
                  <div className="text-gray-500 mt-1">{idType.country}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewStep({
  companyData,
  selectedCurrencies,
  complianceData,
  selectedIDTypes
}: {
  companyData: CompanyData;
  selectedCurrencies: CurrencySelection[];
  complianceData: AMLData;
  selectedIDTypes: IDTypeSelection[];
}) {
  const selectedCurrencyCodes = selectedCurrencies.filter(c => c.selected);
  const selectedIDTypeNames = selectedIDTypes.filter(id => id.selected);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Review Your Configuration</h4>
        <p className="text-sm text-blue-700">
          Please review your settings before initializing the system. You can modify these later in the settings.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {companyData.logoImageId && (
              <div className="flex items-center gap-2">
                <strong>Logo:</strong>
                <LogoDisplay 
                  logoImageId={companyData.logoImageId} 
                  companyName={companyData.companyName}
                  size="sm"
                />
              </div>
            )}
            <div><strong>Name:</strong> {companyData.companyName}</div>
            <div><strong>Type:</strong> {companyData.businessType}</div>
            <div><strong>Location:</strong> {companyData.city}, {companyData.province}</div>
            {companyData.branchId && (
              <div><strong>Branch ID:</strong> {companyData.branchId}</div>
            )}
            <div><strong>Regulatory Body:</strong> {companyData.regulatoryBody}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Currencies ({selectedCurrencyCodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedCurrencyCodes.map((currency) => {
                const currencyInfo = defaults.currencies.find(c => c.code === currency.code);
                return (
                  <Badge key={currency.code} variant="secondary">
                    {currencyInfo?.flag} {currency.code}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              AML Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Auto Screening:</strong> {complianceData.autoScreeningEnabled ? "Enabled" : "Disabled"}</div>
            <div><strong>Individual Limit:</strong> ${complianceData.transactionLimits.individualTransaction}</div>
            <div><strong>Corporate Limit:</strong> ${complianceData.transactionLimits.corporateTransaction}</div>
            <div><strong>Two-Person Approval:</strong> {complianceData.requireTwoPersonApproval ? "Required" : "Not Required"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              ID Types ({selectedIDTypeNames.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {selectedIDTypeNames.slice(0, 5).map((idType) => (
                <div key={idType.name} className="text-sm">
                  {idType.name}
                </div>
              ))}
              {selectedIDTypeNames.length > 5 && (
                <div className="text-sm text-gray-500">
                  +{selectedIDTypeNames.length - 5} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}