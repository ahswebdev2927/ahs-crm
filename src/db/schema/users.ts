import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const departments = sqliteTable('departments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const roles = sqliteTable('roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  description: text('description'),
  departmentId: integer('department_id').references(() => departments.id, { onDelete: 'set null' }),
  parentId: integer('parent_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('roles_department_id_idx').on(t.departmentId),
]);

export const permissions = sqliteTable('permissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const rolePermissions = sqliteTable('role_permissions', {
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  primaryKey({ columns: [t.roleId, t.permissionId] }),
]);

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  roleId: integer('role_id').notNull().references(() => roles.id),
  departmentId: integer('department_id').references(() => departments.id, { onDelete: 'set null' }),
  dataVisibility: text('data_visibility', { enum: ['own', 'shared', 'partnered', 'team', 'all'] }).notNull().default('own'),
  status: text('status', { enum: ['active', 'inactive', 'suspended'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
}, (t) => [
  index('users_email_idx').on(t.email),
  index('users_role_id_idx').on(t.roleId),
  index('users_department_id_idx').on(t.departmentId),
]);

export const userPermissions = sqliteTable('user_permissions', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['allow', 'deny'] }).notNull().default('allow'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  primaryKey({ columns: [t.userId, t.permissionId] }),
]);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // Session Token
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  expiresAt: integer('expires_at').notNull(), // Epoch Ms
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('sessions_user_id_idx').on(t.userId),
]);

// Relational Definitions
export const departmentsRelations = relations(departments, ({ many }) => ({
  roles: many(roles),
  users: many(users),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  department: one(departments, {
    fields: [roles.departmentId],
    references: [departments.id],
  }),
  parent: one(roles, {
    fields: [roles.parentId],
    references: [roles.id],
  }),
  users: many(users),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userPermissions: many(userPermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  userPermissions: many(userPermissions),
  sessions: many(sessions),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
  permission: one(permissions, {
    fields: [userPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
