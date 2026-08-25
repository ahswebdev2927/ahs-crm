import { db } from "@/db";
import { eq, and, sql, sum, ne } from "drizzle-orm";
import { leadPartners, users } from "@/db/schema";
import { alias } from "drizzle-orm/sqlite-core";
import type {
  LeadPartnerItem,
  AddLeadPartnerInput,
  UpdateLeadPartnerInput,
  LeadPartnerStatus,
} from "../types/lead.types";

const partnerUsers = alias(users, "partner_users");
const addedByUsers = alias(users, "added_by_users");
const removedByUsers = alias(users, "removed_by_users");

/**
 * Lead Partner Repository
 * Encapsulates all database operations for Lead Partnerships using Drizzle ORM.
 */

export const findActiveLeadPartners = async (
  leadId: string
): Promise<LeadPartnerItem[]> => {
  const rows = await db
    .select({
      partnerRel: leadPartners,
      partner: {
        id: partnerUsers.id,
        name: partnerUsers.name,
        email: partnerUsers.email,
      },
      addedBy: {
        id: addedByUsers.id,
        name: addedByUsers.name,
        email: addedByUsers.email,
      },
    })
    .from(leadPartners)
    .leftJoin(partnerUsers, eq(leadPartners.partnerId, partnerUsers.id))
    .leftJoin(addedByUsers, eq(leadPartners.addedById, addedByUsers.id))
    .where(
      and(
        eq(leadPartners.leadId, leadId),
        eq(leadPartners.status, "active")
      )
    );

  return rows.map((r) => ({
    ...r.partnerRel,
    status: r.partnerRel.status as LeadPartnerStatus,
    partner: r.partner && r.partner.id ? r.partner : null,
    addedBy: r.addedBy && r.addedBy.id ? r.addedBy : null,
    removedBy: null,
  }));
};

export const findAllLeadPartners = async (
  leadId: string
): Promise<LeadPartnerItem[]> => {
  const rows = await db
    .select({
      partnerRel: leadPartners,
      partner: {
        id: partnerUsers.id,
        name: partnerUsers.name,
        email: partnerUsers.email,
      },
      addedBy: {
        id: addedByUsers.id,
        name: addedByUsers.name,
        email: addedByUsers.email,
      },
      removedBy: {
        id: removedByUsers.id,
        name: removedByUsers.name,
        email: removedByUsers.email,
      },
    })
    .from(leadPartners)
    .leftJoin(partnerUsers, eq(leadPartners.partnerId, partnerUsers.id))
    .leftJoin(addedByUsers, eq(leadPartners.addedById, addedByUsers.id))
    .leftJoin(removedByUsers, eq(leadPartners.removedById, removedByUsers.id))
    .where(eq(leadPartners.leadId, leadId));

  return rows.map((r) => ({
    ...r.partnerRel,
    status: r.partnerRel.status as LeadPartnerStatus,
    partner: r.partner && r.partner.id ? r.partner : null,
    addedBy: r.addedBy && r.addedBy.id ? r.addedBy : null,
    removedBy: r.removedBy && r.removedBy.id ? r.removedBy : null,
  }));
};

export const findPartnerRecordById = async (
  partnerRecordId: string
): Promise<LeadPartnerItem | null> => {
  const row = await db
    .select({
      partnerRel: leadPartners,
      partner: {
        id: partnerUsers.id,
        name: partnerUsers.name,
        email: partnerUsers.email,
      },
      addedBy: {
        id: addedByUsers.id,
        name: addedByUsers.name,
        email: addedByUsers.email,
      },
      removedBy: {
        id: removedByUsers.id,
        name: removedByUsers.name,
        email: removedByUsers.email,
      },
    })
    .from(leadPartners)
    .leftJoin(partnerUsers, eq(leadPartners.partnerId, partnerUsers.id))
    .leftJoin(addedByUsers, eq(leadPartners.addedById, addedByUsers.id))
    .leftJoin(removedByUsers, eq(leadPartners.removedById, removedByUsers.id))
    .where(eq(leadPartners.id, partnerRecordId))
    .get();

  if (!row) return null;

  return {
    ...row.partnerRel,
    status: row.partnerRel.status as LeadPartnerStatus,
    partner: row.partner && row.partner.id ? row.partner : null,
    addedBy: row.addedBy && row.addedBy.id ? row.addedBy : null,
    removedBy: row.removedBy && row.removedBy.id ? row.removedBy : null,
  };
};

export const findActivePartnerByLeadAndUser = async (
  leadId: string,
  partnerId: string
): Promise<LeadPartnerItem | null> => {
  const row = await db
    .select({
      partnerRel: leadPartners,
      partner: {
        id: partnerUsers.id,
        name: partnerUsers.name,
        email: partnerUsers.email,
      },
    })
    .from(leadPartners)
    .leftJoin(partnerUsers, eq(leadPartners.partnerId, partnerUsers.id))
    .where(
      and(
        eq(leadPartners.leadId, leadId),
        eq(leadPartners.partnerId, partnerId),
        eq(leadPartners.status, "active")
      )
    )
    .get();

  if (!row) return null;

  return {
    ...row.partnerRel,
    status: row.partnerRel.status as LeadPartnerStatus,
    partner: row.partner && row.partner.id ? row.partner : null,
    addedBy: null,
    removedBy: null,
  };
};

export const getSumActivePartnerPercentage = async (
  leadId: string,
  excludePartnerRecordId?: string
): Promise<number> => {
  const conditions = [
    eq(leadPartners.leadId, leadId),
    eq(leadPartners.status, "active"),
  ];

  if (excludePartnerRecordId) {
    conditions.push(ne(leadPartners.id, excludePartnerRecordId));
  }

  const result = await db
    .select({ totalPercentage: sum(leadPartners.percentage) })
    .from(leadPartners)
    .where(and(...conditions));

  const total = result[0]?.totalPercentage;
  return total ? Number(total) : 0;
};

export const insertLeadPartnerRecord = async (
  input: AddLeadPartnerInput & { leadId: string; addedById: string }
): Promise<LeadPartnerItem> => {
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(leadPartners).values({
    id,
    leadId: input.leadId,
    partnerId: input.partnerId,
    percentage: input.percentage,
    role: input.role,
    status: "active",
    addedById: input.addedById,
    createdAt: now,
    updatedAt: now,
  });

  const created = await findPartnerRecordById(id);
  if (!created) {
    throw new Error("Failed to retrieve created lead partner record.");
  }
  return created;
};

export const updateLeadPartnerRecord = async (
  id: string,
  input: UpdateLeadPartnerInput
): Promise<LeadPartnerItem> => {
  const now = new Date();
  const updatePayload: Record<string, any> = { updatedAt: now };

  if (input.percentage !== undefined) {
    updatePayload.percentage = input.percentage;
  }
  if (input.role !== undefined) {
    updatePayload.role = input.role;
  }

  await db
    .update(leadPartners)
    .set(updatePayload)
    .where(eq(leadPartners.id, id));

  const updated = await findPartnerRecordById(id);
  if (!updated) {
    throw new Error("Failed to retrieve updated lead partner record.");
  }
  return updated;
};

export const removeLeadPartnerRecord = async (
  id: string,
  removedById: string,
  removalReason?: string | null
): Promise<LeadPartnerItem> => {
  const now = new Date();

  await db
    .update(leadPartners)
    .set({
      status: "removed",
      removedById,
      removalReason: removalReason ?? null,
      removedAt: now,
      updatedAt: now,
    })
    .where(eq(leadPartners.id, id));

  const removed = await findPartnerRecordById(id);
  if (!removed) {
    throw new Error("Failed to retrieve removed lead partner record.");
  }
  return removed;
};
