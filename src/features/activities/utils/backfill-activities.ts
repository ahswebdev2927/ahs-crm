import { db } from "@/db";
import {
  activities,
  leadActivities,
  leadStageHistory,
  leadStages,
  payments,
  quotations,
  fieldVisits,
  customers,
  invoices,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { formatActivityCurrency } from "./activity-helpers";

/**
 * Historical Data Backfill Utility
 * Populates initial activities table from legacy leadActivities, leadStageHistory,
 * quotations, payments, and field visits. Idempotent based on existing activity subjects/timestamps.
 */
export async function backfillHistoricalActivities(): Promise<{ inserted: number; message: string }> {
  let count = 0;

  // 1. Backfill legacy lead_activities (notes, calls, meetings, emails)
  const legacyActivities = await db.select().from(leadActivities);
  for (const act of legacyActivities) {
    const existing = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        sql`${activities.leadId} = ${act.leadId} AND ${activities.createdAt} = ${act.createdAt} AND ${activities.type} = ${act.type}`
      )
      .get();

    if (!existing) {
      await db.insert(activities).values({
        id: crypto.randomUUID(),
        leadId: act.leadId,
        customerId: null,
        userId: act.createdById,
        category: "communication",
        type: act.type,
        subject: `${act.type.charAt(0).toUpperCase() + act.type.slice(1)} Logged`,
        description: act.content,
        outcome: null,
        metadata: null,
        createdAt: act.createdAt,
        updatedAt: act.createdAt,
      });
      count++;
    }
  }

  // 2. Backfill lead_stage_history
  const stages = await db.select().from(leadStages);
  const stageMap = new Map(stages.map((s) => [s.id, s.name]));

  const stageHistories = await db.select().from(leadStageHistory);
  for (const hist of stageHistories) {
    const fromName = hist.fromStageId ? stageMap.get(hist.fromStageId) ?? "Initial" : "Initial";
    const toName = stageMap.get(hist.toStageId) ?? "New Stage";

    const existing = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        sql`${activities.leadId} = ${hist.leadId} AND ${activities.createdAt} = ${hist.createdAt} AND ${activities.type} = 'stage_change'`
      )
      .get();

    if (!existing) {
      const desc = hist.reason ? `${hist.reason}` : `Moved from ${fromName} to ${toName}`;
      await db.insert(activities).values({
        id: crypto.randomUUID(),
        leadId: hist.leadId,
        customerId: null,
        userId: hist.changedById,
        category: "lifecycle",
        type: "stage_change",
        subject: `Stage Changed to ${toName}`,
        description: desc,
        outcome: null,
        metadata: JSON.stringify({
          fromStageName: fromName,
          toStageName: toName,
          stageReason: hist.reason,
        }),
        createdAt: hist.createdAt,
        updatedAt: hist.createdAt,
      });
      count++;
    }
  }

  // 3. Backfill quotations
  const allQuotations = await db.select().from(quotations);
  for (const quote of allQuotations) {
    const existing = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        sql`(${activities.leadId} = ${quote.leadId} OR ${activities.customerId} = ${quote.customerId}) AND ${activities.metadata} LIKE ${'%"quoteNumber":"' + quote.quoteNumber + '"%'}`
      )
      .get();

    if (!existing) {
      await db.insert(activities).values({
        id: crypto.randomUUID(),
        leadId: quote.leadId,
        customerId: quote.customerId,
        userId: quote.createdById,
        category: "commercial",
        type: "quotation_created",
        subject: `Quotation ${quote.quoteNumber} Issued`,
        description: `Quotation prepared for ${formatActivityCurrency(quote.total)} with status ${quote.status}.`,
        outcome: null,
        metadata: JSON.stringify({
          quoteNumber: quote.quoteNumber,
          amountPaise: quote.total,
          formattedAmount: formatActivityCurrency(quote.total),
          status: quote.status,
        }),
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
      });
      count++;
    }
  }

  // 4. Backfill payments
  const allPayments = await db.select().from(payments);
  for (const pmt of allPayments) {
    // Find customer for this invoice if not direct
    let customerId = pmt.customerId;
    if (!customerId && pmt.invoiceId) {
      const inv = await db.select({ customerId: invoices.customerId }).from(invoices).where(eq(invoices.id, pmt.invoiceId)).get();
      if (inv) customerId = inv.customerId;
    }

    const existing = await db
      .select({ id: activities.id })
      .from(activities)
      .where(sql`${activities.createdAt} = ${pmt.paymentDate} AND ${activities.type} = 'payment_received'`)
      .get();

    if (!existing && (customerId || pmt.customerId)) {
      await db.insert(activities).values({
        id: crypto.randomUUID(),
        leadId: null,
        customerId: customerId || pmt.customerId,
        userId: pmt.receivedById,
        category: "commercial",
        type: "payment_received",
        subject: `Payment of ${formatActivityCurrency(pmt.amount)} Received`,
        description: `Payment recorded via ${pmt.paymentMethod ? pmt.paymentMethod.toUpperCase() : "PAYMENT"}${pmt.transactionReference ? ` (Ref: ${pmt.transactionReference})` : ""}.`,
        outcome: null,
        metadata: JSON.stringify({
          amountPaise: pmt.amount,
          formattedAmount: formatActivityCurrency(pmt.amount),
          paymentMethod: pmt.paymentMethod || null,
          paymentReference: pmt.transactionReference || null,
        }),
        createdAt: pmt.paymentDate,
        updatedAt: pmt.createdAt,
      });
      count++;
    }
  }

  // 5. Backfill customer conversions
  const convertedCustomers = await db.select().from(customers).where(sql`${customers.leadId} IS NOT NULL`);
  for (const cust of convertedCustomers) {
    if (cust.leadId) {
      const existing = await db
        .select({ id: activities.id })
        .from(activities)
        .where(
          sql`${activities.leadId} = ${cust.leadId} AND ${activities.type} = 'converted'`
        )
        .get();

      if (!existing && cust.ownerId) {
        await db.insert(activities).values({
          id: crypto.randomUUID(),
          leadId: cust.leadId,
          customerId: cust.id,
          userId: cust.ownerId,
          category: "lifecycle",
          type: "converted",
          subject: `Lead Converted to Customer Profile`,
          description: `Customer account ${cust.name}${cust.company ? ` (${cust.company})` : ""} successfully established.`,
          outcome: null,
          metadata: JSON.stringify({
            customerName: cust.name,
            company: cust.company,
          }),
          createdAt: cust.createdAt,
          updatedAt: cust.createdAt,
        });
        count++;
      }
    }
  }

  // 6. Backfill field visits
  const allVisits = await db.select().from(fieldVisits);
  for (const visit of allVisits) {
    const existing = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        sql`(${activities.leadId} = ${visit.leadId} OR ${activities.customerId} = ${visit.customerId}) AND ${activities.createdAt} = ${visit.createdAt} AND ${activities.type} = 'field_visit'`
      )
      .get();

    if (!existing) {
      await db.insert(activities).values({
        id: crypto.randomUUID(),
        leadId: visit.leadId,
        customerId: visit.customerId,
        userId: visit.createdById,
        category: "lifecycle",
        type: "field_visit",
        subject: `Field Visit Conducted`,
        description: visit.purpose || "Customer site consultation and visit report filed.",
        outcome: visit.outcome || null,
        metadata: JSON.stringify({
          purpose: visit.purpose,
          requirementsNotes: visit.requirementsNotes,
        }),
        createdAt: visit.createdAt,
        updatedAt: visit.updatedAt,
      });
      count++;
    }
  }

  return {
    inserted: count,
    message: `Historical backfill completed. Inserted ${count} timeline records.`,
  };
}
