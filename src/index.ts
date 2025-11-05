#!/usr/bin/env node

/**
 * say10 - MCP Server
 *
 * Advanced AI Server Administrator
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Import configuration and logging
import { config, validateConfig } from "./config/index.js";
import { getLogger } from "./utils/logger.js";

// Import tool handlers
import { getMonitoringTools, handleMonitoringTool } from "./tools/monitoring.js";
import { getLogTools, handleLogTool } from "./tools/logs.js";
import { getServiceTools, handleServiceTool } from "./tools/services.js";
import { getNetworkTools, handleNetworkTool } from "./tools/network.js";
import { getDockerTools, handleDockerTool } from "./tools/docker.js";
import { getHistoryTools, handleHistoryTool } from "./tools/history.js";
import { getAchievementTools, handleAchievementTool } from "./tools/achievements.js";
import { getPythonTools, handlePythonTool } from "./tools/python.js";
import { getFileTools, handleFileTool } from "./tools/files.js";

const logger = getLogger('mcp-server');

/**
 * MCP Server Instanz
 */
class AdminMCPServer {
  private server: Server;
  private tools: Tool[];

  constructor() {
    this.server = new Server(
      {
        name: config.server.name,
        version: config.server.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    // Sammle alle Tools
    this.tools = [
      ...getMonitoringTools(),
      ...getLogTools(),
      ...getServiceTools(),
      ...getNetworkTools(),
      ...getDockerTools(),
      ...getHistoryTools(),
      ...getAchievementTools(),
      ...getPythonTools(),
      ...getFileTools(),
    ];

    logger.info({ toolCount: this.tools.length }, 'MCP Server initialized');
    this.setupHandlers();
  }

  /**
   * Setup MCP Request Handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools,
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Route zu entsprechendem Tool Handler
        // Check Docker Tools first
        if (name.startsWith("docker_")) {
          return await handleDockerTool(name, args || {});
        }
        // Check History Tools
        else if (name.startsWith("history_") || name.startsWith("session_")) {
          return await handleHistoryTool(name, args || {});
        }
        // Check Achievement Tools
        else if (name.startsWith("achievements_")) {
          return await handleAchievementTool(name, args || {});
        }
        // Check Python Tools
        else if (name.startsWith("python_")) {
          return await handlePythonTool(name, args || {});
        }
        // Check File Tools
        else if (
          name === "read_file" ||
          name === "list_directory" ||
          name === "search_files" ||
          name === "get_file_info" ||
          name === "find_in_files" ||
          name === "get_current_directory"
        ) {
          return await handleFileTool(name, args || {});
        }
        // Check Network Tools (bevor check_* pattern)
        else if (
          name === "check_ports" ||
          name === "check_connections" ||
          name === "network_traffic" ||
          name === "dns_lookup" ||
          name === "ping_host" ||
          name === "check_firewall" ||
          name === "traceroute"
        ) {
          return await handleNetworkTool(name, args || {});
        } else if (name.startsWith("check_") || name === "system_status") {
          return await handleMonitoringTool(name, args || {});
        } else if (name.includes("log")) {
          return await handleLogTool(name, args || {});
        } else if (name.includes("service")) {
          return await handleServiceTool(name, args || {});
        }

        return {
          content: [
            {
              type: "text",
              text: `Unbekanntes Tool: ${name}`,
            },
          ],
          isError: true,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(
          {
            tool: name,
            args,
            error: error instanceof Error ? error.message : String(error),
          },
          'Tool execution failed'
        );
        return {
          content: [
            {
              type: "text",
              text: `Fehler bei Tool-Ausführung: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "admin://status/system",
          name: "System Status",
          description: "Aktueller System-Status (CPU, Memory, Disk)",
          mimeType: "application/json",
        },
        {
          uri: "admin://logs/syslog",
          name: "System Logs",
          description: "Die letzten System Log Einträge",
          mimeType: "text/plain",
        },
        {
          uri: "admin://services/list",
          name: "Service Liste",
          description: "Liste aller systemd Services",
          mimeType: "application/json",
        },
      ],
    }));

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === "admin://status/system") {
        const result = await handleMonitoringTool("system_status", {});
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: result.content[0].text,
            },
          ],
        };
      }

      if (uri === "admin://logs/syslog") {
        const result = await handleLogTool("read_syslog", { lines: 50 });
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: result.content[0].text,
            },
          ],
        };
      }

      if (uri === "admin://services/list") {
        const result = await handleServiceTool("list_services", {});
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: result.content[0].text,
            },
          ],
        };
      }

      throw new Error(`Unbekannte Resource: ${uri}`);
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: "health_check",
          description: "Führt einen vollständigen System Health Check durch",
          arguments: [],
        },
        {
          name: "security_audit",
          description: "Prüft Sicherheitsaspekte des Systems",
          arguments: [],
        },
        {
          name: "diagnose_issue",
          description: "Diagnostiziert ein System-Problem",
          arguments: [
            {
              name: "issue",
              description: "Beschreibung des Problems",
              required: true,
            },
          ],
        },
      ],
    }));

    // Get prompt content
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === "health_check") {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Bitte führe einen vollständigen System Health Check durch. Prüfe CPU, Memory, Disk Space, wichtige Services und die letzten Log-Einträge. Gib mir eine Zusammenfassung und weise auf Probleme hin.",
              },
            },
          ],
        };
      }

      if (name === "security_audit") {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Führe ein Security Audit durch: Prüfe fail2ban Status, Firewall-Regeln, laufende Services, sudo-Logs und ungewöhnliche Prozesse.",
              },
            },
          ],
        };
      }

      if (name === "diagnose_issue") {
        const issue = args?.issue || "unbekanntes Problem";
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Diagnostiziere bitte folgendes Problem: ${issue}. Prüfe relevante Logs, Services und System-Ressourcen.`,
              },
            },
          ],
        };
      }

      throw new Error(`Unbekanntes Prompt: ${name}`);
    });
  }

  /**
   * Start den MCP Server
   */
  async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      logger.info('Configuration validated');

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      // Log nur zu stderr, damit stdio transport nicht gestört wird
      logger.info('MCP Server started and ready for connections');
    } catch (error) {
      logger.fatal({ error }, 'Failed to start MCP Server');
      throw error;
    }
  }
}

// Start server wenn direkt ausgeführt
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new AdminMCPServer();
  server.start().catch((error) => {
    logger.fatal({ error }, 'Server start failed');
    process.exit(1);
  });
}

export { AdminMCPServer };

