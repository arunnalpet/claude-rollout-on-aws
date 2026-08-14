# Step 4: RDS PostgreSQL

## Goal

Create a PostgreSQL 16 database for the Claude Apps Gateway to store sessions, conversations, and configuration state.

## Output

Connection string: `postgres://gateway:<password>@<host>:5432/claude_gateway?sslmode=verify-full`

---

## 1. Generate a Database Password

```bash
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
echo "DB_PASSWORD=$DB_PASSWORD"
```

> Save this password — you'll need it for the connection string in Step 5.

---

## 2. Create DB Subnet Group

The database must be placed in private subnets (from Step 1).

```bash
# Convert space-separated subnets to JSON array format
SUBNET_LIST=$(echo $PRIVATE_SUBNETS | tr ' ' '\n' | sed 's/.*/"&"/' | paste -sd, -)

aws rds create-db-subnet-group \
  --region $AWS_REGION \
  --db-subnet-group-name claude-gateway-db-subnets \
  --db-subnet-group-description "Private subnets for Claude Apps Gateway database" \
  --subnet-ids $PRIVATE_SUBNETS \
  --tags Key=Name,Value=claude-gateway-db-subnets
```

---

## 3. Create Parameter Group

Force SSL connections to the database.

```bash
aws rds create-db-parameter-group \
  --region $AWS_REGION \
  --db-parameter-group-name claude-gateway-pg16 \
  --db-parameter-group-family postgres16 \
  --description "PostgreSQL 16 params for Claude Apps Gateway (SSL enforced)"
```

```bash
aws rds modify-db-parameter-group \
  --region $AWS_REGION \
  --db-parameter-group-name claude-gateway-pg16 \
  --parameters "ParameterName=rds.force_ssl,ParameterValue=1,ApplyMethod=pending-reboot"
```

---

## 4. Create DB Instance

```bash
aws rds create-db-instance \
  --region $AWS_REGION \
  --db-instance-identifier claude-gateway-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version "16" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --storage-encrypted \
  --master-username gateway \
  --master-user-password "$DB_PASSWORD" \
  --db-name claude_gateway \
  --vpc-security-group-ids $SG_DB \
  --db-subnet-group-name claude-gateway-db-subnets \
  --db-parameter-group-name claude-gateway-pg16 \
  --no-publicly-accessible \
  --backup-retention-period 7 \
  --copy-tags-to-snapshot \
  --deletion-protection \
  --tags Key=Name,Value=claude-gateway-db
```

---

## 5. Wait for Instance to Become Available

This typically takes 5-10 minutes.

```bash
echo "Waiting for RDS instance to become available..."
aws rds wait db-instance-available \
  --region $AWS_REGION \
  --db-instance-identifier claude-gateway-db
echo "RDS instance is ready."
```

---

## 6. Get the Endpoint

```bash
DB_HOST=$(aws rds describe-db-instances \
  --region $AWS_REGION \
  --db-instance-identifier claude-gateway-db \
  --query "DBInstances[0].Endpoint.Address" \
  --output text)

echo "DB Host: $DB_HOST"
```

---

## 7. Assemble Connection String

```bash
POSTGRES_URL="postgres://gateway:${DB_PASSWORD}@${DB_HOST}:5432/claude_gateway?sslmode=verify-full"
echo "POSTGRES_URL=$POSTGRES_URL"
```

> **Important:** Do NOT append `&sslrootcert=...` to the connection URL. The gateway container uses the `NODE_EXTRA_CA_CERTS` environment variable to point to the RDS CA bundle instead. This is configured in the ECS task definition (Step 8).

---

## Verification

```bash
# Confirm instance is available and SSL is enforced
aws rds describe-db-instances \
  --region $AWS_REGION \
  --db-instance-identifier claude-gateway-db \
  --query "DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,SSL:DBParameterGroups[0].DBParameterGroupName,PublicAccess:PubliclyAccessible}" \
  --output table
```

Expected output:
- Status: `available`
- PublicAccess: `False`
- SSL parameter group: `claude-gateway-pg16`

---

## Notes

- **Instance size:** `db.t4g.micro` is suitable for development and small teams. For production with many concurrent users, consider `db.t4g.small` or larger.
- **Storage:** 20 GB gp3 is sufficient to start. RDS supports storage autoscaling if needed.
- **Deletion protection** is enabled — you must disable it before you can delete the instance.
- **Backups** are retained for 7 days with automatic snapshots.
