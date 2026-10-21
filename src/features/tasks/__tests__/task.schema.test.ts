import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskQuerySchema,
} from "../schemas/task.schema";

describe("Tasks Feature — Zod Validation Schemas", () => {
  describe("createTaskSchema", () => {
    test("validates a standard task with title, priority, and due date", () => {
      const now = Date.now();
      const valid = createTaskSchema.parse({
        title: "Follow up with Rajesh about proposal",
        description: "Need to confirm requirements before Monday",
        priority: "high",
        dueDate: now + 86400000,
        status: "pending",
        assignedToId: "user-123",
        leadId: "lead-456",
      });

      assert.equal(valid.title, "Follow up with Rajesh about proposal");
      assert.equal(valid.priority, "high");
      assert.equal(valid.status, "pending");
      assert.equal(valid.assignedToId, "user-123");
      assert.equal(valid.leadId, "lead-456");
      assert.equal(typeof valid.dueDate, "number");
    });

    test("applies default priority (medium) and status (pending)", () => {
      const valid = createTaskSchema.parse({
        title: "General administrative chores",
      });

      assert.equal(valid.title, "General administrative chores");
      assert.equal(valid.priority, "medium");
      assert.equal(valid.status, "pending");
      assert.equal(valid.assignedToId, null);
      assert.equal(valid.leadId, null);
      assert.equal(valid.customerId, null);
    });

    test("parses ISO date strings for dueDate and converts to timestamp ms", () => {
      const iso = "2026-11-01T10:00:00.000Z";
      const valid = createTaskSchema.parse({
        title: "Site visit preparation",
        dueDate: iso,
      });

      assert.equal(valid.dueDate, new Date(iso).getTime());
    });

    test("transforms empty string or unassigned to null for assignedToId, leadId, customerId", () => {
      const valid = createTaskSchema.parse({
        title: "Review quotation draft",
        assignedToId: "",
        leadId: "",
        customerId: "",
      });

      assert.equal(valid.assignedToId, null);
      assert.equal(valid.leadId, null);
      assert.equal(valid.customerId, null);
    });

    test("fails when title is empty or missing", () => {
      assert.throws(() => {
        createTaskSchema.parse({
          title: "   ",
        });
      }, /Task title is required/);

      assert.throws(() => {
        createTaskSchema.parse({});
      });
    });

    test("fails when priority is invalid", () => {
      assert.throws(() => {
        createTaskSchema.parse({
          title: "Invalid priority task",
          priority: "urgent", // Not in enum
        });
      });
    });

    test("fails when description exceeds 2000 characters", () => {
      assert.throws(() => {
        createTaskSchema.parse({
          title: "Overlong description task",
          description: "x".repeat(2001),
        });
      }, /Description must not exceed 2000 characters/);
    });
  });

  describe("updateTaskStatusSchema", () => {
    test("validates all supported task statuses", () => {
      const statuses = ["pending", "in_progress", "completed", "deferred", "cancelled"] as const;
      for (const st of statuses) {
        const res = updateTaskStatusSchema.parse({ status: st });
        assert.equal(res.status, st);
      }
    });

    test("rejects invalid status", () => {
      assert.throws(() => {
        updateTaskStatusSchema.parse({ status: "done" });
      });
    });
  });

  describe("taskQuerySchema", () => {
    test("parses query parameters with default pagination and sorting", () => {
      const res = taskQuerySchema.parse({});
      assert.equal(res.page, 1);
      assert.equal(res.limit, 20);
      assert.equal(res.sortBy, "dueDate");
      assert.equal(res.sortOrder, "asc");
    });

    test("coerces string numbers and overdue boolean flags", () => {
      const res = taskQuerySchema.parse({
        page: "3",
        limit: "50",
        overdue: "true",
        status: "in_progress",
        priority: "critical",
        assignedToId: "me",
      });

      assert.equal(res.page, 3);
      assert.equal(res.limit, 50);
      assert.equal(res.overdue, true);
      assert.equal(res.status, "in_progress");
      assert.equal(res.priority, "critical");
      assert.equal(res.assignedToId, "me");
    });
  });
});
