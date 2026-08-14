import {
  LayoutDashboard,
  Target,
  Kanban,
  PhoneCall,
  Calendar,
  CheckSquare,
  Users,
  Briefcase,
  FileCheck,
  Receipt,
  Wallet,
  BarChart3,
  Bell,
  UserCog,
  Settings,
  LucideIcon
} from "lucide-react";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string;
}

export interface NavigationGroup {
  groupName?: string;
  items: NavigationItem[];
}

export const navigationConfig: NavigationGroup[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard:view"
      }
    ]
  },
  {
    groupName: "Sales",
    items: [
      {
        label: "Leads",
        href: "/sales/leads",
        icon: Target,
        permission: "leads:view"
      },
      {
        label: "Pipeline",
        href: "/sales/pipeline",
        icon: Kanban,
        permission: "pipeline:view"
      },
      {
        label: "Follow-ups",
        href: "/sales/follow-ups",
        icon: PhoneCall,
        permission: "followups:view"
      },
      {
        label: "Appointments",
        href: "/sales/appointments",
        icon: Calendar,
        permission: "appointments:view"
      },
      {
        label: "Tasks",
        href: "/sales/tasks",
        icon: CheckSquare,
        permission: "tasks:view"
      }
    ]
  },
  {
    groupName: "Customers & Billing",
    items: [
      {
        label: "Customers",
        href: "/customers/customers",
        icon: Users,
        permission: "customers:view"
      },
      {
        label: "Services",
        href: "/customers/services",
        icon: Briefcase,
        permission: "services:view"
      },
      {
        label: "Quotations",
        href: "/customers/quotations",
        icon: FileCheck,
        permission: "quotations:view"
      },
      {
        label: "Invoices",
        href: "/customers/invoices",
        icon: Receipt,
        permission: "invoices:view"
      },
      {
        label: "Payments",
        href: "/customers/payments",
        icon: Wallet,
        permission: "payments:view"
      }
    ]
  },
  {
    groupName: "System",
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: BarChart3,
        permission: "reports:view"
      },
      {
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
        permission: "notifications:view"
      },
      {
        label: "Team Management",
        href: "/team",
        icon: UserCog,
        permission: "team:view"
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        permission: "settings:view"
      }
    ]
  }
];
