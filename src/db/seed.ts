import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { departments, roles, permissions, rolePermissions, teams, users } from "./schema";
import * as bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  // 1. Clean existing tables in correct order to avoid foreign key violations
  console.log("Clearing existing authorization tables...");
  await db.delete(rolePermissions);
  await db.delete(users);
  await db.delete(teams);
  await db.delete(roles);
  await db.delete(departments);
  await db.delete(permissions);

  // 2. Seed departments
  console.log("Seeding departments...");
  const departmentRecords = [
    { id: 1, name: "Sales", code: "sales", description: "Core internal sales department" },
  ];
  await db.insert(departments).values(departmentRecords);

  // 3. Seed default roles with isManager flag
  console.log("Seeding default roles...");
  const roleRecords = [
    { id: 1, name: "Super Admin", code: "super_admin", description: "Full system administration access", departmentId: 1, isManager: false },
    { id: 2, name: "Sales Manager", code: "sales_manager", description: "Manages sales operations, assigns leads, and owns a sales team", departmentId: 1, isManager: true },
    { id: 3, name: "Inside Sales", code: "inside_sales", description: "In-office sales: creates leads, schedules visits and appointments", departmentId: 1, parentId: 2, isManager: false },
    { id: 4, name: "Field Sales", code: "field_sales", description: "Field agent: conducts site visits and uploads visit reports", departmentId: 1, parentId: 2, isManager: false },
  ];
  await db.insert(roles).values(roleRecords);

  // 4. Seed default permissions
  console.log("Seeding default permissions...");
  const ALL_PERMISSIONS = [
    { code: "dashboard:view", name: "View Dashboard", description: "Access the CRM landing dashboard" },
    { code: "leads:view", name: "View Leads", description: "Access leads list and lead details" },
    { code: "leads:create", name: "Create Leads", description: "Create a new lead" },
    { code: "leads:edit", name: "Edit Leads", description: "Modify lead profile and details" },
    { code: "pipeline:view", name: "View Pipeline", description: "Access the pipeline Kanban board" },
    { code: "followups:view", name: "View Follow-ups", description: "Access follow-up schedules" },
    { code: "followups:create", name: "Create Follow-ups", description: "Create a new follow-up callback" },
    { code: "appointments:view", name: "View Appointments", description: "Access appointment list" },
    { code: "appointments:create", name: "Create Appointments", description: "Schedule a field visit appointment" },
    { code: "tasks:view", name: "View Tasks", description: "Access personal tasks list" },
    { code: "tasks:create", name: "Create Tasks", description: "Create a new action task" },
    { code: "customers:view", name: "View Customers", description: "Access client/customer details" },
    { code: "services:view", name: "View Services", description: "View the service catalog" },
    { code: "quotations:view", name: "View Quotations", description: "Access billing quotes" },
    { code: "quotations:create", name: "Create Quotations", description: "Generate billing quotes" },
    { code: "invoices:view", name: "View Invoices", description: "Access client invoice structures" },
    { code: "invoices:create", name: "Generate Invoices", description: "Create and issue billing invoices (Sales Manager & Admin only)" },
    { code: "payments:view", name: "View Payments", description: "Access transactions record ledger" },
    { code: "payments:create", name: "Add/Receive Payments", description: "Record customer payment receipts" },
    { code: "reports:view", name: "View Reports", description: "Access performance analytics reports" },
    { code: "notifications:view", name: "View Notifications", description: "Access alerts notification history" },
    { code: "team:view", name: "View Team Management", description: "Access team member directory" },
    { code: "team:edit", name: "Manage Team Members", description: "Create, edit, suspend, and configure team member accounts and permissions" },
    { code: "settings:view", name: "View Settings", description: "Access SuperAdmin global preferences" },
  ];

  const permissionRecords = ALL_PERMISSIONS.map((p, index) => ({
    id: index + 1,
    code: p.code,
    name: p.name,
    description: p.description,
  }));
  await db.insert(permissions).values(permissionRecords);

  // Helper to fetch permission IDs by codes
  const permMap = new Map<string, number>();
  permissionRecords.forEach((p) => permMap.set(p.code, p.id));

  // 5. Seed Role Permissions
  console.log("Seeding role permissions...");
  const rolePermissionsToInsert: any[] = [];

  const rolesConfig = [
    {
      roleId: 1, // super_admin
      permissions: permissionRecords.map((p) => p.code), // all
    },
    {
      roleId: 2, // sales_manager
      permissions: permissionRecords.map((p) => p.code).filter((c) => c !== "settings:view"), // all except settings
    },
    {
      roleId: 3, // inside_sales
      permissions: [
        "dashboard:view",
        "leads:view",
        "leads:create",
        "leads:edit",
        "pipeline:view",
        "followups:view",
        "followups:create",
        "appointments:view",
        "tasks:view",
        "tasks:create",
        "customers:view",
        "services:view",
        "quotations:view",
        "quotations:create",
        "invoices:view",
        "payments:view",
        "payments:create",
        "notifications:view",
      ],
    },
    {
      roleId: 4, // field_sales
      permissions: [
        "dashboard:view",
        "leads:view",
        "leads:create",
        "leads:edit",
        "pipeline:view",
        "followups:view",
        "followups:create",
        "appointments:view",
        "appointments:create",
        "tasks:view",
        "customers:view",
        "services:view",
        "quotations:view",
        "invoices:view",
        "payments:view",
        "payments:create",
        "notifications:view",
      ],
    },
  ];

  rolesConfig.forEach((cfg) => {
    cfg.permissions.forEach((code) => {
      const permissionId = permMap.get(code);
      if (permissionId) {
        rolePermissionsToInsert.push({
          roleId: cfg.roleId,
          permissionId,
        });
      }
    });
  });

  await db.insert(rolePermissions).values(rolePermissionsToInsert);

  // 6. Seed Initial Users & Teams
  console.log("Hashing default passwords...");
  const passwordHash = await bcrypt.hash("Password123!", 10);

  console.log("Seeding default users...");
  // First insert Marcus Vance (Sales Manager) so teams record can reference him
  const managerUser = {
    id: "user-manager",
    name: "Marcus Vance",
    email: "marcus.vance@ahs-crm.com",
    passwordHash,
    roleId: 2, // sales_manager
    departmentId: 1, // Sales
    dataVisibility: "team" as const,
    status: "active" as const,
  };
  await db.insert(users).values([managerUser]);

  console.log("Seeding Sales Team Alpha...");
  const teamAlpha = {
    id: 1,
    name: "Sales Team Alpha",
    code: "sales_alpha",
    departmentId: 1,
    managerId: "user-manager",
  };
  await db.insert(teams).values([teamAlpha]);

  // Update Marcus Vance with his owned teamId
  await db.update(users).set({ teamId: 1 }).where(eq(users.id, "user-manager"));

  // Insert remaining users linked to Team Alpha & Manager Marcus Vance
  const otherUsers = [
    {
      id: "user-admin",
      name: "Alex Thorne",
      email: "alex.thorne@ahs-crm.com",
      passwordHash,
      roleId: 1, // super_admin
      departmentId: 1, // Sales
      dataVisibility: "all" as const,
      status: "active" as const,
    },
    {
      id: "user-inside",
      name: "Sarah Jenkins",
      email: "sarah.j@ahs-crm.com",
      passwordHash,
      roleId: 3, // inside_sales
      departmentId: 1, // Sales
      teamId: 1, // Sales Team Alpha
      managerId: "user-manager", // Managed by Marcus Vance
      dataVisibility: "team" as const,
      status: "active" as const,
    },
    {
      id: "user-field",
      name: "David Miller",
      email: "david.m@ahs-crm.com",
      passwordHash,
      roleId: 4, // field_sales
      departmentId: 1, // Sales
      teamId: 1, // Sales Team Alpha
      managerId: "user-manager", // Managed by Marcus Vance
      dataVisibility: "own" as const,
      status: "active" as const,
    },
  ];

  await db.insert(users).values(otherUsers);

  console.log("Database seeded successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Database seeding failed:", err);
    process.exit(1);
  });
