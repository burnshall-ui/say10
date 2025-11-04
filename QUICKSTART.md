# say10 - Quick Start

## 5-Minuten Setup

### 1. Dependencies installieren

```bash
npm install
```

### 2. Ollama prüfen

```bash
# Prüfe ob Ollama läuft
curl http://localhost:11434/api/tags

# Falls nicht: Installiere Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Lade ein Model
ollama pull mistral:latest
```

### 3. Starten!

```bash
npm run satan
```

Das war's! Die Hölle ist los!

---

## Erste Schritte im Chat

### Test 1: Begrüßung
```
Du: Hallo, wie geht es dem Server?
```

Die AI wird automatisch die System-Status Tools nutzen und dir einen Überblick geben.

### Test 2: Logs checken
```
Du: Zeig mir die letzten Fehler aus den Logs
```

### Test 3: Service prüfen
```
Du: Liste mir alle failed Services
```

---

## Wichtige Commands

```bash
# Interaktiver Chat (empfohlen)
npm run satan
# oder
npm run say10

# Quick System Status
npm run satan status

# Quick Logs
npm run satan logs

# Mit anderem Ollama Model
npx tsx cli/admin-cli.ts chat --model mistral:latest

# Development Mode
npm run dev:cli

# Build
npm run build
```

---

## Approval System

Wenn die AI destructive Actions ausführen möchte (z.B. Service restart), wirst du gefragt:

```
 Approval Required
────────────────────────────────────────────────
Command: sudo systemctl restart nginx
Reason:  Destructive Action, Erfordert sudo/root
────────────────────────────────────────────────
? Command ausführen? (Y/n)
```

Du kannst jederzeit mit **n** ablehnen.

---

## Troubleshooting

**"Ollama API Error"**
```bash
# Starte Ollama
ollama serve
```

**"Permission Denied"**
- Manche Commands brauchen sudo
- Du wirst um Bestätigung gebeten

**"MCP Server Start fehlgeschlagen"**
```bash
# Installiere tsx global
npm install -g tsx
```

---

## Was als Nächstes?

- Lies [SETUP.md](SETUP.md) für Details
- Teste alle Features mit [test-manual.md](test-manual.md)
- Passe [config/whitelist.json](config/whitelist.json) an

---

## Beispiel-Session

```
╔════════════════════════════════════════╗
║      say10 - Server Admin       ║
╚════════════════════════════════════════╝

Verbinde mit MCP Server...
say10 MCP Server gestartet
Bereit für Verbindungen...
Verbunden! 13 Tools verfügbar
Chat gestartet! (Tippe 'exit' zum Beenden)

────────────────────────────────────────────────────────────

Du: Wie geht es dem Server?

say10: 
  AI möchte 1 Tool(s) nutzen...
  → Tool: system_status({})

Hey! Lass mich schnell checken wie's dem Server geht...

**System Status sieht gut aus!**

**System:**
- OS: Ubuntu 22.04 LTS
- Uptime: 5d 12h 34m

**CPU:** OK
- Intel Core i7-9700K
- 8 Cores @ 3.6 GHz
- Load: 12.3%

**Memory:** OK
- 6.2 GB / 16 GB (38%)

**Disk:** OK
- /: 42 GB / 100 GB (42%)

Alles läuft stabil! Keine Probleme gefunden.

────────────────────────────────────────────────────────────

Du: exit

Auf Wiedersehen!

MCP Server Verbindung getrennt
```

Viel Spaß mit say10 - lass die Hölle los!

