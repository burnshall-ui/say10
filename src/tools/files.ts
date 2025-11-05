/**
 * File Management Tools
 *
 * Tools für allgemeines Dateisystem-Management
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from "fs";
import { join, resolve, dirname, basename } from "path";
import { execa } from "execa";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("file-tools");

/**
 * Gibt alle File Tools zurück
 */
export function getFileTools(): Tool[] {
  return [
    {
      name: "read_file",
      description: "Liest den Inhalt einer Datei. Unterstützt Text- und Binärdateien.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Absoluter oder relativer Pfad zur Datei",
          },
          encoding: {
            type: "string",
            description: "Encoding (default: utf-8)",
            enum: ["utf-8", "ascii", "base64"],
          },
          lines: {
            type: "number",
            description: "Nur die ersten N Zeilen lesen (optional)",
          },
        },
        required: ["path"],
      },
    },
    {
      name: "list_directory",
      description: "Listet den Inhalt eines Verzeichnisses auf mit Details (Typ, Größe, Permissions).",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Pfad zum Verzeichnis (default: aktuelles Verzeichnis)",
          },
          show_hidden: {
            type: "boolean",
            description: "Zeige versteckte Dateien (default: false)",
          },
          recursive: {
            type: "boolean",
            description: "Rekursiv durch Unterverzeichnisse (default: false)",
          },
        },
      },
    },
    {
      name: "search_files",
      description: "Sucht Dateien nach Namen-Pattern (wie 'find'). Nutze Wildcards: *.js, test*.txt",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Startverzeichnis für die Suche",
          },
          pattern: {
            type: "string",
            description: "Dateinamen-Pattern (z.B. '*.log', 'config*')",
          },
          max_depth: {
            type: "number",
            description: "Maximale Verzeichnistiefe (default: 5)",
          },
        },
        required: ["pattern"],
      },
    },
    {
      name: "get_file_info",
      description: "Zeigt detaillierte Informationen über eine Datei oder Verzeichnis (Größe, Permissions, Timestamps).",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Pfad zur Datei oder Verzeichnis",
          },
        },
        required: ["path"],
      },
    },
    {
      name: "find_in_files",
      description: "Sucht nach Text/Pattern in Dateien (wie grep -r). Sehr mächtig für Code-Suche.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Verzeichnis zum Durchsuchen",
          },
          pattern: {
            type: "string",
            description: "Suchtext oder Regex-Pattern",
          },
          file_pattern: {
            type: "string",
            description: "Nur in Dateien mit diesem Pattern suchen (z.B. '*.js')",
          },
          case_sensitive: {
            type: "boolean",
            description: "Groß-/Kleinschreibung beachten (default: false)",
          },
          max_results: {
            type: "number",
            description: "Maximale Anzahl Ergebnisse (default: 50)",
          },
        },
        required: ["pattern"],
      },
    },
    {
      name: "get_current_directory",
      description: "Zeigt das aktuelle Arbeitsverzeichnis an.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

/**
 * Handle File Tool Calls
 */
export async function handleFileTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  switch (name) {
    case "read_file":
      return await readFile(args);
    case "list_directory":
      return await listDirectory(args);
    case "search_files":
      return await searchFiles(args);
    case "get_file_info":
      return await getFileInfo(args);
    case "find_in_files":
      return await findInFiles(args);
    case "get_current_directory":
      return await getCurrentDirectory();
    default:
      throw new Error(`Unbekanntes File Tool: ${name}`);
  }
}

/**
 * Validiert Dateisystem-Pfad (weniger restriktiv als Log-Pfade)
 */
function sanitizeFilePath(path: string): string {
  const resolved = resolve(path);

  // Blockiere nur gefährliche System-Verzeichnisse
  const forbidden = ["/proc", "/sys", "/dev"];
  for (const dir of forbidden) {
    if (resolved.startsWith(dir)) {
      throw new Error(`Zugriff auf ${dir} ist nicht erlaubt`);
    }
  }

  return resolved;
}

/**
 * Read File
 */
async function readFile(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const path = sanitizeFilePath(String(args.path));
    const encoding = (args.encoding as string) || "utf-8";
    const maxLines = args.lines as number | undefined;

    const content = await fs.readFile(path, encoding as BufferEncoding);

    let output = `[FILE] ${path}\n\n`;

    if (maxLines) {
      const lines = content.split("\n").slice(0, maxLines);
      output += lines.join("\n");
      if (content.split("\n").length > maxLines) {
        output += `\n\n... (${content.split("\n").length - maxLines} weitere Zeilen)`;
      }
    } else {
      output += content;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Lesen der Datei: ${error}`);
  }
}

/**
 * List Directory
 */
async function listDirectory(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const path = sanitizeFilePath(args.path ? String(args.path) : process.cwd());
    const showHidden = args.show_hidden as boolean | undefined;
    const recursive = args.recursive as boolean | undefined;

    let output = `[DIR] ${path}\n\n`;

    if (recursive) {
      // Rekursiv mit 'find'
      const { stdout } = await execa("find", [path, "-maxdepth", "3", "-ls"], {
        timeout: 10000,
      });
      output += stdout;
    } else {
      // Normale ls-Ausgabe
      const lsArgs = ["-lh", path];
      if (showHidden) {
        lsArgs.push("-a");
      }

      const { stdout } = await execa("ls", lsArgs, {
        timeout: 5000,
      });

      output += stdout;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Auflisten des Verzeichnisses: ${error}`);
  }
}

/**
 * Search Files
 */
async function searchFiles(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const path = sanitizeFilePath(args.path ? String(args.path) : process.cwd());
    const pattern = String(args.pattern);
    const maxDepth = (args.max_depth as number) || 5;

    const { stdout } = await execa(
      "find",
      [path, "-maxdepth", String(maxDepth), "-name", pattern, "-type", "f"],
      { timeout: 15000 }
    );

    const files = stdout.split("\n").filter(f => f.trim());

    let output = `[SEARCH] Gefundene Dateien: ${pattern}\n\n`;
    output += `Verzeichnis: ${path}\n`;
    output += `Ergebnisse: ${files.length}\n\n`;

    if (files.length > 0) {
      output += files.join("\n");
    } else {
      output += "Keine Dateien gefunden.";
    }

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler bei der Dateisuche: ${error}`);
  }
}

/**
 * Get File Info
 */
async function getFileInfo(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const path = sanitizeFilePath(String(args.path));
    const stats = await fs.stat(path);

    let output = `[INFO] ${path}\n\n`;
    output += `Typ: ${stats.isDirectory() ? "Verzeichnis" : stats.isFile() ? "Datei" : "Andere"}\n`;
    output += `Größe: ${formatBytes(stats.size)}\n`;
    output += `Permissions: ${stats.mode.toString(8).slice(-3)}\n`;
    output += `Erstellt: ${stats.birthtime.toISOString()}\n`;
    output += `Geändert: ${stats.mtime.toISOString()}\n`;
    output += `Letzter Zugriff: ${stats.atime.toISOString()}\n`;

    if (stats.isDirectory()) {
      const entries = await fs.readdir(path);
      output += `\nInhalt: ${entries.length} Einträge`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Datei-Informationen: ${error}`);
  }
}

/**
 * Find in Files
 */
async function findInFiles(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const path = sanitizeFilePath(args.path ? String(args.path) : process.cwd());
    const pattern = String(args.pattern);
    const filePattern = args.file_pattern as string | undefined;
    const caseSensitive = args.case_sensitive as boolean | undefined;
    const maxResults = (args.max_results as number) || 50;

    const grepArgs = ["-r", "-n"];

    if (!caseSensitive) {
      grepArgs.push("-i");
    }

    if (filePattern) {
      grepArgs.push("--include", filePattern);
    }

    grepArgs.push(pattern, path);

    const { stdout } = await execa("grep", grepArgs, {
      timeout: 15000,
      reject: false, // grep gibt exit code 1 wenn nichts gefunden
    });

    const lines = stdout.split("\n").filter(l => l.trim()).slice(0, maxResults);

    let output = `[GREP] Suche nach: "${pattern}"\n`;
    output += `Verzeichnis: ${path}\n`;
    if (filePattern) {
      output += `Dateien: ${filePattern}\n`;
    }
    output += `Ergebnisse: ${lines.length}\n\n`;

    if (lines.length > 0) {
      output += lines.join("\n");
    } else {
      output += "Keine Treffer gefunden.";
    }

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler bei der Text-Suche: ${error}`);
  }
}

/**
 * Get Current Directory
 */
async function getCurrentDirectory(): Promise<{
  content: Array<{ type: string; text: string }>;
}> {
  const cwd = process.cwd();
  return {
    content: [
      {
        type: "text",
        text: `[CWD] Aktuelles Verzeichnis:\n\n${cwd}`,
      },
    ],
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
