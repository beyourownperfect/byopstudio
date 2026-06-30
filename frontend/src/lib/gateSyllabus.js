// GATE CSE Official Syllabus Hierarchy
// Single source of truth - canonical academic backbone for the application.
// Not stored in MongoDB. Imported wherever subject/topic context is needed.

export const GATE_SYLLABUS = {
  "EM": {
    label: "Engineering Mathematics",
    topics: {
      "linear_algebra": { label: "Linear Algebra" },
      "calculus": { label: "Calculus" },
      "probability_statistics": { label: "Probability & Statistics" },
    },
  },
  "DM": {
    label: "Discrete Mathematics",
    topics: {
      "logic": { label: "Logic" },
      "sets_relations": { label: "Sets & Relations" },
      "functions": { label: "Functions" },
      "lattices": { label: "Lattices" },
      "group_theory": { label: "Group Theory" },
      "graph_theory": { label: "Graph Theory" },
      "combinatorics": { label: "Combinatorics" },
    },
  },
  "DL": {
    label: "Digital Logic",
    topics: {
      "boolean_algebra": { label: "Boolean Algebra" },
      "combinational_circuits": { label: "Combinational Circuits" },
      "sequential_circuits": { label: "Sequential Circuits" },
      "logic_minimization": { label: "Logic Minimization" },
      "number_representation": { label: "Number Representation" },
      "fixed_floating_point": { label: "Fixed/Floating Point Arithmetic" },
    },
  },
  "COA": {
    label: "Computer Organization & Architecture",
    topics: {
      "machine_instructions": { label: "Machine Instructions" },
      "addressing_modes": { label: "Addressing Modes" },
      "alu": { label: "ALU" },
      "datapath_control": { label: "Datapath & Control" },
      "pipeline": { label: "Pipeline" },
      "memory_hierarchy": { label: "Memory Hierarchy" },
      "cache": { label: "Cache" },
      "virtual_memory": { label: "Virtual Memory" },
      "io": { label: "I/O" },
      "interrupts": { label: "Interrupts" },
      "dma": { label: "DMA" },
    },
  },
  "C": {
    label: "C Programming",
    topics: {
      "programming_in_c": { label: "Programming in C" },
      "operators": { label: "Operators" },
      "loops_functions": { label: "Loops & Functions" },
      "arrays_c": { label: "Arrays" },
      "pointers": { label: "Pointers & Pointer Arithmetic" },
      "structures": { label: "Structures" },
      "recursion": { label: "Recursion" },
    },
  },
  "DS": {
    label: "Data Structures",
    topics: {
      "arrays": { label: "Arrays" },
      "linked_lists": { label: "Linked Lists" },
      "stacks": { label: "Stacks" },
      "queues": { label: "Queues" },
      "trees": { label: "Trees" },
      "bst": { label: "Binary Search Trees" },
      "heaps": { label: "Heaps" },
      "graphs": { label: "Graphs" },
    },
  },
  "AL": {
    label: "Algorithms",
    topics: {
      "asymptotic_analysis": { label: "Asymptotic Analysis" },
      "searching": { label: "Searching" },
      "sorting": { label: "Sorting" },
      "hashing": { label: "Hashing" },
      "divide_conquer": { label: "Divide & Conquer" },
      "greedy": { label: "Greedy" },
      "dynamic_programming": { label: "Dynamic Programming" },
      "graph_algorithms": { label: "Graph Algorithms" },
      "mst": { label: "Minimum Spanning Tree" },
      "shortest_paths": { label: "Shortest Paths" },
    },
  },
  "TOC": {
    label: "Theory of Computation",
    topics: {
      "regular_languages": { label: "Regular Languages" },
      "finite_automata": { label: "Finite Automata" },
      "regular_expressions": { label: "Regular Expressions" },
      "cfg": { label: "Context-Free Grammars" },
      "pushdown_automata": { label: "Pushdown Automata" },
      "pumping_lemma": { label: "Pumping Lemma" },
      "turing_machines": { label: "Turing Machines" },
      "undecidability": { label: "Undecidability" },
    },
  },
  "CD": {
    label: "Compiler Design",
    topics: {
      "lexical_analysis": { label: "Lexical Analysis" },
      "parsing": { label: "Parsing" },
      "syntax_directed_translation": { label: "Syntax Directed Translation" },
      "runtime_environment": { label: "Runtime Environment" },
      "intermediate_code": { label: "Intermediate Code" },
      "code_optimization": { label: "Code Optimization" },
    },
  },
  "OS": {
    label: "Operating Systems",
    topics: {
      "processes": { label: "Processes" },
      "threads": { label: "Threads" },
      "concurrency": { label: "Concurrency" },
      "synchronization": { label: "Synchronization" },
      "deadlocks": { label: "Deadlocks" },
      "cpu_scheduling": { label: "CPU Scheduling" },
      "memory_management": { label: "Memory Management" },
      "virtual_memory_os": { label: "Virtual Memory" },
      "file_systems": { label: "File Systems" },
      "io_systems": { label: "I/O Systems" },
    },
  },
  "DB": {
    label: "Databases",
    topics: {
      "er_model": { label: "ER Model" },
      "relational_model": { label: "Relational Model" },
      "relational_algebra": { label: "Relational Algebra" },
      "sql": { label: "SQL" },
      "integrity_constraints": { label: "Integrity Constraints" },
      "normalization": { label: "Normalization" },
      "file_organization": { label: "File Organization" },
      "indexing": { label: "Indexing" },
      "transactions": { label: "Transactions" },
      "concurrency_control": { label: "Concurrency Control" },
    },
  },
  "CN": {
    label: "Computer Networks",
    topics: {
      "osi_tcp_ip": { label: "OSI/TCP-IP" },
      "physical_layer": { label: "Physical Layer" },
      "data_link_layer": { label: "Data Link Layer" },
      "mac": { label: "MAC" },
      "ethernet": { label: "Ethernet" },
      "routing": { label: "Routing" },
      "ipv4": { label: "IPv4" },
      "arp": { label: "ARP" },
      "icmp": { label: "ICMP" },
      "dhcp": { label: "DHCP" },
      "tcp": { label: "TCP" },
      "udp": { label: "UDP" },
      "congestion_control": { label: "Congestion Control" },
      "dns": { label: "DNS" },
      "http": { label: "HTTP" },
      "ftp": { label: "FTP" },
      "smtp": { label: "SMTP" },
    },
  },
};

// ─── Subject Color System ───
// Color families group related subjects:
//   [C, DS, AL]   blue/sky/indigo   — Programming + Data Structures + Algorithms
//   [TOC, CD]      purple/violet     — Theory + Compilers
//   [DL, OS, COA]  emerald/green/teal— Logic + OS + Architecture
//   [EM]           amber             — Engineering Mathematics
//   [DM]           stone/slate      — Discrete Mathematics
//   [DB]           rose              — Databases
//   [CN]           cyan              — Computer Networks
export const SUBJECT_COLORS = {
  "C":   { bg: "bg-blue-500/15",    text: "text-blue-600 dark:text-blue-400",     border: "border-blue-500/30",    bar: "bg-blue-500" },
  "DS":  { bg: "bg-sky-500/15",     text: "text-sky-600 dark:text-sky-400",       border: "border-sky-500/30",     bar: "bg-sky-500" },
  "AL":  { bg: "bg-indigo-500/15",  text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30",  bar: "bg-indigo-500" },
  "TOC": { bg: "bg-purple-500/15",  text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30",  bar: "bg-purple-500" },
  "CD":  { bg: "bg-violet-500/15",  text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/30",  bar: "bg-violet-500" },
  "DL":  { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", bar: "bg-emerald-500" },
  "OS":  { bg: "bg-green-500/15",   text: "text-green-600 dark:text-green-400",   border: "border-green-500/30",   bar: "bg-green-500" },
  "COA": { bg: "bg-teal-500/15",    text: "text-teal-600 dark:text-teal-400",     border: "border-teal-500/30",    bar: "bg-teal-500" },
  "EM":  { bg: "bg-amber-500/15",   text: "text-amber-600 dark:text-amber-400",   border: "border-amber-500/30",   bar: "bg-amber-500" },
  "DM":  { bg: "bg-stone-500/15",   text: "text-stone-600 dark:text-stone-400",   border: "border-stone-500/30",   bar: "bg-stone-500" },
  "DB":  { bg: "bg-rose-500/15",    text: "text-rose-600 dark:text-rose-400",     border: "border-rose-500/30",    bar: "bg-rose-500" },
  "CN":  { bg: "bg-cyan-500/15",    text: "text-cyan-600 dark:text-cyan-400",     border: "border-cyan-500/30",    bar: "bg-cyan-500" },
};

export const subjectColor = (code) => {
  return SUBJECT_COLORS[code] || { bg: "bg-[hsl(var(--accent))]/10", text: "text-[hsl(var(--accent))]", border: "border-[hsl(var(--accent))]/30", bar: "bg-[hsl(var(--accent))]" };
};

// ─── Derived exports ───
const SUBJECTS_ORDER = ["C", "DS", "AL", "OS", "DB", "COA", "TOC", "CD", "DL", "EM", "DM", "CN"];

export const SUBJECTS = SUBJECTS_ORDER;

export const SUBJECT_LABELS = {};
for (const code of SUBJECTS_ORDER) {
  if (GATE_SYLLABUS[code]) {
    SUBJECT_LABELS[code] = GATE_SYLLABUS[code].label;
  }
}

// Flattened topic key => "SUBJCODE · Label" map
export const ALL_TOPICS = {};
for (const [subjCode, subj] of Object.entries(GATE_SYLLABUS)) {
  if (!subj.topics || Object.keys(subj.topics).length === 0) continue;
  for (const [topicKey, topic] of Object.entries(subj.topics)) {
    ALL_TOPICS[topicKey] = `${subjCode} · ${topic.label}`;
  }
}

// Backward-compat topic aliases
const TOPIC_ALIASES = {
  "c_programming": "programming_in_c",
  "arrays": "arrays_c",
  "linked_lists": "linked_lists",
  "stacks": "stacks",
  "queues": "queues",
  "trees": "trees",
  "bst": "bst",
  "heaps": "heaps",
  "graphs": "graphs",
  "discrete_mathematics": "sets_relations",
};

export const topicLabel = (key) => {
  if (ALL_TOPICS[key]) return ALL_TOPICS[key];
  const resolved = TOPIC_ALIASES[key];
  if (resolved && ALL_TOPICS[resolved]) return ALL_TOPICS[resolved];
  return key;
};

export const topicsForSubject = (subjCode) => {
  const subj = GATE_SYLLABUS[subjCode];
  if (!subj || !subj.topics) return [];
  return Object.entries(subj.topics).map(([key, t]) => ({ key, label: t.label }));
};

export const matchTopic = (subjectCode, freeText) => {
  if (!freeText) return null;
  const topics = topicsForSubject(subjectCode);
  const normalized = freeText.toLowerCase().replace(/[_-]/g, " ");
  for (const t of topics) {
    if (normalized.includes(t.key.replace(/_/g, " ")) || t.label.toLowerCase().includes(normalized)) {
      return t.key;
    }
  }
  return null;
};
