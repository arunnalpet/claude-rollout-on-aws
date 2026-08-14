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
| 01 | [steps/01-ecr-repository.md](steps/01-ecr-repository.md) | Create the ECR repository for the gateway image |
| 02 | [steps/02-build-image.md](steps/02-build-image.md) | Build and push the gateway container image |
| 03 | [steps/03-rds-postgres.md](steps/03-rds-postgres.md) | Provision RDS PostgreSQL for session state |
| 04 | [steps/04-secrets.md](steps/04-secrets.md) | Store OIDC client secret and DB credentials in Secrets Manager |
| 05 | [steps/05-iam-roles.md](steps/05-iam-roles.md) | Create ECS task role (Bedrock access) and execution role |
| 06 | [steps/06-security-groups.md](steps/06-security-groups.md) | Configure security groups for ALB, ECS, and RDS |
| 07 | [steps/07-alb.md](steps/07-alb.md) | Create the internal Application Load Balancer |
| 08 | [steps/08-target-group.md](steps/08-target-group.md) | Create target group with health check configuration |
| 09 | [steps/09-ecs-cluster.md](steps/09-ecs-cluster.md) | Create the ECS cluster |
| 10 | [steps/10-task-definition.md](steps/10-task-definition.md) | Register the Fargate task definition with gateway.yaml |
| 11 | [steps/11-ecs-service.md](steps/11-ecs-service.md) | Create the ECS service and attach to ALB |
| 12 | [steps/12-validate.md](steps/12-validate.md) | End-to-end validation — connect Claude Code through the gateway |

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

- **Config reference** — all `gateway.yaml` fields and their meanings
- **Troubleshooting** — common failure modes and how to resolve them
- **Observability queries** — CloudWatch Logs Insights queries for usage, errors, and latency

---

*This skill guides one deployment session. Work through each step with the user, validating before moving to the next.*
