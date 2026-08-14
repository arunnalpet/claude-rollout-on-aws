# Step 3: IAM Roles

## Goal

Create two IAM roles for the ECS task:

1. **Task Role** — permissions the gateway application uses at runtime (invoke Bedrock models)
2. **Execution Role** — permissions ECS needs to launch the task (pull images, read secrets)

## Output

Two role ARNs: `$TASK_ROLE_ARN`, `$EXEC_ROLE_ARN`

---

## Prerequisites: Bedrock Model Access

> **One-time per account:** Before the gateway can invoke Claude models via Bedrock, you must submit the Use Case form.
>
> 1. Open the [Amazon Bedrock console](https://console.aws.amazon.com/bedrock)
> 2. Go to **Model catalog** in the left nav
> 3. Select an Anthropic Claude model
> 4. Click **Request access** and complete the use case form
> 5. Wait for approval (usually immediate for Claude models)
>
> This only needs to be done once — it unlocks all Anthropic models in the account/region.

---

## 1. Create the Task Role

### Trust Policy

```bash
cat > /tmp/ecs-task-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
```

### Create the Role

```bash
TASK_ROLE_ARN=$(aws iam create-role \
  --role-name claude-gateway-task-role \
  --assume-role-policy-document file:///tmp/ecs-task-trust-policy.json \
  --description "Task role for Claude Apps Gateway - allows Bedrock model invocation" \
  --query "Role.Arn" \
  --output text)

echo "Task Role ARN: $TASK_ROLE_ARN"
```

### Attach Bedrock Invoke Policy

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)

cat > /tmp/bedrock-invoke-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.*",
        "arn:aws:bedrock:*:${AWS_ACCOUNT_ID}:inference-profile/us.anthropic.*"
      ]
    }
  ]
}
EOF
```

```bash
aws iam put-role-policy \
  --role-name claude-gateway-task-role \
  --policy-name BedrockInvokePolicy \
  --policy-document file:///tmp/bedrock-invoke-policy.json
```

---

## 2. Create the Execution Role

### Create the Role (same trust policy)

```bash
EXEC_ROLE_ARN=$(aws iam create-role \
  --role-name claude-gateway-exec-role \
  --assume-role-policy-document file:///tmp/ecs-task-trust-policy.json \
  --description "Execution role for Claude Apps Gateway - pulls images and reads secrets" \
  --query "Role.Arn" \
  --output text)

echo "Execution Role ARN: $EXEC_ROLE_ARN"
```

### Attach ECS Task Execution Policy

This managed policy grants permissions to pull container images from ECR and write logs to CloudWatch.

```bash
aws iam attach-role-policy \
  --role-name claude-gateway-exec-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### Attach Secrets Manager Access

The execution role needs to read secrets that are injected into the container as environment variables. The `??????` wildcard accounts for the random 6-character suffix that Secrets Manager appends to secret names.

```bash
cat > /tmp/secrets-access-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:gateway-*"
      ]
    }
  ]
}
EOF
```

> **Note:** The ARN pattern `gateway-*` matches secrets like `gateway-jwt-secret-aBcDeF`, `gateway-postgres-url-xYzWvU`, etc. The `??????` suffix is automatically appended by Secrets Manager and is covered by the `*` wildcard.

```bash
aws iam put-role-policy \
  --role-name claude-gateway-exec-role \
  --policy-name SecretsAccessPolicy \
  --policy-document file:///tmp/secrets-access-policy.json
```

---

## 3. Export Results

```bash
echo "TASK_ROLE_ARN=$TASK_ROLE_ARN"
echo "EXEC_ROLE_ARN=$EXEC_ROLE_ARN"
```

---

## Verification

```bash
# Verify task role has Bedrock policy
aws iam get-role-policy \
  --role-name claude-gateway-task-role \
  --policy-name BedrockInvokePolicy \
  --query "PolicyDocument.Statement[0].Action" \
  --output json

# Verify execution role has managed policy attached
aws iam list-attached-role-policies \
  --role-name claude-gateway-exec-role \
  --query "AttachedPolicies[*].PolicyName" \
  --output text

# Verify execution role has secrets policy
aws iam get-role-policy \
  --role-name claude-gateway-exec-role \
  --policy-name SecretsAccessPolicy \
  --query "PolicyDocument.Statement[0].Resource" \
  --output json
```

---

## Cleanup (temp files)

```bash
rm -f /tmp/ecs-task-trust-policy.json /tmp/bedrock-invoke-policy.json /tmp/secrets-access-policy.json
```
