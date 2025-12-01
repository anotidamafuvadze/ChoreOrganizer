import { minCostMaxFlow, buildFlowGraph } from "./registerChoreSorter";

describe("minCostMaxFlow", () => {
    test("computes max flow with minimal cost on a small graph", () => {
        const graph = {
            nodes: [
                { id: "source", type: "source" },
                { id: "u1", type: "userClone" },
                { id: "u2", type: "userClone" },
                { id: "c1", type: "chore" },
                { id: "c2", type: "chore" },
                { id: "sink", type: "sink" }
            ],
            edges: [
                { from: "source", to: "u1", capacity: 1, cost: 0 },
                { from: "source", to: "u2", capacity: 1, cost: 0 },
                { from: "u1", to: "c1", capacity: 1, cost: 1 },
                { from: "u1", to: "c2", capacity: 1, cost: 100 },
                { from: "u2", to: "c1", capacity: 1, cost: 100 },
                { from: "u2", to: "c2", capacity: 1, cost: 1 },
                { from: "c1", to: "sink", capacity: 1, cost: 0 },
                { from: "c2", to: "sink", capacity: 1, cost: 0 }
            ]
        };

        const res = minCostMaxFlow(graph as any);
        expect(res.flow).toBe(2);
        expect(res.cost).toBe(2); // best assignment: u1->c1 (1) and u2->c2 (1)
        expect(res.assignments.length).toBe(2);
        // verify assignments reference userClone -> chore node ids present in nodes
        const nodeIds = new Set(graph.nodes.map(n => n.id));
        for (const a of res.assignments) {
            expect(nodeIds.has(a.userClone)).toBe(true);
            expect(nodeIds.has(a.choreNode)).toBe(true);
        }
    });
});

describe("buildFlowGraph", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    test("builds a flow graph with correct counts of userClone and chore nodes", () => {
        // Make Math.random deterministic so cost/noise is stable
        jest.spyOn(Math, "random").mockReturnValue(0);

        // Simple household: 2 users, 3 chores -> baseChores = 1, extraChores = 1 => clones: 2 users => clones per sorted user: [2,1] => total 3
        const household: any = {
            id: 1,
            name: "H",
            users: [
                {
                    id: 1,
                    name: "Alice",
                    icon: "",
                    household: null,
                    preferences: [
                        { chore: { id: 1, name: "Dishes" }, prefNum: 1 },
                        { chore: { id: 2, name: "Trash" }, prefNum: 2 },
                        { chore: { id: 3, name: "Vacuum" }, prefNum: 3 }
                    ],
                    choreHistory: []
                },
                {
                    id: 2,
                    name: "Bob",
                    icon: "",
                    household: null,
                    preferences: [
                        { chore: { id: 1, name: "Dishes" }, prefNum: 2 },
                        { chore: { id: 2, name: "Trash" }, prefNum: 1 },
                        { chore: { id: 3, name: "Vacuum" }, prefNum: 3 }
                    ],
                    choreHistory: []
                }
            ],
            chores: [
                { id: 1, name: "Dishes" },
                { id: 2, name: "Trash" },
                { id: 3, name: "Vacuum" }
            ]
        };

        // link household back-to-users (not strictly necessary but mirrors real data)
        household.users.forEach((u: any) => (u.household = household));

        const graph = buildFlowGraph(household, 1);
        const numChoreNodes = graph.nodes.filter((n: any) => n.type === "chore").length;
        const numUserCloneNodes = graph.nodes.filter((n: any) => n.type === "userClone").length;

        expect(numChoreNodes).toBe(3);
        expect(numUserCloneNodes).toBe(3); // as reasoned above
        // Ensure there are edges from source to each clone and from each chore to sink
        const sourceToClone = graph.edges.filter(e => e.from === "source");
        const choreToSink = graph.edges.filter(e => e.to === "sink");
        expect(sourceToClone.length).toBe(numUserCloneNodes);
        expect(choreToSink.length).toBe(numChoreNodes);
    });
});
