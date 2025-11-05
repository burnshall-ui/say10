/**
 * Network Diagnostics Tools
 *
 * Tools für Netzwerk-Monitoring und Troubleshooting
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { execa } from "execa";
import { sanitizeHostnameOrIP, sanitizeRecordType } from "../utils/validation.js";

/**
 * Gibt alle Network Tools zurück
 */
export function getNetworkTools(): Tool[] {
  return [
    {
      name: "check_ports",
      description: "Zeigt alle offenen Ports und lauschende Services. Nutze dies um Port-Konflikte zu finden oder zu prüfen welche Services auf welchen Ports laufen.",
      inputSchema: {
        type: "object",
        properties: {
          protocol: {
            type: "string",
            description: "Filter nach Protokoll: tcp, udp, all (default: all)",
            enum: ["tcp", "udp", "all"],
          },
        },
      },
    },
    {
      name: "check_connections",
      description: "Zeigt aktive Netzwerk-Verbindungen mit Remote-IP, Port und Status. Nutze dies um zu sehen wer mit dem Server verbunden ist.",
      inputSchema: {
        type: "object",
        properties: {
          state: {
            type: "string",
            description: "Filter nach Connection-Status: established, listen, time_wait, all (default: all)",
          },
        },
      },
    },
    {
      name: "network_traffic",
      description: "Zeigt Netzwerk-Interface Statistiken (RX/TX Bytes, Packets, Errors). Nutze dies um Netzwerk-Performance und Fehler zu monitoren.",
      inputSchema: {
        type: "object",
        properties: {
          interface: {
            type: "string",
            description: "Spezifisches Interface (z.B. eth0, wlan0), leer für alle Interfaces",
          },
        },
      },
    },
    {
      name: "dns_lookup",
      description: "Führt DNS Lookup für einen Hostnamen aus. Nutze dies um DNS-Probleme zu diagnostizieren.",
      inputSchema: {
        type: "object",
        properties: {
          hostname: {
            type: "string",
            description: "Hostname oder Domain für DNS Lookup (z.B. google.com)",
          },
          record_type: {
            type: "string",
            description: "DNS Record Type: A, AAAA, MX, NS, TXT (default: A)",
            enum: ["A", "AAAA", "MX", "NS", "TXT", "ANY"],
          },
        },
        required: ["hostname"],
      },
    },
    {
      name: "ping_host",
      description: "Testet Konnektivität zu einem Host mit Ping. Zeigt Latency und Packet Loss. Nutze dies um Netzwerk-Erreichbarkeit zu testen.",
      inputSchema: {
        type: "object",
        properties: {
          host: {
            type: "string",
            description: "Hostname oder IP-Adresse zum Pingen",
          },
          count: {
            type: "number",
            description: "Anzahl der Ping-Pakete (default: 4)",
          },
        },
        required: ["host"],
      },
    },
    {
      name: "check_firewall",
      description: "Zeigt Firewall Status und aktive Rules (ufw/iptables). Nutze dies um Firewall-Konfiguration zu prüfen.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "traceroute",
      description: "Verfolgt den Netzwerk-Pfad zu einem Ziel-Host. Nutze dies um Routing-Probleme zu diagnostizieren.",
      inputSchema: {
        type: "object",
        properties: {
          host: {
            type: "string",
            description: "Ziel-Host für Traceroute",
          },
          max_hops: {
            type: "number",
            description: "Maximale Anzahl Hops (default: 30)",
          },
        },
        required: ["host"],
      },
    },
  ];
}

/**
 * Handle Network Tool Calls
 */
export async function handleNetworkTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  switch (name) {
    case "check_ports":
      return await checkPorts(args.protocol as string | undefined);
    case "check_connections":
      return await checkConnections(args.state as string | undefined);
    case "network_traffic":
      return await networkTraffic(args.interface as string | undefined);
    case "dns_lookup":
      return await dnsLookup(
        args.hostname as string,
        args.record_type as string | undefined
      );
    case "ping_host":
      return await pingHost(
        args.host as string,
        args.count as number | undefined
      );
    case "check_firewall":
      return await checkFirewall();
    case "traceroute":
      return await traceroute(
        args.host as string,
        args.max_hops as number | undefined
      );
    default:
      throw new Error(`Unbekanntes Network Tool: ${name}`);
  }
}

/**
 * Check Open Ports
 */
async function checkPorts(
  protocol: string = "all"
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Verwende ss (socket statistics) - moderner als netstat
    const args = ["-tuln"];

    if (protocol === "tcp") {
      args[0] = "-tln";
    } else if (protocol === "udp") {
      args[0] = "-uln";
    }

    const { stdout } = await execa("ss", args, {
      timeout: 5000, // 5 Sekunden
    });

    let output = `[NET] Offene Ports\n\n`;

    if (protocol !== "all") {
      output += `Protokoll: ${protocol.toUpperCase()}\n\n`;
    }

    // Parse ss output
    const lines = stdout.split("\n").filter(l => l.trim() && !l.startsWith("Netid"));

    interface PortInfo {
      proto: string;
      state: string;
      localAddr: string;
      localPort: string;
      process?: string;
    }

    const ports: PortInfo[] = [];

    const parseAddressPort = (addrPort: string): { address: string; port: string } => {
      const trimmed = addrPort.trim();
      if (!trimmed) {
        return { address: "*", port: "*" };
      }

      const lastColon = trimmed.lastIndexOf(":");
      if (lastColon === -1) {
        return { address: trimmed, port: "*" };
      }

      const addressPart = trimmed.slice(0, lastColon) || "*";
      const portPart = trimmed.slice(lastColon + 1) || "*";

      const normalizedAddress = addressPart.startsWith("[") && addressPart.endsWith("]")
        ? addressPart.slice(1, -1)
        : addressPart;

      return {
        address: normalizedAddress,
        port: portPart,
      };
    };

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const [proto, _recv, _send, localAddrPort, _remoteAddrPort, state] = parts;
        const { address, port } = parseAddressPort(localAddrPort);

        ports.push({
          proto: proto,
          state: state || "LISTEN",
          localAddr: address || "*",
          localPort: port || localAddrPort,
        });
      }
    }

    // Gruppiere nach Protokoll
    const tcpPorts = ports.filter(p => p.proto.includes("tcp"));
    const udpPorts = ports.filter(p => p.proto.includes("udp"));

    output += `TCP Ports: ${tcpPorts.length}\n`;
    output += `UDP Ports: ${udpPorts.length}\n`;
    output += `Gesamt: ${ports.length}\n\n`;

    // Zeige wichtige Ports (Well-known Ports)
    const wellKnownPorts: Record<string, string> = {
      "22": "SSH",
      "80": "HTTP",
      "443": "HTTPS",
      "3306": "MySQL",
      "5432": "PostgreSQL",
      "6379": "Redis",
      "27017": "MongoDB",
      "8080": "HTTP-Alt",
      "9000": "PHP-FPM",
      "11434": "Ollama",
    };

    // Zeige TCP Ports
    if (tcpPorts.length > 0) {
      output += `[TCP] Listening Ports:\n`;
      for (const port of tcpPorts.slice(0, 20)) {
        const service = wellKnownPorts[port.localPort] || "Unknown";
        const addr = port.localAddr === "*" || port.localAddr === "0.0.0.0" ? "All" : port.localAddr;
        output += `- Port ${port.localPort.padEnd(6)} (${service.padEnd(12)}) - ${addr}\n`;
      }
      output += "\n";
    }

    // Zeige UDP Ports
    if (udpPorts.length > 0 && (protocol === "udp" || protocol === "all")) {
      output += `[UDP] Listening Ports:\n`;
      for (const port of udpPorts.slice(0, 10)) {
        const service = wellKnownPorts[port.localPort] || "Unknown";
        const addr = port.localAddr === "*" || port.localAddr === "0.0.0.0" ? "All" : port.localAddr;
        output += `- Port ${port.localPort.padEnd(6)} (${service.padEnd(12)}) - ${addr}\n`;
      }
      output += "\n";
    }

    if (ports.length > 20) {
      output += `... und ${ports.length - 20} weitere Ports\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Ports: ${error}`);
  }
}

/**
 * Check Active Connections
 */
async function checkConnections(
  state?: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const args = ["-tun"];

    const { stdout } = await execa("ss", args, {
      timeout: 5000, // 5 Sekunden
    });

    let output = `[NET] Aktive Verbindungen\n\n`;

    if (state) {
      output += `Filter: ${state}\n\n`;
    }

    // Parse connections
    const lines = stdout.split("\n").filter(l => l.trim() && !l.startsWith("Netid"));

    interface Connection {
      proto: string;
      state: string;
      localAddr: string;
      remoteAddr: string;
    }

    const normalizeStateFilter = (value?: string): string | null => {
      if (!value) return null;
      const normalized = value.toLowerCase();
      if (normalized === "all") return null;
      return normalized;
    };

    const matchesFilter = (connState: string, filter: string | null): boolean => {
      if (!filter) {
        return true;
      }

      const stateMap: Record<string, string[]> = {
        established: ["estab"],
        listen: ["listen"],
        listening: ["listen"],
        time_wait: ["time-wait"],
      };

      const normalizedConn = connState.toLowerCase();
      const aliases = stateMap[filter] ?? [filter];
      return aliases.some(alias => normalizedConn === alias);
    };

    const filterState = normalizeStateFilter(state);

    const connections: Connection[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const proto = parts[0];
        const connState = parts[1] || "";
        const local = parts[4] || "";
        const remote = parts[5] || "";

        if (!matchesFilter(connState, filterState)) {
          continue;
        }

        connections.push({
          proto,
          state: connState || "ESTAB",
          localAddr: local,
          remoteAddr: remote,
        });
      }
    }

    // Gruppiere nach Status
    const established = connections.filter(c => c.state === "ESTAB");
    const listening = connections.filter(c => c.state === "LISTEN");
    const timeWait = connections.filter(c => c.state === "TIME-WAIT");

    output += `[CONN] Established: ${established.length}\n`;
    output += `[LSTN] Listening: ${listening.length}\n`;
    output += `[WAIT] Time-Wait: ${timeWait.length}\n`;
    output += `Gesamt: ${connections.length}\n\n`;

    // Zeige established connections
    if (established.length > 0 && (!state || state === "established")) {
      output += `[ESTABLISHED] Aktive Verbindungen:\n`;
      for (const conn of established.slice(0, 15)) {
        output += `- ${conn.proto.padEnd(6)} ${conn.localAddr.padEnd(25)} -> ${conn.remoteAddr}\n`;
      }
      output += "\n";

      if (established.length > 15) {
        output += `... und ${established.length - 15} weitere Verbindungen\n\n`;
      }
    }

    // Zeige unique remote IPs
    const remoteIPs = new Set(
      established
        .map(c => c.remoteAddr.split(":")[0])
        .filter(ip => ip && ip !== "*")
    );

    if (remoteIPs.size > 0) {
      output += `Unique Remote IPs: ${remoteIPs.size}\n`;
      const topIPs = Array.from(remoteIPs).slice(0, 10);
      for (const ip of topIPs) {
        const count = established.filter(c => c.remoteAddr.startsWith(ip)).length;
        output += `- ${ip}: ${count} connections\n`;
      }
    }

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Verbindungen: ${error}`);
  }
}

/**
 * Network Traffic Stats
 */
async function networkTraffic(
  iface?: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const { stdout } = await execa("ip", ["-s", "link"], {
      timeout: 5000, // 5 Sekunden
    });

    let output = `[NET] Network Interface Statistics\n\n`;

    if (iface) {
      output += `Interface: ${iface}\n\n`;
    }

    // Parse ip -s link output
    const lines = stdout.split("\n");

    interface IfaceStats {
      name: string;
      state: string;
      rxBytes: number;
      rxPackets: number;
      rxErrors: number;
      txBytes: number;
      txPackets: number;
      txErrors: number;
    }

    const interfaces: IfaceStats[] = [];
    let currentIface: Partial<IfaceStats> | null = null;
    let lineType = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Interface header line
      if (line.match(/^\d+:/)) {
        if (currentIface && currentIface.name) {
          interfaces.push(currentIface as IfaceStats);
        }

        const match = line.match(/^\d+:\s+([^:]+):.+state\s+(\w+)/);
        if (match) {
          currentIface = {
            name: match[1].trim(),
            state: match[2],
            rxBytes: 0,
            rxPackets: 0,
            rxErrors: 0,
            txBytes: 0,
            txPackets: 0,
            txErrors: 0,
          };
        }
        lineType = "";
      }
      // RX line
      else if (line.trim().startsWith("RX:")) {
        lineType = "rx_header";
      }
      // TX line
      else if (line.trim().startsWith("TX:")) {
        lineType = "tx_header";
      }
      // Stats line after RX/TX header
      else if (currentIface && line.trim() && /^\d+/.test(line.trim())) {
        const parts = line.trim().split(/\s+/).map(Number);
        if (lineType === "rx_header" && parts.length >= 3) {
          currentIface.rxBytes = parts[0];
          currentIface.rxPackets = parts[1];
          currentIface.rxErrors = parts[2];
          lineType = "";
        } else if (lineType === "tx_header" && parts.length >= 3) {
          currentIface.txBytes = parts[0];
          currentIface.txPackets = parts[1];
          currentIface.txErrors = parts[2];
          lineType = "";
        }
      }
    }

    // Add last interface
    if (currentIface && currentIface.name) {
      interfaces.push(currentIface as IfaceStats);
    }

    // Filter by interface if specified
    const filteredIfaces = iface
      ? interfaces.filter(i => i.name === iface)
      : interfaces.filter(i => !i.name.startsWith("lo")); // Skip loopback

    if (filteredIfaces.length === 0) {
      output += `[WARN] Keine Interfaces gefunden\n`;
      return { content: [{ type: "text", text: output }] };
    }

    // Format bytes
    const formatBytes = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
      return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    };

    for (const iface of filteredIfaces) {
      const status = iface.state === "UP" ? "[UP]" : "[DOWN]";
      output += `${status} ${iface.name}\n`;
      output += `  State: ${iface.state}\n`;
      output += `  RX: ${formatBytes(iface.rxBytes)} (${iface.rxPackets.toLocaleString()} packets)\n`;
      output += `  TX: ${formatBytes(iface.txBytes)} (${iface.txPackets.toLocaleString()} packets)\n`;

      if (iface.rxErrors > 0 || iface.txErrors > 0) {
        output += `  [WARN] Errors: RX=${iface.rxErrors}, TX=${iface.txErrors}\n`;
      }

      output += "\n";
    }

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Traffic-Stats: ${error}`);
  }
}

/**
 * DNS Lookup
 */
async function dnsLookup(
  hostname: string,
  recordType: string = "A"
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validierung
    const sanitizedHostname = sanitizeHostnameOrIP(hostname);
    const sanitizedRecordType = sanitizeRecordType(recordType);
    
    const { stdout } = await execa("dig", ["+short", sanitizedHostname, sanitizedRecordType], {
      timeout: 10000, // 10 Sekunden
    });

    let output = `[DNS] Lookup: ${sanitizedHostname}\n\n`;
    output += `Record Type: ${sanitizedRecordType}\n\n`;

    if (!stdout.trim()) {
      output += `[WARN] Keine DNS Records gefunden\n`;
      return { content: [{ type: "text", text: output }] };
    }

    const records = stdout.trim().split("\n");

    output += `Results (${records.length}):\n`;
    for (const record of records) {
      output += `- ${record}\n`;
    }

    // Zusätzliche Info für A Records
    if (recordType === "A" && records.length > 0) {
      output += `\n[OK] DNS Resolution erfolgreich\n`;
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
          text: `[ERR] DNS Lookup fehlgeschlagen: ${errorMsg}\n\nMögliche Ursachen:\n- Hostname existiert nicht\n- DNS Server nicht erreichbar\n- Netzwerk-Problem`,
        },
      ],
    };
  }
}

/**
 * Ping Host
 */
async function pingHost(
  host: string,
  count: number = 4
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validierung
    const sanitizedHost = sanitizeHostnameOrIP(host);
    // Count validieren (1-10 Pakete)
    const safeCount = Math.min(Math.max(1, count), 10);
    
    const { stdout } = await execa("ping", ["-c", String(safeCount), sanitizedHost], {
      timeout: 15000, // 15 Sekunden
    });

    let output = `[PING] Host: ${sanitizedHost}\n\n`;

    // Parse ping statistics
    const statsMatch = stdout.match(/(\d+) packets transmitted, (\d+) received, ([\d.]+)% packet loss, time (\d+)ms/);
    const rttMatch = stdout.match(/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/);

    if (statsMatch) {
      const [, transmitted, received, loss, time] = statsMatch;

      output += `Packets: ${transmitted} sent, ${received} received\n`;
      output += `Packet Loss: ${loss}%\n`;
      output += `Time: ${time}ms\n\n`;

      if (rttMatch) {
        const [, min, avg, max, mdev] = rttMatch;
        output += `Latency:\n`;
        output += `  Min: ${min} ms\n`;
        output += `  Avg: ${avg} ms\n`;
        output += `  Max: ${max} ms\n`;
        output += `  Mdev: ${mdev} ms\n\n`;

        const avgNum = parseFloat(avg);
        if (avgNum < 20) {
          output += `[OK] Exzellente Latency\n`;
        } else if (avgNum < 100) {
          output += `[OK] Gute Latency\n`;
        } else if (avgNum < 300) {
          output += `[WARN] Erhöhte Latency\n`;
        } else {
          output += `[WARN] Hohe Latency\n`;
        }
      }

      const lossNum = parseFloat(loss);
      if (lossNum === 0) {
        output += `[OK] Keine Packet Loss\n`;
      } else if (lossNum < 5) {
        output += `[WARN] Geringe Packet Loss\n`;
      } else {
        output += `[ERR] Hohe Packet Loss - Netzwerk-Probleme!\n`;
      }
    } else {
      output += stdout;
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
          text: `[ERR] Ping fehlgeschlagen: ${errorMsg}\n\nHost ist nicht erreichbar oder blockiert ICMP.`,
        },
      ],
    };
  }
}

/**
 * Check Firewall Status
 */
async function checkFirewall(): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    let output = `[FW] Firewall Status\n\n`;

    // Try UFW first (Ubuntu/Debian)
    try {
      const { stdout: ufwStatus } = await execa("sudo", ["ufw", "status", "verbose"], {
        reject: false,
        timeout: 5000, // 5 Sekunden
      });

      if (ufwStatus.includes("Status: active")) {
        output += `[UFW] Status: Active\n\n`;
        output += "```\n";
        output += ufwStatus;
        output += "\n```\n\n";
      } else {
        output += `[UFW] Status: Inactive\n\n`;
      }
    } catch (e) {
      output += `[UFW] Nicht verfügbar oder nicht installiert\n\n`;
    }

    // Show basic iptables rules
    try {
      const { stdout: iptables } = await execa("sudo", ["iptables", "-L", "-n", "-v"], {
        reject: false,
        timeout: 5000, // 5 Sekunden
      });

      output += `[iptables] Rules:\n`;

      // Count rules
      const lines = iptables.split("\n");
      const inputRules = lines.filter(l => l.includes("Chain INPUT")).length;
      const outputRules = lines.filter(l => l.includes("Chain OUTPUT")).length;
      const forwardRules = lines.filter(l => l.includes("Chain FORWARD")).length;

      output += `- INPUT rules: ${inputRules}\n`;
      output += `- OUTPUT rules: ${outputRules}\n`;
      output += `- FORWARD rules: ${forwardRules}\n\n`;

      // Show only header + first few rules (nicht die komplette Liste)
      const limitedOutput = lines.slice(0, 30).join("\n");
      output += "```\n";
      output += limitedOutput;
      if (lines.length > 30) {
        output += "\n... (gekürzt)";
      }
      output += "\n```\n";
    } catch (e) {
      output += `[WARN] iptables nicht verfügbar\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Firewall-Status: ${error}`);
  }
}

/**
 * Traceroute
 */
async function traceroute(
  host: string,
  maxHops: number = 30
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validierung
    const sanitizedHost = sanitizeHostnameOrIP(host);
    // maxHops validieren (1-50 Hops)
    const safeMaxHops = Math.min(Math.max(1, maxHops), 50);
    
    // Use -m for max hops, -n for no DNS resolution (faster)
    const { stdout } = await execa("traceroute", ["-m", String(safeMaxHops), "-n", sanitizedHost], {
      timeout: 60000, // 60 second timeout
    });

    let output = `[TRACE] Traceroute zu ${sanitizedHost}\n\n`;
    output += `Max Hops: ${safeMaxHops}\n\n`;

    // Parse traceroute output
    const lines = stdout.split("\n").filter(l => l.trim());

    output += "Route:\n";
    output += "```\n";
    for (const line of lines) {
      output += `${line}\n`;
    }
    output += "```\n\n";

    // Count hops
    const hops = lines.filter(l => /^\s*\d+/.test(l)).length;
    output += `Hops: ${hops}\n`;

    if (hops >= maxHops) {
      output += `[WARN] Max Hops erreicht - Ziel möglicherweise nicht erreichbar\n`;
    } else {
      output += `[OK] Ziel erreicht\n`;
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
          text: `[ERR] Traceroute fehlgeschlagen: ${errorMsg}\n\nMögliche Ursachen:\n- Host nicht erreichbar\n- Timeout\n- Traceroute nicht installiert`,
        },
      ],
    };
  }
}
