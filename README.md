# say10 - Advanced AI Server Administrator

> Your local AI Administrator for Ubuntu Server - powered by Ollama & MCP

A complete MCP (Model Context Protocol) Server that gives your Ubuntu Server an advanced AI administrator. Uses Ollama for local LLM and provides a terminal CLI similar to Claude Code.

## ✨ Highlights

- 🖥️ **System Monitoring** - CPU, Memory, Disk Space mit intelligenter Analyse
- 📋 **Log Analysis** - Automatische Error Detection & Pattern Recognition
- ⚙️ **Service Management** - systemd Service Control mit Safety Guards
- 🔒 **Security First** - Approval System für destructive Actions
- 💬 **Terminal CLI** - Interaktiver Chat wie Claude Code
- 🎯 **Proaktiv** - AI schlägt Verbesserungen vor und warnt bei Problemen
- 🌍 **100% Lokal** - Alle Daten bleiben auf deinem Server

## 🚀 Quick Start

```bash
# 1. Installation
npm install

# 2. Build
npm run build

# 3. Starten!
npm run satan
```

**Done!** say10 is now your server admin.

## 📖 Dokumentation

- 📘 **[Quick Start Guide](QUICKSTART.md)** - In 5 Minuten loslegen
- 📗 **[Setup Guide](SETUP.md)** - Detaillierte Installation & Konfiguration
- 📕 **[Features](FEATURES.md)** - Alle Features im Detail
- 📙 **[Manual Testing](test-manual.md)** - Test Guide für alle Features

## Beispiel Conversation

```text
  ███████╗ █████╗ ██╗   ██╗ ██╗ ██████╗ 
  ██╔════╝██╔══██╗╚██╗ ██╔╝███║██╔═████╗
  ███████╗███████║ ╚████╔╝ ╚██║██║██╔██║
  ╚════██║██╔══██║  ╚██╔╝   ██║████╔╝██║
  ███████║██║  ██║   ██║    ██║╚██████╔╝
  ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═╝ ╚═════╝ 
  ─────────────────────────────────────────
  Advanced AI Server Administrator

Du: Wie geht es dem Server?

[say10] 
  🔧 Lass mich schnell checken...
  
  ✅ System läuft stabil!
  
  **System:**
  - Ubuntu 22.04 LTS
  - Uptime: 12 Tage 5 Stunden
  
  **CPU:** ✅ 12% Auslastung
  **Memory:** ✅ 6.2 GB / 16 GB (38%)
  **Disk:** ✅ 42 GB / 100 GB (42%)
  
  Keine kritischen Probleme gefunden! 👍

────────────────────────────────────────────────

Du: Gab es Errors?

🤖 AI: 
  📊 Analysiere Logs der letzten 24h...
  
  Gefunden: 3 Error Patterns
  
  1. **15x** - Network timeout (temporary)
  2. **5x** - Database connection hiccups
  3. **2x** - Disk quota warning
  
  Die meisten sind minor und behoben.
  Nur der Disk Space sollte beobachtet werden.

────────────────────────────────────────────────

Du: Starte nginx neu

⚠️  Approval Required
────────────────────────────────────────────────
Command: sudo systemctl restart nginx
Reason:  Destructive Action, Erfordert sudo/root
⚠️  Dies ist eine DESTRUCTIVE Action!
────────────────────────────────────────────────
? Command ausführen? (Y/n) y

🤖 AI: 
  ✅ nginx wurde erfolgreich neugestartet!
  Service läuft wieder einwandfrei.
```

## 🛠️ Features im Detail

### System Monitoring Tools

| Tool | Beschreibung |
|------|--------------|
| `check_disk_space` | Disk Usage mit Farb-Indikatoren |
| `check_memory` | RAM & Swap Monitoring |
| `check_cpu` | CPU Load & Top Prozesse |
| `system_status` | Kompletter System-Überblick |

### Log Analysis Tools

| Tool | Beschreibung |
|------|--------------|
| `read_syslog` | System Logs mit Filtern |
| `search_logs` | Pattern-basierte Suche |
| `tail_logs` | Spezifische Log-Dateien |
| `analyze_errors` | Error-Pattern Detection |

### Service Management Tools

| Tool | Beschreibung |
|------|--------------|
| `list_services` | Alle systemd Services |
| `service_status` | Detaillierter Service Status |
| `restart_service` | Service Restart (mit Approval) |
| `enable_service` | Autostart aktivieren (mit Approval) |
| `check_service_logs` | Service-spezifische Logs |

## 🔒 Sicherheit

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

## 📦 Installation & Requirements

### Voraussetzungen

- **Node.js 18+** (v25.1.0 empfohlen)
- **Ubuntu/Debian Linux**
- **Ollama** mit einem Model (z.B. llama3.2:latest)

### Setup

```bash
# 1. Repository klonen
git clone <repo-url>
cd spassprojekt-mcp

# 2. Dependencies installieren
npm install

# 3. Build
npm run build

# 4. Ollama prüfen
ollama list

# 5. Starten!
npm run admin
```

## 🎮 Commands

### Interactive Mode

```bash
# Chat starten (empfohlen)
npm run satan
# oder
npm run say10

# Mit spezifischem Model
npx tsx cli/admin-cli.ts chat --model mistral:latest
```

### Quick Commands

```bash
# Schneller System Status
npm run satan status

# Logs anzeigen
npm run satan logs
npm run satan logs -n 100
```

### Development

```bash
# Dev Mode (auto-reload)
npm run dev:cli

# MCP Server standalone
npm start

# Tests
npm test
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
│   Ollama + MCP      │
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
    │Monitoring│ Logs │Services│
    │  Tools  │ Tools│  Tools │
    └────────┴────────┴────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Safety System  │
         │ - Whitelist    │
         │ - Approval     │
         └────────────────┘
```

## 🧪 Testing

### Automated Tests

```bash
# Auf Linux:
./test.sh

# Oder:
npm test
```

### Manual Testing

Siehe [test-manual.md](test-manual.md) für eine komplette Test-Checklist.

## 🔧 Konfiguration

### Whitelist anpassen

`config/whitelist.json`:

```json
{
  "commands": [
    "df", "free", "ps",
    "dein-custom-command"
  ],
  "patterns": [
    "^df\\s+",
    "^ps\\s+"
  ]
}
```

**⚠️ ACHTUNG:** Nur read-only Commands whitelisten!

### System Prompt anpassen

`cli/admin-cli.ts`:

```typescript
const systemPrompt = `
Du bist Claude, ein AI Server Administrator...
[Deine Anpassungen]
`;
```

## 🚀 Advanced Usage

### Als MCP Server (für andere Clients)

```bash
npm start
```

Der Server nutzt stdio Transport und kann von jedem MCP Client verwendet werden.

### Integration mit Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "server-admin": {
      "command": "node",
      "args": ["/path/to/spassprojekt-mcp/dist/index.js"]
    }
  }
}
```

## 📊 Use Cases

- ✅ **Morning Health Check** - Täglich Server Status prüfen
- ✅ **Error Monitoring** - Automatische Error-Analyse
- ✅ **Service Management** - Services überwachen & neustarten
- ✅ **Performance Debugging** - CPU/Memory Probleme finden
- ✅ **Log Analysis** - Schnelle Log-Suche & Pattern-Erkennung
- ✅ **Security Audits** - Failed logins & Security events prüfen
- ✅ **Proactive Maintenance** - AI schlägt Optimierungen vor

## 🎯 Roadmap

Geplante Features:

- [ ] Docker Container Management
- [ ] Database Health Checks
- [ ] Prometheus Metrics Export
- [ ] Automated Health Reports
- [ ] Web Dashboard
- [ ] Email Alerts
- [ ] Backup Management
- [ ] Package Update Management

## 🤝 Contributing

Contributions sind willkommen!

1. Fork das Repo
2. Feature Branch erstellen
3. Tests hinzufügen
4. Pull Request öffnen

## 📄 Lizenz

MIT License

## 🙏 Credits

Basierend auf dem [System-Prompt](https://gist.github.com/...) für einen lokalen AI Server Admin.

Gebaut mit:

- [Model Context Protocol](https://modelcontextprotocol.io)
- [Ollama](https://ollama.ai)
- TypeScript & Node.js

---

## Support

Bei Fragen oder Problemen öffne ein Issue auf GitHub.
