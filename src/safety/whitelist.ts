/**
 * Whitelist Management
 * 
 * Verwaltet whitelisted Commands die ohne Approval ausgeführt werden können
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { WhitelistConfig } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let whitelistCache: WhitelistConfig | null = null;

/**
 * Lädt die Whitelist-Konfiguration
 */
export async function loadWhitelist(): Promise<WhitelistConfig> {
  if (whitelistCache) {
    return whitelistCache;
  }

  try {
    // Versuche config/whitelist.json zu laden
    const configPath = join(__dirname, "../../config/whitelist.json");
    
    if (!existsSync(configPath)) {
      console.error("⚠️ Whitelist Config nicht gefunden, verwende Default");
      return getDefaultWhitelist();
    }

    const content = await readFile(configPath, "utf-8");
    whitelistCache = JSON.parse(content);
    
    return whitelistCache!;
  } catch (error) {
    console.error("⚠️ Fehler beim Laden der Whitelist:", error);
    return getDefaultWhitelist();
  }
}

/**
 * Default Whitelist falls config fehlt
 */
function getDefaultWhitelist(): WhitelistConfig {
  return {
    commands: [
      "df",
      "free",
      "ps",
      "top",
      "htop",
      "uptime",
      "systemctl status",
      "systemctl list-units",
      "journalctl",
      "cat",
      "tail",
      "head",
      "grep",
      "ls",
      "pwd",
      "whoami",
      "date",
      "uname",
    ],
    patterns: [
      "^df\\s+",
      "^free\\s+",
      "^ps\\s+",
      "^systemctl\\s+status\\s+",
      "^systemctl\\s+list-units",
      "^journalctl\\s+",
      "^cat\\s+/var/log/",
      "^tail\\s+",
      "^grep\\s+",
      "^ls\\s+",
    ],
  };
}

/**
 * Prüft ob ein Command whitelisted ist
 */
export async function isWhitelisted(command: string): Promise<boolean> {
  const whitelist = await loadWhitelist();
  
  // Entferne führende/trailing Whitespace
  const cmd = command.trim();
  
  // Exact Match in commands
  for (const whiteCmd of whitelist.commands) {
    if (cmd === whiteCmd || cmd.startsWith(`${whiteCmd} `)) {
      return true;
    }
  }
  
  // Pattern Match
  for (const pattern of whitelist.patterns) {
    try {
      const regex = new RegExp(pattern);
      if (regex.test(cmd)) {
        return true;
      }
    } catch (e) {
      console.error(`⚠️ Ungültiges Regex Pattern: ${pattern}`);
    }
  }
  
  return false;
}

/**
 * Erkennt read-only Commands (immer sicher)
 */
export function isReadOnly(command: string): boolean {
  const cmd = command.trim().toLowerCase();
  
  const readOnlyCommands = [
    "cat",
    "tail",
    "head",
    "less",
    "more",
    "grep",
    "find",
    "ls",
    "pwd",
    "whoami",
    "date",
    "uptime",
    "df",
    "du",
    "free",
    "ps",
    "top",
    "htop",
    "systemctl status",
    "systemctl list-units",
    "systemctl is-active",
    "systemctl is-enabled",
    "journalctl",
  ];
  
  for (const readCmd of readOnlyCommands) {
    if (cmd === readCmd || cmd.startsWith(`${readCmd} `)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Cache zurücksetzen (für Testing)
 */
export function resetWhitelistCache(): void {
  whitelistCache = null;
}

