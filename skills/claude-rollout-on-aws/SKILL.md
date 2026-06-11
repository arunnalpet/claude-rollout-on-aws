---
name: claude-rollout-on-aws
description: Guide end users through configuring and rolling out Claude on AWS across its three deployment variants — Claude for Enterprise on AWS, Claude on Amazon Bedrock, and Claude Platform on AWS. Each variant has distinct, elaborate setup steps. Use when the user wants to set up, configure, deploy, or roll out Claude on AWS. Triggers include "configure claude", "rollout claude", "set up claude on aws", "claude for enterprise", "claude on bedrock", "claude platform on aws", "deploy claude", "claude rollout".
---

# Claude Rollout on AWS

Thin router that points the user to the correct deployment variant, then hands off to that variant's detailed instructions. Each variant lives in its own reference file with self-contained, elaborate steps — this SKILL.md only selects the right one.

## Variants

| Variant | Use when | Reference |
|---|---|---|
| **Claude for Enterprise on AWS** | Customer wants first-party Claude apps (web/desktop/mobile + Claude Code) as managed seats, billed via AWS Marketplace, with SSO to their own IdP | `references/claude-for-enterprise-on-aws/instructions.md` |
| **Claude on Amazon Bedrock** | Customer wants Claude Code / Cowork on Bedrock in their own AWS accounts, data staying in their AWS boundary, identity via IAM Identity Center. Has two paths: manual config or automated (CCWB) | `references/claude-on-amazon-bedrock/instructions.md` |
| **Claude Platform on AWS** | _(to be defined)_ | `references/claude-platform-on-aws/instructions.md` |

## Workflow

### Step 1 — Identify the variant

If the user's request already names the variant (or it's unambiguous from context), select it directly.

Otherwise, present the table above and ask which variant they're rolling out. Use the comparison to help them choose.

### Step 2 — Load and follow the variant instructions

Read the matching `references/<variant>/instructions.md` file and follow its steps **exactly**. Each variant's folder may also hold supporting files (templates, scripts, lookup data) — the `instructions.md` references them as needed.

- Do not mix steps across variants — each is self-contained.
- Do not summarise from memory; the reference file is the source of truth.

### Step 3 — Hand off

Follow the selected variant's workflow through to its own completion summary. The variant file owns its draft previews, human-in-the-loop confirmations, and summary card.

## Conventions

- **Human-in-the-loop**: any step that mutates AWS resources, submits a request, or sends a message requires explicit user approval first — each variant file documents its own gates.
- **Terminal style**: follow `memory/terminal-style.md` for draft boxes, symbols, and summary cards.
