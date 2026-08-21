import type { DashboardScope } from "../types/dashboard-scope.types";

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
