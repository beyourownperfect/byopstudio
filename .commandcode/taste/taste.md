# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# communication-style
- Keep responses short when possible and avoid unnecessary details. Confidence: 0.90

# code-quality
- Fix ESLint warnings properly — do not disable rules or suppress warnings. Fix the underlying code issue. Confidence: 0.85
- When using edit_file, verify the exact text being replaced to avoid introducing new bugs (e.g., duplicate imports). Do not create problems and then "solve" them — get edits right the first time. Confidence: 0.75

# architecture
- Keep implementations minimal and avoid over-engineering — prefer simple solutions (e.g., paste-to-markdown conversion) over rich/WYSIWYG editing experiences. Do not add features beyond what is explicitly requested. Confidence: 0.85
- Reuse existing MongoDB collections, backend services, and calculations when adding features — avoid creating new APIs, collections, or duplicating business logic. Confidence: 0.70
- Integrate closely related features into existing UI sections rather than creating separate top-level sections — keep the page structure lean by nesting sub-features where they logically belong. Confidence: 0.65
- When adding category-based isolation, keep GATE CSE as the only category participating in SRS, revisions, revisits, mastery, accuracy, weak topics, Pulse, Subject Completion, Queue, and analytics. Non-GATE categories are simple time logs only and must never influence GATE workflows or calculations. Confidence: 0.85
- Treat the IBPS SO project as a standalone, self-contained application — do not assume GATE app context, architecture patterns, or conventions when building it. The architecture doc must be sufficient on its own. Confidence: 0.75

# python
- Define all helper functions before Model classes that reference them via `default_factory` or similar — Python requires the callable to exist at class definition time. Confidence: 0.70

# syllabus
- EM (Engineering Mathematics) and DM (Discrete Math) must be separate, independent subjects with their own topics across all pages, sections, and data models — DM should not be a virtual subject mapped to EM. Confidence: 0.85

# design
See [design/taste.md](design/taste.md)

# development
- When removing a feature from the user-facing UI, keep the backend endpoint/functionality intact as an internal development utility for testing and debugging. Remove the UI entry point but do not delete the underlying implementation. Confidence: 0.85
