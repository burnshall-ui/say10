# Setup Anleitung - AI Server Admin MCP

## Voraussetzungen

1. **Node.js 18+** (v25.1.0 empfohlen)
2. **Ubuntu/Debian Linux Server**
3. **Ollama** installiert und laufend

## Installation

### 1. Projekt Setup

```bash
# Dependencies installieren
npm install

# TypeScript kompilieren
npm run build
```

### 2. Ollama Setup

Falls Ollama noch nicht installiert ist:

```bash
# Ollama installieren
curl -fsSL https://ollama.com/install.sh | sh

# Ein Model laden (z.B. llama3.2)
ollama pull llama3.2:latest

# Ollama starten (läuft als Service)
ollama serve
```

Prüfe ob Ollama läuft:

```bash
curl http://localhost:11434/api/tags
```

### 3. System Permissions

Für einige Tools werden sudo-Rechte benötigt. Du wirst bei Bedarf um Approval gebeten.

Optional: Erlaube bestimmte Befehle ohne Passwort (NUR wenn du weißt was du tust!):

```bash
sudo visudo
# Füge hinzu:
# yourusername ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart *
# yourusername ALL=(ALL) NOPASSWD: /usr/bin/systemctl stop *
# yourusername ALL=(ALL) NOPASSWD: /usr/bin/systemctl start *
```

## Verwendung

### Interaktiver Chat Mode (Empfohlen)

```bash
npm run admin
```

oder

```bash
npm run dev:cli
```

### Quick Commands

**System Status anzeigen:**
```bash
npm run admin status
```

**Logs anzeigen:**
```bash
npm run admin logs
npm run admin logs -n 100
```

### Als eigenständiger MCP Server

```bash
npm start
```

Der Server nutzt stdio Transport und kann von jedem MCP Client genutzt werden.

## Beispiel Konversationen

### 1. System Health Check

```
Du: Wie geht es dem Server?

AI: 🚀 Lass mich schnell den Server Status checken!
    [AI nutzt: system_status]
    
    Alles sieht gut aus! 
    - CPU: 15% Auslastung
    - Memory: 4.2 GB / 16 GB (26%)
    - Disk: 45 GB / 100 GB (45%)
    - Uptime: 12 Tage
    
    Keine kritischen Probleme gefunden!
```

### 2. Log Analyse

```
Du: Gibt es Errors in den Logs?

AI: [AI nutzt: analyze_errors]
    
    Ich habe die letzten 24 Stunden analysiert:
    - 3 Errors gefunden
    - Alle related zu einer temporären Network timeout
    - Kein kritisches Problem
```

### 3. Service Management

```
Du: Starte nginx neu

AI: [AI möchte: restart_service nginx]

⚠️  Approval Required
────────────────────────────────────────────────
Command: sudo systemctl restart nginx
Reason:  Destructive Action, Erfordert sudo/root
⚠️  Dies ist eine DESTRUCTIVE Action!
🔐 Erfordert sudo/root Rechte
────────────────────────────────────────────────
? Command ausführen? (Y/n) y

AI: ✅ nginx wurde erfolgreich neugestartet!
    Service läuft wieder.
```

## Verfügbare MCP Tools

### System Monitoring

- `check_disk_space` - Disk Usage anzeigen
- `check_memory` - RAM Status
- `check_cpu` - CPU Auslastung und Top Prozesse
- `system_status` - Gesamtübersicht

### Log Analyse

- `read_syslog` - System Logs lesen
- `search_logs` - Logs durchsuchen
- `tail_logs` - Spezifische Log-Dateien
- `analyze_errors` - Error-Pattern Analyse

### Service Management

- `list_services` - Alle systemd Services
- `service_status` - Service Status Details
- `restart_service` - Service neustarten (requires approval)
- `enable_service` - Service enablen (requires approval)
- `check_service_logs` - Service-spezifische Logs

## Konfiguration

### Whitelist anpassen

Bearbeite `config/whitelist.json` um Commands hinzuzufügen, die OHNE Approval laufen:

```json
{
  "commands": [
    "df",
    "free",
    "ps",
    "eigener-command"
  ],
  "patterns": [
    "^df\\s+",
    "^ps\\s+"
  ]
}
```

**ACHTUNG:** Nur read-only Commands whitelisten!

### Ollama Model ändern

```bash
npm run admin chat --model llama3.2:latest
```

Oder in Code:
```typescript
const ollama = new OllamaWithMCP("http://localhost:11434", "llama3.2:latest");
```

## Troubleshooting

### "Ollama API Error"

- Prüfe ob Ollama läuft: `systemctl status ollama`
- Starte Ollama: `ollama serve`
- Teste API: `curl http://localhost:11434/api/tags`

### "MCP Server Start fehlgeschlagen"

- Prüfe ob Port frei ist
- Prüfe ob tsx installiert ist: `npm install -g tsx`

### "Permission Denied"

- Manche Commands brauchen sudo
- Du wirst um Approval gebeten
- Prüfe User-Rechte

### "Tool nicht gefunden"

- Prüfe ob MCP Server gestartet ist
- Prüfe Logs in stderr
- Tools werden beim Start geladen

## Development

### Code ändern und testen

```bash
# Development Mode (auto-reload)
npm run dev

# CLI Development
npm run dev:cli
```

### Neue Tools hinzufügen

1. Tool in `src/tools/*.ts` implementieren
2. Tool in `getXXXTools()` registrieren
3. Handler in `handleXXXTool()` hinzufügen
4. Rebuild: `npm run build`

### Tests schreiben

Tests sollten einzelne Tools isoliert testen:

```typescript
import { handleMonitoringTool } from './src/tools/monitoring.js';

const result = await handleMonitoringTool('system_status', {});
console.log(result);
```

## Sicherheit

### Approval System

- **Whitelisted**: Read-only Commands laufen ohne Approval
- **Destructive**: Alle destructive Actions benötigen Approval
- **Sudo**: Alle sudo-Commands benötigen Approval

### Best Practices

1. ✅ Whitelist nur read-only Commands
2. ✅ Prüfe Commands vor Approval genau
3. ✅ Teste auf Test-System zuerst
4. ❌ NIEMALS automatisch approven ohne Review
5. ❌ NIEMALS Whitelist mit destructive Commands

## Support & Erweiterungen

### Geplante Features

- Docker Integration
- Database Health Checks
- Prometheus Metrics
- Automated Reports
- Web Dashboard

### Contribution

1. Fork das Repo
2. Feature Branch erstellen
3. Tests hinzufügen
4. Pull Request öffnen

## Lizenz

MIT License - siehe LICENSE file

