import { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import { firestore } from "./firebasesetup";
import {
  validateLoginRequest,
  resolveRoommatesDetails,
  setSessionCookies,
  readCookie,
  fetchUserFromDb,
} from "./serverUtils";

// ===================== AUTHENTICATION & SESSION MANAGEMENT =====================
export function registerAuthSessions(app: Express) {
 
  // ---- Authenticate user and resolve household context ----
	app.post("/api/user/login", async (req: Request, res: Response) => {
    if (!firestore) return res.status(500).json({ error: "Firestore not initialized" });

    try {
      const validated = validateLoginRequest(req.body);
      if (!validated.ok) return res.status(400).json({ error: validated.error });

      // Fetch user from database
      const { email, password, authProvider } = validated;
      const user = await fetchUserFromDb({ email });
      if (!user) return res.status(404).json({ error: "User not found" });

      // Validate password for non-OAuth login
      if (!authProvider && user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      let inviteCode: string | null = null;
      let householdId: string | null = null;
      let householdName: string | null = null;

      // Fetch household information if user belongs to one
      if (user.householdId) {
        householdId = String(user.householdId);
        const householdSnap = await firestore
          .collection("households")
          .doc(householdId)
          .get();
        
        if (householdSnap.exists) {
          const householdData = householdSnap.data() || {};
          inviteCode = householdData.inviteCode || null;
          householdName = householdData.name || null;
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

  // ---- Clear authentication session and logout user ----
	app.post("/api/user/logout", async (req: Request, res: Response) => {
    try {
      const cookieOptions = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
      };

      // Clear all session cookies
      res.clearCookie("chore_user", cookieOptions);
      res.clearCookie("chore_household", cookieOptions);
      res.clearCookie("chore_invite", cookieOptions);

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to clear session",
      });
    }
  });


  // ---- Initialize session and set auth cookies ----
  app.post("/api/session", async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const clientUser = body.user || null;
      const householdNameInput = body.householdName ?? null;
      const inviteCodeInput = body.inviteCode ?? null;

      if (!clientUser) return res.status(400).json({ error: "Missing user" });

      // Fetch user from database
      const dbUser = await fetchUserFromDb(clientUser);
      const sessionUser = dbUser ?? clientUser;

      let householdName = householdNameInput;
      let inviteCode = inviteCodeInput;
      let householdId: string | null = null;
      let roommates: any[] | null = null;

      // Resolve household info if user belongs to one
      if (dbUser && dbUser.householdId) {
        householdId = String(dbUser.householdId);
        try {
          const householdSnap = firestore
            ? await firestore
                .collection("households")
                .doc(String(dbUser.householdId))
                .get()
            : ({ exists: false } as any);

          if (householdSnap.exists) {
            const householdData = householdSnap.data() || {};
            householdName = householdData.name ?? householdName;
            inviteCode = householdData.inviteCode ?? inviteCode;
            // resolve roommates to include in session response
            try {
              roommates = await resolveRoommatesDetails(householdData);
            } catch {
              roommates = null;
            }
          }
        } catch (error) {
          // Silently fail on household lookup; session can proceed without updated info
        }
      }

      // Set session cookies
      setSessionCookies(res, sessionUser, householdName, inviteCode);

      return res.json({
        success: true,
        user: {
          id: sessionUser.id,
          email: sessionUser.email,
          householdId: sessionUser.householdId,
        },
        householdId,
        householdName,
        inviteCode,
        roommates,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to set session",
      });
    }
  });

	// ---- Restore session from cookies ----
  app.get("/api/session", async (req: Request, res: Response) => {
    if (!firestore) return res.status(500).json({ error: "Firestore not initialized" });

    try {
      // Read and parse user cookie
      const rawUserCookie = readCookie(req, "chore_user");
      if (!rawUserCookie) return res.status(404).json({ error: "No session" });

      let cookieUser: any = null;
      try {
        const decoded = decodeURIComponent(String(rawUserCookie));
        cookieUser = JSON.parse(decoded);
      } catch (error) {
        res.clearCookie("chore_user", { path: "/" });
        return res.status(400).json({ error: "Invalid session cookie" });
      }

      // Fetch user from database or use cookie data
      const dbUser = await fetchUserFromDb(cookieUser);
      const user = dbUser ?? cookieUser;

      let inviteCode: string | null = null;
      let householdId: string | null = null;
      let householdName: string | null = null;
      let roommates: any[] | null = null;

      // If user belongs to a household, fetch household data
      if (user && user.householdId) {
        householdId = String(user.householdId);
        const db = firestore;

        const householdSnap = await (db as any)
          .collection("households")
          .doc(householdId)
          .get();

        if (householdSnap.exists) {
          const householdData = householdSnap.data() || {};
          inviteCode = householdData.inviteCode || null;
          householdName = householdData.name || null;
          try {
            roommates = await resolveRoommatesDetails(householdData);
          } catch {
            roommates = null;
          }
        }
      } 
      // Otherwise, check for household data in cookies (pre-join state)
      else {
        const householdCookie = readCookie(req, "chore_household");
        const inviteCookie = readCookie(req, "chore_invite");
        if (householdCookie) householdName = decodeURIComponent(householdCookie);
        if (inviteCookie) inviteCode = decodeURIComponent(inviteCookie);
      }

      // Refresh session cookies
      try {
        setSessionCookies(res, user, householdName, inviteCode);
      } catch (error) {
        // Silently fail on cookie refresh; session remains valid
      }

      return res.json({ user, inviteCode, householdId, householdName, roommates });
    } catch (error) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });
}