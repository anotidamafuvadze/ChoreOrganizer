import express, { Request, Response } from "express";
const app = express();
app.use(express.json());


type Household = { id: number, name: string, users: User[], chores: Chore[] }
type Chore = { id: number, name: string }
type User = {
    name: String,
    id: number,
    icon: string,
    household: Household,
    preferences: [{ chore: Chore, prefNum: number }],
    choreHistory: [{ week: number, chores: Chore[] }]
}
type FlowNodeID = string;

interface FlowNode {
    id: FlowNodeID;
    type: "source" | "sink" | "userClone" | "chore";
}

interface FlowEdge {
    from: FlowNodeID;
    to: FlowNodeID;
    capacity: number;
    cost: number;
}

interface FlowGraph {
    nodes: FlowNode[];
    edges: FlowEdge[];
}

export interface MCMFResult {
    flow: number;
    cost: number;
    assignments: { userClone: string; choreNode: string }[];
}


function getChoreAssignmentCost(
    user: User,
    chore: Chore,
    currentWeek: number
): number {
    const prefEntry = user.preferences.find(p => p.chore.id === chore.id);
    if (!prefEntry) return 99999;

    let baseCost = 0;
    switch (prefEntry.prefNum) {
        case 1: baseCost = 10; break;
        case 2: baseCost = 30; break;
        case 3: baseCost = 200; break;
        default: baseCost = 100; break;
    }

    const noise = Math.floor(Math.random() * 6);

    const lastWeek = user.choreHistory.find(h => h.week === currentWeek - 1);
    let repeatPenalty = 0;

    if (lastWeek && lastWeek.chores.some(c => c.id === chore.id)) {
        repeatPenalty = 200;
    }

    return baseCost + repeatPenalty + noise;
}

let counter = 0;
function makeID() {
    return `n-${counter++}`;
}

export function buildFlowGraph(
    household: Household,
    week: number
): FlowGraph {

    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const source: FlowNode = { id: "source", type: "source" };
    const sink: FlowNode = { id: "sink", type: "sink" };
    nodes.push(source, sink);

    const numUsers = household.users.length;
    const numChores = household.chores.length;

    const baseChores = Math.floor(numChores / numUsers);
    const extraChores = numChores % numUsers;

    const usersSorted = [...household.users].sort((a, b) => a.id - b.id);

    const userCloneNodes: { user: User; cloneID: string }[] = [];

    for (let i = 0; i < usersSorted.length; i++) {
        const user = usersSorted[i];
        const totalClones = baseChores + (i < extraChores ? 1 : 0);

        for (let c = 0; c < totalClones; c++) {
            const cloneID = makeID();
            userCloneNodes.push({ user, cloneID });
            nodes.push({ id: cloneID, type: "userClone" });

            edges.push({
                from: source.id,
                to: cloneID,
                capacity: 1,
                cost: 0
            });
        }
    }

    const choreNodes: { chore: Chore; id: string }[] = [];

    for (const chore of household.chores) {
        const choreID = makeID();
        choreNodes.push({ chore, id: choreID });
        nodes.push({ id: choreID, type: "chore" });

        edges.push({
            from: choreID,
            to: sink.id,
            capacity: 1,
            cost: 0
        });
    }

    for (const ucn of userCloneNodes) {
        for (const cn of choreNodes) {
            edges.push({
                from: ucn.cloneID,
                to: cn.id,
                capacity: 1,
                cost: getChoreAssignmentCost(ucn.user, cn.chore, week)
            });
        }
    }

    return { nodes, edges };
}

export function minCostMaxFlow(graph: FlowGraph): MCMFResult {
    const nodeIndex = new Map<string, number>();
    graph.nodes.forEach((n, i) => nodeIndex.set(n.id, i));

    const N = graph.nodes.length;

    const adj: any[][] = Array.from({ length: N }, () => []);

    const addEdge = (u: number, v: number, capacity: number, cost: number, fromNode: string, toNode: string) => {
        adj[u].push({
            to: v,
            rev: adj[v].length,
            capacity,
            cost,
            original: true,
            fromNode,
            toNode
        });
        adj[v].push({
            to: u,
            rev: adj[u].length - 1,
            capacity: 0,
            cost: -cost
        });
    };

    for (const e of graph.edges) {
        addEdge(nodeIndex.get(e.from)!, nodeIndex.get(e.to)!, e.capacity, e.cost, e.from, e.to);
    }

    const source = nodeIndex.get("source")!;
    const sink = nodeIndex.get("sink")!;

    let flow = 0;
    let cost = 0;

    while (true) {
        const dist = Array(N).fill(Infinity);
        const parent = Array(N).fill(null);
        dist[source] = 0;

        let updated = true;
        for (let iter = 0; iter < N - 1 && updated; iter++) {
            updated = false;
            for (let u = 0; u < N; u++) {
                if (dist[u] === Infinity) continue;
                adj[u].forEach((edge: any, i: number) => {
                    if (edge.capacity > 0 && dist[edge.to] > dist[u] + edge.cost) {
                        dist[edge.to] = dist[u] + edge.cost;
                        parent[edge.to] = { node: u, edgeIndex: i };
                        updated = true;
                    }
                });
            }
        }

        if (dist[sink] === Infinity) break;

        let pushFlow = Infinity;
        let cur = sink;
        while (cur !== source) {
            const p = parent[cur]!;
            const e = adj[p.node][p.edgeIndex];
            pushFlow = Math.min(pushFlow, e.capacity);
            cur = p.node;
        }

        if (pushFlow === 0 || pushFlow === Infinity) break;

        cur = sink;
        while (cur !== source) {
            const p = parent[cur]!;
            const e = adj[p.node][p.edgeIndex];
            e.capacity -= pushFlow;
            adj[cur][e.rev].capacity += pushFlow;
            cur = p.node;
        }

        flow += pushFlow;
        cost += pushFlow * dist[sink];
    }

    const assignments: { userClone: string; choreNode: string }[] = [];

    for (let u = 0; u < N; u++) {
        for (const edge of adj[u]) {
            if (
                edge.original &&
                edge.fromNode &&
                edge.toNode &&
                edge.capacity === 0 &&
                graph.nodes[nodeIndex.get(edge.fromNode)!].type === "userClone" &&
                graph.nodes[nodeIndex.get(edge.toNode)!].type === "chore"
            ) {
                assignments.push({
                    userClone: edge.fromNode,
                    choreNode: edge.toNode
                });
            }
        }
    }

    return { flow, cost, assignments };
}

app.post("/assign-chores", (req: Request, res: Response) => {
    const { household, week } = req.body;

    try {
        // Build flow network
        const graph = buildFlowGraph(household, week);

        // Compute min cost max flow
        const result = minCostMaxFlow(graph);

        // Build lookup maps
        for (const node of graph.nodes) {
            if (node.type === "userClone") {
                const user = household.users.find((u: User) => {
                    // clone IDs contain "n-#", we match clones in creation order
                    return true;
                });
            }
        }

        // More simply: your frontend will match clone IDs → chore IDs
        // Returning raw assignments is fine

        res.json({
            success: true,
            flowResult: result
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Only start server when this file is run directly (prevents auto-start during tests)
if (require.main === module) {
    app.listen(3000, () => console.log("Server running on port 3000"));
}
