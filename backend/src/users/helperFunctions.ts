import { Response } from "express";

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