"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Users,
  Zap,
  Flag,
  Ticket,
  Heart,
  ClipboardList,
  BarChart2,
  ArrowLeft,
  BookOpen,
  CreditCard,
  Mail,
  ShieldAlert,
  Gauge,
} from "lucide-react";

const navItems = [
  { title: "Overview", href: "/admin", icon: BarChart2, exact: true },
  { title: "Users", href: "/admin/users", icon: Users, exact: false },
  { title: "Simulations", href: "/admin/simulations", icon: Activity, exact: false },
  { title: "LLM Dashboard", href: "/admin/llm", icon: Zap, exact: false },
  { title: "Feature Flags", href: "/admin/flags", icon: Flag, exact: false },
  { title: "Invites", href: "/admin/invites", icon: Ticket, exact: false },
  { title: "Health", href: "/admin/health", icon: Heart, exact: false },
  { title: "Audit Log", href: "/admin/audit", icon: ClipboardList, exact: false },
  { title: "Fidelity", href: "/admin/fidelity", icon: Gauge, exact: false },
  { title: "Scenarios", href: "/admin/scenarios", icon: BookOpen, exact: false },
  { title: "Billing", href: "/admin/billing", icon: CreditCard, exact: false },
  { title: "Emails", href: "/admin/emails", icon: Mail, exact: false },
  { title: "Moderation", href: "/admin/moderation", icon: ShieldAlert, exact: false },
];

function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();

  function isActive(item: { href: string; exact: boolean }) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight">Founder Fate</span>
            <span className="text-xs text-muted-foreground">Admin Console</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item)}>
                    <Link href={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge
            className={
              role === "admin"
                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700"
                : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700"
            }
          >
            {role}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {role === "support" ? "Read-only access" : "Full access"}
          </span>
        </div>
        <Link
          href="/hub"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to app
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AdminShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: string;
}) {
  return (
    <SidebarProvider>
      <AdminSidebar role={role} />
      <SidebarInset>
        <header className="h-12 border-b border-border bg-background/95 backdrop-blur flex items-center px-4 gap-4">
          <SidebarTrigger />
          <span className="text-sm text-muted-foreground">Admin Console</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
