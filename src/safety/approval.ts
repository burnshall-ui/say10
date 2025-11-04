/**
 * Approval System
 * 
 * Verwaltet Approvals für destructive und sudo Commands
 */

import type { ApprovalRequest, ApprovalResponse } from "../types.js";
import { isWhitelisted, isReadOnly } from "./whitelist.js";

/**
 * Destructive Commands die immer Approval brauchen
 */
const DESTRUCTIVE_COMMANDS = [
  "rm",
  "rmdir",
  "dd",
  "mkfs",
  "fdisk",
  "parted",
  "systemctl restart",
  "systemctl stop",
  "systemctl start",
  "systemctl reload",
  "systemctl enable",
  "systemctl disable",
  "shutdown",
  "reboot",
  "poweroff",
  "halt",
  "kill",
  "killall",
  "pkill",
  "apt-get remove",
  "apt remove",
  "apt-get purge",
  "apt purge",
  "apt-get autoremove",
  "apt autoremove",
  "dpkg -r",
  "dpkg --remove",
  "dpkg --purge",
  "userdel",
  "groupdel",
  "chmod",
  "chown",
  "iptables",
  "ufw",
  "mv /",
  "cp /",
];

/**
 * Approval Handler Funktion
 * Wird vom CLI implementiert um User um Erlaubnis zu fragen
 */
type ApprovalHandler = (request: ApprovalRequest) => Promise<ApprovalResponse>;

let approvalHandler: ApprovalHandler | null = null;

/**
 * Registriert den Approval Handler (wird vom CLI gesetzt)
 */
export function setApprovalHandler(handler: ApprovalHandler): void {
  approvalHandler = handler;
}

/**
 * Prüft ob ein Command Approval braucht
 */
export async function needsApproval(command: string): Promise<boolean> {
  const cmd = command.trim();
  
  // Whitelisted Commands brauchen keine Approval
  if (await isWhitelisted(cmd)) {
    return false;
  }
  
  // Read-only Commands brauchen keine Approval
  if (isReadOnly(cmd)) {
    return false;
  }
  
  // Alles andere braucht Approval
  return true;
}

/**
 * Erkennt ob ein Command sudo benötigt
 */
export function requiresSudo(command: string): boolean {
  const cmd = command.trim().toLowerCase();
  
  return (
    cmd.startsWith("sudo ") ||
    cmd.includes("systemctl restart") ||
    cmd.includes("systemctl stop") ||
    cmd.includes("systemctl start") ||
    cmd.includes("systemctl enable") ||
    cmd.includes("systemctl disable") ||
    cmd.includes("systemctl reload") ||
    cmd.includes("apt-get") ||
    cmd.includes("apt ") ||
    cmd.includes("dpkg") ||
    cmd.includes("service ")
  );
}

/**
 * Erkennt ob ein Command destructive ist
 */
export function isDestructive(command: string): boolean {
  const cmd = command.trim().toLowerCase();
  
  for (const destructive of DESTRUCTIVE_COMMANDS) {
    if (cmd.includes(destructive)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Ermittelt den Grund warum Approval benötigt wird
 */
export function getApprovalReason(command: string): string {
  const reasons: string[] = [];
  
  if (requiresSudo(command)) {
    reasons.push("Erfordert sudo/root");
  }
  
  if (isDestructive(command)) {
    reasons.push("Destructive Action");
  }
  
  if (reasons.length === 0) {
    reasons.push("Nicht whitelisted");
  }
  
  return reasons.join(", ");
}

/**
 * Fordert Approval für einen Command an
 */
export async function requestApproval(command: string): Promise<ApprovalResponse> {
  if (!approvalHandler) {
    throw new Error("Kein Approval Handler registriert! CLI muss setApprovalHandler() aufrufen.");
  }
  
  const request: ApprovalRequest = {
    command,
    reason: getApprovalReason(command),
    destructive: isDestructive(command),
    requiresSudo: requiresSudo(command),
  };
  
  return await approvalHandler(request);
}

/**
 * Wrapper für Command Execution mit Approval Check
 */
export async function executeWithApproval<T>(
  command: string,
  executor: () => Promise<T>
): Promise<T> {
  const needs = await needsApproval(command);
  
  if (needs) {
    const approval = await requestApproval(command);
    
    if (!approval.approved) {
      throw new Error("Command wurde vom User abgelehnt");
    }
  }
  
  return await executor();
}

/**
 * Validiert einen Command bevor er ausgeführt wird
 */
export async function validateCommand(command: string): Promise<{
  safe: boolean;
  needsApproval: boolean;
  reason: string;
}> {
  const needs = await needsApproval(command);
  const whitelisted = await isWhitelisted(command);
  const readOnly = isReadOnly(command);
  
  return {
    safe: whitelisted || readOnly,
    needsApproval: needs,
    reason: needs ? getApprovalReason(command) : "Whitelisted/Read-only",
  };
}

