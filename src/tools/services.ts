/**
 * Service Control Tools
 *
 * Tools für systemd Service Management
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { execa } from "execa";
import { sanitizeServiceName } from "../utils/validation.js";

/**
 * Gibt alle Service Tools zurück
 */
export function getServiceTools(): Tool[] {
  return [
    {
      name: "list_services",
      description: "Liste alle systemd Services mit ihrem Status. Nutze dies um einen Überblick über Services zu bekommen.",
      inputSchema: {
        type: "object",
        properties: {
          state: {
            type: "string",
            description: "Filter nach Status: active, inactive, failed, running (optional)",
          },
        },
      },
    },
    {
      name: "service_status",
      description: "Zeigt detaillierten Status eines spezifischen Service. Nutze dies um Service-Probleme zu diagnostizieren.",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "Name des Service (z.B. nginx, apache2, mysql)",
          },
        },
        required: ["service"],
      },
    },
    {
      name: "restart_service",
      description: "Startet einen Service neu. ACHTUNG: Dies ist eine destructive Action und erfordert Approval!",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "Name des Service der neugestartet werden soll",
          },
        },
        required: ["service"],
      },
    },
    {
      name: "enable_service",
      description: "Aktiviert einen Service für Autostart beim Boot. Erfordert Approval.",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "Name des Service der aktiviert werden soll",
          },
        },
        required: ["service"],
      },
    },
    {
      name: "check_service_logs",
      description: "Zeigt die letzten Log-Einträge eines spezifischen Service. Nutze dies für Service-Debugging.",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "Name des Service",
          },
          lines: {
            type: "number",
            description: "Anzahl der Log-Zeilen (default: 50)",
          },
        },
        required: ["service"],
      },
    },
  ];
}

/**
 * Handle Service Tool Calls
 */
export async function handleServiceTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  switch (name) {
    case "list_services":
      return await listServices(args.state as string | undefined);
    case "service_status":
      return await serviceStatus(args.service as string);
    case "restart_service":
      return await restartService(args.service as string);
    case "enable_service":
      return await enableService(args.service as string);
    case "check_service_logs":
      return await checkServiceLogs(
        args.service as string,
        args.lines as number | undefined
      );
    default:
      throw new Error(`Unbekanntes Service Tool: ${name}`);
  }
}

/**
 * List Services
 */
async function listServices(
  state?: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const args = ["list-units", "--type=service", "--no-pager", "--no-legend"];
    
    if (state) {
      args.push(`--state=${state}`);
    }
    
    const { stdout } = await execa("systemctl", args, {
      timeout: 10000, // 10 Sekunden
    });
    
    const lines = stdout.split("\n").filter(l => l.trim());
    
    let output = `[SVC] System Services\n\n`;
    
    if (state) {
      output += `Filter: ${state}\n`;
    }
    
    output += `Gesamt: ${lines.length} Services\n\n`;
    
    // Parse service list
    const services: Array<{
      name: string;
      load: string;
      active: string;
      sub: string;
      description: string;
    }> = [];
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        services.push({
          name: parts[0],
          load: parts[1],
          active: parts[2],
          sub: parts[3],
          description: parts.slice(4).join(" "),
        });
      }
    }
    
    // Gruppiere nach Status
    const active = services.filter(s => s.active === "active");
    const failed = services.filter(s => s.active === "failed");
    const inactive = services.filter(s => s.active === "inactive");
    
    if (!state) {
      output += `[OK] Active: ${active.length}\n`;
      output += `[FAIL] Failed: ${failed.length}\n`;
      output += `[OFF] Inactive: ${inactive.length}\n\n`;
    }
    
    // Zeige failed services prominent
    if (failed.length > 0 && (!state || state === "failed")) {
      output += `[FAIL] Failed Services:\n`;
      for (const svc of failed) {
        output += `- ${svc.name}: ${svc.description}\n`;
      }
      output += "\n";
    }
    
    // Zeige wichtigste active services
    if (active.length > 0 && (!state || state === "active")) {
      const important = active
        .filter(s => 
          s.name.includes("nginx") ||
          s.name.includes("apache") ||
          s.name.includes("mysql") ||
          s.name.includes("postgresql") ||
          s.name.includes("docker") ||
          s.name.includes("ssh")
        )
        .slice(0, 10);
      
      if (important.length > 0) {
        output += `Wichtige Active Services:\n`;
        for (const svc of important) {
          output += `- [OK] ${svc.name}: ${svc.sub}\n`;
        }
        output += "\n";
      }
    }
    
    // Bei spezifischem Filter: Zeige alle
    if (state && services.length <= 20) {
      output += `Alle Services:\n`;
      for (const svc of services) {
        const status = svc.active === "active" ? "[OK]" : svc.active === "failed" ? "[FAIL]" : "[OFF]";
        output += `- ${status} ${svc.name}: ${svc.sub}\n`;
      }
    }
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Service-Liste: ${error}`);
  }
}

/**
 * Service Status
 */
async function serviceStatus(
  service: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validate and sanitize service name to prevent command injection
    const sanitized = sanitizeServiceName(service);
    const serviceName = sanitized.endsWith(".service") ? sanitized : `${sanitized}.service`;
    
    const { stdout, stderr, exitCode } = await execa("systemctl", ["status", serviceName], {
      reject: false,
      timeout: 5000, // 5 Sekunden
    });
    
    let output = `[SVC] Service Status: ${service}\n\n`;
    
    if (exitCode !== 0 && !stdout && stderr) {
      output += `[ERR] Service nicht gefunden oder nicht verfügbar.\n\n`;
      output += `Error: ${stderr}\n`;
      return {
        content: [{ type: "text", text: output }],
      };
    }
    
    // Parse Status
    const isActive = stdout.includes("Active: active");
    const isFailed = stdout.includes("Active: failed");
    const isInactive = stdout.includes("Active: inactive");
    
    if (isActive) {
      output += `Status: [OK] Active & Running\n\n`;
    } else if (isFailed) {
      output += `Status: [FAIL] Failed\n\n`;
    } else if (isInactive) {
      output += `Status: [OFF] Inactive\n\n`;
    } else {
      output += `Status: [WARN] Unknown\n\n`;
    }
    
    output += "```\n";
    output += stdout;
    output += "\n```\n";
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen des Service-Status: ${error}`);
  }
}

/**
 * Restart Service
 * NOTE: Dies erfordert Approval im Safety System!
 */
async function restartService(
  service: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validate and sanitize service name to prevent command injection
    const sanitized = sanitizeServiceName(service);
    const serviceName = sanitized.endsWith(".service") ? sanitized : `${sanitized}.service`;

    // WICHTIG: Dies sollte nur nach Approval ausgeführt werden!
    // Die Approval-Logik wird im CLI/Safety Layer implementiert
    const { stdout, stderr } = await execa("sudo", ["systemctl", "restart", serviceName], {
      timeout: 30000, // 30 Sekunden (Restart kann länger dauern)
    });
    
    let output = `[RESTART] Service Restart: ${service}\n\n`;
    output += `[OK] Service wurde erfolgreich neugestartet.\n\n`;
    
    if (stdout) {
      output += `Output:\n${stdout}\n\n`;
    }
    
    // Verifiziere Status nach Restart
    try {
      const { stdout: statusOut } = await execa("systemctl", ["is-active", serviceName], {
        reject: false,
        timeout: 3000, // 3 Sekunden
      });
      
      if (statusOut.trim() === "active") {
        output += `Status: [OK] Service läuft\n`;
      } else {
        output += `[WARN] Status: ${statusOut.trim()}\n`;
      }
    } catch (e) {
      // Ignore
    }
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `[ERR] Fehler beim Neustarten des Service: ${errorMsg}`,
        },
      ],
    };
  }
}

/**
 * Enable Service
 * NOTE: Dies erfordert Approval im Safety System!
 */
async function enableService(
  service: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validate and sanitize service name to prevent command injection
    const sanitized = sanitizeServiceName(service);
    const serviceName = sanitized.endsWith(".service") ? sanitized : `${sanitized}.service`;
    
    const { stdout } = await execa("sudo", ["systemctl", "enable", serviceName], {
      timeout: 10000, // 10 Sekunden
    });
    
    let output = `[SVC] Service Enable: ${service}\n\n`;
    output += `[OK] Service wurde für Autostart aktiviert.\n\n`;
    
    if (stdout) {
      output += `Output:\n${stdout}\n`;
    }
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `[ERR] Fehler beim Aktivieren des Service: ${errorMsg}`,
        },
      ],
    };
  }
}

/**
 * Check Service Logs
 */
async function checkServiceLogs(
  service: string,
  lines: number = 50
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validate and sanitize service name to prevent command injection
    const sanitized = sanitizeServiceName(service);
    const serviceName = sanitized.endsWith(".service") ? sanitized : `${sanitized}.service`;
    
    const { stdout } = await execa("journalctl", [
      "-u",
      serviceName,
      "-n",
      String(lines),
      "--no-pager",
    ], {
      timeout: 10000, // 10 Sekunden
    });
    
    let output = `[LOG] Service Logs: ${service}\n\n`;
    output += `Letzte ${lines} Einträge:\n\n`;
    output += "```\n";
    output += stdout || "Keine Log-Einträge gefunden";
    output += "\n```\n";
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Service-Logs: ${error}`);
  }
}

