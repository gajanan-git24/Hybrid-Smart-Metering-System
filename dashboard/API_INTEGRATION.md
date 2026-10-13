# Dashboard API Integration

The frontend should request live telemetry from the API Gateway deployment.

## Endpoint contract

```text
GET /prod/telemetry
```

Store the complete deployed API URL in a frontend environment variable, for example:

```text
VITE_TELEMETRY_API_URL=...
```

Do not hard-code cloud credentials or certificates in browser code.

## Expected response

```json
{
  "status": "success",
  "meters": [
    {
      "meter_id": "MTR001",
      "source": "NODE01",
      "voltage": 234.2,
      "current": 3.41,
      "power": 798.62,
      "frequency": 49.6,
      "energy": 129.7,
      "sequence": 470,
      "hops": 0,
      "timestamp": "2026-09-25 01:06:33"
    }
  ]
}
```

## Recommended dashboard behavior

- Show one card per meter.
- Display voltage, current, power, frequency and energy.
- Show source node and the API-provided telemetry timestamp.
- Refresh periodically for live monitoring.
- Display loading and API-error states.
- Do not expose AWS IoT certificates, private keys, IAM credentials, or other cloud secrets in frontend code.
