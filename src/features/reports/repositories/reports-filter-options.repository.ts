import { db } from "@/db";
import { logger } from "@/lib/logger";
import { teams, users, roles } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import type { ReportsScopeContext, ReportsFilterOptions } from "../types/reports.types";

/**
 * Functional repository fetching permitted filter options (teams and users)
 * based on the resolved reporting scope.
 */
export const fetchReportsFilterOptions = async (
  ctx: ReportsScopeContext
): Promise<ReportsFilterOptions> => {
  let permittedTeams: Array<{ id: number; name: string }> = [];
  let permittedUsers: Array<{ id: string; name: string; roleName: string; teamId: number | null }> = [];

  try {
    if (ctx.scope === "all") {
      // SuperAdmin: All teams and sales users
      const teamRows = await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .all();
      permittedTeams = teamRows;

      const userRows = await db
        .select({
          id: users.id,
          name: users.name,
          roleName: roles.name,
          teamId: users.teamId,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(isNull(users.deletedAt))
        .all();
      permittedUsers = userRows;
    } else if (ctx.scope === "team" && ctx.teamId) {
      // Sales Manager: Managed team and team members
      const teamRows = await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.id, ctx.teamId))
        .all();
      permittedTeams = teamRows;

      const userRows = await db
        .select({
          id: users.id,
          name: users.name,
          roleName: roles.name,
          teamId: users.teamId,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(and(eq(users.teamId, ctx.teamId), isNull(users.deletedAt)))
        .all();
      permittedUsers = userRows;
    } else {
      // Sales Representative: Self only
      const userRows = await db
        .select({
          id: users.id,
          name: users.name,
          roleName: roles.name,
          teamId: users.teamId,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, ctx.userId))
        .all();
      permittedUsers = userRows;
    }
  } catch (err) {
    logger.error(
      {
        event: "REPORTS_FILTER_FETCH_ERROR",
        scope: ctx.scope,
        userId: ctx.userId,
        err: err instanceof Error ? err.message : String(err),
      },
      "fetchReportsFilterOptions error"
    );
  }

  return {
    teams: permittedTeams,
    users: permittedUsers,
  };
};
