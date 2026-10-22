import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  createTaskNoteSchema,
  updateTaskNoteSchema,
} from "../schemas/task-note.schema";

describe("Task Notes — Zod Validation Schemas", () => {
  describe("createTaskNoteSchema", () => {
    test("validates valid note content", () => {
      const res = createTaskNoteSchema.parse({
        content: "Customer confirmed rooftop installation feasibility for next Tuesday.",
      });

      assert.equal(
        res.content,
        "Customer confirmed rooftop installation feasibility for next Tuesday."
      );
    });

    test("trims surrounding whitespace from content", () => {
      const res = createTaskNoteSchema.parse({
        content: "   Followed up with site engineer   ",
      });

      assert.equal(res.content, "Followed up with site engineer");
    });

    test("fails when content is empty or only whitespace", () => {
      assert.throws(() => {
        createTaskNoteSchema.parse({ content: "   " });
      });
      assert.throws(() => {
        createTaskNoteSchema.parse({ content: "" });
      });
      assert.throws(() => {
        createTaskNoteSchema.parse({});
      });
    });

    test("fails when content exceeds 3000 characters", () => {
      assert.throws(() => {
        createTaskNoteSchema.parse({ content: "x".repeat(3001) });
      });
    });
  });

  describe("updateTaskNoteSchema", () => {
    test("validates updated note content", () => {
      const res = updateTaskNoteSchema.parse({
        content: "Corrected note: client prefers 5kW over 3kW.",
      });

      assert.equal(res.content, "Corrected note: client prefers 5kW over 3kW.");
    });

    test("fails when updated content is empty or whitespace", () => {
      assert.throws(() => {
        updateTaskNoteSchema.parse({ content: "   " });
      });
    });
  });
});
