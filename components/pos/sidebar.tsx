"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ClipboardList,
  ChefHat,
  CreditCard,
  UtensilsCrossed,
  BarChart3,
  Settings,
  Package,
  BookOpen,
  Users,
  CalendarDays,
  Gift,
  UserCog,
  Bot,
  MessageSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Κρατήσεις",
    href: "/reservations",
    icon: CalendarDays,
  },
  {
    title: "Τραπέζια",
    href: "/tables",
    icon: LayoutGrid,
  },
  {
    title: "Παραγγελίες",
    href: "/orders",
    icon: ClipboardList,
  },
  {
    title: "Κουζίνα",
    href: "/kitchen",
    icon: ChefHat,
  },
  {
    title: "Ταμείο",
    href: "/checkout",
    icon: CreditCard,
  },
  {
    title: "Μενού",
    href: "/menu",
    icon: UtensilsCrossed,
  },
  {
    title: "Αποθήκη",
    href: "/inventory",
    icon: Package,
  },
  {
    title: "Συνταγές",
    href: "/recipes",
    icon: BookOpen,
  },
  {
    title: "Πελάτες",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Loyalty",
    href: "/loyalty",
    icon: Gift,
  },
  {
    title: "Καμπάνιες",
    href: "/campaigns",
    icon: MessageSquare,
  },
  {
    title: "Προσωπικό",
    href: "/staff",
    icon: UserCog,
  },
  {
    title: "AI Assistant",
    href: "/ai",
    icon: Bot,
  },
  {
    title: "Αναφορές",
    href: "/reports",
    icon: BarChart3,
  },
];

export function POSSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border pb-4">
        <Link href="/tables" className="flex items-center gap-2 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <UtensilsCrossed className="size-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">
              EatFlow
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              POS System
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      size="lg"
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Ρυθμίσεις" size="lg">
              <Link href="/settings">
                <Settings className="size-5" />
                <span>Ρυθμίσεις</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
