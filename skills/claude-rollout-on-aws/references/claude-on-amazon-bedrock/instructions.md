# Claude on Amazon Bedrock

> Variant of `/claude-rollout-on-aws`. Sub-router for the two configuration paths.

Claude on Amazon Bedrock gives the customer Claude **model/API access inside their own AWS
account**. There are two configuration paths — each is self-contained in its own file.

## When to use this variant

The customer wants Claude (Claude Code and/or Claude Cowork) running on **Bedrock in their own
AWS accounts**, with all prompt/completion data staying inside their AWS boundary. Identity
federates to IAM Identity Center. Choose this over **Claude for Enterprise** (managed first-party
seats with their own IdP SSO) or **Claude Platform on AWS** when the customer wants model access
governed inside their AWS org.

## Path selection

| Path | Use when | Instructions |
|---|---|---|
| **Manual config** | Platform team configures the foundation **by hand** — OU/SCPs, IAM Identity Center permission sets, per-team accounts, quotas, managed settings. Most control; Entra ID federation assumed | `manual-config/instructions.md` |
| **Automated config (CCWB)** | Customer prefers **tooling-driven, CloudFormation-based** deployment via the CCWB CLI (`init`/`deploy`/`package`/`distribute`). Native IAM Identity Center auth; built-in monitoring/analytics/quota | `automated-config/instructions.md` |

### Step 1 — Identify the path

If the user names the path (or it's clear from context), select it directly. Otherwise present
the table above and ask which path applies.

### Step 2 — Load and follow the path instructions

Read the matching `<path>/instructions.md` and follow its steps **exactly**. Each path's folder
may also hold supporting files (templates, scripts, lookup data) — its `instructions.md`
references them as needed. Do not mix steps across paths.

## Conventions

- **Human-in-the-loop**: any step that mutates AWS resources, submits a request, or sends a
  message requires explicit user approval first — each path file documents its own gates.
- **Terminal style**: follow `memory/terminal-style.md` for draft boxes, symbols, summary cards.
