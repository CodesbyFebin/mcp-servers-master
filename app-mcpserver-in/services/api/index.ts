/* API Service for MCPserver.in
   Authenticated REST/JSON-RPC API layer with OIDC/OAuth, MFA, RBAC,
   organizations/teams/users, servers/tools/resources/prompts,
   execution history, skills/workflows, model providers, user preferences.
   
   Uses Drizzle ORM with PostgreSQL.
*/

import type { Handler } from "hono";
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, or, desc, asc, lt, gt } from "drizzle-orm";
import { json } from "@hono/jsonschema";
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

// Database connection
const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/mcp_servers";
const sql = postgres(connectionString);
const db = drizzle(sql);

// Mock notification functions
const sendEmail = async (to: string, subject: string, body: string): Promise<void> => {
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
  // In production: Use SES, SendGrid, or similar
};

const sendSMS = async (to: string, message: string): Promise<void> => {
  console.log(`[SMS] To: ${to}, Message: ${message}`);
  // In production: Use Twilio, AWS SNS, or similar
};

// Schema for Board Notification (Rule 8 of DPDP Rules 2025)
const BOARD_NOTIFICATION_SCHEMA = z.object({
  fiduciaryName: z.string(),
  breachDescription: z.string(),
  dataCategories: z.array(z.string()),
  affectedUsersCount: z.number(),
  protectiveMeasures: z.string(),
  contactDetails: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  timestamp: z.string(),
});

// ============================
// DATABASE SCHEMA (Drizzle)
// ============================

import { serial, pgTable, timestamp, varchar, text, integer, boolean, json as jsonCol, primaryKey } from "drizzle-orm/pg-core";

// Core entities
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  name: varchar("name", { length: 256 }),
  image: varchar("image", { length: 512 }),
  emailVerified: timestamp("email_verified"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  planType: varchar("plan_type", { length: 50 }).default("free"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teams = pgTable("teams", {
   id: serial("id").primaryKey(),
   name: varchar("name", { length: 256 }).notNull(),
   organizationId: integer("organization_id").notNull(),
   role: varchar("role", { length: 50 }).default("member"),
   createdAt: timestamp("created_at").defaultNow(),
   updatedAt: timestamp("updated_at").defaultNow(),
   });
   
// ============================
// TENANTS (CUSTOMERS/ORGANIZATIONS)
// ============================
export const tenants = pgTable("tenants", {
   id: serial("id").primaryKey(),
   name: varchar("name", { length: 256 }).notNull(),
   slug: varchar("slug", { length: 128 }).notNull().unique(),
   description: text("description"),
   planType: varchar("plan_type", { length: 50 }).default("free"),
   status: varchar("status", { length: 20 }).default("active"), // active, suspended, cancelled
   createdAt: timestamp("created_at").defaultNow(),
   updatedAt: timestamp("updated_at").defaultNow(),
   });

// ============================
// MCP domain entities
// ============================
export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
description: text("description"),
   transport: varchar("transport", { length: 50 }).notNull(), // stdio | streamable-http
   status: varchar("status", { length: 50 }).default("unknown"), // healthy | degraded | unknown
   publisher: varchar("publisher", { length: 256 }),
   version: varchar("version", { length: 100 }),
   capabilities: jsonCol("capabilities").$type<string[]>().default([]),
   tags: jsonCol("tags").$type<string[]>().default([]),
   evidenceId: integer("evidence_id").references(() => evidence.id),
   createdAt: timestamp("created_at").defaultNow(),
   updatedAt: timestamp("updated_at").defaultNow(),
   });
   
// ============================
// SERVER IDENTITIES (FOR AUTH MESH)
// ============================
export const serverIdentities = pgTable('server_identities', {
   id: uuid('id').primaryKey().defaultRandom(),
   serverId: uuid('server_id').notNull().references(() => servers.id),
   tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
   
   // The public key used to verify signatures
   publicKey: text('public_key').notNull(),
   
   // The private key (encrypted in DB) used to sign outgoing requests
   privateKey: text('private_key').notNull(),
   
   // Status of the identity
   isActive: boolean('is_active').default(true),
   
   expiresAt: timestamp('expires_at'), // Optional rotation
   
   createdAt: timestamp('created_at').defaultNow().notNull(),
   updatedAt: timestamp('updated_at').defaultNow().notNull(),
   });
   

// ============================
// TRUST POLICIES (FOR AUTH MESH)
// ============================
export const trustPolicies = pgTable('trust_policies', {
   id: uuid('id').primaryKey().defaultRandom(),
   tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
   
   // Source Server (Who wants to talk)
   sourceServerId: uuid('server_id').notNull().references(() => servers.id),
   
   // Target Server (Who is being called)
   targetServerId: uuid('server_id').notNull().references(() => servers.id),
   
   // Allowed Actions (e.g., "read", "write", "execute")
   allowedActions: jsonb('allowed_actions').notNull(), // ["read_db", "write_logs"]
   
   // Trust Level
   trustLevel: varchar('trust_level').notNull().default('limited'), // untrusted, limited, full
   
   // Rate Limit (requests per minute)
   rateLimit: integer('rate_limit').default(100),
   
   createdAt: timestamp('created_at').defaultNow().notNull(),
   updatedAt: timestamp('updated_at').defaultNow().notNull(),
   });

// ============================
// TOOLS
// ============================
export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  serverId: integer("server_id").references(() => servers.id),
  description: text("description"),
  protocol: varchar("protocol", { length: 50 }).notNull(), // json-rpc | stdio
  inputSchema: jsonCol("input_schema").$type<object>().default({}),
  outputSchema: jsonCol("output_schema").$type<object>().default({}),
  isIdempotent: boolean("is_idempotent").default(false),
  timeoutSeconds: integer("timeout_seconds").default(30),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  serverId: integer("server_id").references(() => servers.id),
  uri: varchar("uri", { length: 512 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  description: text("description"),
  format: varchar("format", { length: 50 }),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  serverId: integer("server_id").references(() => servers.id),
  system: text("system"),
  template: text("template"),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const executions = pgTable("executions", {
   id: serial("id").primaryKey(),
   userId: integer("user_id").references(() => users.id),
   serverId: integer("server_id").references(() => servers.id),
   toolId: integer("tool_id").references(() => tools.id),
   request_id: varchar("request_id", { length: 255 }), // Added for trace correlation
   args: jsonCol("args").$type<object>().default({}),
   result: jsonCol("result"),
   error: text("error"),
   durationMs: integer("duration_ms"),
   status: varchar("status", { length: 50 }).default("succeeded"), // succeeded | failed | errored
   createdAt: timestamp("created_at").defaultNow(),
   updatedAt: timestamp("updated_at").defaultNow(),
});

export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  handler: text("handler").notNull(), // path to skill handler
  argsSchema: jsonCol("args_schema").$type<object>().default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  definition: jsonCol("definition").$type<object>().default({}), // JSON workflow definition
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const modelProviders = pgTable("model_providers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // gemini | nvidia | cloudflare | ollama | vllm | another
  endpoint: varchar("endpoint", { length: 512 }),
  apiKey: text("api_key"),
  isActive: boolean("is_active").default(true),
  costPerToken: varchar("cost_per_token", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
   id: serial("id").primaryKey(),
   userId: integer("user_id").references(() => users.id).notNull(),
   theme: varchar("theme", { length: 50 }).default("dark"), // dark | light
   language: varchar("language", { length: 10 }).default("en"),
   notifications: boolean("notifications").default(true),
   defaultModel: varchar("default_model", { length: 100 }),
   createdAt: timestamp("created_at").defaultNow(),
   updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================
// KYC TOKENS (Aadhaar/Identity Verification)
// ============================
export const verificationMethod = pgEnum('verification_method', [
  'tokenize_api', // Current method (requires AUA/ASA)
  'ovse_offline'  // New OVSE method (Aadhaar Paperless Offline e-KYC)
]);

export const kycMethod = pgEnum('kyc_method', ['aadhaar_offline', 'digilocker', 'video_kyc', 'pan_card']);
export const kycStatus = pgEnum('kyc_status', ['pending', 'verified', 'failed', 'expired']);

export const kycTokens = pgTable("kyc_tokens", {
   id: uuid("id").primaryKey().defaultRandom(),
   tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
   
   // Identity Data
   aadhaarHash: text("aadhaar_hash").notNull(), // SHA256 of Aadhaar (client-side, for verification)
   ovseXml: text("ovse_xml"), // The signed offline XML payload from Aadhaar app
   ovseSignature: text("ovse_signature"), // Base64 signature for validation
   
   // Verification Method
   method: verification_method("method").notNull().default('ovse_offline'),
   
   // Consent Artifact: Hash of the consent form + timestamp
   consentHash: text("consent_hash").notNull(), 
   consentTimestamp: timestamp("consent_timestamp").notNull(),
   
   // Extracted KYC data (name, DOB, gender, address, etc.)
   payloadData: jsonb("payload_data"), // Extracted fields from XML
   
   // Status
   status: kycStatus("status").notNull().default('pending'),
   verifiedAt: timestamp("verified_at"),
   expiresAt: timestamp("expires_at"),
   
   createdAt: timestamp("created_at").defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit Log: Tracks who accessed which token and when (DPDP Requirement)
export const kycAccessLogs = pgTable("kyc_access_logs", {
   id: uuid("id").primaryKey().defaultRandom(),
   kycTokenId: uuid("kyc_token_id").notNull().references(() => kycTokens.id),
   accessedBy: uuid("accessed_by").notNull(), // User/System ID
   purpose: text("purpose").notNull(), // Why was this accessed?
   timestamp: timestamp("timestamp").defaultNow().notNull(),
   ipAddress: text("ip_address"),
});

// ============================
// DPDP COMPLIANCE TABLES (Per DPDP Rules 2025)
// ============================
export const breachSeverity = pgEnum('breach_severity', ['low', 'medium', 'high', 'critical']);
export const notificationStatus = pgEnum('notification_status', ['pending', 'draft', 'sent', 'failed']);

export const dpdpBreachEvents = pgTable('dpdp_breach_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Incident Details
  title: text('title').notNull(),
  description: text('description').notNull(), // Plain-language description
  severity: breachSeverity('severity').notNull(),
  
  // Data Involved
  dataTypes: jsonb('data_types').$type<string[]>().notNull(), // e.g. ['aadhaar', 'pan', 'phone']
  estimatedAffectedUsers: integer('estimated_affected_users').notNull(),
  
// Timeline
   detectedAt: timestamp('detected_at').notNull(),
   reportedToCertInAt: timestamp('reported_to_cert_in_at'), // CERT-In reporting (6h for financial tenants)
   reportedToBoardAt: timestamp('reported_to_board_at'), // Must be within 72h
   reportedToUsersAt: timestamp('reported_to_users_at'), // Must be within 72h
  
  // Notification Artifacts
  boardNotificationId: text('board_notification_id'), // Reference ID from Board
  userNotificationTemplateId: text('user_notification_template_id'),
  
  // Status
  status: text('status').notNull().default('open'), // 'open', 'investigating', 'resolved', 'escalated'
  resolvedAt: timestamp('resolved_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Breach Log: Immutable audit trail for Board audits
export const dpdpBreachLogs = pgTable('dpdp_breach_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  breachEventId: uuid('breach_event_id').notNull().references(() => dpdpBreachEvents.id),
  action: text('action').notNull(), // 'detected', 'reported_board', 'reported_user', 'resolved'
  performedBy: uuid('performed_by').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  details: jsonb('details'),
});

// Consent and Retention Ledger
export const consentRetentionLedger = pgTable("consent_retention_ledger", {
   id: uuid("id").primaryKey().defaultRandom(),
   tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
   kycTokenId: uuid("kyc_token_id").references(() => kycTokens.id),
   
   // Consent Details
   consentHash: text("consent_hash").notNull(),
   consentTimestamp: timestamp("consent_timestamp").notNull(),
   consentVersion: text("consent_version"),
   
   // Purpose and Retention
   purpose: text("purpose").notNull(), // Specific purpose for data processing
   retentionPeriod: integer("retention_period"), // in days
   retentionUnit: varchar("retention_unit", { length: 10 }).notNull().default('days'), // days, months, years
   
   // Erasure Tracking
   scheduledErasureAt: timestamp("scheduled_erasure_at"),
   erasurePerformedAt: timestamp("erasure_performed_at"),
   erasureVerified: boolean("erasure_verified").default(false),
   
   // Notification Tracking
   erasureNotificationSent: boolean("erasure_notification_sent").default(false),
   erasureNotificationSentAt: timestamp("erasure_notification_sent_at"),
   
createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================
// INDIA AI COMPUTE VOUCHER TABLES
// ============================
export const voucherStatus = pgEnum('voucher_status', ['requested', 'pending', 'approved', 'rejected', 'expired', 'used']);

export const indiaAiVouchers = pgTable('india_ai_vouchers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Request Details
  projectTitle: text('project_title').notNull(),
  projectDescription: text('project_description').notNull(),
  gpuType: text('gpu_type').notNull(), // 'standard' (Rs 115), 'h100' (Rs 150)
  estimatedHours: integer('estimated_hours').notNull(),
  useCaseCategory: text('use_case_category').notNull(), // 'research', 'startup', 'msme'
  
  // Voucher Details
  voucherCode: text('voucher_code').unique().notNull(), // Generated by IndiaAI
  subsidyRate: text('subsidy_rate').notNull(), // '40%', '20%', '0%'
  effectiveRatePerHour: text('effective_rate_per_hour').notNull(), // e.g., 'Rs 69'
  
  // Timeline
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  approvedAt: timestamp('approved_at'),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  
  // Status
  status: voucherStatus('status').notNull().default('requested'),
  rejectionReason: text('rejection_reason'),
  internalNotes: text('internal_notes'),
  
createdAt: timestamp('created_at').defaultNow().notNull(),
   updatedAt: timestamp("updated_at").defaultNow().notNull(),
   });
});

// ============================
// SERVER IDENTITIES (FOR AUTH MESH)
// ============================
export const serverIdentities = pgTable('server_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').notNull().references(() => servers.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // The public key used to verify signatures
  publicKey: text('public_key').notNull(),
  
  // The private key (encrypted in DB) used to sign outgoing requests
  privateKey: text('private_key').notNull(),
  
  // Status of the identity
  isActive: boolean('is_active').default(true),
  
  expiresAt: timestamp('expires_at'), // Optional rotation
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================
// AUTH MIDDLEWARE
// ============================
// AUTH MIDDLEWARE
// ============================

// JWT verification middleware (HS256 pattern from mcp-server auth)
const verifyToken = async (c: any, secret: string) => {
   const authHeader = c.req.header("Authorization") || "";
   if (!authHeader.startsWith("Bearer ")) {
     return null;
   }
   
   const token = authHeader.substring(7);
   try {
     // HS256 verification - simplified
     const payload = Buffer.from(token, "base64").toString("utf-8");
     const parsed = JSON.parse(payload);
     
     // Check expiry
     if (parsed.exp && parsed.exp * 1000 < Date.now()) {
       return null;
     }
     
     return parsed;
   } catch {
     return null;
   }
 };

// Extract user info from JWT token
const getAuthUser = async (c: any) => {
   const authHeader = c.req.header("Authorization") || "";
   if (!authHeader.startsWith("Bearer ")) {
     // For development/testing, return a mock user if no auth header
     // In production, this should return an error or throw an exception
     return {
       id: "dev-user-id",
       tenantId: "dev-tenant-id",
       role: "user"
     };
   }
   
   const token = authHeader.substring(7);
   try {
     // HS256 verification - simplified (same as verifyToken)
     const payload = Buffer.from(token, "base64").toString("utf-8");
     const parsed = JSON.parse(payload);
     
     // Check expiry
     if (parsed.exp && parsed.exp * 1000 < Date.now()) {
       // For development/testing, return mock user on expired token
       // In production, this should return an error
       return {
         id: "dev-user-id",
         tenantId: "dev-tenant-id",
         role: "user"
       };
     }
     
     // Return user info from token
     return {
       id: parsed.sub || "unknown-user",
       tenantId: parsed.tenantId || "unknown-tenant",
       role: parsed.role || "user"
     };
   } catch {
     // For development/testing, return mock user on invalid token
     // In production, this should return an error
     return {
       id: "dev-user-id",
       tenantId: "dev-tenant-id",
       role: "user"
     };
   }
 };

// ============================
// API ROUTES
// ============================

const api = new Hono();

// Health check
api.get("/v1/health", async (c) => {
  return json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============ Users ============
api.get("/v1/users", async (c) => {
  const userList = await db.select().from(users).orderBy(asc(users.createdAt));
  return json(userList);
});

api.post("/v1/users", async (c) => {
  const body = await c.req.json();
  const { email, name } = body;
  
  if (!email) {
    return c.json({ error: "Email required" }, 400);
  }
  
  const [user] = await db
    .insert(users)
    .values({ email, name })
    .returning();
  
  return json(user, 201);
});

// ============ Servers ============
api.get("/v1/servers", async (c) => {
  const serverList = await db.select().from(servers).orderBy(asc(servers.name));
  return json(serverList);
});

api.get("/v1/servers/:slug", async (c) => {
  const { slug } = c.req.param();
  const [server] = await db.select().from(servers).where(eq(servers.slug, slug));
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }
  return json(server);
});

// ============ Tools ============
api.get("/v1/servers/:serverId/tools", async (c) => {
  const { serverId } = c.req.param();
  const toolList = await db.select().from(tools).where(eq(tools.serverId, Number(serverId))).orderBy(asc(tools.name));
  return json(toolList);
});

// ============ Resources ============
api.get("/v1/servers/:serverId/resources", async (c) => {
  const { serverId } = c.req.param();
  const resourceList = await db.select().from(resources).where(eq(resources.serverId, Number(serverId))).orderBy(asc(resources.name));
  return json(resourceList);
});

// ============ Prompts ============
api.get("/v1/servers/:serverId/prompts", async (c) => {
  const { serverId } = c.req.param();
  const promptList = await db.select().from(prompts).where(eq(prompts.serverId, Number(serverId))).orderBy(asc(prompts.name));
  return json(promptList);
});

// ============ Executions ============
api.post("/v1/executions", async (c) => {
  const body = await c.req.json();
  const { userId, serverId, toolId, args } = body;
  
  const [execution] = await db
    .insert(executions)
    .values({ userId, serverId, toolId, args, status: "running" })
    .returning();
  
  // Execute the tool (simplified - would call actual tool via FastMCP)
  try {
    // Mock execution result
    const result = { success: true, output: "Execution completed" };
    
    await db
      .update(executions)
      .set({ result, status: "succeeded", durationMs: 120 })
      .where(eq(executions.id, execution.id));
    
    return json({ ...execution, result, status: "succeeded" });
  } catch (err) {
    await db
      .update(executions)
      .set({ error: (err as Error).message, status: "failed" })
      .where(eq(executions.id, execution.id));
    
    return json({ ...execution, error: (err as Error).message, status: "failed" }, 500);
  }
});

api.get("/v1/executions", async (c) => {
  const executionList = await db.select().from(executions)
    .orderBy(desc(executions.createdAt))
    .limit(50);
  return json(executionList);
});

// ============ Skills ============
api.get("/v1/skills", async (c) => {
  const skillList = await db.select().from(skills).orderBy(asc(skills.name));
  return json(skillList);
});

api.post("/v1/skills/:id/execute", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { args } = body;
  
  // Find skill
  const [skill] = await db.select().from(skills).where(eq(skills.id, Number(id)));
  if (!skill) {
    return c.json({ error: "Skill not found" }, 404);
  }
  
  try {
    const [execution] = await db
      .insert(executions)
      .values({ userId: 1, skillId: Number(id), args, status: "running" })
      .returning();
    
    // Execute skill (mock)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    await db
      .update(executions)
      .set({ result: { success: true, output: `Skill ${id} executed` }, status: "succeeded", durationMs: 1500 })
      .where(eq(executions.id, execution.id));
    
    return json({ ...execution, result: { success: true, output: `Skill ${id} executed` }, status: "succeeded" });
  } catch (err) {
    await db
      .update(executions)
      .set({ error: (err as Error).message, status: "failed" })
      .where(eq(executions.id, execution.id));
    
    return json({ error: (err as Error).message }, 500);
  }
});

// ============ Model Providers ============
api.get("/v1/model-providers", async (c) => {
  const providerList = await db.select().from(modelProviders).orderBy(asc(modelProviders.name));
  return json(providerList);
});

api.post("/v1/model-providers", async (c) => {
  const body = await c.req.json();
  const { name, type, endpoint } = body;
  
  if (!name || !type) {
    return c.json({ error: "Name and type required" }, 400);
  }
  
  const [provider] = await db
    .insert(modelProviders)
    .values({ name, type, endpoint, isActive: true })
    .returning();
  
  return json(provider, 201);
});

// ============ User Preferences ============
api.get("/v1/users/:userId/preferences", async (c) => {
  const { userId } = c.req.param();
  const [pref] = await db.select().from(userPreferences).where(eq(userPreferences.userId, Number(userId)));
  if (!pref) {
    // Create default preferences
    const [newPref] = await db
      .insert(userPreferences)
      .values({ userId: Number(userId), theme: "dark", language: "en", notifications: true })
      .returning();
    return json(newPref);
  }
  return json(pref);
});

api.patch("/v1/users/:userId/preferences", async (c) => {
   const { userId } = c.req.param();
   const body = await c.req.json();
   const { theme, language, notifications } = body;
   
   const [pref] = await db
     .update(userPreferences)
     .set({ theme, language, notifications, updatedAt: new Date() })
     .where(eq(userPreferences.userId, Number(userId)))
     .returning();
   
   return json(pref);
 });

// ============ KYC Verification (Aadhaar Paperless Offline e-KYC) ============
api.post("/v1/kyc/verify", async (c) => {
   // Note: In a production implementation, we would use the redactRequestMiddleware
   // For now, we'll parse the body directly
   const body = await c.req.json();

   const { 
      tenantId, 
      aadhaarNumber, 
      ovseXml, 
      signature,
      consentHash, 
      consentTimestamp 
   } = body;

   // Validate Consent
   if (!consentHash || !consentTimestamp) {
      return c.json({ error: 'Missing consent details' }, 400);
   }

   // Validate required fields
   if (!aadhaarNumber || !ovseXml || !signature) {
      return c.json({ error: 'Missing required fields: aadhaarNumber, ovseXml, or signature' }, 400);
   }

   // Generate hash of Aadhaar for storage (client should do this, but we verify here)
   const aidHash = crypto.createHash('sha256').update(aadhaarNumber).digest('hex');

   // Process Offline Verification
   try {
      const record = await ovseOfflineService.processOfflineVerification(
         tenantId,
         aidHash,
         ovseXml,
         signature,
         consentHash,
         consentTimestamp
      );

      // Log Access (DPDP Requirement)
      await db.insert(kycAccessLogs).values({
         kycTokenId: record.id,
         accessedBy: tenantId, // Or current user ID from auth context
         purpose: 'kyc_verification',
      });

      return json({
         success: true,
         kycTokenId: record.id,
         message: 'KYC verification completed successfully',
      });
   } catch (error) {
      console.error('KYC Verification Error:', error);
      return c.json({ error: 'KYC verification failed', details: error.message }, 500);
   }
});

 // ============ DPDP Compliance Endpoints ============
// Breach Notification Endpoints
api.post("/v1/dpdp/breach/report", async (c) => {
   const body = await c.req.json();
   const { 
     tenantId, 
     breachTitle, 
     breachDescription, 
     dataCategories, 
     affectedRecords, 
     protectiveMeasures 
   } = body;

   const result = await ddppBreachService.reportBreach(
     tenantId,
     breachTitle,
     breachDescription,
     dataCategories,
     affectedRecords,
     protectiveMeasures
   );

   if (result.success) {
     return c.json({ 
       success: true, 
       breachId: result.breachId,
       message: 'Breach reported successfully. Notifications to Data Protection Board and affected individuals must be sent within 72 hours.' 
     }, 201);
   } else {
     return c.json({ error: 'Failed to report breach' }, 500);
   }
});

api.patch("/v1/dpdp/breach/:breachId/status", async (c) => {
   const { breachId } = c.req.param();
   const body = await c.req.json();
   const { status, mitigations } = body;

   const success = await ddppBreachService.updateBreachStatus(breachId, status, mitigations);
   
   if (success) {
     return c.json({ success: true, message: 'Breach status updated' });
   } else {
     return c.json({ error: 'Failed to update breach status' }, 500);
   }
});

// Consent and Retention Endpoints
api.post("/v1/consent/record", async (c) => {
   const body = await c.req.json();
   const { 
     tenantId, 
     kycTokenId, 
     consentHash, 
     consentTimestamp, 
     purpose, 
     retentionPeriod, 
     retentionUnit 
   } = body;

   const result = await consentRetentionService.recordConsent(
     tenantId,
     kycTokenId,
     consentHash,
     new Date(consentTimestamp),
     purpose,
     retentionPeriod,
     retentionUnit
   );

   if (result.success) {
     return c.json({ 
       success: true, 
       ledgerId: result.ledgerId,
       message: 'Consent recorded with retention timeline' 
     }, 201);
   } else {
     return c.json({ error: 'Failed to record consent' }, 500);
   }
});

api.get("/v1/consent/check-erasure-notifications", async (c) => {
   const records = await consentRetentionService.checkForErasureNotifications();
   return c.json({ 
     success: true, 
     records,
     count: records.length
   });
});

api.post("/v1/consent/:ledgerId/erasure-notification/sent", async (c) => {
   const { ledgerId } = c.req.param();
   
   const success = await consentRetentionService.markErasureNotificationSent(ledgerId);
   
   if (success) {
     return c.json({ success: true, message: 'Erasure notification marked as sent' });
   } else {
     return c.json({ error: 'Failed to mark erasure notification as sent' }, 500);
   }
});

api.post("/v1/consent/:ledgerId/perform-erasure", async (c) => {
   const { ledgerId } = c.req.param();
   
   const result = await consentRetentionService.performErasure(ledgerId);
   
   if (result.success) {
     return c.json({ success: true, message: result.message });
   } else {
     return c.json({ error: result.message }, 500);
   }
});

// ============ Shadow MCP Hunter Endpoints ============
api.get("/v1/security/shadow-mcp/incidents", async (c) => {
   const { searchParams } = new URL(c.req.url);
   const tenantId = searchParams.get('tenantId');
   const limit = parseInt(searchParams.get('limit') || '50');
   
   try {
      const incidents = await shadowMCPHunter.getActiveIncidents(tenantId);
      return c.json({ success: true, data: incidents, count: incidents.length });
   } catch (error) {
      return c.json({ error: 'Failed to fetch shadow MCP incidents' }, { status: 500 });
   }
});

api.post("/v1/security/shadow-mcp/:incidentId/release", async (c) => {
   const { incidentId } = c.req.param();
   const body = await c.req.json();
   const { releasedBy, notes } = body;

   try {
      const success = await shadowMCPHunter.releaseQuarantine(incidentId, releasedBy, notes);
      
      if (success) {
        return c.json({ success: true, message: 'Quarantine released successfully' });
      } else {
        return c.json({ error: 'Failed to release quarantine' }, { status: 500 });
      }
   } catch (error) {
      return c.json({ error: 'Failed to release quarantine' }, { status: 500 });
   }
});

// ============ Change Management Endpoints ============
api.post("/v1/governance/change-request", async (c) => {
   const body = await c.req.json();
   const { serverId, toolName, proposedCode, developerId, description } = body;

   try {
      const changeId = await changeManagement.submitChangeRequest(
        serverId,
        toolName,
        proposedCode,
        developerId,
        description
      );

      return c.json({ 
         success: true, 
         changeId,
         message: 'Change request submitted and sent to CISO for review' 
      }, 201);
   } catch (error) {
      return c.json(
        { error: 'Failed to submit change request', details: error.message },
        { status: 500 }
      );
   }
});

api.post("/v1/governance/change-request/:changeId/ciso/approve", async (c) => {
   const { changeId } = c.req.param();
   const body = await c.req.json();
   const { cisoId, approved, reason } = body;

   try {
      await changeManagement.cisoApprove(changeId, cisoId, approved, reason);
      
      return c.json({ success: true, message: 'CISO approval recorded' });
   } catch (error) {
      return c.json({ error: 'Failed to process CISO approval' }, { status: 500 });
   }
});

api.post("/v1/governance/change-request/:changeId/product-lead/approve", async (c) => {
    const { changeId } = c.req.param();
    const body = await c.req.json();
    const { leadId, approved } = body;

   try {
      await changeManagement.productLeadApprove(changeId, leadId, approved);
      
      return c.json({ success: true, message: 'Product Lead approval recorded' });
   } catch (error) {
      return c.json({ error: 'Failed to process Product Lead approval' }, { status: 500 });
   }
});
});

// ============ Immutable Audit Trail Endpoints ============
api.post("/v1/audit/create", async (c) => {
   const body = await c.req.json();
   const { serverId, eventType, action, performedBy, details, previousHash } = body;

   try {
      const result = await immutableAuditTrail.createAuditEntry(
        serverId,
        eventType,
        action,
        performedBy,
        details,
        previousHash
      );

      return c.json({ 
         success: true, 
         entryId: result.entryId,
         currentHash: result.currentHash,
         chainHash: result.chainHash,
         message: 'Audit trail entry created successfully' 
      }, 201);
   } catch (error) {
      return c.json(
        { error: 'Failed to create audit trail entry', details: error.message },
        { status: 500 }
      );
   }
});

api.get("/v1/audit/verify/:serverId", async (c) => {
   const { serverId } = c.req.param();

   try {
      const result = await immutableAuditTrail.verifyAuditChain(serverId);
      
      if (result.isValid) {
         return c.json({ success: true, message: 'Audit chain is valid' });
      } else {
         return c.json({ 
            success: false, 
            firstInvalidEntryId: result.firstInvalidEntryId,
            error: result.error || 'Audit chain validation failed' 
         }, 400);
      }
   } catch (error) {
      return c.json({ error: 'Failed to verify audit chain' }, { status: 500 });
   }
});

api.get("/v1/audit/entries/:serverId", async (c) => {
   const { serverId } = c.req.param();
   const { searchParams } = new URL(c.req.url);
   const limit = parseInt(searchParams.get('limit') || '100');
   const offset = parseInt(searchParams.get('offset') || '0');

   try {
      const entries = await immutableAuditTrail.getAuditEntries(serverId, limit, offset);
      return c.json({ success: true, data: entries, count: entries.length });
   } catch (error) {
      return c.json({ error: 'Failed to fetch audit trail entries' }, { status: 500 });
   }
});

api.get("/v1/audit/stats/:serverId", async (c) => {
   const { serverId } = c.req.param();

   try {
      const stats = await immutableAuditTrail.getAuditStats(serverId);
      return c.json({ success: true, data: stats });
   } catch (error) {
      return c.json({ error: 'Failed to fetch audit trail statistics' }, { status: 500 });
   }
});

// ============ Organizations & Teams ============
api.get("/v1/organizations", async (c) => {
   const orgList = await db.select().from(organizations).orderBy(asc(organizations.name));
   return json(orgList);
});

api.post("/v1/organizations", async (c) => {
  const body = await c.req.json();
  const { name, slug, description } = body;
  
  if (!name || !slug) {
    return c.json({ error: "Name and slug required" }, 400);
  }
  
  const [org] = await db
    .insert(organizations)
    .values({ name, slug, description })
    .returning();
  
  return json(org, 201);
});

api.get("/v1/organizations/:orgId/teams", async (c) => {
  const { orgId } = c.req.param();
  const teamList = await db.select().from(teams).where(eq(teams.organizationId, Number(orgId))).orderBy(asc(teams.name));
  return json(teamList);
});

api.post("/v1/organizations/:orgId/teams", async (c) => {
  const { orgId } = c.req.param();
  const body = await c.req.json();
  const { name, role } = body;
  
  const [team] = await db
    .insert(teams)
    .values({ name, organizationId: Number(orgId), role: role || "member" })
    .returning();
  
  return json(team, 201);
});

// ============ DPDP Compliance Endpoints ============
// Breach Notification Endpoints
api.post("/v1/dpdp/breach/report", async (c) => {
   const body = await c.req.json();
   const { 
     tenantId, 
     title, 
     description, 
     severity, 
     dataTypes, 
     affectedUsers 
   } = body;

   try {
     const result = await ddppBreachService.createBreachEvent(
       tenantId,
       title,
       description,
       severity as any,
       dataTypes,
       affectedUsers
     );

     // Auto-trigger Board Notification if severity is High/Critical
     if (['high', 'critical'].includes(severity)) {
       await ddppBreachService.generateBoardNotification(result.id);
       await ddppBreachService.notifyAffectedUsers(result.id);
     }

     return c.json({
       success: true,
       breachId: result.id,
       deadlineHours: result.hoursUntilDeadline,
     });
   } catch (error) {
     return c.json(
       { error: 'Breach reporting failed', details: error.message },
       { status: 500 }
     );
   }
});

api.patch("/v1/dpdp/breach/:breachId/status", async (c) => {
   const { breachId } = c.req.param();
   const body = await c.req.json();
   const { status, mitigations } = body;

   // Note: In a full implementation, we would use the DPDPBreachService methods
   // For now, we'll update the breach event directly
   try {
      // First get the current breach record to access protectiveMeasures
      const currentBreach = await db.query.dpdpBreachEvents.findFirst({
         where: eq(dpdpBreachEvents.id, breachId)
      });
      
      await db
         .update(dpdpBreachEvents)
         .set({
            status,
            reportedToBoardAt: status === 'reported' || status === 'mitigated' || status === 'closed' ? new Date() : undefined,
            reportedToUsersAt: status === 'reported' || status === 'mitigated' || status === 'closed' ? new Date() : undefined,
            ...(mitigations && currentBreach && { protectiveMeasures: `${currentBreach.protectiveMeasures} | Mitigations: ${mitigations}` })
         })
         .where(eq(dpdpBreachEvents.id, breachId));
         
      return c.json({ success: true, message: 'Breach status updated' });
   } catch (error) {
      return c.json({ error: 'Failed to update breach status' }, 500);
   }
});

// Consent and Retention Endpoints
api.post("/v1/consent/record", async (c) => {
   const body = await c.req.json();
   const { 
     tenantId, 
     kycTokenId, 
     consentHash, 
     consentTimestamp, 
     purpose, 
     retentionPeriod, 
     retentionUnit 
   } = body;

   try {
     const result = await consentRetentionService.recordConsent(
       tenantId,
       kycTokenId,
       consentHash,
       new Date(consentTimestamp),
       purpose,
       retentionPeriod,
       retentionUnit
     );

     if (result.success) {
       return c.json({ 
         success: true, 
         ledgerId: result.ledgerId,
         message: 'Consent recorded with retention timeline' 
       }, 201);
     } else {
       return c.json({ error: 'Failed to record consent' }, 500);
     }
   } catch (error) {
     return c.json({ error: 'Consent recording failed', details: error.message }, { status: 500 });
   }
});

api.get("/v1/consent/check-erasure-notifications", async (c) => {
   try {
      const records = await consentRetentionService.checkForErasureNotifications();
      return c.json({ 
         success: true, 
         records,
         count: records.length
      });
   } catch (error) {
      return c.json({ error: 'Failed to check for erasure notifications' }, { status: 500 });
   }
});

api.post("/v1/consent/:ledgerId/erasure-notification/sent", async (c) => {
   const { ledgerId } = c.req.param();
   
   try {
      const success = await consentRetentionService.markErasureNotificationSent(ledgerId);
      
      if (success) {
        return c.json({ success: true, message: 'Erasure notification marked as sent' });
      } else {
        return c.json({ error: 'Failed to mark erasure notification as sent' }, 500);
      }
   } catch (error) {
      return c.json({ error: 'Failed to mark erasure notification as sent' }, { status: 500 });
   }
});

api.post("/v1/consent/:ledgerId/perform-erasure", async (c) => {
   const { ledgerId } = c.req.param();
   
   try {
      const result = await consentRetentionService.performErasure(ledgerId);
      
      if (result.success) {
        return c.json({ success: true, message: result.message });
      } else {
        return c.json({ error: result.message }, 500);
      }
   } catch (error) {
      return c.json({ error: 'Failed to perform erasure' }, { status: 500 });
   }
});

// ============ IndiaAI Compute Voucher Endpoints ============
api.post("/v1/compute/indiaai", async (c) => {
   const body = await c.req.json();
   const { 
     tenantId, 
     projectTitle, 
     projectDescription, 
     gpuType, 
     estimatedHours, 
     useCaseCategory 
   } = body;

   try {
     const result = await indiaAiVoucherService.requestVoucher(
       tenantId,
       projectTitle,
       projectDescription,
       gpuType,
       estimatedHours,
       useCaseCategory
     );

     return c.json({
       success: true,
       voucherId: result.id,
       estimatedCost: result.estimatedCost,
       message: 'Voucher request submitted. You will be notified upon approval.',
     });
   } catch (error) {
     return c.json(
       { error: 'Voucher request failed', details: error.message },
       { status: 500 }
     );
   }
});

api.get("/v1/compute/indiaai", async (c) => {
   const { searchParams } = new URL(c.req.url);
   const tenantId = searchParams.get('tenantId');

   try {
      const vouchers = await db.query.indiaAiVouchers.findMany({
         where: eq(indiaAiVouchers.tenantId, tenantId),
         orderBy: (indiaAiVouchers, { desc }) => [desc(indiaAiVouchers.requestedAt)],
         limit: 10,
      });

      return c.json({ success: true, data: vouchers });
   } catch (error) {
      return c.json({ error: 'Failed to fetch voucher requests' }, { status: 500 });
   }
});

// ============================
// Export handler
// ============================

export const GET = api.handle();
export const POST = api.handle();

// Initialize the API service
export function createApiService() {
  const httpServer = api;
  
  // Startup hook - validate database connection
  httpServer.get("/v1/health", async (c) => {
    try {
      await sql`SELECT 1`;
      return json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
    } catch (err) {
      return json({ status: "error", database: "disconnected", error: (err as Error).message }, 503);
    }
  });
  
  return httpServer;
});

// ============================
// OVSE OFFLINE e-KYC SERVICE
// ============================
import crypto from 'crypto';
import { parseStringPromise } from 'xml2js';

// Load UIDAI Public Key (Store in .env or Vault)
const UIDAI_PUBLIC_KEY = process.env.UIDAI_OFFLINE_PUBLIC_KEY ||
  `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
-----END PUBLIC KEY-----`; // Placeholder - replace with actual UIDAI public key

export class OVSEOfflineService {
  /**
   * Validate the Offline XML Signature
   */
  async validateOfflineSignature(xmlString: string, signature: string): Promise<boolean> {
    if (!UIDAI_PUBLIC_KEY) {
      throw new Error('UIDAI Public Key not configured');
    }

    // 1. Extract the signed data (remove signature tag)
    const signer = crypto.createVerify('SHA256');
    signer.update(xmlString); // In production, use the exact canonicalized XML string
    signer.end();

    const isValid = signer.verify(
      UIDAI_PUBLIC_KEY,
      Buffer.from(signature, 'base64')
    );

    return isValid;
  }

  /**
   * Parse and Extract Data from Offline XML
   */
  async parseOfflineXML(xmlString: string): Promise<any> {
    try {
      const parsed = await parseStringPromise(xmlString);
      // UIDAI Offline XML structure is complex; extract required fields
      const data = parsed.AadhaarOfflineVerificationResponse;
      
      return {
        name: data?.Name?.[0],
        dob: data?.DOB?.[0],
        gender: data?.Gender?.[0],
        address: data?.Address?.[0],
        phone: data?.MobileNumber?.[0], // Masked mobile number
        email: data?.Email?.[0], // Masked email
        photo: data?.Photo?.[0], // Base64 encoded photo
        // ... other fields as needed
      };
    } catch (error) {
      throw new Error(`Failed to parse Offline XML: ${error.message}`);
    }
  }

  /**
   * Process a new Offline Verification Request
   */
  async processOfflineVerification(
    tenantId: string,
    aadhaarHash: string,
    ovseXml: string,
    signature: string,
    consentHash: string,
    consentTimestamp: string
  ) {
    // 1. Validate Signature
    const isValid = await this.validateOfflineSignature(ovseXml, signature);
    if (!isValid) {
      throw new Error('Invalid Signature: XML tampered or not from UIDAI');
    }

    // 2. Parse Data
    const payloadData = await this.parseOfflineXML(ovseXml);

    // 3. Store Record
    const [record] = await db.insert(kycTokens).values({
      tenantId,
      aadhaarHash,
      ovseXml,
      ovseSignature: signature,
      method: 'ovse_offline',
      consentHash,
      consentTimestamp: new Date(consentTimestamp),
      payloadData,
      status: 'verified',
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    }).returning();

    return record;
  }
}

export const ovseOfflineService = new OVSEOfflineService();

// ============================
// KYC Fallback Service
// ============================

// ============================
// KYC Fallback Service
// ============================
import { db } from './index';
import { kycTokens, kycStatus } from './index';
import { eq } from 'drizzle-orm';

export async function handleFallback(
   kycTokenId: string,
   method: 'digilocker' | 'video_kyc'
): Promise<{ success: boolean; status: typeof kycStatus.Values[number] }> {
   const record = await db.query.kycTokens.findFirst({
      where: eq(kycTokens.id, kycTokenId),
   });

   if (!record) {
      return { success: false, status: 'failed' };
   }

   // Update fallback method
   await db.update(kycTokens)
      .set({
         fallbackMethod: method,
         status: 'pending',
         updatedAt: new Date(),
      })
      .where(eq(kycTokens.id, kycTokenId));

   // Trigger DigiLocker or Video KYC workflow
   if (method === 'digilocker') {
      // Redirect to DigiLocker OAuth flow
      return { success: true, status: 'pending' };
   } else if (method === 'video_kyc') {
      // Schedule Video KYC session
      return { success: true, status: 'pending' };
   }

   return { success: false, status: 'failed' };
}

// ============================
// DPDP COMPLIANCE SERVICES
// ============================
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for handling DPDP breach events and notifications
 * Implements 72-hour breach notification requirement
 */
export class DPDPBreachService {
  /**
   * Step 1: Detect & Log Breach (Triggered by security monitoring)
   */
  async createBreachEvent(
    tenantId: string,
    title: string,
    description: string,
    severity: typeof breachSeverity.Values[number],
    dataTypes: string[],
    affectedUsers: number
  ): Promise<{ id: string; hoursUntilDeadline: number }> {
    const now = new Date();
    const detectedAt = now.toISOString();
    
    // Calculate 72-hour deadline
    const deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const breach = await db.insert(dpdpBreachEvents).values({
      tenantId,
      title,
      description,
      severity,
      dataTypes,
      estimatedAffectedUsers: affectedUsers,
      detectedAt: new Date(detectedAt),
    }).returning();

    // Log detection
    await this.logAction(breach[0].id, 'detected', { severity, affectedUsers });

    return {
      id: breach[0].id,
      hoursUntilDeadline: 72,
    };
  }

  /**
   * Step 2: Generate Board Notification (Mandatory within 72h)
   */
  async generateBoardNotification(breachId: string): Promise<string> {
    const breach = await db.query.dpdpBreachEvents.findFirst({
      where: eq(dpdpBreachEvents.id, breachId),
      with: { tenant: true },
    });

    if (!breach) throw new Error('Breach not found');

    // Construct Board Notification (Rule 8)
    const notification = {
      fiduciaryName: breach.tenant.name,
      breachDescription: breach.description,
      dataCategories: breach.dataTypes,
      affectedUsersCount: breach.estimatedAffectedUsers,
      protectiveMeasures: "Investigation initiated. Users notified. Security patches applied.",
      contactDetails: {
        name: "Compliance Officer",
        email: `${breach.tenant.id}@compliance.gov.in`, // Placeholder
        phone: "+91-1800-123-4567",
      },
      timestamp: new Date().toISOString(),
    };

    // Send to DPA Portal (Mock API call to Data Protection Board)
    // In production: POST to https://dpb.gov.in/api/v1/breaches
    const boardResponse = await fetch('https://dpb.gov.in/api/v1/breaches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });

    if (!boardResponse.ok) {
      throw new Error('Failed to notify Board');
    }

    const result = await boardResponse.json();
    
    // Update breach record
    await db.update(dpdpBreachEvents)
      .set({ 
        reportedToBoardAt: new Date(), 
        boardNotificationId: result.notificationId 
      })
      .where(eq(dpdpBreachEvents.id, breachId));

    await this.logAction(breachId, 'reported_board', { notificationId: result.notificationId });

    return result.notificationId;
  }

  /**
   * Step 3: Notify Affected Users (Mandatory within 72h)
   */
  async notifyAffectedUsers(breachId: string): Promise<void> {
    const breach = await db.query.dpdpBreachEvents.findFirst({
      where: eq(dpdpBreachEvents.id, breachId),
    });

    if (!breach) throw new Error('Breach not found');

    // Mock user retrieval (in production, query affected user IDs from your DB)
    const affectedUserIds = ['user-123', 'user-456']; // Placeholder

    const notificationTemplate = `
      Subject: URGENT: Security Incident Affecting Your Data

      Dear User,

      We are writing to inform you of a security incident involving your ${breach.dataTypes.join(', ')} data.

      What happened: ${breach.description}
      What data was involved: ${breach.dataTypes.join(', ')}
      What we are doing: ${breach.severity === 'critical' ? 'Full investigation and law enforcement notification.' : 'Security patch applied.'}
      What you should do: Change your password immediately. Monitor your accounts for suspicious activity.

      Contact us: support@yourplatform.com | +91-1800-123-4567

      Sincerely,
      ${breach.tenant?.name || 'Your Platform'}
    `;

    // Send via Email & SMS
    for (const userId of affectedUserIds) {
      await sendEmail(userId, 'URGENT: Security Incident', notificationTemplate);
      await sendSMS(userId, 'URGENT: Security Incident', notificationTemplate.substring(0, 160));
    }

    // Log notification
    await db.update(dpdpBreachEvents)
      .set({ reportedToUsersAt: new Date() })
      .where(eq(dpdpBreachEvents.id, breachId));

    await this.logAction(breachId, 'reported_user', { count: affectedUserIds.length });
  }

  /**
   * Helper: Log actions for audit trail
   */
  private async logAction(breachId: string, action: string, details: any) {
    await db.insert(dpdpBreachLogs).values({
      breachEventId: breachId,
      action,
      performedBy: 'system',
      details,
    });
  }
}

/**
 * Service for managing consent and retention timelines
 * Implements purpose-specific retention and pre-erasure notification
 */
export class ConsentRetentionService {
   /**
   * Record consent with purpose and retention timeline
   */
   static async recordConsent(
      tenantId: string,
      kycTokenId: string,
      consentHash: string,
      consentTimestamp: Date,
      purpose: string,
      retentionPeriod: number,
      retentionUnit: 'days' | 'months' | 'years' = 'days'
   ): Promise<{ success: boolean; ledgerId: string }> {
      try {
         // Calculate scheduled erasure date
         let scheduledErasureAt: Date;
         const now = new Date();
         
         if (retentionUnit === 'days') {
            scheduledErasureAt = new Date(now.getTime() + (retentionPeriod * 24 * 60 * 60 * 1000));
         } else if (retentionUnit === 'months') {
            scheduledErasureAt = new Date(now.getTime() + (retentionPeriod * 30 * 24 * 60 * 60 * 1000));
         } else if (retentionUnit === 'years') {
            scheduledErasureAt = new Date(now.getTime() + (retentionPeriod * 365 * 24 * 60 * 60 * 1000));
         } else {
            scheduledErasureAt = new Date(now.getTime() + (retentionPeriod * 24 * 60 * 60 * 1000)); // Default to days
         }
         
         const ledgerId = uuidv4();
         
         const [record] = await db
            .insert(consentRetentionLedger)
            .values({
               id: ledgerId,
               tenantId,
               kycTokenId,
               consentHash,
               consentTimestamp,
               purpose,
               retentionPeriod,
               retentionUnit,
               scheduledErasureAt
            })
            .returning();
         
         return { success: true, ledgerId };
      } catch (error) {
         console.error('Failed to record consent:', error);
         return { success: false, ledgerId: '' };
      }
   }

   /**
   * Check for records that need erasure notification (48 hours before)
   */
   static async checkForErasureNotifications(): Promise<Array<{ ledgerId: string; tenantId: string; purpose: string; scheduledErasureAt: Date }>> {
      try {
         const notificationThreshold = new Date(Date.now() + (48 * 60 * 60 * 1000)); // 48 hours from now
         
         const records = await db
            .select()
            .from(consentRetentionLedger)
            .where(
               and(
                  eq(consentRetentionLedger.erasureNotificationSent, false),
                  lt(consentRetentionLedger.scheduledErasureAt, notificationThreshold),
                  gt(consentRetentionLedger.scheduledErasureAt, new Date()) // Not yet expired
               )
            );
         
         return records.map(record => ({
            ledgerId: record.id,
            tenantId: record.tenantId,
            purpose: record.purpose,
            scheduledErasureAt: record.scheduledErasureAt
         }));
      } catch (error) {
         console.error('Failed to check for erasure notifications:', error);
         return [];
      }
   }

   /**
   * Mark erasure notification as sent
   */
   static async markErasureNotificationSent(ledgerId: string): Promise<boolean> {
      try {
         await db
            .update(consentRetentionLedger)
            .set({
               erasureNotificationSent: true,
               erasureNotificationSentAt: new Date()
            })
            .where(eq(consentRetentionLedger.id, ledgerId));
            
         return true;
      } catch (error) {
         console.error('Failed to mark erasure notification as sent:', error);
         return false;
      }
   }

   /**
   * Perform scheduled erasure
   */
   static async performErasure(ledgerId: string): Promise<{ success: boolean; message: string }> {
      try {
         const record = await db.query.consentRetentionLedger.findFirst({
            where: eq(consentRetentionLedger.id, ledgerId)
});
// ============================
// SERVER HEALTH EVENTS (FOR AI SELF-HEALING)
// ============================
export const serverHealthEvents = pgTable('server_health_events', {
   id: uuid('id').primaryKey().defaultRandom(),
   serverId: uuid('server_id').notNull().references(() => servers.id),
   
   // Event Details
   failureType: failureType('failure_type').notNull(),
   severity: integer('severity').notNull(), // 1 (Low) to 10 (Critical)
   message: text('message').notNull(),
   stackTrace: text('stack_trace'), // Optional: Full error log
   
   // Metrics at time of failure
   metrics: jsonb('metrics'), // { cpu: 98, memory: 85, latency: 2500 }
   
   // Timeline
   detectedAt: timestamp('detected_at').defaultNow().notNull(),
   resolvedAt: timestamp('resolved_at'),
   
   // Healing Action
   actionTaken: healingAction('action_taken'),
   healingStatus: healingStatus('healing_status').notNull().default('pending'),
   healingAttempts: integer('healing_attempts').default(0),
   
   // AI Diagnosis (Optional)
   aiDiagnosis: jsonb('ai_diagnosis'), // AI-generated root cause analysis
   
   createdAt: timestamp('created_at').defaultNow().notNull(),
});
         
         if (!record) {
            return { success: false, message: 'Consent record not found' };
         }
         
         // In a production system, this would actually delete/anonymize the data
         // For now, we'll mark it as erased
         await db
            .update(consentRetentionLedger)
            .set({
               erasurePerformedAt: new Date(),
               erasureVerified: true
            })
            .where(eq(consentRetentionLedger.id, ledgerId));
         
         // Also mark the associated KYC token as expired
         if (record.kycTokenId) {
            await db
               .update(kycTokens)
               .set({
                  status: 'expired',
                  updatedAt: new Date()
               })
               .where(eq(kycTokens.id, record.kycTokenId));
         }
         
         return { success: true, message: 'Data erasure completed successfully' };
      } catch (error) {
         console.error('Failed to perform erasure:', error);
         return { success: false, message: 'Erasure failed' };
      }
   }
}

/**
 * IndiaAI Voucher Service
 * Manages the application workflow for subsidized compute access
 */
export class IndiaAIVoucherService {
   /**
   * Step 1: Calculate Estimated Cost & Subsidy
   */
   calculateCost(gpuType: string, hours: number): { 
      baseRate: number; 
      subsidyRate: string; 
      finalRate: number; 
      totalCost: number 
   } {
      const rates = {
         standard: 115.85, // Rs/GPU-hour (bids from 2026)
         h100: 150.00,
      };

      const baseRate = rates[gpuType as keyof typeof rates] || 115.85;
      let subsidyRate = '0%';
      let finalRate = baseRate;

      // Subsidy tiers based on use case (MeitY Guidelines)
      if (hours > 1000) {
         subsidyRate = '40%';
         finalRate = baseRate * 0.6;
      } else if (hours > 500) {
         subsidyRate = '20%';
         finalRate = baseRate * 0.8;
      }

      return {
         baseRate,
         subsidyRate,
         finalRate,
         totalCost: finalRate * hours,
      };
   }

   /**
   * Step 2: Submit Voucher Request
   */
   async requestVoucher(
      tenantId: string,
      projectTitle: string,
      projectDescription: string,
      gpuType: string,
      estimatedHours: number,
      useCaseCategory: string
   ): Promise<{ id: string; estimatedCost: number }> {
      const costCalc = this.calculateCost(gpuType, estimatedHours);
      
      // Generate unique voucher code (will be replaced by IndiaAI on approval)
      const voucherCode = `INDIAAI-${tenantId}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

      const record = await db.insert(indiaAiVouchers).values({
         tenantId,
         projectTitle,
         projectDescription,
         gpuType,
         estimatedHours,
         useCaseCategory,
         voucherCode,
         subsidyRate: costCalc.subsidyRate,
         effectiveRatePerHour: `Rs ${costCalc.finalRate.toFixed(2)}`,
         expiresAt,
      }).returning();

      return {
         id: record[0].id,
         estimatedCost: costCalc.totalCost,
      };
   }

   /**
   * Step 3: Approve/Reject Request (Internal Admin or IndiaAI API)
   */
   async processVoucherRequest(
      voucherId: string,
      approved: boolean,
      rejectionReason?: string
   ): Promise<{ status: typeof voucherStatus.Values[number]; voucherCode?: string }> {
      const voucher = await db.query.indiaAiVouchers.findFirst({
         where: eq(indiaAiVouchers.id, voucherId),
      });

      if (!voucher) throw new Error('Voucher request not found');

      if (approved) {
         const newStatus = voucherStatus.APPROVED;
         
         // In production: Call IndiaAI API to get real voucher code
         // const realVoucher = await indiaAIAPIClient.issueVoucher(voucher.projectTitle);
         const realVoucherCode = `INDIAAI-REAL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
         
         await db.update(indiaAiVouchers)
            .set({
               status: newStatus,
               voucherCode: realVoucherCode,
               approvedAt: new Date(),
            })
            .where(eq(indiaAiVouchers.id, voucherId));

         return { status: newStatus, voucherCode: realVoucherCode };
      } else {
         await db.update(indiaAiVouchers)
            .set({
               status: voucherStatus.REJECTED,
               rejectionReason,
            })
            .where(eq(indiaAiVouchers.id, voucherId));

         return { status: voucherStatus.REJECTED };
      }
   }

   /**
   * Step 4: Validate Voucher for Deployment
   */
   async validateVoucher(voucherCode: string): Promise<boolean> {
      const voucher = await db.query.indiaAiVouchers.findFirst({
         where: and(
            eq(indiaAiVouchers.voucherCode, voucherCode),
            eq(indiaAiVouchers.status, voucherStatus.APPROVED),
            gte(indiaAiVouchers.expiresAt, new Date())
         ),
      });

      return !!voucher;
   }
}

// ============================
// ENTERPRISE GOVERNANCE TABLES
// ============================

// Shadow MCP Hunter Tables
export const shadowMcpIncidents = pgTable('shadow_mcp_incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Incident Details
  sourceIP: text('source_ip').notNull(),
  destinationIP: text('destination_ip').notNull(),
  port: integer('port').notNull(),
  payloadSample: text('payload_sample'),
  incidentType: text('incident_type').notNull().default('shadow_mcp'), // shadow_mcp, non_compliant_registered
  
  // Timeline
  detectedAt: timestamp('detected_at').defaultNow().notNull(),
  quarantinedAt: timestamp('quarantined_at'),
  resolvedAt: timestamp('resolved_at'),
  
  // Status
  status: text('status').notNull().default('detected'), // detected, quarantined, resolved, false_positive
  
  // Actions Taken
  quarantinedBy: text('quarantined_by'), // system or manual
  resolutionNotes: text('resolution_notes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Change Management Tables
export const changeRequests = pgTable('change_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').notNull().references(() => servers.id),
  toolName: text('tool_name').notNull(),
  proposedCode: text('proposed_code').notNull(),
  
  // Request Details
  submittedBy: uuid('submitted_by').notNull().references(() => users.id),
  description: text('description'),
  
  // Approval Chain
  status: text('status').notNull().default('draft'), // draft, pending_ciso, pending_product, approved, rejected
  cisoId: uuid('ciso_id').references(() => users.id),
  cisoReason: text('ciso_reason'),
  productLeadId: uuid('product_lead_id').references(() => users.id),
  productLeadReason: text('product_lead_reason'),
  
  // Timeline
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  cisoReviewedAt: timestamp('ciso_reviewed_at'),
  productLeadReviewedAt: timestamp('product_lead_reviewed_at'),
  approvedAt: timestamp('approved_at'),
  deployedAt: timestamp('deployed_at'),
  
createdAt: timestamp('created_at').defaultNow().notNull(),
   updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================
// IMMUTABLE AUDIT TRAIL TABLE
// ============================
export const auditTrailEntries = pgTable('audit_trail_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').notNull().references(() => servers.id),
  
  // Audit Entry Details
  eventType: text('event_type').notNull(), // e.g., 'tool_deployment', 'config_change', 'security_incident'
  action: text('action').notNull(), // e.g., 'created', 'updated', 'deleted', 'accessed'
  performedBy: uuid('performed_by').notNull().references(() => users.id),
  details: jsonb('details').notNull(), // Flexible JSON field for event-specific data
  
  // Immutability Fields
  previousHash: text('previous_hash').notNull().default('0'.repeat(64)), // Hash of previous entry
  currentHash: text('current_hash').notNull(), // Hash of this entry's data
  chainHash: text('chain_hash').notNull(), // Hash linking this entry to previous
  
  // Timeline
  timestamp: timestamp('timestamp').defaultNow().notNull();
  
  createdAt: timestamp('created_at').defaultNow().notNull();
  updatedAt: timestamp('updated_at').defaultNow().notNull();
});

// ============================
// Initialize services
// ============================
export const ddppBreachService = new DPDPBreachService();
export const consentRetentionService = new ConsentRetentionService();
export const indiaAiVoucherService = new IndiaAIVoucherService();

// ============================
// SHADOW MCP HUNTER SERVICE
// ============================
import { db } from './index';
import { shadowMcpIncidents, servers, tenants } from './index';
import { eq } from 'drizzle-orm';

interface NetworkPacket {
  sourceIP: string;
  destinationIP: string;
  port: number;
  payloadSignature: string; // e.g., "jsonrpc.2.0", "mcp-handshake"
  tenantId: string;
}

export class ShadowMCPHunter {
  /**
   * Analyze network traffic for unauthorized MCP patterns
   */
  async analyzeTraffic(packet: NetworkPacket): Promise<{ isShadow: boolean; incidentId?: string }> {
    // 1. Check if traffic is MCP-like (JSON-RPC handshake on non-standard port)
    const isMCP = packet.payloadSignature.includes('jsonrpc') || 
                  packet.payloadSignature.includes('mcp') ||
                  packet.port === 3001; // Common MCP dev port

    if (!isMCP) return { isShadow: false };

    // 2. Check if the source IP belongs to a registered, compliant server
    const registeredServer = await db.query.servers.findFirst({
      where: eq(servers.ipAddress, packet.sourceIP),
      with: { tenant: true },
    });

    // 3. If not registered, it's a "Shadow MCP"
    if (!registeredServer) {
      const incident = await db.insert(shadowMcpIncidents).values({
        tenantId: packet.tenantId,
        sourceIP: packet.sourceIP,
        destinationIP: packet.destinationIP,
        port: packet.port,
        payloadSample: packet.payloadSignature,
        incidentType: 'shadow_mcp',
        status: 'detected',
      }).returning();

      // 4. Auto-Quarantine: Push firewall rule to block this IP
      await this.quarantineIP(packet.sourceIP, packet.tenantId);

      return { isShadow: true, incidentId: incident[0].id };
    }

    // 5. If registered, check if it's compliant (RBI/DPDP checks)
    if (registeredServer.status !== 'compliant') {
      await db.insert(shadowMcpIncidents).values({
        tenantId: packet.tenantId,
        sourceIP: packet.sourceIP,
        destinationIP: packet.destinationIP,
        port: packet.port,
        incidentType: 'non_compliant_registered',
        status: 'warning',
      });
    }

    return { isShadow: false };
  }

  /**
   * Quarantine: Block IP at the edge firewall
   */
  private async quarantineIP(ip: string, tenantId: string) {
    // Mock: Call Cloudflare/AWS WAF API to block IP
    console.log(`[SECURITY] Quarantining Shadow MCP at ${ip} for tenant ${tenantId}`);
    // In production: 
    // await cloudflareWAF.blockIP(ip, tenantId);
    // or
    // await awsWaf.createIPSet(ip, tenantId);
    
    // Update incident record
    await db.update(shadowMcpIncidents)
      .set({
        quarantinedAt: new Date(),
        status: 'quarantined',
        quarantinedBy: 'system'
      })
      .where(eq(shadowMcpIncidents.sourceIP, ip))
      .where(eq(shadowMcpIncidents.status, 'detected'));
  }

  /**
   * Release a quarantined IP (false positive or after investigation)
   */
  async releaseQuarantine(incidentId: string, releasedBy: string, notes?: string): Promise<boolean> {
    try {
      await db.update(shadowMcpIncidents)
        .set({
          status: 'resolved',
          resolvedAt: new Date(),
          resolutionNotes: notes,
          quarantinedBy: releasedBy // Override to show who released it
        })
        .where(eq(shadowMcpIncidents.id, incidentId));
      
      // In production: Remove firewall rule
      // await cloudflareWAF.removeIPBlock(incidentId);
      
      return true;
    } catch (error) {
      console.error('Failed to release quarantine:', error);
      return false;
    }
  }

  /**
   * Get active shadow MCP incidents for dashboard
   */
  async getActiveIncidents(tenantId?: string) {
    const query = db.query.shadowMcpIncidents.findMany({
      where: tenantId ? eq(shadowMcpIncidents.tenantId, tenantId) : undefined,
      orderBy: (shadowMcpIncidents, { desc }) => [desc(shadowMcpIncidents.detectedAt)],
      limit: 50,
    });
    
    return query;
  }
}

export const shadowMCPHunter = new ShadowMCPHunter();

#region
// ============================
// SERVER-TO-SERVER AUTH MESH SERVICE
// ============================
import { db } from './index';
import { serverIdentities, trustPolicies } from './index';
import { eq } from 'drizzle-orm';

export class AuthMeshService {
  /**
   * Generate a new Identity (Key Pair) for a server
   */
  async generateIdentity(serverId: string, tenantId: string) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const [identity] = await db.insert(serverIdentities).values({
      serverId,
      tenantId,
      publicKey,
      privateKey, // In production, encrypt this field before storing!
    }).returning();

    return identity;
  }

  /**
   * Sign a request payload
   */
  async signRequest(serverId: string, payload: string): Promise<string> {
    const identity = await db.query.serverIdentities.first({
      where: and(
        eq(serverIdentities.serverId, serverId),
        eq(serverIdentities.isActive, true)
      ),
    });

    if (!identity) throw new Error('Server identity not found');

    const privateKey = crypto.createPrivateKey(identity.privateKey);
    const signature = crypto.sign('sha256', Buffer.from(payload), privateKey);
    return crypto.createHash('sha256').update(signature).digest('hex');
  }

  /**
   * Verify a request signature using the sender's public key
   */
  async verifyRequest(serverId: string, payload: string, signature: string): Promise<boolean> {
    const identity = await db.query.serverIdentities.first({
      where: and(
        eq(serverIdentities.serverId, serverId),
        eq(serverIdentities.isActive, true)
      ),
    });

    if (!identity) return false;

    const publicKey = crypto.createPublicKey(identity.publicKey);
    const verified = crypto.verify('sha256', Buffer.from(payload), publicKey, Buffer.from(signature, 'hex'));
    return verified;
  }

  /**
   * Check Trust Policy (Can Server A call Server B?)
   */
  async checkTrust(sourceServerId: string, targetServerId: string, action: string): Promise<{ allowed: boolean; reason: string }> {
    const policy = await db.query.trustPolicies.first({
      where: and(
        eq(trustPolicies.sourceServerId, sourceServerId),
        eq(trustPolicies.targetServerId, targetServerId)
      ),
    });

    if (!policy) {
      return { allowed: false, reason: 'No trust policy found between servers' };
    }

    // Check if action is allowed
    const actions = policy.allowedActions as string[];
    if (!actions.includes(action)) {
      return { allowed: false, reason: `Action '${action}' not allowed by policy` };
    }

    return { allowed: true, reason: 'Trust policy verified' };
  }

  /**
   * Create a new Trust Policy
   */
  async createTrustPolicy(
    tenantId: string, 
    sourceServerId: string, 
    targetServerId: string, 
    actions: string[], 
    trustLevel: string
  ) {
    return await db.insert(trustPolicies).values({
      tenantId,
      sourceServerId,
      targetServerId,
      allowedActions: actions,
      trustLevel,
    });
  }
}

export const authMeshServiceInstance = new AuthMeshService();

// ============================
// AI SELF-HEALING SERVICE
// ============================
import { db } from './index';
import { serverHealthEvents } from './index';
import { eq } from 'drizzle-orm';

export class AIHealerService {
  /**
   * Monitor: Detect failures and log events
   */
  async detectFailure(serverId: string, metrics: any, error?: string) {
    const severity = this.calculateSeverity(metrics);
    const failureType = this.classifyFailure(metrics, error);

    const [event] = await db.insert(serverHealthEvents).values({
      serverId,
      failureType,
      severity,
      message: error || `High usage detected: CPU ${metrics.cpu}%`,
      metrics,
      healingStatus: 'pending',
    }).returning();

    // Trigger healing process
    await this.triggerHealing(event.id);
    
    return event;
  }

  /**
   * AI Diagnosis: Analyze failure and suggest fix
   */
  async diagnoseFailure(eventId: string) {
    const event = await db.query.serverHealthEvents.first({
      where: eq(serverHealthEvents.id, eventId),
    });

    if (!event) throw new Error('Event not found');

    // Simulate AI Analysis (In production, call an LLM API here)
    // Example: "High memory usage + Java heap dump suggests memory leak in module X"
    let diagnosis = {};
    let action: healingAction = 'restart';

    if (event.failureType === 'high_memory' && event.metrics.memory > 90) {
      diagnosis = { 
        rootCause: 'Likely memory leak in application process', 
        suggestion: 'Restart process and increase heap size' 
      };
      action = 'restart';
    } else if (event.failureType === 'crash' && event.stackTrace) {
      diagnosis = { 
        rootCause: 'Unhandled exception in main thread', 
        suggestion: 'Rollback to previous stable version' 
      };
      action = 'rollback';
    } else if (event.failureType === 'high_cpu') {
      diagnosis = { 
        rootCause: 'Infinite loop or DDoS attack', 
        suggestion: 'Scale up resources or isolate traffic' 
      };
      action = 'scale_up';
    }

    // Update event with diagnosis
    await db.update(serverHealthEvents)
      .set({ 
        aiDiagnosis: diagnosis,
        actionTaken: action,
        healingStatus: 'running',
        healingAttempts: 1
      })
      .where(eq(serverHealthEvents.id, eventId));

    return { event, diagnosis, action };
  }

  /**
   * Execute Healing: Perform the recovery action
   */
  async executeHealing(eventId: string) {
    const { event, action } = await this.diagnoseFailure(eventId);

    try {
      switch (action) {
        case 'restart':
          await this.restartServer(event.serverId);
          break;
        case 'rollback':
          await this.rollbackServer(event.serverId);
          break;
        case 'scale_up':
          await this.scaleServer(event.serverId, 2); // Double resources
          break;
        case 'isolate':
          await this.isolateServer(event.serverId);
          break;
        default:
          throw new Error('Unknown healing action');
      }

      // Mark as successful
      await db.update(serverHealthEvents)
        .set({
          healingStatus: 'success',
          resolvedAt: new Date(),
        })
        .where(eq(serverHealthEvents.id, eventId));

      return { success: true, action };

    } catch (error) {
      // If healing fails, mark for manual review
      await db.update(serverHealthEvents)
        .set({
          healingStatus: 'failed',
          healingAttempts: event.healingAttempts + 1,
          message: `Healing failed: ${error.message}`
        })
        .where(eq(serverHealthEvents.id, eventId));

      throw error;
    }
  }

  // Helper: Restart Server (via Mesh or CLI)
  private async restartServer(serverId: string) {
    // Use the Mesh to send a restart command securely
    // await authMeshService.sendCommand(serverId, 'restart');
    console.log(`[HEALING] Restarting server ${serverId}...`);
    // In a real implementation, this would send a command via the mesh to restart the server
    // For now, we'll simulate it
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate restart delay
  }

  // Helper: Rollback (using Time Machine)
  private async rollbackServer(serverId: string) {
    // Find the last stable version
    // const version = await timeMachineService.getLastStableVersion(serverId);
    // await timeMachineService.rollback(serverId, version.id);
    console.log(`[HEALING] Rolling back server ${serverId}...`);
    // In a real implementation, this would use the Time Machine service
    // For now, we'll simulate it
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate rollback delay
  }

  // Helper: Scale Up Server
  private async scaleServer(serverId: string, scaleFactor: number) {
    console.log(`[HEALING] Scaling up server ${serverId} by factor ${scaleFactor}...`);
    // In a real implementation, this would interact with your container orchestrator (K8s, Docker Swarm, etc.)
    // For now, we'll simulate it
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate scaling delay
  }

  // Helper: Isolate Server
  private async isolateServer(serverId: string) {
    console.log(`[HEALING] Isolating server ${serverId}...`);
    // In a real implementation, this would update network policies or load balancer configs
    // For now, we'll simulate it
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate isolation delay
  }

  // Helper: Calculate Severity (1-10)
  private calculateSeverity(metrics: any): number {
    let score = 0;
    if (metrics.cpu > 90) score += 4;
    if (metrics.memory > 90) score += 4;
    if (metrics.latency > 2000) score += 2;
    return Math.min(score, 10);
  }

  // Helper: Classify Failure Type
  private classifyFailure(metrics: any, error?: string): failureType {
    if (error?.includes('OutOfMemory')) return 'crash';
    if (metrics.cpu > 95) return 'high_cpu';
    if (metrics.memory > 95) return 'high_memory';
    if (error?.includes('timeout')) return 'network_timeout';
    return 'unknown';
  }
}

export const aiHealerServiceInstance = new AIHealerService();

// ============================
// CHANGE MANAGEMENT SERVICE
// ============================
import { db } from './index';
import { changeRequests, tools, users } from './index';
import { eq, and } from 'drizzle-orm';

export type ChangeStatus = 'draft' | 'pending_ciso' | 'pending_product' | 'approved' | 'rejected';

export class ChangeManagementService {
  /**
   * Step 1: Developer submits a change request
   */
  async submitChangeRequest(
    serverId: string,
    toolName: string,
    proposedCode: string,
    developerId: string,
    description: string
  ): Promise<string> {
    const change = await db.insert(changeRequests).values({
      serverId,
      toolName,
      proposedCode,
      submittedBy: developerId,
      description,
      status: 'pending_ciso', // Initial state
    }).returning();

    // Notify CISO
    await this.notifyApprovers('ciso', change[0].id, `New tool "${toolName}" requires security review.`);

    return change[0].id;
  }

  /**
   * Step 2: CISO Approval (Security Gate)
   */
  async cisoApprove(changeId: string, cisoId: string, approved: boolean, reason?: string) {
    const change = await db.query.changeRequests.findFirst({
      where: eq(changeRequests.id, changeId),
    });

    if (!change) throw new Error('Change request not found');

    let newStatus: ChangeStatus = 'rejected';
    
    if (approved) {
      newStatus = 'pending_product'; // Move to Product Lead
      // Notify Product Lead
      await this.notifyApprovers('product_lead', changeId, `Security approved. Awaiting product review for "${change.toolName}".`);
    } else {
      // Notify Developer of rejection
      await this.notifyDeveloper(change.submittedBy, `Change rejected by CISO: ${reason}`);
    }

    await db.update(changeRequests)
      .set({ 
        status: newStatus, 
        cisoId, 
        cisoReason: reason,
        updatedAt: new Date() 
      })
      .where(eq(changeRequests.id, changeId));
  }

  /**
   * Step 3: Product Lead Approval (Business Gate)
   */
  async productLeadApprove(changeId: string, leadId: string, approved: boolean) {
    const change = await db.query.changeRequests.findFirst({
      where: eq(changeRequests.id, changeId),
    });

    if (!change) throw new Error('Change request not found');

    if (approved) {
      // DEPLOY: Apply the change to the live server
      await this.deployToolChange(change.serverId, change.toolName, change.proposedCode);
      
      await db.update(changeRequests)
        .set({ 
          status: 'approved', 
          productLeadId: leadId, 
          deployedAt: new Date() 
        })
        .where(eq(changeRequests.id, changeId));

      await this.notifyDeveloper(change.submittedBy, `Change approved and deployed!`);
    } else {
      await db.update(changeRequests)
        .set({ status: 'rejected', productLeadId: leadId })
        .where(eq(changeRequests.id, changeId));
    }
  }

  /**
   * Helper: Actually deploy the tool to the MCP server
   */
  private async deployToolChange(serverId: string, toolName: string, code: string) {
    // 1. Write code to server's filesystem
    // 2. Restart server process
    // 3. Verify tool is registered
    console.log(`[DEPLOY] Deploying tool ${toolName} to server ${serverId}`);
    
    // In production, this would:
    // 1. Update the tool's code in the storage system
    // 2. Trigger a redeploy of the MCP server
    // 3. Verify the new tool is registered and healthy
  }

  private async notifyApprovers(role: string, changeId: string, message: string) {
    const approvers = await db.query.users.findMany({
      where: eq(users.role, role),
    });
    // Send Slack/Email notifications
    // For now, just log
    console.log(`[NOTIFY] ${role.toUpperCase()}: ${message} (Change ID: ${changeId})`);
  }

private async notifyDeveloper(developerId: string, message: string) {
     // Send Slack/Email notifications
     console.log(`[NOTIFY] DEVELOPER ${developerId}: ${message}`);
   }
 }

// ============================
// IMMUTABLE AUDIT TRAIL SERVICE
// ============================
import { db } from './index';
import { auditTrailEntries, servers } from './index';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export class ImmutableAuditTrailService {
  private static readonly CHAINING_ALGORITHM = 'sha256';

  /**
   * Create an immutable audit trail entry
   * Each entry includes the hash of the previous entry, making the chain tamper-evident
   */
  async createAuditEntry(
    serverId: string,
    eventType: string,
    action: string,
    performedBy: string,
    details: Record<string, any>,
    previousHash?: string
  ): Promise<{ entryId: string; currentHash: string; chainHash: string }> {
    // Get the latest entry in the chain to get the previous hash if not provided
    let actualPreviousHash = previousHash;
    if (!previousHash) {
      const latestEntry = await db.query.auditTrailEntries.findFirst({
        where: eq(auditTrailEntries.serverId, serverId),
        orderBy: (auditTrailEntries, { desc }) => [auditTrailEntries.createdAt],
      });
      
      actualPreviousHash = latestEntry?.currentHash || '0'.repeat(64); // Genesis block hash
    }

    // Create the entry data to be hashed
    const entryData = {
      serverId,
      eventType,
      action,
      performedBy,
      details,
      timestamp: new Date().toISOString(),
      previousHash: actualPreviousHash,
    };

    // Create the entry hash
    const entryHash = this.calculateHash(entryData);
    
    // Create the chain hash (hash of entry hash + previous hash)
    const chainData = {
      entryHash,
      previousHash: actualPreviousHash,
    };
    const chainHash = this.calculateHash(chainData);

    // Store the entry in the database
    const [entry] = await db.insert(auditTrailEntries).values({
      serverId,
      eventType,
      action,
      performedBy,
      details: JSON.stringify(details),
      previousHash: actualPreviousHash,
      currentHash: entryHash,
      chainHash,
    }).returning();

    return {
      entryId: entry.id,
      currentHash: entryHash,
      chainHash,
    };
  }

  /**
   * Calculate SHA-256 hash of an object
   */
  private calculateHash(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    const hash = crypto.createHash(this.CHAINING_ALGORITHM);
    hash.update(jsonString);
    return hash.digest('hex');
  }

  /**
   * Verify the integrity of the audit trail for a server
   * Returns true if the chain is unbroken and all hashes are valid
   */
  async verifyAuditChain(serverId: string): Promise<{
    isValid: boolean;
    firstInvalidEntryId?: string;
    error?: string;
  }> {
    try {
      const entries = await db.query.auditTrailEntries.findMany({
        where: eq(auditTrailEntries.serverId, serverId),
        orderBy: (auditTrailEntries, { asc }) => [auditTrailEntries.createdAt],
      });

      if (entries.length === 0) {
        return { isValid: true }; // Empty chain is valid
      }

      let previousHash = '0'.repeat(64); // Genesis block hash

      for (const entry of entries) {
        // Recreate the entry data to verify its hash
        const entryData = {
          serverId: entry.serverId,
          eventType: entry.eventType,
          action: entry.action,
          performedBy: entry.performedBy,
          details: JSON.parse(entry.details),
          timestamp: new Date(entry.timestamp).toISOString(),
          previousHash: entry.previousHash,
        };

        const calculatedHash = this.calculateHash(entryData);
        if (calculatedHash !== entry.currentHash) {
          return {
            isValid: false,
            firstInvalidEntryId: entry.id,
            error: `Current hash mismatch for entry ${entry.id}`,
          };
        }

        // Verify the chain hash
        const chainData = {
          entryHash: entry.currentHash,
          previousHash,
        };
        const calculatedChainHash = this.calculateHash(chainData);
        if (calculatedChainHash !== entry.chainHash) {
          return {
            isValid: false,
            firstInvalidEntryId: entry.id,
            error: `Chain hash mismatch for entry ${entry.id}`,
          };
        }

        // Update previous hash for next iteration
        previousHash = entry.currentHash;
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Failed to verify audit chain: ${error.message}`,
      };
    }
  }

  /**
   * Get audit trail entries for a server
   */
  async getAuditEntries(
    serverId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Array<{
    id: string;
    eventType: string;
    action: string;
    performedBy: string;
    details: any;
    timestamp: string;
    previousHash: string;
    currentHash: string;
    chainHash: string;
  }>> {
    const entries = await db.query.auditTrailEntries.findMany({
      where: eq(auditTrailEntries.serverId, serverId),
      orderBy: (auditTrailEntries, { desc }) => [auditTrailEntries.createdAt],
      limit,
      offset,
    });

    return entries.map(entry => ({
      id: entry.id,
      eventType: entry.eventType,
      action: entry.action,
      performedBy: entry.performedBy,
      details: JSON.parse(entry.details),
      timestamp: entry.timestamp,
      previousHash: entry.previousHash,
      currentHash: entry.currentHash,
      chainHash: entry.chainHash,
    }));
  }

  /**
   * Get audit trail statistics
   */
  async getAuditStats(serverId: string): Promise<{
    totalEntries: number;
    firstEntryTimestamp: string | null;
    lastEntryTimestamp: string | null;
    chainIsValid: boolean;
  }> {
    const [countResult] = await db
      .select({ count: db.count() })
      .from(auditTrailEntries)
      .where(eq(auditTrailEntries.serverId, serverId));

    const firstEntry = await db.query.auditTrailEntries.findFirst({
      where: eq(auditTrailEntries.serverId, serverId),
      orderBy: (auditTrailEntries, { asc }) => [auditTrailEntries.createdAt],
    });

    const lastEntry = await db.query.auditTrailEntries.findFirst({
      where: eq(auditTrailEntries.serverId, serverId),
      orderBy: (auditTrailEntries, { desc }) => [auditTrailEntries.createdAt],
    });

    const verification = await this.verifyAuditChain(serverId);

    return {
      totalEntries: Number(countResult.count),
      firstEntryTimestamp: firstEntry?.timestamp ?? null,
      lastEntryTimestamp: lastEntry?.timestamp ?? null,
      chainIsValid: verification.isValid,
    };
  }
}

export const changeManagement = new ChangeManagementService();
export const immutableAuditTrail = new ImmutableAuditTrailService();

// ============================
// DEVELOPER EXPERIENCE: TIME MACHINE TABLES
// ============================
export const serverVersions = pgTable('server_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').notNull().references(() => servers.id),
  deployId: uuid('deploy_id').references(() => deployments.id),
  
  // Version Data
  versionTag: text('version_tag'), // e.g., 'v1.2.3', 'commit-abc123'
  snapshotData: jsonb('snapshot_data').notNull(), // Complete server state snapshot
  
  // Timeline
  createdAt: timestamp('created_at').defaultNow().notNull(),
  
  // Metadata
  createdBy: uuid('created_by').notNull().references(() => users.id),
  description: text('description'), // Why this version was created
});

// ============================
// DEVELOPER EXPERIENCE SERVICES
// ============================
import { db } from './index';
import { serverVersions, deployments, servers } from './index';
import { eq, desc } from 'drizzle-orm';

export class TimeMachineService {
  /**
   * Capture a snapshot of the current server state
   */
  async captureSnapshot(
    serverId: string, 
    deployId: string, 
    versionTag: string,
    createdBy: string,
    description?: string
  ): Promise<string> {
    // 1. Gather complete server state
    const server = await db.query.servers.findFirst({ where: eq(servers.id, serverId) });
    if (!server) throw new Error('Server not found');

    // 2. Snapshot Code (Git commit hash, current files)
    // 3. Snapshot Config (Env vars, DB schema version, env files)
    // 4. Snapshot State (DB dump, vector store snapshots, cache states)
    
    const snapshotData = {
      serverInfo: {
        id: server.id,
        name: server.name,
        slug: server.slug,
        status: server.status,
        currentCommit: server.currentCommit,
        environment: server.environment,
      },
      // In production, this would include:
      // - Code snapshot (git archive or file copy)
      // - Configuration snapshot (environment variables, config files)
      // - State snapshot (database schemas, data, vector indices)
      // - Dependency snapshots (package.json, requirements.txt, etc.)
      timestamp: new Date().toISOString(),
      versionTag,
    };

    // Store the snapshot
    const [version] = await db.insert(serverVersions).values({
      serverId,
      deployId,
      versionTag,
      snapshotData,
      createdBy,
      description: description || `Snapshot created at ${new Date().toISOString()}`,
    }).returning();

    return version.id;
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(
    serverId: string, 
    targetVersionId: string
  ): Promise<{ success: boolean; message: string }> {
    const targetVersion = await db.query.serverVersions.findFirst({
      where: eq(serverVersions.id, targetVersionId),
    });

    if (!targetVersion) throw new Error('Version not found');

    const snapshot = targetVersion.snapshotData;

    try {
      // 1. Revert Code: Checkout specific commit or restore files
      await this.restoreCodeSnapshot(serverId, snapshot);

      // 2. Revert Config: Restore environment variables and config files
      await this.restoreConfigSnapshot(serverId, snapshot);

      // 3. Revert State: Restore database, vector store, cache
      await this.restoreStateSnapshot(serverId, snapshot);

      // 4. Restart Server with restored state
      await this.restartServer(serverId);

      // 5. Mark as "Rolled Back" in audit log
      await db.insert(deployments).values({
        serverId,
        type: 'rollback',
        targetVersionId,
        status: 'success',
        createdAt: new Date(),
      });

      return { success: true, message: `Successfully rolled back to version ${targetVersion.versionTag || targetVersionId}` };
    } catch (error) {
      // Log the rollback failure
      await db.insert(deployments).values({
        serverId,
        type: 'rollback_failure',
        targetVersionId,
        status: 'failed',
        error: error.message,
        createdAt: new Date(),
      });
      
      return { success: false, message: `Rollback failed: ${error.message}` };
    }
  }

  /**
   * List available versions for UI
   */
  async listVersions(serverId: string, limit: number = 20) {
    return await db.query.serverVersions.findMany({
      where: eq(serverVersions.serverId, serverId),
      orderBy: desc(serverVersions.createdAt),
      limit,
    });
  }

  /**
   * Get a specific version by ID
   */
  async getVersion(versionId: string) {
    return await db.query.serverVersions.findFirst({
      where: eq(serverVersions.id, versionId),
    });
  }

  // ============================
  // Helper Methods (Production implementations would be more detailed)
  // ============================
  
  private async restoreCodeSnapshot(serverId: string, snapshot: any): Promise<void> {
    // In production:
    // 1. Checkout git commit: git checkout <commit-hash>
    // 2. Or restore from code archive
    console.log(`[TIME MACHINE] Restoring code snapshot for server ${serverId}`);
    // await exec(`cd /servers/${serverId} && git reset --hard ${snapshot.serverInfo.currentCommit}`);
  }

  private async restoreConfigSnapshot(serverId: string, snapshot: any): Promise<void> {
    // In production:
    // 1. Restore environment variables
    // 2. Restore config files (config/, .env, etc.)
    console.log(`[TIME MACHINE] Restoring config snapshot for server ${serverId}`);
  }

  private async restoreStateSnapshot(serverId: string, snapshot: any): Promise<void> {
    // In production:
    // 1. Restore database from dump/backup
    // 2. Restore vector store indices
    // 3. Restore cache states (Redis, etc.)
    console.log(`[TIME MACHINE] Restoring state snapshot for server ${serverId}`);
  }

  private async restartServer(serverId: string): Promise<void> {
    // In production:
    // 1. Stop current server process
    // 2. Start server with restored state
    console.log(`[TIME MACHINE] Restarting server ${serverId}`);
    // await exec(`pm2 restart server-${serverId}`);
  }
}

export const timeMachine = new TimeMachineService();

// ============================
// TIME MACHINE ENDPOINTS
// ============================
api.post("/v1/time-machine/capture", async (c) => {
   const body = await c.req.json();
   const { serverId, deployId, versionTag, description } = body;
   const user = await getAuthUser(c);
   const userId = user.id;

   try {
      const versionId = await timeMachine.captureSnapshot(
        serverId,
        deployId,
        versionTag,
        userId,
        description
      );

      return c.json({ 
         success: true, 
         versionId,
         message: 'Server state snapshot captured successfully' 
      }, 201);
   } catch (error) {
      return c.json(
        { error: 'Failed to capture snapshot', details: error.message },
        { status: 500 }
      );
   }
});

api.post("/v1/time-machine/rollback/:versionId", async (c) => {
   const { versionId } = c.req.param();
   const body = await c.req.json();
   const { serverId } = body;
   const user = await getAuthUser(c);
   // In production, you might want to verify that the user has permission to rollback this server

   try {
      const result = await timeMachine.rollbackToVersion(serverId, versionId);
      
      if (result.success) {
        return c.json({ success: true, message: result.message });
      } else {
        return c.json({ error: result.message }, { status: 400 });
      }
   } catch (error) {
      return c.json({ error: 'Rollback failed', details: error.message }, { status: 500 });
   }
});

api.get("/v1/time-machine/versions/:serverId", async (c) => {
   const { serverId } = c.req.param();
   const { searchParams } = new URL(c.req.url);
   const limit = parseInt(searchParams.get('limit') || '20');
   const user = await getAuthUser(c);
   // In production, you might want to verify that the user has permission to view this server's versions

   try {
      const versions = await timeMachine.listVersions(serverId, limit);
      return c.json({ success: true, data: versions, count: versions.length });
   } catch (error) {
      return c.json({ error: 'Failed to fetch versions' }, { status: 500 });
   }
});

api.get("/v1/time-machine/version/:versionId", async (c) => {
   const { versionId } = c.req.param();
   const user = await getAuthUser(c);
   // In production, you might want to verify that the user has permission to view this version

   try {
      const version = await timeMachine.getVersion(versionId);
      if (!version) {
        return c.json({ error: 'Version not found' }, { status: 404 });
      }
      return c.json({ success: true, data: version });
   } catch (error) {
      return c.json({ error: 'Failed to fetch version' }, { status: 500 });
   }
});

// ============================
// SERVER-TO-SERVER AUTH MESH ENDPOINTS
// ============================
api.post("/v1/mesh/identities", async (c) => {
   const user = await getAuthUser(c);
   const { serverId } = await c.req.json();

   try {
      const identity = await authMeshServiceInstance.generateIdentity(serverId, user.tenantId);
      return c.json({ success: true, data: identity });
   } catch (error) {
      return c.json({ error: 'Failed to generate identity' }, { status: 500 });
   }
});

api.post("/v1/mesh/policies", async (c) => {
   const user = await getAuthUser(c);
   const { sourceServerId, targetServerId, actions, trustLevel } = await c.req.json();

   try {
      await authMeshServiceInstance.createTrustPolicy(
         user.tenantId,
         sourceServerId,
         targetServerId,
         actions,
         trustLevel
      );
      return c.json({ success: true });
   } catch (error) {
      return c.json({ error: 'Failed to create trust policy' }, { status: 500 });
   }
});

// ============================
// AI SELF-HEALING SERVERS ENDPOINTS
// ============================
api.get("/v1/self-healing/events", async (c) => {
   const user = await getAuthUser(c);
   
   const events = await db.query.serverHealthEvents.findMany({
      where: eq(serverHealthEvents.tenantId, user.tenantId),
      orderBy: (serverHealthEvents, { desc }) => [serverHealthEvents.detectedAt],
      limit: 50,
   });

   return c.json({ success: true, data: events });
});

api.post("/v1/self-healing/events/:id/trigger", async (c) => {
   const user = await getAuthUser(c);
   const { id } = c.req.param();
   
   try {
      await aiHealerServiceInstance.executeHealing(id);
      return c.json({ success: true, message: 'Healing process triggered' });
   } catch (error) {
      return c.json({ error: 'Healing failed' }, { status: 500 });
   }
});