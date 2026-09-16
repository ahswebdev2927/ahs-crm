import type { DashboardScope, DashboardDateRange } from "../types/dashboard-scope.types";

export interface UserScopePermissionInput {
  role: {
    code: string;
    name?: string;
  };
  permissions: string[];
}

/**
 * Pure helper function to get the list of dashboard scopes allowed for the given user profile.
 * Can be safely consumed by both client components and server code.
 */
export const getAllowedDashboardScopes = (
  user: UserScopePermissionInput
): DashboardScope[] => {
  const scopes: DashboardScope[] = [];

  // SuperAdmin or explicit business permission gets business scope
  if (user.role.code === "super_admin" || user.permissions.includes("dashboard:view_business")) {
    scopes.push("business");
  }

  // Sales Manager or explicit team permission gets team scope
  if (
    user.role.code === "super_admin" ||
    user.role.code === "sales_manager" ||
    user.permissions.includes("dashboard:view_team")
  ) {
    if (user.role.code === "sales_manager" || user.permissions.includes("dashboard:view_team")) {
      scopes.push("team");
    }
  }

  // All roles are allowed personal scope
  scopes.push("personal");

  return scopes;
};

export interface DateRangeBounds {
  startDate: Date;
  endDate: Date;
  startMs: number;
  endMs: number;
}

/**
 * Converts a DashboardDateRange string into explicit start and end Date objects and millisecond timestamps.
 */
export const getDateRangeBounds = (dateRange: DashboardDateRange = "30d"): DateRangeBounds => {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let startDate: Date;

  switch (dateRange) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case "7d":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      break;
    case "30d":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      break;
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case "last_month": {
      const prevMonth = now.getMonth() - 1;
      const year = prevMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = (prevMonth + 12) % 12;
      startDate = new Date(year, month, 1, 0, 0, 0, 0);
      const lastDayOfPrevMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return {
        startDate,
        endDate: lastDayOfPrevMonth,
        startMs: startDate.getTime(),
        endMs: lastDayOfPrevMonth.getTime(),
      };
    }
    case "3m":
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate(), 0, 0, 0, 0);
      break;
    case "6m":
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate(), 0, 0, 0, 0);
      break;
    case "12m":
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      break;
  }

  return {
    startDate,
    endDate,
    startMs: startDate.getTime(),
    endMs: endDate.getTime(),
  };
};

