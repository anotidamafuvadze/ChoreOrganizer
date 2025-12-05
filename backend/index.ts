import express, { Express } from "express";
import cors from "cors";
import { registerUsersHandler } from "./src/users/registerUsers";
import dotenv from "dotenv";
dotenv.config();

export class ServerApp {
  public app: Express;
  private port: number;

  constructor(
    port: number = process.env.PORT ? Number(process.env.PORT) : 3000
  ) {
    this.app = express();
    this.port = port;
    this.configureMiddleware();
    this.registerHandlers();
  }

  private configureMiddleware() {
    // Allow only the configured client origin (do not use wildcard '*' when sending credentials)
    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    this.app.use(
      cors({
        origin: clientOrigin,
        credentials: true,
      })
    );
    this.app.use(express.json({ limit: "5mb" }));
  }

  private registerHandlers() {
    registerUsersHandler(this.app);
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

// If run directly, start server
if (require.main === module) {
  const server = new ServerApp();
  server.start();
}
