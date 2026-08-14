# Step 10: Client Configuration

## Claude Code Managed Settings

Managed settings force all Claude Code users on the machine to authenticate through the gateway. These files **must be deployed by an admin** (MDM, script, or direct file placement).

### macOS

Path: `/Library/Application Support/ClaudeCode/managed-settings.json`

```bash
sudo mkdir -p "/Library/Application Support/ClaudeCode"
sudo tee "/Library/Application Support/ClaudeCode/managed-settings.json" > /dev/null <<'EOF'
{
  "forceLoginMethod": "gateway",
  "forceLoginGatewayUrl": "https://<ALB_DNS>",
  "parentSettingsBehavior": "merge"
}
EOF
```

### Linux

Path: `/etc/claude-code/managed-settings.json`

```bash
sudo mkdir -p /etc/claude-code
sudo tee /etc/claude-code/managed-settings.json > /dev/null <<'EOF'
{
  "forceLoginMethod": "gateway",
  "forceLoginGatewayUrl": "https://<ALB_DNS>",
  "parentSettingsBehavior": "merge"
}
EOF
```

Replace `<ALB_DNS>` with your actual ALB DNS name or Route 53 alias.

## Claude Desktop Managed Settings

### macOS

Path: `/Library/Application Support/Claude/managed_settings.json`

```bash
sudo mkdir -p "/Library/Application Support/Claude"
sudo tee "/Library/Application Support/Claude/managed_settings.json" > /dev/null <<'EOF'
{
  "bootstrapUrl": "https://<ALB_DNS>"
}
EOF
```

Replace `<ALB_DNS>` with your actual ALB DNS name or Route 53 alias.

## Important Notes

- **Admin-only deployment:** Developers cannot set `forceLoginGatewayUrl` manually in their own settings — it has no effect in user-level config. It must be placed in the managed settings path by an administrator.
- **MDM deployment:** For fleet-wide rollout, deploy managed-settings.json via your MDM solution (Jamf, Intune, etc.).
- **parentSettingsBehavior:** Set to `"merge"` to allow user settings (like editor preferences) to coexist with the forced gateway login.

## TLS Trust (Self-Signed Certificate)

If you used a self-signed certificate (Step 09), clients need to trust it.

### Option A: System Keychain (Recommended for MDM)

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  /path/to/gateway-selfsigned.crt
```

### Option B: NODE_EXTRA_CA_CERTS in User Settings

Add to `~/.claude/settings.json`:

```json
{
  "env": {
    "NODE_EXTRA_CA_CERTS": "/path/to/gateway-selfsigned.crt"
  }
}
```

This can also be set in the managed settings if you include the cert at a known path on all machines.
