"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Users,
  DollarSign,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  className?: string;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: BarChart3,
  },
  {
    name: "Orders",
    href: "/orders",
    icon: CreditCard,
  },
  {
    name: "Currencies",
    href: "/currencies",
    icon: DollarSign,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
  },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn("pb-12 w-64", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant={pathname === item.href ? "secondary" : "ghost"}
                className="w-full justify-start"
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}