# Claude on Amazon Bedrock — Manual Config

> Path of the `Claude on Amazon Bedrock` variant. Self-contained guide for deploying
> **Claude Code** and **Claude Cowork** via Amazon Bedrock with manual infrastructure setup.
>
> Copy-paste artifacts (SCPs, IAM permission set, use-case form, path/location tables) live in
> **`policies.md`** alongside this file — referenced by step number below.

This path **guides the customer's platform/identity/security teams** through standing up the
AWS foundation and rolling Claude out to teams. All data stays within the customer's AWS
boundary — Anthropic never sees prompts or completions.

## What gets deployed

- **Claude Code** — CLI/IDE AI coding assistant. Authenticates via the AWS SDK credential
  chain. For development teams.
- **Claude Cowork** — desktop AI companion (long-running tasks, local files, MCP connectors).
  In-app AWS sign-in via IAM Identity Center — no CLI on end-user machines. For all teams.

**Architecture principles:** per-team dedicated AWS accounts (cost isolation + independent
governance) · centralized identity via IAM Identity Center federated to Microsoft Entra ID ·
data stays within the AWS boundary · team-specific model access + config profiles · CloudTrail
audit logging with per-user attribution.

## When to use this path

The customer wants Claude Code and/or Claude Cowork running on **Bedrock in their own AWS
accounts**, and their platform team will **configure the infrastructure by hand** (Console +
CLI) rather than via an automation/IaC tool. Choose **Automated config** instead when they want
the same outcome provisioned through tooling. Choose a different *variant* entirely if they want
managed first-party seats (**Claude for Enterprise**) or **Claude Platform on AWS**.

## Prerequisites

Confirm before starting — collect each as a named input:

- **AWS Organizations** in place with a defined OU structure.
- **Teams identified** — each team that will get Claude (drives accounts, Entra groups, quotas).
- **Identity team** ready to federate **Microsoft Entra ID** to IAM Identity Center (SAML 2.0 +
  SCIM).
- **Owning teams** for the cross-functional checklist: Cloud Platform, Identity, FinOps,
  Security, Team Leads (see the onboarding checklist in `policies.md`).
- **Approved regions** decided (e.g. us-east-1, us-west-2) — drives the region SCP.
- **Approved models** decided — drives the permission-set ARNs and the model SCP.

## Workflow

Five phases. **Phase A (Foundation)** is done once per org; **Phase B (Account onboarding)** is
repeated per team; **Phases C–D** deploy the two products; **Phase E** is day-2 operations.

Each step names its inputs/decisions and a **Done when** signal — use these as checkpoints when
tracking a customer + variant combination.

⚠️ **HITL — this path mutates AWS resources.** SCP attachment, permission sets, quota requests,
budgets, and use-case submission all change the customer's environment. Present what will change
and get explicit approval before any apply/submit. SCPs especially are org-wide guardrails —
confirm OU scope and review the deny statements before attaching.

---

### Phase A — Org foundation (once per organization)

#### Step 1 — Decide the OU structure

- **Option A:** dedicated OU for Claude workload accounts (e.g. `OU: AI-Assistants`) —
  simplifies SCP inheritance. *(Recommended.)*
- **Option B:** Claude accounts inside existing team/BU OUs — aligns with current org structure
  but requires per-account SCP attachment.
- Management account retains central governance and SCP attachment.
- **Input:** chosen OU model.
- **Done when:** the Claude OU (or target OUs) exists and is agreed.

#### Step 2 — Configure IAM Identity Center

- Enable IAM Identity Center in the management account (or delegated admin).
- Configure **Microsoft Entra ID** as external identity source — SAML 2.0 federation + SCIM
  provisioning.
- Create per-team **Entra ID security groups** (e.g. `SG-Claude-TeamAlpha`) for SCIM sync.
- Set permission-set **session duration to 8–12 hours**.
- **Input:** Entra groups per team.
- **Done when:** Entra users/groups sync into Identity Center via SCIM.

#### Step 3 — Apply Service Control Policies to the Claude OU

Attach the three SCPs from **`policies.md`**:
1. **Restrict Bedrock to approved Claude models only** (deny non-`us.anthropic.claude-*`).
2. **Deny model access changes** except `CentralAdminRole`.
3. **Enforce region restriction** to the approved region list.

- **Input:** approved model list, approved regions, central admin role name.
- **HITL:** review each deny statement and confirm the OU scope before attaching — these apply
  across all team accounts.
- **Done when:** all three SCPs are attached to the Claude OU and inheritance is verified.

---

### Phase B — Per-team account onboarding (repeat per team)

Run the full **new-account onboarding checklist** in `policies.md` (10 items across Cloud
Platform / Identity / FinOps / Security / Team Lead). The key steps are broken out below.

#### Step 4 — Shared vs. dedicated account decision

- **Best practice:** provision a **dedicated AWS account per team** — eliminates quota
  contention, simplifies cost tracking, ensures precise SCP scoping.
- If a team wants to reuse an existing Bedrock account, assess the risks (quota contention, cost
  attribution complexity, budget-alert noise, broader blast radius):
  - Review current quota utilization (CloudWatch: `InvocationCount`, `TokenCount`,
    `InvocationThrottles`).
  - If headroom is insufficient or workloads are mission-critical → **create a dedicated
    account**.
  - If sharing is acceptable → request quota increases + set up Application Inference Profiles
    for cost separation.
- **Input:** dedicated vs. shared decision per team.
- **Done when:** the team's account model is chosen and (if dedicated) the account is created
  under the Claude OU with SCPs inherited.

#### Step 5 — Submit the Anthropic use-case form (one-time per account)

Required before Claude models can be invoked. Lightweight form (company, website, intended use);
access typically granted immediately. Use **Option A (Console)** or **Option B (CLI)** from
`policies.md`. CLI must target **us-east-1**; submitting principal needs
`bedrock:PutUseCaseForModelAccess`.

- **HITL:** this submits company info to Anthropic — confirm the form contents before submitting.
- **Done when:** Anthropic model access is granted for the account.

#### Step 6 — Quotas, budgets, logging

- Request model invocation quotas (TPM) by team size — see the sizing table in `policies.md`.
- Set up AWS Budgets with alerts at **80% and 100%**.
- Configure CloudWatch alarms for throttling (`InvocationThrottles`).
- Enable Bedrock invocation logging to S3 and CloudTrail.
- **Input:** team size → target TPM + budget.
- **Done when:** quotas validated, budgets + alarms live, invocation logging on.

---

### Phase C — Claude Code deployment

#### Step 7 — Create the Claude Code permission set

- In IAM Identity Center, create a permission set with the inline policy from `policies.md`
  (`bedrock:InvokeModel` + `InvokeModelWithResponseStream`, scoped to approved model ARNs —
  Opus 4.7, Sonnet 4.6, Haiku 4.5 as separate statements).
- Session duration 8–12 hours. Assign the team's Entra group to the permission set + account.
- **Done when:** the permission set is assigned and an SSO role is available to the team.

#### Step 8 — Developer machine setup

- **Prerequisites:** AWS CLI v2; Claude Code CLI (`npm install -g @anthropic-ai/claude-code`);
  network access to Bedrock + Identity Center.
- **AWS SSO profile:** configure `~/.aws/config` with SSO session, account ID, role name.
- **Environment variables:** `CLAUDE_CODE_USE_BEDROCK=1`, `AWS_REGION`, `AWS_PROFILE`.
- **Model pinning:** `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, etc. Use
  cross-region inference profile IDs (`us.` prefix) for higher availability.
- **Done when:** the profile, env vars, and model pins are in place on the dev machine.

#### Step 9 — Managed settings (org controls)

- Deploy `managed-settings.json` to the OS path in `policies.md` (macOS / Linux-WSL / Windows).
- Controls: permissions (allow/deny), MCP server restrictions, sandbox networking, env vars.
- Set `allowManagedPermissionRulesOnly: true` and `allowManagedMcpServersOnly: true`.
- **Done when:** managed settings are present and enforced on the device.

#### Step 10 — Verify (and VS Code extension)

- `aws sso login --profile claude-code` → `claude` launches → `/status` shows **Amazon Bedrock**
  as provider and lists the pinned models.
- **VS Code extension:** shares the same AWS credential chain — if the CLI works with the SSO
  profile, the extension picks it up. Run `claude configure` → select Amazon Bedrock → specify
  the SSO profile (`~/.claude/settings.json`). Restart the extension if VS Code was open during
  SSO login.
- **Done when:** `/status` confirms Bedrock + models, and a pilot user completes an end-to-end
  request.

---

### Phase D — Claude Cowork deployment

#### Step 11 — Understand the auth flow

Cowork uses **in-app AWS sign-in**: launch → "Sign in with AWS" → browser opens the IAM
Identity Center device-authorization flow → authenticate via Entra ID (corporate creds + MFA) →
token stored encrypted in OS secure storage → re-auth on session expiry (8–12 hours).

#### Step 12 — Configure Cowork

Two approaches — pick by rollout stage:

- **Manual (initial rollout):** install Claude Desktop from `claude.com/download` — **do NOT
  sign in**. Enable Developer Mode (Help → Troubleshooting → Enable Developer Mode) → Developer →
  Configure third-party inference. Set Inference Provider = Bedrock, Region, SSO Start URL, SSO
  Region, Account ID, Role Name; configure the model list with Bedrock inference profile IDs →
  "Apply Locally" (app relaunches with "Sign in with AWS"). ⚠️ **Remove the
  `inferenceBedrockProfile` field** to enable in-app AWS sign-in.
- **MDM-based (future state):** build config on an admin machine → export `.mobileconfig`
  (macOS) or `.reg` (Windows) → deploy via MDM (Jamf, Intune, Workspace ONE) **before**
  distributing the app. Paths in `policies.md`. Makes the in-app config window read-only on
  managed devices. Intune MSIX: Apps → Windows → Line-of-business → upload `.msix`. ADMX: import
  the Claude template, create a per-team configuration policy.
- **Input:** manual vs. MDM approach.
- **Done when:** Cowork launches, signs in via AWS, and routes a request through Bedrock.

---

### Phase E — Day-2 operations (reference)

Repeatable SOPs — follow when the trigger occurs, not during initial rollout:

- **SOP-1 — Onboard user to existing team:** add to Entra group (SCIM ≤40 min) → deploy tools +
  config → UAT → onboarding email.
- **SOP-2 — Onboard new team:** dedicated account under Claude OU → use-case form → Entra group +
  SCIM → permission set + assignment → budgets/monitoring/quotas → pilot 3–5 users → full rollout.
- **SOP-3 — Modify model access:** evaluate cost (Opus ≈ 5× Sonnet/token), quota, region → update
  model SCP allowed list → update `managed-settings.json` + Cowork MDM profiles → adjust budgets.
- **SOP-4 — Revoke user:** remove from Entra group (SCIM deprovisions); for immediate revocation
  delete the Identity Center session → remove CLI/managed-settings + Cowork from device → verify
  via CloudTrail (no post-revocation calls).
- **SOP-5 — Decommission team:** remove all users from Entra group → delete permission-set
  assignment → disable Bedrock model access → archive CloudTrail + invocation logs →
  close/suspend account (retain for audit) → remove MDM profiles + delete Entra group.

**Monitoring & cost:** account-level spend via Cost Explorer (per-team accounts); per-user via
IAM principal-based cost allocation (visibility only, not enforcement). Quota enforcement via
OTel → OTLP:4318 → OTel Collector (ECS Fargate) → CloudWatch/S3, with a Redis counter store
(alert-only via SNS / soft-block via Lambda IAM deny / hard-block via pre-request proxy check).
Recommended alarms: `InvocationThrottles > 10` in 5 min; `InvocationErrors > 5%`; monthly cost
> 80% of budget.

**Security & compliance:** data stays in the AWS boundary; Anthropic does not store, access, or
train on Bedrock data; ZDR available. Bedrock Guardrails for content filtering / PII redaction /
topic blocking — ⚠️ **do NOT enable the automated reasoning policy** (unsupported, causes runtime
failures). Cross-account guardrail enforcement via AWS Organizations Bedrock policies (create +
version in management account → resource-based policy → enable Bedrock Policy Type → attach to
Claude OU). Consider PrivateLink for Bedrock endpoints; use sandbox network allowlists; CloudTrail
+ invocation logs give a full audit trail traceable to Entra ID users.

## Summary card

On completion, present a card following `memory/terminal-style.md`:

```
DONE ✅ — Claude on Bedrock (Manual Config)
───────────────────────────────────────────
✅  Foundation   OU <name> · Identity Center + Entra (SCIM) · 3 SCPs attached
✅  Account      <team> — <dedicated/shared> · use-case approved · quotas/budgets/logging
✅  Claude Code  permission set + machine config · /status shows Bedrock
✅  Cowork       <manual/MDM> config · in-app AWS sign-in verified
⚠️  Day-2        SOPs + monitoring/guardrails documented — owners assigned

→  <next step, e.g. "Onboard TeamBeta (SOP-2)" or "Stand up OTel quota enforcement">
```
