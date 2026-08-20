import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const rateLimits = sqliteTable('rate_limits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull(),
  timestamp: integer('timestamp').notNull(), // epoch ms
  expiresAt: integer('expires_at').notNull(), // epoch ms
}, (t) => [
  index('rate_limits_key_timestamp_idx').on(t.key, t.timestamp),
  index('rate_limits_expires_at_idx').on(t.expiresAt),
]);
