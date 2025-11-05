/**
 * Achievement System Types
 */

/**
 * Achievement Rarity
 */
export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/**
 * Achievement Category
 */
export type AchievementCategory = "tools" | "sessions" | "docker" | "security" | "performance" | "special";

/**
 * Achievement Definition
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  points: number;
  requirement: {
    type: string;
    value: number;
    metric?: string;
  };
}

/**
 * Unlocked Achievement Record
 */
export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: Date;
  progress: number;
}

/**
 * Achievement Progress
 */
export interface AchievementProgress {
  achievementId: string;
  current: number;
  required: number;
  percentage: number;
  unlocked: boolean;
}

/**
 * User Statistics (for achievement tracking)
 */
export interface UserStatistics {
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  totalTools: number;
  toolUsage: Map<string, number>;
  dockerContainersManaged: number;
  servicesRestarted: number;
  errorsFixed: number;
  lateNightSessions: number; // 00:00 - 06:00
  fastSessions: number; // < 1 minute
  longSessions: number; // > 30 minutes
  consecutiveDays: number;
  firstSessionDate?: Date;
  lastSessionDate?: Date;
}

