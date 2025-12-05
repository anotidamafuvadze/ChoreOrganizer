// registerUsersHandler.ts
import { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import { firestore } from "./firebasesetup";
import admin from "firebase-admin";
import {
  clientChoresToHouseholdChores,
  makeInviteCode,
} from "./helperFunctions";

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
    res.status(500).json({ error: "Failed to initialize collections" });
    return false;
  }
}

export async function registerUsersHandler(app: Express) {
  // Validate invite code
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
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  // Get user by email
  app.get("/api/user/me", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;


    try {
      const email = String(req.query.email || "")
        .trim()
        .toLowerCase();
      const email = String(req.query.email || "")
        .trim()
        .toLowerCase();
      if (!email) {
        return res.status(400).json({ error: "Missing email" });
      }
      if (!firestore) {
        return res.status(500).json({ error: "Firestore not initialized" });
      }

      const q = await firestore
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (q.empty) {
        return res.status(404).json({ error: "User not found" });
      }

      const doc = q.docs[0];
      const data = doc.data() || {};
      const user = { id: doc.id, ...data };

      let inviteCode: string | null = null;
      let householdId: string | null = null;
      let householdName: string | null = null;

      if (data.householdId) {
        householdId = String(data.householdId);
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
    } catch (error) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  // List all users (dev/debug) - returns array of users
  app.get("/api/users", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;

    try {
      if (!firestore) {
        return res.status(500).json({ error: "Firestore not initialized" });
      }

      const q = await firestore.collection("users").get();
      const users = q.docs
        .filter((d) => d.id !== "_bootstrap")
        .map((d) => ({ id: d.id, ...(d.data() || {}) }));

      return res.json({ users });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get chores for a user (only incomplete chores assigned to them)
  app.get("/api/chores", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;

    try {
      // Support either userId or email query param
      let userId = String(req.query.userId || "").trim();
      const emailQuery = String(req.query.email || "")
        .trim()
        .toLowerCase();

      if (!userId && !emailQuery) {
        return res
          .status(400)
          .json({ error: "Missing userId or email query param" });
      }

      if (!firestore) {
        return res.status(500).json({ error: "Firestore not initialized" });
      }

      // If email provided but no userId, try to resolve userId by email
      if (!userId && emailQuery) {
        const q = await firestore
          .collection("users")
          .where("email", "==", emailQuery)
          .limit(1)
          .get();
        if (q.empty) {
          return res
            .status(404)
            .json({ error: "User not found for provided email" });
        }
        const doc = q.docs[0];
        userId = doc.id;
      }

      const userSnap = await firestore.collection("users").doc(userId).get();
      if (!userSnap.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = userSnap.data() || {};
      const householdId = userData.householdId || null;
      if (!householdId) {
        return res.json({ chores: [] });
      }

      const hhSnap = await firestore
        .collection("households")
        .doc(String(householdId))
        .get();
      if (!hhSnap.exists) {
        return res.status(404).json({ error: "Household not found" });
      }

      const hhData = hhSnap.data() || {};
      const allChores: any[] = Array.isArray(hhData.chores)
        ? hhData.chores
        : [];

      // Return all chores assigned to the user (both completed and incomplete)
      const assigned = allChores.filter((c) => {
        let assignedTo: string[] = [];

        if (Array.isArray(c.assignedTo)) {
          assignedTo = c.assignedTo.map(String);
        } else if (typeof c.assignedTo === "string") {
          assignedTo = [c.assignedTo];
        }

        return assignedTo.includes(userId);
      });

      return res.json({
        chores: assigned,
        householdId: hhSnap.id,
        householdName: hhData.name || null,
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch chores" });
    }
  });

  // Mark a chore complete/incomplete and update user points (transactional)
  app.post("/api/chores/:id/complete", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;

    try {
      const choreId = String(req.params.id || "").trim();
      if (!choreId) return res.status(400).json({ error: "Missing chore id" });

      const userId = String(req.body.userId || "").trim();
      if (!userId)
        return res.status(400).json({ error: "Missing userId in body" });

      const requestedCompleted =
        req.body.completed === undefined ? true : !!req.body.completed;

      if (!firestore)
        return res.status(500).json({ error: "Firestore not initialized" });

      const userRef = firestore.collection("users").doc(userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists)
        return res.status(404).json({ error: "User not found" });

      const userData = userSnap.data() || {};
      const householdId = userData.householdId || null;
      if (!householdId)
        return res.status(400).json({ error: "User has no household" });

      const hhRef = firestore.collection("households").doc(String(householdId));

      await firestore.runTransaction(async (t) => {
        const hhSnap = await t.get(hhRef);
        if (!hhSnap.exists) throw new Error("Household not found");
        const hhData = hhSnap.data() || {};
        const chores: any[] = Array.isArray(hhData.chores) ? hhData.chores : [];

        const idx = chores.findIndex((c) => String(c.id) === choreId);
        if (idx === -1) throw new Error("Chore not found in household");

        const chore = chores[idx] || {};
        const oldCompleted = !!chore.completed;

        // Update chore completed state and metadata
        const updatedChore = {
          ...chore,
          completed: requestedCompleted,
          lastCompletedAt: requestedCompleted ? new Date().toISOString() : null,
          lastCompletedBy: requestedCompleted ? userId : null,
        };

        chores[idx] = updatedChore;

        t.update(hhRef, { chores });

        // Adjust user points atomically if completion state changed
        const points = Number(chore.points || 0);
        let delta = 0;
        if (!oldCompleted && requestedCompleted) delta = points;
        else if (oldCompleted && !requestedCompleted) delta = -points;

        if (delta !== 0) {
          t.update(userRef, {
            points: admin.firestore.FieldValue.increment(delta),
          });
        }
      });

      // Return updated chore and user
      const finalUserSnap = await firestore
        .collection("users")
        .doc(userId)
        .get();
      const finalUser = finalUserSnap.exists
        ? { id: finalUserSnap.id, ...finalUserSnap.data() }
        : null;

      const finalHhSnap = await firestore
        .collection("households")
        .doc(String(userData.householdId))
        .get();
      const finalHh = finalHhSnap.exists ? finalHhSnap.data() || {} : {};
      const finalChores: any[] = Array.isArray(finalHh.chores)
        ? finalHh.chores
        : [];
      const finalChore =
        finalChores.find((c) => String(c.id) === choreId) || null;

      return res.json({ success: true, chore: finalChore, user: finalUser });
    } catch (error: any) {
      const msg = error?.message || "Failed to update chore";
      return res.status(500).json({ error: msg });
    }
  });

  // Create user + household or join existing household
  app.post("/api/user", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;

    try {
      const validation = validateCreateUserRequest(req.body);
      if (!validation.ok) {
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

      if (inviteCode) {
        if (!firestore) throw new Error("Firestore not initialized");
        const q = await firestore
          .collection("households")
          .where("inviteCode", "==", inviteCode)
          .limit(1)
          .get();

        if (q.empty) {
          return res.status(404).json({ error: "Invite code not found" });
        }

        const hhSnap = q.docs[0];
        const hhRef = hhSnap.ref;
        const hhData = hhSnap.data() || {};

        // Check for email conflicts
        const existing = await firestore
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();
        if (!existing.empty && existing.docs[0].id !== userId) {
          return res.status(409).json({ error: "Email already in use" });
        }

        // Create/update user
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

        try {
          await userRef.set(userPayload, { merge: true });
        } catch (error) {
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
          } catch (error) {
            return res
              .status(500)
              .json({ error: "Failed to add user to household" });
            return res
              .status(500)
              .json({ error: "Failed to add user to household" });
          }
        }

        try {
          await userRef.set(
            { householdName: hhData.name || null },
            { merge: true }
          );
          await userRef.set(
            { householdName: hhData.name || null },
            { merge: true }
          );
        } catch (error) {
          return res
            .status(500)
            .json({ error: "Failed to update user household info" });
          return res
            .status(500)
            .json({ error: "Failed to update user household info" });
        }

        const finalUserSnap = await userRef.get();
        const finalUser = { id: finalUserSnap.id, ...finalUserSnap.data() };

        return res.status(200).json({
          success: true,
          inviteCode,
          householdId: hhRef.id,
          householdName: hhData.name || null,
          user: finalUser,
        });
      }

      // Create new household
      const householdName = req.body?.householdName || clientUser.householdName;
      if (!firestore) throw new Error("Firestore not initialized");
      const existing = await firestore
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!existing.empty && existing.docs[0].id !== userId) {
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
        password: clientUser.password,
        pronouns: clientUser.pronouns ?? null,
        joined: new Date().toISOString(),
      };

      try {
        await userRef.set(userPayload, { merge: true });
      } catch (error) {
        return res.status(500).json({ error: "Failed to create user" });
      }

      const inviteCodeNew = makeInviteCode();
      const householdRef = firestore.collection("households").doc();
      const householdId = householdRef.id;

      const choresForHousehold = clientChoresToHouseholdChores(
        clientUser.chores,
        [userId]
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
      } catch (error) {
        return res.status(500).json({ error: "Failed to create household" });
      }

      try {
        await userRef.set({ householdId, householdName }, { merge: true });
      } catch (error) {
        return res
          .status(500)
          .json({ error: "Failed to update user household" });
        return res
          .status(500)
          .json({ error: "Failed to update user household" });
      }

      const finalUserSnap = await userRef.get();
      const finalUser = { id: finalUserSnap.id, ...finalUserSnap.data() };

      return res.status(200).json({
        success: true,
        inviteCode: inviteCodeNew,
        householdId,
        householdName,
        user: finalUser,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  // Login user
  app.post("/api/user/login", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;


    try {
      const validated = validateLoginRequest(req.body);
      if (!validated.ok) {
        return res.status(400).json({ error: validated.error });
      }

      const { email, password, authProvider } = validated;
      if (!firestore) throw new Error("Firestore not initialized");
      const q = await firestore
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (q.empty) {
        return res.status(404).json({ error: "User not found" });
      }

      const doc = q.docs[0];
      const data = doc.data() || {};

      if (!authProvider && data.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = { id: doc.id, ...data };
      let inviteCode: string | null = null;
      let householdId: string | null = null;
      let householdName: string | null = null;

      if (data.householdId) {
        householdId = String(data.householdId);
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
    } catch (error) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  // Update user
  app.put("/api/user/update", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const updates = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "Missing user id" });
      }
      if (!firestore) {
        return res.status(500).json({ error: "Firestore not initialized" });
      }

      const userRef = firestore.collection("users").doc(String(id));
      const snap = await userRef.get();

      if (!snap.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const allowed: any = {};
      if (updates.email) allowed.email = String(updates.email).toLowerCase();
      if (updates.password) allowed.password = updates.password;
      if (updates.name !== undefined) allowed.name = updates.name;
      if (updates.pronouns !== undefined) allowed.pronouns = updates.pronouns;
      if (updates.bday !== undefined) allowed.bday = updates.bday;

      if (Object.keys(allowed).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      try {
        await userRef.set(allowed, { merge: true });
      } catch (error) {
        return res.status(500).json({ error: "Failed to update user" });
      }

      const updatedSnap = await userRef.get();
      return res.json({ user: { id: updatedSnap.id, ...updatedSnap.data() } });
    } catch (error) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  function setSessionCookies(
    res: Response,
    user: any,
    householdName?: string | null,
    inviteCode?: string | null
  ) {
  function setSessionCookies(
    res: Response,
    user: any,
    householdName?: string | null,
    inviteCode?: string | null
  ) {
    try {
      const cookieOpts = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: "/",
      };
      if (user) {
        const serialized = encodeURIComponent(JSON.stringify(user));
        res.cookie("chore_user", serialized, cookieOpts);
      }
      if (householdName !== undefined && householdName !== null) {
        res.cookie("chore_household", String(householdName), cookieOpts);
      }
      if (inviteCode !== undefined) {
        if (inviteCode === null) res.clearCookie("chore_invite", { path: "/" });
        else res.cookie("chore_invite", String(inviteCode), cookieOpts);
      }
    } catch (error) {
      // Silently fail on cookie errors
    }
  }

  function readCookie(req: Request, name: string): string | null {
    try {
      const anyReq: any = req;
      if (anyReq.cookies && anyReq.cookies[name] !== undefined) {
        const val = anyReq.cookies[name];
        return typeof val === "string" ? val : JSON.stringify(val);
      }

      const header = req.headers?.cookie;
      if (!header || typeof header !== "string") return null;

      const pairs = header.split(";").map((s) => s.trim());
      for (const p of pairs) {
        if (p.startsWith(name + "=")) {
          const raw = p.substring(name.length + 1);
          try {
            return decodeURIComponent(raw);
          } catch {
            return raw;
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async function fetchUserFromDb(candidate: any): Promise<any | null> {
    try {
      if (!firestore) return null;


      const id = candidate?.id || candidate?.userId || null;
      if (id) {
        const snap = await firestore.collection("users").doc(String(id)).get();
        if (snap.exists) return { id: snap.id, ...snap.data() };
      }

      const email = candidate?.email
        ? String(candidate.email).toLowerCase()
        : null;

      const email = candidate?.email
        ? String(candidate.email).toLowerCase()
        : null;
      if (email) {
        const q = await firestore
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();
        const q = await firestore
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();
        if (!q.empty) {
          const doc = q.docs[0];
          return { id: doc.id, ...doc.data() };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Set session
  app.post("/api/session", async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const clientUser = body.user || null;
      const householdNameInput = body.householdName ?? null;
      const inviteCodeInput = body.inviteCode ?? null;

      if (!clientUser) {
        return res.status(400).json({ error: "Missing user" });
      }

      const dbUser = await fetchUserFromDb(clientUser);
      const userToStore = dbUser ?? clientUser;

      let householdName = householdNameInput;
      let inviteCode = inviteCodeInput;
      if (dbUser && dbUser.householdId) {
        try {
          const hhSnap = await firestore
            .collection("households")
            .doc(String(dbUser.householdId))
            .get();
          if (hhSnap.exists) {
            const hhData = hhSnap.data() || {};
            householdName = hhData.name ?? householdName;
            inviteCode = hhData.inviteCode ?? inviteCode;
          }
        } catch (error) {
          // Ignore household lookup failure
        }
      }

      setSessionCookies(res, userToStore, householdName, inviteCode);
      return res.json({
        success: true,
        user: userToStore,
        householdName,
        inviteCode,
      });
      return res.json({
        success: true,
        user: userToStore,
        householdName,
        inviteCode,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to set session",
      });
    }
  });

  // Get session
  app.get("/api/session", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;


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
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  // Logout
  app.post("/api/user/logout", async (req: Request, res: Response) => {
    try {
      const cookieOpts = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
      };

      res.clearCookie("chore_user", cookieOpts);
      res.clearCookie("chore_household", cookieOpts);
      res.clearCookie("chore_invite", cookieOpts);

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to clear session",
      });
    }
  });
}

