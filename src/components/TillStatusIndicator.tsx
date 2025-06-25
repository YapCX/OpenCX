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
  const currentUserTill = useQuery(api.tills.getCurrentUserTill);
  const tillBalance = useQuery(
    api.transactions.getTillBalance,
    currentUserTill ? { tillId: currentUserTill.tillId } : "skip"
  ) || [];

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

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
                Signed into: {currentUserTill.tillName} ({currentUserTill.tillId})
              </span>
              <div className="text-sm text-muted-foreground">
                Since: {new Date(currentUserTill.signInTime!).toLocaleTimeString()}
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

        {tillBalance.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Current Balances:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {tillBalance.map((account) => (
                  <Card key={account._id}>
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
}
