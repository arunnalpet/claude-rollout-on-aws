---
name: Claude Apps Gateway Deployment
description: Deploy Claude Apps Gateway on AWS with Keycloak or Microsoft Entra ID as the OIDC identity provider. Provides SSO, per-group model access control, and usage tracking for Claude Code and Claude Desktop.
triggers:
  - deploy claude apps gateway
  - set up claude apps gateway
  - configure claude gateway
  - help me with claude apps gateway setup
---

# Claude Apps Gateway — Deployment Skill

> **Activation:** This skill activates ONLY when the user explicitly asks to:
> - "deploy claude apps gateway"
> - "set up claude apps gateway"
> - "configure claude gateway"
> - "help me with claude apps gateway setup"
>
> Do NOT proactively suggest or start this workflow. Wait for the user to request it.
> If the user is working on unrelated tasks in this directory, ignore this skill entirely.

---

## Overview

Claude Apps Gateway is a self-hosted gateway that sits between Claude Code/Claude Desktop clients and Amazon Bedrock. It provides:

- **SSO authentication** via your corporate identity provider (OIDC)
- **Per-group model access control** — restrict which Bedrock models each team can use
- **Telemetry and usage tracking** — observe who is using what, and how much

> **Key fact:** The gateway binary is the Claude Code binary itself, run as `claude gateway --config gateway.yaml`.

## Architecture

```
Clients (Claude Code / Desktop)
        │
        ▼
 Internal ALB (HTTPS)
        │
        ▼
 ECS Fargate Service (claude gateway binary)
        │
        ├──▶ Amazon Bedrock (model invocation)
        │
        ├──▶ OIDC IdP (Keycloak or Microsoft Entra ID)
        │
        └──▶ RDS PostgreSQL (session state)
```

## Prerequisites

Before starting, ensure you have:

- [ ] AWS account with permissions for ECS, ALB, RDS, ECR, Bedrock, IAM, VPC
- [ ] AWS CLI v2 installed and configured
- [ ] Docker installed locally (or an EC2 instance for container builds)
- [ ] A VPC with at least 2 Availability Zones and private subnets
- [ ] Claude Code v2.1.195 or later
- [ ] Your identity provider (Keycloak or Microsoft Entra ID) already running and accessible

---

## Step 1: Choose Your Identity Provider

**Ask the user:** Which identity provider are you using? **Keycloak** or **Microsoft Entra ID**?

| Answer | Guide |
|--------|-------|
| Keycloak | Follow [idp/keycloak.md](idp/keycloak.md) to configure the OIDC client, then return here |
| Microsoft Entra ID | Follow [idp/entra-id.md](idp/entra-id.md) to configure the app registration, then return here |

Complete the IdP setup before proceeding to deployment steps.

---

## Step 2: Deployment Steps

Follow these in order. Each step is self-contained with commands and validation checks.

| # | File | Description |
|---|------|-------------|
| 01 | [steps/01-aws-networking.md](steps/01-aws-networking.md) | Verify VPC has private subnets across 2+ AZs with NAT routing |
| 02 | [steps/02-security-groups.md](steps/02-security-groups.md) | Create layered security groups for ALB, ECS, and RDS |
| 03 | [steps/03-iam-roles.md](steps/03-iam-roles.md) | Create ECS task role (Bedrock access) and execution role |
| 04 | [steps/04-rds-postgres.md](steps/04-rds-postgres.md) | Provision RDS PostgreSQL 16 for session/conversation state |
| 05 | [steps/05-secrets.md](steps/05-secrets.md) | Store OIDC client secret and DB credentials in Secrets Manager |
| 06 | [steps/06-gateway-config.md](steps/06-gateway-config.md) | Write gateway.yaml — auth, model exposure, and policies |
| 07 | [steps/07-container-build.md](steps/07-container-build.md) | Download the Claude Code binary, create ECR repo, build and push the image |
| 08 | [steps/08-ecs-deploy.md](steps/08-ecs-deploy.md) | ECS cluster, task definition, internal ALB, target group, and service |
| 09 | [steps/09-dns-tls.md](steps/09-dns-tls.md) | DNS name, TLS certificate (ACM or self-signed), IdP redirect URI update |
| 10 | [steps/10-client-config.md](steps/10-client-config.md) | Managed settings to point Claude Code/Desktop clients at the gateway |
| 11 | [steps/11-verify.md](steps/11-verify.md) | End-to-end verification checks, in order |
| 12 | [steps/12-spend-limits.md](steps/12-spend-limits.md) | Per-user spend limits and budget enforcement (optional) |

---

## Deploy/Update Cycle

When you change `gateway.yaml` (model access rules, IdP settings, etc.):

1. Update `gateway.yaml` in your project
2. Rebuild the container image: `docker build -t claude-gateway .`
3. Tag and push to ECR
4. Force a new ECS deployment: `aws ecs update-service --cluster <cluster> --service <service> --force-new-deployment`
5. Wait for the new task to reach RUNNING and pass health checks

No infrastructure changes are needed for config-only updates — just rebuild and redeploy.

---

## Reference

The [reference/](reference/) directory contains:

- [reference/gateway-yaml-full.md](reference/gateway-yaml-full.md) — complete `gateway.yaml` config reference, all fields and their meanings
- [reference/troubleshooting.md](reference/troubleshooting.md) — common failure modes and how to resolve them
- [reference/cloudwatch-queries.md](reference/cloudwatch-queries.md) — CloudWatch Logs Insights queries for usage, errors, and latency

---

*This skill guides one deployment session. Work through each step with the user, validating before moving to the next.*
