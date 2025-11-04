/**
 * say10 - Ollama MCP Bridge
 *
 * Verbindet Ollama mit dem MCP Server und übersetzt Tool Calls
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import chalk from "chalk";
import { setApprovalHandler } from "../src/safety/approval.js";
import type { ApprovalRequest } from "../src/types.js";
import inquirer from "inquirer";
import { config } from "../src/config/index.js";

/**
 * Zeige Performance Stats
 */
function showPerformanceStats(data: OllamaResponse) {
  if (data.eval_count && data.eval_duration) {
    const tokensPerSec = (data.eval_count / (data.eval_duration / 1e9)).toFixed(2);
    const totalSec = data.total_duration ? (data.total_duration / 1e9).toFixed(1) : 'N/A';

    console.log(chalk.gray(`\n  [PERF] ${tokensPerSec} tokens/sec | ${data.eval_count} tokens | ${totalSec}s total`));
  }
}

/**
 * Ollama API Response Types
 */
interface OllamaMessage {
  role: string;
  content: string;
  tool_calls?: Array<{
    function: {
      name: string;
      arguments: any;
    };
  }>;
}

interface OllamaResponse {
  message: OllamaMessage;
  done?: boolean;
  eval_count?: number;
  eval_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  total_duration?: number;
}

/**
 * MCP Client für Ollama Integration
 */
export class OllamaMCPBridge {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private tools: any[] = [];
  private connected = false;

  constructor() {
    this.client = new Client(
      {
        name: "ollama-mcp-bridge",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Verbindet mit dem MCP Server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    console.log(chalk.blue("[say10] Connecting to MCP Server..."));

    // Finde den Pfad zum MCP Server
    const serverPath = new URL("../src/index.ts", import.meta.url).pathname;

    this.transport = new StdioClientTransport({
      command: "tsx",
      args: [serverPath],
    });

    await this.client.connect(this.transport);
    this.connected = true;

    // Lade verfügbare Tools
    await this.loadTools();

    console.log(chalk.green(`[say10] Connected. ${this.tools.length} tools available`));
  }

  /**
   * Lädt alle verfügbaren Tools vom MCP Server
   */
  private async loadTools(): Promise<void> {
    try {
      const response = await this.client.listTools();
      this.tools = response.tools || [];
    } catch (error) {
      console.error(chalk.red("[ERROR] Fehler beim Laden der Tools:"), error);
      this.tools = [];
    }
  }

  /**
   * Gibt Tools im Ollama-Format zurück
   */
  getToolsForOllama(): any[] {
    return this.tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  /**
   * Ruft ein MCP Tool auf
   */
  async callTool(name: string, args: any): Promise<string> {
    try {
      console.log(chalk.gray(`  [EXEC] ${name}(${JSON.stringify(args).substring(0, 50)}...)`));

      const result = await this.client.callTool({
        name,
        arguments: args,
      });

      if (result.content && Array.isArray(result.content) && result.content.length > 0) {
        const firstContent = result.content[0] as any;
        const text = firstContent.text || JSON.stringify(firstContent);
        return text;
      }

      return JSON.stringify(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`  [ERROR] ${errorMsg}`));
      return `Error: ${errorMsg}`;
    }
  }

  /**
   * Trennt die Verbindung
   */
  async disconnect(): Promise<void> {
    if (this.transport && this.connected) {
      await this.client.close();
      this.connected = false;
      console.log(chalk.yellow("[say10] MCP connection closed"));
    }
  }

  /**
   * Prüft ob verbunden
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Gibt alle Tools zurück
   */
  getTools(): any[] {
    return this.tools;
  }
}

/**
 * Ollama Chat Client mit MCP Integration
 */
export class OllamaWithMCP {
  private baseUrl: string;
  private model: string;
  private bridge: OllamaMCPBridge;
  private conversationHistory: Array<{ role: string; content: string; tool_calls?: any }> = [];

  constructor(
    baseUrl = config.ollama.url,
    model = config.ollama.model
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.bridge = new OllamaMCPBridge();
  }

  /**
   * Initialisiert die MCP Bridge
   */
  async initialize(): Promise<void> {
    // Setup Approval Handler
    setApprovalHandler(async (request: ApprovalRequest) => {
      console.log("");
      console.log(chalk.yellow("[WARNING] ") + chalk.bold("Approval Required"));
      console.log(chalk.gray("─".repeat(50)));
      console.log(chalk.white("Command: ") + chalk.cyan(request.command));
      console.log(chalk.white("Reason:  ") + chalk.yellow(request.reason));

      if (request.destructive) {
        console.log(chalk.red("[WARN] Destructive action"));
      }

      if (request.requiresSudo) {
        console.log(chalk.red("[WARN] Requires sudo/root privileges"));
      }

      console.log(chalk.gray("─".repeat(50)));

      const answer = await inquirer.prompt([
        {
          type: "confirm",
          name: "approve",
          message: "Command ausführen?",
          default: false,
        },
      ]);

      console.log("");

      return {
        approved: answer.approve,
        timestamp: new Date(),
      };
    });

    await this.bridge.connect();
  }

  /**
   * Setzt System Prompt
   */
  setSystemPrompt(prompt: string): void {
    this.conversationHistory = [
      {
        role: "system",
        content: prompt,
      },
    ];
  }

  /**
   * Chat mit Ollama (mit MCP Tool Support)
   */
  async chat(message: string): Promise<string> {
    this.conversationHistory.push({
      role: "user",
      content: message,
    });

    try {
      const tools = this.bridge.getToolsForOllama();

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.conversationHistory,
          stream: false,
          tools: tools.length > 0 ? tools : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;

      // Check for tool calls
      if (data.message.tool_calls && data.message.tool_calls.length > 0) {
        console.log(chalk.gray(`\n  [TOOLS] Executing ${data.message.tool_calls.length} tool(s)...`));

        // Execute tool calls
        const toolResults: string[] = [];

        for (const toolCall of data.message.tool_calls) {
          const toolResult = await this.bridge.callTool(
            toolCall.function.name,
            toolCall.function.arguments
          );
          toolResults.push(toolResult);
        }

        // Add tool results to conversation and get final response
        this.conversationHistory.push({
          role: "assistant",
          content: data.message.content || "",
          tool_calls: data.message.tool_calls,
        });

        this.conversationHistory.push({
          role: "tool",
          content: toolResults.join("\n\n"),
        });

        // Get final response with tool results
        const finalResponse = await fetch(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: this.conversationHistory,
            stream: false,
          }),
        });

        const finalData = await finalResponse.json() as OllamaResponse;
        const finalMessage = finalData.message.content;

        this.conversationHistory.push({
          role: "assistant",
          content: finalMessage,
        });

        // Zeige Performance Stats
        showPerformanceStats(finalData);

        return finalMessage;
      } else {
        // Normale Antwort ohne Tool Calls
        const assistantMessage = data.message.content;

        this.conversationHistory.push({
          role: "assistant",
          content: assistantMessage,
        });

        // Zeige Performance Stats
        showPerformanceStats(data);

        return assistantMessage;
      }
    } catch (error) {
      throw new Error(`Fehler bei Ollama Kommunikation: ${error}`);
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.bridge.disconnect();
  }

  /**
   * Löscht History
   */
  clearHistory(): void {
    const systemPrompt = this.conversationHistory.find((m) => m.role === "system");
    this.conversationHistory = systemPrompt ? [systemPrompt] : [];
  }
}

