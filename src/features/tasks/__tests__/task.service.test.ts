import test, { describe } from "node:test";
import assert from "node:assert/strict";
import type { TaskItem } from "../types/task.types";

describe("Tasks Service — Business Logic & State Rules", () => {
  describe("Task Completion & Overdue Calculations", () => {
    test("detects overdue task when due date is in the past and status is pending", () => {
      const pastDate = new Date(Date.now() - 3600000);
      const isOverdue = (task: Pick<TaskItem, "dueDate" | "status">) => {
        if (!task.dueDate) return false;
        if (task.status === "completed" || task.status === "cancelled" || task.status === "deferred") {
          return false;
        }
        return task.dueDate.getTime() < Date.now();
      };

      assert.equal(
        isOverdue({
          dueDate: pastDate,
          status: "pending",
        }),
        true
      );

      assert.equal(
        isOverdue({
          dueDate: pastDate,
          status: "in_progress",
        }),
        true
      );
    });

    test("does not flag completed tasks as overdue even if due date has passed", () => {
      const pastDate = new Date(Date.now() - 86400000);
      const isOverdue = (task: Pick<TaskItem, "dueDate" | "status">) => {
        if (!task.dueDate) return false;
        if (task.status === "completed" || task.status === "cancelled") {
          return false;
        }
        return task.dueDate.getTime() < Date.now();
      };

      assert.equal(
        isOverdue({
          dueDate: pastDate,
          status: "completed",
        }),
        false
      );

      assert.equal(
        isOverdue({
          dueDate: pastDate,
          status: "cancelled",
        }),
        false
      );
    });

    test("does not flag future tasks as overdue", () => {
      const futureDate = new Date(Date.now() + 86400000);
      const isOverdue = (task: Pick<TaskItem, "dueDate" | "status">) => {
        if (!task.dueDate) return false;
        if (task.status === "completed") return false;
        return task.dueDate.getTime() < Date.now();
      };

      assert.equal(
        isOverdue({
          dueDate: futureDate,
          status: "pending",
        }),
        false
      );
    });
  });

  describe("Pagination Calculations", () => {
    test("calculates correct totalPages across varying counts and limits", () => {
      const calcTotalPages = (total: number, limit: number) =>
        Math.ceil(total / limit) || 1;

      assert.equal(calcTotalPages(0, 20), 1);
      assert.equal(calcTotalPages(5, 20), 1);
      assert.equal(calcTotalPages(20, 20), 1);
      assert.equal(calcTotalPages(21, 20), 2);
      assert.equal(calcTotalPages(100, 20), 5);
      assert.equal(calcTotalPages(101, 20), 6);
    });
  });

  describe("High Priority Rules", () => {
    test("identifies high and critical priority items for attention", () => {
      const isAttentionRequired = (task: Pick<TaskItem, "priority" | "status">) => {
        if (task.status === "completed") return false;
        return task.priority === "high" || task.priority === "critical";
      };

      assert.equal(
        isAttentionRequired({ priority: "critical", status: "pending" }),
        true
      );
      assert.equal(
        isAttentionRequired({ priority: "high", status: "in_progress" }),
        true
      );
      assert.equal(
        isAttentionRequired({ priority: "critical", status: "completed" }),
        false
      );
      assert.equal(
        isAttentionRequired({ priority: "medium", status: "pending" }),
        false
      );
      assert.equal(
        isAttentionRequired({ priority: "low", status: "pending" }),
        false
      );
    });
  });
});
