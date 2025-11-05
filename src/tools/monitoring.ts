/**
 * System Monitoring Tools
 * 
 * Tools für CPU, Memory und Disk Monitoring
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import * as si from "systeminformation";
import { execa } from "execa";

/**
 * Gibt alle Monitoring Tools zurück
 */
export function getMonitoringTools(): Tool[] {
  return [
    {
      name: "check_disk_space",
      description: "Zeigt Disk Space Usage des Systems. Nutze dies um zu prüfen ob genug Speicherplatz verfügbar ist.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Optionaler Pfad für spezifische Partition (default: alle)",
          },
        },
      },
    },
    {
      name: "check_memory",
      description: "Zeigt RAM Usage und Memory-Statistiken. Nutze dies um Memory-Probleme zu diagnostizieren.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "check_cpu",
      description: "Zeigt CPU Usage, Load Average und Top-Prozesse. Nutze dies bei Performance-Problemen.",
      inputSchema: {
        type: "object",
        properties: {
          top_processes: {
            type: "number",
            description: "Anzahl der Top-Prozesse die angezeigt werden sollen (default: 10)",
          },
        },
      },
    },
    {
      name: "system_status",
      description: "Gibt einen vollständigen System-Status Überblick (CPU, Memory, Disk, Uptime). Nutze dies für einen Quick Health Check.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

/**
 * Handle Monitoring Tool Calls
 */
export async function handleMonitoringTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  switch (name) {
    case "check_disk_space":
      return await checkDiskSpace(args.path as string | undefined);
    case "check_memory":
      return await checkMemory();
    case "check_cpu":
      return await checkCPU(args.top_processes as number | undefined);
    case "system_status":
      return await systemStatus();
    default:
      throw new Error(`Unbekanntes Monitoring Tool: ${name}`);
  }
}

/**
 * Check Disk Space
 */
async function checkDiskSpace(path?: string): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const fsSize = await si.fsSize();
    
    let output = "[DISK] Disk Space Usage\n\n";
    
    for (const fs of fsSize) {
      // Filter nach Pfad wenn angegeben
      if (path && !fs.mount.startsWith(path)) {
        continue;
      }
      
      const usedPercent = ((fs.used / fs.size) * 100).toFixed(1);
      const totalGB = (fs.size / (1024 ** 3)).toFixed(1);
      const usedGB = (fs.used / (1024 ** 3)).toFixed(1);
      const availGB = (fs.available / (1024 ** 3)).toFixed(1);
      
      let status = "[OK]";
      if (parseFloat(usedPercent) > 90) status = "[CRIT]";
      else if (parseFloat(usedPercent) > 75) status = "[WARN]";
      
      output += `${status} ${fs.mount} (${fs.fs})\n`;
      output += `   Größe: ${totalGB} GB\n`;
      output += `   Genutzt: ${usedGB} GB (${usedPercent}%)\n`;
      output += `   Verfügbar: ${availGB} GB\n\n`;
    }
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen von Disk Space: ${error}`);
  }
}

/**
 * Check Memory
 */
async function checkMemory(): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const mem = await si.mem();
    
    const totalGB = (mem.total / (1024 ** 3)).toFixed(2);
    const usedGB = (mem.used / (1024 ** 3)).toFixed(2);
    const freeGB = (mem.free / (1024 ** 3)).toFixed(2);
    const availableGB = (mem.available / (1024 ** 3)).toFixed(2);
    const usedPercent = ((mem.used / mem.total) * 100).toFixed(1);
    
    let status = "[OK]";
    if (parseFloat(usedPercent) > 90) status = "[CRIT]";
    else if (parseFloat(usedPercent) > 75) status = "[WARN]";
    
    const swapTotalGB = (mem.swaptotal / (1024 ** 3)).toFixed(2);
    const swapUsedGB = (mem.swapused / (1024 ** 3)).toFixed(2);
    const swapPercent = mem.swaptotal > 0 ? ((mem.swapused / mem.swaptotal) * 100).toFixed(1) : "0.0";
    
    let output = `${status} Memory Status\n\n`;
    output += `RAM: ${availableGB} GB verfügbar von ${totalGB} GB total\n`;
    output += `Genutzt: ${usedGB} GB (${usedPercent}%)\n\n`;
    output += `Details:\n`;
    output += `- Total RAM: ${totalGB} GB\n`;
    output += `- In Nutzung: ${usedGB} GB\n`;
    output += `- Frei (unused): ${freeGB} GB\n`;
    output += `- Verfügbar (usable): ${availableGB} GB\n\n`;
    
    if (mem.swaptotal > 0) {
      output += `Swap:\n`;
      output += `- Total: ${swapTotalGB} GB\n`;
      output += `- Genutzt: ${swapUsedGB} GB (${swapPercent}%)\n`;
    }
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen von Memory Info: ${error}`);
  }
}

/**
 * Check CPU
 */
async function checkCPU(topProcesses: number = 10): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const [cpu, currentLoad, processes] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
      si.processes(),
    ]);
    
    const loadAvg = await si.currentLoad();
    
    let output = "[CPU] CPU Status\n\n";
    output += `CPU Info:\n`;
    output += `- Modell: ${cpu.manufacturer} ${cpu.brand}\n`;
    output += `- Cores: ${cpu.cores} (${cpu.physicalCores} physikalisch)\n`;
    output += `- Geschwindigkeit: ${cpu.speed} GHz\n\n`;
    
    output += `Auslastung:\n`;
    output += `- Gesamt: ${currentLoad.currentLoad.toFixed(1)}%\n`;
    output += `- User: ${currentLoad.currentLoadUser.toFixed(1)}%\n`;
    output += `- System: ${currentLoad.currentLoadSystem.toFixed(1)}%\n\n`;
    
    // Load Average via execa (auf Linux)
    try {
      const { stdout } = await execa("uptime", [], {
        timeout: 3000, // 3 Sekunden
      });
      const loadMatch = stdout.match(/load average: ([\d.]+), ([\d.]+), ([\d.]+)/);
      if (loadMatch) {
        output += `Load Average:\n`;
        output += `- 1 min: ${loadMatch[1]}\n`;
        output += `- 5 min: ${loadMatch[2]}\n`;
        output += `- 15 min: ${loadMatch[3]}\n\n`;
      }
    } catch (e) {
      // Ignore wenn uptime nicht verfügbar
    }
    
    // Top Prozesse
    const sortedProcs = processes.list
      .filter(p => p.cpu > 0)
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, topProcesses);
    
    if (sortedProcs.length > 0) {
      output += `Top ${topProcesses} Prozesse (CPU):\n`;
      for (const proc of sortedProcs) {
        const memMB = (proc.mem / 1024 / 1024).toFixed(0);
        output += `- ${proc.name} (PID ${proc.pid}): ${proc.cpu.toFixed(1)}% CPU, ${memMB} MB RAM\n`;
      }
    }
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen von CPU Info: ${error}`);
  }
}

/**
 * System Status Overview
 */
async function systemStatus(): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const [osInfo, time, mem, cpu, currentLoad, fsSize] = await Promise.all([
      si.osInfo(),
      si.time(),
      si.mem(),
      si.cpu(),
      si.currentLoad(),
      si.fsSize(),
    ]);
    
    // Uptime formatieren
    const uptimeDays = Math.floor(time.uptime / 86400);
    const uptimeHours = Math.floor((time.uptime % 86400) / 3600);
    const uptimeMinutes = Math.floor((time.uptime % 3600) / 60);
    
    let output = "[SYS] System Status Overview\n\n";
    
    // OS Info
    output += `System:\n`;
    output += `- OS: ${osInfo.distro} ${osInfo.release}\n`;
    output += `- Kernel: ${osInfo.kernel}\n`;
    output += `- Hostname: ${osInfo.hostname}\n`;
    output += `- Uptime: ${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m\n\n`;
    
    // CPU
    const cpuPercent = currentLoad.currentLoad.toFixed(1);
    let cpuStatus = "[OK]";
    if (parseFloat(cpuPercent) > 80) cpuStatus = "[CRIT]";
    else if (parseFloat(cpuPercent) > 60) cpuStatus = "[WARN]";
    
    output += `CPU: ${cpuStatus}\n`;
    output += `- ${cpu.manufacturer} ${cpu.brand}\n`;
    output += `- ${cpu.cores} Cores @ ${cpu.speed} GHz\n`;
    output += `- Load: ${cpuPercent}%\n\n`;
    
    // Memory
    const memPercent = ((mem.used / mem.total) * 100).toFixed(1);
    let memStatus = "[OK]";
    if (parseFloat(memPercent) > 90) memStatus = "[CRIT]";
    else if (parseFloat(memPercent) > 75) memStatus = "[WARN]";
    
    const memUsedGB = (mem.used / (1024 ** 3)).toFixed(1);
    const memTotalGB = (mem.total / (1024 ** 3)).toFixed(1);
    
    output += `Memory: ${memStatus}\n`;
    output += `- ${memUsedGB} GB / ${memTotalGB} GB (${memPercent}%)\n\n`;
    
    // Disk
    let diskStatus = "[OK]";
    let maxDiskPercent = 0;
    
    output += `Disk:\n`;
    for (const fs of fsSize.filter(f => f.mount === "/" || f.mount.startsWith("/home"))) {
      const usedPercent = ((fs.used / fs.size) * 100).toFixed(1);
      maxDiskPercent = Math.max(maxDiskPercent, parseFloat(usedPercent));
      
      const usedGB = (fs.used / (1024 ** 3)).toFixed(1);
      const totalGB = (fs.size / (1024 ** 3)).toFixed(1);
      
      output += `- ${fs.mount}: ${usedGB} GB / ${totalGB} GB (${usedPercent}%)\n`;
    }
    
    if (maxDiskPercent > 90) diskStatus = "[CRIT]";
    else if (maxDiskPercent > 75) diskStatus = "[WARN]";
    
    output = output.replace("Disk:", `Disk: ${diskStatus}`);
    
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen des System Status: ${error}`);
  }
}

