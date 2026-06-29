// Per-module contextual help copy. Keep concise (20–30s read).
export const HELP_CONTENT = {
  repository: {
    title: "Repository",
    sections: [
      {
        title: "Purpose",
        body: "Your single source of truth — every GATE CS question you intend to master lives here with topic, year, type, options, answer, explanation, and notes.",
      },
      {
        title: "Best workflow",
        body: "Curate daily: add 5–10 PYQs with topic + year, then star the ones worth revisiting. Use filters (Due, Wrong, Weak, Never attempted) to slice the bank into a focused session, and bulk-tag with import/export CSV for backups.",
      },
      {
        title: "Speed tips",
        body: "Double-click any row to open full details with attempts + mastery + revision status. Sort by column headers. Filters persist across reloads. Multi-select rows for bulk delete or revisit scheduling.",
      },
      {
        title: "Why it matters",
        body: "GATE rewards depth, not breadth. A clean, tagged repository becomes the substrate for spaced repetition — which is what actually moves long-term retention.",
      },
    ],
  },

  practice: {
    title: "Practice",
    sections: [
      {
        title: "Purpose",
        body: "Daily solve sessions driven by the SRS engine. Each attempt updates mastery and schedules the next review automatically — no planner needed.",
      },
      {
        title: "Best workflow",
        body: "Start every day with mode = 'Due revisions'. When done, switch to 'Weak' or 'New'. Always set your confidence before submitting — it captures whether the win was knowledge or luck.",
      },
      {
        title: "Tips",
        body: "Use the stopwatch to track honest think-time. After feedback, read the explanation even when correct. Bookmark and schedule a revisit on any question where you guessed or felt fragile.",
      },
      {
        title: "Why it matters",
        body: "Each submit feeds the SRS interval and momentum score. Consistent daily Due-revisions sweeps beat marathon weekend sessions on retention.",
      },
    ],
  },

  pulse: {
    title: "Pulse",
    sections: [
      {
        title: "Purpose",
        body: "Your daily dashboard. Tells you exactly what to do today and how prepared you are for GATE in one screen.",
      },
      {
        title: "Preparation Snapshot",
        body: "Four independent metrics derived from your data — no overall score. Subject Coverage: % of questions with 1 correct solve + 2 SRS revisions. Question Mastery: average mastery across all attempted questions. Revision Completion: revision sessions in last 7 days. Mock Readiness: activates once you log a Mock Test. Hover any metric for details.",
      },
      {
        title: "Today's Mission",
        body: "Top 4 highest-leverage actions for today — auto-prioritized: due revisions first, then due revisits, then weakest topic, then a fresh-question quota. Click any item to jump straight into it.",
      },
      {
        title: "Momentum & Weakness Engine",
        body: "Momentum is a 7-day consistency score with a sparkline of daily minutes. The arrow shows whether you're improving or declining vs last week. The Weakness Engine surfaces subject-topic pairs with <70% accuracy over the last 30 days.",
      },
      {
        title: "Tips",
        body: "Aim to clear the mission daily, even if briefly. Keep momentum > 40 by touching ≥3 subjects per week and completing revisions. Adjust your GATE exam date in Settings to keep the countdown honest.",
      },
    ],
  },

  log: {
    title: "Log",
    sections: [
      {
        title: "Purpose",
        body: "Quantitative diary of your prep — minutes studied, questions attempted, accuracy. Auto-populated from Practice and Timeline; add anything manual in ~10 seconds.",
      },
      {
        title: "Best workflow",
        body: "Use the stopwatch when sitting down for a focused block. End each session by jotting a one-line journal note (what was hard, what clicked, what to revisit). Review the weekly summary every Sunday.",
      },
      {
        title: "Tips",
        body: "Trust auto-logs from Practice for question counts. Manual logs are best for Reading, Lecture, and Mock Test activities. Keep journal notes short and specific — they're future-you's signals.",
      },
      {
        title: "Why it matters",
        body: "What gets measured improves. The Log is the ground-truth your Momentum, Pulse, and Subject Completion are computed from.",
      },
    ],
  },

  timeline: {
    title: "Timeline",
    sections: [
      {
        title: "Purpose",
        body: "Visual calendar of everything you studied + everything you've scheduled to revise. Daily, Weekly, and Monthly views.",
      },
      {
        title: "Scheduling revisions",
        body: "Open any timeline entry → use the quick presets (+1d, +3d, +7d, +14d, +30d) or pick a custom date. Scheduled revisions appear on their target date in Timeline, in 'Due Revisions' on Pulse, and in Today's Mission.",
      },
      {
        title: "Best workflow",
        body: "After a lecture or chapter, log a Timeline entry with title + duration, then immediately schedule a +1d and +7d revision. Complete revisions from the entry modal to keep the streak honest.",
      },
      {
        title: "Why it matters",
        body: "Revisions are where mastery happens. The Timeline turns scheduling into a habit, the SRS does the math, and Pulse tells you exactly what's due — together they replace a study planner entirely.",
      },
    ],
  },

  lectures: {
    title: "Lecture Progress",
    sections: [
      { title: "Fast logging", body: "Add a lecture in under 10 seconds — subject, topic, name, number (e.g. 12/42), duration, and completion %. Toggle Notes ✓ and Revision ✓ inline." },
      { title: "Tracking", body: "Lectures are grouped Subject → Topic. Each level shows progress bars so you can see exactly how much ground you've covered." },
    ],
  },

  "subject-completion": {
    title: "Subject Completion",
    sections: [
      { title: "Checklist", body: "Configurable per-subject checklist: Lectures, Notes, Flashcards, PYQs, Revision, Subject Test (core), plus DPP & Weekly Quiz (optional). Final milestone: can you explain the complete topic without notes?" },
      { title: "Independent from Pulse", body: "This checklist is entirely manual and self-contained. It will integrate with Pulse in a future update." },
    ],
  },
};
