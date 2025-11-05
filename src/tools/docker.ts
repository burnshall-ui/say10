/**
 * Docker Container Management Tools
 * 
 * Tools für Docker Container Monitoring und Management
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { execa } from "execa";
import { sanitizeContainerName, sanitizeDockerCommand, parseIntSafe } from "../utils/validation.js";
import { requestApproval } from "../safety/approval.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger('docker-tools');

/**
 * Gibt alle Docker Tools zurück
 */
export function getDockerTools(): Tool[] {
  return [
    {
      name: "docker_status",
      description: "Zeigt alle Docker Container mit Status, Uptime und Resource Usage. Nutze dies für einen Docker-Überblick.",
      inputSchema: {
        type: "object",
        properties: {
          all: {
            type: "boolean",
            description: "Zeige auch gestoppte Container (default: false)",
          },
        },
      },
    },
    {
      name: "docker_health",
      description: "Zeigt detaillierte Health-Informationen für einen oder alle Container. Nutze dies um Container-Probleme zu diagnostizieren.",
      inputSchema: {
        type: "object",
        properties: {
          container: {
            type: "string",
            description: "Container Name oder ID (optional, zeigt alle wenn nicht angegeben)",
          },
        },
      },
    },
    {
      name: "docker_logs",
      description: "Zeigt Logs eines Docker Containers. Nutze dies um Container-Probleme zu analysieren.",
      inputSchema: {
        type: "object",
        properties: {
          container: {
            type: "string",
            description: "Container Name oder ID (erforderlich)",
          },
          lines: {
            type: "number",
            description: "Anzahl der letzten Log-Zeilen (default: 50, max: 500)",
          },
          since: {
            type: "string",
            description: "Zeige Logs seit Zeitpunkt (z.B. '5m', '1h', '2024-01-01')",
          },
        },
        required: ["container"],
      },
    },
    {
      name: "docker_resources",
      description: "Zeigt CPU, Memory, Network und Disk Usage aller laufenden Container. Nutze dies um Resource-Probleme zu finden.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "docker_restart",
      description: "Startet einen Docker Container neu. Dies ist eine destructive Action und benötigt Approval.",
      inputSchema: {
        type: "object",
        properties: {
          container: {
            type: "string",
            description: "Container Name oder ID (erforderlich)",
          },
          timeout: {
            type: "number",
            description: "Timeout in Sekunden bevor Force-Kill (default: 10)",
          },
        },
        required: ["container"],
      },
    },
    {
      name: "docker_compose_status",
      description: "Zeigt Status aller Services in einem Docker Compose Project. Nutze dies für Compose-basierte Deployments.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: {
            type: "string",
            description: "Pfad zum Docker Compose Projekt (default: aktuelles Verzeichnis)",
          },
        },
      },
    },
    {
      name: "docker_inspect",
      description: "Zeigt detaillierte Informationen über einen Container (Konfiguration, Netzwerk, Volumes, etc.).",
      inputSchema: {
        type: "object",
        properties: {
          container: {
            type: "string",
            description: "Container Name oder ID (erforderlich)",
          },
        },
        required: ["container"],
      },
    },
    {
      name: "docker_system_info",
      description: "Zeigt Docker System Informationen (Version, Images, Volumes, Networks, Disk Usage).",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

/**
 * Handle Docker Tool Calls
 */
export async function handleDockerTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  // Check if Docker is available
  try {
    await execa("docker", ["--version"], { timeout: 3000 });
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: "[ERROR] Docker ist nicht installiert oder nicht verfügbar.\nInstalliere Docker mit: curl -fsSL https://get.docker.com | sh",
        },
      ],
    };
  }

  switch (name) {
    case "docker_status":
      return await dockerStatus(args.all as boolean | undefined);
    case "docker_health":
      return await dockerHealth(args.container as string | undefined);
    case "docker_logs":
      return await dockerLogs(
        args.container as string,
        args.lines as number | undefined,
        args.since as string | undefined
      );
    case "docker_resources":
      return await dockerResources();
    case "docker_restart":
      return await dockerRestart(
        args.container as string,
        args.timeout as number | undefined
      );
    case "docker_compose_status":
      return await dockerComposeStatus(args.project_path as string | undefined);
    case "docker_inspect":
      return await dockerInspect(args.container as string);
    case "docker_system_info":
      return await dockerSystemInfo();
    default:
      throw new Error(`Unbekanntes Docker Tool: ${name}`);
  }
}

/**
 * Docker Status - Liste aller Container
 */
async function dockerStatus(showAll?: boolean): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const args = ["ps", "--format", "{{.ID}}|{{.Names}}|{{.Status}}|{{.Image}}|{{.Ports}}"];
    if (showAll) {
      args.push("-a");
    }

    const { stdout } = await execa("docker", args, { timeout: 10000 });

    if (!stdout.trim()) {
      return {
        content: [
          {
            type: "text",
            text: "[DOCKER] Keine Container gefunden.\nStarte Container mit: docker run <image>",
          },
        ],
      };
    }

    const containers = stdout.trim().split("\n");
    let output = `[DOCKER] Container Status (${containers.length} Container)\n\n`;

    // Gruppiere nach Status
    const running: string[] = [];
    const stopped: string[] = [];
    const unhealthy: string[] = [];

    for (const container of containers) {
      const [id, name, status, image, ports] = container.split("|");
      const shortId = id.substring(0, 12);
      
      // Parse Status
      const isRunning = status.toLowerCase().includes("up");
      const isUnhealthy = status.toLowerCase().includes("unhealthy");
      
      // Parse Uptime
      let uptime = "N/A";
      const uptimeMatch = status.match(/Up ([^)]+)/);
      if (uptimeMatch) {
        uptime = uptimeMatch[1];
      }

      const containerInfo = `  • ${name.padEnd(25)} [${shortId}]\n    Image: ${image}\n    Status: ${status}${ports ? `\n    Ports: ${ports}` : ""}`;

      if (isUnhealthy) {
        unhealthy.push(containerInfo);
      } else if (isRunning) {
        running.push(containerInfo);
      } else {
        stopped.push(containerInfo);
      }
    }

    if (running.length > 0) {
      output += `✓ RUNNING (${running.length}):\n${running.join("\n\n")}\n\n`;
    }

    if (unhealthy.length > 0) {
      output += `⚠ UNHEALTHY (${unhealthy.length}):\n${unhealthy.join("\n\n")}\n\n`;
    }

    if (stopped.length > 0) {
      output += `✗ STOPPED (${stopped.length}):\n${stopped.join("\n\n")}\n`;
    }

    logger.info({ containerCount: containers.length, running: running.length, unhealthy: unhealthy.length }, 'Docker status checked');

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Docker status check failed');
    throw new Error(`Fehler beim Abrufen des Docker Status: ${error}`);
  }
}

/**
 * Docker Health - Detaillierte Health Info
 */
async function dockerHealth(container?: string): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    let containers: string[];

    if (container) {
      // Validiere Container Name
      sanitizeContainerName(container);
      containers = [container];
    } else {
      // Hole alle laufenden Container
      const { stdout } = await execa("docker", ["ps", "--format", "{{.Names}}"], { timeout: 5000 });
      if (!stdout.trim()) {
        return {
          content: [
            {
              type: "text",
              text: "[DOCKER] Keine laufenden Container gefunden.",
            },
          ],
        };
      }
      containers = stdout.trim().split("\n");
    }

    let output = "[DOCKER] Container Health Check\n\n";

    for (const containerName of containers) {
      // Inspect Container für Health Info
      const { stdout } = await execa(
        "docker",
        ["inspect", "--format", "{{.Name}}|{{.State.Status}}|{{.State.Health.Status}}|{{.State.Running}}|{{.State.StartedAt}}|{{.State.RestartCount}}", containerName],
        { timeout: 5000 }
      );

      const [name, state, health, running, startedAt, restartCount] = stdout.split("|");
      
      // Parse Started At
      const started = new Date(startedAt);
      const uptime = Math.floor((Date.now() - started.getTime()) / 1000);
      const uptimeStr = formatUptime(uptime);

      output += `Container: ${name.replace("/", "")}\n`;
      output += `  State: ${state === "running" ? "✓" : "✗"} ${state.toUpperCase()}\n`;
      
      if (health && health !== "<no value>") {
        const healthIcon = health === "healthy" ? "✓" : health === "unhealthy" ? "✗" : "⚠";
        output += `  Health: ${healthIcon} ${health.toUpperCase()}\n`;
      }
      
      output += `  Uptime: ${uptimeStr}\n`;
      output += `  Restart Count: ${restartCount}\n\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, container }, 'Docker health check failed');
    throw new Error(`Fehler beim Health Check: ${error}`);
  }
}

/**
 * Docker Logs - Container Logs abrufen
 */
async function dockerLogs(
  container: string,
  lines?: number,
  since?: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validiere Container Name
    sanitizeContainerName(container);

    // Validiere Lines
    const logLines = parseIntSafe(lines, 50, 1, 500);

    const args = ["logs", "--tail", String(logLines)];
    
    if (since) {
      // Validiere Since Format (basic)
      if (!/^(\d+[smhd]|[\d-]+T[\d:]+)$/.test(since)) {
        throw new Error("Ungültiges 'since' Format. Nutze z.B. '5m', '1h', '2d' oder ISO timestamp");
      }
      args.push("--since", since);
    }

    args.push(container);

    const { stdout, stderr } = await execa("docker", args, { timeout: 15000 });

    const logs = stdout || stderr;

    if (!logs.trim()) {
      return {
        content: [
          {
            type: "text",
            text: `[DOCKER] Keine Logs gefunden für Container: ${container}`,
          },
        ],
      };
    }

    const output = `[DOCKER] Logs: ${container} (letzte ${logLines} Zeilen${since ? `, seit ${since}` : ""})\n\n${logs}`;

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  } catch (error) {
    logger.error({ error, container }, 'Docker logs retrieval failed');
    throw new Error(`Fehler beim Abrufen der Logs: ${error}`);
  }
}

/**
 * Docker Resources - CPU, Memory, Network Usage
 */
async function dockerResources(): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const { stdout } = await execa(
      "docker",
      ["stats", "--no-stream", "--format", "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}"],
      { timeout: 10000 }
    );

    if (!stdout.trim()) {
      return {
        content: [
          {
            type: "text",
            text: "[DOCKER] Keine laufenden Container gefunden.",
          },
        ],
      };
    }

    const containers = stdout.trim().split("\n");
    let output = `[DOCKER] Resource Usage (${containers.length} Container)\n\n`;

    for (const container of containers) {
      const [name, cpu, mem, memPerc, netIO, blockIO] = container.split("|");
      
      output += `Container: ${name}\n`;
      output += `  CPU: ${cpu}\n`;
      output += `  Memory: ${mem} (${memPerc})\n`;
      output += `  Network I/O: ${netIO}\n`;
      output += `  Block I/O: ${blockIO}\n\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Docker resources check failed');
    throw new Error(`Fehler beim Abrufen der Resource Usage: ${error}`);
  }
}

/**
 * Docker Restart - Container neu starten (mit Approval)
 */
async function dockerRestart(
  container: string,
  timeout?: number
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validiere Container Name
    sanitizeContainerName(container);

    // Validiere Timeout
    const restartTimeout = parseIntSafe(timeout, 10, 1, 300);

    // Request Approval
    const approval = await requestApproval(`docker restart ${container}`);

    if (!approval.approved) {
      return {
        content: [
          {
            type: "text",
            text: `[DOCKER] Container Restart abgebrochen: ${container}`,
          },
        ],
      };
    }

    logger.info({ container, timeout: restartTimeout }, 'Restarting Docker container');

    // Restart Container
    const { stdout } = await execa(
      "docker",
      ["restart", "-t", String(restartTimeout), container],
      { timeout: (restartTimeout + 10) * 1000 }
    );

    // Wait a moment and check if it's running
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { stdout: statusOutput } = await execa(
      "docker",
      ["inspect", "--format", "{{.State.Running}}|{{.State.Health.Status}}", container],
      { timeout: 5000 }
    );

    const [running, health] = statusOutput.split("|");
    
    let output = `[DOCKER] Container erfolgreich neugestartet: ${container}\n`;
    output += `Status: ${running === "true" ? "✓ Running" : "✗ Not Running"}\n`;
    
    if (health && health !== "<no value>") {
      output += `Health: ${health === "healthy" ? "✓" : "⚠"} ${health}\n`;
    }

    logger.info({ container, success: true }, 'Docker container restarted');

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  } catch (error) {
    logger.error({ error, container }, 'Docker restart failed');
    throw new Error(`Fehler beim Neustart des Containers: ${error}`);
  }
}

/**
 * Docker Compose Status
 */
async function dockerComposeStatus(projectPath?: string): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Check if docker-compose or docker compose is available
    let composeCmd = "docker-compose";
    let composeArgs: string[] = [];

    try {
      await execa("docker-compose", ["--version"], { timeout: 3000 });
    } catch {
      // Try docker compose (newer syntax)
      try {
        await execa("docker", ["compose", "version"], { timeout: 3000 });
        composeCmd = "docker";
        composeArgs = ["compose"];
      } catch {
        return {
          content: [
            {
              type: "text",
              text: "[ERROR] Docker Compose ist nicht installiert.\nInstalliere mit: apt install docker-compose-plugin",
            },
          ],
        };
      }
    }

    const args = [...composeArgs, "ps", "--format", "json"];
    
    const execOptions: any = { timeout: 10000 };
    if (projectPath) {
      execOptions.cwd = projectPath;
    }

    const result = await execa(composeCmd, args, execOptions);
    const outputText = String(result.stdout || "");
    
    // Check if we got output
    if (outputText.trim().length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "[DOCKER COMPOSE] Keine Services gefunden im aktuellen Projekt.",
          },
        ],
      };
    }

    // Parse JSON (jede Zeile ist ein JSON Object)
    const services = outputText.trim().split("\n").map((line: string) => JSON.parse(line));

    let output = `[DOCKER COMPOSE] Project Status${projectPath ? ` (${projectPath})` : ""}\n\n`;
    output += `Services: ${services.length} total\n\n`;

    // Gruppiere nach State
    const running = services.filter((s: any) => s.State === "running");
    const exited = services.filter((s: any) => s.State === "exited");
    const other = services.filter((s: any) => s.State !== "running" && s.State !== "exited");

    if (running.length > 0) {
      output += `✓ RUNNING (${running.length}):\n`;
      for (const svc of running) {
        output += `  • ${(svc.Service as string).padEnd(20)} ${svc.Name}\n`;
        if (svc.Publishers && svc.Publishers.length > 0) {
          const ports = svc.Publishers.map((p: any) => `${p.PublishedPort}→${p.TargetPort}`).join(", ");
          output += `    Ports: ${ports}\n`;
        }
      }
      output += "\n";
    }

    if (other.length > 0) {
      output += `⚠ OTHER (${other.length}):\n`;
      for (const svc of other) {
        output += `  • ${(svc.Service as string).padEnd(20)} State: ${svc.State}\n`;
      }
      output += "\n";
    }

    if (exited.length > 0) {
      output += `✗ EXITED (${exited.length}):\n`;
      for (const svc of exited) {
        output += `  • ${(svc.Service as string).padEnd(20)} Exit Code: ${svc.ExitCode}\n`;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, projectPath }, 'Docker compose status check failed');
    throw new Error(`Fehler beim Abrufen des Compose Status: ${error}`);
  }
}

/**
 * Docker Inspect - Detaillierte Container Info
 */
async function dockerInspect(container: string): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validiere Container Name
    sanitizeContainerName(container);

    const { stdout } = await execa(
      "docker",
      ["inspect", container],
      { timeout: 5000 }
    );

    const inspection = JSON.parse(stdout)[0];

    let output = `[DOCKER] Container Inspection: ${container}\n\n`;
    
    // Basic Info
    output += `ID: ${inspection.Id.substring(0, 12)}\n`;
    output += `Name: ${inspection.Name}\n`;
    output += `Image: ${inspection.Config.Image}\n`;
    output += `Created: ${new Date(inspection.Created).toLocaleString()}\n\n`;

    // State
    output += `State:\n`;
    output += `  Status: ${inspection.State.Status}\n`;
    output += `  Running: ${inspection.State.Running ? "✓" : "✗"}\n`;
    output += `  StartedAt: ${new Date(inspection.State.StartedAt).toLocaleString()}\n`;
    output += `  RestartCount: ${inspection.State.RestartCount}\n\n`;

    // Network
    const networks = Object.keys(inspection.NetworkSettings.Networks);
    if (networks.length > 0) {
      output += `Networks:\n`;
      for (const net of networks) {
        const netInfo = inspection.NetworkSettings.Networks[net];
        output += `  • ${net}\n`;
        output += `    IP: ${netInfo.IPAddress || "N/A"}\n`;
        if (netInfo.Gateway) {
          output += `    Gateway: ${netInfo.Gateway}\n`;
        }
      }
      output += "\n";
    }

    // Ports
    if (inspection.NetworkSettings.Ports) {
      const ports = Object.entries(inspection.NetworkSettings.Ports)
        .filter(([_, bindings]) => bindings !== null)
        .map(([port, bindings]: [string, any]) => {
          const hostPorts = bindings.map((b: any) => b.HostPort).join(", ");
          return `${port} → ${hostPorts}`;
        });
      
      if (ports.length > 0) {
        output += `Port Mappings:\n`;
        ports.forEach(p => output += `  • ${p}\n`);
        output += "\n";
      }
    }

    // Volumes/Mounts
    if (inspection.Mounts && inspection.Mounts.length > 0) {
      output += `Volumes:\n`;
      for (const mount of inspection.Mounts) {
        output += `  • ${mount.Type}: ${mount.Source} → ${mount.Destination}\n`;
      }
      output += "\n";
    }

    // Environment
    if (inspection.Config.Env && inspection.Config.Env.length > 0) {
      output += `Environment Variables: ${inspection.Config.Env.length} defined\n`;
      // Don't show all env vars for security reasons
    }

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, container }, 'Docker inspect failed');
    throw new Error(`Fehler beim Inspizieren des Containers: ${error}`);
  }
}

/**
 * Docker System Info
 */
async function dockerSystemInfo(): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Docker Version
    const { stdout: version } = await execa("docker", ["version", "--format", "{{.Server.Version}}"], { timeout: 5000 });

    // Docker Info
    const { stdout: info } = await execa("docker", ["info", "--format", "json"], { timeout: 10000 });
    const dockerInfo = JSON.parse(info);

    // Docker System DF
    const { stdout: df } = await execa("docker", ["system", "df", "--format", "json"], { timeout: 10000 });
    const dfLines = df.trim().split("\n").map(line => JSON.parse(line));

    let output = "[DOCKER] System Information\n\n";
    
    output += `Version: ${version}\n`;
    output += `OS/Arch: ${dockerInfo.OperatingSystem} / ${dockerInfo.Architecture}\n`;
    output += `Server: ${dockerInfo.Name}\n\n`;

    output += `Containers:\n`;
    output += `  Total: ${dockerInfo.Containers}\n`;
    output += `  Running: ${dockerInfo.ContainersRunning}\n`;
    output += `  Paused: ${dockerInfo.ContainersPaused}\n`;
    output += `  Stopped: ${dockerInfo.ContainersStopped}\n\n`;

    output += `Images: ${dockerInfo.Images}\n\n`;

    // Disk Usage
    output += `Disk Usage:\n`;
    for (const item of dfLines) {
      if (item.Type === "Images") {
        output += `  Images: ${item.TotalCount} (${formatBytes(item.Size)})\n`;
        output += `    Active: ${item.Active}\n`;
        output += `    Reclaimable: ${formatBytes(item.Reclaimable)}\n`;
      } else if (item.Type === "Containers") {
        output += `  Containers: ${item.TotalCount} (${formatBytes(item.Size)})\n`;
        output += `    Active: ${item.Active}\n`;
      } else if (item.Type === "Local Volumes") {
        output += `  Volumes: ${item.TotalCount} (${formatBytes(item.Size)})\n`;
        output += `    Active: ${item.Active}\n`;
      } else if (item.Type === "Build Cache") {
        output += `  Build Cache: ${formatBytes(item.Size)}\n`;
        output += `    Reclaimable: ${formatBytes(item.Reclaimable)}\n`;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Docker system info failed');
    throw new Error(`Fehler beim Abrufen der System Info: ${error}`);
  }
}

/**
 * Helper: Format Uptime in Sekunden zu lesbarem String
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

/**
 * Helper: Format Bytes zu lesbarem String
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

