# Step 6: Gateway Configuration (gateway.yaml)

## Goal

Create the `gateway.yaml` configuration file that defines how the Claude Apps Gateway behaves — where it listens, how it authenticates users, which models to expose, and what policies to apply.

## Output

A complete `gateway.yaml` file ready to be embedded in the container or mounted as a config.

---

## Configuration Template

```yaml
# gateway.yaml — Claude Apps Gateway configuration
# Secrets use ${ENV_VAR} syntax and are expanded at runtime from environment variables.

listen:
  host: "0.0.0.0"
  port: 8080
  # public_url is the externally-reachable URL for this gateway.
  # This will be the ALB's HTTPS URL — set it as a placeholder now
  # and update it in Step 09 after the ALB is created.
  public_url: "https://claude-gateway.internal.example.com"
  # Trust X-Forwarded-* headers from the ALB
  trusted_proxies:
    - "10.0.0.0/8"
    - "172.16.0.0/12"
    - "192.168.0.0/16"

# OIDC configuration — values come from the IdP guide you followed earlier.
# The client_secret is injected as an environment variable from Secrets Manager.
oidc:
  issuer_url: "https://your-idp.example.com"
  client_id: "your-client-id"
  client_secret: "${OIDC_CLIENT_SECRET}"
  # Scopes to request from the IdP
  scopes:
    - openid
    - profile
    - email
  # Claim mappings — adjust based on your IdP's token structure
  claims:
    email: "email"
    name: "name"
    groups: "groups"

# Session management
session:
  # JWT secret for signing session tokens — injected from Secrets Manager
  jwt_secret: "${JWT_SECRET}"
  # Session duration in hours
  ttl_hours: 12

# Data store — PostgreSQL connection string injected from Secrets Manager
store:
  postgres_url: "${POSTGRES_URL}"

# Upstream model providers
upstreams:
  - name: bedrock
    region: "us-east-1"
    # auth:{} means use the ECS task role's credentials (no explicit keys needed)
    auth: {}

# Automatically include all models available from the upstream providers.
# When true, users see all Claude models their policies allow.
auto_include_builtin_models: true

# Managed access policies
managed:
  policies:
    # Example: allow the "engineering" group full access to desktop features
    - name: engineering-full
      description: "Full Claude access for engineering team"
      groups:
        - engineering
      desktop: {}

    # Example: allow "all-staff" group access with no desktop features
    - name: staff-basic
      description: "Basic Claude access for all staff"
      groups:
        - all-staff
      desktop: {}
```

---

## Section-by-Section Explanation

### `listen`

| Field | Purpose |
|-------|---------|
| `host` | Bind address. `0.0.0.0` in containers means listen on all interfaces. |
| `port` | The container port. Must match the ECS task definition and target group (8080). |
| `public_url` | The full URL users/clients use to reach the gateway. **Update this in Step 09** after the ALB DNS name is known. |
| `trusted_proxies` | CIDR ranges from which to trust `X-Forwarded-For`, `X-Forwarded-Proto` headers. Include your VPC CIDR(s). |

### `oidc`

This block configures OpenID Connect authentication. The values come from the Identity Provider guide you followed before starting infrastructure setup.

| Field | Purpose |
|-------|---------|
| `issuer_url` | Your IdP's OIDC discovery URL (has `/.well-known/openid-configuration`) |
| `client_id` | The OAuth client ID registered for this gateway |
| `client_secret` | Injected at runtime via `${OIDC_CLIENT_SECRET}` environment variable |
| `scopes` | OAuth scopes to request |
| `claims` | Maps IdP token claims to gateway user attributes |

### `session`

| Field | Purpose |
|-------|---------|
| `jwt_secret` | Signs session cookies/tokens. Injected via `${JWT_SECRET}`. |
| `ttl_hours` | How long a session remains valid before requiring re-authentication. |

### `store`

| Field | Purpose |
|-------|---------|
| `postgres_url` | Full connection string. Injected via `${POSTGRES_URL}`. |

### `upstreams`

Defines model providers. For Bedrock:

| Field | Purpose |
|-------|---------|
| `name` | Provider identifier (`bedrock`) |
| `region` | AWS region where Bedrock is available |
| `auth: {}` | Empty auth block = use the ECS task role credentials. No access keys needed. |

### `auto_include_builtin_models`

When `true`, the gateway automatically discovers and exposes all models available from configured upstreams. Users see models filtered by their policy permissions.

### `managed.policies`

Defines who can access what. Each policy matches users by group membership (from the IdP's `groups` claim).

| Field | Purpose |
|-------|---------|
| `name` | Policy identifier (for logging and management) |
| `description` | Human-readable description |
| `groups` | List of IdP group names this policy applies to |
| `desktop: {}` | Enables Claude desktop app connectivity for matched users |

---

## Important Notes

1. **Secret expansion:** The `${ENV_VAR}` syntax is resolved at container startup. The actual secret values are injected as environment variables by ECS from Secrets Manager (configured in the task definition, Step 08).

2. **`public_url` is a placeholder:** You don't have the ALB DNS name yet. After creating the ALB in Step 09, come back and update this value. The gateway needs it to generate correct redirect URLs for OIDC flows.

3. **OIDC block from IdP guide:** The `issuer_url`, `client_id`, `scopes`, and `claims` values are specific to your Identity Provider. Refer to the IdP setup guide you followed earlier for the exact values.

4. **Policy groups must match IdP groups:** The `groups` values in policies must exactly match the group claim values your IdP includes in tokens.

---

## Where This File Goes

This file will be:
- Stored in the container image at a known path (e.g., `/app/gateway.yaml`), OR
- Mounted via EFS or injected as a config in the task definition

The exact mechanism is configured in Step 08 (ECS Task Definition).
