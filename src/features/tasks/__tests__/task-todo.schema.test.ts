import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  createTaskTodoSchema,
  updateTaskTodoSchema,
  reorderTaskTodosSchema,
} from "../schemas/task-todo.schema";

describe("Task Todos — Zod Validation Schemas", () => {
  describe("createTaskTodoSchema", () => {
    test("validates valid todo item with title and default position", () => {
      const res = createTaskTodoSchema.parse({
        title: "Verify electrical line load capacity",
      });

      assert.equal(res.title, "Verify electrical line load capacity");
      assert.equal(res.position, 0);
    });

    test("trims leading/trailing whitespace from title", () => {
      const res = createTaskTodoSchema.parse({
        title: "   Inspect meter box   ",
        position: 3,
      });

      assert.equal(res.title, "Inspect meter box");
      assert.equal(res.position, 3);
    });

    test("fails when title is empty or only whitespace", () => {
      assert.throws(() => {
        createTaskTodoSchema.parse({ title: "   " });
      });
      assert.throws(() => {
        createTaskTodoSchema.parse({ title: "" });
      });
      assert.throws(() => {
        createTaskTodoSchema.parse({});
      });
    });

    test("fails when title exceeds 255 characters", () => {
      assert.throws(() => {
        createTaskTodoSchema.parse({ title: "a".repeat(256) });
      });
    });
  });

  describe("updateTaskTodoSchema", () => {
    test("validates toggling isCompleted flag", () => {
      const res = updateTaskTodoSchema.parse({
        isCompleted: true,
      });

      assert.equal(res.isCompleted, true);
      assert.equal(res.title, undefined);
    });

    test("validates updating title and position", () => {
      const res = updateTaskTodoSchema.parse({
        title: "Updated checklist task",
        position: 5,
        isCompleted: false,
      });

      assert.equal(res.title, "Updated checklist task");
      assert.equal(res.position, 5);
      assert.equal(res.isCompleted, false);
    });

    test("fails when title is provided as empty string", () => {
      assert.throws(() => {
        updateTaskTodoSchema.parse({ title: "   " });
      });
    });

    test("fails when position is negative", () => {
      assert.throws(() => {
        updateTaskTodoSchema.parse({ position: -1 });
      });
    });
  });

  describe("reorderTaskTodosSchema", () => {
    test("validates array of todo item IDs", () => {
      const res = reorderTaskTodosSchema.parse({
        todoIds: ["todo-1", "todo-2", "todo-3"],
      });

      assert.deepEqual(res.todoIds, ["todo-1", "todo-2", "todo-3"]);
    });

    test("fails when todoIds array is empty", () => {
      assert.throws(() => {
        reorderTaskTodosSchema.parse({ todoIds: [] });
      });
    });
  });
});
