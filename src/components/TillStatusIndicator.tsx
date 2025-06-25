import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

// shadcn/ui components
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Separator } from "./ui/separator";

// Icons
import { AlertCircle, CheckCircle, DollarSign } from "lucide-react";

export function TillStatusIndicator() {
  // All hooks must be called unconditionally at the top - NEVER wrap these in try-catch
  const currentUserTill = useQuery(api.tills.getCurrentUserTill);

  // RE-ENABLED: till balance query
  const shouldQueryBalance = currentUserTill && currentUserTill.tillId;
  const tillBalanceQuery = useQuery(
    api.tillTransactions.getTillBalance,
    shouldQueryBalance ? { tillId: currentUserTill.tillId } : "skip"
  );
  const tillBalance = Array.isArray(tillBalanceQuery) ? tillBalanceQuery : [];

  const signOutFromTill = useMutation(api.tills.signOut);

  const handleSignOut = async () => {
    if (!currentUserTill) return;

    try {
      await signOutFromTill({});
      toast.success("Successfully signed out from till");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out from till");
    }
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    try {
      // Validate inputs
      if (typeof amount !== 'number' || !currencyCode) {
        return `${currencyCode || 'N/A'} ${(amount || 0).toFixed(2)}`;
      }

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    } catch (error) {
      // Fallback for invalid currency codes
      return `${currencyCode} ${(amount || 0).toFixed(2)}`;
    }
  };

  // Safe date formatting
  const formatSignInTime = (signInTime: number | null | undefined) => {
    if (!signInTime) return "Unknown";
    try {
      const date = new Date(signInTime);
      if (isNaN(date.getTime())) return "Unknown";
      return date.toLocaleTimeString();
    } catch (error) {
      return "Unknown";
    }
  };

  // Only wrap rendering logic in try-catch, not hooks
  try {
    // Show loading state while data is being fetched
    if (currentUserTill === undefined) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              <span>Loading till status...</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!currentUserTill) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold">Not signed into any till</h3>
                <p className="text-sm text-muted-foreground">
                  You must sign into a till to process transactions. Please contact your administrator or sign into an available till to continue.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Alert variant="default">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <span className="font-medium">
                  Signed into: {currentUserTill.tillName || "Unknown"} ({currentUserTill.tillId || "Unknown"})
                </span>
                <div className="text-sm text-muted-foreground">
                  Since: {formatSignInTime(currentUserTill.signInTime)}
                </div>
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="destructive"
              size="sm"
            >
              Sign Out
            </Button>
          </div>

          {/* Balance display */}
          {tillBalance.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Current Balances:
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {tillBalance.map((account, index) => (
                    <Card key={account._id || `account-${index}`}>
                      <CardContent className="p-3 text-center">
                        <Badge variant="outline" className="text-xs mb-1">
                          {account.currencyCode}
                        </Badge>
                        <div className="text-sm font-bold">
                          {formatCurrency(account.balance, account.currencyCode)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  } catch (error) {
    console.error('Error in TillStatusIndicator rendering:', error);
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-red-600">Till Status Error</h3>
              <p className="text-sm text-muted-foreground">
                Unable to load till status. Please refresh the page or contact support.
              </p>
              {error instanceof Error && (
                <p className="text-xs text-red-500">
                  Error: {error.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
}
