/**
 * REST API Server
 * 
 * Exposes say10 functionality via REST API
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "../config/index.js";
import { getLogger } from "../utils/logger.js";
import { handleMonitoringTool } from "../tools/monitoring.js";
import { handleLogTool } from "../tools/logs.js";
import { handleServiceTool } from "../tools/services.js";
import { handleNetworkTool } from "../tools/network.js";
import { handleDockerTool } from "../tools/docker.js";
import { handleHistoryTool } from "../tools/history.js";
import { handleAchievementTool } from "../tools/achievements.js";
import { handlePythonTool } from "../tools/python.js";

const logger = getLogger("api-server");

/**
 * API Server Configuration
 */
export interface APIServerConfig {
  port?: number;
  host?: string;
  apiKey?: string;
  enableCors?: boolean;
  rateLimit?: {
    max: number;
    timeWindow: string;
  };
}

/**
 * API Response Format
 */
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Tool Execution Request
 */
interface ToolRequest {
  tool: string;
  args?: Record<string, unknown>;
}

/**
 * API Server Class
 */
export class APIServer {
  private fastify;
  private config: Required<APIServerConfig>;

  constructor(userConfig?: APIServerConfig) {
    this.config = {
      port: userConfig?.port || 6666,
      host: userConfig?.host || "0.0.0.0",
      apiKey: userConfig?.apiKey || process.env.API_KEY || "",
      enableCors: userConfig?.enableCors !== false,
      rateLimit: userConfig?.rateLimit || {
        max: 100,
        timeWindow: "1 minute",
      },
    };

    this.fastify = Fastify({
      logger: {
        level: config.logging.level,
      },
      requestIdHeader: "x-request-id",
      requestIdLogLabel: "reqId",
    });

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Middleware
   */
  private setupMiddleware(): void {
    // CORS
    if (this.config.enableCors) {
      this.fastify.register(cors, {
        origin: true,
        credentials: true,
      });
    }

    // Rate Limiting
    this.fastify.register(rateLimit, {
      max: this.config.rateLimit.max,
      timeWindow: this.config.rateLimit.timeWindow,
    });

    // API Key Authentication (if configured)
    if (this.config.apiKey) {
      this.fastify.addHook("onRequest", async (request, reply) => {
        // Skip auth for health endpoint
        if (request.url === "/health" || request.url === "/api/health") {
          return;
        }

        const apiKey = request.headers["x-api-key"] as string;
        if (!apiKey || apiKey !== this.config.apiKey) {
          reply.code(401).send(this.errorResponse("Unauthorized: Invalid API Key"));
          return;
        }
      });
    }

    // Error Handler
    this.fastify.setErrorHandler((error, request, reply) => {
      logger.error({ error, url: request.url }, "API Error");
      reply.code(500).send(this.errorResponse(error.message));
    });
  }

  /**
   * Setup Routes
   */
  private setupRoutes(): void {
    // Health Check
    this.fastify.get("/health", async () => {
      return this.successResponse({
        status: "ok",
        version: config.server.version,
        uptime: process.uptime(),
      });
    });

    this.fastify.get("/api/health", async () => {
      return this.successResponse({
        status: "ok",
        version: config.server.version,
        uptime: process.uptime(),
      });
    });

    // System Status
    this.fastify.get("/api/system/status", async () => {
      try {
        const result = await handleMonitoringTool("system_status", {});
        return this.successResponse({
          status: result.content[0].text,
        });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    // Execute Tool
    this.fastify.post<{ Body: ToolRequest }>("/api/tool/execute", async (request) => {
      try {
        const { tool, args = {} } = request.body;

        if (!tool) {
          return this.errorResponse("Tool name is required");
        }

        const result = await this.executeTool(tool, args);
        return this.successResponse({
          tool,
          result: result.content[0].text,
        });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    // Docker Endpoints
    this.fastify.get("/api/docker/status", async () => {
      try {
        const result = await handleDockerTool("docker_status", {});
        return this.successResponse({ status: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.get("/api/docker/resources", async () => {
      try {
        const result = await handleDockerTool("docker_resources", {});
        return this.successResponse({ resources: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.get("/api/docker/container/:name/logs", async (request) => {
      try {
        const { name } = request.params as { name: string };
        const { lines = 50 } = request.query as { lines?: number };

        const result = await handleDockerTool("docker_logs", { container: name, lines });
        return this.successResponse({ logs: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    // History Endpoints
    this.fastify.get("/api/history/list", async (request) => {
      try {
        const { limit = 10, success_only = false } = request.query as {
          limit?: number;
          success_only?: boolean;
        };

        const result = await handleHistoryTool("history_list", { limit, success_only });
        return this.successResponse({ history: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.get("/api/history/stats", async () => {
      try {
        const result = await handleHistoryTool("history_stats", {});
        return this.successResponse({ stats: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.get("/api/history/session/:id/story", async (request) => {
      try {
        const { id } = request.params as { id: string };
        const { format = "full" } = request.query as { format?: string };

        const result = await handleHistoryTool("session_story", { session_id: id, format });
        return this.successResponse({ story: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    // Service Endpoints
    this.fastify.get("/api/services/list", async () => {
      try {
        const result = await handleServiceTool("list_services", {});
        return this.successResponse({ services: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.get("/api/service/:name/status", async (request) => {
      try {
        const { name } = request.params as { name: string };
        const result = await handleServiceTool("service_status", { service: name });
        return this.successResponse({ status: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    // Network Endpoints
    this.fastify.get("/api/network/ports", async () => {
      try {
        const result = await handleNetworkTool("check_ports", {});
        return this.successResponse({ ports: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.get("/api/network/connections", async () => {
      try {
        const result = await handleNetworkTool("check_connections", {});
        return this.successResponse({ connections: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    // Monitoring Endpoints
    this.fastify.get("/api/monitoring/cpu", async () => {
      try {
        const result = await handleMonitoringTool("check_cpu", {});
        return this.successResponse({ cpu: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.get("/api/monitoring/memory", async () => {
      try {
        const result = await handleMonitoringTool("check_memory", {});
        return this.successResponse({ memory: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.get("/api/monitoring/disk", async () => {
      try {
        const result = await handleMonitoringTool("check_disk_space", {});
        return this.successResponse({ disk: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    // Logs Endpoints
    this.fastify.get("/api/logs/syslog", async (request) => {
      try {
        const { lines = 50 } = request.query as { lines?: number };
        const result = await handleLogTool("read_syslog", { lines });
        return this.successResponse({ logs: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    // Achievement Endpoints
    this.fastify.get("/api/achievements/list", async () => {
      try {
        const result = await handleAchievementTool("achievements_list", {});
        return this.successResponse({ achievements: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.get("/api/achievements/stats", async () => {
      try {
        const result = await handleAchievementTool("achievements_stats", {});
        return this.successResponse({ stats: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.get("/api/achievements/progress", async () => {
      try {
        const result = await handleAchievementTool("achievements_progress", {});
        return this.successResponse({ progress: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    // Python Tool Endpoints
    this.fastify.post("/api/python/workspace/init", async (request) => {
      try {
        const { workspace, python } = request.body as { workspace?: string; python?: string };
        const result = await handlePythonTool("python_init_workspace", { workspace, python });
        return this.successResponse({ result: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.post("/api/python/script/create", async (request) => {
      try {
        const { name, content, workspace } = request.body as { name: string; content: string; workspace?: string };
        const result = await handlePythonTool("python_create_script", { name, content, workspace });
        return this.successResponse({ result: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.post("/api/python/script/run", async (request) => {
      try {
        const { name, args, workspace } = request.body as { name: string; args?: string[]; workspace?: string };
        const result = await handlePythonTool("python_run_script", { name, args, workspace });
        return this.successResponse({ result: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    this.fastify.post("/api/python/package/install", async (request) => {
      try {
        const { package: pkg, workspace } = request.body as { package: string; workspace?: string };
        const result = await handlePythonTool("python_install_package", { package: pkg, workspace });
        return this.successResponse({ result: result.content[0].text });
      } catch (error) {
        return this.errorResponse(error instanceof Error ? error.message : String(error));
      }
    });

    // API Info
    this.fastify.get("/api", async () => {
      return this.successResponse({
        name: "say10 REST API",
        version: config.server.version,
        endpoints: {
          health: "GET /health",
          system_status: "GET /api/system/status",
          tool_execute: "POST /api/tool/execute",
          docker: {
            status: "GET /api/docker/status",
            resources: "GET /api/docker/resources",
            container_logs: "GET /api/docker/container/:name/logs",
          },
          history: {
            list: "GET /api/history/list",
            stats: "GET /api/history/stats",
            story: "GET /api/history/session/:id/story",
          },
          services: {
            list: "GET /api/services/list",
            status: "GET /api/service/:name/status",
          },
          network: {
            ports: "GET /api/network/ports",
            connections: "GET /api/network/connections",
          },
          monitoring: {
            cpu: "GET /api/monitoring/cpu",
            memory: "GET /api/monitoring/memory",
            disk: "GET /api/monitoring/disk",
          },
          logs: {
            syslog: "GET /api/logs/syslog",
          },
          achievements: {
            list: "GET /api/achievements/list",
            stats: "GET /api/achievements/stats",
            progress: "GET /api/achievements/progress",
          },
          python: {
            workspace_init: "POST /api/python/workspace/init",
            script_create: "POST /api/python/script/create",
            script_run: "POST /api/python/script/run",
            package_install: "POST /api/python/package/install",
          },
        },
      });
    });
  }

  /**
   * Execute Tool based on name
   */
  private async executeTool(name: string, args: Record<string, unknown>) {
    // Route to appropriate handler
    if (name.startsWith("docker_")) {
      return await handleDockerTool(name, args);
    } else if (name.startsWith("history_") || name.startsWith("session_")) {
      return await handleHistoryTool(name, args);
    } else if (
      name === "check_ports" ||
      name === "check_connections" ||
      name === "network_traffic" ||
      name === "dns_lookup" ||
      name === "ping_host" ||
      name === "check_firewall" ||
      name === "traceroute"
    ) {
      return await handleNetworkTool(name, args);
    } else if (name.startsWith("check_") || name === "system_status") {
      return await handleMonitoringTool(name, args);
    } else if (name.includes("log")) {
      return await handleLogTool(name, args);
    } else if (name.includes("service")) {
      return await handleServiceTool(name, args);
    }

    throw new Error(`Unknown tool: ${name}`);
  }

  /**
   * Format Success Response
   */
  private successResponse<T>(data: T): APIResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format Error Response
   */
  private errorResponse(error: string): APIResponse {
    return {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Start Server
   */
  async start(): Promise<void> {
    try {
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });

      logger.info(
        {
          port: this.config.port,
          host: this.config.host,
          auth: !!this.config.apiKey,
        },
        "API Server started"
      );

      console.log(`\n[API] Server running on http://${this.config.host}:${this.config.port}`);
      console.log(`[API] API Documentation: http://${this.config.host}:${this.config.port}/api`);
      if (this.config.apiKey) {
        console.log(`[API] Authentication: Enabled (X-API-Key header required)\n`);
      } else {
        console.log(`[API] Authentication: Disabled (set API_KEY env var to enable)\n`);
      }
    } catch (error) {
      logger.error({ error }, "Failed to start API Server");
      throw error;
    }
  }

  /**
   * Stop Server
   */
  async stop(): Promise<void> {
    await this.fastify.close();
    logger.info("API Server stopped");
  }

  /**
   * Get Fastify Instance
   */
  getInstance() {
    return this.fastify;
  }
}

