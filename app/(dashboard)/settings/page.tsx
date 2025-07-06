"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  DollarSign, 
  Building2, 
  Shield, 
  ChevronRight,
  Lock
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  // Check current user permissions
  const currentUserPermissions = useQuery(api.users.getCurrentUserPermissions);
  
  // Get basic settings info for overview
  const baseCurrency = useQuery(api.settings.getBaseCurrency);
  const companySettings = useQuery(api.settings.getCompanySettings);

  // Permission check - only managers can access most settings
  if (currentUserPermissions === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  const settingsCategories = [
    {
      title: "Currency Settings",
      description: "Manage base currency, default rates, and exchange settings",
      icon: DollarSign,
      href: "/settings/currency",
      accessible: currentUserPermissions?.isManager,
      preview: baseCurrency ? `Base Currency: ${baseCurrency}` : "Loading...",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Company Settings", 
      description: "Business information, contact details, and branding",
      icon: Building2,
      href: "/settings/company",
      accessible: currentUserPermissions?.isManager,
      preview: companySettings?.companyName || "Your Exchange Company",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Compliance & AML",
      description: "Anti-money laundering settings, risk thresholds, and screening",
      icon: Shield,
      href: "/settings/compliance",
      accessible: currentUserPermissions?.isManager || currentUserPermissions?.isComplianceOfficer,
      preview: "Risk management and regulatory compliance",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  const accessibleSettings = settingsCategories.filter(category => category.accessible);

  if (accessibleSettings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access system settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage system configuration and preferences</p>
      </div>

      {/* Settings Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsCategories.map((category) => {
          const Icon = category.icon;
          
          if (!category.accessible) {
            return (
              <Card key={category.title} className="opacity-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${category.bgColor}`}>
                      <Icon className={`h-5 w-5 ${category.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        <Lock className="h-3 w-3 mr-1" />
                        Restricted Access
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {category.description}
                  </CardDescription>
                  <Button disabled variant="ghost" className="w-full justify-between">
                    Access Denied
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={category.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.bgColor}`}>
                    <Icon className={`h-5 w-5 ${category.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {category.description}
                </CardDescription>
                <div className="text-sm text-gray-600 mb-4 p-2 bg-gray-50 rounded">
                  {category.preview}
                </div>
                <Link href={category.href}>
                  <Button variant="ghost" className="w-full justify-between">
                    Configure
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      {currentUserPermissions?.isManager && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common settings management tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Link href="/settings/currency">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Update Exchange Rates
                </Button>
              </Link>
              <Link href="/settings/company">
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="h-4 w-4 mr-2" />
                  Update Company Info
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Access Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Permission Notice</h4>
              <p className="text-sm text-blue-700 mt-1">
                Settings access is restricted based on your role. Contact your administrator if you need access to additional settings.
              </p>
              <div className="mt-2 text-xs text-blue-600">
                Your role: {currentUserPermissions?.isManager ? "Manager" : 
                           currentUserPermissions?.isComplianceOfficer ? "Compliance Officer" : "User"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}