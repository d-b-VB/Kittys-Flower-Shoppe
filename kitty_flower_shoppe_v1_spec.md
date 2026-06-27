# Kitty’s Flower Shoppe — V1 Implementation Specification
## Core decisions
- Stateless mobile-first browser logic puzzle.
- Player chooses 3–5 customers and 3 or 4 total categories.
- Characters and bouquets are mandatory; game chooses the other 1–2 categories.
- Characters first/top columns; bouquets first/left rows; all pairwise grids visible.
- Cell cycle: blank → X → ✓ → blank. Swipe writes Xs.
- No timers, scoring, losses, persistence, login, or backend.
## Content seed
See `kitty_flower_shoppe_content_seed.json` for all 60 characters, 20 fixed locations, initial flowers, category pools, and generator rules.
## Generator
Generate hidden assignments, then generate clues until exactly one solution remains. Never use a clue attribute unless it is displayed for every active item in that category. Only use shared descriptive tags (at least two active options).
## UI
Full triangular pairwise grid; manual order cards; prominent Auto-fill; gentle validation after complete/check. Completion shows customers, bouquets, emoji assignments, butterflies, sparkles, and a fixed-template line.
## Palette
#9933FF primary; lavender/silver/white surfaces; red X; green ✓; pastel and restrained rainbow accents.
