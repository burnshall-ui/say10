# REST API Documentation

say10 bietet jetzt eine REST API zum programmatischen Zugriff auf alle Features!

## Quick Start

### Server starten

```bash
# Development
npm run dev:api

# Production (nach npm run build)
npm run api

# Oder direkt
node dist/cli/api-server.js
```

Default: `http://localhost:6666`

### Umgebungsvariablen

```bash
API_PORT=6666            # Port (default: 6666)
API_HOST=0.0.0.0         # Host (default: 0.0.0.0)
API_KEY=your_secret_key  # API Key fuer Authentication (optional)
```

## Authentication

Falls `API_KEY` gesetzt ist, muss jeder Request (ausser `/health`) einen Header enthalten:

```bash
X-API-Key: your_secret_key
```

Beispiel:

```bash
curl -H "X-API-Key: your_secret_key" http://localhost:6666/api/system/status
```

## Rate Limiting

Standard: 100 Requests pro Minute pro IP

## API Endpoints

### General

#### GET /health

Health Check

```bash
curl http://localhost:6666/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "version": "1.2.0",
    "uptime": 123.456
  },
  "timestamp": "2024-11-04T12:34:56.789Z"
}
```

#### GET /api

API Info und verfuegbare Endpoints

```bash
curl http://localhost:6666/api
```

---

### System Monitoring

#### GET /api/system/status

Vollstaendiger System-Status

```bash
curl http://localhost:6666/api/system/status
```

#### GET /api/monitoring/cpu

CPU Usage und Load

```bash
curl http://localhost:6666/api/monitoring/cpu
```

#### GET /api/monitoring/memory

Memory/RAM Status

```bash
curl http://localhost:6666/api/monitoring/memory
```

#### GET /api/monitoring/disk

Disk Space Usage

```bash
curl http://localhost:6666/api/monitoring/disk
```

---

### Docker Management

#### GET /api/docker/status

Alle Container mit Status

```bash
curl http://localhost:6666/api/docker/status
```

Query Parameters:
- `all` (boolean): Zeige auch gestoppte Container

```bash
curl "http://localhost:6666/api/docker/status?all=true"
```

#### GET /api/docker/resources

Resource Usage aller Container

```bash
curl http://localhost:6666/api/docker/resources
```

#### GET /api/docker/container/:name/logs

Container Logs

```bash
curl http://localhost:6666/api/docker/container/nginx/logs
```

Query Parameters:
- `lines` (number): Anzahl Zeilen (default: 50)

```bash
curl "http://localhost:6666/api/docker/container/nginx/logs?lines=100"
```

---

### Services

#### GET /api/services/list

Alle systemd Services

```bash
curl http://localhost:6666/api/services/list
```

#### GET /api/service/:name/status

Service Status

```bash
curl http://localhost:6666/api/service/nginx/status
```

---

### Network

#### GET /api/network/ports

Offene Ports

```bash
curl http://localhost:6666/api/network/ports
```

#### GET /api/network/connections

Aktive Netzwerk-Verbindungen

```bash
curl http://localhost:6666/api/network/connections
```

---

### History

#### GET /api/history/list

Alle Sessions

```bash
curl http://localhost:6666/api/history/list
```

Query Parameters:
- `limit` (number): Max. Anzahl (default: 10)
- `success_only` (boolean): Nur erfolgreiche Sessions

```bash
curl "http://localhost:6666/api/history/list?limit=20&success_only=true"
```

#### GET /api/history/stats

History Statistiken

```bash
curl http://localhost:6666/api/history/stats
```

#### GET /api/history/session/:id/story

Session Story generieren

```bash
curl http://localhost:6666/api/history/session/2024-11-04-10-30-15/story
```

Query Parameters:
- `format` (string): 'full' oder 'timeline'

```bash
curl "http://localhost:6666/api/history/session/2024-11-04-10-30-15/story?format=timeline"
```

---

### Logs

#### GET /api/logs/syslog

System Logs

```bash
curl http://localhost:6666/api/logs/syslog
```

Query Parameters:
- `lines` (number): Anzahl Zeilen (default: 50)

```bash
curl "http://localhost:6666/api/logs/syslog?lines=100"
```

---

### Generic Tool Execution

#### POST /api/tool/execute

Fuehre beliebiges Tool aus

```bash
curl -X POST http://localhost:6666/api/tool/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "docker_status",
    "args": {}
  }'
```

Request Body:
```json
{
  "tool": "string",    // Tool-Name (erforderlich)
  "args": {}           // Tool-Argumente (optional)
}
```

Beispiele:

```bash
# Docker Status
curl -X POST http://localhost:6666/api/tool/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "docker_status", "args": {"all": true}}'

# Service Status
curl -X POST http://localhost:6666/api/tool/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "service_status", "args": {"service": "nginx"}}'

# History Search
curl -X POST http://localhost:6666/api/tool/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "history_search", "args": {"problem": "nginx"}}'
```

---

## Response Format

Alle Responses folgen diesem Format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-11-04T12:34:56.789Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-11-04T12:34:56.789Z"
}
```

---

## Verwendung in Scripten

### Bash Script

```bash
#!/bin/bash

API_URL="http://localhost:6666"
API_KEY="your_secret_key"

# System Status
curl -H "X-API-Key: $API_KEY" "$API_URL/api/system/status"

# Docker Container
curl -H "X-API-Key: $API_KEY" "$API_URL/api/docker/status"

# History
curl -H "X-API-Key: $API_KEY" "$API_URL/api/history/stats"
```

### Python Script

```python
import requests

API_URL = "http://localhost:6666"
API_KEY = "your_secret_key"

headers = {"X-API-Key": API_KEY}

# System Status
response = requests.get(f"{API_URL}/api/system/status", headers=headers)
print(response.json())

# Execute Tool
response = requests.post(
    f"{API_URL}/api/tool/execute",
    headers=headers,
    json={"tool": "docker_status", "args": {}}
)
print(response.json())
```

### JavaScript/Node.js

```javascript
const API_URL = "http://localhost:6666";
const API_KEY = "your_secret_key";

async function getSystemStatus() {
  const response = await fetch(`${API_URL}/api/system/status`, {
    headers: { "X-API-Key": API_KEY }
  });
  return await response.json();
}

async function executeTool(tool, args = {}) {
  const response = await fetch(`${API_URL}/api/tool/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY
    },
    body: JSON.stringify({ tool, args })
  });
  return await response.json();
}

// Usage
const status = await getSystemStatus();
const docker = await executeTool("docker_status", { all: true });
```

---

## Monitoring Integration

### Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'say10'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:6666']
```

### Grafana

Verwende die API Endpoints als Data Source in Grafana:
- System Metrics: `/api/monitoring/*`
- Docker Stats: `/api/docker/resources`
- Service Status: `/api/services/list`

---

## Security Best Practices

1. **IMMER einen API_KEY setzen** in Production
2. **Nicht public exponieren** - nur im lokalen Netzwerk
3. **HTTPS verwenden** wenn ueber Netzwerk (nginx/traefik reverse proxy)
4. **Rate Limiting beachten**
5. **Logs monitoren** fuer ungewoehnliche Zugriffe

---

## Troubleshooting

### Server startet nicht

```bash
# Port schon belegt?
lsof -i :6666

# Anderer Port verwenden
API_PORT=7777 npm run dev:api
```

### Authentication schlaegt fehl

```bash
# API_KEY korrekt gesetzt?
echo $API_KEY

# Header korrekt?
curl -v -H "X-API-Key: test" http://localhost:6666/api/system/status
```

### Rate Limit erreicht

Warte 1 Minute oder erhoehe Limit in `src/api/server.ts`:

```typescript
rateLimit: {
  max: 200,  // Increase from 100
  timeWindow: "1 minute",
}
```

---

## Examples

### Complete Monitoring Script

```bash
#!/bin/bash

API_URL="http://localhost:6666"
API_KEY="${API_KEY}"

echo "=== System Status ==="
curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/system/status" | jq -r '.data.status'

echo -e "\n=== Docker Containers ==="
curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/docker/status" | jq -r '.data.status'

echo -e "\n=== Service Health ==="
for service in nginx postgres redis; do
    echo -n "$service: "
    curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/service/$service/status" | jq -r '.success'
done

echo -e "\n=== History Stats ==="
curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/history/stats" | jq -r '.data.stats'
```

---

Made without emojis, just like you wanted!

