import { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import { firestore } from "./firebasesetup";
import admin from "firebase-admin";

// ===================== CHORES, CALENDAR & COMPLETION =====================
export function registerChores(app: Express) {
  
  // TODO: Replace with api/session parameter in chore list
  // ---- Fetch chores assigned to a user (resolve via userId or email) ----
  app.get("/api/chores", async (req: Request, res: Response) => {
    if (!firestore) return res.status(500).json({ error: "Firestore not initialized" });

    try {
      // Support userId or email query parameter
      let userId = String(req.query.userId || "").trim();
      const emailQuery = String(req.query.email || "").trim().toLowerCase();

      if (!userId && !emailQuery) {
        return res.status(400).json({ error: "Missing userId or email query param" });
      }

      // Resolve userId from email if only email is provided
      if (!userId && emailQuery) {
        const userQuery = await firestore
          .collection("users")
          .where("email", "==", emailQuery)
          .limit(1)
          .get();
        
        if (userQuery.empty) {
          return res.status(404).json({ error: "User not found for provided email" });
        }
        
        const userDoc = userQuery.docs[0];
        userId = userDoc.id;
      }

      // Fetch user document
      const userSnap = await firestore.collection("users").doc(userId).get();
      if (!userSnap.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = userSnap.data() || {};
      const householdId = userData.householdId || null;
      
      // Return empty array if user doesn't belong to a household
      if (!householdId) {
        return res.json({ chores: [] });
      }

      // Fetch household chores
      const householdSnap = await firestore
        .collection("households")
        .doc(String(householdId))
        .get();
      
      if (!householdSnap.exists) {
        return res.status(404).json({ error: "Household not found" });
      }

      const householdData = householdSnap.data() || {};
      const allChores: any[] = Array.isArray(householdData.chores) ? householdData.chores : [];

      // Filter chores assigned to the user (handles both array and string assignment)
      const assignedChores = allChores.filter((chore) => {
        let assignedTo: string[] = [];

        if (Array.isArray(chore.assignedTo)) {
          assignedTo = chore.assignedTo.map(String);
        } else if (typeof chore.assignedTo === "string") {
          assignedTo = [chore.assignedTo];
        }

        return assignedTo.includes(userId);
      });

      return res.json({
        chores: assignedChores,
        householdId: householdSnap.id,
        householdName: householdData.name || null,
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch chores" });
    }
  });

  // ---- Toggle chore completion and update user points atomically ----
  app.post("/api/chores/:id/complete", async (req: Request, res: Response) => {
    if (!firestore) return res.status(500).json({ error: "Firestore not initialized" });

    try {
      const choreId = String(req.params.id || "").trim();
      if (!choreId) return res.status(400).json({ error: "Missing chore id" });

      const userId = String(req.body.userId || "").trim();
      if (!userId) return res.status(400).json({ error: "Missing userId in body" });

      // Default to true if completion status not specified
      const requestedCompleted = req.body.completed === undefined ? true : !!req.body.completed;

      const userRef = firestore.collection("users").doc(userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

      const userData = userSnap.data() || {};
      const householdId = userData.householdId || null;
      if (!householdId) return res.status(400).json({ error: "User has no household" });

      const householdRef = firestore.collection("households").doc(String(householdId));

      // Use transaction for atomic updates to household and user
      await firestore.runTransaction(async (transaction) => {
        const householdSnap = await transaction.get(householdRef);
        if (!householdSnap.exists) throw new Error("Household not found");
        
        const householdData = householdSnap.data() || {};
        const chores: any[] = Array.isArray(householdData.chores) ? householdData.chores : [];

        const choreIndex = chores.findIndex((chore) => String(chore.id) === choreId);
        if (choreIndex === -1) throw new Error("Chore not found in household");

        const chore = chores[choreIndex] || {};
        const wasCompleted = !!chore.completed;

        // Update chore with completion status and metadata
        const updatedChore = {
          ...chore,
          completed: requestedCompleted,
          lastCompletedAt: requestedCompleted ? new Date().toISOString() : null,
          lastCompletedBy: requestedCompleted ? userId : null,
        };

        chores[choreIndex] = updatedChore;
        transaction.update(householdRef, { chores });

        // Adjust user points if completion state changed
        const points = Number(chore.points || 0);
        let pointDelta = 0;
        
        if (!wasCompleted && requestedCompleted) pointDelta = points;
        else if (wasCompleted && !requestedCompleted) pointDelta = -points;

        if (pointDelta !== 0) {
          transaction.update(userRef, {
            points: admin.firestore.FieldValue.increment(pointDelta),
          });
        }
      });

      // Fetch updated data to return in response
      const updatedUserSnap = await firestore.collection("users").doc(userId).get();
      const updatedUser = updatedUserSnap.exists
        ? { id: updatedUserSnap.id, ...updatedUserSnap.data() }
        : null;

      const updatedHouseholdSnap = await firestore
        .collection("households")
        .doc(String(userData.householdId))
        .get();
      
      const updatedHouseholdData = updatedHouseholdSnap.exists ? updatedHouseholdSnap.data() || {} : {};
      const updatedChores: any[] = Array.isArray(updatedHouseholdData.chores) ? updatedHouseholdData.chores : [];
      const updatedChore = updatedChores.find((chore) => String(chore.id) === choreId) || null;

      return res.json({ success: true, chore: updatedChore, user: updatedUser });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update chore";
      return res.status(500).json({ error: errorMessage });
    }
  });


  // ---- Fetch chores for calendar view ----
  app.get("/api/chores/calendar", async (req: Request, res: Response) => {
    if (!firestore) return res.status(500).json({ error: "Firestore not initialized" });
    
    const { householdId, weekOffset, month } = req.query;

    if (!householdId) {
      return res.status(400).json({ error: "Missing householdId parameter" });
    }

    // Fetch household document
    const hhSnap = await firestore
      .collection("households")
      .doc(String(householdId))
      .get();
    if (!hhSnap.exists) return res.status(404).json({ error: "Household not found" });
    
    const hhData = hhSnap.data() || {};
    const allChores: any[] = Array.isArray(hhData.chores) ? hhData.chores : [];

    // Filter chores by week or month (currently skipped for testing)
    let filteredChores = allChores;

    // SKIPPING FILTERING FOR TESTING
    // if (weekOffset !== undefined) {
    //   // Calculate start and end of the week
    //   const now = new Date();
    //   const offset = Number(weekOffset) || 0;
    //   const startOfWeek = new Date(now);
    //   startOfWeek.setDate(now.getDate() - now.getDay() + offset * 7);
    //   startOfWeek.setHours(0, 0, 0, 0);
    //   const endOfWeek = new Date(startOfWeek);
    //   endOfWeek.setDate(startOfWeek.getDate() + 7);
    // 
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
      const dateObj = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
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

    // Calculate completion statistics
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

  
  

}
