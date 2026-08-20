import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { UsersService } from "@/features/users/services/users.service";
import { createUserSchema, userQuerySchema } from "@/features/users/schemas/user.schema";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const validatedParams = userQuerySchema.parse(queryParams);
  const result = await UsersService.listTeamMembers(validatedParams);

  return successResponse({
    statusCode: 200,
    message: "Team members retrieved successfully.",
    data: result,
  });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const validatedInput = createUserSchema.parse(body);

  const newUser = await UsersService.createTeamMember(validatedInput);

  return successResponse({
    statusCode: 201,
    message: "Team member created successfully.",
    data: { user: newUser },
  });
});
