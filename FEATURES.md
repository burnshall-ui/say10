# Feature Overview - AI Server Admin MCP

## 🎯 Kernfeatures

### 1. System Monitoring

**Tools:**
- ✅ `check_disk_space` - Disk Space Usage mit Farb-Indikatoren
- ✅ `check_memory` - RAM & Swap Monitoring
- ✅ `check_cpu` - CPU Load, Usage & Top Prozesse
- ✅ `system_status` - Kompletter System-Überblick

**Use Cases:**
- Schneller Health Check
- Performance Probleme diagnostizieren
- Disk Space Warnings früh erkennen
- Memory Leaks aufspüren

**Beispiel:**
```
Du: Wie geht es dem Server?
AI: [nutzt system_status Tool]
    ✅ Alles läuft gut!
    CPU: 12%, Memory: 38%, Disk: 42%
```

---

### 2. Log-Analyse

**Tools:**
- ✅ `read_syslog` - System Logs mit Filter-Optionen
- ✅ `search_logs` - Pattern-basierte Log-Suche
- ✅ `tail_logs` - Spezifische Log-Dateien lesen
- ✅ `analyze_errors` - Error-Pattern Detection & Gruppierung

**Use Cases:**
- Fehlersuche und Debugging
- Security Audits (Failed logins, etc.)
- Application Error Tracking
- Trend-Erkennung

**Beispiel:**
```
Du: Gab es Errors in den letzten 24 Stunden?
AI: [nutzt analyze_errors Tool]
    📊 3 Error Patterns gefunden:
    1. 15x - Network timeout to api.example.com
    2. 5x - Failed to connect to database
    3. 2x - Disk quota warning
```

---

### 3. Service Management

**Tools:**
- ✅ `list_services` - Alle systemd Services mit Status
- ✅ `service_status` - Detaillierter Service Status
- ✅ `restart_service` - Service Neustart (mit Approval)
- ✅ `enable_service` - Service für Autostart aktivieren (mit Approval)
- ✅ `check_service_logs` - Service-spezifische Logs

**Use Cases:**
- Services überwachen
- Failed Services schnell finden
- Services neustarten bei Problemen
- Service-Logs debuggen

**Beispiel:**
```
Du: Liste alle failed Services
AI: [nutzt list_services Tool mit filter=failed]
    🔴 2 Failed Services gefunden:
    - postgresql.service
    - custom-app.service
```

---

### 4. Sicherheitssystem

**Komponenten:**

#### Whitelist System
- Read-only Commands ohne Approval
- Pattern-basiertes Matching
- Anpassbar via `config/whitelist.json`

#### Approval System
- Automatische Erkennung von destructive Actions
- Sudo-Command Detection
- Interaktive Approval-Dialoge
- Clear Prompts über Command & Risiko

**Destructive Commands (require approval):**
- Service restarts/stops
- Package installations/removals
- File deletions
- System shutdowns
- User/Group changes
- Firewall changes

**Beispiel:**
```
Du: Starte nginx neu
AI: [möchte restart_service nutzen]

⚠️  Approval Required
────────────────────────────────────────
Command: sudo systemctl restart nginx
Reason:  Destructive Action, Erfordert sudo
⚠️  Dies ist eine DESTRUCTIVE Action!
────────────────────────────────────────
? Command ausführen? (y/N)
```

---

### 5. Terminal CLI

**Modi:**

#### Interactive Chat Mode
```bash
npm run admin
```
- Vollständige Konversation mit AI
- Context wird behalten
- Multi-Tool Nutzung
- Proaktive Vorschläge

#### Quick Commands
```bash
npm run admin status     # Schneller Status-Check
npm run admin logs       # Schneller Log-View
```

**Features:**
- Farb-kodierte Output
- Clear Status Indicators (✅ ⚠️ 🔴)
- Emojis für bessere UX
- Strukturierte Ausgaben

---

### 6. MCP Resources

Der Server bietet auch MCP Resources an:

- `admin://status/system` - Live System Status (JSON)
- `admin://logs/syslog` - Live System Logs
- `admin://services/list` - Live Service Liste (JSON)

Diese können von MCP Clients abonniert werden für Live-Updates.

---

### 7. MCP Prompts

Vordefinierte Prompts für häufige Tasks:

- `health_check` - Vollständiger System Health Check
- `security_audit` - Security-Review durchführen
- `diagnose_issue` - Problem diagnostizieren

**Beispiel:**
```
Du: Führe einen Health Check durch
AI: [nutzt health_check Prompt Template]
    🔍 Starte vollständigen Health Check...
    [nutzt mehrere Tools]
    ✅ System Health: Gut
    📊 Details: ...
```

---

## 🚀 Workflow Examples

### Morning Routine Check

```
Du: Guten Morgen! Wie geht es dem Server?

AI: Guten Morgen! 🌅
    [system_status]
    ✅ Server läuft stabil seit 12 Tagen
    
    [analyze_errors]
    📋 Gestern Abend gab es 3 Warnings:
    - Network timeout (temporary)
    
    [list_services mit filter=failed]
    ✅ Alle Services laufen

    Zusammenfassung: Alles gut! 👍
```

---

### Problem Debugging

```
Du: Nginx läuft nicht mehr richtig

AI: Lass mich das checken...
    [service_status nginx]
    🔴 nginx ist failed
    
    [check_service_logs nginx]
    📋 Letzte Logs zeigen:
    "Port 80 already in use"
    
    [check_cpu mit top processes]
    💡 Ich sehe apache2 läuft auf Port 80
    
    Empfehlung: Stoppe apache2 oder 
    konfiguriere nginx für anderen Port.
```

---

### Security Audit

```
Du: Mach einen Security Check

AI: 🔒 Starte Security Audit...
    [search_logs pattern="Failed password"]
    ⚠️ 15 Failed login attempts gefunden
    
    [list_services filter=active]
    ✅ fail2ban ist active
    
    [service_status ufw]
    ✅ Firewall ist active
    
    Empfehlungen:
    - Failed logins sind normal (Bots)
    - fail2ban blockt diese automatisch
    - Firewall ist korrekt konfiguriert
```

---

### Performance Investigation

```
Du: Server ist langsam

AI: 🔍 Performance Check...
    [check_cpu]
    🔴 CPU: 95% (mysql: 80%)
    
    [check_memory]
    ⚠️ Memory: 92% (nur 1.2 GB frei)
    
    [check_disk_space]
    ✅ Disk: 45%
    
    Problem: MySQL nutzt zu viel CPU & RAM
    
    [check_service_logs mysql]
    📋 Logs zeigen: Slow queries
    
    Empfehlung: MySQL Queries optimieren
    oder mehr RAM zuweisen
```

---

## 🎨 UX Features

### Visual Indicators

- ✅ **Green** - Alles OK
- ⚠️ **Yellow** - Warning, Aufmerksamkeit nötig
- 🔴 **Red** - Critical, sofort handeln
- 🔧 **Tools** - Tool wird genutzt
- 💬 **Chat** - AI antwortet
- 🔒 **Security** - Security-relevante Info

### Structured Output

Alle Tools geben strukturierte, leicht lesbare Ausgaben:

```
📊 **Disk Space Usage**

✅ **/** (ext4)
   Größe: 100.0 GB
   Genutzt: 45.2 GB (45%)
   Verfügbar: 54.8 GB

✅ **/home** (ext4)
   Größe: 500.0 GB
   Genutzt: 120.5 GB (24%)
   Verfügbar: 379.5 GB
```

### Context Awareness

Die AI behält den Context:

```
Du: Wie geht es dem Server?
AI: [gibt Status]

Du: Und die Logs?
AI: [weiß dass es um den Server geht]

Du: Gibt es Probleme?
AI: [bezieht sich auf vorherigen Status & Logs]
```

---

## 🔧 Customization

### Eigene Prompts

System Prompt in `cli/admin-cli.ts` anpassen:

```typescript
const systemPrompt = `
Du bist ein AI Administrator...
[Deine Anpassungen]
`;
```

### Whitelist erweitern

`config/whitelist.json`:

```json
{
  "commands": [
    "df", "free",
    "mein-custom-command"
  ]
}
```

### Neue Tools hinzufügen

1. Tool in `src/tools/mein-tool.ts` erstellen
2. In `src/index.ts` registrieren
3. Rebuild: `npm run build`

---

## 📈 Future Features (Roadmap)

- 🐳 Docker Container Management
- 🗄️ Database Health Checks (PostgreSQL, MySQL, Redis)
- 📊 Prometheus Metrics Export
- 🌐 Web Dashboard
- 📧 Email Alerts
- 📅 Scheduled Health Reports
- 🔐 Advanced Security Scans
- 🚀 Deployment Automation
- 📦 Package Update Management
- 🔄 Backup Management

---

## 💡 Pro Tips

1. **Morning Check:** Frage jeden Morgen "Wie geht es dem Server?"
2. **Proactive:** Lass AI regelmäßig Errors analysieren
3. **Context:** Stelle Follow-up Fragen für mehr Details
4. **Approval:** Prüfe Commands genau bevor du approved
5. **Whitelist:** Füge nur read-only Commands hinzu
6. **Logs:** Bei Problemen immer erst Logs checken
7. **Services:** Liste failed services täglich
8. **Disk:** Achte auf Disk Space Warnings früh

---

## 🎓 Learning

Die AI lernt durch Nutzung besser:

- Erkläre Probleme im Detail
- Gib Feedback wenn etwas nicht passt
- Stelle Follow-up Fragen
- Nutze die AI proaktiv, nicht nur reaktiv

Je mehr du die AI nutzt, desto besser wird sie deine Server-Umgebung verstehen!

