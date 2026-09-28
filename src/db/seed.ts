import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { departments, roles, permissions, rolePermissions, teams, users, leadStages, leads, leadStageHistory, leadPartners, sessions, userPermissions, appointments, followUps, fieldVisits, customers, services } from "./schema";
import * as bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  // Turn off foreign keys temporarily for clean re-seeding
  await db.run(sql`PRAGMA foreign_keys = OFF;`);

  console.log("Clearing existing tables...");
  await db.delete(fieldVisits);
  await db.delete(appointments);
  await db.delete(followUps);
  await db.delete(customers);
  await db.delete(services);
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

  // 8. Seed Sample Leads (3 leads per user across all 4 system users)
  console.log("Seeding sample leads (3 per user)...");
  const sampleLeads = [
    // --- Super Admin Leads (Alex Thorne - user-admin) ---
    {
      id: "lead-admin-001",
      name: "Enterprise Operations Center Upgrade",
      company: "Apex Global Holdings",
      phone: "+1 555-0101",
      email: "ops@apexholdings.com",
      source: "Website",
      requirements: "Complete enterprise facility HVAC automation and IoT monitoring system.",
      notes: "High-priority strategic lead created by Super Admin.",
      priority: "high" as const,
      ownerId: "user-admin",
      createdById: "user-admin",
      stageId: 1, // New Lead
      position: 0,
      status: "active" as const,
    },
    {
      id: "lead-admin-002",
      name: "Global Logistics Hub Maintenance",
      company: "TransGlobal Freight Corp",
      phone: "+1 555-0102",
      email: "facilities@transglobal.com",
      source: "Referral",
      requirements: "Annual preventive maintenance contract across 4 regional fulfillment centers.",
      notes: "Budget approved by board of directors.",
      priority: "critical" as const,
      ownerId: "user-admin",
      createdById: "user-admin",
      stageId: 3, // Qualified
      position: 0,
      status: "active" as const,
    },
    {
      id: "lead-admin-003",
      name: "Metro Tower Energy Optimization",
      company: "Metro Commercial Properties",
      phone: "+1 555-0103",
      email: "energy@metrotower.com",
      source: "Campaign",
      requirements: "Chiller retrofitting and smart thermostat network installation.",
      notes: "Contract signed and converted successfully.",
      priority: "medium" as const,
      ownerId: "user-admin",
      createdById: "user-admin",
      stageId: 7, // Won
      position: 0,
      status: "active" as const,
    },

    // --- Sales Manager Leads (Marcus Vance - user-manager) ---
    {
      id: "lead-mgr-001",
      name: "Green Valley Tech Park Contract",
      company: "Green Valley Real Estate",
      phone: "+1 555-0177",
      email: "info@greenvalleytp.com",
      source: "Inside Sales",
      requirements: "Comprehensive quarterly HVAC & plumbing maintenance contract.",
      notes: "Negotiating discount structure for 3-year contract term.",
      priority: "high" as const,
      ownerId: "user-manager",
      createdById: "user-inside",
      stageId: 6, // Negotiation
      position: 0,
      status: "active" as const,
    },
    {
      id: "lead-mgr-002",
      name: "Horizon Data Center Cooling Upgrade",
      company: "Horizon Infrastructure Inc",
      phone: "+1 555-0202",
      email: "tech@horizoninfra.com",
      source: "Referral",
      requirements: "Precision liquid cooling units and redundant backup generators.",
      notes: "Technical evaluation meeting scheduled with field engineer.",
      priority: "critical" as const,
      ownerId: "user-manager",
      createdById: "user-manager",
      stageId: 4, // Meeting Scheduled
      position: 0,
      status: "active" as const,
    },
    {
      id: "lead-mgr-003",
      name: "Beacon Health Campus Audit",
      company: "Beacon Healthcare System",
      phone: "+1 555-0203",
      email: "procurement@beaconhealth.org",
      source: "Website",
      requirements: "Hospital cleanroom air filtration compliance audit and filter replacement.",
      notes: "First phone call completed, waiting for hospital board decision.",
      priority: "low" as const,
      ownerId: "user-manager",
      createdById: "user-manager",
      stageId: 2, // Contacted
      position: 0,
      status: "active" as const,
    },

    // --- Inside Sales Leads (Sarah Jenkins - user-inside) ---
    {
      id: "lead-ins-001",
      name: "Acme Logistics Expansion",
      company: "Acme Logistics Ltd",
      phone: "+1 555-0192",
      email: "contact@acmelogistics.com",
      source: "Website",
      requirements: "Commercial HVAC maintenance and air duct sanitization across 3 warehouses.",
      notes: "Initial inquiry received from web form.",
      priority: "high" as const,
      ownerId: "user-inside",
      createdById: "user-inside",
      stageId: 1, // New Lead
      position: 1,
      status: "active" as const,
    },
    {
      id: "lead-ins-002",
      name: "Starlight Retail Outlet Inspection",
      company: "Starlight Retail Group",
      phone: "+1 555-0188",
      email: "procurement@starlight.com",
      source: "Campaign",
      requirements: "Annual fire safety and electrical audit across 5 store locations.",
      notes: "Proposal draft sent for executive review.",
      priority: "medium" as const,
      ownerId: "user-inside",
      createdById: "user-inside",
      stageId: 5, // Proposal Sent
      position: 0,
      status: "active" as const,
    },
    {
      id: "lead-ins-003",
      name: "Pinnacle Commercial Plaza HVAC",
      company: "Pinnacle Development Co",
      phone: "+1 555-0303",
      email: "pinnacle@pinnacledev.com",
      source: "Inside Sales",
      requirements: "Rooftop HVAC replacements and smart thermostat integration.",
      notes: "Initial phone outreach completed, awaiting technical specs.",
      priority: "medium" as const,
      ownerId: "user-inside",
      createdById: "user-inside",
      stageId: 2, // Contacted
      position: 1,
      status: "active" as const,
    },

    // --- Field Sales Leads (David Miller - user-field) ---
    {
      id: "lead-fld-001",
      name: "Apex Tower Facility Retrofit",
      company: "Apex Properties",
      phone: "+1 555-0143",
      email: "facilities@apexprop.com",
      source: "Referral",
      requirements: "Complete building chillers replacement and ongoing monthly service plan.",
      notes: "Site visit conducted by Field Agent David Miller.",
      priority: "critical" as const,
      ownerId: "user-field",
      createdById: "user-field",
      stageId: 3, // Qualified
      position: 1,
      status: "active" as const,
    },
    {
      id: "lead-fld-002",
      name: "Vanguard Manufacturing Facility Audit",
      company: "Vanguard Industrial Ltd",
      phone: "+1 555-0402",
      email: "plant@vanguardmfg.com",
      source: "Field Sales",
      requirements: "Heavy machinery ventilation upgrade and dust collection system.",
      notes: "On-site inspection appointment confirmed for next Tuesday.",
      priority: "high" as const,
      ownerId: "user-field",
      createdById: "user-field",
      stageId: 4, // Meeting Scheduled
      position: 1,
      status: "active" as const,
    },
    {
      id: "lead-fld-003",
      name: "Summit Heights Apartments Service",
      company: "Summit Residential Group",
      phone: "+1 555-0403",
      email: "manager@summitheights.com",
      source: "Field Sales",
      requirements: "Boiler replacement for 120-unit residential building complex.",
      notes: "Prospect chose competing vendor due to budget constraints.",
      priority: "low" as const,
      ownerId: "user-field",
      createdById: "user-field",
      stageId: 8, // Lost
      position: 0,
      status: "active" as const,
    },
  ];
  await db.insert(leads).values(sampleLeads);

  // 9. Seed Initial Stage History
  console.log("Seeding initial stage history...");
  const sampleHistory = [
    {
      id: "history-001",
      leadId: "lead-fld-001",
      fromStageId: 1, // New Lead
      toStageId: 3,   // Qualified
      changedById: "user-field",
      reason: "Verified requirements and budget during preliminary site visit.",
    },
    {
      id: "history-002",
      leadId: "lead-ins-002",
      fromStageId: 1, // New Lead
      toStageId: 5,   // Proposal Sent
      changedById: "user-inside",
      reason: "Prepared and emailed standard commercial proposal.",
    },
    {
      id: "history-003",
      leadId: "lead-mgr-001",
      fromStageId: 5, // Proposal Sent
      toStageId: 6,   // Negotiation
      changedById: "user-manager",
      reason: "Prospect requested custom pricing terms for multi-year contract.",
    },
    {
      id: "history-004",
      leadId: "lead-admin-003",
      fromStageId: 6, // Negotiation
      toStageId: 7,   // Won
      changedById: "user-admin",
      reason: "Contract executed and initial deposit received.",
    },
  ];
  await db.insert(leadStageHistory).values(sampleHistory);

  // 10. Seed Sample Lead Partnerships
  console.log("Seeding sample lead partnerships...");
  const samplePartnerships = [
    {
      id: "partner-001",
      leadId: "lead-mgr-001",
      partnerId: "user-inside",
      percentage: 30,
      role: "collaborator" as const,
      status: "active" as const,
      addedById: "user-manager",
    },
    {
      id: "partner-002",
      leadId: "lead-fld-001",
      partnerId: "user-inside",
      percentage: 40,
      role: "technical_sales" as const,
      status: "active" as const,
      addedById: "user-field",
    },
  ];
  await db.insert(leadPartners).values(samplePartnerships);

  // 11. Seed Sample Customers
  console.log("Seeding sample customers...");
  const sampleCustomers = [
    {
      id: "cust-001",
      leadId: "lead-admin-003",
      name: "Metro Commercial Properties",
      company: "Metro Commercial Properties",
      phone: "+1 555-0103",
      email: "energy@metrotower.com",
      address: "500 Metro Boulevard, Suite 1200",
      status: "active" as const,
      ownerId: "user-admin",
    },
    {
      id: "cust-002",
      name: "Apex Global Holdings",
      company: "Apex Global Holdings",
      phone: "+1 555-0101",
      email: "ops@apexholdings.com",
      address: "100 Corporate Parkway",
      status: "active" as const,
      ownerId: "user-manager",
    },
  ];
  await db.insert(customers).values(sampleCustomers);

  // 12. Seed Sample Appointments
  console.log("Seeding sample appointments...");
  const now = new Date();

  // Today 10am - 11am
  const today10am = new Date(now);
  today10am.setHours(10, 0, 0, 0);
  const today11am = new Date(now);
  today11am.setHours(11, 0, 0, 0);

  // Tomorrow 2pm - 3:30pm
  const tomorrow2pm = new Date(now);
  tomorrow2pm.setDate(tomorrow2pm.getDate() + 1);
  tomorrow2pm.setHours(14, 0, 0, 0);
  const tomorrow330pm = new Date(now);
  tomorrow330pm.setDate(tomorrow330pm.getDate() + 1);
  tomorrow330pm.setHours(15, 30, 0, 0);

  // In 3 days 11am - 12pm
  const in3days11am = new Date(now);
  in3days11am.setDate(in3days11am.getDate() + 3);
  in3days11am.setHours(11, 0, 0, 0);
  const in3days12pm = new Date(now);
  in3days12pm.setDate(in3days12pm.getDate() + 3);
  in3days12pm.setHours(12, 0, 0, 0);

  // Yesterday 9am - 10am (completed)
  const yesterday9am = new Date(now);
  yesterday9am.setDate(yesterday9am.getDate() - 1);
  yesterday9am.setHours(9, 0, 0, 0);
  const yesterday10am = new Date(now);
  yesterday10am.setDate(yesterday10am.getDate() - 1);
  yesterday10am.setHours(10, 0, 0, 0);

  const sampleAppointments = [
    {
      id: "appt-001",
      leadId: "lead-fld-002",
      title: "Vanguard Facility On-Site Assessment",
      description: "Inspect heavy machinery ventilation upgrade and measure industrial ducting capacity.",
      startTime: tomorrow2pm,
      endTime: tomorrow330pm,
      location: "Building 4, Industrial Zone East",
      status: "confirmed" as const,
      createdById: "user-inside",
      assignedToId: "user-field",
    },
    {
      id: "appt-002",
      leadId: "lead-mgr-002",
      title: "Data Center Liquid Cooling Technical Review",
      description: "Review precision liquid cooling units & backup generator specs with facility engineers.",
      startTime: today10am,
      endTime: today11am,
      location: "Horizon Data Hub, Tech Corridor",
      status: "scheduled" as const,
      createdById: "user-manager",
      assignedToId: "user-field",
    },
    {
      id: "appt-003",
      leadId: "lead-fld-001",
      title: "Apex Tower Final HVAC Retrofit Sign-off",
      description: "Final site review before commercial proposal issuance.",
      startTime: in3days11am,
      endTime: in3days12pm,
      location: "Apex Tower, 12th Floor",
      status: "scheduled" as const,
      createdById: "user-field",
      assignedToId: "user-field",
    },
    {
      id: "appt-004",
      customerId: "cust-001",
      title: "Metro Tower Quarterly Service Inspection",
      description: "Routine quarterly chiller retrofitting verification and thermostat calibration.",
      startTime: yesterday9am,
      endTime: yesterday10am,
      location: "500 Metro Boulevard",
      status: "completed" as const,
      createdById: "user-admin",
      assignedToId: "user-field",
    },
  ];
  await db.insert(appointments).values(sampleAppointments);

  // 13. Seed Sample Follow-ups
  console.log("Seeding sample follow-ups...");
  const sampleFollowUps = [
    {
      id: "followup-001",
      leadId: "lead-ins-001",
      scheduledAt: tomorrow2pm,
      type: "call" as const,
      notes: "Call client to confirm warehouse floor plans and technical requirement document.",
      status: "scheduled" as const,
      createdById: "user-inside",
      assignedToId: "user-inside",
    },
    {
      id: "followup-002",
      leadId: "lead-mgr-001",
      scheduledAt: today10am,
      type: "meeting" as const,
      notes: "Negotiation follow-up call regarding multi-year contract discount structure.",
      status: "scheduled" as const,
      createdById: "user-manager",
      assignedToId: "user-manager",
    },
    {
      id: "followup-003",
      leadId: "lead-ins-002",
      scheduledAt: in3days11am,
      type: "email" as const,
      notes: "Send updated proposal revisions per client procurement feedback.",
      status: "scheduled" as const,
      createdById: "user-inside",
      assignedToId: "user-inside",
    },
  ];
  await db.insert(followUps).values(sampleFollowUps);

  // 14. Seed Sample Field Visits
  console.log("Seeding sample field visits...");
  const sampleFieldVisits = [
    {
      id: "visit-001",
      leadId: "lead-fld-002",
      appointmentId: "appt-001",
      visitDate: tomorrow2pm,
      purpose: "Inspect heavy machinery ventilation upgrade and measure industrial ducting capacity.",
      summary: "Preliminary site inspection planned with facility supervisor.",
      outcome: null,
      feedback: null,
      requirements: "Heavy-duty exhaust fans, 4000 CFM ductwork, and custom mounting brackets.",
      nextAction: "proposal" as const,
      nextActionDate: in3days11am,
      expenses: 1500, // $15.00
      status: "scheduled" as const,
      createdById: "user-inside",
      assignedToId: "user-field",
    },
    {
      id: "visit-002",
      leadId: "lead-mgr-002",
      appointmentId: "appt-002",
      visitDate: today10am,
      purpose: "Technical review of precision liquid cooling & backup generators.",
      summary: "Field visit in progress to evaluate server rack spatial constraints.",
      outcome: "Interested",
      feedback: "Client requested detailed quote for dual redundant cooling system.",
      requirements: "30KW in-row precision cooling with N+1 redundancy.",
      nextAction: "proposal" as const,
      nextActionDate: tomorrow2pm,
      expenses: 2500, // $25.00
      status: "scheduled" as const,
      createdById: "user-manager",
      assignedToId: "user-field",
    },
    {
      id: "visit-003",
      customerId: "cust-001",
      appointmentId: "appt-004",
      visitDate: yesterday9am,
      purpose: "Quarterly chiller retrofitting verification and thermostat calibration.",
      summary: "Completed quarterly site inspection and routine maintenance audit.",
      outcome: "Satisfied",
      feedback: "All chillers operating within normal parameters. Filter replaced.",
      requirements: "Annual service agreement renewal coming up in 3 months.",
      nextAction: "follow_up" as const,
      nextActionDate: in3days11am,
      expenses: 1200, // $12.00
      status: "completed" as const,
      createdById: "user-admin",
      assignedToId: "user-field",
    },
  ];
  await db.insert(fieldVisits).values(sampleFieldVisits);

  console.log("Database seeded successfully with users, teams, leads, customers, appointments, follow-ups, and field visits!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Database seeding failed:", err);
    process.exit(1);
  });
