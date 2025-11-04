# Changelog

## [1.0.0] - 2025-11-04

### Aktueller Stand

**Model:** `gpt-oss:20b` (empfohlen)
**Performance:** ~10 tokens/sec mit GPU
**System Prompt:** Zynischer, professioneller Linux-Sysadmin

### Features

- ✅ System Monitoring (CPU, RAM, Disk, Uptime)
- ✅ Log Analysis mit Error Detection
- ✅ Service Management mit Approval System
- ✅ Performance Stats nach jeder Antwort
- ✅ Strukturiertes Logging mit pino
- ✅ Environment Variable Configuration
- ✅ GPU Beschleunigung Support
- ✅ Whitelist & Approval System für Sicherheit

### Dokumentation

- ✅ README.md komplett aktualisiert
- ✅ Model-Empfehlungen (gpt-oss:20b, qwen3-coder:30b, llama3.1:8b)
- ✅ Installation & Setup Guide
- ✅ Performance Stats Dokumentation
- ✅ GPU Setup Anleitung
- ✅ Troubleshooting Section

### Technische Details

#### Code Cleanup

- Alle Emojis aus dem Code entfernt
- Unnötige Logger-Ausgaben deaktiviert
- Performance Stats optimiert
- `.gitignore` aktualisiert (.tsbuildinfo, temp files)
- TypeScript Build ohne Warnings

#### Konfiguration

`.env` Variablen:
```bash
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b
OLLAMA_TIMEOUT=30000
LOG_LEVEL=info
LOG_PRETTY=true
NODE_ENV=development
SERVER_NAME=say10
SERVER_VERSION=1.0.0
REQUIRE_APPROVAL=true
DEFAULT_LOG_LINES=50
MAX_LOG_LINES=1000
```

#### System Prompt

Aktuelle Persona:
- Zynischer, aber extrem kompetenter Linux-Sysadmin
- Kurze, präzise, technische Antworten
- Selten subtile okkulte/schwarzhumorige Anspielungen
- Effizienz vor Unterhaltung
- Antworten immer auf Deutsch

### Performance

#### Model Vergleich

| Model | tokens/sec | RAM Bedarf | Größe | Qualität |
|-------|-----------|-----------|-------|----------|
| gpt-oss:20b | ~10 t/s | ~14 GB | 13 GB | ⭐⭐⭐⭐⭐ Empfohlen |
| qwen3-coder:30b | ~12 t/s | ~20 GB | 19 GB | ⭐⭐⭐⭐ Sehr gut |
| llama3.1:8b | ~8 t/s | ~6 GB | 4.7 GB | ⭐⭐⭐ Gut |

#### Hardware

Getestet auf:
- **CPU:** AMD Ryzen 5 3500 (6 Cores)
- **RAM:** 31 GB
- **GPU:** NVIDIA Quadro M4000 (8 GB VRAM)
- **OS:** Ubuntu 24.04.3 LTS
- **Kernel:** 6.8.0-87-generic

### Breaking Changes

- ❌ Streaming Support entfernt (war buggy)
- ✅ Zurück zu blockierendem Response
- ✅ Performance Stats am Ende statt während Generierung

### Bekannte Probleme

- qwen3-coder:30b manchmal zu ausführlich (>800 tokens)
- gpt-oss:20b manchmal zu kryptisch bei komplexen Fragen
- Hoher RAM-Verbrauch mit großen Models (>20 GB)

### Installation

```bash
git clone <repo-url>
cd say10
npm install
cp .env.example .env
# Edit .env - set OLLAMA_MODEL=gpt-oss:20b
ollama pull gpt-oss:20b
npm run satan
```

### Usage

```bash
# Interactive Chat (empfohlen)
npm run satan

# Quick Status
npm run satan status

# Logs
npm run satan logs
npm run satan logs --lines 100

# Development
npm run dev:cli

# Build
npm run build
```

### Next Steps

Das Projekt ist jetzt **production-ready** und kann zu GitHub gepusht werden!

Empfohlene nächste Schritte:
1. Repository auf GitHub anlegen
2. `git init && git add . && git commit -m "Initial commit"`
3. `git remote add origin <github-url>`
4. `git push -u origin main`

---

**Status:** ✅ Ready for GitHub Push
**Datum:** 2025-11-04
**Version:** 1.0.0
