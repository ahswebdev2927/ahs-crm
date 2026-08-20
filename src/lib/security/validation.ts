import { AppError } from "@/lib/errors/AppError";

/**
 * Validates that a given value is present in an allowlist.
 * Throws AppError 400 (INVALID_INPUT) if the validation fails.
 */
export function validateAllowlist(
  value: string,
  allowlist: string[],
  fieldName: string = "Input field"
): string {
  if (!allowlist.includes(value)) {
    throw new AppError(
      `${fieldName} '${value}' is invalid. Allowed values: ${allowlist.join(", ")}`,
      400,
      "INVALID_INPUT"
    );
  }
  return value;
}
