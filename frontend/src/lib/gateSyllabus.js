// GATE CSE Official Syllabus Hierarchy
// Single source of truth - canonical academic backbone for the application.
// Not stored in MongoDB. Imported wherever subject/topic context is needed.

export const GATE_SYLLABUS = {
  "EM": {
    label: "Engineering Mathematics",
    topics: {
      "discrete_mathematics": { label: "Discrete Mathematics" },
      "linear_algebra": { label: "Linear Algebra" },
      "calculus": { label: "Calculus" },
      "probability_statistics": { label: "Probability & Statistics" },
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
    label: "Programming & Data Structures",
    topics: {
      "c_programming": { label: "C Programming" },
      "recursion": { label: "Recursion" },
      "arrays": { label: "Arrays" },
      "linked_lists": { label: "Linked Lists" },
      "stacks": { label: "Stacks" },
      "queues": { label: "Queues" },
      "trees": { label: "Trees" },
      "bst": { label: "BST" },
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
  "DS": {
    label: "Algorithms & Data Structures",
    topics: {},
    note: "DS maps to C (Programming & Data Structures) + AL (Algorithms). Use the C and AL subject topics.",
  },
  "DM": {
    label: "Discrete Math",
    topics: {},
    note: "DM maps to EM (Engineering Mathematics). All Discrete Math topics live under EM.",
  },
};

// Derived exports — canonical subject list and labels, replacing constants.js duplicates.
// Subject order preserved for backward compatibility.
const SUBJECTS_ORDER = ["C", "DS", "AL", "OS", "DB", "COA", "TOC", "CD", "DL", "EM", "DM", "CN"];

export const SUBJECTS = SUBJECTS_ORDER;

export const SUBJECT_LABELS = {};
for (const code of SUBJECTS_ORDER) {
  if (GATE_SYLLABUS[code]) {
    SUBJECT_LABELS[code] = GATE_SYLLABUS[code].label;
  }
}

// Flattened topic key → label map (only real subjects, skip DS/DM virtual ones)
export const ALL_TOPICS = {};
for (const [subjCode, subj] of Object.entries(GATE_SYLLABUS)) {
  if (!subj.topics || Object.keys(subj.topics).length === 0) continue;
  for (const [topicKey, topic] of Object.entries(subj.topics)) {
    ALL_TOPICS[topicKey] = `${subjCode} · ${topic.label}`;
  }
}

// Get topic label by key
export const topicLabel = (key) => ALL_TOPICS[key] || key;

// Get topics for a subject, with optional OTHER fallback
export const topicsForSubject = (subjCode) => {
  const subj = GATE_SYLLABUS[subjCode];
  if (!subj || !subj.topics) return [];
  return Object.entries(subj.topics).map(([key, t]) => ({ key, label: t.label }));
};

// Map a free-text topic string to the closest syllabus topic key (fuzzy match)
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
