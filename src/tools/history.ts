/**
 * History & Story Tools
 * 
 * Tools für Session History, Replay und Story-Generierung
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getHistoryStorage } from "../history/storage.js";
import { getStoryGenerator } from "../history/story.js";
import { getLogger } from "../utils/logger.js";
import { parseIntSafe } from "../utils/validation.js";

const logger = getLogger("history-tools");

/**
 * Gibt alle History Tools zurück
 */
export function getHistoryTools(): Tool[] {
  return [
    {
      name: "history_list",
      description:
        "Zeigt alle gespeicherten Chat-Sessions. Nutze dies um vergangene Probleme und Lösungen zu finden.",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max. Anzahl Sessions (default: 10)",
          },
          success_only: {
            type: "boolean",
            description: "Nur erfolgreiche Sessions zeigen (default: false)",
          },
        },
      },
    },
    {
      name: "history_search",
      description:
        "Sucht nach ähnlichen Problemen in der History. Nutze dies um zu sehen, ob das Problem schon mal gelöst wurde.",
      inputSchema: {
        type: "object",
        properties: {
          problem: {
            type: "string",
            description: "Beschreibung des Problems (erforderlich)",
          },
          limit: {
            type: "number",
            description: "Max. Anzahl Ergebnisse (default: 5)",
          },
        },
        required: ["problem"],
      },
    },
    {
      name: "history_replay",
      description:
        "Zeigt Details einer vergangenen Session und schlägt vor, die gleichen Schritte zu wiederholen.",
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "Session ID (erforderlich)",
          },
        },
        required: ["session_id"],
      },
    },
    {
      name: "history_stats",
      description: "Zeigt Statistiken über alle gespeicherten Sessions (meist genutzte Tools, häufige Probleme, etc.).",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "session_story",
      description:
        "Generiert eine narrative Story aus einer Session. Erzählt was passiert ist wie einen Krimi! Sehr cool für Zusammenfassungen.",
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "Session ID (erforderlich)",
          },
          format: {
            type: "string",
            description: "Format: 'full' (mit Kapiteln) oder 'timeline' (nur Timeline). Default: full",
            enum: ["full", "timeline"],
          },
        },
        required: ["session_id"],
      },
    },
    {
      name: "session_timeline",
      description: "Zeigt Timeline aller Events einer Session (Nachrichten, Tool-Calls, Errors).",
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "Session ID (erforderlich)",
          },
        },
        required: ["session_id"],
      },
    },
  ];
}

/**
 * Handle History Tool Calls
 */
export async function handleHistoryTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const storage = getHistoryStorage();

  // Ensure storage is initialized
  await storage.initialize();

  switch (name) {
    case "history_list":
      return await historyList(args.limit as number | undefined, args.success_only as boolean | undefined);
    case "history_search":
      return await historySearch(args.problem as string, args.limit as number | undefined);
    case "history_replay":
      return await historyReplay(args.session_id as string);
    case "history_stats":
      return await historyStats();
    case "session_story":
      return await sessionStory(args.session_id as string, args.format as string | undefined);
    case "session_timeline":
      return await sessionTimeline(args.session_id as string);
    default:
      throw new Error(`Unbekanntes History Tool: ${name}`);
  }
}

/**
 * List Sessions
 */
async function historyList(
  limit?: number,
  successOnly?: boolean
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const storage = getHistoryStorage();
    const listLimit = parseIntSafe(limit, 10, 1, 100);

    const sessions = await storage.listSessions({
      limit: listLimit,
      successOnly: successOnly || false,
    });

    if (sessions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "[HISTORY] Keine Sessions gefunden.\n\nDies ist wahrscheinlich deine erste Session!",
          },
        ],
      };
    }

    let output = `[HISTORY] Gespeicherte Sessions (${sessions.length} Stück)\n\n`;

    for (const session of sessions) {
      const date = session.startTime.toLocaleDateString("de-DE");
      const time = session.startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      const status = session.metadata.success ? "✓" : "⏸";
      const problem = session.metadata.problem || "Keine Beschreibung";
      const tags = session.metadata.tags.length > 0 ? ` [${session.metadata.tags.join(", ")}]` : "";

      output += `${status} ${session.sessionId}\n`;
      output += `   ${date} ${time}\n`;
      output += `   Problem: ${problem}${tags}\n`;
      output += `   Tools: ${session.toolsCalled.length}, Messages: ${session.messages.length}\n\n`;
    }

    logger.info({ count: sessions.length }, "History list retrieved");

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, "History list failed");
    throw new Error(`Fehler beim Abrufen der History: ${error}`);
  }
}

/**
 * Search similar problems
 */
async function historySearch(
  problem: string,
  limit?: number
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const storage = getHistoryStorage();
    const searchLimit = parseIntSafe(limit, 5, 1, 20);

    const matches = await storage.findSimilarProblems(problem, searchLimit);

    if (matches.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `[HISTORY] Keine ähnlichen Probleme gefunden für: "${problem}"\n\nDas ist ein neues Problem!`,
          },
        ],
      };
    }

    let output = `[HISTORY] Ähnliche Probleme gefunden (${matches.length} Matches)\n\n`;
    output += `Gesucht: "${problem}"\n\n`;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const similarity = Math.round(match.similarity * 100);
      const date = match.timestamp.toLocaleDateString("de-DE");

      output += `${i + 1}. Match: ${similarity}% ähnlich\n`;
      output += `   Session: ${match.sessionId}\n`;
      output += `   Datum: ${date}\n`;
      output += `   Problem: ${match.problem}\n`;
      output += `   Lösung: ${match.solution}\n`;
      output += `   Tools: ${match.toolsUsed.join(", ")}\n\n`;
    }

    output += `💡 Tipp: Nutze 'history_replay session_id=<ID>' um die Session zu wiederholen!`;

    logger.info({ problem, matches: matches.length }, "History search completed");

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, problem }, "History search failed");
    throw new Error(`Fehler bei der Suche: ${error}`);
  }
}

/**
 * Replay Session
 */
async function historyReplay(sessionId: string): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const storage = getHistoryStorage();
    const session = await storage.loadSession(sessionId);

    if (!session) {
      return {
        content: [
          {
            type: "text",
            text: `[HISTORY] Session nicht gefunden: ${sessionId}\n\nPrüfe die Session ID mit 'history_list'.`,
          },
        ],
      };
    }

    let output = `[HISTORY] Session Replay: ${sessionId}\n\n`;

    // Session Info
    const date = session.startTime.toLocaleDateString("de-DE");
    const time = session.startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    output += `Datum: ${date} ${time}\n`;
    output += `Status: ${session.metadata.success ? "✓ Erfolgreich" : "⏸ Unvollständig"}\n`;

    if (session.metadata.problem) {
      output += `Problem: ${session.metadata.problem}\n`;
    }

    if (session.metadata.solution) {
      output += `Lösung: ${session.metadata.solution}\n`;
    }

    output += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Show tool sequence
    output += `Durchgeführte Schritte:\n\n`;

    let step = 1;
    for (const tool of session.toolsCalled) {
      const status = tool.success ? "✓" : "✗";
      output += `${step}. ${status} ${tool.tool}\n`;

      // Show args
      const argsKeys = Object.keys(tool.args);
      if (argsKeys.length > 0 && argsKeys.length <= 3) {
        output += `   Args: ${JSON.stringify(tool.args)}\n`;
      }

      if (!tool.success) {
        output += `   Error: ${tool.result.substring(0, 100)}...\n`;
      }

      output += `   Duration: ${tool.duration}ms\n\n`;
      step++;
    }

    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Suggest replay
    output += `💡 Soll ich die gleichen Schritte nochmal ausführen?\n`;
    output += `   Diese Tools wurden verwendet: ${session.toolsCalled.map((t) => t.tool).join(", ")}\n`;

    logger.info({ sessionId }, "Session replay displayed");

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, sessionId }, "History replay failed");
    throw new Error(`Fehler beim Replay: ${error}`);
  }
}

/**
 * History Stats
 */
async function historyStats(): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const storage = getHistoryStorage();
    const stats = await storage.getStats();

    let output = "[HISTORY] Statistiken\n\n";

    output += `📊 Sessions:\n`;
    output += `   Total: ${stats.totalSessions}\n`;
    output += `   Erfolgreich: ${stats.successfulSessions}\n`;
    output += `   Fehlgeschlagen: ${stats.failedSessions}\n`;

    if (stats.totalSessions > 0) {
      const successRate = Math.round((stats.successfulSessions / stats.totalSessions) * 100);
      output += `   Erfolgsrate: ${successRate}%\n`;
    }

    output += `\n`;

    if (stats.averageSessionDuration > 0) {
      output += `⏱️  Durchschnittliche Dauer: ${Math.round(stats.averageSessionDuration)} Minuten\n\n`;
    }

    // Most used tools
    if (stats.mostUsedTools.length > 0) {
      output += `🔧 Top Tools:\n`;
      for (const tool of stats.mostUsedTools.slice(0, 5)) {
        output += `   ${tool.count}x - ${tool.tool}\n`;
      }
      output += `\n`;
    }

    // Common problems
    if (stats.commonProblems.length > 0) {
      output += `🔍 Häufige Probleme:\n`;
      for (const prob of stats.commonProblems.slice(0, 5)) {
        output += `   ${prob.count}x - ${prob.problem}\n`;
      }
    }

    logger.info("History stats retrieved");

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, "History stats failed");
    throw new Error(`Fehler beim Abrufen der Statistiken: ${error}`);
  }
}

/**
 * Session Story
 */
async function sessionStory(
  sessionId: string,
  format?: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const storage = getHistoryStorage();
    const session = await storage.loadSession(sessionId);

    if (!session) {
      return {
        content: [
          {
            type: "text",
            text: `[STORY] Session nicht gefunden: ${sessionId}`,
          },
        ],
      };
    }

    const generator = getStoryGenerator();
    const story = generator.generateStory(session);

    let output = "";

    if (format === "timeline") {
      output = generator.formatTimelineAsText(story.timeline);
    } else {
      output = generator.formatStoryAsText(story);
    }

    logger.info({ sessionId, format }, "Session story generated");

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  } catch (error) {
    logger.error({ error, sessionId }, "Session story failed");
    throw new Error(`Fehler beim Generieren der Story: ${error}`);
  }
}

/**
 * Session Timeline
 */
async function sessionTimeline(sessionId: string): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const storage = getHistoryStorage();
    const session = await storage.loadSession(sessionId);

    if (!session) {
      return {
        content: [
          {
            type: "text",
            text: `[TIMELINE] Session nicht gefunden: ${sessionId}`,
          },
        ],
      };
    }

    const generator = getStoryGenerator();
    const story = generator.generateStory(session);
    const output = generator.formatTimelineAsText(story.timeline);

    logger.info({ sessionId }, "Session timeline generated");

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  } catch (error) {
    logger.error({ error, sessionId }, "Session timeline failed");
    throw new Error(`Fehler beim Generieren der Timeline: ${error}`);
  }
}

