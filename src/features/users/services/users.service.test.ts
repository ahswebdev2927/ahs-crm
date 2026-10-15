import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UsersRepository } from "../repositories/users.repository";

describe("Users Repository & Service Unit Tests", () => {
  it("fetches roles with attached default permissions and permissionIds", async () => {
    const rolesList = await UsersRepository.getRoles();
    assert.ok(rolesList.length > 0);

    const superAdmin = rolesList.find((r) => r.code === "super_admin");
    assert.ok(superAdmin);
    assert.ok(Array.isArray(superAdmin.permissions));
    assert.ok(superAdmin.permissions.includes("team:view"));

    const salesManager = rolesList.find((r) => r.code === "sales_manager");
    assert.ok(salesManager);
    assert.ok(salesManager.permissions.includes("team:view"));
    assert.ok(salesManager.permissions.includes("team:edit"));

    const insideSales = rolesList.find((r) => r.code === "inside_sales");
    assert.ok(insideSales);
    assert.ok(insideSales.permissions.includes("leads:view"));
    assert.ok(!insideSales.permissions.includes("team:view"));
  });

  it("retrieves available managers with role and team details", async () => {
    const managers = await UsersRepository.getAvailableManagers();
    assert.ok(Array.isArray(managers));
    const marcus = managers.find((m) => m.name === "Marcus Vance");
    assert.ok(marcus);
    assert.strictEqual(marcus.roleName, "Sales Manager");
  });
});
