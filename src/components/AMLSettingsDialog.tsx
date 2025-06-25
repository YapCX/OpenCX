import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

// shadcn/ui components
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";

interface AMLSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AMLSettingsDialog({ isOpen, onClose }: AMLSettingsDialogProps) {
  const [autoScreeningEnabled, setAutoScreeningEnabled] = useState(true);
  const [enabledSanctionLists, setEnabledSanctionLists] = useState<string[]>(["OFAC", "UN"]);
  const [riskThresholds, setRiskThresholds] = useState({
    lowRiskScore: 30,
    mediumRiskScore: 60,
    highRiskScore: 80,
  });
  const [autoHoldOnMatch, setAutoHoldOnMatch] = useState(true);
  const [requireOverrideReason, setRequireOverrideReason] = useState(true);

  const amlSettings = useQuery(api.aml.getAMLSettings);
  const updateAMLSettings = useMutation(api.aml.updateAMLSettings);

  useEffect(() => {
    if (amlSettings) {
      setAutoScreeningEnabled(amlSettings.autoScreeningEnabled);
      setEnabledSanctionLists(amlSettings.enabledSanctionLists);
      setRiskThresholds(amlSettings.riskThresholds);
      setAutoHoldOnMatch(amlSettings.autoHoldOnMatch);
      setRequireOverrideReason(amlSettings.requireOverrideReason);
    }
  }, [amlSettings]);

  const availableSanctionLists = [
    { id: "OFAC", name: "OFAC (US Treasury)", description: "Office of Foreign Assets Control" },
    { id: "UN", name: "UN Security Council", description: "United Nations Sanctions List" },
    { id: "OSFI", name: "OSFI (Canada)", description: "Office of the Superintendent of Financial Institutions" },
    { id: "EU", name: "EU Sanctions", description: "European Union Consolidated List" },
    { id: "UK", name: "UK Sanctions", description: "UK HM Treasury Sanctions List" },
  ];

  const handleSanctionListToggle = (listId: string) => {
    setEnabledSanctionLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const handleSave = async () => {
    try {
      await updateAMLSettings({
        autoScreeningEnabled,
        enabledSanctionLists,
        riskThresholds,
        autoHoldOnMatch,
        requireOverrideReason,
      });
      toast.success("AML settings updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update AML settings");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">AML & Risk Management Settings</DialogTitle>
          <DialogDescription>
            Configure automated screening, sanctions lists, and risk thresholds
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Global Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Global Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoScreening"
                  checked={autoScreeningEnabled}
                  onCheckedChange={setAutoScreeningEnabled}
                />
                <Label htmlFor="autoScreening" className="text-sm font-medium">
                  Enable automatic sanction list screening for new customers
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoHold"
                  checked={autoHoldOnMatch}
                  onCheckedChange={setAutoHoldOnMatch}
                />
                <Label htmlFor="autoHold" className="text-sm font-medium">
                  Automatically place customers on hold when sanction matches are found
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireOverride"
                  checked={requireOverrideReason}
                  onCheckedChange={setRequireOverrideReason}
                />
                <Label htmlFor="requireOverride" className="text-sm font-medium">
                  Require override reason when removing holds
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Sanction Lists */}
          <Card>
            <CardHeader>
              <CardTitle>Sanction Lists</CardTitle>
              <CardDescription>
                Select which international sanction lists to check against when screening customers.
              </CardDescription>
            </CardHeader>
            <CardContent>
            
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableSanctionLists.map((list) => (
                  <Card key={list.id} className="p-3">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={list.id}
                        checked={enabledSanctionLists.includes(list.id)}
                        onCheckedChange={() => handleSanctionListToggle(list.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor={list.id} className="text-sm font-medium cursor-pointer">
                          {list.name}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">{list.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Score Thresholds</CardTitle>
              <CardDescription>
                Configure the score thresholds for automatic risk level assignment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lowRisk">
                    Low Risk Threshold
                  </Label>
                  <Input
                    id="lowRisk"
                    type="number"
                    value={riskThresholds.lowRiskScore}
                    onChange={(e) => setRiskThresholds(prev => ({
                      ...prev,
                      lowRiskScore: parseInt(e.target.value) || 0
                    }))}
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground">Scores below this are low risk</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mediumRisk">
                    Medium Risk Threshold
                  </Label>
                  <Input
                    id="mediumRisk"
                    type="number"
                    value={riskThresholds.mediumRiskScore}
                    onChange={(e) => setRiskThresholds(prev => ({
                      ...prev,
                      mediumRiskScore: parseInt(e.target.value) || 0
                    }))}
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground">Scores below this are medium risk</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="highRisk">
                    High Risk Threshold
                  </Label>
                  <Input
                    id="highRisk"
                    type="number"
                    value={riskThresholds.highRiskScore}
                    onChange={(e) => setRiskThresholds(prev => ({
                      ...prev,
                      highRiskScore: parseInt(e.target.value) || 0
                    }))}
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground">Scores above this are high risk</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Configuration Notice */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">API Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-700">
                In a production environment, you would configure API keys and endpoints for each sanction list service. 
                Currently, the system uses simulated data for demonstration purposes.
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6" />
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            className="flex-1"
          >
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
