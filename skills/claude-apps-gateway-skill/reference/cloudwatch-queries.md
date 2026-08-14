# CloudWatch Logs Insights Queries

**Log group**: `/ecs/claude-gateway`

All queries below target the gateway's structured JSON audit logs. Adjust the time range in the CloudWatch console as needed.

---

## Usage per User per Model

Count of requests and average latency per user per model:

```
fields @timestamp, email, model, latency_ms
| filter event = "inference"
| stats count(*) as request_count, avg(latency_ms) as avg_latency_ms by email, model
| sort request_count desc
```

---

## All Sign-Ins

All successful sign-in events with timestamp, email, and client IP:

```
fields @timestamp, email, client_ip
| filter event = "session.mint"
| sort @timestamp desc
```

---

## Auth Failures

Failed authentication attempts with reason and source:

```
fields @timestamp, reason, path, client_ip, email
| filter event in ["auth.denied", "access.denied"]
| sort @timestamp desc
```

---

## Usage Over Time by User (Hourly)

Request volume per user binned by 1 hour:

```
fields @timestamp, email
| filter event = "inference"
| stats count(*) as requests by bin(1h), email
| sort bin(1h) desc
```

To bin by day instead, replace `bin(1h)` with `bin(1d)`.

---

## Top Users by Request Count

Most active users over the selected time range:

```
fields email
| filter event = "inference"
| stats count(*) as total_requests by email
| sort total_requests desc
| limit 25
```

---

## Model Distribution

Which models are most used:

```
fields model
| filter event = "inference"
| stats count(*) as usage_count by model
| sort usage_count desc
```

---

## Failed Inference Requests

Inference requests that returned a non-200 status (errors from upstream):

```
fields @timestamp, email, model, status_code, error_message
| filter event = "inference" and status_code != 200
| sort @timestamp desc
```

---

## Desktop Bootstrap Events

All Claude Desktop bootstrap requests:

```
fields @timestamp, email, client_ip, policy_group
| filter event = "desktop_bootstrap.serve"
| sort @timestamp desc
```

---

## Gateway Boot Events

Configuration load events (emitted each time the gateway starts):

```
fields @timestamp, version, upstream_count, policy_count
| filter event = "config.load"
| sort @timestamp desc
```

---

## Audit Log Event Types

The gateway emits the following audit log events:

| Event | Description |
|-------|-------------|
| `config.load` | Gateway booted and loaded configuration |
| `session.mint` | New session JWT issued (user signed in) |
| `session.refresh` | Existing session refreshed |
| `device.authorize` | Device authorization flow initiated (CLI) |
| `device.verify` | Device code verified and tokens issued |
| `auth.denied` | Authentication rejected (wrong domain, invalid token, etc.) |
| `access.denied` | Authorized user blocked by policy (model not allowed, spend limit, etc.) |
| `inference` | Inference request processed (success or failure) |
| `managed.serve` | Managed configuration served to a CLI client |
| `desktop_bootstrap.serve` | Desktop bootstrap configuration served |
| `spend.blocked` | Request blocked due to spend limit exceeded |
| `admin.denied` | Admin API request rejected (invalid key or insufficient permissions) |

---

## Important Notes

- **Token counts are NOT in audit logs.** Audit logs record request metadata (who, what model, latency, status) but do not include input/output token counts. For token-level usage tracking, enable telemetry (`telemetry.forward_to` in gateway.yaml) to export OTLP metrics, or configure spend limits which track token consumption internally.

- **Latency** in audit logs reflects end-to-end gateway processing time (including upstream response time for inference events).

- **Retention** follows the CloudWatch log group retention setting. For long-term analysis, consider exporting to S3 or adjust the log group retention period.
