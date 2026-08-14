# Step 12: Spend Limits & Budget Enforcement

## Overview

The gateway tracks per-user spend (tokens × pricing) in Postgres and enforces caps at inference time. When a user exceeds their limit, requests are rejected with HTTP 429 and a configurable message.

## Add Admin Block to gateway.yaml

Add the `admin` section to your `gateway.yaml`:

```yaml
admin:
  write_keys:
    - id: admin
      key: "${GATEWAY_ADMIN_WRITE_KEY}"
  read_keys:
    - id: reporting
      key: "${GATEWAY_ADMIN_READ_KEY}"
  blocked_message: "You've reached your usage limit. Contact your admin."
```

## Create Secrets in Secrets Manager

```bash
# Generate random keys
ADMIN_WRITE_KEY=$(openssl rand -hex 32)
ADMIN_READ_KEY=$(openssl rand -hex 32)

# Store admin write key
aws secretsmanager create-secret \
  --name claude-gateway/admin-write-key \
  --secret-string "$ADMIN_WRITE_KEY" \
  --region $AWS_REGION

# Store admin read key
aws secretsmanager create-secret \
  --name claude-gateway/admin-read-key \
  --secret-string "$ADMIN_READ_KEY" \
  --region $AWS_REGION

echo "Admin Write Key: $ADMIN_WRITE_KEY"
echo "Admin Read Key: $ADMIN_READ_KEY"
# Save these securely — you'll need them for API calls
```

## Update Execution Role Policy

Add the new secret ARNs to the execution role's IAM policy:

```bash
aws iam put-role-policy \
  --role-name claude-gateway-execution \
  --policy-name secrets-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "secretsmanager:GetSecretValue"
        ],
        "Resource": [
          "arn:aws:secretsmanager:'$AWS_REGION':'$AWS_ACCOUNT_ID':secret:claude-gateway/*"
        ]
      }
    ]
  }'
```

## Update Task Definition

Add the new secrets to the container definition in `task-definition.json`:

```json
{
  "secrets": [
    ...existing secrets...,
    {
      "name": "GATEWAY_ADMIN_WRITE_KEY",
      "valueFrom": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:claude-gateway/admin-write-key"
    },
    {
      "name": "GATEWAY_ADMIN_READ_KEY",
      "valueFrom": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:claude-gateway/admin-read-key"
    }
  ]
}
```

## Rebuild and Redeploy

```bash
# Build with updated gateway.yaml
export IMAGE_TAG="v${CLAUDE_VERSION}-$(date +%Y%m%d%H%M%S)"
docker build -t claude-gateway:${IMAGE_TAG} .
docker tag claude-gateway:${IMAGE_TAG} \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/claude-gateway:${IMAGE_TAG}
docker push \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/claude-gateway:${IMAGE_TAG}

# Register new task definition revision
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION

# Update service
aws ecs update-service \
  --cluster claude-gateway \
  --service claude-gateway \
  --task-definition claude-gateway \
  --force-new-deployment \
  --region $AWS_REGION
```

## Using the Admin API

All Admin API calls require the write key (for mutations) or read key (for queries) in the `Authorization` header:

```
Authorization: Bearer <key>
```

### Set User Spend Cap

```bash
curl -X PUT "https://<PUBLIC_URL>/v1/organizations/spend_limits" \
  -H "Authorization: Bearer $ADMIN_WRITE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "principal_type": "user",
    "principal": "<user-sub-from-idp>",
    "period": "monthly",
    "limit_cents": 5000
  }'
```

This sets a $50.00/month cap for the specified user.

### Set Group Spend Cap

```bash
curl -X PUT "https://<PUBLIC_URL>/v1/organizations/spend_limits" \
  -H "Authorization: Bearer $ADMIN_WRITE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "principal_type": "group",
    "principal": "engineering-team",
    "period": "monthly",
    "limit_cents": 100000
  }'
```

### Check Effective Limit for a User

```bash
curl -s "https://<PUBLIC_URL>/v1/organizations/spend_limits/effective?principal=<user-sub>" \
  -H "Authorization: Bearer $ADMIN_READ_KEY" | jq
```

### List All Spend Limits

```bash
curl -s "https://<PUBLIC_URL>/v1/organizations/spend_limits" \
  -H "Authorization: Bearer $ADMIN_READ_KEY" | jq
```

## Configuration Options

These can be added to the `admin` block in `gateway.yaml`:

| Option | Values | Default | Description |
|---|---|---|---|
| `group_limit_mode` | `min` / `max` | `min` | When user belongs to multiple groups, use the minimum or maximum group cap |
| `fail_closed_on_error` | `true` / `false` | `false` | Block requests when Postgres is unavailable (vs. allowing them through) |

Example:

```yaml
admin:
  write_keys:
    - id: admin
      key: "${GATEWAY_ADMIN_WRITE_KEY}"
  read_keys:
    - id: reporting
      key: "${GATEWAY_ADMIN_READ_KEY}"
  blocked_message: "You've reached your usage limit. Contact your admin."
  group_limit_mode: min
  fail_closed_on_error: true
```

## Important Notes

- **429 Response:** When a user hits their cap, inference requests return HTTP 429 with the `blocked_message` text.
- **Fail-open default:** During a Postgres outage, enforcement fails **open** by default (requests are allowed through). Set `fail_closed_on_error: true` to block requests instead when spend data cannot be verified.
- **Period reset:** Monthly limits reset on the 1st of each calendar month (UTC).
- **Spend tracking:** Spend is calculated from actual token usage (input + output tokens × per-model pricing).
