/**
 * Achievement Definitions
 * 
 * All available achievements
 */

import type { Achievement } from "./types.js";

/**
 * All Achievements
 */
export const ACHIEVEMENTS: Achievement[] = [
  // Beginner Achievements
  {
    id: "first_blood",
    name: "First Blood",
    description: "Deine erste Session abgeschlossen",
    category: "sessions",
    rarity: "common",
    icon: "[*]",
    points: 10,
    requirement: {
      type: "sessions_completed",
      value: 1,
    },
  },
  {
    id: "first_tool",
    name: "Tool Master Beginner",
    description: "Erstes Tool erfolgreich benutzt",
    category: "tools",
    rarity: "common",
    icon: "[T]",
    points: 10,
    requirement: {
      type: "tools_used",
      value: 1,
    },
  },

  // Tool Usage Achievements
  {
    id: "tool_enthusiast",
    name: "Tool Enthusiast",
    description: "10 verschiedene Tools benutzt",
    category: "tools",
    rarity: "uncommon",
    icon: "[TT]",
    points: 25,
    requirement: {
      type: "unique_tools",
      value: 10,
    },
  },
  {
    id: "tool_master",
    name: "Tool Master",
    description: "Alle verfuegbaren Tools mindestens einmal benutzt",
    category: "tools",
    rarity: "rare",
    icon: "[TTT]",
    points: 50,
    requirement: {
      type: "all_tools_used",
      value: 1,
    },
  },
  {
    id: "tool_spammer",
    name: "Tool Spammer",
    description: "100 Tools in einer Session benutzt",
    category: "tools",
    rarity: "rare",
    icon: "[!!!]",
    points: 50,
    requirement: {
      type: "tools_per_session",
      value: 100,
    },
  },

  // Session Achievements
  {
    id: "problem_solver",
    name: "Problem Solver",
    description: "10 erfolgreiche Sessions abgeschlossen",
    category: "sessions",
    rarity: "uncommon",
    icon: "[OK]",
    points: 30,
    requirement: {
      type: "successful_sessions",
      value: 10,
    },
  },
  {
    id: "veteran",
    name: "Veteran",
    description: "50 Sessions abgeschlossen",
    category: "sessions",
    rarity: "rare",
    icon: "[VET]",
    points: 75,
    requirement: {
      type: "sessions_completed",
      value: 50,
    },
  },
  {
    id: "legend",
    name: "Legend",
    description: "100 Sessions abgeschlossen",
    category: "sessions",
    rarity: "epic",
    icon: "[LEG]",
    points: 150,
    requirement: {
      type: "sessions_completed",
      value: 100,
    },
  },

  // Docker Achievements
  {
    id: "docker_newbie",
    name: "Docker Newbie",
    description: "Ersten Docker Container verwaltet",
    category: "docker",
    rarity: "common",
    icon: "[D]",
    points: 15,
    requirement: {
      type: "docker_containers",
      value: 1,
    },
  },
  {
    id: "docker_captain",
    name: "Docker Captain",
    description: "10 Docker Container verwaltet",
    category: "docker",
    rarity: "uncommon",
    icon: "[DD]",
    points: 35,
    requirement: {
      type: "docker_containers",
      value: 10,
    },
  },
  {
    id: "docker_admiral",
    name: "Docker Admiral",
    description: "50 Docker Container verwaltet",
    category: "docker",
    rarity: "rare",
    icon: "[DDD]",
    points: 60,
    requirement: {
      type: "docker_containers",
      value: 50,
    },
  },

  // Service Management Achievements
  {
    id: "restart_master",
    name: "Restart Master",
    description: "10 Services neugestartet (turn it off and on again)",
    category: "tools",
    rarity: "uncommon",
    icon: "[R]",
    points: 25,
    requirement: {
      type: "services_restarted",
      value: 10,
    },
  },
  {
    id: "firefighter",
    name: "Firefighter",
    description: "50 Errors gefixt",
    category: "performance",
    rarity: "rare",
    icon: "[FF]",
    points: 80,
    requirement: {
      type: "errors_fixed",
      value: 50,
    },
  },

  // Time-based Achievements
  {
    id: "night_owl",
    name: "Night Owl",
    description: "10 Sessions zwischen 00:00 und 06:00 Uhr",
    category: "special",
    rarity: "uncommon",
    icon: "[OWL]",
    points: 40,
    requirement: {
      type: "night_sessions",
      value: 10,
    },
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Problem in unter 1 Minute geloest",
    category: "performance",
    rarity: "rare",
    icon: "[!!!]",
    points: 50,
    requirement: {
      type: "fast_session",
      value: 1,
    },
  },
  {
    id: "marathon_runner",
    name: "Marathon Runner",
    description: "Session laenger als 30 Minuten",
    category: "special",
    rarity: "uncommon",
    icon: "[RUN]",
    points: 30,
    requirement: {
      type: "long_session",
      value: 1,
    },
  },
  {
    id: "consistent",
    name: "Consistent",
    description: "7 Tage in Folge aktiv",
    category: "sessions",
    rarity: "rare",
    icon: "[7D]",
    points: 70,
    requirement: {
      type: "consecutive_days",
      value: 7,
    },
  },

  // Security Achievements
  {
    id: "security_conscious",
    name: "Security Conscious",
    description: "10 mal Approval abgelehnt (safety first!)",
    category: "security",
    rarity: "uncommon",
    icon: "[SEC]",
    points: 35,
    requirement: {
      type: "approvals_denied",
      value: 10,
    },
  },
  {
    id: "rtfm",
    name: "RTFM",
    description: "10x --help aufgerufen",
    category: "special",
    rarity: "common",
    icon: "[?]",
    points: 15,
    requirement: {
      type: "help_called",
      value: 10,
    },
  },

  // Special/Fun Achievements
  {
    id: "oops",
    name: "Oops...",
    description: "5 Sessions ohne Erfolg beendet",
    category: "special",
    rarity: "uncommon",
    icon: "[X_X]",
    points: 20,
    requirement: {
      type: "failed_sessions",
      value: 5,
    },
  },
  {
    id: "perfectionist",
    name: "Perfectionist",
    description: "10 Sessions in Folge erfolgreich",
    category: "sessions",
    rarity: "epic",
    icon: "[***]",
    points: 100,
    requirement: {
      type: "consecutive_successes",
      value: 10,
    },
  },
  {
    id: "disaster_recovery",
    name: "Disaster Recovery",
    description: "System from 95%+ disk/memory gerettet",
    category: "performance",
    rarity: "epic",
    icon: "[!!!]",
    points: 120,
    requirement: {
      type: "disaster_recovery",
      value: 1,
    },
  },
  {
    id: "history_buff",
    name: "History Buff",
    description: "10x History-Tools benutzt",
    category: "tools",
    rarity: "uncommon",
    icon: "[HIS]",
    points: 30,
    requirement: {
      type: "history_tools_used",
      value: 10,
    },
  },
  {
    id: "storyteller",
    name: "Storyteller",
    description: "10 Session Stories generiert",
    category: "special",
    rarity: "rare",
    icon: "[BOOK]",
    points: 55,
    requirement: {
      type: "stories_generated",
      value: 10,
    },
  },

  // Legendary Achievements
  {
    id: "sysadmin_god",
    name: "Sysadmin God",
    description: "1000 Tools erfolgreich ausgefuehrt",
    category: "tools",
    rarity: "legendary",
    icon: "[GOD]",
    points: 500,
    requirement: {
      type: "tools_used",
      value: 1000,
    },
  },
  {
    id: "immortal",
    name: "Immortal",
    description: "365 Tage say10 benutzt",
    category: "sessions",
    rarity: "legendary",
    icon: "[INF]",
    points: 1000,
    requirement: {
      type: "days_active",
      value: 365,
    },
  },
];

/**
 * Get Achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Get Achievements by Category
 */
export function getAchievementsByCategory(category: string): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * Get Achievements by Rarity
 */
export function getAchievementsByRarity(rarity: string): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.rarity === rarity);
}

