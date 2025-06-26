import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { ImageProcessor } from "./ImageProcessor";
import { AMLWarningDialog } from "./AMLWarningDialog";

// shadcn/ui components
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Alert, AlertDescription } from "../ui/alert";

// Icons
import { X, Upload, Trash2 } from "lucide-react";

interface CustomerFormProps {
  editingId: Id<"customers"> | null;
  onClose: () => void;
}

interface IdDocument {
  idNumber: string;
  idType: string;
  expirationDate: string;
  issuingAuthority: string;
  imageId?: Id<"_storage">;
  originalFileName?: string;
  imageUrl?: string;
}

interface SanctionMatch {
  sanctionEntryId: string;
  matchScore: number;
  matchType: "exact" | "fuzzy" | "alias";
  listSource: string;
  primaryName: string;
  aliases?: string[];
  dateOfBirth?: string;
  placeOfBirth?: string;
  sanctionType: string;
}

type CustomerType = "individual" | "corporate";

export function CustomerForm({ editingId, onClose }: CustomerFormProps) {
  const [customerType, setCustomerType] = useState<CustomerType>("individual");
  const [activeTab, setActiveTab] = useState<"general" | "company">("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Individual customer data
  const [individualData, setIndividualData] = useState({
    fullName: "",
    dateOfBirth: "",
    fullAddress: "",
    phoneNumber: "",
    occupation: "",
    status: "active",
  });

  // Corporate customer data
  const [corporateData, setCorporateData] = useState({
    legalBusinessName: "",
    typeOfBusiness: "",
    incorporationNumber: "",
    businessAddress: "",
    businessPhone: "",
    isWholesalerOrBank: false,
    isMSB: false,
    msbRegistrationNumber: "",
    msbExpirationDate: "",
    status: "active",
  });

  // Contact person data
  const [contactPersonData, setContactPersonData] = useState({
    contactPersonName: "",
    contactPersonTitle: "",
    contactPersonEmail: "",
    contactPersonPhone: "",
  });

  const [idDocuments, setIdDocuments] = useState<IdDocument[]>([]);
  const [currentDocument, setCurrentDocument] = useState<IdDocument>({
    idNumber: "",
    idType: "",
    expirationDate: "",
    issuingAuthority: "",
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageProcessor, setShowImageProcessor] = useState(false);
  const [nextCustomerId, setNextCustomerId] = useState("");

  // AML Warning state
  const [showAMLWarning, setShowAMLWarning] = useState(false);
  const [sanctionMatches, setSanctionMatches] = useState<SanctionMatch[]>([]);
  const [pendingCustomerData, setPendingCustomerData] = useState<any>(null);

  const existingCustomer = useQuery(
    api.customers.get,
    editingId ? { id: editingId } : "skip"
  );

  const idTypes = useQuery(api.idTypes.list) || [];
  const nextId = useQuery(api.customers.getNextCustomerId);

  // Only load AML settings if needed
  const amlSettings = useQuery(
    api.aml.getAMLSettings,
    !editingId ? {} : "skip"
  ) || {};

  const createCustomer = useMutation(api.customers.create);
  const updateCustomer = useMutation(api.customers.update);
  const generateUploadUrl = useMutation(api.customers.generateUploadUrl);

  useEffect(() => {
    if (nextId) {
      setNextCustomerId(nextId);
    }
  }, [nextId]);

  useEffect(() => {
    if (existingCustomer) {
      setCustomerType(existingCustomer.customerType);

      if (existingCustomer.customerType === "individual") {
        setIndividualData({
          fullName: existingCustomer.fullName || "",
          dateOfBirth: existingCustomer.dateOfBirth || "",
          fullAddress: existingCustomer.fullAddress || "",
          phoneNumber: existingCustomer.phoneNumber || "",
          occupation: existingCustomer.occupation || "",
          status: existingCustomer.status,
        });
      } else {
        setCorporateData({
          legalBusinessName: existingCustomer.legalBusinessName || "",
          typeOfBusiness: existingCustomer.typeOfBusiness || "",
          incorporationNumber: existingCustomer.incorporationNumber || "",
          businessAddress: existingCustomer.businessAddress || "",
          businessPhone: existingCustomer.businessPhone || "",
          isWholesalerOrBank: existingCustomer.isWholesalerOrBank || false,
          isMSB: existingCustomer.isMSB || false,
          msbRegistrationNumber: existingCustomer.msbRegistrationNumber || "",
          msbExpirationDate: existingCustomer.msbExpirationDate || "",
          status: existingCustomer.status,
        });

        setContactPersonData({
          contactPersonName: existingCustomer.contactPersonName || "",
          contactPersonTitle: existingCustomer.contactPersonTitle || "",
          contactPersonEmail: existingCustomer.contactPersonEmail || "",
          contactPersonPhone: existingCustomer.contactPersonPhone || "",
        });
      }

      if (existingCustomer.idDocuments) {
        setIdDocuments(existingCustomer.idDocuments.map(doc => ({
          ...doc,
          imageUrl: (doc as any).imageUrl || undefined,
        })));
      }
    }
  }, [existingCustomer]);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setShowImageProcessor(true);
    };
    reader.readAsDataURL(file);
  };

  const handleImageProcessed = async (processedBlob: Blob, fileName: string) => {
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": processedBlob.type },
        body: processedBlob,
      });

      if (result.ok) {
        const json = await result.json();
        setCurrentDocument(prev => ({
          ...prev,
          imageId: json.storageId,
          originalFileName: fileName,
        }));
        toast.success("Image processed and uploaded successfully");
      }
    } catch (error) {
      toast.error("Failed to upload processed image");
    }

    setShowImageProcessor(false);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleAddDocument = () => {
    if (!currentDocument.idNumber || !currentDocument.idType || !currentDocument.expirationDate || !currentDocument.issuingAuthority) {
      toast.error("Please fill in all document fields");
      return;
    }

    if (!currentDocument.imageId) {
      toast.error("Please attach an ID image");
      return;
    }

    setIdDocuments(prev => [...prev, currentDocument]);
    setCurrentDocument({
      idNumber: "",
      idType: "",
      expirationDate: "",
      issuingAuthority: "",
    });

    toast.success("ID document added");
  };

  const handleRemoveDocument = (index: number) => {
    setIdDocuments(prev => prev.filter((_, i) => i !== index));
    toast.success("ID document removed");
  };

  // Simplified sanctions screening for demo
  const performSanctionsScreening = async (customerName: string) => {
    if (!(amlSettings as any)?.autoScreeningEnabled) {
      return { matches: [] };
    }

    // Quick check for test names
    const testMatches: SanctionMatch[] = [];
    const testNames = ["ACME TERROR", "John Terrorist", "BAD COMPANY"];
    const lowerName = customerName.toLowerCase();

    for (const testName of testNames) {
      if (lowerName.includes(testName.toLowerCase())) {
        testMatches.push({
          sanctionEntryId: `TEST_${testName.replace(/\s+/g, '_')}`,
          matchScore: 95,
          matchType: "fuzzy",
          listSource: "OFAC",
          primaryName: testName,
          sanctionType: "SDN",
        });
        break; // Only show first match for demo
      }
    }

    return { matches: testMatches };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validation based on customer type
      if (customerType === "individual") {
        if (!individualData.fullName || !individualData.dateOfBirth || !individualData.fullAddress || !individualData.phoneNumber || !individualData.occupation) {
          toast.error("Please fill in all required individual fields");
          return;
        }
      } else {
        if (!corporateData.legalBusinessName || !corporateData.typeOfBusiness || !corporateData.incorporationNumber || !corporateData.businessAddress || !corporateData.businessPhone) {
          toast.error("Please fill in all required corporate fields");
          return;
        }

        if (corporateData.isMSB && (!corporateData.msbRegistrationNumber || !corporateData.msbExpirationDate)) {
          toast.error("MSB Registration Number and Expiration Date are required for Money Service Businesses");
          return;
        }
      }

      const baseData = {
        customerType,
        idDocuments: idDocuments.map(doc => ({
          idNumber: doc.idNumber,
          idType: doc.idType,
          expirationDate: doc.expirationDate,
          issuingAuthority: doc.issuingAuthority,
          imageId: doc.imageId!,
          originalFileName: doc.originalFileName!,
        })),
      };

      const customerData = customerType === "individual"
        ? { ...baseData, ...individualData }
        : { ...baseData, ...corporateData, ...contactPersonData };

      // Store customer data for potential creation after AML warning
      setPendingCustomerData(customerData);

      // Perform sanctions screening for new customers (simplified)
      if (!editingId && (amlSettings as any)?.autoScreeningEnabled) {
        const customerName = customerType === "individual"
          ? individualData.fullName
          : corporateData.legalBusinessName;

        const screeningResult = await performSanctionsScreening(customerName);

        if (screeningResult.matches.length > 0) {
          setSanctionMatches(screeningResult.matches);
          setShowAMLWarning(true);
          return; // Don't proceed with creation until AML warning is acknowledged
        }
      }

      // Proceed with customer creation/update
      await saveCustomer(customerData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveCustomer = async (customerData: any) => {
    try {
      if (editingId) {
        await updateCustomer({
          id: editingId,
          ...customerData,
        });
        toast.success("Customer updated successfully");
      } else {
        await createCustomer(customerData);
        const typeLabel = customerType === "individual" ? "Customer" : "Corporate Customer";
        toast.success(`${typeLabel} created successfully with ID: ${nextCustomerId}`);
      }

      onClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save customer");
    }
  };

  const handleAMLWarningAcknowledge = async () => {
    setShowAMLWarning(false);

    if (pendingCustomerData) {
      await saveCustomer(pendingCustomerData);
      setPendingCustomerData(null);
      setSanctionMatches([]);
    }
  };

  const handleAMLWarningClose = () => {
    setShowAMLWarning(false);
    setPendingCustomerData(null);
    setSanctionMatches([]);
  };

  const handleIndividualChange = (field: string, value: string) => {
    setIndividualData(prev => ({ ...prev, [field]: value }));
  };

  const handleCorporateChange = (field: string, value: string | boolean) => {
    setCorporateData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactPersonChange = (field: string, value: string) => {
    setContactPersonData(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentChange = (field: string, value: string) => {
    setCurrentDocument(prev => ({ ...prev, [field]: value }));
  };

  const getSanctionsStatusBadge = () => {
    if (!existingCustomer?.sanctionsScreeningStatus) return null;

    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", text: "Screening Pending" },
      clear: { color: "bg-green-100 text-green-800", text: "Sanctions Clear" },
      flagged: { color: "bg-red-100 text-red-800", text: "Sanctions Flagged" },
      error: { color: "bg-gray-100 text-gray-800", text: "Screening Error" },
    };

    const config = statusConfig[existingCustomer.sanctionsScreeningStatus];

    const variant = {
      pending: "default" as const,
      clear: "default" as const,
      flagged: "destructive" as const,
      error: "secondary" as const,
    }[existingCustomer.sanctionsScreeningStatus];

    return (
      <Badge variant={variant}>
        {config.text}
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <DialogTitle className="text-2xl">
                {editingId ? "Edit Customer" : `New Customer - ${nextCustomerId}`}
              </DialogTitle>
              {getSanctionsStatusBadge()}
            </div>
          </DialogHeader>

          {/* Customer Type Selection */}
          {!editingId && (
            <Card className="mb-6">
              <CardContent className="pt-4">
                <Label className="block text-sm font-medium mb-2">
                  Customer Type
                </Label>
                <RadioGroup
                  value={customerType}
                  onValueChange={(value) => setCustomerType(value as CustomerType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="individual" id="individual" />
                    <Label htmlFor="individual">Individual Customer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="corporate" id="corporate" />
                    <Label htmlFor="corporate">Corporate Customer</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Customer Information */}
            <div className="lg:col-span-2">
              {customerType === "corporate" && (
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "general" | "company")} className="mb-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="general">General Info</TabsTrigger>
                    <TabsTrigger value="company">Company Info</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Individual Customer Fields */}
                {customerType === "individual" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Individual Customer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">
                          Full Name *
                        </Label>
                        <Input
                          id="fullName"
                          type="text"
                          value={individualData.fullName}
                          onChange={(e) => handleIndividualChange("fullName", e.target.value)}
                          placeholder="John Doe"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">
                          Date of Birth *
                        </Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={individualData.dateOfBirth}
                          onChange={(e) => handleIndividualChange("dateOfBirth", e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fullAddress">
                          Full Address *
                        </Label>
                        <Textarea
                          id="fullAddress"
                          value={individualData.fullAddress}
                          onChange={(e) => handleIndividualChange("fullAddress", e.target.value)}
                          placeholder="123 Main St, City, State, ZIP"
                          rows={3}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">
                          Phone Number *
                        </Label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={individualData.phoneNumber}
                          onChange={(e) => handleIndividualChange("phoneNumber", e.target.value)}
                          placeholder="(555) 123-4567"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="occupation">
                          Occupation *
                        </Label>
                        <Input
                          id="occupation"
                          type="text"
                          value={individualData.occupation}
                          onChange={(e) => handleIndividualChange("occupation", e.target.value)}
                          placeholder="Software Engineer"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">
                          Status
                        </Label>
                        <Select value={individualData.status} onValueChange={(value) => handleIndividualChange("status", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Corporate Customer Fields */}
                {customerType === "corporate" && (
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "general" | "company")}>
                    <TabsContent value="general">
                      <Card>
                        <CardHeader>
                          <CardTitle>Corporate Customer Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                          <div className="space-y-2">
                            <Label htmlFor="legalBusinessName">
                              Legal Business Name *
                            </Label>
                            <Input
                              id="legalBusinessName"
                              type="text"
                              value={corporateData.legalBusinessName}
                              onChange={(e) => handleCorporateChange("legalBusinessName", e.target.value)}
                              placeholder="ACME Corporation Inc."
                              required
                            />
                          </div>

                        <div className="space-y-2">
                          <Label htmlFor="typeOfBusiness">Type of Business *</Label>
                          <Input
                            id="typeOfBusiness"
                            value={corporateData.typeOfBusiness}
                            onChange={(e) => handleCorporateChange("typeOfBusiness", e.target.value)}
                            placeholder="Technology Services"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="incorporationNumber">Incorporation/Business Registration Number *</Label>
                          <Input
                            id="incorporationNumber"
                            value={corporateData.incorporationNumber}
                            onChange={(e) => handleCorporateChange("incorporationNumber", e.target.value)}
                            placeholder="123456789"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="businessAddress">Business Address *</Label>
                          <Textarea
                            id="businessAddress"
                            value={corporateData.businessAddress}
                            onChange={(e) => handleCorporateChange("businessAddress", e.target.value)}
                            placeholder="123 Business Ave, City, State, ZIP"
                            rows={3}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="businessPhone">Business Phone *</Label>
                          <Input
                            id="businessPhone"
                            type="tel"
                            value={corporateData.businessPhone}
                            onChange={(e) => handleCorporateChange("businessPhone", e.target.value)}
                            placeholder="(555) 123-4567"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select value={corporateData.status} onValueChange={(value) => handleCorporateChange("status", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                    <TabsContent value="company">
                      <Card>
                        <CardHeader>
                          <CardTitle>Company Classification & Contact</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Corporate Classification */}
                          <Alert className="mb-6">
                            <AlertDescription>
                              <h4 className="font-medium mb-3">Compliance Classification</h4>

                              <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="isWholesalerOrBank"
                                    checked={corporateData.isWholesalerOrBank}
                                    onCheckedChange={(checked) => handleCorporateChange("isWholesalerOrBank", !!checked)}
                                  />
                                  <Label htmlFor="isWholesalerOrBank" className="text-sm font-medium">
                                    Wholesaler or Bank
                                  </Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="isMSB"
                                    checked={corporateData.isMSB}
                                    onCheckedChange={(checked) => handleCorporateChange("isMSB", !!checked)}
                                  />
                                  <Label htmlFor="isMSB" className="text-sm font-medium">
                                    Money Service Business (MSB)
                                  </Label>
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>

                          {/* MSB Fields */}
                          {corporateData.isMSB && (
                            <Alert variant="destructive" className="mb-6">
                              <AlertDescription>
                                <h4 className="font-medium mb-3">MSB Registration Details</h4>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label htmlFor="msbRegistrationNumber">MSB Registration Number *</Label>
                                    <Input
                                      id="msbRegistrationNumber"
                                      value={corporateData.msbRegistrationNumber}
                                      onChange={(e) => handleCorporateChange("msbRegistrationNumber", e.target.value)}
                                      placeholder="MSB123456"
                                      required={corporateData.isMSB}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="msbExpirationDate">MSB Expiration Date *</Label>
                                    <Input
                                      id="msbExpirationDate"
                                      type="date"
                                      value={corporateData.msbExpirationDate}
                                      onChange={(e) => handleCorporateChange("msbExpirationDate", e.target.value)}
                                      required={corporateData.isMSB}
                                    />
                                  </div>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Contact Person */}
                          <Alert>
                            <AlertDescription>
                              <h4 className="font-medium mb-3">Contact Person (Optional)</h4>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label htmlFor="contactPersonName">Contact Name</Label>
                                  <Input
                                    id="contactPersonName"
                                    value={contactPersonData.contactPersonName}
                                    onChange={(e) => handleContactPersonChange("contactPersonName", e.target.value)}
                                    placeholder="John Smith"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="contactPersonTitle">Title</Label>
                                  <Input
                                    id="contactPersonTitle"
                                    value={contactPersonData.contactPersonTitle}
                                    onChange={(e) => handleContactPersonChange("contactPersonTitle", e.target.value)}
                                    placeholder="CEO"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="contactPersonEmail">Email</Label>
                                  <Input
                                    id="contactPersonEmail"
                                    type="email"
                                    value={contactPersonData.contactPersonEmail}
                                    onChange={(e) => handleContactPersonChange("contactPersonEmail", e.target.value)}
                                    placeholder="john@company.com"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="contactPersonPhone">Phone</Label>
                                  <Input
                                    id="contactPersonPhone"
                                    type="tel"
                                    value={contactPersonData.contactPersonPhone}
                                    onChange={(e) => handleContactPersonChange("contactPersonPhone", e.target.value)}
                                    placeholder="(555) 123-4567"
                                  />
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting
                      ? "Processing..."
                      : editingId
                        ? "Update Customer"
                        : "Create Customer"
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
            </div>

            {/* Right Column - ID Documents */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">ID Documents</h3>

              {/* Current ID Documents */}
              {idDocuments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-2">Attached Documents</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {idDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{doc.idType}</div>
                          <div className="text-xs text-gray-600">{doc.idNumber}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Document */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <h4 className="text-md font-medium text-gray-700">Add ID Document</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="idType">
                      ID Type
                    </Label>
                    <Select value={currentDocument.idType} onValueChange={(value) => handleDocumentChange("idType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {idTypes.map((type) => (
                          <SelectItem key={type._id} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="idNumber">
                      ID Number
                    </Label>
                    <Input
                      type="text"
                      value={currentDocument.idNumber}
                      onChange={(e) => handleDocumentChange("idNumber", e.target.value)}
                      placeholder="123456789"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="expirationDate">
                      Expiration Date
                    </Label>
                    <Input
                      type="date"
                      value={currentDocument.expirationDate}
                      onChange={(e) => handleDocumentChange("expirationDate", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="issuingAuthority">
                      Issuing Authority
                    </Label>
                    <Input
                      type="text"
                      value={currentDocument.issuingAuthority}
                      onChange={(e) => handleDocumentChange("issuingAuthority", e.target.value)}
                      placeholder="State of California"
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <Label htmlFor="image-upload">
                    ID Image
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {currentDocument.imageId ? (
                      <div className="text-center">
                        <div className="text-green-600 mb-2">✓ Image uploaded and processed</div>
                        <div className="text-xs text-gray-500">{currentDocument.originalFileName}</div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageSelect(file);
                          }}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer text-blue-600 hover:text-blue-800"
                        >
                          Click to select ID image
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          JPG, PNG, GIF up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddDocument}
                  disabled={!currentDocument.idNumber || !currentDocument.idType || !currentDocument.imageId}
                  className="w-full"
                >
                  Add Document
                </Button>
              </div>
            </div>
          </div>

          {/* Image Processor Modal */}
          {showImageProcessor && imagePreview && (
            <ImageProcessor
              imageUrl={imagePreview}
              originalFile={selectedImage!}
              onProcessed={handleImageProcessed}
              onCancel={() => {
                setShowImageProcessor(false);
                setSelectedImage(null);
                setImagePreview(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* AML Warning Dialog */}
      <AMLWarningDialog
        isOpen={showAMLWarning}
        matches={sanctionMatches}
        customerName={customerType === "individual" ? individualData.fullName : corporateData.legalBusinessName}
        onAcknowledge={handleAMLWarningAcknowledge}
        onClose={handleAMLWarningClose}
      />
    </>
  );
}
