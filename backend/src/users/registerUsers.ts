// registerUsersHandler.ts
import { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import { firestore } from "./firebasesetup";
import {
  clientChoresToHouseholdChores,
  makeInviteCode,
  setSessionCookies,
  clearSessionCookies,
  readCookie,
  fetchUserFromDb,
} from "./helperFunctions";

// TODO: Get rid of console logs

// Helper to validate required fields for creating a user + household
function validateCreateUserRequest(body: any) {
  if (!firestore) {
    return { ok: false, error: "Firestore not initialized" };
  }

  const clientUser = body?.user || {};
  const householdName = body?.householdName || clientUser.householdName;

  if (!clientUser.id && !body.userId) {
    return { ok: false, error: "Missing user id" };
  }
  if (!clientUser.name) {
    return { ok: false, error: "Missing user name" };
  }
  if (!clientUser.mascot) {
    return { ok: false, error: "Missing user mascot" };
  }
  if (!clientUser.color) {
    return { ok: false, error: "Missing user color" };
  }
  if (!clientUser.email) {
    return { ok: false, error: "Missing user email" };
  }
  if (!householdName) {
    return { ok: false, error: "Missing household name" };
  }
  if (
    !clientUser.chores ||
    !Array.isArray(clientUser.chores) ||
    clientUser.chores.length === 0
  ) {
    return { ok: false, error: "Must provide non-empty chores array" };
  }

  return {
    ok: true,
    clientUser,
    householdName,
    uuid: String(clientUser.id || body.userId),
  };
}

export function validateLoginRequest(body: any) {
  if (!firestore) {
    return { ok: false, error: "Firestore not initialized" };
  }

  const email = body?.email;
  const password = body?.password;
  const authProvider = body?.authProvider || null;

  if (!email) {
    return { ok: false, error: "Missing email" };
  }

  if (!authProvider && !password) {
    return { ok: false, error: "Missing password for email login" };
  }

  return {
    ok: true,
    email: String(email).toLowerCase(),
    password: password || null,
    authProvider,
  };
}

// Bootstrap collections if empty
async function initCollectionsIfNeeded(res: Response): Promise<boolean> {
  if (!firestore) {
    res.status(500).json({ error: "Firestore not initialized" });
    return false;
  }

  try {
    const usersSnap = await firestore.collection("users").limit(1).get();
    if (usersSnap.empty) {
      await firestore.collection("users").doc("_bootstrap").set({
        id: "_bootstrap",
        name: "_bootstrap",
        bday: null,
        mascot: null,
        color: null,
        preferences: {},
        chores: [],
        householdId: null,
        email: null,
        password: null,
        pronouns: null,
        joined: new Date().toISOString(),
        bootstrap: true,
      });
    }

    const hhSnap = await firestore.collection("households").limit(1).get();
    if (hhSnap.empty) {
      await firestore.collection("households").doc("_bootstrap").set({
        name: "_bootstrap",
        inviteCode: null,
        users: [],
        chores: [],
        createdAt: new Date().toISOString(),
        bootstrap: true,
      });
    }

    return true;
  } catch (error) {
    console.log("[initCollectionsIfNeeded] Failed to initialize collections:", error);
    res.status(500).json({ error: "Failed to initialize collections" });
    return false;
  }
}

export function registerUsersHandler(app: Express) {
  // POST /api/user/invite/:code -> Validate invite code
  app.get("/api/user/invite/:code", async (req: Request, res: Response) => {
    try {
      const inviteCode = String(req.params.code || "").trim();
      if (!inviteCode) {
        return res.status(400).json({ error: "Missing invite code" });
      }
      if (!firestore) {
        return res.status(500).json({ error: "Firestore not initialized" });
      }

      const q = await firestore
        .collection("households")
        .where("inviteCode", "==", inviteCode)
        .limit(1)
        .get();

      if (q.empty) {
        return res.status(404).json({ error: "Invite code not found" });
      }

      const doc = q.docs[0];
      const data = doc.data() || {};
      return res.json({
        id: doc.id,
        name: data.name || null,
        inviteCode: data.inviteCode || null,
        users: data.users || [],
        chores: data.chores || [],
      });
    } catch (error) {
      console.log("[GET /api/user/invite/:code] error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  // TODO: Simplify this
  // GET /api/user/me -> Get user by email
  app.get("/api/user/me", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;
    if (!firestore) {
          return res.status(500).json({ error: "Firestore not initialized" });
        }
    try {
      const email = String(req.query.email || "").trim().toLowerCase();
      if (!email) return res.status(400).json({ error: "Missing email query parameter" });

      const dbUser = await fetchUserFromDb({ email });
      if (!dbUser) return res.status(404).json({ error: "User not found" });
      const user = dbUser;

      let inviteCode: string | null = null;
      let householdId: string | null = null;
      let householdName: string | null = null;

      if (user.householdId) {
        householdId = String(user.householdId);
        const hhSnap = await firestore
          .collection("households")
          .doc(householdId)
          .get();
        if (hhSnap.exists) {
          const hhData = hhSnap.data() || {};
          inviteCode = hhData.inviteCode || null;
          householdName = hhData.name || null;
        }
      }

      return res.json({
        user,
        inviteCode,
        householdId,
        householdName,
      });
    } catch (err) {
      console.log("[GET /api/user/me] error:", err);
      return res.status(500).json({
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // POST /api/user -> Create user + household or join existing household
  app.post("/api/user", async (req: Request, res: Response) => {
    console.log("===== [POST /api/user] Incoming request =====");
    console.log("[POST /api/user] raw body:", JSON.stringify(req.body, null, 2));

    if (!(await initCollectionsIfNeeded(res))) {
      console.log("[POST /api/user] initCollectionsIfNeeded returned false.");
      return;
    }

    if (!firestore) {
      console.log("[POST /api/user] Firestore not initialized.");
      return res.status(500).json({ error: "Firestore not initialized" });
    }

    try {
      const validation = validateCreateUserRequest(req.body);
      console.log("[POST /api/user] validation result:", validation);

      if (!validation.ok) {
        console.log("[POST /api/user] validation failed:", validation.error);
        return res.status(400).json({ error: validation.error });
      }

      const inviteCode = req.body?.inviteCode
        ? String(req.body.inviteCode).trim()
        : null;

      const inviteCode = req.body?.inviteCode
        ? String(req.body.inviteCode).trim()
        : null;
      const clientUser = req.body?.user || {};
      const userId = String(clientUser.id || req.body.userId || "").trim();
      const email = String(clientUser.email).toLowerCase();

      console.log("[POST /api/user] parsed fields:", {
        inviteCode,
        userId,
        email,
        hasHouseholdName: !!req.body?.householdName,
        clientUserChoresType: Array.isArray(clientUser.chores)
          ? "array"
          : typeof clientUser.chores,
      });

      // ============ INVITE CODE PATH ============
      if (inviteCode) {
        console.log("[POST /api/user] Using INVITE CODE path with inviteCode:", inviteCode);

        if (!firestore) {
          console.log("[POST /api/user] Firestore missing in invite path.");
          return res.status(500).json({ error: "Firestore not initialized" });
        }

        const q = await firestore
          .collection("households")
          .where("inviteCode", "==", inviteCode)
          .limit(1)
          .get();

        console.log("[POST /api/user] households query:", {
          empty: q.empty,
          docsCount: q.docs.length,
        });

        // Guard so this cannot crash
        if (q.empty || !q.docs[0]) {
          console.log("[POST /api/user] No household found for invite code.");
          return res.status(404).json({ error: "Invalid invite code" });
        }

        const hhSnap = q.docs[0];
        const hhRef = hhSnap.ref;
        const hhData = hhSnap.data() || {};

        console.log("[POST /api/user] household loaded:", {
          householdId: hhRef.id,
          householdName: hhData.name,
        });

        // Check for existing email conflict
        const existingUser = await fetchUserFromDb({ email });
        console.log("[POST /api/user] existingUser (invite path):", existingUser?.id);

        if (existingUser && existingUser.id !== userId) {
          console.log("[POST /api/user] Email already in use by another user.");
          return res
            .status(409)
            .json({ error: "Email already in use by another user." });
        }

        // Create/update user and set householdId
        const userRef = firestore.collection("users").doc(userId);
        const userPayload: any = {
          id: userId,
          name: clientUser.name ?? null,
          bday: clientUser.bday ?? null,
          mascot: clientUser.mascot ?? null,
          color: clientUser.color ?? null,
          preferences: clientUser.preferences ?? {},
          chores: clientUser.chores ?? [],
          householdId: hhRef.id,
          email,
          password: clientUser.password ?? null,
          pronouns: clientUser.pronouns ?? null,
          joined: new Date().toISOString(),
        };

        console.log("[POST /api/user] userPayload (invite path):", userPayload);

        try {
          await userRef.set(userPayload, { merge: true });
          console.log("[POST /api/user] User created/updated (invite path).");
        } catch (error) {
          console.log(
            "[POST /api/user] Failed to create/update user (invite path):",
            error
          );
          return res.status(500).json({ error: "Failed to create user" });
        }

        // Add user to household
        let users: string[] = Array.isArray(hhData.users)
          ? hhData.users.map(String)
          : [];
        let users: string[] = Array.isArray(hhData.users)
          ? hhData.users.map(String)
          : [];
        if (!users.includes(userId)) {
          users.push(userId);
          try {
            await hhRef.update({ users });
            console.log("[POST /api/user] Added user to household.");
          } catch (error) {
            console.log(
              "[POST /api/user] Failed to add user to household:",
              error
            );
            return res.status(500).json({ error: "Failed to add user to household" });
          }
        }

        try {
          await userRef.set({ householdName: hhData.name || null }, { merge: true });
          console.log("[POST /api/user] Updated user householdName (invite path).");
        } catch (error) {
          console.log(
            "[POST /api/user] Failed to update user household info:",
            error
          );
          return res
            .status(500)
            .json({ error: "Failed to update user household info" });
        }

        const finalUserSnap = await userRef.get();
        const finalUser = { id: finalUserSnap.id, ...finalUserSnap.data() };

        console.log("[POST /api/user] SUCCESS (invite path).");
        return res.status(200).json({
          success: true,
          inviteCode,
          householdId: hhRef.id,
          householdName: hhData.name || null,
          user: finalUser,
        });
      }

      // ============ NEW HOUSEHOLD PATH ============
      console.log("[POST /api/user] Using NEW HOUSEHOLD path (no inviteCode).");

      const householdName =
        req.body?.householdName || clientUser.householdName || null;
      console.log("[POST /api/user] householdName:", householdName);

      const existing = await firestore
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      console.log("[POST /api/user] existing user query:", {
        empty: existing.empty,
        docsCount: existing.docs.length,
        existingUserId: existing.empty ? null : existing.docs[0].id,
        userId,
      });

      if (!existing.empty && existing.docs[0].id !== userId) {
        console.log("[POST /api/user] Email already in use (new household path).");
        return res.status(409).json({ error: "Email already in use" });
      }

      const userRef = firestore.collection("users").doc(userId);
      const userPayload = {
        id: userId,
        name: clientUser.name,
        bday: clientUser.bday ?? null,
        mascot: clientUser.mascot,
        color: clientUser.color,
        preferences: clientUser.preferences ?? {},
        chores: clientUser.chores,
        householdId: null as string | null,
        email: clientUser.email,
        password: clientUser.password ?? null,
        pronouns: clientUser.pronouns ?? null,
        joined: new Date().toISOString(),
      };

      console.log("[POST /api/user] userPayload (new household path):", userPayload);

      try {
        await userRef.set(userPayload, { merge: true });
        console.log("[POST /api/user] User created (new household path).");
      } catch (error) {
        console.log("[POST /api/user] Failed to create user (new household path):", error);
        return res.status(500).json({ error: "Failed to create user" });
      }

      const inviteCodeNew = makeInviteCode();
      const householdRef = firestore.collection("households").doc();
      const householdId = householdRef.id;

      console.log("[POST /api/user] Creating household with id:", householdId);

      const choresForHousehold = clientChoresToHouseholdChores(
        clientUser.chores,
        [userId]
      );

      console.log(
        "[POST /api/user] choresForHousehold length:",
        Array.isArray(choresForHousehold) ? choresForHousehold.length : "not array"
      );

      try {
        await householdRef.set({
          id: householdId,
          name: householdName,
          inviteCode: inviteCodeNew,
          users: [userId],
          chores: choresForHousehold,
          createdAt: new Date().toISOString(),
        });
        console.log("[POST /api/user] Household created.");
      } catch (error) {
        console.log("[POST /api/user] Failed to create household:", error);
        return res.status(500).json({ error: "Failed to create household" });
      }

      try {
        await userRef.set({ householdId, householdName }, { merge: true });
        console.log("[POST /api/user] Updated user with householdId + householdName.");
      } catch (error) {
        console.log("[POST /api/user] Failed to update user household:", error);
        return res.status(500).json({ error: "Failed to update user household" });
      }

      const finalUserSnap = await userRef.get();
      const finalUser = { id: finalUserSnap.id, ...finalUserSnap.data() };

      console.log("[POST /api/user] SUCCESS (new household path).");
      return res.status(200).json({
        success: true,
        inviteCode: inviteCodeNew,
        householdId,
        householdName,
        user: finalUser,
      });
    } catch (error) {
      console.log("[POST /api/user] UNHANDLED error:", error);
      return res.status(500).json({
        error: "Internal server error",
        // TEMP: include basic info while debugging
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });


  // Login user
  app.post("/api/user/login", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;
    if (!firestore) {
      return res.status(500).json({ error: "Firestore not initialized" });
    }
    try {
      const validated = validateLoginRequest(req.body);
      if (!validated.ok) {
        return res.status(400).json({ error: validated.error });
      }

      const { email, password, authProvider } = validated;
      const dbUser = await fetchUserFromDb({ email });
      if (!dbUser) return res.status(404).json({ error: "User not found" });
      const data = dbUser;

      if (!authProvider || authProvider === "") {
        if (!data.password || data.password !== password) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
      }

      const user = { id: data.id, ...data };
      let inviteCode: string | null = null;
      let householdId: string | null = null;
      let householdName: string | null = null;

      if (data.householdId) {
        householdId = String(data.householdId);
        const hhSnap = await firestore.collection("households").doc(householdId).get();
        if (hhSnap.exists) {
          const hhData = hhSnap.data() || {};
          inviteCode = hhData.inviteCode || null;
          householdName = hhData.name || null;
        }
      }

      return res.json({
        user,
        inviteCode,
        householdId,
        householdName,
      });

    } catch (err) {
      console.log("[POST /api/user/login] error:", err);
      return res.status(500).json({
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // POST /api/session -> save session info into cookies
  app.post("/api/session", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;
    if (!firestore) {
      return res.status(500).json({ error: "Firestore not initialized" });
    }

    try {
      const user = req.body?.user ?? null;
      const householdName = req.body?.householdName ?? null;
      const inviteCode = req.body?.inviteCode ?? null;

      try {
        setSessionCookies(res, user, householdName, inviteCode);
      } catch (err) {
        console.log("[POST /api/session] cookie set error:", err);
        return res.status(200).json({ success: true, cookieSet: false });
      }

      return res.status(200).json({ success: true, cookieSet: true, user, householdName, inviteCode });
    } catch (error) {
      console.log("[POST /api/session] error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get session
  app.get("/api/session", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;
    if (!firestore) {
      return res.status(500).json({ error: "Firestore not initialized" });
    }
    
    try {
      const rawUserCookie = readCookie(req, "chore_user");
      if (!rawUserCookie) {
        return res.status(404).json({ error: "No session" });
      }

      let cookieUser: any = null;
      try {
        const decoded = decodeURIComponent(String(rawUserCookie));
        cookieUser = JSON.parse(decoded);
      } catch (error) {
        res.clearCookie("chore_user", { path: "/" });
        return res.status(400).json({ error: "Invalid session cookie" });
      }

      const dbUser = await fetchUserFromDb(cookieUser);
      const user = dbUser ?? cookieUser;

      let inviteCode: string | null = null;
      let householdId: string | null = null;
      let householdName: string | null = null;

      if (user && user.householdId) {
        householdId = String(user.householdId);
        if (!firestore) throw new Error("Firestore not initialized");
        const hhSnap = await firestore
          .collection("households")
          .doc(householdId)
          .get();
        if (hhSnap.exists) {
          const hhData = hhSnap.data() || {};
          inviteCode = hhData.inviteCode || null;
          householdName = hhData.name || null;
        }
      } else {
        const hhCookie = readCookie(req, "chore_household");
        const inviteCookie = readCookie(req, "chore_invite");
        if (hhCookie) householdName = decodeURIComponent(hhCookie);
        if (inviteCookie) inviteCode = decodeURIComponent(inviteCookie);
      }

      try {
        setSessionCookies(res, user, householdName, inviteCode);
      } catch (error) {
        // Ignore cookie refresh errors
      }

      return res.json({ user, inviteCode, householdId, householdName });
    } catch (error) {
      console.log("[GET /api/session] error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  // POST /api/user/logout -> clear session cookies
  app.post("/api/user/logout", async (req: Request, res: Response) => {
    try {
      clearSessionCookies(res);
      return res.json({ success: true });
    } catch (err) {
      console.log("[POST /api/user/logout] error:", err);
      return res.status(500).json({
        error: "Failed to clear session",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
