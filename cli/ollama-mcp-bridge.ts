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
import { getHistoryStorage } from "../src/history/storage.js";
import type { ToolCallRecord } from "../src/history/types.js";
import { getAchievementTracker } from "../src/achievements/tracker.js";
import { getAchievementById } from "../src/achievements/definitions.js";

/**
 * Zeige Performance Stats
 */
function showPerformanceStats(data: OllamaResponse) {
  if (data.eval_count && data.eval_duration) {
    const tokensPerSec = (data.eval_count / (data.eval_duration / 1e9)).toFixed(2);
    const totalSec = data.total_duration ? (data.total_duration / 1e9).toFixed(1) : 'N/A';

    console.log(chalk.red.dim("  [") + chalk.red.bold("PERF") + chalk.red.dim("]") +
      chalk.gray(` ${tokensPerSec} tokens/sec `) + chalk.red.dim("│") +
      chalk.gray(` ${data.eval_count} tokens `) + chalk.red.dim("│") +
      chalk.gray(` ${totalSec}s total`));
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

    console.log(chalk.red.dim("  [") + chalk.red.bold("SAY10") + chalk.red.dim("]") + chalk.gray(" Connecting to MCP Server..."));

    // Finde den Pfad zum MCP Server (kompilierte Version)
    const serverPath = new URL("../src/index.js", import.meta.url).pathname;

    this.transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    await this.client.connect(this.transport);
    this.connected = true;

    // Lade verfügbare Tools
    await this.loadTools();

    console.log(chalk.red.dim("  [") + chalk.red.bold("SAY10") + chalk.red.dim("]") + chalk.gray(` Connected. ${this.tools.length} tools available`));
  }

  /**
   * Lädt alle verfügbaren Tools vom MCP Server
   */
  private async loadTools(): Promise<void> {
    try {
      const response = await this.client.listTools();
      this.tools = response.tools || [];
    } catch (error) {
      console.error(chalk.red.bold("  [ERROR] ") + chalk.gray("Fehler beim Laden der Tools: " + error));
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
      console.log(chalk.red.dim("  [") + chalk.red.bold("EXEC") + chalk.red.dim("]") +
        chalk.gray(` ${name}(${JSON.stringify(args).substring(0, 40)}...)`));

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
      console.error(chalk.red.bold("  [ERROR] ") + chalk.gray(errorMsg));
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
      console.log(chalk.red.dim("  [") + chalk.red.bold("SAY10") + chalk.red.dim("]") + chalk.gray(" MCP connection closed"));
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
  private maxHistorySize = 50; // Max Anzahl Nachrichten in History
  private historyStorage = getHistoryStorage();
  private sessionActive = false;
  private achievementTracker = getAchievementTracker();
  private sessionStartTime = 0;

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
    // Initialize History Storage
    await this.historyStorage.initialize();
    
    // Initialize Achievement Tracker
    await this.achievementTracker.initialize();
    
    // Start new session
    this.historyStorage.startSession();
    this.sessionActive = true;
    this.sessionStartTime = Date.now();
    
    // Setup Approval Handler
    setApprovalHandler(async (request: ApprovalRequest) => {
      console.log("");
      console.log(chalk.red.dim("  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
      console.log(chalk.red.dim("  ┃ ") + chalk.red.bold("⚠  APPROVAL REQUIRED") + chalk.red.dim("                         ┃"));
      console.log(chalk.red.dim("  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫"));
      console.log(chalk.red.dim("  ┃ ") + chalk.white("Command: ") + chalk.red(request.command.substring(0, 33)) + chalk.red.dim(" ┃"));
      console.log(chalk.red.dim("  ┃ ") + chalk.white("Reason:  ") + chalk.gray(request.reason.substring(0, 33)) + chalk.red.dim(" ┃"));

      if (request.destructive) {
        console.log(chalk.red.dim("  ┃ ") + chalk.red.bold("[!] Destructive action") + chalk.red.dim("                     ┃"));
      }

      if (request.requiresSudo) {
        console.log(chalk.red.dim("  ┃ ") + chalk.red.bold("[!] Requires sudo/root") + chalk.red.dim("                     ┃"));
      }

      console.log(chalk.red.dim("  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
      console.log("");

      const answer = await inquirer.prompt([
        {
          type: "confirm",
          name: "approve",
          message: "Execute this command?",
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
    
    // Record system prompt in history
    if (this.sessionActive) {
      this.historyStorage.addMessage("system", prompt);
    }
  }

  /**
   * Chat mit Ollama (mit MCP Tool Support)
   */
  async chat(message: string): Promise<string> {
    // Record user message
    if (this.sessionActive) {
      this.historyStorage.addMessage("user", message);
    }
    
    this.conversationHistory.push({
      role: "user",
      content: message,
    });
    
    // Memory Leak Fix: Trimme History automatisch
    this.trimHistory();

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
        console.log("");
        console.log(chalk.red.dim("  [") + chalk.red.bold("TOOLS") + chalk.red.dim("]") +
          chalk.gray(` Executing ${data.message.tool_calls.length} tool(s)...`));

        // Execute tool calls
        const toolResults: string[] = [];
        const toolCallRecords: ToolCallRecord[] = [];

        for (const toolCall of data.message.tool_calls) {
          const startTime = Date.now();
          
          try {
            const toolResult = await this.bridge.callTool(
              toolCall.function.name,
              toolCall.function.arguments
            );
            toolResults.push(toolResult);
            
            const duration = Date.now() - startTime;
            
            // Record tool call in history
            if (this.sessionActive) {
              const record: ToolCallRecord = {
                tool: toolCall.function.name,
                args: toolCall.function.arguments,
                result: toolResult,
                success: !toolResult.startsWith("Error"),
                timestamp: new Date(),
                duration,
              };
              toolCallRecords.push(record);
              this.historyStorage.addToolCall(
                record.tool,
                record.args,
                record.result,
                record.success,
                record.duration
              );
              
              // Track tool usage for achievements
              const newAchievements = await this.achievementTracker.trackToolUsed(toolCall.function.name);
              this.showNewAchievements(newAchievements);
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            toolResults.push(`Error: ${errorMsg}`);
            
            const duration = Date.now() - startTime;
            
            if (this.sessionActive) {
              const record: ToolCallRecord = {
                tool: toolCall.function.name,
                args: toolCall.function.arguments,
                result: errorMsg,
                success: false,
                timestamp: new Date(),
                duration,
              };
              toolCallRecords.push(record);
              this.historyStorage.addToolCall(
                record.tool,
                record.args,
                record.result,
                record.success,
                record.duration
              );
            }
          }
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
        
        // Record assistant message in history
        if (this.sessionActive) {
          this.historyStorage.addMessage("assistant", finalMessage, toolCallRecords);
        }

        // Zeige Performance Stats
        showPerformanceStats(finalData);
        
        // Trimme History nach Tool-Execution
        this.trimHistory();

        return finalMessage;
      } else {
        // Normale Antwort ohne Tool Calls
        const assistantMessage = data.message.content;

        this.conversationHistory.push({
          role: "assistant",
          content: assistantMessage,
        });
        
        // Record assistant message in history
        if (this.sessionActive) {
          this.historyStorage.addMessage("assistant", assistantMessage);
        }

        // Zeige Performance Stats
        showPerformanceStats(data);
        
        // Trimme History
        this.trimHistory();

        return assistantMessage;
      }
    } catch (error) {
      throw new Error(`Fehler bei Ollama Kommunikation: ${error}`);
    }
  }
  
  /**
   * Trimmt die Conversation History auf maxHistorySize
   * Behält immer das System Prompt
   */
  private trimHistory(): void {
    const systemPrompt = this.conversationHistory.find((m) => m.role === "system");
    
    if (this.conversationHistory.length > this.maxHistorySize) {
      const recentMessages = this.conversationHistory.slice(-this.maxHistorySize);
      
      // Stelle sicher, dass System Prompt erhalten bleibt
      if (systemPrompt && recentMessages[0]?.role !== "system") {
        this.conversationHistory = [systemPrompt, ...recentMessages];
      } else {
        this.conversationHistory = recentMessages;
      }
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    // End session and save
    if (this.sessionActive) {
      const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      await this.historyStorage.endSession(false); // Default: not successful
      
      // Track session completion
      const newAchievements = await this.achievementTracker.trackSessionCompleted(false, duration);
      this.showNewAchievements(newAchievements);
      
      this.sessionActive = false;
    }
    
    await this.bridge.disconnect();
  }
  
  /**
   * End session successfully
   */
  async endSessionSuccessfully(): Promise<void> {
    if (this.sessionActive) {
      const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      await this.historyStorage.endSession(true);
      
      // Track successful session
      const newAchievements = await this.achievementTracker.trackSessionCompleted(true, duration);
      this.showNewAchievements(newAchievements);
      
      this.sessionActive = false;
    }
  }
  
  /**
   * Show newly unlocked achievements
   */
  private showNewAchievements(achievementIds: string[]): void {
    if (achievementIds.length === 0) return;
    
    console.log("");
    console.log(chalk.yellow.bold("  [!] ACHIEVEMENT UNLOCKED [!]"));
    console.log("");
    
    for (const id of achievementIds) {
      const achievement = getAchievementById(id);
      if (!achievement) continue;
      
      console.log(chalk.yellow(`  ${achievement.icon} ${achievement.name} (+${achievement.points} pts)`));
      console.log(chalk.gray(`     ${achievement.description}`));
      console.log("");
    }
  }
  
  /**
   * Update session metadata
   */
  updateSessionMetadata(metadata: { problem?: string; solution?: string }): void {
    if (this.sessionActive) {
      this.historyStorage.updateMetadata(metadata);
    }
  }

  /**
   * Löscht History
   */
  clearHistory(): void {
    const systemPrompt = this.conversationHistory.find((m) => m.role === "system");
    this.conversationHistory = systemPrompt ? [systemPrompt] : [];
  }
}

