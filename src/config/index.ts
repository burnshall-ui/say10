/**
 * Configuration Management
 *
 * Zentrale Konfiguration mit Environment Variables
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Suche .env in mehreren Locations (Priority: cwd > home > install dir)
const envLocations = [
  join(process.cwd(), '.env'),                    // Current directory
  join(homedir(), '.say10.env'),                  // Home directory
  join(__dirname, '../../.env'),                  // Install directory
];

// Unterdrücke dotenv Output komplett
const originalStdoutWrite = process.stdout.write;
process.stdout.write = () => true;

const envPath = envLocations.find(p => existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath, debug: false, override: false });
} else {
  // Fallback: Silent load, use defaults
  dotenv.config({ path: join(__dirname, '../../.env'), debug: false, override: false });
}

// Restore stdout
process.stdout.write = originalStdoutWrite;

/**
 * Application Configuration
 */
export const config = {
  // Ollama Configuration
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2:latest',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10),
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.LOG_PRETTY === 'true' || process.env.NODE_ENV !== 'production',
  },

  // Server Configuration
  server: {
    name: process.env.SERVER_NAME || 'say10',
    version: process.env.SERVER_VERSION || '1.0.0',
  },

  // Security Configuration
  security: {
    whitelistPath: process.env.WHITELIST_PATH || join(__dirname, '../../config/whitelist.json'),
    requireApproval: process.env.REQUIRE_APPROVAL !== 'false',
  },

  // Tool Configuration
  tools: {
    defaultLogLines: parseInt(process.env.DEFAULT_LOG_LINES || '50', 10),
    maxLogLines: parseInt(process.env.MAX_LOG_LINES || '1000', 10),
  },

  // Environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
};

/**
 * Validate Configuration
 */
export function validateConfig() {
  const errors: string[] = [];

  // Validate Ollama URL
  try {
    new URL(config.ollama.url);
  } catch (e) {
    errors.push(`Invalid OLLAMA_URL: ${config.ollama.url}`);
  }

  // Validate numeric values
  if (config.ollama.timeout < 0) {
    errors.push(`Invalid OLLAMA_TIMEOUT: ${config.ollama.timeout}`);
  }

  if (config.tools.defaultLogLines < 0) {
    errors.push(`Invalid DEFAULT_LOG_LINES: ${config.tools.defaultLogLines}`);
  }

  if (config.tools.maxLogLines < 0) {
    errors.push(`Invalid MAX_LOG_LINES: ${config.tools.maxLogLines}`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

export default config;
