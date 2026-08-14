# Step 2: Security Groups

## Goal

Create three security groups that form a layered access chain:

```
Corporate Network → ALB (443) → Gateway Service (8080) → PostgreSQL (5432)
```

Each layer only accepts traffic from the layer in front of it, following the principle of least privilege.

## Output

Three security group IDs: `$SG_ALB`, `$SG_SVC`, `$SG_DB`

---

## 1. Get VPC CIDR

```bash
VPC_CIDR=$(aws ec2 describe-vpcs \
  --region $AWS_REGION \
  --vpc-ids $VPC_ID \
  --query "Vpcs[0].CidrBlock" \
  --output text)

echo "VPC CIDR: $VPC_CIDR"
```

## 2. Create ALB Security Group

This group allows inbound HTTPS (443) from the VPC CIDR. In a corporate setup, the ALB is internal-facing and only reachable from within the VPC or through VPN/Direct Connect.

```bash
SG_ALB=$(aws ec2 create-security-group \
  --region $AWS_REGION \
  --vpc-id $VPC_ID \
  --group-name "claude-gateway-alb" \
  --description "ALB for Claude Apps Gateway - accepts HTTPS from VPC" \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=claude-gateway-alb}]' \
  --query "GroupId" \
  --output text)

echo "ALB SG: $SG_ALB"
```

```bash
# Allow inbound HTTPS from VPC CIDR
aws ec2 authorize-security-group-ingress \
  --region $AWS_REGION \
  --group-id $SG_ALB \
  --protocol tcp \
  --port 443 \
  --cidr $VPC_CIDR
```

## 3. Create Gateway Service Security Group

This group allows inbound traffic on port 8080 **only from the ALB security group**. The ECS tasks running the gateway listen on 8080.

```bash
SG_SVC=$(aws ec2 create-security-group \
  --region $AWS_REGION \
  --vpc-id $VPC_ID \
  --group-name "claude-gateway-svc" \
  --description "ECS service for Claude Apps Gateway - accepts traffic from ALB" \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=claude-gateway-svc}]' \
  --query "GroupId" \
  --output text)

echo "Service SG: $SG_SVC"
```

```bash
# Allow inbound 8080 from ALB SG only
aws ec2 authorize-security-group-ingress \
  --region $AWS_REGION \
  --group-id $SG_SVC \
  --protocol tcp \
  --port 8080 \
  --source-group $SG_ALB
```

## 4. Create Database Security Group

This group allows inbound PostgreSQL (5432) **only from the gateway service security group**. The RDS instance is only reachable from the gateway containers.

```bash
SG_DB=$(aws ec2 create-security-group \
  --region $AWS_REGION \
  --vpc-id $VPC_ID \
  --group-name "claude-gateway-db" \
  --description "RDS PostgreSQL for Claude Apps Gateway - accepts traffic from gateway service" \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=claude-gateway-db}]' \
  --query "GroupId" \
  --output text)

echo "DB SG: $SG_DB"
```

```bash
# Allow inbound 5432 from Service SG only
aws ec2 authorize-security-group-ingress \
  --region $AWS_REGION \
  --group-id $SG_DB \
  --protocol tcp \
  --port 5432 \
  --source-group $SG_SVC
```

## 5. Export Results

```bash
echo "SG_ALB=$SG_ALB"
echo "SG_SVC=$SG_SVC"
echo "SG_DB=$SG_DB"
```

---

## Security Chain Explained

| Layer | Security Group | Inbound Rule | Purpose |
|-------|---------------|--------------|---------|
| ALB | `claude-gateway-alb` | TCP 443 from VPC CIDR | Internal users reach the gateway via HTTPS |
| Service | `claude-gateway-svc` | TCP 8080 from ALB SG | Only the ALB can reach the containers |
| Database | `claude-gateway-db` | TCP 5432 from Service SG | Only the gateway containers can reach the DB |

**Why VPC CIDR on the ALB?** The ALB is internal (no public IP). Traffic arrives from corporate networks via VPN, Direct Connect, or peered VPCs — all of which route through the VPC CIDR. If your corporate network uses a specific CIDR range, you can restrict further.

**Why security group references instead of CIDRs for service/DB?** SG-to-SG rules are dynamic — they follow the instances regardless of IP changes. This is essential for ECS tasks that get new IPs on every deployment.

---

## Verification

```bash
# Verify all three SGs exist and show their inbound rules
for SG in $SG_ALB $SG_SVC $SG_DB; do
  echo "=== $SG ==="
  aws ec2 describe-security-groups \
    --region $AWS_REGION \
    --group-ids $SG \
    --query "SecurityGroups[0].{Name:GroupName,Ingress:IpPermissions}" \
    --output json
  echo ""
done
```
