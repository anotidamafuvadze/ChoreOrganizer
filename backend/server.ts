import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerOnboarding } from "./src/users/registerOnboarding";
import { registerAuthSessions } from "./src/users/registerAuthSessions";
import { registerAccounts } from "./src/users/registerAccounts";
import { registerHouseholds } from "./src/users/registerHouseholds";
import { registerChores } from "./src/users/registerChores";

import dotenv from "dotenv";
dotenv.config();

export class ServerApp {
  public app: Express;
  private port: number;

  constructor(port: number = process.env.PORT ? Number(process.env.PORT) : 3000) {
    this.app = express();
    this.port = port;
    this.configureMiddleware();
    this.registerHandlers();
  }

  // Configure CORS to allow only the client origin when sending credentials
  private configureMiddleware() {
    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    this.app.use(
      cors({
        origin: clientOrigin,
        credentials: true,
      })
    );
    this.app.use(express.json({ limit: "5mb" }));
  }

  // Register all route handlers
  private registerHandlers() {
    registerOnboarding(this.app);
    registerAuthSessions(this.app);
    registerAccounts(this.app);
    registerHouseholds(this.app);
    registerChores(this.app);
  }


  public start() {
    this.app.listen(this.port, () => {
      console.log(`Backend running at http://localhost:${this.port}`);
    });
  }

  public getApp(): Express {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new ServerApp();
  server.start();
}