/**
 * Achievement Tracker
 * 
 * Tracks progress and unlocks achievements
 */

import { promises as fs } from "fs";
import { join } from "path";
import { existsSync } from "fs";
import { homedir } from "os";
import type {
  Achievement,
  UnlockedAchievement,
  AchievementProgress,
  UserStatistics,
} from "./types.js";
import { ACHIEVEMENTS, getAchievementById } from "./definitions.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("achievement-tracker");

/**
 * Achievement Tracker Class
 */
export class AchievementTracker {
  private dataDir: string;
  private achievementsFile: string;
  private statsFile: string;
  private unlockedAchievements: Map<string, UnlockedAchievement> = new Map();
  private statistics: UserStatistics;

  constructor(customDir?: string) {
    this.dataDir = customDir || join(homedir(), ".say10", "achievements");
    this.achievementsFile = join(this.dataDir, "unlocked.json");
    this.statsFile = join(this.dataDir, "statistics.json");

    // Initialize statistics
    this.statistics = {
      totalSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      totalTools: 0,
      toolUsage: new Map(),
      dockerContainersManaged: 0,
      servicesRestarted: 0,
      errorsFixed: 0,
      lateNightSessions: 0,
      fastSessions: 0,
      longSessions: 0,
      consecutiveDays: 0,
    };
  }

  /**
   * Initialize Tracker
   */
  async initialize(): Promise<void> {
    try {
      // Create directory
      if (!existsSync(this.dataDir)) {
        await fs.mkdir(this.dataDir, { recursive: true });
        logger.info({ dir: this.dataDir }, "Achievements directory created");
      }

      // Load existing data
      await this.loadUnlockedAchievements();
      await this.loadStatistics();
    } catch (error) {
      logger.error({ error }, "Failed to initialize achievement tracker");
    }
  }

  /**
   * Load Unlocked Achievements
   */
  private async loadUnlockedAchievements(): Promise<void> {
    try {
      if (existsSync(this.achievementsFile)) {
        const content = await fs.readFile(this.achievementsFile, "utf-8");
        const data = JSON.parse(content) as UnlockedAchievement[];

        for (const achievement of data) {
          achievement.unlockedAt = new Date(achievement.unlockedAt);
          this.unlockedAchievements.set(achievement.achievementId, achievement);
        }

        logger.debug({ count: data.length }, "Unlocked achievements loaded");
      }
    } catch (error) {
      logger.error({ error }, "Failed to load unlocked achievements");
    }
  }

  /**
   * Load Statistics
   */
  private async loadStatistics(): Promise<void> {
    try {
      if (existsSync(this.statsFile)) {
        const content = await fs.readFile(this.statsFile, "utf-8");
        const data = JSON.parse(content);

        // Reconstruct Map
        if (data.toolUsage) {
          data.toolUsage = new Map(Object.entries(data.toolUsage));
        }

        // Convert dates
        if (data.firstSessionDate) {
          data.firstSessionDate = new Date(data.firstSessionDate);
        }
        if (data.lastSessionDate) {
          data.lastSessionDate = new Date(data.lastSessionDate);
        }

        this.statistics = { ...this.statistics, ...data };
        logger.debug("Statistics loaded");
      }
    } catch (error) {
      logger.error({ error }, "Failed to load statistics");
    }
  }

  /**
   * Save Unlocked Achievements
   */
  private async saveUnlockedAchievements(): Promise<void> {
    try {
      const data = Array.from(this.unlockedAchievements.values());
      await fs.writeFile(this.achievementsFile, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      logger.error({ error }, "Failed to save unlocked achievements");
    }
  }

  /**
   * Save Statistics
   */
  private async saveStatistics(): Promise<void> {
    try {
      // Convert Map to object for JSON
      const data = {
        ...this.statistics,
        toolUsage: Object.fromEntries(this.statistics.toolUsage),
      };

      await fs.writeFile(this.statsFile, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      logger.error({ error }, "Failed to save statistics");
    }
  }

  /**
   * Track Session Completed
   */
  async trackSessionCompleted(success: boolean, duration: number): Promise<string[]> {
    this.statistics.totalSessions++;

    if (success) {
      this.statistics.successfulSessions++;
    } else {
      this.statistics.failedSessions++;
    }

    // Track fast/long sessions
    if (duration < 60) {
      this.statistics.fastSessions++;
    } else if (duration > 1800) {
      this.statistics.longSessions++;
    }

    // Track late night sessions
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) {
      this.statistics.lateNightSessions++;
    }

    // Update consecutive days
    await this.updateConsecutiveDays();

    await this.saveStatistics();
    return await this.checkAchievements();
  }

  /**
   * Track Tool Used
   */
  async trackToolUsed(toolName: string): Promise<string[]> {
    this.statistics.totalTools++;

    const count = this.statistics.toolUsage.get(toolName) || 0;
    this.statistics.toolUsage.set(toolName, count + 1);

    // Track specific tool categories
    if (toolName.startsWith("docker_")) {
      this.statistics.dockerContainersManaged++;
    }

    if (toolName === "restart_service") {
      this.statistics.servicesRestarted++;
    }

    if (toolName.startsWith("history_")) {
      // Track history tools usage (for history_buff achievement)
    }

    await this.saveStatistics();
    return await this.checkAchievements();
  }

  /**
   * Track Story Generated
   */
  async trackStoryGenerated(): Promise<string[]> {
    // Increment story counter in toolUsage
    const count = this.statistics.toolUsage.get("session_story") || 0;
    this.statistics.toolUsage.set("session_story", count + 1);

    await this.saveStatistics();
    return await this.checkAchievements();
  }

  /**
   * Update Consecutive Days
   */
  private async updateConsecutiveDays(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!this.statistics.firstSessionDate) {
      this.statistics.firstSessionDate = today;
    }

    if (!this.statistics.lastSessionDate) {
      this.statistics.lastSessionDate = today;
      this.statistics.consecutiveDays = 1;
      return;
    }

    const lastDate = new Date(this.statistics.lastSessionDate);
    lastDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day, no change
      return;
    } else if (diffDays === 1) {
      // Consecutive day
      this.statistics.consecutiveDays++;
      this.statistics.lastSessionDate = today;
    } else {
      // Streak broken
      this.statistics.consecutiveDays = 1;
      this.statistics.lastSessionDate = today;
    }
  }

  /**
   * Check Achievements
   */
  private async checkAchievements(): Promise<string[]> {
    const newlyUnlocked: string[] = [];

    for (const achievement of ACHIEVEMENTS) {
      // Skip if already unlocked
      if (this.unlockedAchievements.has(achievement.id)) {
        continue;
      }

      if (this.checkRequirement(achievement)) {
        await this.unlockAchievement(achievement);
        newlyUnlocked.push(achievement.id);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Check Requirement
   */
  private checkRequirement(achievement: Achievement): boolean {
    const { type, value } = achievement.requirement;

    switch (type) {
      case "sessions_completed":
        return this.statistics.totalSessions >= value;

      case "successful_sessions":
        return this.statistics.successfulSessions >= value;

      case "failed_sessions":
        return this.statistics.failedSessions >= value;

      case "tools_used":
        return this.statistics.totalTools >= value;

      case "unique_tools":
        return this.statistics.toolUsage.size >= value;

      case "all_tools_used":
        // Check if all tools have been used at least once
        const allTools = ACHIEVEMENTS.filter((a) => a.category === "tools").length;
        return this.statistics.toolUsage.size >= allTools;

      case "docker_containers":
        return this.statistics.dockerContainersManaged >= value;

      case "services_restarted":
        return this.statistics.servicesRestarted >= value;

      case "errors_fixed":
        return this.statistics.errorsFixed >= value;

      case "night_sessions":
        return this.statistics.lateNightSessions >= value;

      case "fast_session":
        return this.statistics.fastSessions >= value;

      case "long_session":
        return this.statistics.longSessions >= value;

      case "consecutive_days":
        return this.statistics.consecutiveDays >= value;

      case "history_tools_used":
        let historyCount = 0;
        for (const [tool, count] of this.statistics.toolUsage) {
          if (tool.startsWith("history_")) {
            historyCount += count;
          }
        }
        return historyCount >= value;

      case "stories_generated":
        return (this.statistics.toolUsage.get("session_story") || 0) >= value;

      case "days_active":
        if (!this.statistics.firstSessionDate) return false;
        const daysSinceFirst = Math.floor(
          (Date.now() - this.statistics.firstSessionDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceFirst >= value;

      default:
        return false;
    }
  }

  /**
   * Unlock Achievement
   */
  private async unlockAchievement(achievement: Achievement): Promise<void> {
    const unlocked: UnlockedAchievement = {
      achievementId: achievement.id,
      unlockedAt: new Date(),
      progress: 100,
    };

    this.unlockedAchievements.set(achievement.id, unlocked);
    await this.saveUnlockedAchievements();

    logger.info({ achievementId: achievement.id, name: achievement.name }, "Achievement unlocked!");
  }

  /**
   * Get All Progress
   */
  getAllProgress(): AchievementProgress[] {
    const progress: AchievementProgress[] = [];

    for (const achievement of ACHIEVEMENTS) {
      const current = this.getCurrentProgress(achievement);
      const required = achievement.requirement.value;
      const percentage = Math.min((current / required) * 100, 100);
      const unlocked = this.unlockedAchievements.has(achievement.id);

      progress.push({
        achievementId: achievement.id,
        current,
        required,
        percentage,
        unlocked,
      });
    }

    return progress;
  }

  /**
   * Get Current Progress for Achievement
   */
  private getCurrentProgress(achievement: Achievement): number {
    const { type } = achievement.requirement;

    switch (type) {
      case "sessions_completed":
        return this.statistics.totalSessions;
      case "successful_sessions":
        return this.statistics.successfulSessions;
      case "failed_sessions":
        return this.statistics.failedSessions;
      case "tools_used":
        return this.statistics.totalTools;
      case "unique_tools":
        return this.statistics.toolUsage.size;
      case "docker_containers":
        return this.statistics.dockerContainersManaged;
      case "services_restarted":
        return this.statistics.servicesRestarted;
      case "consecutive_days":
        return this.statistics.consecutiveDays;
      case "night_sessions":
        return this.statistics.lateNightSessions;
      case "fast_session":
        return this.statistics.fastSessions;
      case "long_session":
        return this.statistics.longSessions;
      default:
        return 0;
    }
  }

  /**
   * Get Unlocked Achievements
   */
  getUnlockedAchievements(): UnlockedAchievement[] {
    return Array.from(this.unlockedAchievements.values());
  }

  /**
   * Get Statistics
   */
  getStatistics(): UserStatistics {
    return this.statistics;
  }

  /**
   * Get Total Points
   */
  getTotalPoints(): number {
    let total = 0;
    for (const unlocked of this.unlockedAchievements.values()) {
      const achievement = getAchievementById(unlocked.achievementId);
      if (achievement) {
        total += achievement.points;
      }
    }
    return total;
  }
}

/**
 * Singleton Instance
 */
let achievementTracker: AchievementTracker | null = null;

/**
 * Get Achievement Tracker Instance
 */
export function getAchievementTracker(customDir?: string): AchievementTracker {
  if (!achievementTracker) {
    achievementTracker = new AchievementTracker(customDir);
  }
  return achievementTracker;
}

/**
 * Reset for Tests
 */
export function resetAchievementTracker(): void {
  achievementTracker = null;
}

