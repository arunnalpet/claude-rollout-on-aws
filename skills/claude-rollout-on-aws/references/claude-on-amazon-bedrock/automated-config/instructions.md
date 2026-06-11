# Claude on Amazon Bedrock — Automated Config (CCWB)

> Path of the `Claude on Amazon Bedrock` variant. Self-contained guide for deploying
> **Claude Code** and **Claude Cowork** on Amazon Bedrock using the **CCWB (Claude Code
> WorkBench)** tooling with AWS IAM Identity Center authentication.
>
> **Source:** [guidance-for-claude-code-with-amazon-bedrock](https://github.com/aws-solutions-library-samples/guidance-for-claude-code-with-amazon-bedrock)

CCWB is the CLI tool from the AWS Solutions guidance repo. It orchestrates the full deployment
lifecycle: `init` creates a local profile · `deploy` provisions CloudFormation stacks ·
`package` builds platform-specific installers · `distribute` shares them with end users. This
path uses the **IAM Identity Center (native AWS)** authentication route — no external OIDC stack.

## When to use this path

The customer wants Claude Code and/or Claude Cowork on Bedrock, and prefers a **tooling-driven,
CloudFormation-based deployment** over hand-building the infrastructure. Identity is **IAM
Identity Center** (users synced from AD/Okta/external or created natively) — CCWB auto-detects
identity from the `AWSReservedSSO_*` role ARN, giving full per-user attribution in observability
with no extra OIDC config. Choose **Manual config** instead if the platform team wants to
configure SCPs/permission sets/accounts by hand. Choose a different *variant* for managed
first-party seats (**Claude for Enterprise**) or **Claude Platform on AWS**.

## Prerequisites

Confirm before starting — collect each as a named input. Stakeholder in parentheses.

**Admin machine** *(AWS Admin / Cloud Team)*
- Python 3.10–3.13 · Poetry · AWS CLI v2 · Git · Go 1.23+ (cross-platform binary builds)

**AWS** *(AWS Admin)*
- AWS account with IAM/CloudFormation permissions
- Amazon Bedrock activated in target regions
- IAM Identity Center active with users/groups provisioned
- (Optional) ECS, CloudWatch, Athena, Glue, Lambda, Firehose permissions — for
  monitoring/analytics

**End users**
- Claude Code installed (CLI users) · Claude Desktop installed (Cowork users) · web browser for
  SSO. **No Python/Poetry/Git** — users receive pre-built packages.

## Workflow

The rollout follows the CCWB lifecycle. Each step names its inputs/decisions and a **Done when**
signal — use these as checkpoints when tracking a customer + variant combination.

⚠️ **HITL — `ccwb deploy` (Step 4) provisions real AWS CloudFormation stacks** (VPC, ECS
Fargate, Firehose, DynamoDB, Lambda, etc.) and incurs cost. `init`, `package`, and the IAM IDC
setup are safe-to-prep, but present what `deploy` will create and get explicit approval before
running it. MDM deployment (Step 6) also pushes config to end-user machines — confirm scope.

---

### Step 1 — Configure IAM Identity Center *(AWS Admin / Identity Team)*

Native AWS identity path — no external IdP required.

- **Verify IAM Identity Center is enabled** in the management account.
- **Provision users/groups** — ensure developers who need Claude exist in Identity Center
  (synced from AD/Okta/external, or created manually).
- **Create a Permission Set for Bedrock access** — `bedrock:InvokeModel*` scoped to target
  regions.
- **Assign the Permission Set** to developer groups on the target AWS account.
- **Set session duration** — recommended **7 days** (max 90) to minimize re-auth friction.
- **Distribute the SSO start URL** + profile name to developers (e.g.
  `aws sso login --profile bedrock-dev`).
- **Input:** permission set name, target regions, developer groups, profile name, SSO start URL.
- **Done when:** assigned developers can `aws sso login` and reach Bedrock in the target account.

### Step 2 — Clone & install CCWB *(AWS Admin / Cloud Team)*

```bash
git clone https://github.com/aws-solutions-library-samples/guidance-for-claude-code-with-amazon-bedrock
cd guidance-for-claude-code-with-amazon-bedrock/source
poetry install
```

- **Done when:** `poetry run ccwb` is runnable on the admin machine.

### Step 3 — Initialize the profile (`ccwb init`) *(AWS Admin / Cloud Team)*

```bash
poetry run ccwb init
```

Wizard choices for the **IAM IDC path**:

| Prompt | Choice / notes |
|---|---|
| Profile name | e.g. `corp-bedrock-prod` |
| **Enable SSO authentication?** | **No** — this is CCWB's *own* OIDC auth stack; users already auth via IAM Identity Center |
| AWS Region | region for the CloudFormation stacks |
| Stack base name | prefix for all stacks (e.g. `claude-code-auth`) |
| Enable monitoring? | **Yes** (recommended) — Central Collector or Sidecar |
| Enable analytics? | Yes for Athena + S3 data lake |
| Enable quota monitoring? | Yes to enforce per-user token limits |
| Enable Windows builds? | Yes if you have Windows users |
| Generate CoWork 3P MDM config? | Yes for Claude Desktop deployment |
| Claude model | Sonnet / Haiku / Opus |
| Cross-region profile | US / EU / APAC |
| Source region | e.g. `us-east-1` |

- **Input:** all wizard answers above (esp. **SSO auth = No**, monitoring choice, model).
- **Note:** `init` only writes config locally to `~/.ccwb/profiles/<name>.json` — **nothing is
  deployed to AWS** at this stage.
- **Done when:** the profile JSON exists with the intended configuration.

### Step 4 — Deploy infrastructure (`ccwb deploy`) *(AWS Admin / Cloud Team)*

Reads the local profile and creates CloudFormation stacks. Because users authenticate via IAM
Identity Center, **no auth stack (OIDC/Cognito) is deployed** — only the monitoring, analytics,
and quota stacks you enabled.

```bash
poetry run ccwb deploy      # deploy all configured stacks
poetry run ccwb status      # monitor progress
```

**What gets created (IAM IDC path):**
- **Monitoring** — VPC, ECS Fargate (OTEL collector), ALB, CloudWatch dashboards
- **Analytics** — Kinesis Firehose → S3 → Glue → Athena (if enabled)
- **Quota** — DynamoDB (limits), Lambda (monitor), SNS (alerts), API Gateway (if enabled)
- **CodeBuild** — Windows `.exe` compilation (if enabled)

- **HITL:** confirm the stack list and that costs are understood before running `deploy`.
- **Done when:** `ccwb status` shows all enabled stacks `CREATE_COMPLETE` (≈5–15 min).

### Step 5 — Build & distribute packages (`ccwb package`) *(AWS Admin / Cloud Team)*

Compiles the credential-helper binary per platform (Go cross-compilation). The binary handles
token refresh, OTEL metric reporting, and AWS credential resolution, and configures the user's
`~/.aws/config` with a `credential_process` entry.

```bash
poetry run ccwb package --go --target-platform all   # build all platforms
poetry run ccwb distribute                            # presigned S3 URLs
poetry run ccwb cowork generate                       # CoWork MDM configs
```

- **Platform targets:** macOS ARM64 (Apple Silicon), macOS Intel (x86_64, runs everywhere via
  Rosetta), Linux x86_64 + ARM64, Windows x64 (CodeBuild + Nuitka).
- **Distribution options:** presigned S3 URLs (time-limited links via Slack/email) ·
  authenticated landing page (self-service SSO + platform detection) · manual (zip `dist/`).
- **Cowork configs produced:** `cowork-3p.mobileconfig`, `cowork-3p.reg`,
  `cowork-3p-config.json`.
- **Input:** distribution method.
- **Done when:** installers are built and a download path is available to users.

### Step 6 — MDM deployment (Claude Cowork / Desktop) *(IT Admin / MDM Team)*

- **macOS:** deploy `cowork-3p.mobileconfig` via Jamf / Kandji / Mosyle.
- **Windows:** deploy `cowork-3p.reg` via Intune / Group Policy (writes to
  `HKCU\SOFTWARE\Policies\Claude`).
- **Verify the MDM key** — `inferenceBedrockProfile` must point to the correct AWS named profile
  in `~/.aws/config`.
- ⚠️ **Install order matters** — users must run the CLI installer (`install.sh` / `install.bat`)
  **before** opening Claude Desktop, so the named profile exists.
- ⚠️ **macOS note** — unsigned profiles require user approval in System Settings → Privacy &
  Security → Profiles after delivery.
- **HITL:** confirm MDM scope/targeting before pushing config to managed devices.
- **Done when:** the Cowork MDM config is delivered and the named profile resolves on target
  machines.

### Step 7 — Developer setup *(End Users / Developers)*

**Claude Code (CLI):**
- Run the installer package from IT (`install.sh` / `install.bat`).
- `aws sso login --profile <profile-name>`.
- Start using Claude Code — credentials auto-refresh from the IAM Identity Center session.

**Claude Cowork (Desktop):**
- Ensure the installer has run (sets up the AWS named profile).
- Open Claude Desktop — auth is handled automatically by the credential helper.
- Full capabilities: Projects, Artifacts, MCP servers.

- **No API keys** — developers use existing corporate credentials via `aws sso login`; temporary
  credentials are issued and refreshed automatically.
- **Done when:** a pilot user runs an end-to-end Bedrock request from both CLI and Desktop.

---

### Day-2 — Observability, monitoring, quota (reference)

**Observability** *(Platform / DevOps)* — the credential helper emits OpenTelemetry (OTLP) on
every Bedrock call (tokens, latency, model, identity). Collector options: **Central Collector**
(ECS Fargate; receives OTLP from all machines → CloudWatch EMF + Firehose) or **Sidecar** (local
per-machine, lighter, no VPC). Identity attribution: IAM IDC users → real username/email from
`AWSReservedSSO_*` ARN; IAM users → username from ARN; non-SSO assumed roles → hashed anonymous
ID. Optional analytics: Firehose → S3 lake → Glue → Athena, 10 pre-built SQL queries, 90-day hot
+ Glacier archive — for chargeback/cost attribution/trend analysis.

**Monitoring** *(Platform / DevOps)* — CloudWatch dashboards (PromQL): token usage, cost
tracking, model breakdown, latency P50/P95/P99, error/throttle rates. Cost: Central Collector
≈ $30–50/month (VPC + ECS + ALB); Sidecar $0 server cost. Enable later via `ccwb init` then
`poetry run ccwb deploy monitoring`.

**Quota management** *(Platform / FinOps)* — DynamoDB stores per-user/group/default token limits;
Lambda checks every 15 min via PromQL and sends SNS alerts at 80/90/100%; API Gateway does a
real-time check at credential issuance. Defaults: **225M tokens/user/month**, burst buffer
5–25% (default 10%), daily enforcement `alert`|`block`, monthly enforcement `alert`|`block`
(recommend **block**), check interval 0 min (every request, +200ms) / 30 min (default) / 60 min.
⚠️ Per-user quota enforcement **requires the monitoring stack** — without it, only aggregate
limits are possible.

## Summary card

On completion, present a card following `memory/terminal-style.md`:

```
DONE ✅ — Claude on Bedrock (Automated / CCWB)
────────────────────────────────────────────────
✅  Identity    IAM Identity Center — permission set + groups · session <Nd>
✅  Profile     ccwb init — <profile name> · model <Sonnet/Haiku/Opus> · SSO auth = No
✅  Deploy      stacks CREATE_COMPLETE: <monitoring/analytics/quota/codebuild>
✅  Package     installers built (<platforms>) · distributed via <method>
✅  Cowork      MDM config delivered (<Jamf/Intune/...>) · named profile verified
✅  Users       pilot verified CLI + Desktop end-to-end
⚠️  Day-2       observability/monitoring/quota documented — owners assigned

→  <next step, e.g. "Set per-user quotas to block at 225M/mo" or "Roll out to remaining teams">
```
