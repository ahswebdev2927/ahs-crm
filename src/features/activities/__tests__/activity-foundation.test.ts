import test from "node:test";
import assert from "node:assert/strict";
import {
  getCategoryForType,
  getTypeLabel,
  getOutcomeLabel,
  formatActivityCurrency,
  formatActivityDate,
  parseActivityMetadata,
} from "../utils/activity-helpers";
import {
  createManualActivitySchema,
  updateManualActivitySchema,
  activityQuerySchema,
} from "../schemas/activity.schema";

test("Activity Foundation - Category resolution for types", () => {
  assert.equal(getCategoryForType("call"), "communication");
  assert.equal(getCategoryForType("note"), "communication");
  assert.equal(getCategoryForType("whatsapp"), "communication");
  assert.equal(getCategoryForType("meeting"), "communication");
  assert.equal(getCategoryForType("email"), "communication");

  assert.equal(getCategoryForType("stage_change"), "lifecycle");
  assert.equal(getCategoryForType("lead_created"), "lifecycle");
  assert.equal(getCategoryForType("appointment"), "lifecycle");
  assert.equal(getCategoryForType("field_visit"), "lifecycle");
  assert.equal(getCategoryForType("converted"), "lifecycle");

  assert.equal(getCategoryForType("quotation_created"), "commercial");
  assert.equal(getCategoryForType("payment_received"), "commercial");
  assert.equal(getCategoryForType("invoice_issued"), "commercial");
});

test("Activity Foundation - Type labels and outcome labels", () => {
  assert.equal(getTypeLabel("call"), "Phone Call");
  assert.equal(getTypeLabel("stage_change"), "Stage Changed");
  assert.equal(getTypeLabel("payment_received"), "Payment Received");

  assert.equal(getOutcomeLabel("connected"), "Connected / Spoke with client");
  assert.equal(getOutcomeLabel("left_message"), "Left Voicemail / Message");
  assert.equal(getOutcomeLabel("no_answer"), "No Answer");
  assert.equal(getOutcomeLabel("held"), "Meeting Held");
  assert.equal(getOutcomeLabel(""), "");
});

test("Activity Foundation - Currency and Date formatting", () => {
  // Minor units to INR
  const formatted = formatActivityCurrency(15000000); // 1,50,000 INR = 15000000 paise
  assert.match(formatted, /1,50,000/);

  const formattedDate = formatActivityDate(new Date(2026, 9, 22, 14, 30));
  assert.match(formattedDate, /22 Oct 2026/);
  assert.match(formattedDate, /2:30 PM/);
});

test("Activity Foundation - Metadata JSON parser", () => {
  const metadata = parseActivityMetadata('{"quoteNumber":"QT-2026-001","amountPaise":500000}');
  assert.deepEqual(metadata, {
    quoteNumber: "QT-2026-001",
    amountPaise: 500000,
  });

  assert.equal(parseActivityMetadata(null), null);
  assert.equal(parseActivityMetadata("invalid-json"), null);
});

test("Activity Foundation - Validation Schemas", () => {
  // Must reject if neither leadId nor customerId is present
  const invalidResult = createManualActivitySchema.safeParse({
    type: "note",
    subject: "Test Note",
    description: "Meeting content",
  });
  assert.equal(invalidResult.success, false);

  // Valid when leadId is provided
  const validResult = createManualActivitySchema.safeParse({
    leadId: "lead-1234",
    type: "call",
    subject: "Introductory Call",
    description: "Discussed requirement for SEO package",
    outcome: "connected",
  });
  assert.equal(validResult.success, true);

  // Update schema
  const validUpdate = updateManualActivitySchema.safeParse({
    subject: "Updated Call Subject",
    outcome: "left_message",
  });
  assert.equal(validUpdate.success, true);

  // Query schema default category
  const validQuery = activityQuerySchema.safeParse({
    leadId: "lead-1234",
  });
  assert.equal(validQuery.success, true);
  if (validQuery.success) {
    assert.equal(validQuery.data.category, "all");
    assert.equal(validQuery.data.page, 1);
    assert.equal(validQuery.data.limit, 20);
  }
});
