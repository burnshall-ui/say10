/**
 * Python Coding Tools
 *
 * Ermöglichen das Erstellen, Ausführen und Warten kleiner Python-Skripte
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from "fs";
import { mkdir } from "fs/promises";
import { join } from "path";
import { execa } from "execa";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("python-tools");

const DEFAULT_WORKDIR = join(process.cwd(), "python_workspace");

/**
 * Registriert die Python Tools
 */
export function getPythonTools(): Tool[] {
  return [
    {
      name: "python_init_workspace",
      description: "Initialisiert einen isolierten Python Workspace mit virtualenv.",
      inputSchema: {
        type: "object",
        properties: {
          workspace: {
            type: "string",
            description: "Optionaler Workspace-Pfad (relativ).",
          },
          python: {
            type: "string",
            description: "Python Interpreter (default: python3)",
          },
        },
      },
    },
    {
      name: "python_create_script",
      description: "Erstellt oder überschreibt ein Python Script im Workspace.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Dateiname (z.B. hello.py)",
          },
          content: {
            type: "string",
            description: "Python Code-Inhalt",
          },
          workspace: {
            type: "string",
            description: "Workspace Pfad (optional)",
          },
        },
        required: ["name", "content"],
      },
    },
    {
      name: "python_run_script",
      description: "Führt ein Python Script im Workspace inklusive virtueller Umgebung aus.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Dateiname des Scripts",
          },
          args: {
            type: "array",
            description: "Argumente für das Script",
            items: {
              type: "string",
            },
          },
          workspace: {
            type: "string",
            description: "Workspace Pfad (optional)",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "python_install_package",
      description: "Installiert ein Python Paket in der Workspace-virtualenv mittels pip.",
      inputSchema: {
        type: "object",
        properties: {
          package: {
            type: "string",
            description: "Paketname, optional mit Version",
          },
          workspace: {
            type: "string",
            description: "Workspace Pfad (optional)",
          },
        },
        required: ["package"],
      },
    },
    {
      name: "python_format_script",
      description: "Formatiert ein Python Script mit black (falls installiert).",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Dateiname des Scripts",
          },
          workspace: {
            type: "string",
            description: "Workspace Pfad (optional)",
          },
        },
        required: ["name"],
      },
    },
  ];
}

export async function handlePythonTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  switch (name) {
    case "python_init_workspace":
      return initWorkspace(args);
    case "python_create_script":
      return createScript(args);
    case "python_run_script":
      return runScript(args);
    case "python_install_package":
      return installPackage(args);
    case "python_format_script":
      return formatScript(args);
    default:
      throw new Error(`Unbekanntes Python Tool: ${name}`);
  }
}

function resolveWorkspace(workspace?: string): string {
  if (workspace) {
    return join(DEFAULT_WORKDIR, sanitizeWorkspaceSegment(workspace));
  }
  return DEFAULT_WORKDIR;
}

function sanitizeWorkspaceSegment(segment: string): string {
  const trimmed = segment.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.includes("/")) {
    throw new Error("Ungültiger Workspace-Name");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new Error("Workspace-Name darf nur a-z, 0-9, -, _ enthalten");
  }
  return trimmed;
}

async function ensureWorkspaceDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function initWorkspace(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const workspace = resolveWorkspace(args.workspace as string | undefined);
  const python = (args.python as string | undefined) ?? "python3";
  const venvPath = join(workspace, "venv");

  await ensureWorkspaceDir(workspace);

  try {
    await execa(python, ["-m", "venv", "venv"], {
      cwd: workspace,
    });
  } catch (error) {
    logger.error({ error }, "Failed to create virtualenv");
    throw new Error(`Fehler beim Erstellen der virtuellen Umgebung: ${error}`);
  }

  return {
    content: [
      {
        type: "text",
        text: `Workspace initialisiert:\n- Pfad: ${workspace}\n- Virtualenv: ${venvPath}\n- Interpreter: ${python}`,
      },
    ],
  };
}

async function createScript(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const name = String(args.name);
  const content = String(args.content);
  const workspace = resolveWorkspace(args.workspace as string | undefined);

  await ensureWorkspaceDir(workspace);
  const scriptPath = join(workspace, sanitizeFileName(name));

  await fs.writeFile(scriptPath, content, "utf-8");

  return {
    content: [
      {
        type: "text",
        text: `Script gespeichert:\n- Pfad: ${scriptPath}\n- Größe: ${Buffer.byteLength(content)} Bytes`,
      },
    ],
  };
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed.endsWith(".py")) {
    throw new Error("Script-Datei muss auf .py enden");
  }
  if (/[^a-zA-Z0-9._-]/.test(trimmed)) {
    throw new Error("Ungültiger Dateiname");
  }
  return trimmed;
}

async function runScript(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const name = sanitizeFileName(String(args.name));
  const workspace = resolveWorkspace(args.workspace as string | undefined);
  const scriptPath = join(workspace, name);
  const argsList = Array.isArray(args.args) ? args.args.map(String) : [];
  const pythonExec = join(workspace, "venv", "bin", "python");

  await ensureWorkspaceDir(workspace);
  await assertFileExists(scriptPath);

  const result = await runWithVirtualenv(pythonExec, [scriptPath, ...argsList], workspace);

  const output = [
    `Script: ${scriptPath}`,
    `Exit Code: ${result.exitCode}`,
    result.stdout ? `STDOUT:\n${result.stdout}` : "STDOUT: (leer)",
    result.stderr ? `STDERR:\n${result.stderr}` : "STDERR: (leer)",
  ].join("\n\n");

  return {
    content: [{ type: "text", text: output }],
  };
}

async function installPackage(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const workspace = resolveWorkspace(args.workspace as string | undefined);
  const packageName = String(args.package);
  const pipExec = join(workspace, "venv", "bin", "pip");

  const result = await runWithVirtualenv(pipExec, ["install", packageName], workspace);

  const output = [
    `Paket: ${packageName}`,
    `Exit Code: ${result.exitCode}`,
    result.stdout ? `STDOUT:\n${result.stdout}` : "STDOUT: (leer)",
    result.stderr ? `STDERR:\n${result.stderr}` : "STDERR: (leer)",
  ].join("\n\n");

  return {
    content: [{ type: "text", text: output }],
  };
}

async function formatScript(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const workspace = resolveWorkspace(args.workspace as string | undefined);
  const name = sanitizeFileName(String(args.name));
  const blackExec = join(workspace, "venv", "bin", "black");
  const scriptPath = join(workspace, name);

  await assertFileExists(scriptPath);

  const result = await runWithVirtualenv(blackExec, [scriptPath], workspace);

  if (result.exitCode !== 0) {
    return {
      content: [
        {
          type: "text",
          text: `Black konnte nicht ausgeführt werden. Bitte installiere es zuerst (z.B. python_install_package).\nSTDERR:\n${result.stderr}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Script formatiert: ${scriptPath}\n${result.stdout}`,
      },
    ],
  };
}

async function runWithVirtualenv(
  executable: string,
  args: string[],
  workspace: string
) {
  try {
    return await execa(executable, args, {
      cwd: workspace,
      reject: false,
    });
  } catch (error) {
    logger.error({ error, executable, workspace }, "Python tool execution failed");
    throw new Error(
      `Ausführung fehlgeschlagen. Stelle sicher, dass der Workspace initialisiert ist (python_init_workspace) und notwendige Pakete installiert sind. Originalfehler: ${error}`
    );
  }
}

async function assertFileExists(path: string): Promise<void> {
  try {
    await fs.stat(path);
  } catch (error) {
    throw new Error(`Datei nicht gefunden: ${path}`);
  }
}


