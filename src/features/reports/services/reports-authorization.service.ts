import { AppError } from "@/lib/errors/AppError";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import type { ReportsScopeContext, ReportTab } from "../types/reports.types";

/**
 * Resolves and validates authorized reporting scope for the current session user.
 * Functional implementation with strict RBAC boundary checks.
 */
export const resolveAuthorizedReportsScope = (
  user: AuthenticatedUserPayload,
  requestedTab: ReportTab,
  requestedUserId?: string,
  requestedTeamId?: number
): ReportsScopeContext => {
  const role = user.role.code;

  // 1. Sales Representatives (Inside Sales & Field Sales)
  if (role === "inside_sales" || role === "field_sales") {
    if (requestedTab !== "salesperson") {
      throw new AppError(
        "Access denied. Sales representatives are restricted to viewing their personal Salesperson report only.",
        403,
        "FORBIDDEN"
      );
    }

    // Force strict self-locking
    return {
      scope: "own",
      userId: user.id,
      roleCode: role,
      teamId: user.teamId,
      targetUserId: user.id,
      targetTeamId: user.teamId,
    };
  }

  // 2. Sales Manager
  if (role === "sales_manager") {
    return {
      scope: "team",
      userId: user.id,
      roleCode: role,
      teamId: user.teamId,
      targetUserId: requestedUserId || null,
      targetTeamId: user.teamId, // Locked to their team
    };
  }

  // 3. SuperAdmin
  if (role === "super_admin") {
    return {
      scope: "all",
      userId: user.id,
      roleCode: role,
      teamId: null,
      targetUserId: requestedUserId || null,
      targetTeamId: requestedTeamId || null,
    };
  }

  throw new AppError(
    `Access denied. Your role '${user.role.name}' does not have reporting access privileges.`,
    403,
    "FORBIDDEN"
  );
};
