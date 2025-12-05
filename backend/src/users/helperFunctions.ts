import { Response, Request } from "express";
import { firestore } from "./firebasesetup";

// Generate a random 6-digit invite code
export function makeInviteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Convert client chores to household chore objects with proper assignments
export function clientChoresToHouseholdChores(clientChores: any[], userIds: string[]) {
  
  // TODO: Replace with real due date calculation based on frequency and last completion date
  function mockDueDateISO(frequency: string) {
    const today = new Date();
    if (frequency === "daily") today.setDate(today.getDate() + 1);
    else if (frequency === "weekly") today.setDate(today.getDate() + 7);
    else if (frequency === "biweekly") today.setDate(today.getDate() + 14);
    else today.setDate(today.getDate() + 3);
    return today.toISOString();
  }

  return clientChores.map((c, index) => {
    const assignedTo = userIds && userIds.length ? 
      String(userIds[index % userIds.length]) : 
      null;

    return {
      id: `chore_${index + 1}`,
      name: c.name || `Chore ${index + 1}`,
      icon: c.icon || null,
      frequency: c.frequency || "weekly",
      points: typeof c.points === "number" ? c.points : 3,
      assignedTo,
      dueDate: mockDueDateISO(c.frequency || "weekly"),
      completed: !!c.completed,
    };
  });
}

// NEW: set session cookies (used by backend)
export function setSessionCookies(res: Response, user: any, householdName?: string | null, inviteCode?: string | null) {
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
    // Silently ignore cookie errors
  }
}

// NEW: clear session cookies (used by backend logout)
export function clearSessionCookies(res: Response) {
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  // Try to expire cookies and clear
  res.cookie("chore_user", "", { ...cookieOpts, maxAge: 0 });
  res.cookie("chore_household", "", { ...cookieOpts, maxAge: 0 });
  res.cookie("chore_invite", "", { ...cookieOpts, maxAge: 0 });

  res.clearCookie("chore_user", cookieOpts);
  res.clearCookie("chore_household", cookieOpts);
  res.clearCookie("chore_invite", cookieOpts);
}

// NEW: read cookie helper (works with cookie-parser or raw header)
export function readCookie(req: Request, name: string): string | null {
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

// NEW: fetch user from Firestore by id or email (returns canonical DB record or null)
export async function fetchUserFromDb(candidate: any): Promise<any | null> {
  try {
    if (!firestore) return null;

    const id = candidate?.id || candidate?.userId || null;
    if (id) {
      const snap = await firestore.collection("users").doc(String(id)).get();
      if (snap.exists) return { id: snap.id, ...snap.data() };
    }

    const email = candidate?.email ? String(candidate.email).toLowerCase() : null;
    if (email) {
      const q = await firestore.collection("users").where("email", "==", email).limit(1).get();
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