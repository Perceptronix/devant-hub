---
name: ponytail-gain
description: >
  Show ponytail's measured impact as a compact scoreboard: less code, less
  cost, more speed, from the benchmark medians. One-shot display, not a
  persistent mode, and not a per-repo number. Trigger: /ponytail-gain,
  "ponytail gain", "what does ponytail save", "show ponytail impact",
  "ponytail scoreboard".
homepage: https://github.com/DietrichGebert/ponytail
license: MIT
---

# Ponytail Gain

Display this scoreboard when invoked. One-shot: do NOT change mode, write flag
files, or persist anything.

The figures are the published benchmark medians (5 everyday tasks: email
validator, debounce, CSV sum, countdown timer, rate limiter; three models:
Haiku, Sonnet, Opus). They are measured, not computed from the current repo.
Source: `benchmarks/` and the README.

## Scoreboard

Render plain ASCII bars. The bar length shows the measured range; the label
carries the exact figure:

```
  ponytail gain                     benchmark median · 5 tasks · 3 models

  Lines of code   no-skill |####################| 100%
                  ponytail |####               |  20%  (-80%)

  Tokens used     no-skill |####################| 100%
                  ponytail |###############     |  78%  (-22%)

  Cost            no-skill |####################| 100%
                  ponytail |################    |  80%  (-20%)

  Time to answer  no-skill |####################| 100%
                  ponytail |###############     |  73%  (-27%)

  Safety score    no-skill |####################| 100%
                  ponytail |####################| 100%
```
