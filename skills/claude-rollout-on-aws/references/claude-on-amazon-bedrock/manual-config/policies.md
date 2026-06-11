# Manual Config — Policy & Config Artifacts

> Copy-paste artifacts referenced by `instructions.md`. Treat values as templates —
> substitute company name, regions, account IDs, role names, and model IDs to match the
> customer's environment before applying.

---

## SCPs (attach to the Claude OU)

### SCP 1 — Restrict Bedrock to approved Claude models only

Deny `bedrock:InvokeModel` unless the InferenceProfileArn matches `us.anthropic.claude-*`.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyNonClaudeModels",
    "Effect": "Deny",
    "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
    "Resource": "*",
    "Condition": {
      "StringNotLike": {
        "bedrock:InferenceProfileArn": [
          "arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-*",
          "arn:aws:bedrock:*:*:application-inference-profile/*"
        ]
      }
    }
  }]
}
```

### SCP 2 — Deny model access changes (except CentralAdminRole)

Prevents teams from enabling additional models without central approval.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyModelAccessChanges",
    "Effect": "Deny",
    "Action": ["bedrock:PutUseCaseForModelAccess"],
    "Resource": "*",
    "Condition": {
      "StringNotLike": {
        "aws:PrincipalArn": "arn:aws:iam::*:role/CentralAdminRole"
      }
    }
  }]
}
```

### SCP 3 — Enforce region restriction

Deny `bedrock:*` unless the requested region is in the approved list. Adjust regions for data
residency and latency.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyNonApprovedRegions",
    "Effect": "Deny",
    "Action": ["bedrock:*"],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "aws:RequestedRegion": ["us-east-1", "us-west-2"]
      }
    }
  }]
}
```

---

## Anthropic use-case submission (one-time per account)

### Option A — AWS Console
Bedrock console → Model catalog → select any Anthropic model → complete the use-case form.
Access granted immediately after submission.

### Option B — CLI (recommended for automation)
Submitting principal needs the `bedrock:PutUseCaseForModelAccess` IAM permission. Must target
**us-east-1**, and the form data must be Base64-encoded.

```bash
# Create the form data JSON
cat <<EOF > form.json
{
  "companyName": "YOUR_COMPANY",
  "companyWebsite": "https://www.example.com",
  "intendedUsers": "0",
  "industryOption": "Customer Service",
  "otherIndustryOption": "",
  "useCases": "AI-powered productivity tools."
}
EOF

# Submit (must be us-east-1, must Base64 encode)
aws bedrock put-use-case-for-model-access \
  --form-data $(cat form.json | base64) \
  --region us-east-1
```

---

## IAM Identity Center permission set — Claude Code

Inline policy granting `bedrock:InvokeModel` + `InvokeModelWithResponseStream`, scoped to
specific model ARNs. Each model is a separate statement — add/remove per team. Set session
duration to 8–12 hours on the permission set.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowBedrockClaudeSonnet",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-sonnet-4-6*"
      ]
    },
    {
      "Sid": "AllowBedrockClaudeOpus",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-opus-4-7*"
      ]
    },
    {
      "Sid": "AllowBedrockClaudeHaiku",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-haiku-4-5*"
      ]
    }
  ]
}
```

---

## Reference tables

### TPM & budget sizing by team size

| Team Size | Recommended TPM | Monthly Budget Alert |
|-----------|----------------|---------------------|
| Small (5–15 users) | 100K–500K TPM | $2,000–$5,000 |
| Medium (15–50 users) | 500K–2M TPM | $5,000–$20,000 |
| Large (50+ users) | 2M+ TPM | $20,000+ |

### New-account onboarding checklist

| # | Action | Owner |
|---|--------|-------|
| 1 | Create account under Claude OU | Cloud Platform |
| 2 | Verify SCPs inherited from Claude OU | Cloud Platform |
| 3 | Submit Anthropic use case form | Cloud Platform |
| 4 | Create IAM Identity Center permission set | Identity Team |
| 5 | Assign Entra ID group to permission set + account | Identity Team |
| 6 | Set up AWS Budgets and cost alerts | FinOps |
| 7 | Enable CloudTrail + Bedrock invocation logging | Security |
| 8 | Request and validate Bedrock quota limits | Cloud Platform |
| 9 | Create application inference profiles (optional) | Cloud Platform |
| 10 | Test end-to-end auth flow with pilot user | Team Lead |

### Managed-settings.json locations (Claude Code)

| OS | Path |
|---|---|
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Linux/WSL | `/etc/claude-code/managed-settings.json` |
| Windows | `C:\Program Files\ClaudeCode\managed-settings.json` |

### Cowork MDM managed-preferences locations

| OS | Path |
|---|---|
| macOS | `/Library/Managed Preferences/com.anthropic.claudefordesktop.plist` |
| Windows | `HKLM\SOFTWARE\Policies\Claude` |
