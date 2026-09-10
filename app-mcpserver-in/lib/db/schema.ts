import { pgTable, uuid, text, timestamp, pgEnum, integer, jsonb } from 'drizzle-orm/pg-core';
import { tenants, servers } from './schema'; // Assuming these exist from previous implementations

// ============================
// SERVER-TO-SERVER AUTH MESH SCHEMA
// ============================
export const authRole = pgEnum('auth_role', ['server', 'agent', 'service']);
export const trustLevel = pgEnum('trust_level', ['untrusted', 'limited', 'full']);

// Table to store server identities (Public Keys + IDs)
export const serverIdentities = pgTable('server_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
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

// Table to define who can talk to whom (Trust Policies)
export const trustPolicies = pgTable('trust_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Source Server (Who wants to talk)
  sourceServerId: uuid('source_server_id').notNull().references(() => servers.id),
  
  // Target Server (Who is being called)
  targetServerId: uuid('target_server_id').notNull().references(() => servers.id),
  
  // Allowed Actions (e.g., "read", "write", "execute")
  allowedActions: jsonb('allowed_actions').notNull(), // ["read_db", "write_logs"]
  
  // Trust Level
  trustLevel: trustLevel('trust_level').notNull().default('limited'),
  
  // Rate Limit (requests per minute)
  rateLimit: integer('rate_limit').default(100),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================
// AI SELF-HEALING SERVERS SCHEMA
// ============================
export const failureType = pgEnum('failure_type', [
  'crash', 
  'high_memory', 
  'high_cpu', 
  'deadlock', 
  'network_timeout', 
  'dependency_error',
  'unknown'
]);

export const healingAction = pgEnum('healing_action', [
  'restart', 
  'rollback', 
  'scale_up', 
  'apply_patch', 
  'isolate', 
  'manual_review'
]);

export const healingStatus = pgEnum('healing_status', [
  'pending', 
  'running', 
  'success', 
  'failed', 
  'manual_override'
]);

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

// ============================
// EXISTING TABLES REFERENCES (for completeness)
// ============================
// Assuming these tables exist from previous implementations
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // ... other tenant fields
});

export const servers = pgTable('servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  // ... other server fields
});

export const deployments = pgTable('deployments', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').notNull().references(() => servers.id),
  // ... other deployment fields
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ... user fields
});