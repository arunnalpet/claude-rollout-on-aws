# Complete gateway.yaml Reference

> **Strict schema**: Unknown keys cause a boot failure. Validate your config before deploying.
>
> **Secret expansion**: Use `${VAR}` for environment variables or `${file:/path/to/secret}` for file-based secrets anywhere a string value is expected.

```yaml
# ─────────────────────────────────────────────────────────────────────────────
# LISTEN — where the gateway binds and how it presents itself
# ─────────────────────────────────────────────────────────────────────────────
listen:
  # (required) Interface to bind. Use 0.0.0.0 for containers.
  host: "0.0.0.0"

  # (required) Port the gateway listens on.
  port: 3000

  # (required) The externally-reachable URL (used in OIDC redirects, CORS, etc.)
  # Must match what the browser sees. Include scheme, host, and port if non-standard.
  public_url: "https://claude-gateway.internal.example.com"

  # (optional) CIDR ranges of trusted reverse proxies (ALB, nginx, etc.)
  # When set, X-Forwarded-For is trusted from these sources.
  trusted_proxies:
    - "10.0.0.0/8"
    - "172.16.0.0/12"

  # (optional) TLS termination at the gateway itself.
  # Omit if TLS is terminated at the load balancer.
  tls:
    cert_file: "/etc/ssl/certs/gateway.crt"
    key_file: "/etc/ssl/private/gateway.key"

# ─────────────────────────────────────────────────────────────────────────────
# OIDC — OpenID Connect identity provider configuration
# ─────────────────────────────────────────────────────────────────────────────
oidc:
  # (required) The OIDC issuer URL. Must serve .well-known/openid-configuration.
  issuer: "https://login.microsoftonline.com/TENANT_ID/v2.0"

  # (required) OAuth2 client ID registered with the IdP.
  client_id: "${OIDC_CLIENT_ID}"

  # (required) OAuth2 client secret. Use secret expansion for safety.
  client_secret: "${OIDC_CLIENT_SECRET}"

  # (required) List of allowed email domains. Users outside these domains are rejected.
  allowed_email_domains:
    - "example.com"
    - "subsidiary.example.com"

  # (optional) Fall back to the /userinfo endpoint if the id_token lacks claims.
  # Default: false. Enable for IdPs that don't include email in the id_token.
  userinfo_fallback: false

  # (optional) OAuth2 scopes to request. Defaults to ["openid", "email", "profile"].
  scopes:
    - "openid"
    - "email"
    - "profile"

  # (optional) JWT claim containing group memberships. Used for policy matching.
  # Default: "groups"
  groups_claim: "groups"

  # (optional) Use PKCE (Proof Key for Code Exchange). Default: false.
  # Enable if your IdP supports/requires it (recommended for public clients).
  use_pkce: false

  # (optional) PEM-encoded CA certificate for verifying the IdP's TLS cert.
  # Use when the IdP uses an internal/private CA.
  ca_cert_pem: "${file:/etc/ssl/certs/internal-ca.pem}"

  # (optional) Extra query parameters to include in the authorization request.
  # Useful for forcing tenant selection, login hints, etc.
  extra_auth_params:
    prompt: "select_account"
    domain_hint: "example.com"

  # (optional) The claim in the id_token that contains the user's email.
  # Default: "email". Change if your IdP uses a non-standard claim name.
  email_claim: "email"

  # (optional) Additional form_action origins for CSP headers during OIDC flows.
  # Required if your IdP redirects through intermediate domains.
  form_action_origins:
    - "https://login.microsoftonline.com"

# ─────────────────────────────────────────────────────────────────────────────
# SESSION — JWT session management
# ─────────────────────────────────────────────────────────────────────────────
session:
  # (required) Secret key for signing session JWTs. Must be at least 32 characters.
  # Rotate by deploying a new secret; existing sessions expire naturally.
  jwt_secret: "${SESSION_JWT_SECRET}"

  # (optional) Session lifetime in hours. Default: 12.
  ttl_hours: 12

# ─────────────────────────────────────────────────────────────────────────────
# STORE — persistent storage (PostgreSQL)
# ─────────────────────────────────────────────────────────────────────────────
store:
  # (required) PostgreSQL connection string. The gateway auto-migrates on boot.
  # Use secret expansion: ${POSTGRES_URL} or ${file:/run/secrets/pg_url}
  postgres_url: "${POSTGRES_URL}"

# ─────────────────────────────────────────────────────────────────────────────
# UPSTREAMS — LLM provider backends (at least one required)
# ─────────────────────────────────────────────────────────────────────────────
# Upstreams are tried in order (failover). If the first returns a retryable error,
# the next upstream is attempted.
upstreams:
  # Primary upstream — AWS Bedrock in us-east-1
  - provider: "aws-bedrock"
    region: "us-east-1"
    # (optional) Auth method. For Bedrock on ECS, omit to use the task role.
    # Supported: "iam_role" (default for aws-bedrock), "api_key", "oauth2"
    auth: "iam_role"
    # (optional) Human-readable name for logs and admin UI
    name: "bedrock-primary"

  # Failover upstream — AWS Bedrock in us-west-2
  - provider: "aws-bedrock"
    region: "us-west-2"
    auth: "iam_role"
    name: "bedrock-failover"

  # Example: Anthropic API upstream
  # - provider: "anthropic"
  #   base_url: "https://api.anthropic.com"
  #   auth: "api_key"
  #   name: "anthropic-direct"

# ─────────────────────────────────────────────────────────────────────────────
# ADMIN — administrative access and configuration (optional)
# ─────────────────────────────────────────────────────────────────────────────
admin:
  # (optional) API keys that can read AND write admin endpoints (manage policies, etc.)
  write_keys:
    - "${ADMIN_WRITE_KEY}"

  # (optional) API keys with read-only admin access (view audit logs, usage, etc.)
  read_keys:
    - "${ADMIN_READ_KEY}"

  # (optional) OIDC groups whose members get admin access via the web UI.
  admin_groups:
    - "platform-engineering"
    - "security-team"

  # (optional) Message shown to users when they are blocked by a policy.
  blocked_message: "Access denied. Contact #platform-support on Slack."

  # (optional) Days to retain audit log entries. Default: 90.
  audit_retention_days: 90

  # (optional) Months to retain spend/usage data. Default: 12.
  spend_retention_months: 12

  # (optional) Days to retain identity (user) records after last activity. Default: 365.
  identity_retention_days: 365

  # (optional) How group-level spend limits are applied.
  # "split" — budget is divided equally among group members
  # "shared" — group shares a single pool (default)
  group_limit_mode: "shared"

# ─────────────────────────────────────────────────────────────────────────────
# ENFORCEMENT — policy enforcement behavior (optional)
# ─────────────────────────────────────────────────────────────────────────────
enforcement:
  # (optional) If true, deny requests when the policy engine encounters an error
  # (e.g., database unreachable). If false, allow requests through. Default: true.
  fail_closed_on_error: true

# ─────────────────────────────────────────────────────────────────────────────
# MODELS — custom model definitions (optional)
# ─────────────────────────────────────────────────────────────────────────────
# Define aliases or restrict the model catalog. Each model maps an external-facing
# ID to an upstream model identifier.
models:
  - id: "claude-sonnet"
    label: "Claude Sonnet (Latest)"
    upstream_model: "anthropic.claude-sonnet-4-20250514-v1:0"

  - id: "claude-haiku"
    label: "Claude Haiku (Fast)"
    upstream_model: "anthropic.claude-haiku-4-20250514-v1:0"

  - id: "claude-opus"
    label: "Claude Opus (Advanced)"
    upstream_model: "anthropic.claude-opus-4-20250514-v1:0"

# (optional) When true, the gateway exposes all models the upstream supports in
# addition to any custom models defined above. Default: true.
# Set to false to restrict users to only the models you explicitly list.
auto_include_builtin_models: true

# ─────────────────────────────────────────────────────────────────────────────
# MANAGED — client configuration policies (optional)
# ─────────────────────────────────────────────────────────────────────────────
# Managed policies control what Claude Code CLI and Claude Desktop clients receive
# when they connect. Policies are evaluated top-to-bottom; first match wins.
managed:
  policies:
    # Policy for the ML team — access to all models
    - match:
        groups:
          - "ml-engineering"
      cli:
        # Models available in Claude Code CLI
        availableModels:
          - "claude-opus"
          - "claude-sonnet"
          - "claude-haiku"
        # Allow CLI to discover models dynamically from the gateway
        modelDiscoveryEnabled: true
      desktop:
        # Models available in Claude Desktop
        availableModels:
          - "claude-opus"
          - "claude-sonnet"
          - "claude-haiku"
        modelDiscoveryEnabled: true

    # Policy for general engineering — Sonnet and Haiku only
    - match:
        groups:
          - "engineering"
      cli:
        availableModels:
          - "claude-sonnet"
          - "claude-haiku"
        modelDiscoveryEnabled: false
      desktop:
        availableModels:
          - "claude-sonnet"
          - "claude-haiku"
        modelDiscoveryEnabled: false

    # Default policy (matches everyone) — Haiku only
    - match: {}
      cli:
        availableModels:
          - "claude-haiku"
        modelDiscoveryEnabled: false
      desktop:
        availableModels:
          - "claude-haiku"
        modelDiscoveryEnabled: false

# ─────────────────────────────────────────────────────────────────────────────
# TELEMETRY — OpenTelemetry export (optional)
# ─────────────────────────────────────────────────────────────────────────────
telemetry:
  forward_to:
    # (required within forward_to) OTLP endpoint URL
    url: "https://otel-collector.internal.example.com:4318"

    # (optional) Additional headers sent with OTLP export requests.
    headers:
      Authorization: "Bearer ${OTEL_TOKEN}"

    # (optional) Which signals to export. Default: all available.
    # Options: "traces", "metrics", "logs"
    signals:
      - "traces"
      - "metrics"
      - "logs"
```

## Key Notes

| Topic | Detail |
|-------|--------|
| **Strict schema** | Any unknown key in `gateway.yaml` causes a boot failure with a clear error message identifying the offending key. |
| **Secret expansion** | `${VAR}` reads from environment variables; `${file:/path}` reads the file contents. Works in any string value. |
| **Upstream failover** | Upstreams are tried in declaration order. A retryable error (5xx, timeout) triggers the next upstream. |
| **Policy evaluation** | Managed policies are first-match-wins, evaluated top to bottom. Always end with a catch-all `match: {}`. |
| **TLS** | Omit `listen.tls` if your load balancer terminates TLS. The gateway still requires `public_url` to use `https://`. |
| **Auto-migration** | The PostgreSQL schema is migrated automatically on boot. The database user needs `CREATE TABLE` privileges on first run. |
