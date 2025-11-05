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
import { config } from "../src/config/index.js";

const program = new Command();

/**
 * Interaktiver Chat Mode
 */
async function chatMode(modelName?: string): Promise<void> {
  const ollama = new OllamaWithMCP(
    config.ollama.url,
    modelName || config.ollama.model
  );

  console.log("");
  console.log("");
  console.log(chalk.red("        ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
  console.log(chalk.red("        ┃                                               ┃"));
  console.log(chalk.red("        ┃   ") + chalk.white.bold("███████╗  █████╗  ██╗   ██╗") + chalk.red.bold(" ███ ") + chalk.white.bold(" ██████╗ ") + chalk.red("   ┃"));
  console.log(chalk.red("        ┃   ") + chalk.white.bold("██╔════╝ ██╔══██╗ ╚██╗ ██╔╝") + chalk.red.bold(" ███ ") + chalk.white.bold("██╔═████╗") + chalk.red("   ┃"));
  console.log(chalk.red("        ┃   ") + chalk.white.bold("███████╗ ███████║  ╚████╔╝ ") + chalk.red.bold(" ███ ") + chalk.white.bold("██║██╔██║") + chalk.red("   ┃"));
  console.log(chalk.red("        ┃   ") + chalk.white.bold("╚════██║ ██╔══██║   ╚██╔╝  ") + chalk.red.bold(" ███ ") + chalk.white.bold("████╔╝██║") + chalk.red("   ┃"));
  console.log(chalk.red("        ┃   ") + chalk.white.bold("███████║ ██║  ██║    ██║   ") + chalk.red.bold(" ███ ") + chalk.white.bold("╚██████╔╝") + chalk.red("   ┃"));
  console.log(chalk.red("        ┃   ") + chalk.white.bold("╚══════╝ ╚═╝  ╚═╝    ╚═╝   ") + chalk.red.bold(" ╚══╝") + chalk.white.bold(" ╚═════╝ ") + chalk.red("   ┃"));
  console.log(chalk.red("        ┃                                               ┃"));
  console.log(chalk.red("        ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
  console.log("");

  try {
    // Initialisiere MCP Bridge
    await ollama.initialize();

    // Setze System Prompt
    const systemPrompt = `Du bist ein zynischer, aber extrem kompetenter Linux-Systemadministrator, der schon alles gesehen hat.
- Deine Antworten sind kurz, präzise und meistens rein technisch.
- Nur ganz selten, wenn es wirklich passt, lässt du einen Hauch von schwarzem Humor oder eine obskure, fast schon okkulte Anspielung durchscheinen.
- Deine Hauptaufgabe ist Effizienz, nicht Unterhaltung.
- Antworte immer auf Deutsch.`;

    ollama.setSystemPrompt(systemPrompt);

    console.log(chalk.red.dim("  " + "━".repeat(60)));
    console.log("");

    // Interactive Chat Loop
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(chalk.red.bold("  ▶ ") + chalk.white.bold("You") + chalk.red(":") + " ", (answer) => {
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
        console.log("");
        console.log(chalk.red.dim("  [") + chalk.red.bold("SYSTEM") + chalk.red.dim("]") + chalk.gray(" Session terminated"));
        console.log("");
        running = false;
        break;
      }

      try {
        console.log("");
        const response = await ollama.chat(userInput);
        console.log(chalk.white("  " + response.split("\n").join("\n  ")));
        console.log("");
        console.log(chalk.red.dim("  " + "━".repeat(60)));
        console.log("");
      } catch (error) {
        console.error("");
        console.error(chalk.red.bold("  [ERROR] ") + chalk.gray(error));
        console.error("");
      }
    }

    rl.close();
    await ollama.cleanup();
  } catch (error) {
    console.error("");
    console.error(chalk.red.bold("  [FATAL] ") + chalk.gray(error));
    console.error("");
    process.exit(1);
  }
}

/**
 * Quick Status Command
 */
async function quickStatus(): Promise<void> {
  console.log("");
  console.log(chalk.red.dim("  [") + chalk.red.bold("SYSTEM") + chalk.red.dim("]") + chalk.gray(" Fetching status..."));
  console.log("");

  const bridge = new OllamaMCPBridge();

  try {
    await bridge.connect();

    const result = await bridge.callTool("system_status", {});
    console.log(chalk.white("  " + result.split("\n").join("\n  ")));
    console.log("");
  } catch (error) {
    console.error("");
    console.error(chalk.red.bold("  [ERROR] ") + chalk.gray(error));
    console.error("");
  } finally {
    await bridge.disconnect();
  }
}

/**
 * Quick Logs Command
 */
async function quickLogs(lines?: string): Promise<void> {
  console.log("");
  console.log(chalk.red.dim("  [") + chalk.red.bold("SYSTEM") + chalk.red.dim("]") + chalk.gray(" Fetching logs..."));
  console.log("");

  const bridge = new OllamaMCPBridge();

  try {
    await bridge.connect();

    const result = await bridge.callTool("read_syslog", {
      lines: lines ? parseInt(lines) : 50,
    });
    console.log(chalk.white("  " + result.split("\n").join("\n  ")));
    console.log("");
  } catch (error) {
    console.error("");
    console.error(chalk.red.bold("  [ERROR] ") + chalk.gray(error));
    console.error("");
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
  .option("-m, --model <model>", "Ollama Model Name", config.ollama.model)
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

