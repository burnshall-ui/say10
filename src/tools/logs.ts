/**
 * Log Analysis Tools
 *
 * Tools für System- und Application-Log Analyse
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { execa } from "execa";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { sanitizeLogPath, sanitizeSearchPattern } from "../utils/validation.js";

/**
 * Gibt alle Log Tools zurück
 */
export function getLogTools(): Tool[] {
  return [
    {
      name: "read_syslog",
      description: "Liest die letzten System Log Einträge. Nutze dies um System-Ereignisse und Fehler zu analysieren.",
      inputSchema: {
        type: "object",
        properties: {
          lines: {
            type: "number",
            description: "Anzahl der letzten Log-Zeilen (default: 50)",
          },
          priority: {
            type: "string",
            description: "Log-Priorität Filter: emerg, alert, crit, err, warning, notice, info, debug",
          },
        },
      },
    },
    {
      name: "search_logs",
      description: "Durchsucht System-Logs nach einem Pattern oder Keyword. Nutze dies um spezifische Fehler oder Events zu finden.",
      inputSchema: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "Suchbegriff oder Regex Pattern",
          },
          lines: {
            type: "number",
            description: "Max Anzahl Ergebnisse (default: 100)",
          },
        },
        required: ["pattern"],
      },
    },
    {
      name: "tail_logs",
      description: "Zeigt die neuesten Einträge einer spezifischen Log-Datei. Nutze dies für Custom Application Logs.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Pfad zur Log-Datei (z.B. /var/log/nginx/error.log)",
          },
          lines: {
            type: "number",
            description: "Anzahl der letzten Zeilen (default: 50)",
          },
        },
        required: ["path"],
      },
    },
    {
      name: "analyze_errors",
      description: "Analysiert System-Logs auf Error-Patterns und gibt eine Zusammenfassung. Nutze dies für Error-Diagnostik.",
      inputSchema: {
        type: "object",
        properties: {
          hours: {
            type: "number",
            description: "Anzahl Stunden zurück zu analysieren (default: 24)",
          },
        },
      },
    },
  ];
}

/**
 * Handle Log Tool Calls
 */
export async function handleLogTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  switch (name) {
    case "read_syslog":
      return await readSyslog(
        args.lines as number | undefined,
        args.priority as string | undefined
      );
    case "search_logs":
      return await searchLogs(
        args.pattern as string,
        args.lines as number | undefined
      );
    case "tail_logs":
      return await tailLogs(
        args.path as string,
        args.lines as number | undefined
      );
    case "analyze_errors":
      return await analyzeErrors(args.hours as number | undefined);
    default:
      throw new Error(`Unbekanntes Log Tool: ${name}`);
  }
}

/**
 * Read Syslog
 */
async function readSyslog(
  lines: number = 50,
  priority?: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const args = ["-n", String(lines), "--no-pager"];
    
    if (priority) {
      args.push("-p", priority);
    }
    
    const { stdout } = await execa("journalctl", args, {
      timeout: 10000, // 10 Sekunden
    });
    
    let output = `[LOG] System Logs (letzte ${lines} Einträge)\n\n`;
    
    if (priority) {
      output += `Filter: Priorität ${priority}\n\n`;
    }
    
    output += "```\n";
    output += stdout || "Keine Log-Einträge gefunden";
    output += "\n```\n";
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    // Fallback: Versuche /var/log/syslog zu lesen
    if (existsSync("/var/log/syslog")) {
      try {
        const { stdout } = await execa("tail", ["-n", String(lines), "/var/log/syslog"], {
          timeout: 5000, // 5 Sekunden
        });
        let output = `[LOG] System Logs (letzte ${lines} Einträge aus /var/log/syslog)\n\n`;
        output += "```\n";
        output += stdout;
        output += "\n```\n";
        return {
          content: [{ type: "text", text: output }],
        };
      } catch (e) {
        throw new Error(`Fehler beim Lesen von Logs: ${e}`);
      }
    }
    throw new Error(`Fehler beim Lesen von journalctl: ${error}`);
  }
}

/**
 * Search Logs
 */
async function searchLogs(
  pattern: string,
  lines: number = 100
): Promise<{ content: Array<{ type: string; text: string }> }> {
  // Validate and sanitize pattern to prevent ReDoS attacks (außerhalb try-catch)
  const sanitizedPattern = sanitizeSearchPattern(pattern);
  
  try {
    const { stdout } = await execa("journalctl", [
      "-n",
      String(lines * 10), // Mehr Zeilen durchsuchen
      "--no-pager",
      "-g",
      sanitizedPattern,
    ], {
      timeout: 15000, // 15 second timeout to prevent hanging
    });
    
    const matchedLines = stdout.split("\n").slice(-lines); // Nur die letzten N Treffer
    
    let output = `[SEARCH] Log Search: "${pattern}"\n\n`;
    output += `Gefunden: ${matchedLines.length} Treffer\n\n`;
    
    if (matchedLines.length > 0) {
      output += "```\n";
      output += matchedLines.join("\n");
      output += "\n```\n";
    } else {
      output += "Keine Treffer gefunden.\n";
    }
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    // Fallback: grep in /var/log/syslog
    if (existsSync("/var/log/syslog")) {
      try {
        const { stdout } = await execa("grep", [sanitizedPattern, "/var/log/syslog"], {
          reject: false,
          timeout: 10000, // 10 Sekunden
        });
        
        const matchedLines = stdout.split("\n").filter(l => l.trim()).slice(-lines);
        
        let output = `[SEARCH] Log Search: "${pattern}" (in /var/log/syslog)\n\n`;
        output += `Gefunden: ${matchedLines.length} Treffer\n\n`;
        
        if (matchedLines.length > 0) {
          output += "```\n";
          output += matchedLines.join("\n");
          output += "\n```\n";
        } else {
          output += "Keine Treffer gefunden.\n";
        }
        
        return {
          content: [{ type: "text", text: output }],
        };
      } catch (e) {
        throw new Error(`Fehler beim Durchsuchen der Logs: ${e}`);
      }
    }
    throw new Error(`Fehler beim Durchsuchen der Logs: ${error}`);
  }
}

/**
 * Tail Logs from specific file
 */
async function tailLogs(
  path: string,
  lines: number = 50
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validate and sanitize path to prevent path traversal attacks
    const sanitizedPath = sanitizeLogPath(path);

    if (!existsSync(sanitizedPath)) {
      throw new Error(`Log-Datei nicht gefunden: ${path}`);
    }

    const { stdout } = await execa("tail", ["-n", String(lines), sanitizedPath], {
      timeout: 10000, // 10 Sekunden
    });
    
    let output = `[FILE] Log File: ${path}\n\n`;
    output += `Letzte ${lines} Zeilen:\n\n`;
    output += "```\n";
    output += stdout;
    output += "\n```\n";
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Lesen der Log-Datei: ${error}`);
  }
}

/**
 * Analyze Errors in Logs
 */
async function analyzeErrors(
  hours: number = 24
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Suche nach Errors in journalctl
    const { stdout } = await execa("journalctl", [
      "--since",
      `${hours} hours ago`,
      "-p",
      "err",
      "--no-pager",
    ], {
      timeout: 15000, // 15 Sekunden
    });
    
    const lines = stdout.split("\n").filter(l => l.trim());
    
    // Gruppiere Fehler nach Pattern
    const errorPatterns: Record<string, number> = {};
    const errorSamples: Record<string, string> = {};
    
    for (const line of lines) {
      // Extrahiere Error-Pattern (ohne Timestamps und spezifische Werte)
      const cleanLine = line
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^ ]*/g, "TIMESTAMP")
        .replace(/\d+/g, "NUM")
        .replace(/[a-f0-9]{8,}/gi, "HEX");
      
      const pattern = cleanLine.substring(0, 100); // Erste 100 Zeichen als Pattern
      
      if (!errorPatterns[pattern]) {
        errorPatterns[pattern] = 0;
        errorSamples[pattern] = line;
      }
      errorPatterns[pattern]++;
    }
    
    // Sortiere nach Häufigkeit
    const sorted = Object.entries(errorPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10
    
    let output = `[ERR] Error Analysis (letzte ${hours} Stunden)\n\n`;
    output += `Gesamt Errors: ${lines.length}\n`;
    output += `Unique Patterns: ${Object.keys(errorPatterns).length}\n\n`;
    
    if (sorted.length > 0) {
      output += `Top ${sorted.length} Error Patterns:\n\n`;
      
      for (let i = 0; i < sorted.length; i++) {
        const [pattern, count] = sorted[i];
        output += `${i + 1}. ${count}x - ${errorSamples[pattern]}\n\n`;
      }
    } else {
      output += "[OK] Keine Errors in diesem Zeitraum gefunden!\n";
    }
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler bei Error-Analyse: ${error}`);
  }
}

