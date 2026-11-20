import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { db, client } from "@/db";
import {
  users,
  teams,
  tasks,
  taskTodos,
  taskNotes,
} from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { AppError } from "@/lib/errors/AppError";
import { validateAllowlist } from "@/lib/security/validation";

describe("Phase 28 — Database Security Hardening Unit & Integration Tests", () => {
  // =========================================================================
  // 1. Parameterized Queries & SQL Injection Immunity
  // =========================================================================
  describe("Parameterized Queries & Injection Immunity", () => {
    it("safely parameterizes classic SQL injection in search string without altering result set", async () => {
      const maliciousPayload = "' OR '1'='1' --";

      // Execute search query using Drizzle's parameterized like operator
      const result = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(like(users.email, `%${maliciousPayload}%`));

      // The malicious string must be treated as a literal search term, not an SQL condition
      assert.strictEqual(
        result.length,
        0,
        "SQL injection payload should not match any legitimate users"
      );
    });

    it("safely parameterizes DDL injection strings in equality queries without dropping tables", async () => {
      const dropTablePayload = "'; DROP TABLE users; --";

      const result = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, dropTablePayload));

      assert.strictEqual(result.length, 0);

      // Verify users table remains intact and functional
      const userCount = await db.select({ id: users.id }).from(users);
      assert.ok(userCount.length > 0, "Users table must remain intact");
    });

    it("enforces strict allowlist validation for dynamic sorting/filtering fields", () => {
      const allowedSortColumns = ["createdAt", "name", "status", "priority"];

      // 1. Valid column passes
      const validated = validateAllowlist("createdAt", allowedSortColumns, "sortField");
      assert.strictEqual(validated, "createdAt");

      // 2. SQL injection attempt in sort parameter throws AppError 400
      assert.throws(
        () => {
          validateAllowlist("createdAt; DROP TABLE users; --", allowedSortColumns, "sortField");
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 400);
          assert.strictEqual(err.errorCode, "INVALID_INPUT");
          assert.ok(err.message.includes("is invalid"));
          return true;
        }
      );

      // 3. Subquery injection in sort parameter throws AppError 400
      assert.throws(
        () => {
          validateAllowlist("(SELECT password_hash FROM users)", allowedSortColumns, "sortField");
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 400);
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 2. Foreign Key Constraint Enforcement & Relational Integrity
  // =========================================================================
  describe("Foreign Key Constraint Enforcement (PRAGMA foreign_keys = ON)", () => {
    it("confirms PRAGMA foreign_keys is active on the database connection", async () => {
      const fkStatus = await client.execute("PRAGMA foreign_keys;");
      const isEnabled = Number(fkStatus.rows[0]?.[0] ?? fkStatus.rows[0]?.foreign_keys);
      assert.strictEqual(isEnabled, 1, "Foreign keys must be enabled (1) in SQLite");
    });

    it("rejects inserting a record referencing a non-existent parent foreign key", async () => {
      const ghostRoleId = 99999999;

      await assert.rejects(
        async () => {
          await db.insert(users).values({
            id: `test-fk-user-${Date.now()}`,
            name: "Ghost Role User",
            email: `ghost-role-${Date.now()}@example.com`,
            passwordHash: "$2a$10$dummyHashPlaceholderString",
            roleId: ghostRoleId,
            status: "active",
          });
        },
        (err: unknown) => {
          const error = err as { message?: string; cause?: { message?: string; code?: string } };
          const fullErrorText = `${error?.message ?? ""} ${error?.cause?.message ?? ""} ${error?.cause?.code ?? ""}`;
          assert.ok(
            fullErrorText.includes("FOREIGN KEY") || fullErrorText.includes("SQLITE_CONSTRAINT"),
            `Expected foreign key constraint violation, got: ${fullErrorText}`
          );
          return true;
        }
      );
    });

    it("rejects inserting a team referencing a non-existent department ID", async () => {
      const ghostDeptId = 88888888;

      await assert.rejects(
        async () => {
          await db.insert(teams).values({
            name: "Ghost Department Team",
            code: `ghost-dept-team-${Date.now()}`,
            departmentId: ghostDeptId,
          });
        },
        (err: unknown) => {
          const error = err as { message?: string; cause?: { message?: string; code?: string } };
          const fullErrorText = `${error?.message ?? ""} ${error?.cause?.message ?? ""} ${error?.cause?.code ?? ""}`;
          assert.ok(
            fullErrorText.includes("FOREIGN KEY") || fullErrorText.includes("SQLITE_CONSTRAINT"),
            `Expected foreign key constraint violation, got: ${fullErrorText}`
          );
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 3. Relational Cascading Deletions
  // =========================================================================
  describe("Relational Cascading Deletions", () => {
    it("cascades deletion of parent task to all associated todos and notes", async () => {
      // 1. Get an existing user for createdById
      const existingUser = await db.select({ id: users.id }).from(users).limit(1).get();
      assert.ok(existingUser, "Existing user must be present in database");

      const testTaskId = `cascade-task-${Date.now()}`;
      const testTodoId = `cascade-todo-${Date.now()}`;
      const testNoteId = `cascade-note-${Date.now()}`;

      // 2. Insert parent task
      await db.insert(tasks).values({
        id: testTaskId,
        title: "Cascade Test Task",
        createdById: existingUser.id,
        status: "pending",
        priority: "medium",
      });

      // 3. Insert child todo and note
      await db.insert(taskTodos).values({
        id: testTodoId,
        taskId: testTaskId,
        title: "Child Todo Item",
        position: 0,
      });

      await db.insert(taskNotes).values({
        id: testNoteId,
        taskId: testTaskId,
        userId: existingUser.id,
        content: "Child Task Note Content",
      });

      // Verify child rows exist
      const todoBefore = await db.select().from(taskTodos).where(eq(taskTodos.id, testTodoId)).get();
      const noteBefore = await db.select().from(taskNotes).where(eq(taskNotes.id, testNoteId)).get();
      assert.ok(todoBefore, "Child todo should exist before parent deletion");
      assert.ok(noteBefore, "Child note should exist before parent deletion");

      // 4. Delete parent task
      await db.delete(tasks).where(eq(tasks.id, testTaskId));

      // 5. Verify child rows were cascaded and deleted automatically
      const todoAfter = await db.select().from(taskTodos).where(eq(taskTodos.id, testTodoId)).get();
      const noteAfter = await db.select().from(taskNotes).where(eq(taskNotes.id, testNoteId)).get();
      assert.strictEqual(todoAfter, undefined, "Child todo must be deleted via cascade");
      assert.strictEqual(noteAfter, undefined, "Child note must be deleted via cascade");
    });
  });

  // =========================================================================
  // 4. Live Schema Index Presence
  // =========================================================================
  describe("Live Database Index Verification", () => {
    it("verifies all newly created security hardening indexes exist in the live schema", async () => {
      const indexResult = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name IS NOT NULL;"
      );
      const existingIndexes = new Set(indexResult.rows.map((r) => String(r.name)));

      const expectedIndexes = [
        // Users & Sessions
        "users_status_idx",
        "users_deleted_at_idx",
        "sessions_expires_at_idx",

        // Leads
        "leads_created_by_idx",
        "lead_partners_lead_partner_status_idx",
        "lead_history_created_at_idx",

        // Customer Services
        "customer_services_created_by_idx",

        // Financials
        "quotations_created_by_idx",
        "quotation_items_service_id_idx",
        "invoices_created_by_idx",
        "invoices_quotation_id_idx",
        "invoice_items_service_id_idx",
        "payments_status_idx",

        // Tasks
        "tasks_created_by_idx",
        "tasks_priority_idx",
        "tasks_due_date_idx",
        "tasks_status_due_idx",
        "tasks_created_at_idx",

        // Notifications
        "notifications_recipient_read_created_idx",

        // Activities
        "activities_category_idx",
        "activities_deleted_at_idx",
      ];

      for (const expectedIndex of expectedIndexes) {
        assert.ok(
          existingIndexes.has(expectedIndex),
          `Expected index '${expectedIndex}' to exist in live database schema`
        );
      }
    });
  });
});
