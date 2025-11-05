/**
 * History System Types
 * 
 * Type Definitions für Session Recording & Replay
 */

/**
 * Tool Call Record
 */
export interface ToolCallRecord {
  tool: string;
  args: Record<string, unknown>;
  result: string;
  success: boolean;
  timestamp: Date;
  duration: number; // in ms
}

/**
 * Chat Message Record
 */
export interface MessageRecord {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallRecord[];
}

/**
 * Session Metadata
 */
export interface SessionMetadata {
  problem?: string;          // Extracted problem description
  solution?: string;         // Extracted solution
  tags: string[];            // Auto-generated tags
  success: boolean;          // Did it solve the problem?
  userRating?: number;       // Optional user rating (1-5)
}

/**
 * Chat Session
 */
export interface ChatSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  messages: MessageRecord[];
  toolsCalled: ToolCallRecord[];
  metadata: SessionMetadata;
}

/**
 * Pattern Recognition Result
 */
export interface PatternMatch {
  sessionId: string;
  similarity: number;        // 0-1, how similar to current issue
  problem: string;
  solution: string;
  timestamp: Date;
  toolsUsed: string[];
}

/**
 * History Query
 */
export interface HistoryQuery {
  problem?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  successOnly?: boolean;
  limit?: number;
}

/**
 * History Statistics
 */
export interface HistoryStats {
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  mostUsedTools: Array<{ tool: string; count: number }>;
  commonProblems: Array<{ problem: string; count: number }>;
  averageSessionDuration: number; // in minutes
}

