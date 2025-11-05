# say10 - Advanced AI Server Administrator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Ollama](https://img.shields.io/badge/Ollama-000000?logo=ollama&logoColor=white)](https://ollama.ai)
[![MCP](https://img.shields.io/badge/MCP-Model_Context_Protocol-blue)](https://modelcontextprotocol.io)

> Your local AI Server Administrator - powered by Ollama & MCP

A complete MCP (Model Context Protocol) Server that gives your Linux Server an AI-powered system administrator. Uses Ollama for local LLM inference and provides an interactive terminal CLI.

## Highlights

- **System Monitoring** - CPU, Memory, Disk Space mit intelligenter Analyse
- **Network Diagnostics** - Ports, Connections, Traffic, DNS, Ping, Firewall
- **Log Analysis** - Automatische Error Detection & Pattern Recognition
- **Service Management** - systemd Service Control mit Safety Guards
- **Security First** - Approval System für destructive Actions
- **Terminal CLI** - Interaktiver Chat mit Live Performance Stats
- **100% Lokal** - Alle Daten bleiben auf deinem Server
- **Strukturiertes Logging** - Production-ready Logging mit pino
- **Environment Config** - Flexible Konfiguration über .env Dateien
- **Zynischer Sysadmin** - Professionelle, präzise Antworten mit subtiler Ironie

## Quick Start

```bash
# 1. Clone & Install
git clone https://github.com/burnshall-ui/say10.git
cd say10
npm install

# 2. Konfiguration
cp .env.example .env
# Bearbeite .env und setze dein Ollama Model

# 3. Ollama Model laden
ollama pull gpt-oss:20b

# 4. Global installieren
npm run install-global

# 5. Von überall starten!
satan
```

**Done!** Du kannst jetzt `satan` von jedem Verzeichnis aus starten.

## Empfohlene Models

### gpt-oss:20b (Empfohlen)
```bash
ollama pull gpt-oss:20b
```
- **Performance:** ~10 tokens/sec
- **Größe:** 13 GB
- **RAM Bedarf:** ~14 GB
- Beste Balance zwischen Geschwindigkeit und Intelligenz
- Folgt System Prompt sehr gut
- Antwortet kurz und präzise auf Deutsch

### qwen3-coder:30b-a3b-q4_K_M (Alternativ)
```bash
ollama pull qwen3-coder:30b-a3b-q4_K_M
```
- **Performance:** ~12 tokens/sec
- **Größe:** ~19 GB
- **RAM Bedarf:** ~20 GB
- Sehr intelligent, manchmal zu ausführlich

### llama3.1:8b (Leichtgewicht)
```bash
ollama pull llama3.1:8b
```
- **Performance:** ~8 tokens/sec
- **Größe:** ~4.7 GB
- **RAM Bedarf:** ~6 GB
- Gut für kleinere Server

## Beispiel Session

```text
  ███████╗ █████╗ ██╗   ██╗ ██╗ ██████╗
  ██╔════╝██╔══██╗╚██╗ ██╔╝███║██╔═████╗
  ███████╗███████║ ╚████╔╝ ╚██║██║██╔██║
  ╚════██║██╔══██║  ╚██╔╝   ██║████╔╝██║
  ███████║██║  ██║   ██║    ██║╚██████╔╝
  ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═╝ ╚═════╝
  ─────────────────────────────────────────
  Advanced AI Server Administrator

Du: servus, na wie gehts dem server?

[say10]
  [TOOLS] Executing 1 tool(s)...
  [EXEC] system_status({}...)

  [PERF] 10.55 tokens/sec | 408 tokens | 44.1s total

System‑Status in Kürze:

* OS: Ubuntu 24.04.3 LTS, Kernel 6.8.0‑87‑generic
* Uptime: 1 Tag 1 Std 32 Min
* CPU: 6‑Kern‑Ryzen 5 3500, Load ≈ 2.8 % – OK
* Speicher: 30.9 GB / 31.3 GB (≈ 99 % verwendet) – kritisch
* Festplatte: 89 GB belegt von 935 GB – ausreichend

Kurz gesagt: CPU und Festplattenkapazität sind in Ordnung,
der RAM ist fast leer. Erstelle ggf. einen Swap‑Block oder
schließe Anwendungen, die viel Speicher beanspruchen.

────────────────────────────────────────────────────────────

Du: exit

[SYSTEM] Session terminated
```

## Features

### System Monitoring Tools

| Tool | Beschreibung |
|------|--------------|
| `check_disk_space` | Disk Usage mit Status-Indikatoren (OK/WARN/CRIT) |
| `check_memory` | RAM & Swap Monitoring mit verfügbarem Speicher |
| `check_cpu` | CPU Load, Load Average & Top Prozesse |
| `system_status` | Kompletter System-Überblick (OS, Uptime, CPU, RAM, Disk) |

### Log Analysis Tools

| Tool | Beschreibung |
|------|--------------|
| `read_syslog` | System Logs mit Filtern (Zeilen, Priorität) |
| `search_logs` | Pattern-basierte Suche in Logs |
| `tail_logs` | Spezifische Log-Dateien live verfolgen |
| `analyze_errors` | Automatische Error-Pattern Detection |

### Service Management Tools

| Tool | Beschreibung |
|------|--------------|
| `list_services` | Alle systemd Services auflisten |
| `service_status` | Detaillierter Service Status |
| `restart_service` | Service Restart (mit Approval) |
| `enable_service` | Autostart aktivieren (mit Approval) |
| `check_service_logs` | Service-spezifische Logs |

### Network Diagnostics Tools

| Tool | Beschreibung |
|------|--------------|
| `check_ports` | Zeigt alle offenen Ports und lauschende Services |
| `check_connections` | Aktive Netzwerk-Verbindungen mit Remote-IP & Status |
| `network_traffic` | Interface-Statistiken (RX/TX Bytes, Packets, Errors) |
| `dns_lookup` | DNS Resolution Testing (A, AAAA, MX, NS, TXT Records) |
| `ping_host` | Konnektivität & Latency Testing |
| `check_firewall` | Firewall Status & Rules (ufw/iptables) |
| `traceroute` | Netzwerk-Pfad Verfolgung zu einem Host |

## Installation & Setup

### Voraussetzungen

- **Node.js 18+** (getestet mit v25.1.0)
- **Ubuntu/Debian Linux** (getestet mit Ubuntu 24.04 LTS)
- **Ollama** installiert und laufend
- **NVIDIA GPU** optional für bessere Performance

### Installation

#### Option 1: Global Installation (Empfohlen)

Nach globaler Installation kannst du `satan` von überall aufrufen:

```bash
# 1. Repository klonen
git clone https://github.com/burnshall-ui/say10.git
cd say10

# 2. Dependencies installieren
npm install

# 3. Konfiguration
cp .env.example .env
nano .env  # Passe dein Model an

# 4. Ollama Model laden
ollama pull gpt-oss:20b

# 5. Global installieren
npm run install-global

# 6. Von überall starten!
cd ~/irgendein/anderer/ordner
satan
```

#### Option 2: Lokale Installation

```bash
# 1-4 wie oben

# 5. Lokal starten
npm run satan
```

### Deinstallation

```bash
# Global deinstallieren
npm run uninstall-global
```

## Konfiguration

### Environment Variables (.env)

```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b      # Empfohlenes Model
OLLAMA_TIMEOUT=30000

# Logging
LOG_LEVEL=info                # debug, info, warn, error
LOG_PRETTY=true               # Pretty print in development
NODE_ENV=development          # development or production

# Server
SERVER_NAME=say10
SERVER_VERSION=1.0.0

# Security
REQUIRE_APPROVAL=true         # Approval für destructive Actions

# Tools
DEFAULT_LOG_LINES=50          # Standard Zeilen für read_syslog
MAX_LOG_LINES=1000            # Maximum Zeilen
```

### System Prompt anpassen

Der System Prompt kann in `cli/admin-cli.ts` angepasst werden:

```typescript
const systemPrompt = `Du bist ein zynischer, aber extrem kompetenter Linux-Systemadministrator...`;
```

Aktuell konfiguriert als:
- Zynischer, professioneller Sysadmin
- Kurze, präzise, technische Antworten
- Selten subtile okkulte/schwarzhumorige Anspielungen
- Effizienz vor Unterhaltung
- Antworten immer auf Deutsch

## 🔒 Security

**say10** wurde mit Security-First Design entwickelt und einem vollständigen Security Audit unterzogen.

### Security Score: 8.5/10 🟢

**Audit Report:** Siehe `SECURITY-AUDIT.md` für Details

### Implemented Security Features

#### 1. Input Validation ✅
Alle User-Inputs werden strikt validiert:
- **Service Names** - Alphanumerisch, max 100 Zeichen
- **Hostnames** - RFC 1123 compliant, kein Command Injection
- **IP Addresses** - IPv4 & IPv6 Validation
- **Log Paths** - Nur /var/log/, kein Path Traversal
- **Search Patterns** - ReDoS Prevention, max 200 Zeichen

```typescript
// Beispiel: Hostname-Validierung
sanitizeHostnameOrIP('google.com')  // ✅ OK
sanitizeHostnameOrIP('192.168.1.1') // ✅ OK
sanitizeHostnameOrIP('../../etc/passwd') // ❌ Throw Error
```

#### 2. Command Injection Prevention ✅
- Kein direkter Shell-Aufruf (`child_process.exec`)
- Verwendet `execa` mit Array-Argumenten (auto-escaped)
- Keine String-Interpolation in Commands
- Whitelist-basierte Command-Validierung

```typescript
// SICHER ✅
await execa("ping", ["-c", "4", sanitizedHost]);

// NICHT verwendet ❌
// exec(`ping -c 4 ${host}`)  // Gefährlich!
```

#### 3. Approval System ✅
Destructive Commands erfordern User-Approval:

**Geschützte Actions:**
- Service Restarts/Stops (`systemctl restart/stop`)
- Package Management (`apt`, `dpkg`)
- File Operations (`rm`, `chmod`, `chown`)
- User Management (`userdel`, `groupdel`)
- Network Config (`iptables`, `ufw`)

```bash
# Beispiel: Service Restart
You: restart nginx

[⚠ APPROVAL REQUIRED]
Command: systemctl restart nginx
Reason: Erfordert sudo/root, Destructive Action

Execute this command? (y/N) █
```

#### 4. Timeout Protection ✅
Alle Operations haben Timeouts:
- **Network Operations:** 3-60s
- **Service Operations:** 3-30s
- **Log Operations:** 5-15s

Prevents: Hanging processes, Resource exhaustion, DoS

#### 5. Memory Leak Prevention ✅
- Conversation History: Max 50 Nachrichten
- Automatisches Cleanup nach jedem Chat
- Keine unbegrenzten Caches/Arrays

#### 6. Error Information Disclosure Prevention ✅
Error Messages werden sanitized:
- Dateipfade → `[PATH]`
- IP-Adressen → `[IP]`
- Ports → `[PORT]`

### Compliance

- ✅ **OWASP Top 10** (2021) - Compliant
- ✅ **CWE Top 25** - Addressed
- ✅ **SANS Top 25** - Addressed

**Specific CWE Coverage:**
- CWE-78: OS Command Injection - **MITIGATED**
- CWE-22: Path Traversal - **MITIGATED**
- CWE-400: Resource Exhaustion - **MITIGATED**
- CWE-770: Allocation without Limits - **FIXED**
- CWE-1333: ReDoS - **MITIGATED**

### Testing

```bash
# Run security tests
npm test

# With coverage report
npm run test:coverage
```

**Test Coverage:**
- 30 Unit Tests (alle bestehen)
- 91.5% Coverage für Validation-Funktionen
- Command Injection Tests
- Path Traversal Tests
- ReDoS Tests

### Best Practices

1. **Run with REQUIRE_APPROVAL=true** (default)
2. **Review whitelist.json** regelmäßig
3. **Monitor logs** für ungewöhnliche Patterns
4. **Keep dependencies updated** (`npm audit`)
5. **Principle of Least Privilege** - Run as non-root user when possible

### Known Limitations

- **Linux Only** - Designed for Linux servers
- **Sudo Required** - Some operations need sudo (with approval)
- **Local Network Only** - Not designed for public internet exposure
- **Single User** - No multi-user authentication

### Reporting Security Issues

Found a security vulnerability? Please report it responsibly:
1. **DO NOT** open a public issue
2. Email: security@say10.local (or create private security advisory)
3. Include: Description, Steps to reproduce, Impact
4. Expected response time: 48 hours

## Commands

### Interactive Mode (Empfohlen)

#### Global (nach `npm run install-global`)

```bash
# Von überall starten (startet automatisch im Chat Mode)
satan

# Mit spezifischem Model
satan chat --model mistral:latest

# Quick Commands
satan status        # Schneller System-Status
satan logs          # Zeigt Logs
satan logs -n 100   # Zeigt 100 Zeilen

# Help
satan --help
```

#### Lokal (ohne global install)

```bash
# Chat starten
npm run satan

# Quick Commands
npm run satan status
npm run satan logs
```

### Development

```bash
# Dev Mode (CLI mit auto-reload)
npm run dev:cli

# MCP Server standalone
npm start

# Build
npm run build

# Tests
npm test
```

## Sicherheit

### Mehrstufiges Sicherheitskonzept

1. **Whitelist System**
   - Read-only Commands laufen ohne Approval
   - Konfigurierbar via `config/whitelist.json`

2. **Approval System**
   - Destructive Actions benötigen Bestätigung
   - Sudo-Commands werden erkannt
   - Clear Prompts über Command & Risiken

3. **Safety by Design**
   - Nur whitelisted Commands by default
   - Alle File-Operations in /var/log beschränkt
   - Keine automatischen destructive Actions

### Approval Dialog

```text
[WARNING] Approval Required
────────────────────────────────────────────────
Command: sudo systemctl restart nginx
Reason:  Destructive Action, Erfordert sudo/root
[WARN] Destructive action
[WARN] Requires sudo/root privileges
────────────────────────────────────────────────
? Command ausführen? (Y/n)
```

## Architektur

```text
┌─────────────────────┐
│   Terminal CLI      │
│   (admin-cli.ts)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Ollama MCP        │
│   Bridge            │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────┐   ┌────────┐
│ Ollama │   │  MCP   │
│  API   │   │ Server │
└────────┘   └────┬───┘
                  │
         ┌────────┼────────┐
         ▼        ▼        ▼
    ┌────────┬────────┬────────┐
    │Monitor │  Logs  │Service │
    │ Tools  │  Tools │ Tools  │
    └────────┴────────┴────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Safety System  │
         │ - Whitelist    │
         │ - Approval     │
         └────────────────┘
```

## Performance

### Performance Stats

say10 zeigt Live-Performance Stats nach jeder Antwort:

```text
[PERF] 10.55 tokens/sec | 408 tokens | 44.1s total
```

- **tokens/sec:** Generierungsgeschwindigkeit
- **tokens:** Anzahl generierte Tokens
- **total:** Gesamtzeit in Sekunden

### GPU Beschleunigung

Für beste Performance NVIDIA GPU verwenden:

```bash
# NVIDIA Treiber installieren
sudo apt install nvidia-dkms-550

# GPU laden
sudo modprobe nvidia

# Prüfen
nvidia-smi
```

Mit GPU: ~10-12 tokens/sec
Ohne GPU (CPU only): ~2-3 tokens/sec

## Troubleshooting

### Ollama läuft nicht
```bash
sudo systemctl status ollama
sudo systemctl start ollama
```

### Model nicht gefunden
```bash
ollama list
ollama pull gpt-oss:20b
```

### GPU wird nicht verwendet
```bash
nvidia-smi  # GPU Status prüfen
sudo modprobe nvidia  # GPU Module laden
sudo apt install nvidia-dkms-550  # Treiber installieren
```

### RAM voll
- Verwende kleineres Model (llama3.1:8b)
- Stoppe andere Services
- Füge Swap Space hinzu

## Use Cases

- **Morning Health Check** - Täglich Server Status prüfen
- **Error Monitoring** - Automatische Error-Analyse aus Logs
- **Service Management** - Services überwachen & neustarten
- **Performance Debugging** - CPU/Memory Probleme identifizieren
- **Log Analysis** - Schnelle Log-Suche & Pattern-Erkennung
- **Security Audits** - Failed logins & Security events prüfen

## Dokumentation

- **[SETUP.md](SETUP.md)** - Detaillierte Installation & Konfiguration
- **[FEATURES.md](FEATURES.md)** - Alle Features im Detail
- **[QUICKSTART.md](QUICKSTART.md)** - In 5 Minuten loslegen
- **[test-manual.md](test-manual.md)** - Test Guide für alle Features

## Roadmap

Mögliche zukünftige Features:

- [ ] Docker Container Management
- [ ] Database Health Checks
- [ ] Prometheus Metrics Export
- [ ] Automated Health Reports
- [ ] Web Dashboard
- [ ] Email Alerts
- [ ] Backup Management
- [ ] Package Update Management

## Contributing

Contributions sind willkommen!

1. Fork das Repo
2. Feature Branch erstellen (`git checkout -b feature/amazing`)
3. Commits machen (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing`)
5. Pull Request öffnen

## Lizenz

MIT License

## Credits

Gebaut mit:

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io) - Tool Integration für LLMs
- [Ollama](https://ollama.ai) - Lokales LLM Hosting
- [systeminformation](https://systeminformation.io) - System Monitoring
- [pino](https://getpino.io) - Strukturiertes Logging
- TypeScript & Node.js

## Support

Bei Fragen oder Problemen öffne ein Issue auf GitHub.

---

**Made with 🔥 for Linux Sysadmins**
