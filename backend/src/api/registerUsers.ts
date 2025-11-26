const express = require("express");
import { Express, Request, Response } from "express";

type CreateUserRouterOptions = {
  admin?: any;
  firestore?: any;
  FieldValue?: any;
  generateInviteCode?: () => string;
};

export function registerUsers(app: Express, options: CreateUserRouterOptions = {}) {
  const { admin, firestore, FieldValue, generateInviteCode } = options;
  // NOTE: routes are registered under full paths so callers can simply call registerUsers(app, deps)
  console.log("[registerUsers] registrar invoked - admin?", !!admin, "firestore?", !!firestore, "FieldValue?", !!FieldValue);

  // Add a lightweight request logger for all /api/user routes to help debug 404s
  app.use((req: Request, res: Response, next: any) => {
    if (typeof req.originalUrl === "string" && req.originalUrl.startsWith("/api/user")) {
      console.log(`[registerUsers] REQUEST ${req.method} ${req.originalUrl} - headers:`, {
        origin: req.headers.origin,
        cookie: !!req.headers.cookie,
        contentType: req.headers["content-type"],
      });
    }
    next();
  });

  // Provide a local invite-code generator as a fallback if none is supplied.
  const makeInviteCode = (typeof generateInviteCode === "function")
    ? generateInviteCode
    : () => Math.floor(100000 + Math.random() * 900000).toString();

  // Helper to ensure "users" collection exists (we treat an empty query as "missing" for this check).
  async function ensureUsersCollectionPresent(res: Response): Promise<boolean> {
    if (!firestore) {
      res.status(500).json({ error: "Firestore not initialized on backend" });
      return false;
    }
    try {
      const q = await (firestore as any).collection("users").limit(1).get();
      // If query result is falsy or empty, treat as missing collection for this check
      if (!q || (typeof q.empty === "boolean" && q.empty)) {
        res.status(500).json({ error: "users collection does not exist" });
        return false;
      }
      return true;
    } catch (err) {
      console.error("ensureUsersCollectionPresent error:", err);
      res.status(500).json({ error: "Error checking users collection existence" });
      return false;
    }
  }

  interface DocumentSnapshot<T = any> {
    exists: boolean;
    id: string;
    data(): T;
  }

  interface DocumentRef<T = any> {
    id: string;
    get(): Promise<DocumentSnapshot<T>>;
    set(data: any, opts?: any): Promise<void>;
    update(data: any): Promise<void>;
  }

  interface CollectionRef {
    doc(id?: string): DocumentRef<any>;
    where?: any;
  }

  interface FirestoreLike {
    collection(name: string): CollectionRef;
  }

  // Mock chore generator (fallback)
  function generateChoresForUsers(userIds: string[]) {
    const sample = [
      { name: "Take out trash", icon: "trash", frequency: "weekly", points: 5 },
      { name: "Dishes", icon: "dish", frequency: "daily", points: 3 },
      { name: "Vacuum common areas", icon: "vacuum", frequency: "weekly", points: 6 },
      { name: "Clean bathroom", icon: "bath", frequency: "weekly", points: 8 },
      { name: "Water plants", icon: "leaf", frequency: "biweekly", points: 2 },
    ];

    function mockDueDateISO(frequency: string) {
      const d = new Date();
      if (frequency === "daily") d.setDate(d.getDate() + 1);
      else if (frequency === "weekly") d.setDate(d.getDate() + 7);
      else if (frequency === "biweekly") d.setDate(d.getDate() + 14);
      else d.setDate(d.getDate() + 3);
      return d.toISOString();
    }

    const chores: any[] = [];
    for (let i = 0; i < sample.length; i++) {
      const s = sample[i];
      const assignedTo = userIds && userIds.length ? String(userIds[i % userIds.length]) : null;
      chores.push({
        id: `chore_${i + 1}`,
        name: s.name,
        icon: s.icon,
        frequency: s.frequency,
        points: s.points,
        assignedTo,
        dueDate: mockDueDateISO(s.frequency),
        completed: false,
      });
    }
    return chores;
  }

  // Convert client-provided chores [{name, frequency, points?}] into full household chore objects
  function clientChoresToHouseholdChores(clientChores: any[], userIds: string[]) {
    function mockDueDateISO(frequency: string) {
      const d = new Date();
      if (frequency === "daily") d.setDate(d.getDate() + 1);
      else if (frequency === "weekly") d.setDate(d.getDate() + 7);
      else if (frequency === "biweekly") d.setDate(d.getDate() + 14);
      else d.setDate(d.getDate() + 3);
      return d.toISOString();
    }

    const chores: any[] = [];
    for (let i = 0; i < clientChores.length; i++) {
      const c = clientChores[i] || {};
      const assignedTo = userIds && userIds.length ? String(userIds[i % userIds.length]) : null;
      chores.push({
        id: `chore_${i + 1}`,
        name: c.name || `Chore ${i + 1}`,
        icon: c.icon || null,
        frequency: c.frequency || "weekly",
        points: typeof c.points === "number" ? c.points : 3,
        assignedTo,
        dueDate: mockDueDateISO(c.frequency || "weekly"),
        completed: !!c.completed,
      });
    }
    return chores;
  }

  // GET /api/user/me?uid=... or ?email=...
  app.get("/api/user/me", async (req: Request, res: Response) => {
    try {
      console.log("GET /api/user/me query:", req.query);
      const uid = req.query.uid;
      const emailQ = req.query.email;
      if (!uid && !emailQ) {
        console.warn("GET /api/user/me missing uid and email");
        return res.status(400).json({ error: "Missing uid or email query parameter" });
      }

      if (!firestore) {
        console.error("GET /api/user/me: firestore not initialized");
        return res.status(500).json({ error: "Firestore not initialized on backend" });
      }
      // ensure users collection exists
      if (!await ensureUsersCollectionPresent(res)) return;

      if (emailQ) {
        const q = await (firestore as any).collection("users").where("email", "==", String(emailQ)).limit(1).get();
        if (!q || q.empty) {
          return res.status(404).json({ error: "User not found for email" });
        }
        const doc = q.docs[0];
        return res.json({ id: doc.id, ...doc.data() });
      }

      const userRef = (firestore as any).collection("users").doc(String(uid));
      const snap = await userRef.get();
      if (!snap.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json({ id: snap.id, ...snap.data() });
    } catch (err) {
      console.error("GET /api/user/me error:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  /*
    POST /api/user
      - Body: { user: { id?, name, bday?, mascot, color, preferences, chores, householdId?, email?, password?, pronouns? }, householdName?, householdId? }
      - authProvider can be provided (e.g. 'google') in which case backend will try to find user by email
  */
  app.post("/api/user", async (req: Request, res: Response) => {
    try {
      console.log("POST /api/user incoming body:", JSON.stringify(req.body));
      const body = req.body || {};
      const clientUser = body.user || {};
      const authProvider = body.authProvider || null;

      if (!firestore) {
        console.error("POST /api/user firestore not initialized");
        return res.status(500).json({ error: "Firestore not initialized on backend" });
      }
      // ensure users collection exists
      if (!await ensureUsersCollectionPresent(res)) return;

      // try to use provided id or userId
      let uid = clientUser.id || body.userId || null;
      let userRef: any = null;

      // Track householdName so we can store both id and name on the user document
      let householdName = body.householdName || clientUser.householdName || null;

      // If no uid but email present, try to find existing user by email
      if (!uid && clientUser.email) {
        console.log("POST /api/user looking up existing user by email:", clientUser.email);
        const q = await firestore.collection("users").where("email", "==", String(clientUser.email).toLowerCase()).limit(1).get();
        console.log("POST /api/user email lookup result empty?:", q.empty);
        if (!q.empty) {
          const existingDoc = q.docs[0];
          uid = existingDoc.id;
          console.log("POST /api/user found existing user id:", uid);
        }
      }

      // If still no uid, create a new user doc with auto-id
      if (!uid) {
        userRef = firestore.collection("users").doc();
        uid = userRef.id;
        console.log("POST /api/user creating new user id:", uid);
      } else {
        userRef = firestore.collection("users").doc(String(uid));
        console.log("POST /api/user using userRef id:", uid);
      }

      // build payload merging available fields (email/password/pronouns/etc.)
      const payload: any = {
        name: clientUser.name || null,
        bday: clientUser.bday || null,
        mascot: clientUser.mascot || null,
        color: clientUser.color || null,
        pronouns: clientUser.pronouns || null,
        preferences: clientUser.preferences || {},
        chores: clientUser.chores || {},
        joined: FieldValue ? FieldValue.serverTimestamp() : new Date().toISOString(),
      };

      if (clientUser.email) payload.email = String(clientUser.email).toLowerCase();
      if (clientUser.password) payload.password = clientUser.password;
      if (authProvider) payload.authProvider = authProvider;

      console.log("POST /api/user merged payload to write:", payload);

      // write/merge user doc
      await userRef.set(payload, { merge: true });
      console.log("POST /api/user userRef.set completed for uid:", uid);

      // Household handling
      let householdId = body.householdId || clientUser.householdId || null;
      let inviteCode = null;
      console.log("POST /api/user initial householdId:", householdId);

      if (!householdId) {
        // create a new household (auto id) and return inviteCode
        inviteCode = makeInviteCode();
        const hhRef = firestore.collection("households").doc();
        householdId = hhRef.id;
        householdName = body.householdName || householdName || null;
        console.log("POST /api/user creating new household id:", householdId, "inviteCode:", inviteCode);

        // create mock chores for the initial user(s) or use client-provided chores
        const chores = (clientUser.chores && Array.isArray(clientUser.chores) && clientUser.chores.length)
          ? clientChoresToHouseholdChores(clientUser.chores, [String(uid)])
          : generateChoresForUsers([String(uid)]);
        console.log("POST /api/user household chores created:", chores);

        await hhRef.set({
          name: body.householdName || null,
          inviteCode,
          users: [String(uid)],
          chores, // store chores array on household
          createdAt: FieldValue ? FieldValue.serverTimestamp() : new Date().toISOString(),
        });
        console.log("POST /api/user household doc set for id:", householdId);
      } else {
        const hhRef = firestore.collection("households").doc(String(householdId));
        const hhSnap = await hhRef.get();
        console.log("POST /api/user existing household snapshot exists?:", hhSnap.exists);
        if (hhSnap.exists) {
          // prefer using admin.firestore.FieldValue.arrayUnion if available
          try {
            if (admin && admin.firestore && admin.firestore.FieldValue) {
              console.log("POST /api/user using admin.firestore.FieldValue.arrayUnion to add user");
              await hhRef.update({ users: admin.firestore.FieldValue.arrayUnion(String(uid)) });
            } else if (FieldValue && FieldValue.arrayUnion) {
              console.log("POST /api/user using FieldValue.arrayUnion to add user");
              await hhRef.update({ users: FieldValue.arrayUnion(String(uid)) });
            } else {
              // fallback: read current users and merge
              const current = hhSnap.data().users || [];
              const usersSet = new Set(current.map(String));
              usersSet.add(String(uid));
              console.log("POST /api/user users fallback merge result:", Array.from(usersSet));
              await hhRef.update({ users: Array.from(usersSet) });
            }
          } catch (e) {
            console.warn("Failed to update household users with arrayUnion, falling back:", e);
            const current = hhSnap.data().users || [];
            const usersSet = new Set(current.map(String));
            usersSet.add(String(uid));
            await hhRef.update({ users: Array.from(usersSet) });
          }

          // ensure chores exist on the household; if missing, generate a mock set for all users
          const hhData = hhSnap.data() || {};
          // prefer household name from the household doc if present
          householdName = hhData.name || householdName || null;
          console.log("POST /api/user hhData before chores:", hhData);
          let chores = hhData.chores || null;
          if (!chores) {
            const users = hhData.users && hhData.users.length ? hhData.users.map(String) : [String(uid)];
            chores = (clientUser.chores && Array.isArray(clientUser.chores) && clientUser.chores.length)
              ? clientChoresToHouseholdChores(clientUser.chores, users)
              : generateChoresForUsers(users);
            console.log("POST /api/user updating household chores to:", chores);
            await hhRef.update({ chores });
          }

          inviteCode = hhData.inviteCode || null;
        } else {
          // household doc doesn't exist yet, create and add chores including this user
          inviteCode = body.inviteCode || makeInviteCode();
          householdName = body.householdName || householdName || null;
          const chores = (clientUser.chores && Array.isArray(clientUser.chores) && clientUser.chores.length)
            ? clientChoresToHouseholdChores(clientUser.chores, [String(uid)])
            : generateChoresForUsers([String(uid)]);
          console.log("POST /api/user creating household (didn't exist) with chores:", chores);
          await hhRef.set({
            name: body.householdName || null,
            inviteCode,
            users: [String(uid)],
            chores,
            createdAt: FieldValue ? FieldValue.serverTimestamp() : new Date().toISOString(),
          });
        }
      }

      // Ensure user's householdId is set
      console.log("POST /api/user setting user's householdId to:", householdId);
      await userRef.set({ householdId, householdName }, { merge: true });

      const updatedUserSnap = await userRef.get();
      const updatedUser = { id: updatedUserSnap.id, ...updatedUserSnap.data() };
      console.log("POST /api/user returning updatedUser:", updatedUser);

      return res.json({
        user: updatedUser,
        household: { id: householdId, inviteCode },
      });
    } catch (err) {
      console.error("POST /api/user error:", err, "req.body:", req.body);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/user/login
  app.post("/api/user/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Missing email or password" });
      }
      if (!firestore) return res.status(500).json({ error: "Firestore not initialized on backend" });
      // ensure users collection exists
      if (!await ensureUsersCollectionPresent(res)) return;

      const q = await firestore.collection("users").where("email", "==", String(email).toLowerCase()).limit(1).get();
      if (q.empty) return res.status(404).json({ error: "User not found" });

      const doc = q.docs[0];
      const data = doc.data() || {};
      if (!data.password || data.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      return res.json({ user: { id: doc.id, ...data } });
    } catch (err) {
      console.error("POST /api/user/login error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /api/user/:id
  app.put("/api/user/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const updates = req.body || {};
      if (!id) return res.status(400).json({ error: "Missing user id in path" });
      if (!firestore) return res.status(500).json({ error: "Firestore not initialized on backend" });
      // ensure users collection exists
      if (!await ensureUsersCollectionPresent(res)) return;

      const userRef = firestore.collection("users").doc(String(id));
      const snap = await userRef.get();
      if (!snap.exists) return res.status(404).json({ error: "User not found" });

      const allowed: any = {};
      if (updates.email) allowed.email = String(updates.email).toLowerCase();
      if (updates.password) allowed.password = updates.password;
      if (updates.name !== undefined) allowed.name = updates.name;
      if (updates.pronouns !== undefined) allowed.pronouns = updates.pronouns;
      if (updates.bday !== undefined) allowed.bday = updates.bday;

      if (Object.keys(allowed).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      await userRef.set(allowed, { merge: true });
      const updatedSnap = await userRef.get();
      return res.json({ user: { id: updatedSnap.id, ...updatedSnap.data() } });
    } catch (err) {
      console.error("PUT /api/user/:id error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/user/join
  app.post("/api/user/join", async (req: Request, res: Response) => {
    try {
      const { inviteCode, userId } = req.body || {};
      if (!inviteCode) return res.status(400).json({ error: "Missing inviteCode in body" });
      if (!firestore) return res.status(500).json({ error: "Firestore not initialized on backend" });
      // ensure users collection exists (we depend on users collection later)
      if (!await ensureUsersCollectionPresent(res)) return;

      const q = await firestore.collection("households").where("inviteCode", "==", String(inviteCode)).limit(1).get();
      if (q.empty) {
        return res.status(404).json({ error: "Household not found for inviteCode" });
      }
      const hhSnap = q.docs[0];
      const hhRef = hhSnap.ref;
      const hhData = hhSnap.data() || {};
      const users = Array.isArray(hhData.users) ? hhData.users.map(String) : [];

      if (userId) {
        try {
          if (admin && admin.firestore && admin.firestore.FieldValue) {
            await hhRef.update({ users: admin.firestore.FieldValue.arrayUnion(String(userId)) });
          } else if (FieldValue && FieldValue.arrayUnion) {
            await hhRef.update({ users: FieldValue.arrayUnion(String(userId)) });
          } else {
            const usersSet = new Set(users);
            usersSet.add(String(userId));
            await hhRef.update({ users: Array.from(usersSet) });
          }
          try {
            await firestore.collection("users").doc(String(userId)).set({ householdId: hhRef.id }, { merge: true });
          } catch (e) { /* ignore */ }
        } catch (e) {
          console.warn("Failed to add user to household:", e);
        }
      }

      const refreshed = await hhRef.get();
      const refreshedData = refreshed.data() || {};
      let chores = refreshedData.chores || null;
      if (!chores) {
        const currentUsers = Array.isArray(refreshedData.users) && refreshedData.users.length ? refreshedData.users.map(String) : [];
        chores = generateChoresForUsers(currentUsers.length ? currentUsers : (userId ? [String(userId)] : []));
        await hhRef.update({ chores });
      }

      const result = { id: hhRef.id, name: refreshedData.name || null, inviteCode: refreshedData.inviteCode || null, users: refreshedData.users || [], chores };
      return res.json({ household: result });
    } catch (err) {
      console.error("POST /api/user/join error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Lightweight debug endpoint to verify Firestore connectivity and optionally fetch a user
  app.get("/api/registerUsers/__debug", async (req: Request, res: Response) => {
    try {
      const emailQ = req.query.email as string | undefined;
      const uidQ = req.query.uid as string | undefined;
      const info: any = { firestoreInitialized: !!firestore };

      if (!firestore) {
        return res.json({ ok: false, info, message: "Firestore not initialized" });
      }

      if (emailQ || uidQ) {
        // if we are going to query users, ensure the collection exists
        if (!await ensureUsersCollectionPresent(res)) return;
      }

      if (emailQ) {
        const q = await firestore.collection("users").where("email", "==", String(emailQ).toLowerCase()).limit(1).get();
        if (q && !q.empty) {
          const doc = q.docs[0];
          return res.json({ ok: true, info, user: { id: doc.id, ...(doc.data ? doc.data() : {}) } });
        } else {
          return res.json({ ok: true, info, user: null, message: "User not found for email" });
        }
      }

      if (uidQ) {
        const docRef = firestore.collection("users").doc(String(uidQ));
        const snap = await docRef.get();
        if (snap && snap.exists) {
          return res.json({ ok: true, info, user: { id: snap.id, ...(snap.data ? snap.data() : {}) } });
        } else {
          return res.json({ ok: true, info, user: null, message: "User not found for uid" });
        }
      }

      // general status
      return res.json({ ok: true, info, message: "debug endpoint reachable" });
    } catch (err) {
      console.error("/api/registerUsers/__debug error:", err);
      return res.status(500).json({ ok: false, error: String(err) });
    }
  });

  console.log("[registerUsers] routes registered on app");
}

// Keep CommonJS compatibility for existing require() callers
module.exports = registerUsers;
exports.registerUsers = registerUsers;