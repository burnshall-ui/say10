# Achievement System

say10 hat jetzt ein vollstaendiges Achievement/Gamification System!

## Was ist das?

Ein System das deine Aktivitaeten trackt und dich fuer Erfolge belohnt.

Wie in einem Spiel: Du sammelst Punkte, schaltest Achievements frei und trackst deinen Fortschritt.

---

## Features

- **Automatisches Tracking**: Alles wird im Hintergrund mitgezaehlt
- **26 Achievements**: Von "First Blood" bis "Immortal"
- **5 Rarity Levels**: Common, Uncommon, Rare, Epic, Legendary
- **Punkte System**: Sammle Punkte fuer jedes Achievement
- **Kategorien**: Tools, Sessions, Docker, Security, Performance, Special
- **Persistent Storage**: Alles wird in `~/.say10/achievements/` gespeichert

---

## Achievements Overview

### Common (10-15 Punkte)

| Achievement | Beschreibung | Requirement |
|-------------|--------------|-------------|
| **First Blood** | Deine erste Session abgeschlossen | 1 Session |
| **Tool Master Beginner** | Erstes Tool erfolgreich benutzt | 1 Tool |
| **Docker Newbie** | Ersten Docker Container verwaltet | 1 Container |
| **RTFM** | 10x --help aufgerufen | 10x help |

### Uncommon (25-40 Punkte)

| Achievement | Beschreibung | Requirement |
|-------------|--------------|-------------|
| **Tool Enthusiast** | 10 verschiedene Tools benutzt | 10 unique Tools |
| **Problem Solver** | 10 erfolgreiche Sessions | 10 Sessions |
| **Docker Captain** | 10 Docker Container verwaltet | 10 Container |
| **Restart Master** | 10 Services neugestartet | 10 Restarts |
| **Night Owl** | 10 Sessions zwischen 00:00-06:00 | 10 Night Sessions |
| **Marathon Runner** | Session laenger als 30 Minuten | 1 Long Session |
| **Security Conscious** | 10 mal Approval abgelehnt | 10 Denials |
| **Oops...** | 5 Sessions ohne Erfolg beendet | 5 Failed Sessions |
| **History Buff** | 10x History-Tools benutzt | 10 History Tools |

### Rare (50-80 Punkte)

| Achievement | Beschreibung | Requirement |
|-------------|--------------|-------------|
| **Tool Master** | Alle Tools mindestens einmal benutzt | All Tools |
| **Tool Spammer** | 100 Tools in einer Session | 100 Tools |
| **Veteran** | 50 Sessions abgeschlossen | 50 Sessions |
| **Docker Admiral** | 50 Docker Container verwaltet | 50 Container |
| **Firefighter** | 50 Errors gefixt | 50 Errors |
| **Speed Demon** | Problem in unter 1 Minute geloest | 1 Fast Session |
| **Consistent** | 7 Tage in Folge aktiv | 7 Days Streak |
| **Storyteller** | 10 Session Stories generiert | 10 Stories |

### Epic (100-150 Punkte)

| Achievement | Beschreibung | Requirement |
|-------------|--------------|-------------|
| **Legend** | 100 Sessions abgeschlossen | 100 Sessions |
| **Perfectionist** | 10 Sessions in Folge erfolgreich | 10 Consecutive Wins |
| **Disaster Recovery** | System from 95%+ disk/memory gerettet | 1 Recovery |

### Legendary (500-1000 Punkte)

| Achievement | Beschreibung | Requirement |
|-------------|--------------|-------------|
| **Sysadmin God** | 1000 Tools erfolgreich ausgefuehrt | 1000 Tools |
| **Immortal** | 365 Tage say10 benutzt | 365 Days Active |

---

## Wie wird getrackt?

### Automatisch beim Chatten

Alles passiert automatisch waehrend du say10 benutzt:

- **Session Start**: Tracker wird initialisiert
- **Tool Usage**: Jedes Tool wird mitgezaehlt
- **Session End**: Dauer und Erfolg werden getrackt

### Was wird gespeichert?

```
~/.say10/achievements/
├── unlocked.json      # Freigeschaltete Achievements
└── statistics.json    # Deine Statistiken
```

### Statistics tracked:

- Total Sessions (gesamt, erfolgreich, fehlgeschlagen)
- Tool Usage (total, unique, per-tool counts)
- Docker Container managed
- Services restarted
- Errors fixed
- Late night sessions (00:00-06:00)
- Fast sessions (<1 min)
- Long sessions (>30 min)
- Consecutive days active
- First/Last session date

---

## Verwendung

### Im Chat

Achievements werden automatisch freigeschaltet:

```
Du: zeig mir alle docker container

[say10] *nutzt docker_status*
...

[!] ACHIEVEMENT UNLOCKED [!]

[D] Docker Newbie (+15 pts)
    Ersten Docker Container verwaltet
```

### Tools nutzen

#### achievements_list

Zeige alle freigeschalteten Achievements:

```
Du: zeig mir meine achievements

[ACHIEVEMENTS] Freigeschaltete Achievements (8/26)

--- RARE ---
[VET] Veteran (+75 pts)
   50 Sessions abgeschlossen
   Freigeschaltet: 04.11.2024

--- UNCOMMON ---
[OK] Problem Solver (+30 pts)
   10 erfolgreiche Sessions abgeschlossen
   Freigeschaltet: 03.11.2024

Total Punkte: 245
```

#### achievements_progress

Zeige Progress aller Achievements:

```
Du: achievements progress

[ACHIEVEMENTS] Progress

[DONE] [*] First Blood
       Deine erste Session abgeschlossen
       [====================] 1/1 (100%)
       Rarity: common | Points: 10

[ -- ] [VET] Veteran
       50 Sessions abgeschlossen
       [========------------] 32/50 (64%)
       Rarity: rare | Points: 75

[ -- ] [GOD] Sysadmin God
       1000 Tools erfolgreich ausgefuehrt
       [===------] 342/1000 (34%)
       Rarity: legendary | Points: 500
```

Mit Filter:

```
Du: achievements progress category=docker

[ACHIEVEMENTS] Progress (docker)

[DONE] [D] Docker Newbie
       Ersten Docker Container verwaltet
       [====================] 5/1 (100%)
       
[ -- ] [DD] Docker Captain
       10 Docker Container verwaltet
       [============--------] 6/10 (60%)
```

#### achievements_stats

Zeige deine Statistiken:

```
Du: achievements stats

[ACHIEVEMENTS] Statistiken

Achievements:
  Freigeschaltet: 8/26
  Progress: 30%
  Total Punkte: 245

Sessions:
  Total: 32
  Erfolgreich: 28
  Fehlgeschlagen: 4
  Erfolgsrate: 87%
  Consecutive Days: 5

Tools:
  Total benutzt: 342
  Unique Tools: 15

Special:
  Docker Container: 6
  Services Restarted: 12
  Night Sessions: 3
  Fast Sessions (<1min): 5
  Long Sessions (>30min): 2

Top 5 Tools:
  45x - system_status
  32x - docker_status
  28x - service_status
  18x - docker_logs
  15x - history_list
```

---

## Strategien zum Freischalten

### Easy Achievements (Beginner)

Starte einfach:
1. **First Blood**: Beende deine erste Session
2. **Tool Master Beginner**: Nutze irgendein Tool
3. **Docker Newbie**: Fuehre `docker_status` aus
4. **RTFM**: Rufe `--help` 10x auf

### Medium Achievements

Regelmaessige Nutzung:
- **Problem Solver**: Loeße 10 Probleme erfolgreich
- **Tool Enthusiast**: Probiere verschiedene Tools aus
- **Night Owl**: Arbeite nachts (00:00-06:00)
- **Consistent**: Nutze say10 7 Tage hintereinander

### Hard Achievements

Erfordert Engagement:
- **Veteran**: 50 Sessions
- **Docker Admiral**: 50 Container verwalten
- **Firefighter**: 50 Errors fixen
- **Perfectionist**: 10 Sessions in Folge erfolgreich

### Legendary Achievements

Langzeit-Ziele:
- **Sysadmin God**: 1000 Tools (mehrere Monate)
- **Immortal**: 365 Tage aktiv (ein Jahr!)

---

## Tips & Tricks

### Schnell Punkte sammeln

1. **Nutze viele verschiedene Tools**: Schaltet "Tool Enthusiast" frei
2. **Docker Management**: Viele Docker-bezogene Achievements
3. **History Features**: "History Buff" und "Storyteller"
4. **Regelmaessig nutzen**: "Consistent" fuer 7-Tage Streak

### Special Achievements

- **Speed Demon**: Loeße ein Problem in <1 Minute
  - Tipp: Einfache Fragen wie "zeig system status"
  
- **Marathon Runner**: Session >30 Minuten
  - Tipp: Lass den Chat offen waehrend du arbeitest

- **Night Owl**: 10 Sessions nachts
  - Tipp: Fuer echte Sysadmins kein Problem

- **Disaster Recovery**: System from 95%+ gerettet
  - Tipp: Passiert automatisch wenn du kritische Situationen loest

### Achievement Hunting

Fokussiere dich auf Kategorien:

```bash
# Alle Docker Achievements
achievements_progress category=docker

# Alle Tool Achievements  
achievements_progress category=tools

# Performance Achievements
achievements_progress category=performance
```

---

## Integration mit History

Achievements sind eng mit dem History System verbunden:

- Jede Session wird fuer Achievement-Tracking genutzt
- Success-Rate beeinflusst Achievements
- Tool Usage aus History wird getrackt
- Story-Generierung zaehlt fuer "Storyteller"

---

## Leaderboard (Zukunft)

Geplant:
- Export deiner Stats
- Compare mit anderen Users
- Weekly/Monthly Challenges
- Seasonal Achievements

---

## Troubleshooting

### Achievements werden nicht freigeschaltet

```bash
# Check ob Tracker initialisiert ist
ls ~/.say10/achievements/

# Stats anschauen
achievements_stats

# Manuell Session beenden
exit
```

### Progress wird nicht gespeichert

```bash
# Check Dateien
cat ~/.say10/achievements/statistics.json
cat ~/.say10/achievements/unlocked.json

# Permissions pruefen
ls -la ~/.say10/achievements/
```

### Stats zuruecksetzen

```bash
# Backup erstellen
cp -r ~/.say10/achievements ~/.say10/achievements.backup

# Loeschen
rm -rf ~/.say10/achievements/

# Neu starten
```

---

## Fun Facts

- Das erste Achievement das die meisten freischalten: **First Blood**
- Das seltenste Achievement: **Immortal** (braucht 1 Jahr)
- Das punktreichste Achievement: **Immortal** (1000 pts)
- Haertestes Achievement: **Perfectionist** (10 wins in a row)
- Lustigstes Achievement: **Oops...** (5 fails)

---

## Achievement Icons

```
[*]    - First Blood (Common)
[T]    - Tool Master Beginner (Common)
[TT]   - Tool Enthusiast (Uncommon)
[TTT]  - Tool Master (Rare)
[!!!]  - Tool Spammer/Speed Demon (Rare)
[OK]   - Problem Solver (Uncommon)
[VET]  - Veteran (Rare)
[LEG]  - Legend (Epic)
[D]    - Docker Newbie (Common)
[DD]   - Docker Captain (Uncommon)
[DDD]  - Docker Admiral (Rare)
[R]    - Restart Master (Uncommon)
[FF]   - Firefighter (Rare)
[OWL]  - Night Owl (Uncommon)
[RUN]  - Marathon Runner (Uncommon)
[7D]   - Consistent (Rare)
[SEC]  - Security Conscious (Uncommon)
[?]    - RTFM (Common)
[X_X]  - Oops... (Uncommon)
[***]  - Perfectionist (Epic)
[HIS]  - History Buff (Uncommon)
[BOOK] - Storyteller (Rare)
[GOD]  - Sysadmin God (Legendary)
[INF]  - Immortal (Legendary)
```

---

Made for Sysadmins who like gamification!

