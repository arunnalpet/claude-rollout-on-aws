# Keycloak OIDC Setup Guide

Configure Keycloak as the identity provider for Claude Apps Gateway using OpenID Connect.

## Prerequisites

- Keycloak server running and accessible (version 20+)
- Admin access to the Keycloak Administration Console
- A DNS name or IP for your Keycloak host (e.g., `keycloak.example.com`)
- Claude Apps Gateway deployed with a reachable callback URL

## Step-by-Step Configuration

### 1. Create a Realm

1. Log in to the Keycloak Admin Console (`https://<keycloak-host>/admin`).
2. Click the realm dropdown (top-left) → **Create Realm**.
3. Set a **Realm name** (e.g., `claude-gateway`).
4. Click **Create**.

> All subsequent steps are performed inside this realm.

### 2. Create an OIDC Client

1. Navigate to **Clients** → **Create client**.
2. Configure the client:
   - **Client type**: OpenID Connect
   - **Client ID**: e.g., `claude-apps-gateway`
3. On the next screen:
   - **Client authentication**: ON (confidential client)
   - **Authentication flow**: check **Standard flow** (Authorization Code)
4. Set redirect URIs:
   - **Valid redirect URIs**: `https://<gateway>/oauth/callback`
   - **Web origins**: `https://<gateway>`
5. Click **Save**.
6. Go to the **Credentials** tab and copy the **Client secret**.

### 3. Create a `groups` Client Scope

1. Navigate to **Client scopes** → **Create client scope**.
2. Configure:
   - **Name**: `groups`
   - **Type**: Default
   - **Protocol**: OpenID Connect
3. Click **Save**.
4. Inside the new scope, go to **Mappers** → **Configure a new mapper** → select **Group Membership**.
5. Configure the mapper:
   - **Name**: `groups`
   - **Token Claim Name**: `groups`
   - **Full group path**: **ON**
   - **Add to ID token**: ON
   - **Add to access token**: ON
   - **Add to userinfo**: ON
6. Click **Save**.

### 4. Assign the Scope to the Client

1. Navigate to **Clients** → select `claude-apps-gateway`.
2. Go to the **Client scopes** tab.
3. Click **Add client scope** → select `groups` → add as **Default**.

### 5. Create Groups

Create a nested hierarchy that reflects your organization:

1. Navigate to **Groups** → **Create group**.
2. Example hierarchy:

```
/acme                        (organization)
/acme/engineering            (department)
/acme/engineering/ml-team    (team)
/acme/engineering/platform   (team)
/acme/research               (department)
/acme/research/safety        (team)
```

To create nested groups, click a parent group → **Create subgroup**.

### 6. Create Users and Assign to Groups

1. Navigate to **Users** → **Create user**.
2. Fill in username, email, first/last name.
3. Go to the **Groups** tab → **Join group** → select the appropriate group(s).
4. Set a password under the **Credentials** tab.

Repeat for each user. Users inherit all ancestor groups in their token.

## Verify the Configuration

### Check OIDC Discovery

```bash
curl -s https://<keycloak-host>/realms/<realm>/.well-known/openid-configuration | jq .
```

Confirm the response includes `authorization_endpoint`, `token_endpoint`, and `userinfo_endpoint`.

### Test Token for Groups Claim

1. Obtain a token using the Resource Owner Password Grant (for testing only):

```bash
curl -s -X POST https://<keycloak-host>/realms/<realm>/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=claude-apps-gateway" \
  -d "client_secret=<client-secret>" \
  -d "username=testuser" \
  -d "password=testpassword" \
  -d "scope=openid profile email groups" | jq .
```

2. Decode the `access_token` (or `id_token`) at [jwt.io](https://jwt.io) or with:

```bash
echo '<token>' | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

3. Confirm the `groups` claim contains full paths:

```json
{
  "groups": [
    "/acme/engineering/ml-team"
  ],
  "email": "alice@example.com",
  "sub": "..."
}
```

## Gateway Configuration

Add the following to your `gateway.yaml`:

```yaml
oidc:
  issuer: https://<keycloak-host>/realms/<realm>
  client_id: <client-id>
  client_secret: ${OIDC_CLIENT_SECRET}
  allowed_email_domains: [example.com]
  userinfo_fallback: true
  scopes: [openid, profile, email, offline_access, groups]
```

Set the environment variable:

```bash
export OIDC_CLIENT_SECRET="<your-client-secret>"
```

## Policy Matching Example

Use the full group path in policies for unambiguous matching:

```yaml
policies:
  - name: ml-team-full-access
    match:
      groups:
        - /acme/engineering/ml-team
    limits:
      max_budget_per_user: 500.00
      models: [claude-sonnet-4-20250514, claude-opus-4-20250514]

  - name: engineering-standard
    match:
      groups:
        - /acme/engineering
    limits:
      max_budget_per_user: 100.00
      models: [claude-sonnet-4-20250514]

  - name: all-acme-employees
    match:
      groups:
        - /acme
    limits:
      max_budget_per_user: 25.00
      models: [claude-haiku-3-20250401]
```

> Policies are evaluated in order. A user in `/acme/engineering/ml-team` also belongs to `/acme/engineering` and `/acme`, so place the most specific policy first.

## Keycloak-Specific Notes

| Topic | Detail |
|-------|--------|
| **PKCE** | Keycloak supports PKCE (S256). The gateway will use it automatically if configured. |
| **Refresh tokens** | The `offline_access` scope is required for refresh tokens that survive session expiry. Without it, refresh tokens are tied to the SSO session lifetime. |
| **Groups scope** | The `groups` scope must be explicitly requested in the `scopes` list. It is not included by default in the standard OIDC scopes. |
| **Full group path** | Keep **Full group path: ON** in the mapper. This produces paths like `/acme/engineering/ml-team` instead of just `ml-team`, preventing ambiguity when multiple groups share the same leaf name. |
| **userinfo_fallback** | Set to `true` in gateway config. If the groups claim is missing from the ID token (e.g., due to token size limits), the gateway will call the userinfo endpoint as a fallback. |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `groups` claim missing from token | Groups scope not assigned to client, or not requested in scopes | Verify the `groups` scope is added as Default to the client. Ensure `groups` is in the gateway `scopes` list. |
| `email` claim missing from token | User has no email set, or email scope not requested | Set an email address on the user in Keycloak. Ensure `email` is in the `scopes` list. |
| Sessions don't renew / refresh fails | `offline_access` scope not included | Add `offline_access` to the `scopes` list in gateway config. In Keycloak, ensure the client has the `offline_access` scope assigned. |
| "Unknown scope" error during login | Custom scope not created or not assigned | Create the `groups` client scope (Step 3) and assign it to the client as Default (Step 4). |
| Groups show only leaf name (e.g., `ml-team`) | Full group path is OFF in the mapper | Edit the Group Membership mapper → set **Full group path**: ON. |
| Token too large / request fails | User belongs to many groups | Enable `userinfo_fallback: true` in gateway config so claims are fetched via a separate request instead of being embedded in the token. |
