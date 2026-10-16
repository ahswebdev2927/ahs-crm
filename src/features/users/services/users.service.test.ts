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

  it("ensures SuperAdmin (MD) has null managerId and 'all' dataVisibility on creation & update", async () => {
    const rolesList = await UsersRepository.getRoles();
    const superAdminRole = rolesList.find((r) => r.code === "super_admin");
    assert.ok(superAdminRole);

    const testAdminId = `test-admin-${Date.now()}`;
    const created = await UsersRepository.createUser({
      id: testAdminId,
      name: "Executive MD Test",
      email: `${testAdminId}@ahs-crm.com`,
      passwordHash: "dummyhash",
      roleId: superAdminRole.id,
      managerId: "should-be-stripped-for-superadmin",
      dataVisibility: "own",
    });

    assert.strictEqual(created.managerId, null, "SuperAdmin must never have an assigned manager");
    assert.strictEqual(created.dataVisibility, "all", "SuperAdmin must have 'all' data visibility");

    const updated = await UsersRepository.updateUser(testAdminId, {
      name: "Executive MD Updated",
      managerId: "should-be-stripped-again",
      dataVisibility: "team",
    });

    assert.strictEqual(updated.managerId, null, "SuperAdmin must retain null managerId after update");
    assert.strictEqual(updated.dataVisibility, "all", "SuperAdmin must retain 'all' dataVisibility after update");
  });
});
