import { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import { firestore } from "./firebasesetup";
import { fetchUserFromDb } from "./serverUtils";

// ===================== USER PROFILE & ACCOUNT MANAGEMENT =====================
export function registerAccounts(app: Express) {
  // TODO: get rid of this because this is done in the api/session endpoint
  // Get user by email
  app.get("/api/user/me", async (req: Request, res: Response) => {
    if (!firestore)
      return res.status(500).json({ error: "Firestore not initialized" });

    try {
      const email = String(req.query.email || "")
        .trim()
        .toLowerCase();
      if (!email) {
        return res.status(400).json({ error: "Missing email" });
      }

      // Use helper to fetch user (by id or email)
      const user = await fetchUserFromDb({ email });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

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
    } catch (error) {
      console.log("Internal server error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  // ---- Update user profile fields (email, password, name, pronouns, birthday) ----
  app.put("/api/user/update", async (req: Request, res: Response) => {
    if (!firestore)
      return res.status(500).json({ error: "Firestore not initialized" });

    try {
      const updates = req.body || {};
      const userId = String(req.body.id || req.body.userId || "").trim();
      if (!userId) return res.status(400).json({ error: "Missing user ID" });
      const userRef = firestore.collection("users").doc(userId);
      const userSnap = await userRef.get();

      if (!userSnap.exists)
        return res.status(404).json({ error: "User not found" });

      // Filter allowed update fields
      const allowedUpdates: any = {};
      if (updates.email)
        allowedUpdates.email = String(updates.email).toLowerCase();
      if (updates.password) allowedUpdates.password = updates.password;
      if (updates.name !== undefined) allowedUpdates.name = updates.name;
      if (updates.pronouns !== undefined)
        allowedUpdates.pronouns = updates.pronouns;
      if (updates.bday !== undefined) allowedUpdates.bday = updates.bday;
      if (updates.mascot !== undefined) allowedUpdates.mascot = updates.mascot;
      if (updates.color !== undefined) allowedUpdates.color = updates.color;
      // Handle preferences array: merge incoming preferences by choreId
      if (Array.isArray(updates.preferences)) {
        try {
          const existing = (userSnap.data() || {}).preferences || [];
          const mergedMap: Record<string, any> = {};
          if (Array.isArray(existing)) {
            for (const p of existing) {
              if (p && p.choreId) mergedMap[String(p.choreId)] = p;
            }
          }
          for (const p of updates.preferences) {
            if (p && p.choreId) {
              mergedMap[String(p.choreId)] = {
                choreId: String(p.choreId),
                choreName: p.choreName ?? p.name ?? null,
                preference: p.preference,
              };
            }
          }
          allowedUpdates.preferences = Object.values(mergedMap);
        } catch (e) {
          // fallback: replace entirely
          allowedUpdates.preferences = updates.preferences;
        }
      }

      if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      // Apply updates
      await userRef.set(allowedUpdates, { merge: true });
      const updatedSnap = await userRef.get();
      const updatedUser = { id: updatedSnap.id, ...updatedSnap.data() };

      return res.json({ user: updatedUser });
    } catch (error) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  // ---- Fetch all users (admin/debug) ----
  app.get("/api/users", async (req: Request, res: Response) => {
    if (!firestore)
      return res.status(500).json({ error: "Firestore not initialized" });

    try {
      const usersQuery = await firestore.collection("users").get();
      const users = usersQuery.docs
        .filter((doc) => doc.id !== "_bootstrap")
        .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));

      return res.json({ users });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });
}
