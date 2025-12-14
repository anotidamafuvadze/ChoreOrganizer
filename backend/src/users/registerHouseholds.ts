import { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import { firestore } from "./firebasesetup";
import {
  resolveRoommatesDetails,
  readCookie,
  fetchUserFromDb,
} from "./serverUtils";

import {
  buildFlowGraph,
  minCostMaxFlow,
} from "../algorithms/registerChoreSorter";
import {
  assignUserstoChores,
  fetchHouseholdFromFirestore,
} from "./firebaseHelpers";

// ===================== HOUSEHOLD MANAGEMENT =====================
export function registerHouseholds(app: Express) {
  // ---- Fetch household roommates ----
  app.get(
    "/api/household/:id/roommates",
    async (req: Request, res: Response) => {
      if (!firestore)
        return res.status(500).json({ error: "Firestore not initialized" });

      try {
        const householdId = String(req.params.id || "").trim();
        if (!householdId)
          return res.status(400).json({ error: "Missing household id" });

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

  // ---- Fetch household details and auto-rotate chore assignments ----
  app.get("/api/household/:id", async (req: Request, res: Response) => {
    if (!firestore)
      return res.status(500).json({ error: "Firestore not initialized" });

    try {
      const householdId = String(req.params.id || "").trim();
      if (!householdId)
        return res.status(400).json({ error: "Missing household id" });
      const hhSnap = await firestore
        .collection("households")
        .doc(householdId)
        .get();
      if (!hhSnap.exists)
        return res.status(404).json({ error: "Household not found" });

      const hhData = hhSnap.data() || {};
      const hhRef = firestore.collection("households").doc(householdId);
      let chores = Array.isArray(hhData.chores) ? hhData.chores : [];

      // If over 7 days since last reassignment, rebalance chores round-robin.
      try {
        const last = hhData.lastReassignedAt
          ? Date.parse(String(hhData.lastReassignedAt))
          : 0;
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        if (!last || now - last > sevenDays) {
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

            try {
              await hhRef.update({
                chores: rebalanced,
                lastReassignedAt: new Date().toISOString(),
              });
            } catch (e) {
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

  // ---- Reassign household chores (round-robin or manual assignments) ----
  app.post(
    "/api/household/:id/reassign",
    async (req: Request, res: Response) => {
      if (!firestore)
        return res.status(500).json({ error: "Firestore not initialized" });

      try {
        const householdId = String(req.params.id || "").trim();
        if (!householdId)
          return res.status(400).json({ error: "Missing household id" });
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

        // If household has no users array, fetch them from the users collection
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

        // Default to round-robin if no strategy specified
        const strategy = String(
          (req.body && req.body.strategy) || "round-robin"
        );

        let updatedChores: any[] = [];
        if (strategy === "round-robin") {
          // Round-robin assignment
          const count = householdUsers.length;
          updatedChores = householdChores.map((c: any, idx: number) => {
            const chore = { ...(c || {}) };
            chore.assignedTo = String(householdUsers[idx % count]);
            return chore;
          });
        } else if (Array.isArray(req.body?.assignments)) {
          // Manual assignments: [{ choreId, userId }, ...]
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
        return res.status(500).json({
          error: error?.message || "Failed to reassign chores",
        });
      }
    }
  );

  // ---- Assign household chores using optimization algorithm (min-cost max-flow) ----
  app.post("/api/household/:id/assign", async (req: Request, res: Response) => {
    if (!firestore)
      return res.status(500).json({ error: "Firestore not initialized" });

    try {
      const householdId = String(req.params.id || "").trim();
      if (!householdId)
        return res.status(400).json({ error: "Missing household id" });

      // Fetch household data
      const hh = await fetchHouseholdFromFirestore(householdId);
      if (!hh) return res.status(404).json({ error: "Household not found" });

      // Build flow graph and compute assignments using min‑cost max‑flow
      const graph = buildFlowGraph(hh);
      const flowResult = minCostMaxFlow(graph);

      // Persist assignments (updates household chores and user chores atomically)
      const assignmentResult = await assignUserstoChores(
        flowResult.assignments,
        householdId
      );

      return res.json({ success: true, flowResult, assignmentResult });
    } catch (err: any) {
      console.error("Assignment failed:", err);
      return res
        .status(500)
        .json({ error: err?.message || "Assignment failed" });
    }
  });

  // ---- Add a pending chore template to household ----
  app.post(
    "/api/household/:id/pending-template",
    async (req: Request, res: Response) => {
      if (!firestore)
        return res.status(500).json({ error: "Firestore not initialized" });

      try {
        const householdId = String(req.params.id || "").trim();
        if (!householdId)
          return res.status(400).json({ error: "Missing household id" });

        const hhRef = firestore.collection("households").doc(householdId);
        const hhSnap = await hhRef.get();
        if (!hhSnap.exists)
          return res.status(404).json({ error: "Household not found" });

        const hhData: any = hhSnap.data() || {};
        const existing: any[] = Array.isArray(hhData.pendingChoreTemplates)
          ? hhData.pendingChoreTemplates
          : [];

        const payload = req.body || {};
        const name = String(payload.name || payload.choreName || "").trim();
        if (!name) return res.status(400).json({ error: "Missing chore name" });

        const frequency = String(payload.frequency || "Weekly");
        const points = Number(payload.points || 5);
        const icon = payload.icon || null;

        const newTemplate = {
          id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8),
          name,
          frequency,
          points,
          icon,
          createdAt: new Date().toISOString(),
        };

        // Merge and persist (simple append + dedupe by id)
        const merged = [...existing, newTemplate];
        const map = new Map<string, any>();
        for (const t of merged) {
          if (!t) continue;
          const id = String(t.id ?? t._id ?? Math.random());
          if (!map.has(id)) map.set(id, t);
        }

        try {
          await hhRef.update({
            pendingChoreTemplates: Array.from(map.values()),
          });
        } catch (err) {
          return res
            .status(500)
            .json({ error: "Failed to persist chore template" });
        }

        const roommates = await resolveRoommatesDetails(hhData);
        return res.json({
          success: true,
          householdId,
          template: newTemplate,
          roommates,
        });
      } catch (err: any) {
        return res
          .status(500)
          .json({ error: err?.message || "Failed to add template" });
      }
    }
  );

  // ---- Promote pending templates into active chores ----
  app.post(
    "/api/household/:id/promote-templates",
    async (req: Request, res: Response) => {
      if (!firestore)
        return res.status(500).json({ error: "Firestore not initialized" });

      try {
        const householdId = String(req.params.id || "").trim();
        if (!householdId)
          return res.status(400).json({ error: "Missing household id" });

        const hhRef = firestore.collection("households").doc(householdId);
        const hhSnap = await hhRef.get();
        if (!hhSnap.exists)
          return res.status(404).json({ error: "Household not found" });

        const hhData: any = hhSnap.data() || {};
        const pending: any[] = Array.isArray(hhData.pendingChoreTemplates)
          ? hhData.pendingChoreTemplates
          : [];
        if (pending.length === 0) {
          return res.json({
            success: true,
            householdId,
            chores: Array.isArray(hhData.chores) ? hhData.chores : [],
          });
        }

        const existingChores: any[] = Array.isArray(hhData.chores)
          ? hhData.chores
          : [];

        // Promote each template into a chore entry (keep id and fields)
        const promoted = pending.map((t: any) => {
          const chore = { ...(t || {}) };
          // ensure no template-only fields remain
          delete chore.createdAt;
          return chore;
        });

        const mergedChores = [...existingChores, ...promoted];

        try {
          await hhRef.update({
            chores: mergedChores,
            pendingChoreTemplates: [],
          });
        } catch (err) {
          return res
            .status(500)
            .json({ error: "Failed to persist promoted chores" });
        }

        const roommates = await resolveRoommatesDetails(hhData);
        return res.json({
          success: true,
          householdId,
          chores: mergedChores,
          roommates,
        });
      } catch (err: any) {
        return res
          .status(500)
          .json({ error: err?.message || "Failed to promote templates" });
      }
    }
  );

  // ---- Update a single chore's fields ----
  app.put(
    "/api/household/:id/chore/:choreId",
    async (req: Request, res: Response) => {
      if (!firestore)
        return res.status(500).json({ error: "Firestore not initialized" });

      try {
        const householdId = String(req.params.id || "").trim();
        const choreId = String(req.params.choreId || "").trim();
        if (!householdId || !choreId)
          return res.status(400).json({ error: "Missing ids" });

        const hhRef = firestore.collection("households").doc(householdId);
        const hhSnap = await hhRef.get();
        if (!hhSnap.exists)
          return res.status(404).json({ error: "Household not found" });

        const hhData: any = hhSnap.data() || {};
        const chores: any[] = Array.isArray(hhData.chores) ? hhData.chores : [];

        const idx = chores.findIndex(
          (c: any) =>
            String(c.id) === String(choreId) ||
            String(c._id) === String(choreId)
        );
        if (idx === -1)
          return res.status(404).json({ error: "Chore not found" });

        const payload = req.body || {};
        const allowed = ["name", "frequency", "points", "icon", "assignedTo"];
        const updated = { ...(chores[idx] || {}) };
        for (const k of allowed) {
          if (payload[k] !== undefined) updated[k] = payload[k];
        }

        const newChores = [...chores];
        newChores[idx] = updated;

        try {
          await hhRef.update({ chores: newChores });
        } catch (e) {
          return res
            .status(500)
            .json({ error: "Failed to persist chore update" });
        }

        const roommates = await resolveRoommatesDetails(hhData);
        return res.json({
          success: true,
          householdId,
          chore: updated,
          chores: newChores,
          roommates,
        });
      } catch (err: any) {
        return res
          .status(500)
          .json({ error: err?.message || "Failed to update chore" });
      }
    }
  );

  /**
   * BEGINNNING OF ENDPOINT THAT MIGHT BE DELETED
   */
  // GET household fairness (aggregates chore.points by assignee and returns per-user scores + fairness)
  app.get("/api/household/fairness", async (req: Request, res: Response) => {
    if (!firestore)
      return res.status(500).json({ error: "Firestore not initialized" });

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
}
