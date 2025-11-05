#!/usr/bin/env node

/**
 * API Server CLI
 * 
 * Starts the REST API server
 */

import { APIServer } from "../src/api/server.js";
import { config } from "../src/config/index.js";

async function main() {
  console.log(`
  ███████╗ █████╗ ██╗   ██╗ ██╗ ██████╗ 
  ██╔════╝██╔══██╗╚██╗ ██╔╝███║██╔═████╗
  ███████╗███████║ ╚████╔╝ ╚██║██║██╔██║
  ╚════██║██╔══██║  ╚██╔╝   ██║████╔╝██║
  ███████║██║  ██║   ██║    ██║╚██████╔╝
  ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═╝ ╚═════╝ 
  ─────────────────────────────────────────
  REST API Server
  `);

  const port = parseInt(process.env.API_PORT || "6666", 10);
  const host = process.env.API_HOST || "0.0.0.0";
  const apiKey = process.env.API_KEY || "";

  const server = new APIServer({
    port,
    host,
    apiKey,
    enableCors: true,
    rateLimit: {
      max: 100,
      timeWindow: "1 minute",
    },
  });

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n[API] Shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n[API] Shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error("[API] Failed to start server:", error);
    process.exit(1);
  }
}

main();

