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
    const randomUsers = await firestore.collection("users").doc("9uInoQX5IFdHn4VzNtRO0mzeNeo2").get();
    const randuserData: any = randomUsers.data() || {}

    let users: any[] = [];
    for (const use in data.users) {
        const uId = data.users[use]
        const docUsers = await firestore.collection("users").doc(uId).get();
        const userData: any = docUsers.data() || {}
        const obj = {
            householdId: doc.id,
            id: userData.id ?? null,
            name: userData.name ?? null,
            preferences: userData.preferences,
            // (userData.preferences ?? []).map((p: any) => ({
            //     chore: data.chores.map((f: any) => f.name === p),
            //     prefNum: userData.get(p),
            // })),
            choreHistory: userData.chores
        }
        users.push(obj)

    }

    // const users = (data.users ?? []).map((u: any) => ({
    //     householdId: doc.id,
    //     id: u.id ?? u, // support either array of ids or richer objects
    //     name: u.name ?? null,
    //     preferences: (u.preferences ?? []).map((p: any) => ({
    //         chore: data.chores.map((f: any) => f.name === p),
    //         prefNum: u.get(p),
    //     })),
    //     choreHistory: u.chores
    // }));

    // prefer active chores; if none exist, fall back to pending templates so assignment can run
    const rawChores = (Array.isArray(data.chores) && data.chores.length > 0)
        ? data.chores
        : (Array.isArray(data.pendingChoreTemplates) ? data.pendingChoreTemplates : []);
    const chores = rawChores.map((c: any) => ({ assignedTo: c.assignedTo ?? null, completed: c.completed ?? false, id: c.id, name: c.name }));

    const household = {
        id: doc.id,
        name: data.name ?? null,
        users,
        chores,
        pendingChores: data.pendingChoreTemplates
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

export async function assignUserstoChores(assignments: { userName: string, choreName: string, userId?: string }[], householdId: string) {
    if (!firestore) { throw new Error("Firestore not initialized"); }

    const db = firestore; // narrow for TS
    const hhRef = db.collection("households").doc(String(householdId));

    return db.runTransaction(async (tx) => {
        const hhSnap = await tx.get(hhRef);
        if (!hhSnap.exists) throw new Error("Household not found");

        const hhData: any = hhSnap.data() || {};
        let houseChores;
        if (hhData.chores.length === 0) {
            houseChores = hhData.pendingChoreTemplates
        }
        else {
            houseChores = hhData.chores
        }
        // clone household chores so we can mutate safely
        const householdChores: any[] = Array.isArray(houseChores) ? houseChores.map((c: any) => ({ ...c })) : [];

        // Build a map of choreName -> indices (multiple chores can share a name)
        const choresByName = new Map<string, number[]>();
        householdChores.forEach((c, idx) => {
            const name = String(c.name ?? "");
            const arr = choresByName.get(name) ?? [];
            arr.push(idx);
            choresByName.set(name, arr);
        });

        // Load all users that belong to this household
        const usersSnap = await db.collection("users").where("householdId", "==", String(householdId)).get();
        const userDocs = usersSnap.docs;

        // Map userName -> docSnapshot (first match) and id -> docSnapshot
        const usersByName = new Map<string, FirebaseFirestore.DocumentSnapshot>();
        const usersById = new Map<string, FirebaseFirestore.DocumentSnapshot>();
        userDocs.forEach((d) => {
            const data = d.data() || {};
            const nm = String(data.name ?? "");
            if (!usersByName.has(nm)) usersByName.set(nm, d);
            usersById.set(d.id, d);
        });

        // Capture pre-existing chores per user (ids) so we only delete those that existed before this run
        const preExistingChoreIds = new Map<string, Set<string>>();
        userDocs.forEach((d) => {
            const data = d.data() || {};
            const choresArr = Array.isArray(data.chores) ? data.chores : [];
            preExistingChoreIds.set(d.id, new Set(choresArr.map((ch: any) => String(ch.id))));
        });

        // Track which household chore indices we've assigned in this run (avoid double-assigning same chore)
        const assignedChoreIdx = new Set<number>();

        // Map userId -> Set<choreId> for chores to store for that user after deletions
        const newChoresByUser = new Map<string, Set<string>>();
        // console.log(newChoresByUser)

        // Process assignments: assign household chore entry -> user (update assignedTo + bump dueDate)
        for (const a of assignments) {
            // Prefer passing userId from assignments; fallback to matching by userName
            let userDoc: FirebaseFirestore.DocumentSnapshot | undefined | null = null;
            if (a.userId) {
                userDoc = usersById.get(String(a.userId)) ?? null;
            }
            if (!userDoc) {
                userDoc = usersByName.get(String(a.userName)) ?? null;
            }
            if (!userDoc) {
                // user not found — skip
                continue;
            }
            const userId = userDoc.id;

            // find an available chore index with matching name that hasn't been consumed yet
            const candidates = choresByName.get(String(a.choreName)) ?? [];
            let chosenIdx: number | undefined = undefined;
            for (const idx of candidates) {
                if (!assignedChoreIdx.has(idx)) {
                    chosenIdx = idx;
                    break;
                }
            }
            if (chosenIdx === undefined) {
                // no matching chore available (skip)
                continue;
            }

            assignedChoreIdx.add(chosenIdx);

            // update the in-memory householdChores entry's assignedTo to userId
            const originalChore = householdChores[chosenIdx] || {};
            // bump dueDate by 7 days if present; otherwise set to now+7d
            let newDueDate = originalChore.dueDate ?? null;
            try {
                const base = newDueDate ? Date.parse(String(newDueDate)) : Date.now();
                newDueDate = new Date(base + 7 * 24 * 60 * 60 * 1000).toISOString();
            } catch {
                newDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            }

            // preserve all fields, update assignedTo and dueDate
            householdChores[chosenIdx] = {
                ...originalChore,
                assignedTo: userId,
                dueDate: newDueDate
            };
            // console.log("program runs up to where it should")
            // record this chore id to add to user's chores (store full chore id)
            const choreId = String(householdChores[chosenIdx].id);
            const set = newChoresByUser.get(userId) ?? new Set<string>();
            set.add(choreId);
            newChoresByUser.set(userId, set);
            // console.log("UserID" + userId)
            // console.log("Set" + set)
        }

        // Prepare user updates:
        // For each user doc, either set chores to newly assigned chores (full objects),
        // or if user had pre-existing chores but no new ones assigned, clear them.
        for (const d of userDocs) {
            const userId = d.id;
            const userRef = db.collection("users").doc(userId);
            const existingData = d.data() || {};

            const newSet = newChoresByUser.get(userId);
            //console.log(newSet)
            if (newSet && newSet.size > 0) {
                // Build chores objects to store (preserve full chore fields)
                const choresToStore = Array.from(newSet).map((cid) => {
                    const chore = householdChores.find((hc) => String(hc.id) === String(cid));
                    // ensure returned object contains all household fields
                    return {
                        id: chore?.id ?? cid,
                        name: chore?.name ?? "",
                        assignedTo: chore?.assignedTo ?? userId,
                        completed: chore?.completed ?? false,
                        dueDate: chore?.dueDate ?? null,
                        frequency: chore?.frequency ?? null,
                        icon: chore?.icon ?? null,
                        points: chore?.points ?? null,
                    };
                });

                // Build merged user object and ensure default fields exist
                const updatedUser: any = {
                    id: existingData.id ?? userId,
                    name: existingData.name ?? String(existingData.name ?? ""),
                    bday: existingData.bday ?? null,
                    bootstrap: existingData.bootstrap ?? false,
                    chores: choresToStore,
                    color: existingData.color ?? null,
                    email: existingData.email ?? null,
                    householdId: existingData.householdId ?? existingData.householdId ?? null,
                    joined: existingData.joined ?? new Date().toISOString(),
                    mascot: existingData.mascot ?? null,
                    password: existingData.password ?? null,
                    preferences: existingData.preferences ?? {},
                    pronouns: existingData.pronouns ?? null,
                };

                // merge into user doc
                tx.set(userRef, updatedUser, { merge: true });
            } else {
                // If user had pre-existing chores at start, remove them (set to empty array)
                const pre = preExistingChoreIds.get(userId);
                if (pre && pre.size > 0) {
                    tx.update(userRef, { chores: [] });
                }
                // otherwise leave user untouched
            }
        }

        // Update household chores array with modified assignedTo/dueDate values
        tx.update(hhRef, { chores: householdChores });

        return { success: true, updatedHouseholdChores: householdChores.length, updatedUsers: newChoresByUser.size };
    });
}