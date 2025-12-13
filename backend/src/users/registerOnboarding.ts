import { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import { firestore } from "./firebasesetup";
import {
  clientChoresToHouseholdChores,
  makeInviteCode,
  validateCreateUserRequest,
  initCollectionsIfNeeded,
  resolveRoommateNames,
} from "./serverUtils";

// ===================== USER ONBOARDING & INVITATIONS =====================
export function registerOnboarding(app: Express) {
  
  // ---- Resolve household from invite code ----
  app.get("/api/user/invite/:code", async (req: Request, res: Response) => {
    if (!firestore) return res.status(500).json({ error: "Firestore not initialized" });

    try {
      const inviteCode = String(req.params.code || "").trim();
      if (!inviteCode) return res.status(400).json({ error: "Missing invite code" });

      // Look up household by invite code
      const householdQuery = await firestore
        .collection("households")
        .where("inviteCode", "==", inviteCode)
        .limit(1)
        .get();

      if (householdQuery.empty) {
        return res.status(404).json({ error: "Invite code not found" });
      }

      const householdDoc = householdQuery.docs[0];
      const householdData = householdDoc.data() || {};

      // Get roommate names for the household
      const roommates = await resolveRoommateNames(householdData);

      return res.json({
        id: householdDoc.id,
        name: householdData.name || null,
        inviteCode: householdData.inviteCode || null,
        roommates,
      });
    } catch (error) {
      console.error("Internal server error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });


  // ---- Create user (join via invite code or create new household) ----
  app.post("/api/user", async (req: Request, res: Response) => {
    
    if (!firestore) return res.status(500).json({ error: "Firestore not initialized" });
    if (!(await initCollectionsIfNeeded(res))) return;

    try {
      const validation = validateCreateUserRequest(req.body);
      if (!validation.ok) return res.status(400).json({ error: validation.error });

      const inviteCode = req.body?.inviteCode
        ? String(req.body.inviteCode).trim()
        : null;
      const clientUser = req.body?.user || {};
      const userId = String(clientUser.id || req.body.userId || "").trim();
      const email = String(clientUser.email).toLowerCase();

      // Join existing household with invite code
      if (inviteCode) {
        const householdQuery = await firestore
          .collection("households")
          .where("inviteCode", "==", inviteCode)
          .limit(1)
          .get();

        const householdDoc = householdQuery.docs[0];
        const householdRef = householdDoc.ref;
        const householdData = householdDoc.data() || {};

        // Create user document
        const userRef = firestore.collection("users").doc(userId);
        const userPayload = {
          id: userId,
          name: clientUser.name ?? null,
          bday: clientUser.bday ?? null,
          mascot: clientUser.mascot ?? null,
          color: clientUser.color ?? null,
          preferences: clientUser.preferences ?? {},
          chores: clientUser.chores ?? [],
          householdId: householdRef.id,
          email,
          password: clientUser.password ?? null,
          pronouns: clientUser.pronouns ?? null,
          joined: new Date().toISOString(),
        };

        await userRef.set(userPayload, { merge: true });
        await userRef.set({ householdName: householdData.name || null }, { merge: true });

        const finalUserSnap = await userRef.get();
        const finalUser = { id: finalUserSnap.id, ...finalUserSnap.data() };

        return res.status(200).json({
          success: true,
          inviteCode,
          householdId: householdRef.id,
          householdName: householdData.name || null,
          user: finalUser,
        });
      }

      // Create new household for the user
      const householdName = req.body?.householdName || clientUser.householdName;
      const userRef = firestore.collection("users").doc(userId);

      // Create user document
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

      await userRef.set(userPayload, { merge: true });

      // Create household document
      const newInviteCode = makeInviteCode();
      const householdRef = firestore.collection("households").doc();
      const householdId = householdRef.id;

      const choresForHousehold = clientChoresToHouseholdChores(
        clientUser.chores,
        [userId]
      );

      await householdRef.set({
        id: householdId,
        name: householdName,
        inviteCode: newInviteCode,
        users: [userId],
        chores: [],
        pendingChoreTemplates: choresForHousehold,
        createdAt: new Date().toISOString(),
      });

      await userRef.set({ householdId, householdName }, { merge: true });

      const finalUserSnap = await userRef.get();
      const finalUser = { id: finalUserSnap.id, ...finalUserSnap.data() };

      return res.status(200).json({
        success: true,
        inviteCode: newInviteCode,
        householdId,
        householdName,
        user: finalUser,
      });
    } catch (error: any) {
      console.log("Internal server error:", error);
      return res.status(500).json({
        error: error?.message || "Internal server error",
        stack: error?.stack, // remove later
      });
    }
  });


  // ---- Finalize household membership (add user + sync chores/templates) ----
	app.post("/api/user/finalize-household", async (req: Request, res: Response) => {
    if (!firestore) return res.status(500).json({ error: "Firestore not initialized" });
    if (!(await initCollectionsIfNeeded(res))) return;

    try {
      const userId = String(req.body.userId || "").trim();
      const householdId = String(req.body.householdId || "").trim();
      if (!userId) return res.status(400).json({ error: "Missing userId" });
      if (!householdId) return res.status(400).json({ error: "Missing householdId" });

      // Get user document
      const userRef = firestore.collection("users").doc(userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

      const userData = userSnap.data() || {};
      const userChores = Array.isArray(userData.chores) ? userData.chores : [];

      // Get household document
      const householdRef = firestore.collection("households").doc(householdId);
      const householdSnap = await householdRef.get();
      if (!householdSnap.exists) return res.status(404).json({ error: "Household not found" });

      const householdData = householdSnap.data() || {};
      let householdUsers: string[] = Array.isArray(householdData.users) 
        ? householdData.users.map(String) 
        : [];
      let householdChores: any[] = Array.isArray(householdData.chores) 
        ? householdData.chores 
        : [];

      // Deduplicate household chores by ID to prevent issues from repeated calls
      if (householdChores.length > 1) {
        const seenIds = new Map<string, any>();
        for (const chore of householdChores) {
          if (!chore) continue;
          const id = String(chore.id ?? chore._id ?? Math.random());
          if (!seenIds.has(id)) seenIds.set(id, chore);
        }
        householdChores = Array.from(seenIds.values());
      }

      // Add user to household if not already present
      if (!householdUsers.includes(userId)) {
        householdUsers.push(userId);
      }

      const userUpdate = {
        householdId,
        householdName: householdData.name || null,
        chores: [] // Clear personal chores; UI will use household data
      };

      // Household has existing chores: preserve assignments, only add user
      if (householdChores.length > 0) {
        await householdRef.update({ users: householdUsers });
        await userRef.set(userUpdate, { merge: true });
      } 
      // No chores yet: convert user's chores to pending templates
      else {
        const newTemplates = clientChoresToHouseholdChores(userChores, [userId]);
        const existingTemplates = Array.isArray(householdData.pendingChoreTemplates) 
          ? householdData.pendingChoreTemplates 
          : [];
        
        // Merge and deduplicate templates
        const mergedTemplates = [...existingTemplates, ...newTemplates];
        const templateMap = new Map<string, any>();
        for (const template of mergedTemplates) {
          if (!template) continue;
          const id = String(template.id ?? template._id ?? Math.random());
          if (!templateMap.has(id)) templateMap.set(id, template);
        }

        await householdRef.update({
          users: householdUsers,
          pendingChoreTemplates: Array.from(templateMap.values())
        });
        await userRef.set(userUpdate, { merge: true });
      }

      return res.json({
        success: true,
        householdId,
        message: "User successfully added to household"
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error?.message || "Failed to finalize household membership"
      });
    }
  });




}