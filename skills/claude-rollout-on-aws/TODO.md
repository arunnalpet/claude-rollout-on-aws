# TODO / Ideas Parking Lot — claude-rollout-on-aws

> Scratch notes for the skill author. **Not loaded by the agent.**
> The router reads only `SKILL.md`; variant folders are loaded only via their
> `instructions.md`. Nothing references this file, so it never enters agent context.
> Keep it that way — don't link to it from `SKILL.md` or any `instructions.md`.

## Ideas to action

- [ ] **Variant-decision helper in the router** — enable the parent skill (`SKILL.md`) to help the
      end user choose the *right* variant, not just route a named one. Will provide the router access
      to a platform comparison (Claude for Enterprise vs. Bedrock vs. Platform on AWS) so it can guide
      undecided users. Likely a `references/variant-comparison.md` the router reads in Step 1 when the
      user hasn't named a variant.

- [ ] **Per-"customer + variant" rollout memory (CHECKPOINTING)** — local file-based state so users
      can resume, continue, and re-iterate a rollout scoped to a specific customer + variant combo.
      Use case: a portfolio of combos in flight over many days, with users revisiting/tweaking/redoing
      individual steps — not long-running paused jobs, but many tracked records picked back up.
      One file per combination (e.g. `memory/<customer>__<variant>.md`) capturing status, completed
      steps, collected inputs, and key decisions + last-touched. On invocation, the skill checks for an
      existing record and offers to resume vs. start fresh.
      - Locality: store under `.claude/skills/claude-rollout-on-aws/memory/` (per `/skill-commit`
        runtime-data-locality gate — NOT the repo-level `memory/`). `memory/` is already in this
        skill's `.gitignore`.
      - Open: naming/collision when a customer has multiple rollouts of the same variant; schema for
        the state file; how this interacts with the existing `memory/customers/<name>.md` CRM files.

      **DECISION (locked):** Pursue checkpointing — it's the right model for the portfolio/re-iterate
      pattern. Build order: write variant instructions FIRST, add the memory layer as a near
      fast-follow right after variant #1 (Claude for Enterprise) exists. Two things to do *while*
      authoring each variant so the retrofit is mechanical:
        1. Make every step checkpoint-friendly — numbered, a clear "done" signal, named inputs/decisions.
        2. Keep steps mapping cleanly onto a per-combo record (status / completed steps / inputs /
           decisions / last-touched). Reserve this shape; don't implement read/write logic yet.
      Lock the state-file schema against real data once variant #1's steps land, then add memory across
      all three variants in one pass.

## Open questions

- [ ]

## Someday / maybe

- [ ]
