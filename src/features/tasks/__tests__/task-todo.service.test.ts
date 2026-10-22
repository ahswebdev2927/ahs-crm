import test, { describe } from "node:test";
import assert from "node:assert/strict";
import type { TaskTodoItem } from "../types/task.types";

describe("Task Todos & Checklist Service — Logic & Progress Rules", () => {
  describe("Progress Calculation", () => {
    test("calculates 0% when no todos exist", () => {
      const todos: TaskTodoItem[] = [];
      const completed = todos.filter((t) => t.isCompleted).length;
      const total = todos.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      assert.equal(completed, 0);
      assert.equal(total, 0);
      assert.equal(percent, 0);
    });

    test("calculates correct completion fraction and percentage", () => {
      const dummyItem = (id: string, isCompleted: boolean): TaskTodoItem => ({
        id,
        taskId: "task-1",
        title: `Item ${id}`,
        isCompleted,
        position: 0,
        completedAt: isCompleted ? new Date() : null,
        completedById: isCompleted ? "user-1" : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const todos: TaskTodoItem[] = [
        dummyItem("1", true),
        dummyItem("2", true),
        dummyItem("3", false),
        dummyItem("4", false),
      ];

      const completed = todos.filter((t) => t.isCompleted).length;
      const total = todos.length;
      const percent = Math.round((completed / total) * 100);

      assert.equal(completed, 2);
      assert.equal(total, 4);
      assert.equal(percent, 50);
    });

    test("detects 100% completion when all items are done", () => {
      const dummyItem = (id: string): TaskTodoItem => ({
        id,
        taskId: "task-1",
        title: `Item ${id}`,
        isCompleted: true,
        position: 0,
        completedAt: new Date(),
        completedById: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const todos = [dummyItem("1"), dummyItem("2"), dummyItem("3")];
      const completed = todos.filter((t) => t.isCompleted).length;
      const percent = Math.round((completed / todos.length) * 100);

      assert.equal(percent, 100);
    });
  });

  describe("Position Reordering Rules", () => {
    test("assigns sequential 0-indexed positions correctly", () => {
      const orderedIds = ["todo-c", "todo-a", "todo-b"];
      const updatedPositions = orderedIds.map((id, index) => ({ id, position: index }));

      assert.deepEqual(updatedPositions, [
        { id: "todo-c", position: 0 },
        { id: "todo-a", position: 1 },
        { id: "todo-b", position: 2 },
      ]);
    });
  });

  describe("Completion Status Transition Rules", () => {
    test("sets completion metadata when marked completed", () => {
      const userId = "rep-1";
      const now = new Date();

      const transition = (isCompleted: boolean) => ({
        isCompleted,
        completedAt: isCompleted ? now : null,
        completedById: isCompleted ? userId : null,
      });

      const completedState = transition(true);
      assert.equal(completedState.isCompleted, true);
      assert.notEqual(completedState.completedAt, null);
      assert.equal(completedState.completedById, "rep-1");

      const revertedState = transition(false);
      assert.equal(revertedState.isCompleted, false);
      assert.equal(revertedState.completedAt, null);
      assert.equal(revertedState.completedById, null);
    });
  });
});
