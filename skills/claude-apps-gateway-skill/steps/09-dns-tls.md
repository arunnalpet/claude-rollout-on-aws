# Step 09: DNS and TLS Configuration

## Get ALB DNS Name

```bash
aws elbv2 describe-load-balancers \
  --names claude-gateway-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region $AWS_REGION
```

Output will be something like: `internal-claude-gateway-alb-123456789.us-east-1.elb.amazonaws.com`

```bash
export ALB_DNS="internal-claude-gateway-alb-XXXXXXXXX.<REGION>.elb.amazonaws.com"
```

## TLS Certificate Options

### Option A: ACM Certificate (Private CA or Domain Validation)

If you have a private CA or a domain with DNS validation:

```bash
aws acm request-certificate \
  --domain-name claude-gateway.internal.yourcompany.com \
  --validation-method DNS \
  --region $AWS_REGION
```

Complete DNS validation, then use the cert ARN in the ALB listener.

### Option B: Self-Signed Certificate (Import to ACM)

Generate a self-signed certificate with CN matching the ALB DNS:

```bash
# Generate private key and self-signed certificate (valid 365 days)
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout gateway-selfsigned.key \
  -out gateway-selfsigned.crt \
  -subj "/CN=${ALB_DNS}" \
  -addext "subjectAltName=DNS:${ALB_DNS}"
```

Import to ACM:

```bash
aws acm import-certificate \
  --certificate fileb://gateway-selfsigned.crt \
  --private-key fileb://gateway-selfsigned.key \
  --region $AWS_REGION
```

Save the returned certificate ARN:
```bash
export ACM_CERT_ARN="arn:aws:acm:<REGION>:<ACCOUNT_ID>:certificate/<CERT_ID>"
```

## Update gateway.yaml

Update `public_url` to match the ALB DNS (or Route 53 alias if using a private hosted zone):

```yaml
public_url: "https://${ALB_DNS}"
```

If using Route 53 private hosted zone:

```bash
# Create alias record pointing to ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id <PRIVATE_ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "claude-gateway.internal.yourcompany.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<ALB_HOSTED_ZONE_ID>",
          "DNSName": "'"${ALB_DNS}"'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }' \
  --region $AWS_REGION
```

## Rebuild and Redeploy

```bash
# Build new image with updated gateway.yaml
export IMAGE_TAG="v${CLAUDE_VERSION}-$(date +%Y%m%d%H%M%S)"

docker build -t claude-gateway:${IMAGE_TAG} .

docker tag claude-gateway:${IMAGE_TAG} \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/claude-gateway:${IMAGE_TAG}

docker push \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/claude-gateway:${IMAGE_TAG}

# Update task definition with new image tag (edit task-definition.json)
# Then register new revision
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION

# Update service to use new task definition revision
aws ecs update-service \
  --cluster claude-gateway \
  --service claude-gateway \
  --task-definition claude-gateway \
  --force-new-deployment \
  --region $AWS_REGION
```

## Update IdP Redirect URI

In your IdP (Okta, Entra ID, etc.), update the allowed redirect URIs to match the new `public_url`:

```
https://<ALB_DNS>/oauth/callback
```

Or if using Route 53:
```
https://claude-gateway.internal.yourcompany.com/oauth/callback
```

## Client TLS Trust (Self-Signed Cert)

If using a self-signed certificate, clients must trust it.

### macOS: Add to System Keychain

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  gateway-selfsigned.crt
```

### Alternative: Set NODE_EXTRA_CA_CERTS

For Claude Code, set the environment variable pointing to the cert:

```bash
export NODE_EXTRA_CA_CERTS=/path/to/gateway-selfsigned.crt
```

Or add to `~/.claude/settings.json`:
```json
{
  "env": {
    "NODE_EXTRA_CA_CERTS": "/path/to/gateway-selfsigned.crt"
  }
}
```
