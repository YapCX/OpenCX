import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CurrenciesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Currencies</h1>
          <p className="text-muted-foreground">
            Manage supported currencies and exchange rates
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>USD</CardTitle>
              <CardDescription>United States Dollar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$1.00</div>
              <p className="text-xs text-muted-foreground">Base currency</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>EUR</CardTitle>
              <CardDescription>Euro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€0.92</div>
              <p className="text-xs text-muted-foreground">Updated hourly</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>GBP</CardTitle>
              <CardDescription>British Pound</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£0.79</div>
              <p className="text-xs text-muted-foreground">Updated hourly</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}