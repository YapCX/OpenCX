import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

// shadcn/ui components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "./ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";

// Icons
import { AlertTriangle, Shield, User, FileText } from "lucide-react";

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

interface AMLWarningDialogProps {
  isOpen: boolean;
  matches: SanctionMatch[];
  customerName: string;
  customerId?: Id<"customers">;
  onAcknowledge: () => void;
  onClose: () => void;
}

export function AMLWarningDialog({
  isOpen,
  matches,
  customerName,
  customerId,
  onAcknowledge,
  onClose
}: AMLWarningDialogProps) {
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen || matches.length === 0) return null;

  const currentMatch = matches[currentMatchIndex];
  const isLastMatch = currentMatchIndex === matches.length - 1;

  const handleNext = () => {
    if (isLastMatch) {
      setAcknowledged(true);
      onAcknowledge();
    } else {
      setCurrentMatchIndex(prev => prev + 1);
    }
  };

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case "exact": return <Badge variant="destructive">Exact Match</Badge>;
      case "fuzzy": return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Similar Name</Badge>;
      case "alias": return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Alias Match</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-destructive text-destructive-foreground p-6 -m-6 mb-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">AML WARNING</DialogTitle>
              <p className="text-destructive-foreground/90">Potential Sanctions List Match Detected</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Match {currentMatchIndex + 1} of {matches.length}</span>
              <Badge variant="outline" className="text-xs">
                {Math.round(((currentMatchIndex + 1) / matches.length) * 100)}% Complete
              </Badge>
            </div>
            <div className="flex gap-1">
              {matches.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full ${
                    index <= currentMatchIndex ? "bg-destructive" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Being Screened
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{customerName}</p>
              {customerId && (
                <p className="text-sm text-muted-foreground">Customer ID: {customerId}</p>
              )}
            </CardContent>
          </Card>

          {/* Match Details */}
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Shield className="h-5 w-5" />
                  Sanctions List Match
                </CardTitle>
                <div className="flex gap-2">
                  {getMatchTypeBadge(currentMatch.matchType)}
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {currentMatch.matchScore}% Match
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sanctions List</Label>
                  <Card className="p-3">
                    <p className="text-sm font-mono">{currentMatch.listSource}</p>
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label>Sanction Type</Label>
                  <Card className="p-3">
                    <p className="text-sm">{currentMatch.sanctionType}</p>
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label>Primary Name</Label>
                  <Card className="p-3">
                    <p className="text-sm font-semibold">{currentMatch.primaryName}</p>
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label>Entry ID</Label>
                  <Card className="p-3">
                    <p className="text-sm font-mono">{currentMatch.sanctionEntryId}</p>
                  </Card>
                </div>

                {currentMatch.dateOfBirth && (
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Card className="p-3">
                      <p className="text-sm">{currentMatch.dateOfBirth}</p>
                    </Card>
                  </div>
                )}

                {currentMatch.placeOfBirth && (
                  <div className="space-y-2">
                    <Label>Place of Birth</Label>
                    <Card className="p-3">
                      <p className="text-sm">{currentMatch.placeOfBirth}</p>
                    </Card>
                  </div>
                )}

                {currentMatch.aliases && currentMatch.aliases.length > 0 && (
                  <div className="md:col-span-2 space-y-2">
                    <Label>Known Aliases</Label>
                    <Card className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {currentMatch.aliases.map((alias, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {alias}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warning Message */}
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2">Important Notice</h4>
                <p className="text-sm text-yellow-700">
                  This customer has been automatically flagged due to a potential match with international sanctions lists.
                  The customer record will be placed on hold and marked as suspicious pending further review.
                  Please conduct enhanced due diligence before proceeding with any transactions.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isLastMatch ? "Final warning - customer will be placed on hold" : "More matches to review"}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleNext}
            >
              {isLastMatch ? "Acknowledge & Place on Hold" : "Next Match"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
