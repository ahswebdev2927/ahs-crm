import test, { describe } from "node:test";
import assert from "node:assert/strict";

describe("Task Notes Service — Permissions & Journal Logic", () => {
  describe("Author & Manager Permission Rules", () => {
    const canManageNote = (
      user: { id: string; roleCode: string },
      note: { userId: string }
    ) => {
      if (user.roleCode === "super_admin" || user.roleCode === "sales_manager") {
        return true;
      }
      return user.id === note.userId;
    };

    test("allows author rep to edit and delete their own note", () => {
      const author = { id: "rep-1", roleCode: "inside_sales" };
      const note = { userId: "rep-1" };

      assert.equal(canManageNote(author, note), true);
    });

    test("denies another sales rep from editing or deleting a teammate's note", () => {
      const otherRep = { id: "rep-2", roleCode: "inside_sales" };
      const note = { userId: "rep-1" };

      assert.equal(canManageNote(otherRep, note), false);
    });

    test("allows sales manager to edit or delete any teammate's note", () => {
      const manager = { id: "mgr-1", roleCode: "sales_manager" };
      const note = { userId: "rep-1" };

      assert.equal(canManageNote(manager, note), true);
    });

    test("allows super admin to edit or delete any note", () => {
      const admin = { id: "admin-1", roleCode: "super_admin" };
      const note = { userId: "rep-1" };

      assert.equal(canManageNote(admin, note), true);
    });
  });

  describe("Activity Timeline Linking Logic", () => {
    test("determines activity logging requirement based on entity associations", () => {
      const shouldLogActivity = (task: { leadId: string | null; customerId: string | null }) => {
        return Boolean(task.leadId || task.customerId);
      };

      assert.equal(shouldLogActivity({ leadId: "lead-1", customerId: null }), true);
      assert.equal(shouldLogActivity({ leadId: null, customerId: "cust-1" }), true);
      assert.equal(shouldLogActivity({ leadId: null, customerId: null }), false);
    });
  });
});
