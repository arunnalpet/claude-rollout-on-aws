# Step 5: Secrets Manager

## Goal

Store sensitive configuration values in AWS Secrets Manager so they can be injected into the ECS task at runtime without baking them into images or task definitions.

## Output

Three secret ARNs for use in the ECS task definition.

---

## 1. Create JWT Secret

This secret signs session tokens issued by the gateway.

```bash
JWT_SECRET=$(openssl rand -base64 32)

JWT_SECRET_ARN=$(aws secretsmanager create-secret \
  --region $AWS_REGION \
  --name gateway-jwt-secret \
  --description "JWT signing secret for Claude Apps Gateway sessions" \
  --secret-string "$JWT_SECRET" \
  --tags Key=app,Value=claude-gateway \
  --query "ARN" \
  --output text)

echo "JWT Secret ARN: $JWT_SECRET_ARN"
```

---

## 2. Create OIDC Client Secret

This is the client secret from your Identity Provider (IdP) setup. You should have this value from the IdP configuration guide you followed earlier.

```bash
# Replace with the actual client secret from your IdP
OIDC_CLIENT_SECRET="your-oidc-client-secret-here"

OIDC_SECRET_ARN=$(aws secretsmanager create-secret \
  --region $AWS_REGION \
  --name gateway-oidc-client-secret \
  --description "OIDC client secret for Claude Apps Gateway authentication" \
  --secret-string "$OIDC_CLIENT_SECRET" \
  --tags Key=app,Value=claude-gateway \
  --query "ARN" \
  --output text)

echo "OIDC Secret ARN: $OIDC_SECRET_ARN"
```

---

## 3. Create PostgreSQL Connection URL

Use the connection string assembled in Step 4.

```bash
# POSTGRES_URL should already be set from Step 4
# postgres://gateway:<password>@<host>:5432/claude_gateway?sslmode=verify-full

POSTGRES_SECRET_ARN=$(aws secretsmanager create-secret \
  --region $AWS_REGION \
  --name gateway-postgres-url \
  --description "PostgreSQL connection string for Claude Apps Gateway" \
  --secret-string "$POSTGRES_URL" \
  --tags Key=app,Value=claude-gateway \
  --query "ARN" \
  --output text)

echo "Postgres Secret ARN: $POSTGRES_SECRET_ARN"
```

---

## 4. Record the ARNs

```bash
echo ""
echo "=== Secret ARNs (save these for the task definition) ==="
echo "JWT_SECRET_ARN=$JWT_SECRET_ARN"
echo "OIDC_SECRET_ARN=$OIDC_SECRET_ARN"
echo "POSTGRES_SECRET_ARN=$POSTGRES_SECRET_ARN"
```

---

## Security Notes

### Process Table Visibility

> ⚠️ **Warning:** The `--secret-string` value passed on the command line may be visible in the process table (`ps aux`) to other users on the same machine. For shared or multi-user systems, consider:
>
> ```bash
> # Safer alternative: read from stdin
> echo -n "$JWT_SECRET" | aws secretsmanager create-secret \
>   --region $AWS_REGION \
>   --name gateway-jwt-secret \
>   --secret-string file:///dev/stdin \
>   --query "ARN" \
>   --output text
> ```
>
> Or write to a temp file with restricted permissions:
>
> ```bash
> umask 077
> echo -n "$JWT_SECRET" > /tmp/secret-value.txt
> aws secretsmanager create-secret \
>   --region $AWS_REGION \
>   --name gateway-jwt-secret \
>   --secret-string file:///tmp/secret-value.txt \
>   --query "ARN" \
>   --output text
> rm -f /tmp/secret-value.txt
> ```

### Secret Rotation

These secrets do not auto-rotate. If you need to rotate them later:

```bash
aws secretsmanager update-secret \
  --region $AWS_REGION \
  --secret-id gateway-jwt-secret \
  --secret-string "new-value-here"
```

After rotation, redeploy the ECS service to pick up the new values.

---

## Verification

```bash
# Confirm all three secrets exist
aws secretsmanager list-secrets \
  --region $AWS_REGION \
  --filters Key=name,Values=gateway- \
  --query "SecretList[*].{Name:Name,ARN:ARN}" \
  --output table
```

Expected: three secrets listed — `gateway-jwt-secret`, `gateway-oidc-client-secret`, `gateway-postgres-url`.
