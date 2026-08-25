import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users, auditLogs } from "@/db/schema";
import { AppError } from "@/lib/errors/AppError";
import { checkLeadAccess } from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  findActiveLeadPartners,
  findAllLeadPartners,
  findPartnerRecordById,
  findActivePartnerByLeadAndUser,
  getSumActivePartnerPercentage,
  insertLeadPartnerRecord,
  updateLeadPartnerRecord,
  removeLeadPartnerRecord,
} from "../repositories/lead-partner.repository";
import { findLeadById } from "../repositories/lead.repository";
import type {
  AddLeadPartnerInput,
  UpdateLeadPartnerInput,
  RemoveLeadPartnerInput,
  LeadPartnerItem,
  LeadPartnershipSummary,
} from "../types/lead.types";

/**
 * Lead Partnership Service
 * Encapsulates business logic, percentage calculations, validation,
 * authorization, activity timeline logging, and audit logging for Lead Partnerships.
 */

export const getLeadPartnershipSummary = async (
  leadId: string
): Promise<LeadPartnershipSummary> => {
  const lead = await findLeadById(leadId);
  if (!lead) {
    throw new AppError("Lead not found.", 404, "NOT_FOUND");
  }

  const allPartners = await findAllLeadPartners(leadId);
  const activePartners = allPartners.filter((p) => p.status === "active");
  const historicalPartners = allPartners.filter((p) => p.status === "removed");

  const totalPartnerPercentage = activePartners.reduce(
    (acc, p) => acc + p.percentage,
    0
  );
  const availablePercentage = Math.max(0, 100 - totalPartnerPercentage);
  const ownerPercentage = availablePercentage;

  return {
    totalPartnerPercentage,
    availablePercentage,
    ownerPercentage,
    activePartners,
    historicalPartners,
  };
};

export const addLeadPartner = async (
  leadId: string,
  input: AddLeadPartnerInput,
  currentUser: AuthenticatedUserPayload
): Promise<LeadPartnerItem> => {
  // Authorization check
  await checkLeadAccess(leadId, "assign");

  // Verify lead exists and is active
  const lead = await findLeadById(leadId);
  if (!lead) {
    throw new AppError("Lead not found.", 404, "NOT_FOUND");
  }
  if (lead.status !== "active") {
    throw new AppError(
      "Cannot add partners to an archived or deleted lead.",
      400,
      "BAD_REQUEST"
    );
  }

  // Prevent assigning lead owner as partner
  if (lead.ownerId === input.partnerId) {
    throw new AppError(
      "The primary lead owner cannot be added as a partner.",
      400,
      "BAD_REQUEST"
    );
  }

  // Verify selected partner exists and is active
  const partnerUser = await db
    .select({
      id: users.id,
      name: users.name,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, input.partnerId))
    .get();

  if (!partnerUser) {
    throw new AppError("Target partner user not found.", 404, "NOT_FOUND");
  }
  if (partnerUser.status !== "active") {
    throw new AppError(
      `Cannot add ${partnerUser.name} as a partner because their account is ${partnerUser.status}.`,
      400,
      "BAD_REQUEST"
    );
  }

  // Prevent duplicate active partner
  const existingActivePartner = await findActivePartnerByLeadAndUser(
    leadId,
    input.partnerId
  );
  if (existingActivePartner) {
    throw new AppError(
      `${partnerUser.name} is already an active partner on this lead.`,
      409,
      "CONFLICT"
    );
  }

  // Percentage allocation validation
  const currentPartnerSum = await getSumActivePartnerPercentage(leadId);
  const remainingPercentage = 100 - currentPartnerSum;

  if (input.percentage > remainingPercentage) {
    throw new AppError(
      `Total partnership percentage cannot exceed 100%. Currently allocated: ${currentPartnerSum}%, remaining available: ${remainingPercentage}%. Requested: ${input.percentage}%.`,
      400,
      "BAD_REQUEST"
    );
  }

  // Insert partnership record
  const newPartner = await insertLeadPartnerRecord({
    ...input,
    leadId,
    addedById: currentUser.id,
  });

  // Record audit log
  try {
    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "LEAD_PARTNER_ADDED",
      entityType: "lead_partner",
      entityId: newPartner.id,
      newData: JSON.stringify({
        leadId,
        partnerId: input.partnerId,
        partnerName: partnerUser.name,
        percentage: input.percentage,
        role: input.role,
      }),
      createdAt: new Date(),
    });
  } catch (_e) {
    // Audit logging failsafe
  }

  return newPartner;
};

export const updateLeadPartner = async (
  leadId: string,
  partnerRecordId: string,
  input: UpdateLeadPartnerInput,
  currentUser: AuthenticatedUserPayload
): Promise<LeadPartnerItem> => {
  // Authorization check
  await checkLeadAccess(leadId, "assign");

  // Verify lead exists
  const lead = await findLeadById(leadId);
  if (!lead) {
    throw new AppError("Lead not found.", 404, "NOT_FOUND");
  }

  // Verify partner record exists and is active
  const existingPartner = await findPartnerRecordById(partnerRecordId);
  if (!existingPartner || existingPartner.leadId !== leadId) {
    throw new AppError("Lead partner record not found.", 404, "NOT_FOUND");
  }
  if (existingPartner.status !== "active") {
    throw new AppError(
      "Cannot modify a removed lead partner.",
      400,
      "BAD_REQUEST"
    );
  }

  // If percentage is updated, validate allocation
  if (input.percentage !== undefined) {
    const sumExceptThis = await getSumActivePartnerPercentage(
      leadId,
      partnerRecordId
    );
    const maxAvailable = 100 - sumExceptThis;

    if (input.percentage > maxAvailable) {
      throw new AppError(
        `Total partnership percentage cannot exceed 100%. Other active partners hold ${sumExceptThis}%, remaining available: ${maxAvailable}%. Requested: ${input.percentage}%.`,
        400,
        "BAD_REQUEST"
      );
    }
  }

  // Update partnership record
  const updatedPartner = await updateLeadPartnerRecord(
    partnerRecordId,
    input
  );

  // Record audit log
  try {
    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "LEAD_PARTNER_UPDATED",
      entityType: "lead_partner",
      entityId: partnerRecordId,
      oldData: JSON.stringify({
        percentage: existingPartner.percentage,
        role: existingPartner.role,
      }),
      newData: JSON.stringify({
        percentage: updatedPartner.percentage,
        role: updatedPartner.role,
      }),
      createdAt: new Date(),
    });
  } catch (_e) {
    // Audit logging failsafe
  }

  return updatedPartner;
};

export const removeLeadPartner = async (
  leadId: string,
  partnerRecordId: string,
  input: RemoveLeadPartnerInput,
  currentUser: AuthenticatedUserPayload
): Promise<LeadPartnerItem> => {
  // Authorization check
  await checkLeadAccess(leadId, "assign");

  // Verify lead exists
  const lead = await findLeadById(leadId);
  if (!lead) {
    throw new AppError("Lead not found.", 404, "NOT_FOUND");
  }

  // Verify partner record exists and is active
  const existingPartner = await findPartnerRecordById(partnerRecordId);
  if (!existingPartner || existingPartner.leadId !== leadId) {
    throw new AppError("Lead partner record not found.", 404, "NOT_FOUND");
  }
  if (existingPartner.status !== "active") {
    throw new AppError(
      "Lead partner has already been removed.",
      400,
      "BAD_REQUEST"
    );
  }

  // Soft-remove partnership record
  const removedPartner = await removeLeadPartnerRecord(
    partnerRecordId,
    currentUser.id,
    input.removalReason
  );

  // Record audit log
  try {
    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "LEAD_PARTNER_REMOVED",
      entityType: "lead_partner",
      entityId: partnerRecordId,
      oldData: JSON.stringify({
        partnerId: existingPartner.partnerId,
        partnerName: existingPartner.partner?.name,
        percentage: existingPartner.percentage,
        role: existingPartner.role,
      }),
      newData: JSON.stringify({
        status: "removed",
        removedById: currentUser.id,
        removalReason: input.removalReason ?? null,
      }),
      createdAt: new Date(),
    });
  } catch (_e) {
    // Audit logging failsafe
  }

  return removedPartner;
};
