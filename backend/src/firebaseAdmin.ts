import admin from "firebase-admin";

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            ...(process.env.FIREBASE_SERVICE_ACCOUNT_JSON
                ? {
                    credential: admin.credential.cert(
                        JSON.parse(String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
                    ),
                }
                : {}),
        });
    } catch (e) {
        console.error("firebase-admin initialization error:", e);
    }
}

export const firestore = admin.firestore();

// Lightweight helpers — return plain objects shaped to your needs.
// Use `any` here to avoid circular type imports; you can tighten types later.

export async function fetchHouseholdFromFirestore(householdId: string): Promise<any | null> {
    const doc = await firestore.collection("households").doc(householdId).get();
    if (!doc.exists) return null;
    const data: any = doc.data();

    const users = (data.users ?? []).map((u: any) => ({
        id: u.id,
        name: u.name,
        icon: u.icon ?? "",
        preferences: (u.preferences ?? []).map((p: any) => ({
            chore: { id: p.choreId, name: p.choreName ?? "" },
            prefNum: p.prefNum,
        })),
        choreHistory: (u.choreHistory ?? []).map((h: any) => ({
            week: h.week,
            chores: (h.chores ?? []).map((c: any) => ({ id: c.id, name: c.name })),
        })),
    }));

    const chores = (data.chores ?? []).map((c: any) => ({ id: c.id, name: c.name }));

    const household = {
        id: householdId,
        name: data.name ?? "Household",
        users,
        chores,
    };

    // backref users to household if consumer expects that
    household.users.forEach((u: any) => (u.household = household));
    return household;
}

export async function fetchUserByUid(uid: string): Promise<any | null> {
    const doc = await firestore.collection("users").doc(uid).get();
    if (!doc.exists) return null;
    const u: any = doc.data();
    return {
        id: u.id ?? uid,
        name: u.name ?? "You",
        icon: u.icon ?? "",
        preferences: (u.preferences ?? []).map((p: any) => ({
            chore: { id: p.choreId, name: p.choreName ?? "" },
            prefNum: p.prefNum,
        })),
        choreHistory: (u.choreHistory ?? []).map((h: any) => ({
            week: h.week,
            chores: (h.chores ?? []).map((c: any) => ({ id: c.id, name: c.name })),
        })),
    };
}
