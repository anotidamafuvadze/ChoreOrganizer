// backend/src/users/firebaseHelpers.ts
import { firestore } from "./firebasesetup";

// ...existing code...

// Note: we return `any` shaped objects to avoid circular type imports.
// Consumers (algorithms) can cast to their internal types.

export async function fetchHouseholdFromFirestore(
    householdId: string
): Promise<any | null> {
    if (!firestore) return null;
    const doc = await firestore.collection("households").doc(householdId).get();
    if (!doc.exists) return null;
    const data: any = doc.data() || {};


    const users = (data.users ?? []).map((u: any) => ({
        householdId: doc.id,
        id: u.id ?? u, // support either array of ids or richer objects
        name: u.name ?? null,
        preferences: (u.preferences ?? []).map((p: any) => ({
            chore: data.chores.map((f: any) => f.name === p),
            prefNum: u.get(p),
        })),
        choreHistory: (u.choreHistory ?? []).map((h: any) => ({
            week: h.week,
            chores: (h.chores ?? []).map((c: any) => ({ id: c.id, name: c.name })),
        })),
    }));

    const chores = (data.chores ?? []).map((c: any) => ({ assignedTo: c.assignedTo, completed: c.completed ,id: c.id, name: c.name }));

    const household = {
        id: doc.id,
        name: data.name ?? null,
        users,
        chores,
    };

    // backref users to household if consumer expects it
    household.users.forEach((u: any) => (u.household = household));

    return household;
}

export async function fetchUserByUid(uid: string): Promise<any | null> {
    if (!firestore) return null;
    const doc = await firestore.collection("users").doc(uid).get();
    if (!doc.exists) return null;
    const data: any = doc.data() || {};
    return {
        id: doc.id,
        name: data.name ?? null,
        icon: data.icon ?? "",
        preferences: (data.preferences ?? []).map((p: any) => ({
            chore: {
                id: p.choreId ?? p.chore?.id,
                name: p.choreName ?? p.chore?.name ?? "",
            },
            prefNum: p.prefNum,
        })),
        choreHistory: (data.choreHistory ?? []).map((h: any) => ({
            week: h.week,
            chores: (h.chores ?? []).map((c: any) => ({ id: c.id, name: c.name })),
        })),
        householdId: data.householdId ?? null,
    };
}