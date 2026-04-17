"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  type LucideIcon,
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
import { useSupabase } from "@/components/providers/supabase-provider";
import { ALL_ROLES, type StaffRole } from "@/lib/auth/roles";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: StaffRole[];
}

const navItems: NavItem[] = [
  {
    title: "Κρατήσεις",
    href: "/reservations",
    icon: CalendarDays,
    roles: ["manager", "waiter"],
  },
  {
    title: "Τραπέζια",
    href: "/tables",
    icon: LayoutGrid,
    roles: ["manager", "waiter"],
  },
  {
    title: "Παραγγελίες",
    href: "/orders",
    icon: ClipboardList,
    roles: ["manager", "waiter"],
  },
  {
    title: "Κουζίνα",
    href: "/kitchen",
    icon: ChefHat,
    roles: ["manager", "chef", "barman"],
  },
  {
    title: "Ταμείο",
    href: "/checkout",
    icon: CreditCard,
    roles: ["manager", "waiter"],
  },
  {
    title: "Μενού",
    href: "/menu",
    icon: UtensilsCrossed,
    roles: ALL_ROLES,
  },
  {
    title: "Αποθήκη",
    href: "/inventory",
    icon: Package,
    roles: ["manager", "chef"],
  },
  {
    title: "Συνταγές",
    href: "/recipes",
    icon: BookOpen,
    roles: ["manager", "chef"],
  },
  {
    title: "Πελάτες",
    href: "/customers",
    icon: Users,
    roles: ["manager", "waiter"],
  },
  {
    title: "Loyalty",
    href: "/loyalty",
    icon: Gift,
    roles: ["manager", "waiter"],
  },
  {
    title: "Καμπάνιες",
    href: "/campaigns",
    icon: MessageSquare,
    roles: ["manager"],
  },
  {
    title: "Προσωπικό",
    href: "/staff",
    icon: UserCog,
    roles: ["manager"],
  },
  {
    title: "AI Assistant",
    href: "/ai",
    icon: Bot,
    roles: ["manager"],
  },
  {
    title: "Αναφορές",
    href: "/reports",
    icon: BarChart3,
    roles: ["manager", "waiter"],
  },
];

export function POSSidebar() {
  const pathname = usePathname();
  const supabase = useSupabase();
  const [role, setRole] = useState<StaffRole | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const r = (user?.user_metadata?.role as StaffRole) ?? "waiter";
      setRole(r);
    });
  }, [supabase]);

  const visibleItems = role
    ? navItems.filter((item) => item.roles.includes(role))
    : [];

  const showSettings = role === "manager";

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
              {visibleItems.map((item) => {
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

      {showSettings && (
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
      )}
    </Sidebar>
  );
}
