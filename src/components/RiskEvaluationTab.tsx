import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface RiskEvaluationTabProps {
  customerId: Id<"customers">;
}

interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
}

export function RiskEvaluationTab({ customerId }: RiskEvaluationTabProps) {
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [riskScore, setRiskScore] = useState(0);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [notes, setNotes] = useState("");
  const [complianceNotes, setComplianceNotes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<"clear" | "under_review" | "approved">("clear");

  const customerAMLData = useQuery(api.aml.getCustomerAMLData, { customerId });
  const updateRiskLevel = useMutation(api.aml.updateCustomerRiskLevel);
  const updateComplianceNotes = useMutation(api.aml.updateComplianceNotes);
  const markFalsePositive = useMutation(api.aml.markFalsePositive);
  const removeHoldWithOverride = useMutation(api.aml.removeHoldWithOverride);

  useEffect(() => {
    if (customerAMLData?.customer) {
      setRiskLevel(customerAMLData.customer.riskLevel || "low");
      setComplianceNotes(customerAMLData.customer.complianceNotes || "");
    }
  }, [customerAMLData]);

  const handleUpdateRiskLevel = async () => {
    if (riskFactors.length === 0) {
      toast.error("Please add at least one risk factor");
      return;
    }

    try {
      await updateRiskLevel({
        customerId,
        riskLevel,
        riskScore,
        riskFactors,
        notes,
      });
      toast.success("Risk level updated successfully");
      setNotes("");
      setRiskFactors([]);
    } catch (error) {
      toast.error("Failed to update risk level");
    }
  };

  const handleUpdateComplianceNotes = async () => {
    try {
      await updateComplianceNotes({
        customerId,
        notes: complianceNotes,
      });
      toast.success("Compliance notes updated");
    } catch (error) {
      toast.error("Failed to update compliance notes");
    }
  };

  const handleMarkFalsePositive = async (screeningHistoryId: Id<"amlScreeningHistory">, matchIndex: number) => {
    const reason = prompt("Please provide a reason for marking this as a false positive:");
    if (!reason) return;

    try {
      await markFalsePositive({
        customerId,
        screeningHistoryId,
        matchIndex,
        reason,
      });
      toast.success("Match marked as false positive");
    } catch (error) {
      toast.error("Failed to mark as false positive");
    }
  };

  const handleRemoveHold = async () => {
    if (!overrideReason.trim()) {
      toast.error("Please provide a reason for removing the hold");
      return;
    }

    try {
      await removeHoldWithOverride({
        customerId,
        overrideReason,
        newStatus: selectedNewStatus,
      });
      toast.success("Hold removed successfully");
      setShowOverrideDialog(false);
      setOverrideReason("");
    } catch (error) {
      toast.error("Failed to remove hold");
    }
  };

  const addRiskFactor = () => {
    setRiskFactors([...riskFactors, { factor: "", weight: 1, description: "" }]);
  };

  const updateRiskFactor = (index: number, field: keyof RiskFactor, value: string | number) => {
    const updated = [...riskFactors];
    updated[index] = { ...updated[index], [field]: value };
    setRiskFactors(updated);
  };

  const removeRiskFactor = (index: number) => {
    setRiskFactors(riskFactors.filter((_, i) => i !== index));
  };

  const calculateRiskScore = () => {
    const totalWeight = riskFactors.reduce((sum, factor) => sum + factor.weight, 0);
    setRiskScore(Math.min(100, totalWeight * 10));
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      clear: "bg-green-100 text-green-800",
      on_hold: "bg-red-100 text-red-800",
      under_review: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getRiskLevelColor = (level: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
    };
    return colors[level as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (!customerAMLData) {
    return <div className="p-4">Loading customer AML data...</div>;
  }

  const { customer, screeningHistory, riskAssessments, amlActions } = customerAMLData;

  return (
    <div className="space-y-6">
      {/* Customer AML Status Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">AML Status Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current AML Status
            </label>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(customer.amlStatus || "clear")}`}>
              {customer.amlStatus || "Clear"}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Risk Level
            </label>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(customer.riskLevel || "low")}`}>
              {customer.riskLevel || "Low"}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Risk Assessment
            </label>
            <span className="text-sm text-gray-600">
              {customer.lastRiskAssessment 
                ? new Date(customer.lastRiskAssessment).toLocaleDateString()
                : "Never assessed"
              }
            </span>
          </div>
        </div>

        {/* Hold Override */}
        {customer.amlStatus === "on_hold" && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-red-800">Customer On Hold</h4>
                <p className="text-sm text-red-600">This customer is currently on hold due to AML concerns.</p>
              </div>
              <button
                onClick={() => setShowOverrideDialog(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              >
                Override Hold
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sanctions Screening History */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Sanctions List Check Log</h3>
        {screeningHistory.length > 0 ? (
          <div className="space-y-4">
            {screeningHistory.map((screening) => (
              <div key={screening._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      screening.overallResult === "clear" ? "bg-green-100 text-green-800" :
                      screening.overallResult === "potential_match" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {screening.overallResult.replace("_", " ").toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      {new Date(screening.screeningDate).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {screening.screeningType}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Lists: {screening.listsChecked.join(", ")}
                  </span>
                </div>

                {screening.matchesFound.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-800">Matches Found:</h5>
                    {screening.matchesFound.map((match, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{match.sanctionEntryId}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                match.isFalsePositive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}>
                                {match.isFalsePositive ? "False Positive" : `${match.matchScore}% Match`}
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {match.matchType}
                              </span>
                            </div>
                            {match.isFalsePositive && match.falsePositiveReason && (
                              <p className="text-xs text-gray-600">
                                Reason: {match.falsePositiveReason}
                              </p>
                            )}
                          </div>
                          {!match.isFalsePositive && (
                            <button
                              onClick={() => handleMarkFalsePositive(screening._id, index)}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Mark False Positive
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {screening.notes && (
                  <div className="mt-3 p-2 bg-blue-50 rounded">
                    <p className="text-sm text-blue-800">{screening.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No sanctions screening history available.</p>
        )}
      </div>

      {/* Risk Assessment */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Risk Level
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as "low" | "medium" | "high")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Risk Score
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={riskScore}
                onChange={(e) => setRiskScore(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={calculateRiskScore}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Calculate
              </button>
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Risk Factors
            </label>
            <button
              onClick={addRiskFactor}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Add Factor
            </button>
          </div>

          <div className="space-y-3">
            {riskFactors.map((factor, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  placeholder="Risk factor"
                  value={factor.factor}
                  onChange={(e) => updateRiskFactor(index, "factor", e.target.value)}
                  className="col-span-4 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Weight"
                  value={factor.weight}
                  onChange={(e) => updateRiskFactor(index, "weight", Number(e.target.value))}
                  className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={factor.description}
                  onChange={(e) => updateRiskFactor(index, "description", e.target.value)}
                  className="col-span-5 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={() => removeRiskFactor(index)}
                  className="col-span-1 px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Assessment Notes */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Risk Analysis and Due Diligence Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Enter detailed risk analysis and due diligence notes..."
          />
        </div>

        <button
          onClick={handleUpdateRiskLevel}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          Update Risk Assessment
        </button>
      </div>

      {/* Compliance Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Compliance Notes</h3>
        <textarea
          value={complianceNotes}
          onChange={(e) => setComplianceNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Enter confidential compliance notes..."
        />
        <button
          onClick={handleUpdateComplianceNotes}
          className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
        >
          Update Compliance Notes
        </button>
      </div>

      {/* AML Actions History */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">AML Actions History</h3>
        {amlActions.length > 0 ? (
          <div className="space-y-3">
            {amlActions.map((action) => (
              <div key={action._id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{action.actionType.replace("_", " ").toUpperCase()}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(action.actionDate).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{action.reason}</p>
                {action.notes && (
                  <p className="text-xs text-gray-500 mt-1">{action.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No AML actions recorded.</p>
        )}
      </div>

      {/* Override Hold Dialog */}
      {showOverrideDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Override Customer Hold</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={selectedNewStatus}
                  onChange={(e) => setSelectedNewStatus(e.target.value as "clear" | "under_review" | "approved")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="clear">Clear</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Override Reason *
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Provide detailed justification for removing the hold..."
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRemoveHold}
                disabled={!overrideReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                Remove Hold
              </button>
              <button
                onClick={() => setShowOverrideDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
