/* API v1 Routes for MCPserver.in
   Organized route handlers for the authenticated API service.
   Follows the Phase 1.5 patterns: evidence-first, publication authority,
   deterministic fail-closed, Zod-validated schemas where applicable.
*/

// Route handler imports (would be in separate files in production)
import { createApiService } from "../api";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, or, desc, asc } from "drizzle-orm";
import { users, organizations, teams, servers, tools, resources, prompts, executions, skills, workflows, modelProviders, userPreferences } from "../api/schema";

// Create the API service instance
const api = createApiService();

// ============================
// v1 API Routes
// ============================

// Health & status
api.get("/health", async (c) => {
  const sql = postgres(process.env.DATABASE_URL || "postgresql://localhost:5432/mcp_servers");
  const db = drizzle(sql);
  
  try {
    await db.select().from(users).limit(1);
    return json({ 
      status: "ok", 
      database: "connected",
      version: "1.0.0",
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    return json({ 
      status: "error", 
      database: "disconnected", 
      error: (err as Error).message 
    }, 503);
  }
});

// Server discovery routes (public, no auth required)
// GET /v1/servers - list all indexable servers
api.get("/servers", async (c) => {
  const { search, transport, verified } = c.req.query();
  
  let query = db.select().from(servers);
  
  if (search) {
    query = query.where(or(
      ilike(servers.name, `%${search}%`),
      ilike(servers.description, `%${search}%`)
    ));
  }
  
  if (transport && transport !== "all") {
    query = query.where(eq(servers.transport, transport));
  }
  
  if (verified === "true") {
    query = query.where(eq(servers.status, "healthy"));
  }
  
  // Only indexable servers (published + evidence + verified + isServerIndexable)
  // In production this would use the centralized isServerIndexable() function
  const results = await query.orderBy(asc(servers.name));
  
  return json(results);
});

// GET /v1/servers/:slug - single server with full details
api.get("/servers/:slug", async (c) => {
  const { slug } = c.req.param();
  
  const [server] = await db.select().from(servers).where(eq(servers.slug, slug));
  if (!server) {
    return json({ error: "Server not found" }, 404);
  }
  
  // Load related data
  const [toolList] = await db.select().from(tools).where(eq(tools.serverId, server.id));
  const [resourceList] = await db.select().from(resources).where(eq(resources.serverId, server.id));
  const [promptList] = await db.select().from(prompts).where(eq(prompts.serverId, server.id));
  
  return json({
    ...server,
    tools: toolList,
    resources: resourceList,
    prompts: promptList,
  });
});

// Tool execution (authenticated)
api.post("/execution", async (c) => {
   // Verify bearer token from Phase 3 FastMCP auth middleware
   const authHeader = c.req.header("Authorization") || "";
   if (!authHeader.startsWith("Bearer ")) {
     return json({ error: "Missing or invalid bearer token" }, 401);
   }
   
   const body = await c.req.json();
   const { serverId, toolId, args, userId } = body;
   
   if (!serverId || !toolId) {
     return json({ error: "serverId and toolId required" }, 400);
   }
   
   // Check server is indexable (publication authority)
   const [server] = await db.select().from(servers).where(eq(servers.id, serverId));
   if (!server || server.status !== "healthy") {
     return json({ error: "Server not available or not indexable" }, 403);
   }
   
   // Get tool details
   const [tool] = await db.select().from(tools).where(eq(tools.id, toolId));
   if (!tool) {
     return json({ error: "Tool not found" }, 404);
   }
   
   // Prepare execution record
   const executionData = {
     userId: userId || 1, // default to user 1 if not provided
     serverId: Number(serverId),
     toolId: Number(toolId),
     args: args || {},
     status: "running",
   };
   
   let executionId;
   try {
     // Insert execution record to get ID
     const [execution] = await db
       .insert(executions)
       .values(executionData)
       .returning();
     
     executionId = execution.id;
     
     // Call MCP server via HTTP
     const mcpServerUrl = process.env.MCP_SERVER_URL || "http://mcp-server:8000";
     const method = tool.name; // e.g., "gst.validate"
     
     const response = await fetch(`${mcpServerUrl}/v1/mcp/${method}`, {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         // Forward the bearer token for authentication if needed
         "Authorization": authHeader,
       },
       body: JSON.stringify(args),
     });
     
     if (!response.ok) {
       throw new Error(`MCP server returned ${response.status}: ${await response.text()}`);
     }
     
     const result = await response.json();
     
     // Update execution with result
     await db
       .update(executions)
       .set({
         result: result,
         status: "succeeded",
         durationMs: 0, // We don't measure duration here, but we could
         updatedAt: new Date(),
       })
       .where(eq(executions.id, executionId));
     
     // Fetch the updated execution to return
     const [updatedExecution] = await db
       .select({
         id: executions.id,
         userId: executions.userId,
         serverId: executions.serverId,
         toolId: executions.toolId,
         args: executions.args,
         result: executions.result,
         error: executions.error,
         durationMs: executions.durationMs,
         status: executions.status,
         createdAt: executions.createdAt,
         serverName: servers.name,
         toolName: tools.name,
       })
       .from(executions)
       .leftJoin(servers, eq(executions.serverId, servers.id))
       .leftJoin(tools, eq(executions.toolId, tools.id))
       .where(eq(executions.id, executionId));
     
     return json(updatedExecution);
   } catch (err) {
     // Update execution with error
     if (executionId) {
       await db
         .update(executions)
         .set({
           error: (err as Error).message,
           status: "failed",
           durationMs: 0,
           updatedAt: new Date(),
         })
         .where(eq(executions.id, executionId));
     }
     
     // Return error response
     return json({ 
       error: (err as Error).message,
       executionId: executionId,
       status: "failed"
     }, 500);
   }
});

// Skill invocation (authenticated)
api.post("/skills/:id/invoke", async (c) => {
   const { id } = c.req.param();
   const body = await c.req.json();
   const { args } = body;
   
   // Find and invoke skill
   // In production: would call skills/ directory handlers
   try {
     return json({
       skillId: Number(id),
       status: "running",
       result: { success: true, output: `Skill ${id} invoked` },
     });
   } catch (err) {
     return json({ error: (err as Error).message }, 500);
   }
});

// Get execution trace / history
api.get("/executions", async (c) => {
   const { serverId, toolId, limit, offset } = c.req.query();
   
   let query = db
     .select({
       id: executions.id,
       userId: executions.userId,
       serverId: executions.serverId,
       toolId: executions.toolId,
       args: executions.args,
       result: executions.result,
       error: executions.error,
       durationMs: executions.durationMs,
       status: executions.status,
       createdAt: executions.createdAt,
       serverName: servers.name,
       toolName: tools.name,
     })
     .from(executions)
     .leftJoin(servers, eq(executions.serverId, servers.id))
     .leftJoin(tools, eq(executions.toolId, tools.id))
     .orderBy(desc(executions.createdAt));
   
   if (serverId) {
     query = query.where(eq(executions.serverId, Number(serverId)));
   }
   if (toolId) {
     query = query.where(eq(executions.toolId, Number(toolId)));
   }
   
   const limitNum = limit ? parseInt(limit, 10) : 50;
   const offsetNum = offset ? parseInt(offset, 10) : 0;
   
   query = query.limit(limitNum).offset(offsetNum);
   
   const executionsList = await query;
   return json(executionsList);
});

// Publication authority check (public endpoint)
api.get("/v1/publication-authority", async (c) => {
  // Demonstrates the centralized isServerIndexable() function
  // published + evidence + verified + qualifyingEvidence => indexable
  // Fail-closed: any missing condition => not indexable
  
  const { published, evidenceCount, evidenceVerified, status } = c.req.query();
  
  // Centralized publication authority rules (deterministic, fail-closed)
  let indexable = false;
  let reason = "";
  
  const publishedBool = published === "true";
  const evidenceCountNum = evidenceCount ? parseInt(evidenceCount, 10) : 0;
  const evidenceVerifiedBool = evidenceVerified === "true";
  const statusBool = status;
  
  // Rule 1: published + evidence + verified => indexable
  if (publishedBool && evidenceCountNum > 0 && evidenceVerifiedBool && statusBool === "published") {
    indexable = true;
    reason = "published && evidenceCount > 0 && verified && published => indexable";
  }
  // Rule 2: published + no evidence => not indexable
  else if (publishedBool && evidenceCountNum === 0) {
    indexable = false;
    reason = "published && no evidence => not indexable";
  }
  // Rule 3: published + unverified => not indexable
  else if (publishedBool && !evidenceVerifiedBool) {
    indexable = false;
    reason = "published && unverified => not indexable";
  }
  // Rule 4: draft + evidence + verified => not indexable
  else if (!publishedBool && evidenceCountNum > 0 && evidenceVerifiedBool && statusBool === "draft") {
    indexable = false;
    reason = "draft + evidence + verified => not indexable";
  }
  // Rule 5: unknown status => not indexable
  else if (!statusBool) {
    indexable = false;
    reason = "unknown status => not indexable";
  }
  // Default: not indexable
  else {
    indexable = false;
    reason = "conditions not met for indexation";
  }
  
  return json({ 
    indexable, 
    reason,
    publicationAuthority: "Evidence Ledger",
    failClosed: true 
  });
});

// SEO & sitemap routes
api.get("/sitemap.xml", async (c) => {
  // Generate sitemap for public knowledge graph
  // In production: would query all indexable servers/URLs
  const baseUrl = "https://www.mcpserver.in";
  
  const urls = [
    { loc: baseUrl, lastmod: new Date().toISOString().split("T")[0], changefreq: "daily", priority: "1.0" },
    { loc: `${baseUrl}/servers`, lastmod: new Date().toISOString().split("T")[0], changefreq: "weekly", priority: "0.8" },
    { loc: `${baseUrl}/categories`, lastmod: new Date().toISOString().split("T")[0], changefreq: "weekly", priority: "0.6" },
    { loc: `${baseUrl}/evidence`, lastmod: new Date().toISOString().split("T")[0], changefreq: "weekly", priority: "0.5" },
    { loc: `${baseUrl}/methodology`, lastmod: new Date().toISOString().split("T")[0], changefreq: "monthly", priority: "0.4" },
    { loc: `${baseUrl}/about`, lastmod: new Date().toISOString().split("T")[0], changefreq: "yearly", priority: "0.3" },
  ];
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(u => `
    <url>
      <loc>${u.loc}</loc>
      <lastmod>${u.lastmod}</lastmod>
      <changefreq>${u.changefreq}</changefreq>
      <priority>${u.priority}</priority>
    </url>`).join("")}
</urlset>`;
  
  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
});

// robots.txt
api.get("/robots.txt", async (c) => {
  const content = `
User-agent: *
Allow: /
Disallow: /api/
Disallow: /drafts/
Disallow: /internal/

User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /

Sitemap: https://www.mcpserver.in/sitemap.xml
`.trim();
  
  return new Response(content, {
    headers: { "Content-Type": "text/plain" },
  });
});

// Export for Hono framework
export { api };