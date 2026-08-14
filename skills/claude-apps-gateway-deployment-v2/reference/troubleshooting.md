# Troubleshooting Guide

## Boot Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| `exec format error` or binary won't start | Running the gateway binary on an incompatible architecture. The gateway requires a native binary (not a cross-compiled or emulated one). | Use the binary built for your platform (e.g., `linux/amd64` for ECS on x86). Do not run under Rosetta or QEMU. |
| `OIDC discovery error: failed to fetch .well-known/openid-configuration` | The gateway cannot reach the OIDC issuer URL at boot. DNS failure, network policy blocking egress, or wrong issuer URL. | Verify the `oidc.issuer` URL is correct and reachable from the container. Check security groups allow HTTPS egress to the IdP. If using a private CA, set `oidc.ca_cert_pem`. |
| `store: connection timeout` or `could not connect to postgres` | PostgreSQL is unreachable — wrong hostname, port, security group, or the database isn't running. | Verify `store.postgres_url` host/port. Ensure the ECS task's security group can reach the RDS instance on port 5432. Check that the database is in an `available` state. |
| `store: permission denied for schema public` | The PostgreSQL user lacks permissions to create tables (required for auto-migration on first boot). | Grant the user `CREATE` on the target schema: `GRANT CREATE ON SCHEMA public TO gateway_user;` or use a user with `rds_superuser` for initial migration. |
| `config validation error: unknown key "xyz"` | A typo or unsupported key in `gateway.yaml`. The gateway uses a strict schema and rejects unknown keys. | Check the error message for the offending key. Remove it or correct the spelling. Refer to the gateway.yaml reference for valid keys. |

## Login Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Claude Desktop shows the standard API-key picker instead of the gateway sign-in screen | The managed settings file is not at the correct path, or it points to the wrong gateway URL. | Verify the managed settings JSON is at the platform-specific path (`~/Library/Application Support/Claude/managed-settings.json` on macOS, `%APPDATA%\Claude\managed-settings.json` on Windows). Confirm `cloudGatewayUrl` matches `listen.public_url`. |
| `gateway host must be a private network address` | Claude Desktop enforces that gateway hosts resolve to private (RFC 1918) IP addresses. A public-facing ALB or DNS entry pointing to a public IP is rejected. | Ensure the ALB is **internal** (scheme: internal) and resolves to a private IPv4 address. Use a private DNS zone (e.g., Route 53 private hosted zone) if needed. |
| `could not resolve gateway host` or DNS resolution failure | The client machine cannot resolve the gateway's hostname. Typically means the user is not on the corporate VPN or private network. | Confirm the user is connected to the VPN or corporate network. Verify the DNS record exists in the expected private hosted zone. |
| `TLS certificate error` / `unable to verify the first certificate` / `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` | The gateway's TLS certificate is signed by a private/internal CA that the client doesn't trust. | **Claude Code CLI**: Set `NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.pem` in the environment. **macOS Desktop**: Add the CA cert to Keychain Access and set it to "Always Trust". **Windows Desktop**: Import the CA cert into the Trusted Root Certification Authorities store. |

## Auth Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `sign-in could not be completed` after IdP login | The user's email domain is not in `oidc.allowed_email_domains`. The gateway rejects the token. | Add the user's email domain to the `allowed_email_domains` list in `gateway.yaml`, or verify the user is signing in with the correct account. |
| `id_token missing email claim` | The IdP's id_token does not include an `email` claim. Some IdPs require explicit configuration to include it. | Configure the IdP to include the `email` claim in id_tokens. Alternatively, set `oidc.userinfo_fallback: true` to fetch claims from the /userinfo endpoint. If the email is in a non-standard claim, set `oidc.email_claim`. |
| `callback error` or redirect mismatch when behind an ALB | The gateway constructs the OIDC callback URL using its local address instead of the external URL. | Set `listen.public_url` to the externally-reachable URL (the ALB's DNS name with `https://`). Ensure this URL is also registered as a valid redirect URI in your IdP's app registration. |

## Inference Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `502 Bad Gateway` / `could not load credentials` | The ECS task does not have an IAM task role attached, or the role lacks `sts:AssumeRole` permissions. The gateway cannot authenticate to Bedrock. | Attach a task role to the ECS task definition with `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` permissions. Verify the task role (not execution role) is set. |
| `403 AccessDeniedException` from Bedrock | Either the AWS use-case form for model access hasn't been submitted, or the IAM policy doesn't grant access to the requested model. | Submit the model access request in the Bedrock console (Model access page). Verify the task role's IAM policy includes the model ARN: `arn:aws:bedrock:REGION::foundation-model/MODEL_ID`. |
| `model not available` / model not in response list | The model is not included in the user's `availableModels` policy, or `auto_include_builtin_models` is false and the model isn't defined in `models`. | Check the managed policy matching the user's group. Add the model ID to `availableModels` or set `auto_include_builtin_models: true`. |

## Desktop Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Claude Desktop shows "no usable models" after connecting to gateway | The managed policy for the user's group doesn't define `availableModels` for the `desktop` key, or `modelDiscoveryEnabled` is false and no models are listed. | Add `availableModels` to the `desktop` section of the matching policy. Alternatively, set `modelDiscoveryEnabled: true` to let Desktop query available models from the gateway. |
| Desktop bootstrap returns `404 Not Found` | The managed policy matching the user's group does not include a `desktop` key. The gateway has no Desktop configuration to serve. | Add a `desktop: { ... }` block to the matching managed policy. Ensure the policy's `match` criteria align with the user's group memberships. |
| `net::ERR_CERT_AUTHORITY_INVALID` in Claude Desktop | The gateway's TLS certificate (or ALB certificate) is signed by a CA that isn't in the system trust store. | **macOS**: Add the CA certificate to Keychain Access → System keychain → set "Always Trust". **Windows**: Import to Trusted Root Certification Authorities via `certmgr.msc`. Restart Claude Desktop after adding the cert. |

## Deployment Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| ECS task stops immediately with `ResourceInitializationError` | The ECS **execution role** cannot read secrets from Secrets Manager or SSM Parameter Store that are referenced in the task definition's environment/secrets. | Verify the execution role has `secretsmanager:GetSecretValue` (or `ssm:GetParameter`) permissions for the specific secret ARNs. Check the secret ARNs in the task definition match what's in Secrets Manager. |
| Streaming responses drop mid-stream / connection reset | The ALB idle timeout is lower than the time a long inference request takes. ALB closes the connection before the response completes. | Increase the ALB idle timeout to at least 300 seconds (5 minutes). For very long responses, consider 600s. Set via the ALB attribute `idle_timeout.timeout_seconds`. |
| ECS deployment circuit breaker triggers rollback | The new task fails health checks or crashes during boot. The circuit breaker detects the failure and rolls back to the previous task definition. | Check ECS task stopped reason and CloudWatch logs for the failing task. Common causes: config validation error, OIDC discovery failure, or Postgres connectivity. Fix the root cause and re-deploy. |
