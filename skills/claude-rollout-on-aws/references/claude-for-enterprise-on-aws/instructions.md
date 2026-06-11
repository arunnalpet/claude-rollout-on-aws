# Claude for Enterprise on AWS

> Variant of `/claude-rollout-on-aws`. Self-contained guide for subscribing,
> configuring, and migrating to Claude for Enterprise on AWS Marketplace.

This variant **guides the end user** through a workspace rollout — the user performs the
clicks in AWS Marketplace, Claude Admin, and their IdP; the skill walks them through each
step, tracks where they are, and confirms decisions before they commit to a path.

## When to use this variant

The customer wants the **first-party Claude apps** — Claude on web, desktop, mobile, plus
Claude Code — delivered as managed seats, with billing and procurement through AWS
Marketplace. Identity is federated to the customer's own IdP (this guide assumes Microsoft
Entra ID). Choose this over **Claude on Amazon Bedrock** (API/model access in the customer's
own AWS account) or **Claude Platform on AWS** when the goal is end-user productivity apps
with centrally managed seats and SSO.

## Prerequisites

Confirm these are in place before starting — collect each as a named input:

- **Infra / Cloud team** — owns the AWS Marketplace subscription and provides the **Primary
  Owner** of the Claude workspace.
- **Identity team** — manages Microsoft Entra ID; will configure SSO (SAML 2.0) and,
  optionally, SCIM provisioning.
- **Primary Owner decision** — exactly one per workspace (super-user: full billing + admin).
  Multiple Admins are allowed, but only one Primary Owner. Pick deliberately — ideally from
  the Infra/Cloud team. ⚠️ This is hard to change later; confirm the named person before
  proceeding.
- **IdP confirmed** — this guide assumes **Microsoft Entra ID**. If the customer uses a
  different IdP, flag it: the SSO steps (Step 3) will differ and the SAML specifics won't
  apply verbatim.
- **SCIM decision (optional)** — automatic user sync requires an **Entra ID P1 or P2**
  license. Note whether the customer wants it.

> The Identity team can prep in parallel with subscription/Primary-Owner setup: domain
> verification (DNS TXT record), creating the Claude Enterprise App in Entra (SAML 2.0),
> deciding on SCIM, and identifying which Entra groups/users get Claude access.

## Workflow

The rollout has three phases. **Phase 1 (Subscribe)** and **Phase 2 (Configure)** are the core
path; **Phase 3 (Migrate)** applies only when the customer has existing Claude usage to move.

Each step below names its inputs/decisions and a **Done when** signal — use these as
checkpoints when tracking progress for a customer + variant combination.

---

### Phase 1 — Subscribe

#### Step 1 — Choose the subscription path

Both paths lead to the same product; they differ on pricing and procurement. Confirm which one
applies before proceeding:

| Path | Use when | Key facts |
|---|---|---|
| **A — Self-serve (AWS Marketplace)** | Standard sign-up, no negotiated terms | Min **20 seats**; single Enterprise seat type (Claude web/desktop/mobile + Claude Code); billed annually, per user/month |
| **B — Private offer** | Negotiated pricing/terms via Anthropic account team | Offer appears in AWS Marketplace → Manage subscriptions → review terms/pricing/seat count → accept to activate |

**Choosing seats during subscription:** seats start at the **20-seat** minimum and are added
in **20-seat increments**. Set the desired seat count as part of the Marketplace subscription
flow.

**Seat rules:** add seats anytime (prorated, charged immediately); **seat reductions take
effect only at annual renewal**. Day-2 seat changes: Org settings → Billing → pencil under
**Seats** → enter count → confirm prorated charge. A seat is also auto-purchased when inviting
a member if none are free.

- **Input:** chosen path (A / B); seat count (multiple of 20, min 20).
- **HITL:** confirm the path and seat count with the user before they action it — both create
  a billing commitment.
- **Done when:** the subscription is active. The **Primary Owner receives a setup email from
  Anthropic** to create the workspace.

---

### Phase 2 — Configure (with Entra ID)

> Assumes Microsoft Entra ID as the IdP. Role badges indicate who performs each action:
> *(Primary Owner)*, *(Identity Team)*, *(Both Teams)*.

#### Step 2 — Primary Owner sets up the workspace *(Primary Owner)*

- The Primary Owner opens the Anthropic setup email and goes to **https://claude.ai/login**.
- Create the **workspace name** — the org's Claude environment.
- Until SSO is configured, the Primary Owner signs in via **magic-link** (passwordless email).
- **Input:** workspace name.
- **Done when:** the workspace exists and the Primary Owner can sign in via magic-link.

#### Step 3 — Configure SSO (SAML 2.0 with Entra ID)

A multi-party sequence. Keep the Claude SSO flow open while the Identity team works in Entra.

**3a. Verify your domain in Claude** *(Primary Owner)*
- Claude Admin → **Identity and access** → add company domain → follow verification.
- Requires a **DNS TXT record** (coordinate with the DNS admin).
- **Done when:** the domain shows verified in Claude.

**3b. Start the SSO setup flow in Claude** *(Primary Owner)*
- In Identity and access, start SSO configuration.
- Capture the **Entity ID** and **Reply URL (ACS URL)** — hand these to the Identity team.
- Keep the flow open.
- **Output:** Entity ID, Reply URL (ACS URL).

**3c. Create the Enterprise Application in Entra** *(Identity Team)*
- Entra Admin Center → **Enterprise applications** → New application.
- Search "Claude" in the gallery, or **"Integrate any other application you don't find in the
  gallery"** and name it "Claude".
- **Done when:** the Claude Enterprise App exists in Entra.

**3d. Configure SAML settings** *(Identity Team)*
- App → **Single sign-on** → SAML.
- **Basic SAML Configuration:** enter the **Entity ID** and **Reply URL** from step 3b.
- **Sign-on URL:** `https://claude.ai/login`
- **Attributes & Claims:** set the email claim to `user.mail`.
- Download the **Federation Metadata XML**.
- **Output:** Federation Metadata XML.

**3e. Upload metadata and verify** *(Both Teams)*
- Identity team shares the Federation Metadata XML with the Primary Owner.
- Primary Owner uploads it in the Claude SSO configuration flow.
- **Test the connection** — both teams verify a test user can log in via SSO.
- Once verified, **enable SSO enforcement** for the workspace.
- **HITL:** do not enforce SSO until a test user has successfully logged in — enforcing early
  can lock users out.
- **Done when:** test login succeeds and SSO enforcement is enabled.

#### Step 4 — Invite users

Method depends on what's configured. Pick the row(s) that apply:

| Mode | How users get access |
|---|---|
| **Pre-SSO** | Primary Owner manually invites early users via the Admin Console (magic-link login) |
| **Post-SSO** | Users go to `claude.ai/login` → enter company email → redirected through the corporate IdP |
| **With SCIM** | Users auto-provisioned when assigned in the IdP — no manual invites |
| **With JIT** | Users created on first SSO login if they match the verified domain |

- **Input:** invite mode in use.
- **Done when:** intended users can reach Claude at `claude.ai/login` with company credentials.

✅ At this point the Claude Enterprise workspace is configured. Proceed to Phase 3 only if the
customer has existing Claude usage to migrate.

---

### Phase 3 — Migrate (only if existing Claude usage)

#### Step 5 — Choose the migration scenario

| Scenario | Situation | Approach |
|---|---|---|
| **A — Self-owned Enterprise → Enterprise on AWS Marketplace** | Customer already runs a self-owned Enterprise org | Work with Anthropic to **reuse the same workspace UUID**. Users and data retained as-is — no re-provisioning. Billing moves to AWS Marketplace; workspace stays intact. Contact the Anthropic account team to initiate. |
| **B — Domain claim (personal & team subscriptions)** | Pre-existing **personal**/**team plan** users on the company email domain | Admin initiates a **domain claim**; existing users are notified and absorbed into the Enterprise workspace. Conversations and projects migrate automatically. Users can accept the move or export their data. Reference: [Respond to an Enterprise domain claim](https://support.claude.com/en/articles/14625626-respond-to-an-enterprise-domain-claim-on-your-claude-account) |
| **C — Enterprise-to-Enterprise (manual)** | Moving between two Enterprise orgs | **No built-in migration tool.** Move projects one-by-one with the Project Migration Tool. |

- **Input:** chosen scenario (A / B / C).
- **HITL:** scenarios A and B affect existing users' data and accounts — confirm scope and
  notify affected users before initiating.
- **Done when:** users and data are present in the Enterprise on AWS workspace per the chosen
  scenario.

## Summary card

On completion, present a card following `memory/terminal-style.md`:

```
DONE ✅ — Claude for Enterprise on AWS
──────────────────────────────────────
✅  Subscribe   Path <A/B/C> — <N> seats
✅  Workspace   <workspace name> — Primary Owner: <name>
✅  SSO         Entra ID (SAML 2.0) — enforcement <enabled/pending>
✅  Users       <invite mode> — access verified
✅  Migration   Scenario <A/B/C> — <summary>   (omit if no migration)

→  <next step, e.g. "Identity team to enable SCIM" or "Roll out Claude Code to engineering">
```
