const express = require("express");
const cors = require("cors");
const path = require("path");

/* Lightweight require helper with debug */
function tryRequire(p) {
  try {
    const m = require(p);
    console.debug(`[index.js] tryRequire SUCCESS '${p}'`);
    return m;
  } catch (err) {
    console.debug(`[index.js] tryRequire FAILED '${p}': ${err && err.code ? err.code : err}`);
    return null;
  }
}

/**
 * Class representing the backend server application.
 */
class ServerApp {
  constructor(port = (process.env.PORT ? Number(process.env.PORT) : 3000)) {
    this.app = express();
    this.port = port;
    this.configureMiddleware();
    this.registerHandlers();
  }

  configureMiddleware() {
    console.debug("[index.js] configureMiddleware - applying CORS and JSON middleware");
    const allowedOrigin = process.env.DEV_FRONTEND_ORIGIN || "http://localhost:5173";
    const corsOptions = {
      origin: allowedOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    };
    this.app.use(cors(corsOptions));
    this.app.options("*", cors(corsOptions));
    // explicit headers for extra clarity in logs/dev
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", corsOptions.origin);
      res.header("Access-Control-Allow-Credentials", String(corsOptions.credentials));
      res.header("Access-Control-Allow-Headers", corsOptions.allowedHeaders.join(","));
      res.header("Access-Control-Allow-Methods", corsOptions.methods.join(","));
      if (req.method === "OPTIONS") return res.sendStatus(204);
      next();
    });

    this.app.use(express.json({ limit: "5mb" }));
    this.app.use(express.static(path.join(__dirname, "..", "frontend")));
  }

  registerHandlers() {
    // health + debug
    this.app.get("/health", (req, res) => res.send("ok"));
    this.app.get("/api/hello", (req, res) => res.json({ message: "Hello from ServerApp (index.js)" }));

    // Attach registerUsers from likely candidates; try .js and .ts variants.
    const baseCandidates = ["./api/registerUsers", "./src/api/registerUsers", "./backend/api/registerUsers"];
    console.debug("[index.js] registerHandlers - trying candidates:", baseCandidates);
    let attached = false;
    for (const base of baseCandidates) {
      const tryPaths = [base, `${base}.js`, `${base}.ts`];
      for (const p of tryPaths) {
        try {
          // If attempting a .ts file, try to register ts-node if available so require can load .ts
          if (p.endsWith(".ts")) {
            try {
              require("ts-node/register");
              console.debug(`[index.js] registered ts-node to load TypeScript file '${p}'`);
            } catch (tsErr) {
              // ts-node not available — we'll still attempt require and let it fail
              console.debug(`[index.js] ts-node/register not available, cannot require '${p}' as TypeScript`);
            }
          }

          const mod = tryRequire(p);
          if (!mod) {
            console.debug(`[index.js] tryRequire failed for '${p}'`);
            continue;
          }
          const registrar = mod.registerUsers || mod.default || mod;
          if (typeof registrar === "function") {
            try {
              console.debug(`[index.js] invoking registerUsers registrar from '${p}'`);
              registrar(this.app, {});
              console.info(`[index.js] registerUsers attached from '${p}'`);
              attached = true;
              break;
            } catch (err) {
              console.warn(`[index.js] registerUsers invocation from '${p}' threw:`, err);
            }
          } else {
            console.debug(`[index.js] module at '${p}' did not export a function (typeof=${typeof registrar})`);
          }
        } catch (e) {
          console.debug(`[index.js] unexpected error while trying '${p}':`, e);
        }
      }
      if (attached) break;
    }

    if (!attached) {
      console.warn("[index.js] No registerUsers registrar attached — requests to /api/user will not be available. Candidates tried:", baseCandidates);
    }

    // catch-all for unmatched routes — give a clearer diagnostic to clients when /api/user is missing
    this.app.use((req, res) => {
      console.warn(`[index.js] NO MATCH ${req.method} ${req.originalUrl}`);
      // If the client is trying to reach /api/user*, return a 501 that explains the server didn't mount the user routes.
      if (req.originalUrl && req.originalUrl.startsWith("/api/user")) {
        return res.status(501).json({
          error: "User API not available on this server instance. registerUsers registrar not attached.",
          hint: "Ensure the registerUsers module is built/available (look for compiled JS in ./src/api or ./api), or install ts-node for direct .ts loading in dev.",
        });
      }
      res.status(404).json({ error: "Not found (debug)" });
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Backend running at http://localhost:${this.port}`);
    });
  }

  getApp() {
    return this.app;
  }
}

// keep CommonJS compatibility
module.exports = { ServerApp };

// If run directly, start server
if (require.main === module) {
  console.debug("[index.js] started as main - creating ServerApp");
  const server = new ServerApp();
  server.start();
}
