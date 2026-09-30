---
title: Strong history import
date: 2026-09-30
---

# Strong history import

## What to upload in Settings

Upload **`strong-history-import.csv`** via Settings → Import from Strong.

That file is your Strong export with:

- Only workouts from **2024-09-30** onward (last 2 years)
- Exercise names already remapped to Ironlog names using `strong-exercise-map.csv`
- 12 unmatched names left as-is so the importer creates them

Do **not** upload `strong-exercise-map.csv` alone — it has no workout/set data.

## Files

| File | Purpose |
|---|---|
| `strong-exercise-map.csv` | Strong name → Ironlog name (`map` or `create`) |
| `strong-history-import.csv` | Ready-to-import history (remapped + filtered) |
| `exercises-to-add.md` | Human list of creates vs maps |
| `strong-match-state.json` | Working state from the matching session |
