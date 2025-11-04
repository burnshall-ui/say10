# Manual Testing Guide

## Voraussetzungen für Tests

- Ubuntu/Debian System
- Ollama läuft mit llama3.2:latest oder ähnlich
- npm dependencies installiert
- sudo-Rechte verfügbar

## Test Checklist

### 1. Installation & Setup

```bash
# Dependencies installieren
npm install

# Build
npm run build

# Sollte ohne Errors durchlaufen
```

**Expected:** Build erfolgreich, keine TypeScript Errors

---

### 2. MCP Server Start (Standalone)

```bash
npm start
```

**Expected:**
- Server startet
- Ausgabe: "AI Server Admin MCP Server gestartet"
- Ausgabe: "Bereit für Verbindungen..."
- Keine Errors

**Test:** Ctrl+C zum Beenden

---

### 3. Quick Status Command

```bash
npm run admin status
```

**Expected:**
- MCP Server startet
- System Status wird angezeigt mit:
  - OS Info
  - CPU Status mit Emoji
  - Memory Status mit Emoji
  - Disk Status mit Emoji
- Server stoppt automatisch
- Keine Errors

---

### 4. Quick Logs Command

```bash
npm run admin logs
```

**Expected:**
- System Logs werden angezeigt
- Mindestens einige Log-Zeilen sichtbar
- Format: Zeitstempel + Message
- Keine Errors

```bash
npm run admin logs -n 10
```

**Expected:** Nur 10 Zeilen angezeigt

---

### 5. Interactive Chat Mode - Basic

```bash
npm run admin
```

**Expected:**
- Banner wird angezeigt
- "Starte MCP Server..."
- "MCP Server gestartet"
- "Verbinde mit MCP Server..."
- "Verbunden! X Tools verfügbar"
- "Chat gestartet!"
- Prompt: "Du: "

**Test Eingabe:**
```
Du: Hallo
```

**Expected:** AI antwortet freundlich auf Deutsch

**Test Exit:**
```
Du: exit
```

**Expected:** 
- "Auf Wiedersehen!"
- Server wird sauber beendet

---

### 6. System Status via Chat

```bash
npm run admin
```

**Test:**
```
Du: Wie geht es dem Server?
```

**Expected:**
- AI nutzt `system_status` Tool (sichtbar: "→ Tool: system_status...")
- AI gibt strukturierte Antwort:
  - CPU Info
  - Memory Info
  - Disk Info
  - Uptime
- Status-Indikatoren werden verwendet (OK, WARN, CRITICAL)

---

### 7. Disk Space Check

**Test:**
```
Du: Zeig mir den Disk Space
```

**Expected:**
- AI nutzt `check_disk_space` Tool
- Alle Partitionen werden angezeigt
- GB-Werte und Prozent sind korrekt
- Farbkodierung je nach Usage

---

### 8. Memory Check

**Test:**
```
Du: Wie viel RAM ist verfügbar?
```

**Expected:**
- AI nutzt `check_memory` Tool
- RAM Total, Used, Free werden angezeigt
- Swap Info (falls vorhanden)
- Prozent-Werte korrekt

---

### 9. CPU Check

**Test:**
```
Du: Zeig mir die CPU Auslastung
```

**Expected:**
- AI nutzt `check_cpu` Tool
- CPU Modell und Cores
- Aktuelle Auslastung in %
- Load Average
- Top Prozesse Liste

---

### 10. Log Reading

**Test:**
```
Du: Zeig mir die letzten System Logs
```

**Expected:**
- AI nutzt `read_syslog` Tool
- Mindestens 20-50 Zeilen Logs
- Timestamped entries
- Format korrekt

---

### 11. Log Search

**Test:**
```
Du: Suche in den Logs nach "error"
```

**Expected:**
- AI nutzt `search_logs` Tool mit pattern "error"
- Matching Logs werden angezeigt
- Anzahl Treffer wird genannt

---

### 12. Error Analysis

**Test:**
```
Du: Gab es Errors in den letzten 24 Stunden?
```

**Expected:**
- AI nutzt `analyze_errors` Tool
- Error-Zusammenfassung wird angezeigt
- Grouped by Pattern
- Häufigkeit wird genannt
- Wenn keine Errors: Meldung

---

### 13. Service List

**Test:**
```
Du: Liste alle Services
```

**Expected:**
- AI nutzt `list_services` Tool
- Services werden kategorisiert:
  - Active
  - Failed
  - Inactive
- Wichtige Services hervorgehoben
- Failed Services prominent angezeigt

---

### 14. Service Status

**Test:**
```
Du: Wie geht es dem ssh Service?
```

**Expected:**
- AI nutzt `service_status` Tool
- Detaillierter Status von ssh/sshd
- Active/Inactive Status
- Full systemctl status Output

---

### 15. Service Logs

**Test:**
```
Du: Zeig mir die nginx Logs
```

**Expected:**
- AI nutzt `check_service_logs` Tool
- Service-spezifische Logs werden angezeigt
- Letzte 50 Einträge (default)

---

### 16. Approval System - Service Restart

**Test:**
```
Du: Starte nginx neu
```

**Expected:**
- AI möchte `restart_service` Tool nutzen
- **Approval Dialog erscheint:**
  ```
   Approval Required
  ────────────────────────────────────────────────
  Command: sudo systemctl restart nginx
  Reason:  Destructive Action, Erfordert sudo/root
   Dies ist eine DESTRUCTIVE Action!
  Erfordert sudo/root Rechte
  ────────────────────────────────────────────────
  ? Command ausführen? (Y/n)
  ```

**Test Case A: Approve (y)**
- Service wird neugestartet
- AI bestätigt: "Service wurde erfolgreich neugestartet"
- Status wird verifiziert

**Test Case B: Reject (n)**
- Service wird NICHT neugestartet
- AI: "Command wurde abgelehnt" oder ähnlich
- Schlägt Alternative vor

---

### 17. Whitelist - Read-Only Commands

**Test:**
```
Du: Zeig mir den Disk Space
```

**Expected:**
- Tool wird OHNE Approval Dialog ausgeführt
- Direktes Ergebnis
- Kein Approval nötig (read-only)

---

### 18. Multi-Tool Conversation

**Test:**
```
Du: Mach einen vollständigen Health Check
```

**Expected:**
- AI nutzt MEHRERE Tools:
  - system_status
  - analyze_errors
  - list_services (für failed services)
- Gibt Zusammenfassung
- Zeigt Probleme auf (falls vorhanden)

---

### 19. Proactive Suggestions

**Test:**
```
Du: Gibt es Probleme auf dem Server?
```

**Expected:**
- AI analysiert proaktiv
- Nutzt multiple Tools
- Gibt konkrete Empfehlungen
- Zeigt Trends auf

---

### 20. Error Handling

**Test A: Tool Error**
```
Du: Zeig mir den Status von nicht-existierender-service
```

**Expected:**
- Error wird abgefangen
- AI gibt höfliche Fehlermeldung
- Schlägt vor, Service-Liste zu prüfen

**Test B: Ollama Disconnect**
- Stoppe Ollama während Chat: `systemctl stop ollama`
- Sende Nachricht

**Expected:**
- Error wird erkannt
- Fehlermeldung: "Fehler bei Ollama Kommunikation"
- CLI bleibt stabil (kein Crash)

---

### 21. Different Ollama Models

```bash
npm run admin chat --model llama3.2:latest
npm run admin chat --model mistral:latest
```

**Expected:**
- Verschiedene Models funktionieren
- Tool Calling funktioniert mit beiden
- Antwortqualität variiert, aber funktional

---

### 22. Long Conversation

Führe 10+ aufeinanderfolgende Fragen durch:
1. "Wie geht es dem Server?"
2. "Zeig mir Disk Space"
3. "Gibt es Errors?"
4. "Liste Services"
5. "Wie geht es nginx?"
6. "Zeig mir nginx Logs"
7. "Wie ist die CPU?"
8. "Wie viel RAM ist frei?"
9. "Suche in Logs nach warning"
10. "Mach einen Health Check"

**Expected:**
- Context bleibt erhalten
- AI kann auf frühere Fragen referenzieren
- Kein Memory Leak
- Performance bleibt stabil

---

### 23. Exit Handling

**Test verschiedene Exit-Varianten:**
```
exit
quit
Exit
QUIT
Ctrl+C
```

**Expected:**
- Alle führen zu sauberem Exit
- "Auf Wiedersehen!"
- MCP Server wird gestoppt
- Keine Zombie-Prozesse

---

## Performance Tests

### CPU Usage während Chat

```bash
# In Terminal 1:
npm run admin

# In Terminal 2:
top -p $(pgrep -f "tsx.*admin-cli")
```

**Expected:** 
- Idle: < 5% CPU
- During Tool Call: < 30% CPU
- Memory: < 200MB

---

## Security Tests

### 1. Destructive Command Blocking

Teste dass folgende Commands IMMER Approval brauchen:
- `rm -rf /`
- `systemctl stop ssh`
- `shutdown now`

### 2. Whitelist nur Read-Only

Prüfe `config/whitelist.json`:
- Keine destructive Commands
- Keine sudo Commands
- Nur read-only Operations

---

## Regression Tests nach Code-Änderungen

Nach jedem Update:
1. Build erfolgreich (`npm run build`)
2. MCP Server startet (`npm start`)
3. Quick Status funktioniert (`npm run admin status`)
4. Interactive Chat startet (`npm run admin`)
5. Mindestens ein Tool funktioniert
6. Approval Dialog erscheint bei destructive Action

---

## Bug Report Template

Wenn ein Test fehlschlägt:

```markdown
## Bug Report

**Test:** [Test Name/Nummer]
**Command:** [Command der ausgeführt wurde]
**Expected:** [Was erwartet wurde]
**Actual:** [Was tatsächlich passiert ist]
**Error Message:** [Falls vorhanden]
**System:** [Ubuntu Version, Node Version]
**Ollama Model:** [Welches Model]

**Steps to Reproduce:**
1. 
2. 
3. 

**Screenshots/Logs:**
[Anhängen falls hilfreich]
```

---

## Success Criteria

Alle Tests → **Ready for Production**

Mindestens 18/23 Tests → **Beta Ready**

< 15 Tests → **Needs Work**

