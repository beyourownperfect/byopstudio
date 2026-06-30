"""
GATE CSE Official Syllabus — canonical academic backbone.
Single source of truth for the application. Not stored in MongoDB.
Imported by both backend and used as the reference for frontend gateSyllabus.js.

Structure:
    GATE_SYLLABUS = {
        subject_code: {
            "label": "Human-readable subject name",
            "topics": {
                topic_key: {"label": "Human-readable topic name"},
                ...
            }
        },
        ...
    }

SUBJECTS is derived from GATE_SYLLABUS keys.
ALL_TOPICS is a flat map of topic_key → "SUBJCODE · Label".
"""

GATE_SYLLABUS = {
    "EM": {
        "label": "Engineering Mathematics",
        "topics": {
            "linear_algebra": {"label": "Linear Algebra"},
            "calculus": {"label": "Calculus"},
            "probability_statistics": {"label": "Probability & Statistics"},
        },
    },
    "DM": {
        "label": "Discrete Mathematics",
        "topics": {
            "logic": {"label": "Logic"},
            "sets_relations": {"label": "Sets & Relations"},
            "functions": {"label": "Functions"},
            "lattices": {"label": "Lattices"},
            "group_theory": {"label": "Group Theory"},
            "graph_theory": {"label": "Graph Theory"},
            "combinatorics": {"label": "Combinatorics"},
        },
    },
    "DL": {
        "label": "Digital Logic",
        "topics": {
            "boolean_algebra": {"label": "Boolean Algebra"},
            "combinational_circuits": {"label": "Combinational Circuits"},
            "sequential_circuits": {"label": "Sequential Circuits"},
            "logic_minimization": {"label": "Logic Minimization"},
            "number_representation": {"label": "Number Representation"},
            "fixed_floating_point": {"label": "Fixed/Floating Point Arithmetic"},
        },
    },
    "COA": {
        "label": "Computer Organization & Architecture",
        "topics": {
            "machine_instructions": {"label": "Machine Instructions"},
            "addressing_modes": {"label": "Addressing Modes"},
            "alu": {"label": "ALU"},
            "datapath_control": {"label": "Datapath & Control"},
            "pipeline": {"label": "Pipeline"},
            "memory_hierarchy": {"label": "Memory Hierarchy"},
            "cache": {"label": "Cache"},
            "virtual_memory": {"label": "Virtual Memory"},
            "io": {"label": "I/O"},
            "interrupts": {"label": "Interrupts"},
            "dma": {"label": "DMA"},
        },
    },
    "C": {
        "label": "C Programming",
        "topics": {
            "programming_in_c": {"label": "Programming in C"},
            "operators": {"label": "Operators"},
            "loops_functions": {"label": "Loops & Functions"},
            "arrays_c": {"label": "Arrays"},
            "pointers": {"label": "Pointers & Pointer Arithmetic"},
            "structures": {"label": "Structures"},
            "recursion": {"label": "Recursion"},
        },
    },
    "DS": {
        "label": "Data Structures",
        "topics": {
            "arrays": {"label": "Arrays"},
            "linked_lists": {"label": "Linked Lists"},
            "stacks": {"label": "Stacks"},
            "queues": {"label": "Queues"},
            "trees": {"label": "Trees"},
            "bst": {"label": "Binary Search Trees"},
            "heaps": {"label": "Heaps"},
            "graphs": {"label": "Graphs"},
        },
    },
    "AL": {
        "label": "Algorithms",
        "topics": {
            "asymptotic_analysis": {"label": "Asymptotic Analysis"},
            "searching": {"label": "Searching"},
            "sorting": {"label": "Sorting"},
            "hashing": {"label": "Hashing"},
            "divide_conquer": {"label": "Divide & Conquer"},
            "greedy": {"label": "Greedy"},
            "dynamic_programming": {"label": "Dynamic Programming"},
            "graph_algorithms": {"label": "Graph Algorithms"},
            "mst": {"label": "Minimum Spanning Tree"},
            "shortest_paths": {"label": "Shortest Paths"},
        },
    },
    "TOC": {
        "label": "Theory of Computation",
        "topics": {
            "regular_languages": {"label": "Regular Languages"},
            "finite_automata": {"label": "Finite Automata"},
            "regular_expressions": {"label": "Regular Expressions"},
            "cfg": {"label": "Context-Free Grammars"},
            "pushdown_automata": {"label": "Pushdown Automata"},
            "pumping_lemma": {"label": "Pumping Lemma"},
            "turing_machines": {"label": "Turing Machines"},
            "undecidability": {"label": "Undecidability"},
        },
    },
    "CD": {
        "label": "Compiler Design",
        "topics": {
            "lexical_analysis": {"label": "Lexical Analysis"},
            "parsing": {"label": "Parsing"},
            "syntax_directed_translation": {"label": "Syntax Directed Translation"},
            "runtime_environment": {"label": "Runtime Environment"},
            "intermediate_code": {"label": "Intermediate Code"},
            "code_optimization": {"label": "Code Optimization"},
        },
    },
    "OS": {
        "label": "Operating Systems",
        "topics": {
            "processes": {"label": "Processes"},
            "threads": {"label": "Threads"},
            "concurrency": {"label": "Concurrency"},
            "synchronization": {"label": "Synchronization"},
            "deadlocks": {"label": "Deadlocks"},
            "cpu_scheduling": {"label": "CPU Scheduling"},
            "memory_management": {"label": "Memory Management"},
            "virtual_memory_os": {"label": "Virtual Memory"},
            "file_systems": {"label": "File Systems"},
            "io_systems": {"label": "I/O Systems"},
        },
    },
    "DB": {
        "label": "Databases",
        "topics": {
            "er_model": {"label": "ER Model"},
            "relational_model": {"label": "Relational Model"},
            "relational_algebra": {"label": "Relational Algebra"},
            "sql": {"label": "SQL"},
            "integrity_constraints": {"label": "Integrity Constraints"},
            "normalization": {"label": "Normalization"},
            "file_organization": {"label": "File Organization"},
            "indexing": {"label": "Indexing"},
            "transactions": {"label": "Transactions"},
            "concurrency_control": {"label": "Concurrency Control"},
        },
    },
    "CN": {
        "label": "Computer Networks",
        "topics": {
            "osi_tcp_ip": {"label": "OSI/TCP-IP"},
            "physical_layer": {"label": "Physical Layer"},
            "data_link_layer": {"label": "Data Link Layer"},
            "mac": {"label": "MAC"},
            "ethernet": {"label": "Ethernet"},
            "routing": {"label": "Routing"},
            "ipv4": {"label": "IPv4"},
            "arp": {"label": "ARP"},
            "icmp": {"label": "ICMP"},
            "dhcp": {"label": "DHCP"},
            "tcp": {"label": "TCP"},
            "udp": {"label": "UDP"},
            "congestion_control": {"label": "Congestion Control"},
            "dns": {"label": "DNS"},
            "http": {"label": "HTTP"},
            "ftp": {"label": "FTP"},
            "smtp": {"label": "SMTP"},
        },
    },
}

# All subjects are real now — no virtual subjects remain.
VIRTUAL_SUBJECTS = {}

# Ordered subject list for backward compatibility.
SUBJECTS = ["C", "DS", "AL", "OS", "DB", "COA", "TOC", "CD", "DL", "EM", "DM", "CN"]
SUBJECT_LABELS = {}
for code in SUBJECTS:
    if code in GATE_SYLLABUS:
        SUBJECT_LABELS[code] = GATE_SYLLABUS[code]["label"]

# Real subjects (with actual topics) for topic iteration
REAL_SUBJECTS = [s for s in SUBJECTS if s in GATE_SYLLABUS and GATE_SYLLABUS[s].get("topics")]

# Backward-compat topic aliases: old keys → (subject, new_key).
TOPIC_ALIASES = {
    # Old C → new C keys
    "c_programming": ("C", "programming_in_c"),
    "arrays": ("C", "arrays_c"),
    # Old composite C → now DS
    "linked_lists": ("DS", "linked_lists"),
    "stacks": ("DS", "stacks"),
    "queues": ("DS", "queues"),
    "trees": ("DS", "trees"),
    "bst": ("DS", "bst"),
    "heaps": ("DS", "heaps"),
    "graphs": ("DS", "graphs"),
    # Old EM → now DM
    "discrete_mathematics": ("DM", "sets_relations"),
}

# Flat topic key → "SUBJCODE · Label" map
ALL_TOPICS = {}
for subj_code, subj in GATE_SYLLABUS.items():
    if subj_code in VIRTUAL_SUBJECTS:
        continue
    for topic_key, topic_data in subj["topics"].items():
        ALL_TOPICS[topic_key] = f"{subj_code} · {topic_data['label']}"


def syllabus_topic_label(subject: str, topic_key: str) -> str:
    """Return human-readable label for a topic key within a subject.
    Falls back to alias lookup for backward compatibility with old keys."""
    if subject in GATE_SYLLABUS and topic_key in GATE_SYLLABUS[subject]["topics"]:
        return GATE_SYLLABUS[subject]["topics"][topic_key]["label"]
    alias = TOPIC_ALIASES.get(topic_key)
    if alias:
        alias_subj, alias_key = alias
        if alias_subj in GATE_SYLLABUS and alias_key in GATE_SYLLABUS[alias_subj]["topics"]:
            return GATE_SYLLABUS[alias_subj]["topics"][alias_key]["label"]
    return topic_key


def syllabus_title(subject: str, official_topic: str, activity: str) -> str:
    """Generate a syllabus-aware display title for timeline/log entries."""
    label = syllabus_topic_label(subject, official_topic)
    if label != official_topic:
        return f"{activity} → {label}"
    return f"{activity} — {subject}"


def match_topic(subject_code: str, free_text: str) -> str:
    """Fuzzy-match a free-text topic string to the closest official topic key.
    Returns empty string if no match found."""
    if not free_text or subject_code not in GATE_SYLLABUS:
        return ""
    if subject_code in VIRTUAL_SUBJECTS:
        return ""
    topics = GATE_SYLLABUS[subject_code]["topics"]
    normalized = free_text.lower().replace("-", " ").replace("_", " ")
    for topic_key, topic_data in topics.items():
        key_normalized = topic_key.replace("_", " ")
        if normalized in key_normalized or key_normalized in normalized:
            return topic_key
        if topic_data["label"].lower() in normalized or normalized in topic_data["label"].lower():
            return topic_key
    # Try aliases too
    for alias_key, (alias_subj, alias_target) in TOPIC_ALIASES.items():
        if alias_subj == subject_code:
            if normalized in alias_key.replace("_", " ") or alias_key.replace("_", " ") in normalized:
                return alias_target
    return ""


def resolve_topic(subject_code: str, official_topic: str, free_text_topic: str) -> str:
    """Resolve the best topic key: official_topic first, then alias resolve, then fuzzy match free_text, then empty."""
    if official_topic:
        if subject_code in GATE_SYLLABUS and official_topic in GATE_SYLLABUS[subject_code]["topics"]:
            return official_topic
        alias = TOPIC_ALIASES.get(official_topic)
        if alias:
            return alias[1]
    if free_text_topic:
        return match_topic(subject_code, free_text_topic)
    return ""
