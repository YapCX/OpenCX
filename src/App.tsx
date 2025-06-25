import { useState } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "./SignInForm";
import { UserDropdown } from "./UserDropdown";
import { CurrencyModule } from "./components/CurrencyModule";
import { DenominationsModule } from "./components/DenominationsModule";
import { CustomersModule } from "./components/CustomersModule";
import { UserModule } from "./components/UserModule";
import { TillModule } from "./components/TillModule";
import { TillTransactionsModule } from "./components/TillTransactionsModule";
import { OrderModule } from "./components/OrderModule";
import { SettingsModule } from "./components/SettingsModule";

// shadcn/ui components
import { ThemeProvider } from "./components/theme-provider";
import { ModeToggle } from "./components/mode-toggle";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";

// Lucide icons
import {
  CreditCard,
  Coins,
  Users,
  ShieldCheck,
  Store,
  Receipt,
  BarChart3,
  Settings,
  Building2
} from "lucide-react";

type ActiveModule = "currencies" | "denominations" | "customers" | "users" | "tills" | "transactions" | "orders" | "settings";

const navigationItems = [
  {
    id: "orders" as const,
    label: "Orders",
    icon: CreditCard,
  },
  {
    id: "currencies" as const,
    label: "Currencies",
    icon: Coins,
  },
  {
    id: "denominations" as const,
    label: "Denominations",
    icon: BarChart3,
  },
  {
    id: "customers" as const,
    label: "Customers",
    icon: Users,
  },
  {
    id: "tills" as const,
    label: "Tills",
    icon: Store,
  },
  {
    id: "transactions" as const,
    label: "Till Transactions",
    icon: Receipt,
  },
  {
    id: "users" as const,
    label: "Users",
    icon: ShieldCheck,
  },
  {
    id: "settings" as const,
    label: "Settings",
    icon: Settings,
  }
];

function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>("orders");

  const renderActiveModule = () => {
    switch (activeModule) {
      case "currencies":
        return <CurrencyModule />;
      case "denominations":
        return <DenominationsModule />;
      case "customers":
        return <CustomersModule />;
      case "users":
        return <UserModule />;
      case "tills":
        return <TillModule />;
      case "transactions":
        return <TillTransactionsModule />;
      case "orders":
        return <OrderModule />;
      case "settings":
        return <SettingsModule />;
      default:
        return <OrderModule />;
    }
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="opencx-ui-theme">
      <div className="min-h-screen bg-background">
        <Unauthenticated>
          <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold">OpenCX</h1>
                </div>
                <ModeToggle />
              </div>
                <SignInForm />
            </Card>
          </div>
        </Unauthenticated>

        <Authenticated>
          <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-64 border-r bg-card flex flex-col">
              {/* Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold">OpenCX</h1>
                  </div>
                  <ModeToggle />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex-1 p-4 overflow-y-auto">
                <nav className="space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;

                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "default" : "ghost"}
                        className="w-full justify-start h-auto p-3"
                        onClick={() => setActiveModule(item.id)}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        <span className="font-medium">{item.label}</span>
                      </Button>
                    );
                  })}
                </nav>
              </div>

              {/* Footer */}
              <div className="p-2 border-t">
                <UserDropdown />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                {renderActiveModule()}
              </div>
            </div>
          </div>
        </Authenticated>
      </div>
    </ThemeProvider>
  );
}

export default App;