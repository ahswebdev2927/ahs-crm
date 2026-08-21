import { AppError } from "@/lib/errors/AppError";
import { logAuthzFailure } from "@/lib/logger";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import type { DashboardScope } from "../types/dashboard-scope.types";
import { getAllowedDashboardScopes } from "../utils/dashboard-scope.utils";
export { getAllowedDashboardScopes };

export interface ResolvedDashboardScopeContext {
  scope: DashboardScope;
  userId: string;
  userRoleCode: string;
  teamId?: number | null;
  dataVisibility?: string;
}

/**
 * Validates and resolves the requested scope for the user.
 * Throws AppError 403 if requestedScope is not in the allowed list.
 */
export const resolveAuthorizedDashboardScope = (
  user: AuthenticatedUserPayload,
  requestedScope?: string | null
): ResolvedDashboardScopeContext => {
  const allowedScopes = getAllowedDashboardScopes(user);
  
  // Default to the highest privilege scope available if not specified
  const targetScope: DashboardScope = (
    requestedScope && ["business", "team", "personal"].includes(requestedScope)
      ? requestedScope
      : allowedScopes[0]
  ) as DashboardScope;

  if (!allowedScopes.includes(targetScope)) {
    logAuthzFailure({
      userId: user.id,
      requiredPermission: `dashboard:scope:${targetScope}`,
      reason: `Unauthorized attempt to access dashboard scope '${targetScope}'`,
    });
    throw new AppError(
      `Access denied. Scope '${targetScope}' is not authorized for your role or permissions.`,
      403,
      "FORBIDDEN"
    );
  }

  return {
    scope: targetScope,
    userId: user.id,
    userRoleCode: user.role.code,
    teamId: user.teamId || null,
    dataVisibility: user.dataVisibility || "own",
  };
};
