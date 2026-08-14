# Microsoft Entra ID OIDC Setup Guide

Configure Microsoft Entra ID (formerly Azure AD) as the identity provider for Claude Apps Gateway using OpenID Connect.

## Prerequisites

- A Microsoft Entra ID tenant (Azure AD)
- Access to the [Azure Portal](https://portal.azure.com)
- Permissions to create **App Registrations** (Application Administrator or Global Administrator role)
- Claude Apps Gateway deployed with a reachable callback URL

## Step-by-Step Configuration

### 1. Register an Application

1. In the Azure Portal, navigate to **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Configure:
   - **Name**: e.g., `Claude Apps Gateway`
   - **Supported account types**: Accounts in this organizational directory only (Single tenant)
   - **Redirect URI**:
     - Platform: **Web**
     - URI: `https://<gateway>/oauth/callback`
3. Click **Register**.
4. Note the **Application (client) ID** and **Directory (tenant) ID** from the Overview page.

### 2. Create a Client Secret

1. Go to **Certificates & secrets** → **Client secrets** → **New client secret**.
2. Set a description (e.g., `gateway-prod`) and an expiry period.
3. Click **Add** and immediately copy the **Value** (it will not be shown again).

> ⚠️ **Important**: Client secrets expire. Set a calendar reminder to rotate them before expiry. Consider 12-month or 24-month maximum.

### 3. Configure Token Claims

By default, Entra ID does not include the `email` claim in tokens. You must add it explicitly.

1. Go to **Token configuration** → **Add optional claim**.
2. Select **ID** token type → check **email** → click **Add**.
3. When prompted to add the Microsoft Graph `email` permission, accept.
4. Repeat for the **Access** token type if needed.

### 4. Configure Groups

Choose **one** of the following options:

---

#### Option A: Group Object IDs (GUIDs)

This is the simpler approach but results in opaque identifiers in policies.

1. Go to **Token configuration** → **Add groups claim**.
2. Select **Security groups** (and/or **All groups**).
3. For each token type (ID, Access, SAML), select **Group ID**.
4. Click **Add**.

Tokens will include a `groups` claim with Azure AD group object IDs:

```json
{
  "groups": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  ]
}
```

---

#### Option B: App Roles (Recommended)

App Roles provide human-readable role names in the token, avoiding GUIDs and the 200-group limit.

1. Go to **App roles** → **Create app role**.
2. Create roles that match your organizational structure:

| Display Name | Value | Allowed member types |
|---|---|---|
| Engineer | `engineer` | Users/Groups |
| ML Researcher | `ml-researcher` | Users/Groups |
| Product | `product` | Users/Groups |
| Admin | `admin` | Users/Groups |

3. Click **Create** for each role.

4. Assign users or groups to roles:
   - Go to **Enterprise applications** → select your app.
   - Click **Users and groups** → **Add user/group**.
   - Select users/groups → select a role → **Assign**.

Tokens will include a `roles` claim with the role values:

```json
{
  "roles": [
    "engineer",
    "ml-researcher"
  ]
}
```

---

### 5. Configure API Permissions

1. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**.
2. Add the following permissions:
   - `openid`
   - `profile`
   - `email`
   - `offline_access`
3. Click **Grant admin consent for [tenant]** → confirm.

Verify all permissions show a green checkmark under "Status".

## Verify the Configuration

### Check OIDC Discovery

```bash
curl -s "https://login.microsoftonline.com/<tenant-id>/v2.0/.well-known/openid-configuration" | jq .
```

Confirm the response includes `authorization_endpoint`, `token_endpoint`, `issuer`, and that the issuer matches:

```
https://login.microsoftonline.com/<tenant-id>/v2.0
```

### Test Authentication Flow

Use the Azure Portal's **Authentication** test or initiate a login flow through the gateway and inspect the resulting token at [jwt.ms](https://jwt.ms) to confirm:

- `email` claim is present
- `groups` (Option A) or `roles` (Option B) claim is present
- `iss` matches your expected issuer

## Gateway Configuration

Add the following to your `gateway.yaml`:

```yaml
oidc:
  issuer: https://login.microsoftonline.com/<tenant-id>/v2.0
  client_id: <application-client-id>
  client_secret: ${OIDC_CLIENT_SECRET}
  allowed_email_domains: [yourcompany.com]
  scopes: [openid, profile, email, offline_access]
  groups_claim: roles  # if using App Roles (Option B)
```

> If using **Option A** (Group Object IDs), remove the `groups_claim` line — the gateway will read the default `groups` claim.

Set the environment variable:

```bash
export OIDC_CLIENT_SECRET="<your-client-secret>"
```

## Policy Matching Examples

### Option A: Group Object IDs (GUIDs)

```yaml
policies:
  - name: ml-team-access
    match:
      groups:
        - "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  # ML Team security group
    limits:
      max_budget_per_user: 500.00
      models: [claude-sonnet-4-20250514, claude-opus-4-20250514]

  - name: engineering-access
    match:
      groups:
        - "b2c3d4e5-f6a7-8901-bcde-f12345678901"  # Engineering security group
    limits:
      max_budget_per_user: 100.00
      models: [claude-sonnet-4-20250514]
```

> Use comments to document which GUID corresponds to which group name.

### Option B: App Roles (Recommended)

```yaml
policies:
  - name: ml-researcher-access
    match:
      groups:
        - ml-researcher
    limits:
      max_budget_per_user: 500.00
      models: [claude-sonnet-4-20250514, claude-opus-4-20250514]

  - name: engineer-access
    match:
      groups:
        - engineer
    limits:
      max_budget_per_user: 200.00
      models: [claude-sonnet-4-20250514]

  - name: product-access
    match:
      groups:
        - product
    limits:
      max_budget_per_user: 50.00
      models: [claude-haiku-3-20250401]
```

## Entra ID-Specific Notes

| Topic | Detail |
|-------|--------|
| **Groups are GUIDs** | By default, the `groups` claim contains Azure AD object IDs (GUIDs), not human-readable names. Use **App Roles** (Option B) for readable policy matching. |
| **Email must be added explicitly** | The `email` claim is not included by default. You must add it as an optional claim in Token configuration (Step 3). |
| **200-group limit** | If a user belongs to more than 200 groups, Entra ID replaces the `groups` claim with a `_claim_sources` reference requiring a separate Graph API call. **App Roles do not have this limitation.** |
| **Client secret expiry** | Secrets have a maximum lifetime (recommended: 12–24 months). Set rotation reminders. Consider using certificates for production. |
| **Conditional Access** | Entra ID Conditional Access policies (MFA, compliant device, location) still apply. Users may be blocked or prompted for additional factors depending on your tenant's policies. |
| **Issuer URL format** | Always use the v2.0 endpoint: `https://login.microsoftonline.com/<tenant-id>/v2.0`. The v1.0 endpoint uses a different token format. |
| **Multi-tenant** | If you selected single-tenant, only users in your directory can authenticate. For multi-tenant scenarios, adjust the `allowed_email_domains` list accordingly. |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `email` claim missing from token | Optional claim not configured | Go to **Token configuration** → add `email` as optional claim for ID token (Step 3). |
| `groups` claim missing | Groups claim not configured, or user has >200 groups | Add groups claim in Token configuration (Option A), or switch to App Roles (Option B) to avoid the 200-group limit. |
| `roles` claim missing | App Roles not assigned to the user | Go to **Enterprise applications** → **Users and groups** → assign the user to a role. |
| `AADSTS65001` consent error | Admin consent not granted | Go to **API permissions** → click **Grant admin consent**. |
| `AADSTS700016` application not found | Wrong client ID or tenant | Verify `client_id` and `tenant-id` in gateway config match the App Registration. |
| Token rejected / issuer mismatch | Using v1.0 endpoint instead of v2.0 | Ensure issuer in gateway config uses `/v2.0` path. |
| Login works but session expires quickly | `offline_access` not in scopes | Add `offline_access` to the `scopes` list. Ensure the permission is granted in API permissions. |
| `invalid_client` error | Client secret expired or incorrect | Rotate the client secret in **Certificates & secrets** and update the `OIDC_CLIENT_SECRET` environment variable. |
