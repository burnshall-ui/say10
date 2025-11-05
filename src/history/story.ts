/**
 * Story Generator
 * 
 * Generiert narrative Beschreibungen aus Log-Events und History
 */

import type { ChatSession, MessageRecord, ToolCallRecord } from "./types.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("story-generator");

/**
 * Timeline Event
 */
export interface TimelineEvent {
  timestamp: Date;
  type: "message" | "tool" | "error" | "warning" | "success";
  title: string;
  description: string;
  severity: "info" | "warning" | "error" | "success";
}

/**
 * Story Chapter
 */
export interface StoryChapter {
  number: number;
  title: string;
  timestamp: Date;
  content: string;
  events: TimelineEvent[];
}

/**
 * Generated Story
 */
export interface Story {
  title: string;
  summary: string;
  chapters: StoryChapter[];
  timeline: TimelineEvent[];
  statistics: {
    duration: string;
    messagesCount: number;
    toolsCount: number;
    errorsCount: number;
  };
  recommendations: string[];
}

/**
 * Story Generator Class
 */
export class StoryGenerator {
  /**
   * Generiert eine Story aus einer Chat-Session
   */
  generateStory(session: ChatSession): Story {
    const timeline = this.buildTimeline(session);
    const chapters = this.buildChapters(session, timeline);
    const stats = this.calculateStatistics(session);
    const recommendations = this.generateRecommendations(session);

    // Generate title from problem or first user message
    const title = session.metadata.problem || this.extractTitle(session);

    // Generate summary
    const summary = this.generateSummary(session, stats);

    return {
      title,
      summary,
      chapters,
      timeline,
      statistics: stats,
      recommendations,
    };
  }

  /**
   * Baut Timeline aus Session-Events
   */
  private buildTimeline(session: ChatSession): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Add message events
    for (const message of session.messages) {
      if (message.role === "user") {
        events.push({
          timestamp: message.timestamp,
          type: "message",
          title: "User Message",
          description: this.truncate(message.content, 100),
          severity: "info",
        });
      } else if (message.role === "assistant") {
        events.push({
          timestamp: message.timestamp,
          type: "message",
          title: "Assistant Response",
          description: this.truncate(message.content, 100),
          severity: "info",
        });
      }
    }

    // Add tool events
    for (const tool of session.toolsCalled) {
      const severity = tool.success ? "success" : "error";
      events.push({
        timestamp: tool.timestamp,
        type: tool.success ? "tool" : "error",
        title: `Tool: ${tool.tool}`,
        description: tool.success
          ? `Executed successfully in ${tool.duration}ms`
          : `Failed: ${this.truncate(tool.result, 80)}`,
        severity,
      });
    }

    // Sort by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return events;
  }

  /**
   * Baut Story-Kapitel
   */
  private buildChapters(session: ChatSession, timeline: TimelineEvent[]): StoryChapter[] {
    const chapters: StoryChapter[] = [];

    // Chapter 1: Der Beginn
    const firstUserMessage = session.messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      chapters.push({
        number: 1,
        title: "Der Beginn",
        timestamp: firstUserMessage.timestamp,
        content: this.generateChapter1Content(session, firstUserMessage),
        events: timeline.filter(
          (e) =>
            e.timestamp.getTime() >= firstUserMessage.timestamp.getTime() &&
            e.timestamp.getTime() <= firstUserMessage.timestamp.getTime() + 60000 // First minute
        ),
      });
    }

    // Chapter 2: Die Analyse (Tool Calls)
    const firstToolCall = session.toolsCalled[0];
    if (firstToolCall) {
      chapters.push({
        number: 2,
        title: "Die Analyse",
        timestamp: firstToolCall.timestamp,
        content: this.generateChapter2Content(session),
        events: timeline.filter((e) => e.type === "tool" || e.type === "error"),
      });
    }

    // Chapter 3: Das Ergebnis
    const lastMessage = session.messages[session.messages.length - 1];
    if (lastMessage) {
      chapters.push({
        number: 3,
        title: session.metadata.success ? "Happy End" : "Zu Bearbeiten",
        timestamp: lastMessage.timestamp,
        content: this.generateChapter3Content(session),
        events: timeline.slice(-3), // Last 3 events
      });
    }

    return chapters;
  }

  /**
   * Generiert Content für Kapitel 1
   */
  private generateChapter1Content(session: ChatSession, firstMessage: MessageRecord): string {
    const time = this.formatTime(firstMessage.timestamp);
    let content = `Es war ${time}, als der User eine Frage stellte:\n\n`;
    content += `"${this.truncate(firstMessage.content, 200)}"\n\n`;

    if (session.metadata.problem) {
      content += `Das Problem war klar: ${session.metadata.problem}\n`;
    }

    return content;
  }

  /**
   * Generiert Content für Kapitel 2
   */
  private generateChapter2Content(session: ChatSession): string {
    let content = "Um das Problem zu lösen, wurden folgende Schritte durchgeführt:\n\n";

    const toolGroups = new Map<string, number>();
    for (const tool of session.toolsCalled) {
      toolGroups.set(tool.tool, (toolGroups.get(tool.tool) || 0) + 1);
    }

    let stepNumber = 1;
    for (const [tool, count] of toolGroups) {
      const toolName = this.formatToolName(tool);
      content += `${stepNumber}. ${toolName}`;
      if (count > 1) {
        content += ` (${count}x)`;
      }
      content += "\n";
      stepNumber++;
    }

    content += "\n";

    // Check for errors
    const errors = session.toolsCalled.filter((t) => !t.success);
    if (errors.length > 0) {
      content += `⚠️ Dabei traten ${errors.length} Fehler auf:\n`;
      for (const error of errors.slice(0, 3)) {
        content += `- ${this.formatToolName(error.tool)}: ${this.truncate(error.result, 80)}\n`;
      }
      content += "\n";
    }

    return content;
  }

  /**
   * Generiert Content für Kapitel 3
   */
  private generateChapter3Content(session: ChatSession): string {
    let content = "";

    if (session.metadata.success) {
      content += "🎉 Das Problem wurde erfolgreich gelöst!\n\n";

      if (session.metadata.solution) {
        content += `Lösung: ${session.metadata.solution}\n\n`;
      }

      const duration = session.endTime
        ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
        : 0;
      if (duration > 0) {
        content += `Die Lösung dauerte ${this.formatDuration(duration)}.\n`;
      }
    } else {
      content += "⏸️ Die Session wurde beendet, aber das Problem ist noch nicht vollständig gelöst.\n\n";

      // Suggest next steps
      const lastTool = session.toolsCalled[session.toolsCalled.length - 1];
      if (lastTool && !lastTool.success) {
        content += `Letzter Schritt war ${this.formatToolName(lastTool.tool)}, der fehlschlug.\n`;
        content += `Mögliche nächste Schritte:\n`;
        content += `- Überprüfe die Parameter\n`;
        content += `- Prüfe die Logs für weitere Details\n`;
        content += `- Versuche eine alternative Lösung\n`;
      }
    }

    return content;
  }

  /**
   * Berechnet Statistiken
   */
  private calculateStatistics(session: ChatSession) {
    const duration = session.endTime
      ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
      : 0;

    const errors = session.toolsCalled.filter((t) => !t.success).length;

    return {
      duration: this.formatDuration(duration),
      messagesCount: session.messages.filter((m) => m.role === "user" || m.role === "assistant").length,
      toolsCount: session.toolsCalled.length,
      errorsCount: errors,
    };
  }

  /**
   * Generiert Empfehlungen
   */
  private generateRecommendations(session: ChatSession): string[] {
    const recommendations: string[] = [];

    // Check for repeated tool calls (might indicate a problem)
    const toolCounts = new Map<string, number>();
    for (const tool of session.toolsCalled) {
      toolCounts.set(tool.tool, (toolCounts.get(tool.tool) || 0) + 1);
    }

    for (const [tool, count] of toolCounts) {
      if (count > 5) {
        recommendations.push(
          `${this.formatToolName(tool)} wurde ${count}x aufgerufen. Gibt es ein zugrunde liegendes Problem?`
        );
      }
    }

    // Check for errors
    const errors = session.toolsCalled.filter((t) => !t.success);
    if (errors.length > 0) {
      const errorTools = [...new Set(errors.map((e) => this.formatToolName(e.tool)))];
      recommendations.push(`Fehler bei: ${errorTools.join(", ")}. Prüfe die Permissions und Parameter.`);
    }

    // Check session duration
    if (session.endTime) {
      const duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
      if (duration > 600) {
        // > 10 minutes
        recommendations.push("Session dauerte länger als 10 Minuten. Könnte automatisiert werden?");
      }
    }

    // Generic recommendations if none
    if (recommendations.length === 0 && session.metadata.success) {
      recommendations.push("Gut gemacht! Die Session verlief reibungslos.");
    } else if (recommendations.length === 0) {
      recommendations.push("Keine spezifischen Empfehlungen. Prüfe die Timeline für Details.");
    }

    return recommendations;
  }

  /**
   * Extrahiert Titel aus erster User-Message
   */
  private extractTitle(session: ChatSession): string {
    const firstUser = session.messages.find((m) => m.role === "user");
    if (firstUser) {
      // Take first sentence or first 50 chars
      const content = firstUser.content;
      const firstSentence = content.split(/[.!?]/)[0];
      return this.truncate(firstSentence, 50);
    }
    return `Session ${session.sessionId.substring(0, 10)}`;
  }

  /**
   * Generiert Summary
   */
  private generateSummary(session: ChatSession, stats: Story["statistics"]): string {
    let summary = `Session mit ${stats.messagesCount} Nachrichten und ${stats.toolsCount} Tool-Aufrufen`;

    if (session.metadata.success) {
      summary += ". Problem erfolgreich gelöst";
    } else {
      summary += ". Noch offen";
    }

    if (stats.duration !== "N/A") {
      summary += ` (Dauer: ${stats.duration})`;
    }

    if (stats.errorsCount > 0) {
      summary += `. ${stats.errorsCount} Fehler aufgetreten`;
    }

    summary += ".";

    return summary;
  }

  /**
   * Formatiert Tool-Namen für bessere Lesbarkeit
   */
  private formatToolName(tool: string): string {
    // Convert snake_case to Title Case
    return tool
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Formatiert Zeit
   */
  private formatTime(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    const time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

    // Add human-readable time
    if (hours < 6) {
      return `${time} Uhr nachts`;
    } else if (hours < 12) {
      return `${time} Uhr morgens`;
    } else if (hours < 18) {
      return `${time} Uhr nachmittags`;
    } else {
      return `${time} Uhr abends`;
    }
  }

  /**
   * Formatiert Duration
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} Sekunden`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${minutes} Minuten ${secs} Sekunden` : `${minutes} Minuten`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours} Stunden ${minutes} Minuten` : `${hours} Stunden`;
    }
  }

  /**
   * Truncates text
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + "...";
  }

  /**
   * Formatiert Story als Text
   */
  formatStoryAsText(story: Story): string {
    let output = "";

    // Title and Summary
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `📖 Story: "${story.title}"\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    output += `${story.summary}\n\n`;

    // Statistics
    output += `📊 Statistik:\n`;
    output += `   • Dauer: ${story.statistics.duration}\n`;
    output += `   • Nachrichten: ${story.statistics.messagesCount}\n`;
    output += `   • Tools: ${story.statistics.toolsCount}\n`;
    output += `   • Fehler: ${story.statistics.errorsCount}\n\n`;

    // Chapters
    for (const chapter of story.chapters) {
      output += `━━━ Kapitel ${chapter.number}: ${chapter.title} ━━━\n`;
      output += `${this.formatTime(chapter.timestamp)}\n\n`;
      output += `${chapter.content}\n\n`;
    }

    // Recommendations
    if (story.recommendations.length > 0) {
      output += `💡 Empfehlungen:\n`;
      for (const rec of story.recommendations) {
        output += `   • ${rec}\n`;
      }
      output += "\n";
    }

    return output;
  }

  /**
   * Formatiert Timeline als Text
   */
  formatTimelineAsText(timeline: TimelineEvent[]): string {
    let output = "";

    output += `📅 Timeline\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const event of timeline) {
      const time = event.timestamp.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const icon = this.getEventIcon(event.severity);
      output += `${time} ${icon} ${event.title}\n`;
      output += `          ${event.description}\n\n`;
    }

    return output;
  }

  /**
   * Icon für Event-Severity
   */
  private getEventIcon(severity: TimelineEvent["severity"]): string {
    switch (severity) {
      case "success":
        return "✓";
      case "error":
        return "✗";
      case "warning":
        return "⚠";
      default:
        return "•";
    }
  }
}

/**
 * Singleton Instance
 */
let storyGenerator: StoryGenerator | null = null;

/**
 * Gibt Story Generator Instanz zurück
 */
export function getStoryGenerator(): StoryGenerator {
  if (!storyGenerator) {
    storyGenerator = new StoryGenerator();
  }
  return storyGenerator;
}

