# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# communication-style
- Keep responses short when possible and avoid unnecessary details. Confidence: 0.90

# code-quality
- Fix ESLint warnings properly — do not disable rules or suppress warnings. Fix the underlying code issue. Confidence: 0.85
- When using edit_file, verify the exact text being replaced to avoid introducing new bugs (e.g., duplicate imports). Do not create problems and then "solve" them — get edits right the first time. Confidence: 0.75

# architecture
- Keep implementations minimal and avoid over-engineering — prefer simple solutions (e.g., paste-to-markdown conversion) over rich/WYSIWYG editing experiences. Do not add features beyond what is explicitly requested. Confidence: 0.80
- Reuse existing MongoDB collections, backend services, and calculations when adding features — avoid creating new APIs, collections, or duplicating business logic. Confidence: 0.70
- Integrate closely related features into existing UI sections rather than creating separate top-level sections — keep the page structure lean by nesting sub-features where they logically belong. Confidence: 0.65

# python
- Define all helper functions before Model classes that reference them via `default_factory` or similar — Python requires the callable to exist at class definition time. Confidence: 0.70

# design
- Maintain the minimal neo-brutalist aesthetic — clean spacing, strong borders, dark mode, no excessive ornamentation. Confidence: 0.65
- Avoid overcrowding the UI; use Tailwind responsive classes properly and include smooth hover states, transitions, and animated switching. Confidence: 0.70
- Use warm colors for the accent/primary palette instead of blue. Keep gradients minimal and hover effects subtle. Confidence: 0.65
- Light mode backgrounds should use subtle off-white, cream, or light pink tones rather than pure white. Confidence: 0.70
- Design UI flows with the student's exam preparation journey in mind — prioritize clarity, reduce cognitive load, and make every interaction feel natural for someone deep in study mode. Confidence: 0.70


