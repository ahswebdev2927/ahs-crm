import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { departments, roles, permissions, rolePermissions, teams, users, leadStages, leads, leadStageHistory, leadPartners, sessions, userPermissions } from "./schema";
import * as bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  // Turn off foreign keys temporarily for clean re-seeding
  await db.run(sql`PRAGMA foreign_keys = OFF;`);

  console.log("Clearing existing tables...");
  await db.delete(sessions);
  await db.delete(userPermissions);
  await db.delete(leadPartners);
  await db.delete(leadStageHistory);
  await db.delete(leads);
  await db.delete(leadStages);
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
      dataVisibility: "own" as const,
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

  // 7. Seed Lead Stages
  console.log("Seeding default lead stages...");
  const leadStageRecords = [
    { id: 1, name: "New Lead", code: "new", color: "#3b82f6", order: 1, description: "Newly captured inbound or self-generated lead" },
    { id: 2, name: "Contacted", code: "contacted", color: "#8b5cf6", order: 2, description: "Initial contact or outreach completed" },
    { id: 3, name: "Qualified", code: "qualified", color: "#06b6d4", order: 3, description: "Lead requirements and budget verified" },
    { id: 4, name: "Meeting Scheduled", code: "meeting", color: "#eab308", order: 4, description: "Appointment or site visit scheduled" },
    { id: 5, name: "Proposal Sent", code: "proposal", color: "#f97316", order: 5, description: "Quotation or proposal provided to prospect" },
    { id: 6, name: "Negotiation", code: "negotiation", color: "#ec4899", order: 6, description: "Contract terms and pricing under negotiation" },
    { id: 7, name: "Won", code: "won", color: "#22c55e", order: 7, description: "Deal successfully closed and won" },
    { id: 8, name: "Lost", code: "lost", color: "#ef4444", order: 8, description: "Deal lost or cancelled" },
  ];
  await db.insert(leadStages).values(leadStageRecords);

  // 8. Seed Sample Leads
  console.log("Seeding sample leads...");
  const sampleLeads = [
    {
      id: "lead-001",
      name: "Acme Logistics Expansion",
      company: "Acme Logistics Ltd",
      phone: "+1 555-0192",
      email: "contact@acmelogistics.com",
      source: "Website",
      requirements: "Requires commercial HVAC maintenance and air duct sanitization across 3 warehouses.",
      notes: "Initial inquiry received from web form.",
      priority: "high" as const,
      ownerId: "user-inside",
      createdById: "user-inside",
      stageId: 1, // New Lead
      status: "active" as const,
    },
    {
      id: "lead-002",
      name: "Apex Tower Facility Retrofit",
      company: "Apex Properties",
      phone: "+1 555-0143",
      email: "facilities@apexprop.com",
      source: "Referral",
      requirements: "Complete building chillers replacement and ongoing monthly service plan.",
      notes: "Site visit requested by VP of Facilities.",
      priority: "critical" as const,
      ownerId: "user-field",
      createdById: "user-field",
      stageId: 3, // Qualified
      status: "active" as const,
    },
    {
      id: "lead-003",
      name: "Starlight Retail Outlet Inspection",
      company: "Starlight Retail Group",
      phone: "+1 555-0188",
      email: "procurement@starlight.com",
      source: "Campaign",
      requirements: "Annual fire safety and electrical audit across 5 store locations.",
      notes: "Proposal draft ready for client review.",
      priority: "medium" as const,
      ownerId: "user-inside",
      createdById: "user-inside",
      stageId: 5, // Proposal Sent
      status: "active" as const,
    },
    {
      id: "lead-004",
      name: "Green Valley Tech Park Contract",
      company: "Green Valley Real Estate",
      phone: "+1 555-0177",
      email: "info@greenvalleytp.com",
      source: "Inside Sales",
      requirements: "Comprehensive quarterly HVAC & plumbing contract.",
      notes: "Negotiating discount structure for multi-year contract term.",
      priority: "high" as const,
      ownerId: "user-manager",
      createdById: "user-inside",
      stageId: 6, // Negotiation
      status: "active" as const,
    },
  ];
  await db.insert(leads).values(sampleLeads);

  // 9. Seed Initial Stage History
  console.log("Seeding initial stage history...");
  const sampleHistory = [
    {
      id: "history-001",
      leadId: "lead-002",
      fromStageId: 1, // New Lead
      toStageId: 3,   // Qualified
      changedById: "user-field",
      reason: "Verified requirements and budget during preliminary call.",
    },
    {
      id: "history-002",
      leadId: "lead-003",
      fromStageId: 1, // New Lead
      toStageId: 5,   // Proposal Sent
      changedById: "user-inside",
      reason: "Sent standard commercial proposal.",
    },
  ];
  await db.insert(leadStageHistory).values(sampleHistory);

  console.log("Database seeded successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Database seeding failed:", err);
    process.exit(1);
  });
