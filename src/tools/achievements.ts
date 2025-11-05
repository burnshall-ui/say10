/**
 * Achievement Tools
 * 
 * Tools fuer Achievement-Anzeige und Statistiken
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getAchievementTracker } from "../achievements/tracker.js";
import { ACHIEVEMENTS, getAchievementById, getAchievementsByCategory } from "../achievements/definitions.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("achievement-tools");

/**
 * Get Achievement Tools
 */
export function getAchievementTools(): Tool[] {
  return [
    {
      name: "achievements_list",
      description: "Zeigt alle freigeschalteten Achievements. Nutze dies um zu sehen, was du schon erreicht hast.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "achievements_progress",
      description: "Zeigt Progress aller Achievements (auch noch nicht freigeschaltete).",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "Filter nach Kategorie: tools, sessions, docker, security, performance, special (optional)",
          },
        },
      },
    },
    {
      name: "achievements_stats",
      description: "Zeigt deine Statistiken und Achievement-Punkte.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

/**
 * Handle Achievement Tool Calls
 */
export async function handleAchievementTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const tracker = getAchievementTracker();
  await tracker.initialize();

  switch (name) {
    case "achievements_list":
      return await achievementsList();
    case "achievements_progress":
      return await achievementsProgress(args.category as string | undefined);
    case "achievements_stats":
      return await achievementsStats();
    default:
      throw new Error(`Unknown achievement tool: ${name}`);
  }
}

/**
 * List Unlocked Achievements
 */
async function achievementsList(): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const tracker = getAchievementTracker();
    const unlocked = tracker.getUnlockedAchievements();

    if (unlocked.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "[ACHIEVEMENTS] Noch keine Achievements freigeschaltet.\n\nNutze 'achievements_progress' um zu sehen, welche du erreichen kannst!",
          },
        ],
      };
    }

    // Sort by unlock date (newest first)
    unlocked.sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime());

    let output = `[ACHIEVEMENTS] Freigeschaltete Achievements (${unlocked.length}/${ACHIEVEMENTS.length})\n\n`;

    // Group by rarity
    const byRarity = new Map<string, typeof unlocked>();
    for (const u of unlocked) {
      const achievement = getAchievementById(u.achievementId);
      if (!achievement) continue;

      const rarity = achievement.rarity;
      if (!byRarity.has(rarity)) {
        byRarity.set(rarity, []);
      }
      byRarity.get(rarity)!.push(u);
    }

    // Display by rarity
    const rarityOrder = ["legendary", "epic", "rare", "uncommon", "common"];
    for (const rarity of rarityOrder) {
      const achievements = byRarity.get(rarity);
      if (!achievements || achievements.length === 0) continue;

      output += `\n--- ${rarity.toUpperCase()} ---\n`;
      for (const u of achievements) {
        const achievement = getAchievementById(u.achievementId);
        if (!achievement) continue;

        const date = u.unlockedAt.toLocaleDateString("de-DE");
        output += `${achievement.icon} ${achievement.name} (+${achievement.points} pts)\n`;
        output += `   ${achievement.description}\n`;
        output += `   Freigeschaltet: ${date}\n\n`;
      }
    }

    const totalPoints = tracker.getTotalPoints();
    output += `\nTotal Punkte: ${totalPoints}`;

    logger.info({ count: unlocked.length }, "Achievements listed");

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, "Achievements list failed");
    throw new Error(`Fehler beim Abrufen der Achievements: ${error}`);
  }
}

/**
 * Show Achievement Progress
 */
async function achievementsProgress(category?: string): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const tracker = getAchievementTracker();
    const progress = tracker.getAllProgress();

    let achievements = ACHIEVEMENTS;
    if (category) {
      achievements = getAchievementsByCategory(category);
      if (achievements.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `[ACHIEVEMENTS] Keine Achievements in Kategorie: ${category}\n\nVerfuegbare Kategorien: tools, sessions, docker, security, performance, special`,
            },
          ],
        };
      }
    }

    let output = `[ACHIEVEMENTS] Progress${category ? ` (${category})` : ""}\n\n`;

    for (const achievement of achievements) {
      const prog = progress.find((p) => p.achievementId === achievement.id);
      if (!prog) continue;

      const status = prog.unlocked ? "[DONE]" : "[ -- ]";
      const progressBar = createProgressBar(prog.percentage);

      output += `${status} ${achievement.icon} ${achievement.name}\n`;
      output += `      ${achievement.description}\n`;
      output += `      ${progressBar} ${prog.current}/${prog.required} (${Math.floor(prog.percentage)}%)\n`;
      output += `      Rarity: ${achievement.rarity} | Points: ${achievement.points}\n\n`;
    }

    logger.info({ category, count: achievements.length }, "Achievement progress shown");

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error, category }, "Achievement progress failed");
    throw new Error(`Fehler beim Abrufen des Progress: ${error}`);
  }
}

/**
 * Show Achievement Statistics
 */
async function achievementsStats(): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const tracker = getAchievementTracker();
    const stats = tracker.getStatistics();
    const unlocked = tracker.getUnlockedAchievements();
    const totalPoints = tracker.getTotalPoints();

    let output = "[ACHIEVEMENTS] Statistiken\n\n";

    // Achievement Stats
    output += `Achievements:\n`;
    output += `  Freigeschaltet: ${unlocked.length}/${ACHIEVEMENTS.length}\n`;
    output += `  Progress: ${Math.floor((unlocked.length / ACHIEVEMENTS.length) * 100)}%\n`;
    output += `  Total Punkte: ${totalPoints}\n\n`;

    // Session Stats
    output += `Sessions:\n`;
    output += `  Total: ${stats.totalSessions}\n`;
    output += `  Erfolgreich: ${stats.successfulSessions}\n`;
    output += `  Fehlgeschlagen: ${stats.failedSessions}\n`;
    if (stats.totalSessions > 0) {
      const successRate = Math.floor((stats.successfulSessions / stats.totalSessions) * 100);
      output += `  Erfolgsrate: ${successRate}%\n`;
    }
    output += `  Consecutive Days: ${stats.consecutiveDays}\n\n`;

    // Tool Stats
    output += `Tools:\n`;
    output += `  Total benutzt: ${stats.totalTools}\n`;
    output += `  Unique Tools: ${stats.toolUsage.size}\n\n`;

    // Special Stats
    output += `Special:\n`;
    output += `  Docker Container: ${stats.dockerContainersManaged}\n`;
    output += `  Services Restarted: ${stats.servicesRestarted}\n`;
    output += `  Night Sessions: ${stats.lateNightSessions}\n`;
    output += `  Fast Sessions (<1min): ${stats.fastSessions}\n`;
    output += `  Long Sessions (>30min): ${stats.longSessions}\n\n`;

    // Top Tools
    const topTools = Array.from(stats.toolUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topTools.length > 0) {
      output += `Top 5 Tools:\n`;
      for (const [tool, count] of topTools) {
        output += `  ${count}x - ${tool}\n`;
      }
    }

    logger.info("Achievement statistics shown");

    return {
      content: [
        {
          type: "text",
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, "Achievement stats failed");
    throw new Error(`Fehler beim Abrufen der Statistiken: ${error}`);
  }
}

/**
 * Create Progress Bar
 */
function createProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;
  return "[" + "=".repeat(filled) + "-".repeat(empty) + "]";
}

