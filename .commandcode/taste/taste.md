# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# communication-style
- Keep responses short when possible and avoid unnecessary details. Confidence: 0.90

# code-quality
- Fix ESLint warnings properly — do not disable rules or suppress warnings. Fix the underlying code issue. Confidence: 0.85
- When using edit_file, verify the exact text being replaced to avoid introducing new bugs (e.g., duplicate imports). Do not create problems and then "solve" them — get edits right the first time. Confidence: 0.75

# architecture
- Keep implementations minimal and avoid over-engineering — prefer simple solutions (e.g., paste-to-markdown conversion) over rich/WYSIWYG editing experiences. Do not add features beyond what is explicitly requested. Confidence: 0.80

# design
- Maintain the minimal neo-brutalist aesthetic — clean spacing, strong borders, dark mode, no excessive ornamentation. Confidence: 0.65

