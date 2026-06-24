/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drizzle Schema — definiții ORM pentru toate tabelele
 * 
 * Rulează: npx drizzle-kit generate --config server/db/drizzle.config.ts
 */

import { pgTable, uuid, varchar, integer, boolean, jsonb, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  dogWalkEnabled: boolean("dog_walk_enabled").default(false).notNull(),
  dogWalkWindows: jsonb("dog_walk_windows").default({ morning: { start: 6, end: 12 }, midday: { start: 11, end: 17 }, evening: { start: 16, end: 22 } }).notNull(),
  homeAssistantConfig: jsonb("home_assistant_config").default({}).notNull(),
  smtpConfig: jsonb("smtp_config").default({}).notNull(),
  subscriptionType: varchar("subscription_type", { length: 50 }).default("free").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const parents = pgTable("parents", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  pinHash: varchar("pin_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  familyIdx: index("idx_parents_family_id").on(table.familyId),
}));

export const children = pgTable("children", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  avatar: varchar("avatar", { length: 10 }).default("🐶").notNull(),
  birthYear: integer("birth_year").notNull(),
  points: integer("points").default(0).notNull(),
  readingStreak: integer("reading_streak").default(0).notNull(),
  daysSinceLastReading: integer("days_since_last_reading").default(0).notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).default("chore").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  points: integer("points").default(0).notNull(),
  photoUrl: text("photo_url"),
  aiFeedback: text("ai_feedback"),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const rewards = pgTable("rewards", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  costPoints: integer("cost_points").notNull(),
  durationMinutes: integer("duration_minutes").default(0).notNull(),
  icon: varchar("icon", { length: 10 }).default("🎁").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pointTransactions = pgTable("point_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const readingHistory = pgTable("reading_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  topic: varchar("topic", { length: 255 }).notNull(),
  wordCount: integer("word_count").default(0).notNull(),
  score: integer("score").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const syncQueue = pgTable("sync_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  payload: jsonb("payload").default({}).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  lastError: text("last_error"),
  version: integer("version").default(1).notNull(),
  deviceId: varchar("device_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").references(() => families.id, { onDelete: "set null" }),
  childId: uuid("child_id").references(() => children.id, { onDelete: "set null" }),
  eventName: varchar("event_name", { length: 100 }).notNull(),
  properties: jsonb("properties").default({}).notNull(),
  source: varchar("source", { length: 50 }).default("web").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_analytics_events_name").on(table.eventName),
  familyIdx: index("idx_analytics_events_family").on(table.familyId),
  createdIdx: index("idx_analytics_events_created").on(table.createdAt),
}));

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").references(() => families.id, { onDelete: "set null" }),
  parentId: uuid("parent_id").references(() => parents.id, { onDelete: "set null" }),
  childId: uuid("child_id").references(() => children.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  familyCreatedIdx: index("idx_audit_log_family").on(table.familyId, table.createdAt),
}));

export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  deviceName: varchar("device_name", { length: 255 }),
  platform: varchar("platform", { length: 50 }).default("web"),
  lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueDevice: uniqueIndex("idx_devices_family_device").on(table.familyId, table.deviceId),
}));
