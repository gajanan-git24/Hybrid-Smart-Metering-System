# AWS IoT Core Integration

## MQTT topic

Telemetry is published to:

```text
hybridmesh/telemetry
```

## Expected message

```json
{
  "timestamp": "YYYY-MM-DD HH:MM:SS",
  "source": "NODE01",
  "meter_id": "MTR001",
  "sequence": 1,
  "hops": 0,
  "voltage": 230.5,
  "current": 2.15,
  "power": 495.6,
  "frequency": 50.0,
  "energy": 125.42
}
```

## Cloud flow

```text
Raspberry Pi
  -> MQTT
  -> AWS IoT Core
  -> IoT Rule
  -> Telemetry Lambda
  -> DynamoDB
```

## Security

This repository intentionally does not contain AWS IoT endpoints, device certificates, private keys, IAM credentials, account IDs, ARNs, or other deployment secrets.
