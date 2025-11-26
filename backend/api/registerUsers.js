const path = require("path");

function tryRequire(p) {
  try {
    const m = require(p);
    console.log(`[api/registerUsers.js] tryRequire SUCCESS '${p}'`);
    return m;
  } catch (err) {
    console.log(`[api/registerUsers.js] tryRequire FAILED '${p}': ${err && err.code ? err.code : err}`);
    return null;
  }
}

/**
 * Attempt to delegate to the TypeScript registerUsers in ../src/api/registerUsers (via ts-node).
 * If that fails, install a minimal fallback registrar so index.js can attach routes and frontend stops getting 404.
 */
function createRegistrar() {
  // 1) Try to load ts-node/register so we can require the .ts module
  try {
    tryRequire("ts-node/register") || tryRequire("ts-node/register/transpile-only");
    const tsModPath = path.join(__dirname, "..", "src", "api", "registerUsers");
    const tsMod = tryRequire(tsModPath) || tryRequire(tsModPath + ".ts");
    if (tsMod) {
      const reg = tsMod.registerUsers || tsMod.default || tsMod;
      if (typeof reg === "function") {
        console.log("[api/registerUsers.js] Delegating to TypeScript registerUsers at", tsModPath);
        return reg;
      }
      console.log("[api/registerUsers.js] TypeScript module found but did not export a function");
    } else {
      console.log("[api/registerUsers.js] TypeScript registerUsers not found or ts-node not available");
    }
  } catch (e) {
    console.log("[api/registerUsers.js] error while attempting to load TS module:", e);
  }

  // 2) Fallback registrar (lightweight dev stub)
  console.log("[api/registerUsers.js] Using fallback registrar (development stub)");
  return function registerUsersFallback(app, options = {}) {
    // simple request logger for /api/user routes
    app.use((req, res, next) => {
      if (req.path && req.path.startsWith("/api/user")) {
        console.log(`[registerUsers-fallback] ${req.method} ${req.originalUrl} headers:`, {
          origin: req.headers.origin,
          "content-type": req.headers["content-type"],
        });
      }
      next();
    });

    // GET /api/user/me?uid=... or ?email=...
    app.get("/api/user/me", (req, res) => {
      console.log("[registerUsers-fallback] GET /api/user/me - no firestore available in fallback");
      return res.status(404).json({ error: "User not found (dev fallback)" });
    });

    // POST /api/user - create minimal user + household stub
    app.post("/api/user", (req, res) => {
      console.log("[registerUsers-fallback] POST /api/user body:", req.body);
      const clientUser = (req.body && req.body.user) || {};
      const uid = `dev_user_${Math.floor(Math.random() * 10000)}`;
      const householdId = `dev_household_${Math.floor(Math.random() * 10000)}`;
      const user = {
        id: uid,
        name: clientUser.name || "Dev User",
        email: clientUser.email || null,
        householdId,
      };
      const household = { id: householdId, inviteCode: "000000", users: [uid], name: req.body.householdName || "Dev Household" };
      console.log("[registerUsers-fallback] created (dev) user, household:", user, household);
      return res.json({ user, household });
    });

    // POST /api/user/login (dev stub)
    app.post("/api/user/login", (req, res) => {
      console.log("[registerUsers-fallback] POST /api/user/login body:", req.body);
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: "Missing email" });
      return res.json({ user: { id: "dev_user_1", email, name: "Dev User" } });
    });

    // PUT /api/user/:id (dev stub)
    app.put("/api/user/:id", (req, res) => {
      console.log("[registerUsers-fallback] PUT /api/user/:id", req.params.id, "body:", req.body);
      return res.json({ user: { id: req.params.id, ...(req.body || {}) } });
    });

    // POST /api/user/join (dev stub)
    app.post("/api/user/join", (req, res) => {
      console.log("[registerUsers-fallback] POST /api/user/join body:", req.body);
      const { inviteCode } = req.body || {};
      if (!inviteCode) return res.status(400).json({ error: "Missing inviteCode" });
      return res.json({ household: { id: "dev_household_1", inviteCode, users: ["dev_user_1"] } });
    });

    console.log("[registerUsers-fallback] routes registered (dev)");
  };
}

const registrar = createRegistrar();

// CommonJS export compatible with your index.js tryRegister/attachRegisterUsersToApp
module.exports = registrar;
module.exports.registerUsers = registrar;
