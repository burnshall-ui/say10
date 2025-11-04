/**
 * Type Definitions für AI Server Admin MCP
 */

export interface SystemStatus {
  cpu: {
    load: number[];
    usage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
}

export interface ServiceInfo {
  name: string;
  status: string;
  active: boolean;
  enabled: boolean;
  description?: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
}

export interface ApprovalRequest {
  command: string;
  reason: string;
  destructive: boolean;
  requiresSudo: boolean;
}

export interface ApprovalResponse {
  approved: boolean;
  timestamp: Date;
}

export interface WhitelistConfig {
  commands: string[];
  patterns: string[];
}

