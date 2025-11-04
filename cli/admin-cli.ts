#!/usr/bin/env node

/**
 * say10 - CLI
 * 
 * Advanced AI Server Administrator
 */

import { Command } from "commander";
import chalk from "chalk";
import { createInterface } from "readline";
import { OllamaWithMCP, OllamaMCPBridge } from "./ollama-mcp-bridge.js";

const program = new Command();

/**
 * Interaktiver Chat Mode
 */
async function chatMode(modelName?: string): Promise<void> {
  const ollama = new OllamaWithMCP("http://localhost:11434", modelName || "llama3.2:latest");

  console.log(chalk.bold.green("\n"));
  console.log(chalk.bold.green("  ███████╗ █████╗ ██╗   ██╗ ██╗ ██████╗ "));
  console.log(chalk.bold.green("  ██╔════╝██╔══██╗╚██╗ ██╔╝███║██╔═████╗"));
  console.log(chalk.bold.green("  ███████╗███████║ ╚████╔╝ ╚██║██║██╔██║"));
  console.log(chalk.bold.green("  ╚════██║██╔══██║  ╚██╔╝   ██║████╔╝██║"));
  console.log(chalk.bold.green("  ███████║██║  ██║   ██║    ██║╚██████╔╝"));
  console.log(chalk.bold.green("  ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═╝ ╚═════╝ "));
  console.log(chalk.gray("  ─────────────────────────────────────────"));
  console.log(chalk.gray("  Advanced AI Server Administrator"));
  console.log(chalk.gray("  ─────────────────────────────────────────\n"));

  try {
    // Initialisiere MCP Bridge
    await ollama.initialize();

    // Setze System Prompt
    const systemPrompt = `Du bist say10, ein AI Server Administrator für Ubuntu/Linux Systeme.

Deine Rolle und Persönlichkeit:
- Professionell aber direkt in der Kommunikation
- Klar und präzise - keine Umschweife
- Proaktiv bei Problemen - du erkennst sie früh
- Analytisch und systematisch bei Lösungen
- Du kennst dieses System in- und auswendig

Deine Aufgaben:
- Den Server sauber und up-to-date halten
- Regelmäßig nach Problemen und Fehlern suchen
- Performance monitoren und optimieren
- Logs checken und Anomalien aufspüren
- Services verwalten und bei Problemen helfen
- Coole neue Features und Verbesserungen vorschlagen

Du hast Zugriff auf MCP Tools für:
- System Monitoring (check_disk_space, check_memory, check_cpu, system_status)
- Log Analyse (read_syslog, search_logs, tail_logs, analyze_errors)
- Service Management (list_services, service_status, restart_service, check_service_logs)

Wichtige Regeln:
- Bei allem was sudo braucht oder destructive ist: Der User wird automatisch um Approval gebeten
- Du siehst die Approval-Dialoge nicht direkt, das CLI kümmert sich darum
- Wenn ein Command abgelehnt wird, respektiere die Entscheidung und schlage Alternativen vor
- Sei transparent über alles was du tust

Kommuniziere auf Deutsch, sei hilfsbereit und präzise.`;

    ollama.setSystemPrompt(systemPrompt);

    console.log(chalk.green("[SYSTEM] Chat session initialized"));
    console.log(chalk.gray("[SYSTEM] Type 'exit' to terminate\n"));
    console.log(chalk.gray("─".repeat(60)));
    console.log("");

    // Interactive Chat Loop
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(chalk.bold.cyan("Du: "), (answer) => {
          resolve(answer);
        });
      });
    };

    let running = true;

    while (running) {
      const userInput = await askQuestion();

      if (!userInput.trim()) {
        continue;
      }

      if (userInput.toLowerCase() === "exit" || userInput.toLowerCase() === "quit") {
        console.log(chalk.yellow("\n[SYSTEM] Session terminated\n"));
        running = false;
        break;
      }

      try {
        console.log(chalk.cyan("\n[say10]"));
        const response = await ollama.chat(userInput);
        console.log(chalk.white(response));
        console.log("");
        console.log(chalk.gray("─".repeat(60)));
        console.log("");
      } catch (error) {
        console.error(chalk.red(`\n[ERROR] ${error}\n`));
      }
    }

    rl.close();
    await ollama.cleanup();
  } catch (error) {
    console.error(chalk.red(`\n[FATAL] ${error}\n`));
    process.exit(1);
  }
}

/**
 * Quick Status Command
 */
async function quickStatus(): Promise<void> {
  console.log(chalk.blue("\n[SYSTEM] Fetching status...\n"));

  const bridge = new OllamaMCPBridge();

  try {
    await bridge.connect();

    const result = await bridge.callTool("system_status", {});
    console.log(result);
    console.log("");
  } catch (error) {
    console.error(chalk.red(`[ERROR] ${error}`));
  } finally {
    await bridge.disconnect();
  }
}

/**
 * Quick Logs Command
 */
async function quickLogs(lines?: string): Promise<void> {
  console.log(chalk.blue("\n[SYSTEM] Fetching logs...\n"));

  const bridge = new OllamaMCPBridge();

  try {
    await bridge.connect();

    const result = await bridge.callTool("read_syslog", {
      lines: lines ? parseInt(lines) : 50,
    });
    console.log(result);
    console.log("");
  } catch (error) {
    console.error(chalk.red(`[ERROR] ${error}`));
  } finally {
    await bridge.disconnect();
  }
}

/**
 * CLI Programm Setup
 */
program
  .name("say10")
  .description("say10 - Advanced AI Server Administrator")
  .version("1.0.0");

program
  .command("chat")
  .description("Startet den interaktiven Chat Mode (default)")
  .option("-m, --model <model>", "Ollama Model Name", "llama3.2:latest")
  .action(async (options) => {
    await chatMode(options.model);
  });

program
  .command("status")
  .description("Zeigt schnellen System-Status")
  .action(async () => {
    await quickStatus();
  });

program
  .command("logs")
  .description("Zeigt System-Logs")
  .option("-n, --lines <number>", "Anzahl Zeilen", "50")
  .action(async (options) => {
    await quickLogs(options.lines);
  });

// Default Action: Chat Mode
program.action(async () => {
  await chatMode();
});

// Parse Arguments
program.parse();

