# Step 07: Build Container Image

## Download Claude Code Binary

Download the latest Claude Code linux-x64 binary from GitHub releases:

```bash
# Check latest version at https://github.com/anthropics/claude-code/releases
export CLAUDE_VERSION="1.0.0"  # Replace with actual latest version

curl -L -o claude-linux-x64.tar.gz \
  "https://github.com/anthropics/claude-code/releases/download/v${CLAUDE_VERSION}/claude-linux-x64.tar.gz"

tar -xzf claude-linux-x64.tar.gz
```

## Download RDS CA Bundle

```bash
curl -o rds-global-bundle.pem \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

## Write Dockerfile

Create `Dockerfile`:

```dockerfile
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY claude /usr/local/bin/claude
RUN chmod +x /usr/local/bin/claude

COPY gateway.yaml /etc/claude/gateway.yaml
COPY rds-global-bundle.pem /etc/ssl/certs/rds-global-bundle.pem

ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/rds-global-bundle.pem
ENV CLAUDE_CONFIG_DIR=/tmp/.claude
ENV CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

EXPOSE 8080

CMD ["claude", "gateway", "--config", "/etc/claude/gateway.yaml"]
```

## Create ECR Repository

```bash
export AWS_REGION="us-east-1"  # Replace with your region
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws ecr create-repository \
  --repository-name claude-gateway \
  --image-tag-mutability IMMUTABLE \
  --image-scanning-configuration scanOnPush=true \
  --region $AWS_REGION
```

## Build and Push

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build image
export IMAGE_TAG="v${CLAUDE_VERSION}-$(date +%Y%m%d%H%M%S)"
docker build -t claude-gateway:${IMAGE_TAG} .

# Tag for ECR
docker tag claude-gateway:${IMAGE_TAG} \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/claude-gateway:${IMAGE_TAG}

# Push
docker push \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/claude-gateway:${IMAGE_TAG}

echo "Image URI: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/claude-gateway:${IMAGE_TAG}"
```

## If No Docker Locally (EC2 Build Instance)

```bash
# Launch a small EC2 instance with Amazon Linux 2023
# Install Docker: sudo yum install -y docker && sudo systemctl start docker
# Run the build/push steps above on the instance
# Terminate instance when done
```

## Note: ARM64 / Graviton

If deploying on Graviton (ARM64) instances for cost savings:

1. Download `claude-linux-arm64.tar.gz` instead:
   ```bash
   curl -L -o claude-linux-arm64.tar.gz \
     "https://github.com/anthropics/claude-code/releases/download/v${CLAUDE_VERSION}/claude-linux-arm64.tar.gz"
   ```
2. Build with `--platform linux/arm64`
3. Set `cpuArchitecture: ARM64` in the ECS task definition (Step 08)
