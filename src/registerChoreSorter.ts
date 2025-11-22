type Household = {id: number, name: string, users: User[], chores: Chore[] }
type Chore = {id: number, name: string}
type User = {name: String, id: number, icon: string, household: Household, preferences: 
    [{chore: Chore, prefNum: number}], choreHistory: [{week: number, chores: Chore[]}]}

const NodeTypes = {
    USER: "user",
    CHORE: "chore"
}
type GraphNode =  {type: string, edges: Edge[]}
type Edge = {from: User, to: Chore, weight: number}
type ChoreGraph = {}



// Flow Network representation (for min-cost max-flow)
type FlowNodeID = string;

interface FlowNode {
    id: FlowNodeID;
    type: "source" | "sink" | "userClone" | "chore";
}

interface FlowEdge {
    from: FlowNodeID;
    to: FlowNodeID;
    capacity: number;
    cost: number; // your weight function determines this
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


/**
 * Calculates the cost of assigning a given user to a given chore
 * using the improved weighting system designed for stable rotation.
 */
function getChoreAssignmentCost(
    user: User,
    chore: Chore,
    currentWeek: number
): number {
    const prefEntry = user.preferences.find(p => p.chore.id === chore.id);
    if (!prefEntry) return 99999;  // no preference = effectively impossible

    // prefNum: 1 = want, 2 = fine, 3 = hate
    let baseCost = 0;
    switch (prefEntry.prefNum) {
        case 1: baseCost = 10; break;
        case 2: baseCost = 30; break;
        case 3: baseCost = 200; break;
        default: baseCost = 100; break;
    }

    const noise = Math.floor(Math.random() * 6);  // 0–5

    //PLEASE: will want to look at this for when you actually establish how you are going to be keeping track of weeks 
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


function buildFlowGraph(
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

    // To make distribution predictable, pick first N users for extra
    const usersSorted = [...household.users].sort((a, b) => a.id - b.id);

    const userCloneNodes: { user: User; cloneID: string }[] = [];

    for (let i = 0; i < usersSorted.length; i++) {
        const user = usersSorted[i];
        const totalClones = baseChores + (i < extraChores ? 1 : 0);

        for (let c = 0; c < totalClones; c++) {
            const cloneID = makeID();
            userCloneNodes.push({ user, cloneID });
            nodes.push({ id: cloneID, type: "userClone" });

            // Connect source → userClone (capacity = 1)
            edges.push({
                from: source.id,
                to: cloneID,
                capacity: 1,
                cost: 0
            });
        }
    }

    // -----------------------
    // 3. Create chore nodes
    // -----------------------
    const choreNodes: { chore: Chore; id: string }[] = [];

    for (const chore of household.chores) {
        const choreID = makeID();
        choreNodes.push({ chore, id: choreID });
        nodes.push({ id: choreID, type: "chore" });

        // Connect chore → sink (capacity = 1)
        edges.push({
            from: choreID,
            to: sink.id,
            capacity: 1,
            cost: 0
        });
    }

    // -----------------------
    // 4. Connect each userClone → each chore with a cost edge
    // -----------------------
    for (const ucn of userCloneNodes) {
        const { user, cloneID } = ucn;

        for (const cn of choreNodes) {
            const { chore, id: choreID } = cn;

            const cost = getChoreAssignmentCost(user, chore, week);

            edges.push({
                from: cloneID,
                to: choreID,
                capacity: 1,
                cost
            });
        }
    }

    return { nodes, edges };
}



/**
 * Min-Cost Max-Flow implementation using:
 * - Successive Shortest Augmenting Path (SSAP)
 * - Bellman-Ford for shortest paths with negative edges
 *
 * Works with your FlowGraph type.
 */


export function minCostMaxFlow(graph: FlowGraph): MCMFResult {
    const nodeIndex = new Map<string, number>();
    graph.nodes.forEach((n, i) => nodeIndex.set(n.id, i));

    const N = graph.nodes.length;

    // Build adjacency list with residual edges
    const adj: {
        to: number;
        rev: number;
        capacity: number;
        cost: number;
        original?: boolean;
        fromNode?: string;
        toNode?: string;
    }[][] = Array.from({ length: N }, () => []);

    const addEdge = (
        u: number,
        v: number,
        capacity: number,
        cost: number,
        fromNode: string,
        toNode: string
    ) => {
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

    // Add edges from graph
    for (const e of graph.edges) {
        const u = nodeIndex.get(e.from)!;
        const v = nodeIndex.get(e.to)!;
        addEdge(u, v, e.capacity, e.cost, e.from, e.to);
    }

    const source = nodeIndex.get("source")!;
    const sink = nodeIndex.get("sink")!;

    let flow = 0;
    let cost = 0;

    while (true) {
        const dist = Array(N).fill(Infinity);
        const parent: { node: number; edgeIndex: number }[] = Array(N).fill(null);
        dist[source] = 0;

        // Bellman-Ford
        let updated = true;
        for (let iter = 0; iter < N - 1 && updated; iter++) {
            updated = false;
            for (let u = 0; u < N; u++) {
                if (dist[u] === Infinity) continue;
                adj[u].forEach((edge, i) => {
                    if (edge.capacity > 0 && dist[edge.to] > dist[u] + edge.cost) {
                        dist[edge.to] = dist[u] + edge.cost;
                        parent[edge.to] = { node: u, edgeIndex: i };
                        updated = true;
                    }
                });
            }
        }

        if (dist[sink] === Infinity) break;

        // Find bottleneck (always 1 for your assignment graph)
        let pushFlow = Infinity;
        let cur = sink;
        while (cur !== source) {
            const p = parent[cur]!;
            const e = adj[p.node][p.edgeIndex];
            pushFlow = Math.min(pushFlow, e.capacity);
            cur = p.node;
        }

        if (pushFlow === 0 || pushFlow === Infinity) break;

        // Augment the flow
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

    // --------------------------
    // Extract final assignments
    // --------------------------
    const assignments: { userClone: string; choreNode: string }[] = [];

    for (let u = 0; u < N; u++) {
        for (const edge of adj[u]) {
            // Look for edges that:
            // - were original edges
            // - have 0 capacity (means flow 1 used it)
            // - connect userClone → chore
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
