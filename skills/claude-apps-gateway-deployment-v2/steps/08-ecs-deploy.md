# Step 08: Deploy on ECS Fargate

## Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name claude-gateway \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
  --region $AWS_REGION
```

## Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/claude-gateway \
  --region $AWS_REGION

aws logs put-retention-policy \
  --log-group-name /ecs/claude-gateway \
  --retention-in-days 90 \
  --region $AWS_REGION
```

## Write Task Definition

Create `task-definition.json`:

```json
{
  "family": "claude-gateway",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "1024",
  "memory": "2048",
  "runtimePlatform": {
    "cpuArchitecture": "X86_64",
    "operatingSystemFamily": "LINUX"
  },
  "executionRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/claude-gateway-execution",
  "taskRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/claude-gateway-task",
  "containerDefinitions": [
    {
      "name": "claude-gateway",
      "image": "<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/claude-gateway:<IMAGE_TAG>",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "secrets": [
        {
          "name": "ANTHROPIC_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:claude-gateway/anthropic-api-key"
        },
        {
          "name": "OIDC_CLIENT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:claude-gateway/oidc-client-secret"
        },
        {
          "name": "SESSION_SECRET",
          "valueFrom": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:claude-gateway/session-secret"
        },
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:claude-gateway/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/claude-gateway",
          "awslogs-region": "<REGION>",
          "awslogs-stream-prefix": "gateway"
        }
      },
      "essential": true
    }
  ]
}
```

Replace `<ACCOUNT_ID>`, `<REGION>`, and `<IMAGE_TAG>` with your values.

## Register Task Definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION
```

## Create Internal ALB

**Important:** Use IPv4 only (`--scheme internal --type application`). Dual-stack publishes public AAAA records which causes `/login` to reject connections.

```bash
aws elbv2 create-load-balancer \
  --name claude-gateway-alb \
  --scheme internal \
  --type application \
  --ip-address-type ipv4 \
  --security-groups <ALB_SG_ID> \
  --subnets <PRIVATE_SUBNET_1> <PRIVATE_SUBNET_2> \
  --region $AWS_REGION
```

Save the ALB ARN from the output:
```bash
export ALB_ARN="arn:aws:elasticloadbalancing:..."
```

## Create Target Group

```bash
aws elbv2 create-target-group \
  --name claude-gateway-tg \
  --protocol HTTP \
  --port 8080 \
  --vpc-id <VPC_ID> \
  --target-type ip \
  --health-check-protocol HTTP \
  --health-check-path /readyz \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $AWS_REGION
```

Save the target group ARN:
```bash
export TG_ARN="arn:aws:elasticloadbalancing:..."
```

## Create HTTPS Listener

```bash
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --certificates CertificateArn=<ACM_CERT_ARN> \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $AWS_REGION
```

## Set ALB Idle Timeout

Set to 3600 seconds to prevent stream cutoff during long-running inference:

```bash
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn $ALB_ARN \
  --attributes Key=idle_timeout.timeout_seconds,Value=3600 \
  --region $AWS_REGION
```

## Create ECS Service

```bash
aws ecs create-service \
  --cluster claude-gateway \
  --service-name claude-gateway \
  --task-definition claude-gateway \
  --desired-count 1 \
  --launch-type FARGATE \
  --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true}" \
  --health-check-grace-period-seconds 60 \
  --network-configuration "awsvpcConfiguration={subnets=[<PRIVATE_SUBNET_1>,<PRIVATE_SUBNET_2>],securityGroups=[<GATEWAY_SG_ID>],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=claude-gateway,containerPort=8080" \
  --region $AWS_REGION
```

## Verify Deployment

Check service events:
```bash
aws ecs describe-services \
  --cluster claude-gateway \
  --services claude-gateway \
  --query 'services[0].events[:5]' \
  --region $AWS_REGION
```

Check CloudWatch logs for successful boot:
```bash
aws logs tail /ecs/claude-gateway \
  --since 5m \
  --region $AWS_REGION
```

Look for log messages indicating:
- Gateway configuration loaded
- Database connection established
- HTTP server listening on port 8080
