import { SUBJECTS, SUBJECT_LABELS } from "@/lib/gateSyllabus";

export { SUBJECTS, SUBJECT_LABELS };
export const ACTIVITIES = ["Lecture", "Practice", "Revision", "Mock Test", "Reading"];
export const QUESTION_TYPES = ["MCQ", "MSQ", "NAT"];
export const DIFFICULTIES = ["Easy", "Medium", "Hard"];
export const EXAM_SOURCES = ["GATE", "ISRO", "GO DPP", "GO Weekly Quiz", "GO Subject Test", "GO Mock", "Other"];
export const REVISIT_PRESETS = [
  { days: 1, label: "Tomorrow" },
  { days: 3, label: "+3 days" },
  { days: 7, label: "+7 days" },
  { days: 14, label: "+14 days" },
  { days: 30, label: "+30 days" },
];
export const REVISIT_TYPES = [
  "question", "note", "journal", "study_session", "lecture",
  "timeline_entry", "mock_test", "weak_topic", "repository_item",
];

export const TID = {
  // nav
  navSolve: "nav-solve", navPulse: "nav-pulse", navLog: "nav-log", navTimeline: "nav-timeline",
  cmdK: "cmd-k-trigger",
  // solve sub-nav
  solveRepo: "solve-repo", solvePractice: "solve-practice", solveBookmarks: "solve-bookmarks", solveMistakes: "solve-mistakes",
  // repository
  repoSearch: "repo-search",
  repoSubjectFilter: "repo-subject-filter",
  repoFilterMode: "repo-filter-mode",
  repoNewBtn: "repo-new-btn",
  repoImportCsv: "repo-import-csv",
  repoExportCsv: "repo-export-csv",
  repoBulkDelete: "repo-bulk-delete",
  repoRow: (id) => `repo-row-${id}`,
  repoRowCheckbox: (id) => `repo-row-cb-${id}`,
  repoRowBookmark: (id) => `repo-row-bookmark-${id}`,
  repoRowPractice: (id) => `repo-row-practice-${id}`,
  repoRowRevisit: (id) => `repo-row-revisit-${id}`,
  repoRowEdit: (id) => `repo-row-edit-${id}`,
  repoRowDelete: (id) => `repo-row-delete-${id}`,
  // question form
  qFormSubject: "qform-subject", qFormTopic: "qform-topic", qFormType: "qform-type",
  qFormStatement: "qform-statement", qFormOptions: "qform-options",
  qFormAnswer: "qform-answer", qFormExplanation: "qform-explanation",
  qFormGOLink: "qform-go-link", qFormYear: "qform-year", qFormDifficulty: "qform-difficulty",
  qFormNotes: "qform-notes", qFormBookmark: "qform-bookmark",
  qFormSave: "qform-save", qFormCancel: "qform-cancel",
  // practice
  practiceModeSelect: "practice-mode-select", practiceSubjectSelect: "practice-subject-select",
  practiceStartBtn: "practice-start-btn",
  practiceQuestion: "practice-question",
  practiceOption: (i) => `practice-option-${i}`,
  practiceNatInput: "practice-nat-input",
  practiceConfidence: (n) => `practice-confidence-${n}`,
  practiceSubmit: "practice-submit",
  practiceNext: "practice-next",
  practiceBookmark: "practice-bookmark",
  practiceRevisit: "practice-revisit",
  practiceFeedback: "practice-feedback",
  // pulse
  pulseMission: "pulse-mission",
  pulseMomentum: "pulse-momentum",
  pulseDueRev: "pulse-due-revisions",
  pulseWeak: "pulse-weak-topics",
  pulseReadiness: "pulse-readiness",
  pulseSubjectCompletion: "pulse-subject-completion",
  // log
  logNewBtn: "log-new-btn",
  logForm: "log-form",
  logFormSubject: "log-form-subject",
  logFormActivity: "log-form-activity",
  logFormDuration: "log-form-duration",
  logFormSave: "log-form-save",
  // timeline
  tlViewDaily: "tl-view-daily", tlViewWeekly: "tl-view-weekly", tlViewMonthly: "tl-view-monthly",
  tlPrev: "tl-prev", tlNext: "tl-next", tlNewBtn: "tl-new-btn",
  tlCell: (d) => `tl-cell-${d}`,
  tlEntry: (id) => `tl-entry-${id}`,
  tlEntryEdit: "tl-entry-edit", tlEntryDelete: "tl-entry-delete",
  tlScheduleRev: (days) => `tl-schedule-rev-${days}`,
  tlCompleteRev: (date) => `tl-complete-rev-${date}`,
  // revisit menu
  revisitMenuTrigger: "revisit-menu-trigger",
  revisitOption: (days) => `revisit-option-${days}`,
  revisitCustomDate: "revisit-custom-date",
};
