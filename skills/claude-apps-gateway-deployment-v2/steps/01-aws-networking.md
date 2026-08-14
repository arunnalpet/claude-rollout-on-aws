# Step 1: AWS Networking Setup

## Goal

Ensure the VPC has at least two private subnets in different Availability Zones for ECS tasks and RDS. Private subnets route internet-bound traffic through a NAT gateway, keeping resources off the public internet.

## Output

Two private subnet IDs stored in `$PRIVATE_SUBNETS` (space-separated).

---

## 1. Set Variables

```bash
export AWS_REGION="us-east-1"   # Change to your preferred region
export VPC_ID="vpc-xxxxxxxxx"   # Your VPC ID
```

## 2. Check for Existing Private Subnets

A private subnet is one whose route table does **not** have a route to an Internet Gateway (igw-*).

```bash
# List all subnets in the VPC
aws ec2 describe-subnets \
  --region $AWS_REGION \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].{Id:SubnetId,AZ:AvailabilityZone,CIDR:CidrBlock,MapPublicIp:MapPublicIpOnLaunch}" \
  --output table
```

For each subnet, check its route table:

```bash
aws ec2 describe-route-tables \
  --region $AWS_REGION \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "RouteTables[*].{RTId:RouteTableId,Routes:Routes[?DestinationCidrBlock=='0.0.0.0/0'].GatewayId,Associations:Associations[*].SubnetId}" \
  --output json
```

- If a subnet's route table has `0.0.0.0/0 → igw-*`, it is **public**.
- If it routes `0.0.0.0/0 → nat-*` (or has no internet route), it is **private**.

**If you already have two or more private subnets in different AZs**, skip to the end and export them:

```bash
export PRIVATE_SUBNETS="subnet-aaaa subnet-bbbb"
```

---

## 3. Create Private Subnets (if needed)

Pick two AZs and two CIDR blocks that don't overlap with existing subnets. Adjust CIDRs to fit your VPC.

```bash
# Get available AZs
aws ec2 describe-availability-zones \
  --region $AWS_REGION \
  --query "AvailabilityZones[?State=='available'].ZoneName" \
  --output text
```

```bash
# Create first private subnet
PRIVATE_SUBNET_1=$(aws ec2 create-subnet \
  --region $AWS_REGION \
  --vpc-id $VPC_ID \
  --cidr-block "10.0.128.0/24" \
  --availability-zone "${AWS_REGION}a" \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=claude-gateway-private-a}]' \
  --query "Subnet.SubnetId" \
  --output text)

echo "Private Subnet 1: $PRIVATE_SUBNET_1"
```

```bash
# Create second private subnet
PRIVATE_SUBNET_2=$(aws ec2 create-subnet \
  --region $AWS_REGION \
  --vpc-id $VPC_ID \
  --cidr-block "10.0.129.0/24" \
  --availability-zone "${AWS_REGION}b" \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=claude-gateway-private-b}]' \
  --query "Subnet.SubnetId" \
  --output text)

echo "Private Subnet 2: $PRIVATE_SUBNET_2"
```

## 4. Create NAT Gateway

The NAT gateway lives in a **public** subnet and gives private subnets outbound internet access.

```bash
# Identify a public subnet for the NAT gateway
PUBLIC_SUBNET="subnet-xxxxxxxx"  # One of your existing public subnets

# Allocate an Elastic IP for NAT
EIP_ALLOC=$(aws ec2 allocate-address \
  --region $AWS_REGION \
  --domain vpc \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=claude-gateway-nat-eip}]' \
  --query "AllocationId" \
  --output text)

echo "Elastic IP Allocation: $EIP_ALLOC"
```

```bash
# Create the NAT gateway
NAT_GW=$(aws ec2 create-nat-gateway \
  --region $AWS_REGION \
  --subnet-id $PUBLIC_SUBNET \
  --allocation-id $EIP_ALLOC \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=claude-gateway-nat}]' \
  --query "NatGateway.NatGatewayId" \
  --output text)

echo "NAT Gateway: $NAT_GW"
```

```bash
# Wait for NAT gateway to become available (takes 1-2 minutes)
aws ec2 wait nat-gateway-available \
  --region $AWS_REGION \
  --nat-gateway-ids $NAT_GW
```

## 5. Create Private Route Table

```bash
# Create route table
PRIVATE_RT=$(aws ec2 create-route-table \
  --region $AWS_REGION \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=claude-gateway-private-rt}]' \
  --query "RouteTable.RouteTableId" \
  --output text)

echo "Private Route Table: $PRIVATE_RT"
```

```bash
# Add default route through NAT gateway
aws ec2 create-route \
  --region $AWS_REGION \
  --route-table-id $PRIVATE_RT \
  --destination-cidr-block "0.0.0.0/0" \
  --nat-gateway-id $NAT_GW
```

## 6. Associate Private Subnets with Route Table

```bash
aws ec2 associate-route-table \
  --region $AWS_REGION \
  --route-table-id $PRIVATE_RT \
  --subnet-id $PRIVATE_SUBNET_1

aws ec2 associate-route-table \
  --region $AWS_REGION \
  --route-table-id $PRIVATE_RT \
  --subnet-id $PRIVATE_SUBNET_2
```

## 7. Export Result

```bash
export PRIVATE_SUBNETS="$PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2"
echo "Private subnets ready: $PRIVATE_SUBNETS"
```

---

## Verification

```bash
# Confirm both subnets route through NAT
for SUBNET in $PRIVATE_SUBNETS; do
  echo "--- $SUBNET ---"
  aws ec2 describe-route-tables \
    --region $AWS_REGION \
    --filters "Name=association.subnet-id,Values=$SUBNET" \
    --query "RouteTables[0].Routes[?DestinationCidrBlock=='0.0.0.0/0'].NatGatewayId" \
    --output text
done
```

Both should return a `nat-*` ID.
