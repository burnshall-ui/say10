/**
 * History Storage System
 * 
 * JSON-basierte Session-Speicherung
 */

import { promises as fs } from "fs";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { homedir } from "os";
import type {
  ChatSession,
  HistoryQuery,
  HistoryStats,
  PatternMatch,
  MessageRecord,
  ToolCallRecord,
  SessionMetadata,
} from "./types.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("history-storage");

/**
 * History Storage Manager
 */
export class HistoryStorage {
  private historyDir: string;
  private sessionsDir: string;
  private currentSession: ChatSession | null = null;

  constructor(customDir?: string) {
    // Default: ~/.say10/history/
    this.historyDir = customDir || join(homedir(), ".say10", "history");
    this.sessionsDir = join(this.historyDir, "sessions");
  }

  /**
   * Initialisiert das Storage-System
   */
  async initialize(): Promise<void> {
    try {
      // Create directories if they don't exist
      if (!existsSync(this.historyDir)) {
        await fs.mkdir(this.historyDir, { recursive: true });
        logger.info({ dir: this.historyDir }, "History directory created");
      }

      if (!existsSync(this.sessionsDir)) {
        await fs.mkdir(this.sessionsDir, { recursive: true });
        logger.info({ dir: this.sessionsDir }, "Sessions directory created");
      }
    } catch (error) {
      logger.error({ error }, "Failed to initialize history storage");
      throw error;
    }
  }

  /**
   * Startet eine neue Session
   */
  startSession(sessionId?: string): ChatSession {
    const id = sessionId || this.generateSessionId();

    this.currentSession = {
      sessionId: id,
      startTime: new Date(),
      messages: [],
      toolsCalled: [],
      metadata: {
        tags: [],
        success: false,
      },
    };

    logger.info({ sessionId: id }, "New session started");
    return this.currentSession;
  }

  /**
   * Fügt eine Message zur aktuellen Session hinzu
   */
  addMessage(role: MessageRecord["role"], content: string, toolCalls?: ToolCallRecord[]): void {
    if (!this.currentSession) {
      throw new Error("No active session. Call startSession() first.");
    }

    const message: MessageRecord = {
      role,
      content,
      timestamp: new Date(),
      toolCalls,
    };

    this.currentSession.messages.push(message);

    if (toolCalls) {
      this.currentSession.toolsCalled.push(...toolCalls);
    }
  }

  /**
   * Fügt Tool Call zur aktuellen Session hinzu
   */
  addToolCall(tool: string, args: Record<string, unknown>, result: string, success: boolean, duration: number): void {
    if (!this.currentSession) {
      throw new Error("No active session. Call startSession() first.");
    }

    const toolCall: ToolCallRecord = {
      tool,
      args,
      result,
      success,
      timestamp: new Date(),
      duration,
    };

    this.currentSession.toolsCalled.push(toolCall);
  }

  /**
   * Updated Session Metadata
   */
  updateMetadata(metadata: Partial<SessionMetadata>): void {
    if (!this.currentSession) {
      throw new Error("No active session");
    }

    this.currentSession.metadata = {
      ...this.currentSession.metadata,
      ...metadata,
    };
  }

  /**
   * Beendet die aktuelle Session und speichert sie
   */
  async endSession(success: boolean = false): Promise<string | null> {
    if (!this.currentSession) {
      return null;
    }

    this.currentSession.endTime = new Date();
    this.currentSession.metadata.success = success;

    // Auto-generate tags
    this.currentSession.metadata.tags = this.generateTags(this.currentSession);

    // Save to disk
    await this.saveSession(this.currentSession);

    const sessionId = this.currentSession.sessionId;
    this.currentSession = null;

    logger.info({ sessionId, success }, "Session ended and saved");
    return sessionId;
  }

  /**
   * Speichert eine Session
   */
  private async saveSession(session: ChatSession): Promise<void> {
    const filename = `${session.sessionId}.json`;
    const filepath = join(this.sessionsDir, filename);

    try {
      // Ensure directory exists
      await fs.mkdir(dirname(filepath), { recursive: true });

      await fs.writeFile(filepath, JSON.stringify(session, null, 2), "utf-8");
      logger.debug({ sessionId: session.sessionId }, "Session saved");
    } catch (error) {
      logger.error({ error, sessionId: session.sessionId }, "Failed to save session");
      throw error;
    }
  }

  /**
   * Lädt eine Session
   */
  async loadSession(sessionId: string): Promise<ChatSession | null> {
    const filepath = join(this.sessionsDir, `${sessionId}.json`);

    try {
      if (!existsSync(filepath)) {
        return null;
      }

      const content = await fs.readFile(filepath, "utf-8");
      const session = JSON.parse(content) as ChatSession;

      // Convert date strings back to Date objects
      session.startTime = new Date(session.startTime);
      if (session.endTime) {
        session.endTime = new Date(session.endTime);
      }
      session.messages.forEach((m) => {
        m.timestamp = new Date(m.timestamp);
      });
      session.toolsCalled.forEach((t) => {
        t.timestamp = new Date(t.timestamp);
      });

      return session;
    } catch (error) {
      logger.error({ error, sessionId }, "Failed to load session");
      return null;
    }
  }

  /**
   * Listet alle Sessions
   */
  async listSessions(query?: HistoryQuery): Promise<ChatSession[]> {
    try {
      const files = await fs.readdir(this.sessionsDir);
      const sessions: ChatSession[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const sessionId = file.replace(".json", "");
        const session = await this.loadSession(sessionId);

        if (session) {
          // Apply filters
          if (query?.successOnly && !session.metadata.success) continue;
          if (query?.dateFrom && session.startTime < query.dateFrom) continue;
          if (query?.dateTo && session.startTime > query.dateTo) continue;
          if (query?.tags && !query.tags.some((tag) => session.metadata.tags.includes(tag))) continue;

          sessions.push(session);
        }
      }

      // Sort by date (newest first)
      sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      // Limit
      if (query?.limit) {
        return sessions.slice(0, query.limit);
      }

      return sessions;
    } catch (error) {
      logger.error({ error }, "Failed to list sessions");
      return [];
    }
  }

  /**
   * Sucht ähnliche Probleme in der History
   */
  async findSimilarProblems(problem: string, limit: number = 5): Promise<PatternMatch[]> {
    const sessions = await this.listSessions({ successOnly: true });
    const matches: PatternMatch[] = [];

    for (const session of sessions) {
      if (!session.metadata.problem) continue;

      // Simple similarity: count matching words
      const similarity = this.calculateSimilarity(problem, session.metadata.problem);

      if (similarity > 0.3) {
        // Minimum 30% similarity
        matches.push({
          sessionId: session.sessionId,
          similarity,
          problem: session.metadata.problem,
          solution: session.metadata.solution || "No solution recorded",
          timestamp: session.startTime,
          toolsUsed: session.toolsCalled.map((t) => t.tool),
        });
      }
    }

    // Sort by similarity (highest first)
    matches.sort((a, b) => b.similarity - a.similarity);

    return matches.slice(0, limit);
  }

  /**
   * Berechnet Ähnlichkeit zwischen zwei Strings (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);

    // Count matching words
    let matches = 0;
    for (const word of words1) {
      if (words2.includes(word)) {
        matches++;
      }
    }

    // Jaccard similarity
    const union = new Set([...words1, ...words2]).size;
    const intersection = matches;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Generiert automatisch Tags basierend auf Session-Inhalt
   */
  private generateTags(session: ChatSession): string[] {
    const tags = new Set<string>();

    // Tags from tool calls
    for (const tool of session.toolsCalled) {
      if (tool.tool.startsWith("docker_")) {
        tags.add("docker");
      } else if (tool.tool.includes("service")) {
        tags.add("services");
      } else if (tool.tool.includes("log")) {
        tags.add("logs");
      } else if (tool.tool.includes("network")) {
        tags.add("network");
      } else if (tool.tool.startsWith("check_")) {
        tags.add("monitoring");
      }
    }

    // Tags from messages (simple keyword detection)
    const allText = session.messages.map((m) => m.content.toLowerCase()).join(" ");

    if (allText.includes("nginx")) tags.add("nginx");
    if (allText.includes("apache")) tags.add("apache");
    if (allText.includes("postgres") || allText.includes("postgresql")) tags.add("postgres");
    if (allText.includes("mysql")) tags.add("mysql");
    if (allText.includes("redis")) tags.add("redis");
    if (allText.includes("error") || allText.includes("fehler")) tags.add("error");
    if (allText.includes("performance") || allText.includes("slow") || allText.includes("langsam"))
      tags.add("performance");
    if (allText.includes("memory") || allText.includes("ram")) tags.add("memory");
    if (allText.includes("disk") || allText.includes("space")) tags.add("disk");
    if (allText.includes("cpu")) tags.add("cpu");

    return Array.from(tags);
  }

  /**
   * Generiert Session ID (Zeitstempel-basiert)
   */
  private generateSessionId(): string {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now
      .toTimeString()
      .split(" ")[0]
      .replace(/:/g, "-"); // HH-MM-SS
    return `${dateStr}-${timeStr}`;
  }

  /**
   * Berechnet History-Statistiken
   */
  async getStats(): Promise<HistoryStats> {
    const sessions = await this.listSessions();

    const successful = sessions.filter((s) => s.metadata.success);
    const failed = sessions.filter((s) => !s.metadata.success);

    // Tool usage count
    const toolCounts = new Map<string, number>();
    for (const session of sessions) {
      for (const tool of session.toolsCalled) {
        toolCounts.set(tool.tool, (toolCounts.get(tool.tool) || 0) + 1);
      }
    }

    const mostUsedTools = Array.from(toolCounts.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Problem frequency
    const problemCounts = new Map<string, number>();
    for (const session of sessions) {
      if (session.metadata.problem) {
        problemCounts.set(session.metadata.problem, (problemCounts.get(session.metadata.problem) || 0) + 1);
      }
    }

    const commonProblems = Array.from(problemCounts.entries())
      .map(([problem, count]) => ({ problem, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Average duration
    let totalDuration = 0;
    let validSessions = 0;
    for (const session of sessions) {
      if (session.endTime) {
        totalDuration += session.endTime.getTime() - session.startTime.getTime();
        validSessions++;
      }
    }

    const averageSessionDuration = validSessions > 0 ? totalDuration / validSessions / 1000 / 60 : 0; // in minutes

    return {
      totalSessions: sessions.length,
      successfulSessions: successful.length,
      failedSessions: failed.length,
      mostUsedTools,
      commonProblems,
      averageSessionDuration,
    };
  }

  /**
   * Löscht alte Sessions (älter als X Tage)
   */
  async cleanupOldSessions(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const sessions = await this.listSessions();
    let deleted = 0;

    for (const session of sessions) {
      if (session.startTime < cutoffDate) {
        const filepath = join(this.sessionsDir, `${session.sessionId}.json`);
        try {
          await fs.unlink(filepath);
          deleted++;
        } catch (error) {
          logger.error({ error, sessionId: session.sessionId }, "Failed to delete session");
        }
      }
    }

    logger.info({ deleted, daysToKeep }, "Old sessions cleaned up");
    return deleted;
  }

  /**
   * Gibt die aktuelle Session zurück
   */
  getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }
}

/**
 * Singleton Instance
 */
let historyStorage: HistoryStorage | null = null;

/**
 * Gibt die globale History Storage Instance zurück
 */
export function getHistoryStorage(customDir?: string): HistoryStorage {
  if (!historyStorage) {
    historyStorage = new HistoryStorage(customDir);
  }
  return historyStorage;
}

/**
 * Reset für Tests
 */
export function resetHistoryStorage(): void {
  historyStorage = null;
}

