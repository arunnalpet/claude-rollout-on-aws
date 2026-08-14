# Step 11: Verification

Run these checks in order. Each builds on the previous — if an earlier check fails, fix it before proceeding.

## Check 1: Gateway Discovery Document

```bash
curl -s https://<PUBLIC_URL>/.well-known/oauth-authorization-server | jq
```

Expected: JSON response with `authorization_endpoint`, `token_endpoint`, `device_authorization_endpoint`, etc.

```json
{
  "issuer": "https://<PUBLIC_URL>",
  "authorization_endpoint": "https://<PUBLIC_URL>/oauth/authorize",
  "token_endpoint": "https://<PUBLIC_URL>/oauth/token",
  "device_authorization_endpoint": "https://<PUBLIC_URL>/oauth/device_authorization",
  ...
}
```

## Check 2: Device Authorization

```bash
curl -s -X POST https://<PUBLIC_URL>/oauth/device_authorization | jq
```

Expected: JSON with `device_code`, `user_code`, `verification_uri`, `verification_uri_complete`, and `expires_in`.

```json
{
  "device_code": "...",
  "user_code": "XXXX-XXXX",
  "verification_uri": "https://<PUBLIC_URL>/oauth/verify",
  "verification_uri_complete": "https://<PUBLIC_URL>/oauth/verify?user_code=XXXX-XXXX",
  "expires_in": 900
}
```

## Check 3: Browser Sign-In

1. Open `verification_uri_complete` from Check 2 in a browser
2. Should redirect to your IdP (Okta, Entra ID, etc.)
3. Sign in with valid credentials
4. Should redirect back and show confirmation that the device is authorized

## Check 4: Claude Code /login

```bash
claude /login
```

1. Should display "Cloud gateway" screen (not the standard Anthropic login)
2. Press Enter to open browser
3. Complete browser sign-in with your IdP
4. Return to terminal — should show successful authentication
5. Test inference works:
   ```bash
   claude "Hello, what model are you?"
   ```

## Check 5: Claude Desktop

1. Quit and restart Claude Desktop
2. Should show **"Sign in with your organization"** (not the standard sign-in)
3. Complete sign-in flow via browser
4. Verify you can send messages and receive responses

## Failure Diagnosis

| Check that fails | Likely cause |
|---|---|
| Check 1: Connection refused / timeout | ALB not reachable — check VPN/network, security groups, ALB scheme |
| Check 1: TLS error | Certificate not trusted — add to keychain or set NODE_EXTRA_CA_CERTS |
| Check 1: 502 Bad Gateway | ECS task not running or unhealthy — check service events, target group health |
| Check 1: Unexpected response | Wrong port, path, or gateway not started — check CloudWatch logs |
| Check 2: 500 error | Database connection failed — check DATABASE_URL secret, RDS security group |
| Check 2: OIDC error | IdP configuration wrong — check issuer_url, client_id, client_secret |
| Check 3: IdP login fails | Redirect URI mismatch — update IdP allowed redirect URIs to match public_url |
| Check 3: Callback error | Session secret missing or OIDC misconfigured — check secrets in task def |
| Check 4: No gateway screen | Managed settings not found — verify file path and JSON syntax |
| Check 4: Auth succeeds but inference fails | ANTHROPIC_API_KEY invalid or missing — check secret value |
| Check 5: Standard sign-in shown | managed_settings.json not at correct path or malformed JSON |
| Check 5: Sign-in fails | Same as Check 3/4 — IdP redirect or session issue |
