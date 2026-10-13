# System Architecture

## 1. Hardware layer

| Component | Role |
|---|---|
| NODE01 | MTR001 and fixed Raspberry Pi USB gateway |
| NODE02 | MTR002 and flexible ESP-NOW mesh node |
| NODE03 | MTR003 and flexible ESP-NOW mesh node |
| Raspberry Pi | Data concentrator, SQLite host and MQTT bridge |

## 2. Wireless layer

ESP-NOW provides local node-to-node communication. NODE01 has the only physical USB connection to the Raspberry Pi. NODE02 and NODE03 are flexible mesh nodes and can forward telemetry through neighboring nodes toward NODE01.

The Raspberry Pi's Internet connection is used for cloud backhaul only; it is not the transport used by the ESP32 mesh.

## 3. Edge/data layer

```text
ESP32 telemetry
      ↓
ESP-NOW mesh
      ↓
NODE01 gateway
      ↓ USB serial
Raspberry Pi
      ↓
SQLite
```

## 4. Cloud layer

```text
Raspberry Pi
      ↓ MQTT/TLS
AWS IoT Core
      ↓ IoT Rule
Telemetry Lambda
      ↓
DynamoDB
      ↓
Dashboard API Lambda
      ↓
API Gateway
      ↓ HTTPS
Web/App Dashboard
```

## 5. Design goals

- Individual smart-meter identity for all three nodes.
- Flexible placement of NODE02 and NODE03.
- Fixed gateway connection only at NODE01.
- Multi-hop telemetry forwarding.
- Local persistence in SQLite.
- Cloud ingestion through MQTT.
- Serverless processing and API delivery.
- No AWS credentials or certificates in firmware/frontend source.
