import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { getTaskMetrics } from "@/features/tasks/services/task.service";

/**
 * GET /api/tasks/stats
 * Retrieves aggregated task metrics (total, pending, inProgress, completed, overdue, highPriority)
 */
export const GET = withErrorHandling(async () => {
  const metrics = await getTaskMetrics();

  return successResponse({
    statusCode: 200,
    message: "Task metrics retrieved successfully.",
    data: metrics,
  });
});
