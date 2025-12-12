import { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import { firestore } from "./firebasesetup";
import admin from "firebase-admin";
import {
  clientChoresToHouseholdChores,
  makeInviteCode,
} from "./helperFunctions";

// add imports to use assignment algorithm & writer
import { buildFlowGraph, minCostMaxFlow } from "../algorithms/registerChoreSorter";
import { assignUserstoChores, fetchHouseholdFromFirestore } from "./firebaseHelpers";

// TODO: Break some of this up into smaller files

// Helper to validate required fields for creating a user + household
function validateCreateUserRequest(body: any) {
  if (!firestore) {
    return { ok: false, error: "Firestore not initialized" };
  }

  const clientUser = body?.user || {};
  const householdName = body?.householdName || clientUser.householdName;
  const inviteCode = body?.inviteCode;

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
  if (!inviteCode && !householdName) {
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
    res.status(500).json({ error: "Failed to initialize collections" });
    return false;
  }
}

async function resolveRoommateNames(hhData: any): Promise<string[]> {
  try {
    if (!firestore) return [];
    const rawUsers = Array.isArray(hhData?.users) ? hhData.users : [];
    const userIds = rawUsers
      .map((u: any) =>
        typeof u === "string"
          ? u
          : u && (u.id || u.userId)
            ? String(u.id ?? u.userId)
            : null
      )
      .filter(Boolean) as string[];

    if (userIds.length === 0) return [];

    const snaps = await Promise.all(
      userIds.map((uid) =>
        firestore!.collection("users").doc(String(uid)).get()
      )
    );

    const names = snaps
      .map((s) => (s.exists ? (s.data() || {}).name ?? null : null))
      .filter(Boolean) as string[];

    return names;
  } catch (e) {
    return [];
  }
}

async function resolveRoommatesDetails(
  hhData: any
): Promise<{ name: string; mascot?: string | null; color?: string | null }[]> {
  try {
    if (!firestore) return [];
    const rawUsers = Array.isArray(hhData?.users) ? hhData.users : [];
    const userIds = rawUsers
      .map((u: any) =>
        typeof u === "string"
          ? u
          : u && (u.id || u.userId)
            ? String(u.id ?? u.userId)
            : null
      )
      .filter(Boolean) as string[];

    if (userIds.length === 0) return [];

    const snaps = await Promise.all(
      userIds.map((uid) =>
        firestore!.collection("users").doc(String(uid)).get()
      )
    );

    return snaps
      .map((s) =>
        s.exists
          ? {
            id: s.id,
            name: ((s.data() || {}).name ?? null) as string | null,
            mascot: ((s.data() || {}).mascot ?? null) as string | null,
            color: ((s.data() || {}).color ?? null) as string | null,
          }
          : null
      )
      .filter(Boolean)
      .map((r: any) => ({
        id: String(r.id || ""),
        name: String(r.name || ""),
        mascot: r.mascot,
        color: r.color,
      }));
  } catch (e) {
    return [];
  }
}

export async function registerUsers(app: Express) {
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

      // Use helper to resolve roommate names (only names returned)
      const roomates = await resolveRoommateNames(data);

      // Return only essential data for validation + roommate names (only names)
      return res.json({
        id: doc.id,
        name: data.name || null,
        inviteCode: data.inviteCode || null,
        roomates,
      });
    } catch (error) {
      console.log("Internal server error:", error);
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

  // app.get('/api/chores/calendar', async (req: Request, res: Response) => {
  //   // Example: support ?householdId=...&weekOffset=0 or ?householdId=...&month=12
  //   const { householdId, weekOffset, month } = req.query;

  //   if (!householdId) {
  //     return res.status(400).json({ error: 'Missing householdId parameter' });
  //   }

  //   // TODO: Fetch household document from Firestore
  //   // Example:
  //   // const hhSnap = await firestore.collection("households").doc(String(householdId)).get();
  //   // if (!hhSnap.exists) return res.status(404).json({ error: "Household not found" });
  //   // const hhData = hhSnap.data() || {};

  //   // TODO: Filter chores by week or month, and build calendar data structure
  //   // For now, return mock data:
  //   if (weekOffset !== undefined) {
  //     return res.json({
  //       days: [
  //         { date: 1, day: 'Mon', chores: [{ name: 'Trash', mascot: 'cat', color: '#FFB6C1', completed: false, time: '9:00 AM' }] },
  //         // ...more days
  //       ],
  //       stats: { completed: 5, remaining: 2, percent: 71 }
  //     });
  //   } else if (month !== undefined) {
  //     return res.json({
  //       days: [
  //         { date: 1, day: 'Mon', chores: [{ name: 'Dishes', mascot: 'bunny', color: '#A7C7E7', completed: true, time: '10:00 AM' }] },
  //         // ...more days
  //       ],
  //       stats: { completed: 20, remaining: 5, percent: 80 }
  //     });
  //   } else {
  //     return res.status(400).json({ error: 'Missing weekOffset or month parameter' });
  //   }
  // });

  /////////////

  app.get("/api/chores/calendar", async (req: Request, res: Response) => {
    const { householdId, weekOffset, month } = req.query;

    if (!householdId) {
      return res.status(400).json({ error: "Missing householdId parameter" });
    }
    if (!firestore) {
      return res.status(500).json({ error: "Firestore not initialized" });
    }

    // Fetch household document
    const hhSnap = await firestore
      .collection("households")
      .doc(String(householdId))
      .get();
    if (!hhSnap.exists)
      return res.status(404).json({ error: "Household not found" });
    const hhData = hhSnap.data() || {};
    const allChores: any[] = Array.isArray(hhData.chores) ? hhData.chores : [];

    // Filter chores by week or month
    let filteredChores = allChores;

    //SKIPPING FILTERINF FOR TESTING
    // if (weekOffset !== undefined) {
    //   // Calculate start and end of the week
    //   const now = new Date();
    //   const offset = Number(weekOffset) || 0;
    //   const startOfWeek = new Date(now);
    //   startOfWeek.setDate(now.getDate() - now.getDay() + offset * 7);
    //   startOfWeek.setHours(0, 0, 0, 0);
    //   const endOfWeek = new Date(startOfWeek);
    //   endOfWeek.setDate(startOfWeek.getDate() + 7);

    //   filteredChores = allChores.filter((chore) => {
    //     if (!chore.dueDate) return false;
    //     const due = new Date(chore.dueDate);
    //     return due >= startOfWeek && due < endOfWeek;
    //   });
    // } else if (month !== undefined) {
    //   // Filter by month (1-based)
    //   const year = new Date().getFullYear();
    //   const monthNum = Number(month) - 1;
    //   filteredChores = allChores.filter((chore) => {
    //     if (!chore.dueDate) return false;
    //     const due = new Date(chore.dueDate);
    //     return due.getMonth() === monthNum && due.getFullYear() === year;
    //   });
    // }

    // Helper function to get weekday string from date
    function getWeekday(dateInput: string | Date): string {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dateObj =
        typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      return days[dateObj.getDay()];
    }

    // Group chores by day
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const daysMap: Record<string, any> = {};
    filteredChores.forEach((chore) => {
      if (!chore.dueDate) return;
      const dateObj = new Date(chore.dueDate);
      const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
      if (!daysMap[key]) {
        daysMap[key] = {
          date: dateObj.getDate(),
          day: weekDays[dateObj.getDay()],
          chores: [],
        };
      }
      daysMap[key].chores.push({
        name: chore.name,
        mascot: chore.mascot,
        color: chore.color,
        completed: chore.completed,
        time: dateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    });
    const days = Object.values(daysMap);

    // Calculate stats
    const completed = filteredChores.filter((c) => c.completed).length;
    const remaining = filteredChores.length - completed;
    const percent = filteredChores.length
      ? Math.round((completed / filteredChores.length) * 100)
      : 0;

    return res.json({
      days,
      stats: { completed, remaining, percent },
    });
  });

  // app.get('/api/chores/calendar', async (req, res) => {
  //   return res.json({
  //   days: [
  //     { date: 1, day: 'Mon', chores: [{ name: 'Trash', mascot: 'cat', color: '#FFB6C1', completed: false, time: '9:00 AM' }] },
  //     { date: 2, day: 'Tue', chores: [{ name: 'Dishes', mascot: 'bunny', color: '#A7C7E7', completed: true, time: '10:00 AM' }] }
  //   ],
  //   stats: { completed: 1, remaining: 1, percent: 50 }
  // });
  // });

  // app.get('/api/chores/calendar', async (req, res) => {
  //   // Place your mock chores array here
  //   const chores = [
  //     {
  //       id: "chore_1",
  //       name: "Take Out Trash",
  //       mascot: "cat",
  //       color: "#FFB6C1",
  //       completed: false,
  //       dueDate: new Date().toISOString(), // today
  //       time: "9:00 AM"
  //     },
  //     {
  //       id: "chore_2",
  //       name: "Wash Dishes",
  //       mascot: "bunny",
  //       color: "#A7C7E7",
  //       completed: true,
  //       dueDate: new Date().toISOString(), // today
  //       time: "10:00 AM"
  //     }
  //     // ...add more chores as needed
  //   ];

  //   // Group chores by day
  //   const daysMap: Record<number, { date: number; day: string; chores: any[] }> = {};
  //   chores.forEach((chore) => {
  //     const dateObj = new Date(chore.dueDate);
  //     const date = dateObj.getDate();
  //     const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dateObj.getDay()];
  //     if (!daysMap[date]) {
  //       daysMap[date] = { date, day, chores: [] };
  //     }
  //     daysMap[date].chores.push({
  //       name: chore.name,
  //       mascot: chore.mascot,
  //       color: chore.color,
  //       completed: chore.completed,
  //       time: chore.time
  //     });
  //   });

  //   const days = Object.values(daysMap).sort((a, b) => a.date - b.date);

  //   // Calculate stats
  //   const completed = chores.filter(c => c.completed).length;
  //   const remaining = chores.length - completed;
  //   const percent = chores.length ? Math.round((completed / chores.length) * 100) : 0;

  //   return res.json({
  //     days,
  //     stats: { completed, remaining, percent }
  //   });
  // });

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

        // Create/update user with householdId but DO NOT add to household.users yet
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

        // DO NOT add user to household.users array yet
        // This will be done after onboarding completion via a separate endpoint

        try {
          await userRef.set(
            { householdName: hhData.name || null },
            { merge: true }
          );
        } catch (error) {
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
        // Do NOT assign chores immediately: persist as pending templates.
        await householdRef.set({
          id: householdId,
          name: householdName,
          inviteCode: inviteCodeNew,
          users: [userId],
          chores: [], // active assignments empty until user triggers assignment
          pendingChoreTemplates: choresForHousehold,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        return res.status(500).json({ error: "Failed to create household" });
      }

      await userRef.set({ householdId, householdName }, { merge: true });

      try {
        await userRef.set({ householdId, householdName }, { merge: true });
      } catch (error) {
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
      if (email) {
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
      let householdId: string | null = null;
      if (dbUser && dbUser.householdId) {
        householdId = String(dbUser.householdId);
        try {
          const hhSnap = firestore
            ? await firestore
              .collection("households")
              .doc(String(dbUser.householdId))
              .get()
            : ({ exists: false } as any);
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
        // user: userToStore,
        user: {
          id: userToStore.id,
          email: userToStore.email,
          householdId: userToStore.householdId,
        },
        householdId,
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
        const db = firestore;
        if (!db) {
          return res.status(500).json({ error: "Firestore not initialized" });
        }
        const hhSnap = await (db as any)
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

  // Finalize household membership (add user to household users array and merge chores)
  app.post(
    "/api/user/finalize-household",
    async (req: Request, res: Response) => {
      if (!(await initCollectionsIfNeeded(res))) return;

      try {
        const userId = String(req.body.userId || "").trim();
        const householdId = String(req.body.householdId || "").trim();

        if (!userId) {
          return res.status(400).json({ error: "Missing userId" });
        }
        if (!householdId) {
          return res.status(400).json({ error: "Missing householdId" });
        }
        if (!firestore) {
          return res.status(500).json({ error: "Firestore not initialized" });
        }

        // Get user document
        const userRef = firestore.collection("users").doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
          return res.status(404).json({ error: "User not found" });
        }

        const userData = userSnap.data() || {};
        const userChores = Array.isArray(userData.chores)
          ? userData.chores
          : [];

        // Get household document
        const hhRef = firestore.collection("households").doc(householdId);
        const hhSnap = await hhRef.get();
        if (!hhSnap.exists) {
          return res.status(404).json({ error: "Household not found" });
        }

        const hhData = hhSnap.data() || {};
        let householdUsers: string[] = Array.isArray(hhData.users)
          ? hhData.users.map(String)
          : [];
        let householdChores: any[] = Array.isArray(hhData.chores)
          ? hhData.chores
          : [];

        // Deduplicate household chores by id to guard against repeated finalize calls
        if (householdChores.length > 1) {
          const byId = new Map<string, any>();
          for (const c of householdChores) {
            if (!c) continue;
            const id = String(c.id ?? c._id ?? Math.random());
            if (!byId.has(id)) byId.set(id, c);
          }
          householdChores = Array.from(byId.values());
        }

        // Add user to household users array if not already present
        if (!householdUsers.includes(userId)) {
          householdUsers.push(userId);
        }

        // If the household already has chores, DO NOT rebalance assignments when a new user joins.
        if (Array.isArray(householdChores) && householdChores.length > 0) {
          // Persist only the updated users array. Do NOT modify existing chore assignments.
          try {
            await hhRef.update({ users: householdUsers });
          } catch (error) {
            return res
              .status(500)
              .json({ error: "Failed to update household users" });
          }

          // Clear the user's personal chores array to avoid duplication; UI will read household chores.
          try {
            await userRef.set(
              { householdId, householdName: hhData.name || null, chores: [] },
              { merge: true }
            );
          } catch (error) {
            return res
              .status(500)
              .json({ error: "Failed to update user household info" });
          }
        } else {
          // Household has no chores yet: convert user's chores into pending templates
          const newTemplates = clientChoresToHouseholdChores(userChores, [userId]);
          // merge into pendingChoreTemplates (dedupe)
          const existingTemplates = Array.isArray(hhData.pendingChoreTemplates) ? hhData.pendingChoreTemplates : [];
          const merged = [...existingTemplates, ...newTemplates];
          const byId = new Map<string, any>();
          for (const c of merged) {
            if (!c) continue;
            const id = String(c.id ?? c._id ?? Math.random());
            if (!byId.has(id)) byId.set(id, c);
          }
          const finalTemplates = Array.from(byId.values());

          // Update household document with pending templates and users (no active chores yet)
          try {
            await hhRef.update({
              users: householdUsers,
              pendingChoreTemplates: finalTemplates,
            });
          } catch (error) {
            return res
              .status(500)
              .json({ error: "Failed to update household" });
          }

          // Clear the user's personal chores array to avoid duplication; UI will read household templates
          try {
            await userRef.set(
              { householdId, householdName: hhData.name || null, chores: [] },
              { merge: true }
            );
          } catch (error) {
            return res
              .status(500)
              .json({ error: "Failed to update user household info" });
          }
        }

        return res.json({
          success: true,
          householdId,
          message: "User successfully added to household",
        });
      } catch (error: any) {
        return res.status(500).json({
          error: error?.message || "Failed to finalize household membership",
        });
      }
    }
  );

  // New endpoint: get roommate details for a household by id
  app.get(
    "/api/household/:id/roommates",
    async (req: Request, res: Response) => {
      try {
        const householdId = String(req.params.id || "").trim();
        if (!householdId)
          return res.status(400).json({ error: "Missing household id" });
        if (!firestore)
          return res.status(500).json({ error: "Firestore not initialized" });

        const hhSnap = await firestore
          .collection("households")
          .doc(householdId)
          .get();
        if (!hhSnap.exists)
          return res.status(404).json({ error: "Household not found" });

        const hhData = hhSnap.data() || {};
        const roommates = await resolveRoommatesDetails(hhData);

        return res.json({ householdId: hhSnap.id, roommates });
      } catch (error) {
        console.error("Failed to fetch roommates:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // New endpoint: get household by id (returns name, inviteCode, chores)
  app.get("/api/household/:id", async (req: Request, res: Response) => {
    try {
      const householdId = String(req.params.id || "").trim();
      if (!householdId)
        return res.status(400).json({ error: "Missing household id" });
      if (!firestore)
        return res.status(500).json({ error: "Firestore not initialized" });

      const hhSnap = await firestore
        .collection("households")
        .doc(householdId)
        .get();
      if (!hhSnap.exists)
        return res.status(404).json({ error: "Household not found" });

      const hhData = hhSnap.data() || {};

      // If it's been more than 7 days since chores were last reassigned,
      // automatically rebalance assignments (round-robin) so households get
      // a weekly rotation. This keeps members' dashboards consistent.
      const hhRef = firestore.collection("households").doc(householdId);
      let chores = Array.isArray(hhData.chores) ? hhData.chores : [];
      try {
        const last = hhData.lastReassignedAt
          ? Date.parse(String(hhData.lastReassignedAt))
          : 0;
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (!last || now - last > sevenDays) {
          // Determine household users for assignment
          let householdUsers: string[] = Array.isArray(hhData.users)
            ? hhData.users.map(String)
            : [];
          if (householdUsers.length === 0) {
            const snaps = await firestore
              .collection("users")
              .where("householdId", "==", householdId)
              .get();
            householdUsers = snaps.docs.map((d) => d.id);
          }

          if (householdUsers.length > 0 && chores.length > 0) {
            const count = householdUsers.length;
            const rebalanced = chores.map((c: any, idx: number) => {
              const chore = { ...(c || {}) };
              chore.assignedTo = String(householdUsers[idx % count]);
              return chore;
            });
            chores = rebalanced;
            // persist updated chores and timestamp
            try {
              await hhRef.update({
                chores: rebalanced,
                lastReassignedAt: new Date().toISOString(),
              });
            } catch (e) {
              // ignore persistence errors here but keep returning rebalanced chores
              console.warn("Failed to persist auto-reassigned chores:", e);
            }
          }
        }
      } catch (e) {
        // ignore auto-reassign errors
      }

      const roommates = await resolveRoommatesDetails(hhData);
      return res.json({
        householdId: hhSnap.id,
        name: hhData.name || null,
        inviteCode: hhData.inviteCode || null,
        chores,
        // expose pending templates so frontend can surface "Assign chores" action
        pendingChoreTemplates: Array.isArray(hhData.pendingChoreTemplates)
          ? hhData.pendingChoreTemplates
          : [],
        roommates,
      });
    } catch (error) {
      console.error("Failed to fetch household:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reassign chores within a household. Optional body: { strategy: 'round-robin' }
  app.post(
    "/api/household/:id/reassign",
    async (req: Request, res: Response) => {
      if (!(await initCollectionsIfNeeded(res))) return;
      try {
        const householdId = String(req.params.id || "").trim();
        if (!householdId)
          return res.status(400).json({ error: "Missing household id" });
        if (!firestore)
          return res.status(500).json({ error: "Firestore not initialized" });

        const hhRef = firestore.collection("households").doc(householdId);
        const hhSnap = await hhRef.get();
        if (!hhSnap.exists)
          return res.status(404).json({ error: "Household not found" });

        const hhData = hhSnap.data() || {};
        const householdChores: any[] = Array.isArray(hhData.chores)
          ? hhData.chores
          : [];
        let householdUsers: string[] = Array.isArray(hhData.users)
          ? hhData.users.map(String)
          : [];

        // If householdUsers empty, try to load users by householdId from users collection
        if (householdUsers.length === 0) {
          const snaps = await firestore
            .collection("users")
            .where("householdId", "==", householdId)
            .get();
          householdUsers = snaps.docs.map((d) => d.id);
        }

        if (householdUsers.length === 0) {
          return res
            .status(400)
            .json({ error: "No users available to assign chores" });
        }

        // Default to round-robin
        const strategy = String(
          (req.body && req.body.strategy) || "round-robin"
        );

        let updatedChores: any[] = [];
        if (strategy === "round-robin") {
          const count = householdUsers.length;
          updatedChores = householdChores.map((c: any, idx: number) => {
            const chore = { ...(c || {}) };
            chore.assignedTo = String(householdUsers[idx % count]);
            return chore;
          });
        } else if (Array.isArray(req.body?.assignments)) {
          // assignments: [{ choreId, userId }, ...]
          const byId = new Map<string, any>(
            householdChores.map((c: any) => [String(c.id), c])
          );
          for (const a of req.body.assignments) {
            const cid = String(a.choreId || "");
            const uid = String(a.userId || "");
            if (!byId.has(cid)) continue;
            const chore = { ...(byId.get(cid) || {}) };
            chore.assignedTo = uid;
            byId.set(cid, chore);
          }
          updatedChores = Array.from(byId.values());
        } else {
          return res.status(400).json({ error: "Unknown reassign strategy" });
        }

        try {
          await hhRef.update({ chores: updatedChores });
        } catch (err) {
          return res
            .status(500)
            .json({ error: "Failed to persist reassigned chores" });
        }

        const roommates = await resolveRoommatesDetails(hhData);
        return res.json({
          success: true,
          householdId,
          chores: updatedChores,
          roommates,
        });
      } catch (error: any) {
        return res
          .status(500)
          .json({ error: error?.message || "Failed to reassign chores" });
      }
    }
  );

  /**
   * BEGINNNING OF ENDPOINT THAT MIGHT BE DELETED
   */
  // GET household fairness (aggregates chore.points by assignee and returns per-user scores + fairness)
  app.get("/api/household/fairness", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;
    try {
      const qId = String(req.query.id || "").trim();
      const qName = String(req.query.name || "").trim();

      // Resolve household document
      let hhSnap: FirebaseFirestore.DocumentSnapshot | null = null;
      if (qId) {
        hhSnap = await firestore!.collection("households").doc(qId).get();
      } else if (qName) {
        const qq = await firestore!
          .collection("households")
          .where("name", "==", qName)
          .limit(1)
          .get();
        if (!qq.empty) hhSnap = qq.docs[0];
      } else {
        // Try to resolve household from session cookie (chore_user) or fallback to cookie values
        try {
          const raw = readCookie(req, "chore_user");
          if (raw) {
            const decoded = decodeURIComponent(String(raw));
            const cookieUser = JSON.parse(decoded);
            // cookieUser may contain householdId
            const hid =
              cookieUser?.householdId ?? cookieUser?.household?.id ?? null;
            if (hid) {
              hhSnap = await firestore!
                .collection("households")
                .doc(String(hid))
                .get();
            } else {
              // try resolving user's household id from users collection
              const dbUser = await fetchUserFromDb(cookieUser);
              if (dbUser && dbUser.householdId) {
                hhSnap = await firestore!
                  .collection("households")
                  .doc(String(dbUser.householdId))
                  .get();
              }
            }
          }
        } catch (e) {
          // ignore - we'll error below if still not found
        }
      }

      if (!hhSnap || !hhSnap.exists) {
        return res.status(404).json({ error: "Household not found" });
      }

      const hhData: any = hhSnap.data() || {};
      const householdId = hhSnap.id;

      // Resolve users in household (hhData.users may be array of user ids or objects)
      const userIds: string[] = Array.isArray(hhData.users)
        ? hhData.users.map((u: any) =>
          typeof u === "string" ? u : String(u.id)
        )
        : [];

      const users: { id: string; name: string | null }[] = [];
      if (userIds.length > 0) {
        const snaps = await Promise.all(
          userIds.map((uid) =>
            firestore!.collection("users").doc(String(uid)).get()
          )
        );
        for (const s of snaps) {
          if (s.exists) {
            const d: any = s.data() || {};
            users.push({ id: s.id, name: d.name ?? null });
          }
        }
      }

      // Aggregate points by assignee (assignedTo may be string userId or array)
      const chores: any[] = Array.isArray(hhData.chores) ? hhData.chores : [];
      const scores = new Map<string, number>();
      // initialize for all known users
      for (const u of users) scores.set(u.id, 0);

      for (const c of chores) {
        const pts = Number(c.points || 0);
        if (Array.isArray(c.assignedTo)) {
          for (const aid of c.assignedTo) {
            const uid = String(aid);
            scores.set(uid, (scores.get(uid) || 0) + pts);
          }
        } else if (c.assignedTo) {
          const uid = String(c.assignedTo);
          scores.set(uid, (scores.get(uid) || 0) + pts);
        }
      }

      // Ensure every household user appears in perUser
      const perUser = users.map((u) => ({
        id: u.id,
        name: u.name ?? u.id,
        score: scores.get(u.id) ?? 0,
      }));

      // If there are assign-to userIds not in household users, include them too
      for (const [uid, sc] of scores.entries()) {
        if (!perUser.find((p) => p.id === uid)) {
          perUser.push({ id: uid, name: uid, score: sc });
        }
      }

      const totalPoints = perUser.reduce(
        (s, p) => s + (Number(p.score) || 0),
        0
      );

      // Gini coefficient -> fairness (0..100)
      function gini(values: number[]) {
        const n = values.length;
        if (n === 0) return 0;
        const sorted = values.slice().sort((a, b) => a - b);
        const sum = sorted.reduce((s, v) => s + v, 0);
        if (sum === 0) return 0;
        let accum = 0;
        for (let i = 0; i < n; i++) accum += (i + 1) * sorted[i];
        const g = (2 * accum) / (n * sum) - (n + 1) / n;
        return Math.max(0, Math.min(1, g));
      }

      const values = perUser.map((p) => Number(p.score || 0));
      const g = gini(values);
      const fairness = Math.round(Math.max(0, Math.min(100, (1 - g) * 100)));

      return res.json({ householdId, perUser, totalPoints, fairness });
    } catch (err: any) {
      return res
        .status(500)
        .json({ error: err?.message || "Failed to compute fairness" });
    }
  });

  /**
   * END OF ENDPOINT THAT MIGHT BE DELETED
   */

  // New endpoint: trigger assignment for a household (runs algorithm + persists)
  app.post("/api/household/:id/assign", async (req: Request, res: Response) => {
    if (!(await initCollectionsIfNeeded(res))) return;
    try {
      const householdId = String(req.params.id || "").trim();
      if (!householdId)
        return res.status(400).json({ error: "Missing household id" });
      if (!firestore)
        return res.status(500).json({ error: "Firestore not initialized" });

      // Fetch a household object usable by algorithm
      const hh = await fetchHouseholdFromFirestore(householdId);
      if (!hh) return res.status(404).json({ error: "Household not found" });

      // Build flow graph and compute assignments
      const graph = buildFlowGraph(hh);
      const flowResult = minCostMaxFlow(graph);

      // Persist assignments using firebase helper (this updates household chores and user chores atomically)
      const assignmentResult = await assignUserstoChores(flowResult.assignments, householdId);

      return res.json({ success: true, flowResult, assignmentResult });
    } catch (err: any) {
      console.error("Assignment failed:", err);
      return res.status(500).json({ error: err?.message || "Assignment failed" });
    }
  });
}
