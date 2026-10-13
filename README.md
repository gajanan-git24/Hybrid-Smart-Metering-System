# Hybrid Smart Metering System

A final-year project prototype for non-invasive smart-meter telemetry using an ESP-NOW multi-node mesh, Raspberry Pi data concentration, local SQLite storage, AWS IoT MQTT ingestion, serverless cloud processing, DynamoDB storage, and an API for dashboard integration.

## Overview

The system models three smart-meter nodes:

- **NODE01 / MTR001** — fixed ESP32 gateway node connected to the Raspberry Pi over USB.
- **NODE02 / MTR002** — flexible ESP-NOW mesh meter node.
- **NODE03 / MTR003** — flexible ESP-NOW mesh meter node.

Telemetry includes meter ID, source node, voltage, current, power, frequency, energy consumption, sequence number, hop count, and timestamp.

## End-to-end architecture

```text
NODE02 ─┐
NODE03 ─┼── ESP-NOW Mesh ──> NODE01 ──USB──> Raspberry Pi
NODE01 ─┘                                      |
                                               v
                                             SQLite
                                               |
                                               v
                                       AWS IoT Core (MQTT)
                                               |
                                               v
                                         IoT Rule
                                               |
                                               v
                                      Lambda Processor
                                               |
                                               v
                                           DynamoDB
                                               |
                                               v
                                      Dashboard API Lambda
                                               |
                                               v
                                          API Gateway
                                               |
                                               v
                                      Web/App Dashboard
```

## Security notice

Cloud credentials, private keys, certificates, database files, local environment files, and deployment secrets are intentionally excluded from this repository.

## ESP-NOW mesh

NODE02 and NODE03 can use neighboring ESP32 nodes to reach NODE01. The prototype supports neighbor discovery, RSSI/link monitoring, next-hop selection, sequence numbers, hop count, route-aware forwarding, multi-hop telemetry forwarding, and gateway delivery through NODE01.

NODE01 is the fixed USB gateway. NODE02 and NODE03 remain physically flexible within the ESP-NOW mesh.

## Raspberry Pi gateway

The Raspberry Pi receives newline-delimited telemetry from NODE01 over `/dev/ttyUSB0` at 115200 baud. The cloud gateway reads live telemetry, stores it in SQLite, and publishes the same telemetry over MQTT to AWS IoT Core.

## AWS cloud pipeline

AWS IoT Core receives telemetry on the MQTT topic `hybridmesh/telemetry`. An IoT Rule forwards messages to a Lambda processor, which stores them in DynamoDB. A second Lambda exposes the latest meter readings through API Gateway.

## Dashboard API

The dashboard consumes an endpoint of the form `GET /prod/telemetry` and receives the latest meter records.

Example response shape:

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

The exact deployed host is deployment configuration and is deliberately not stored in this public repository.

## Repository structure

```text
hybrid-meter/
├── esp32/
│   ├── node01_gateway/
│   ├── node02_meter/
│   └── node03_meter/
├── raspberry_pi/
│   ├── gateway_sqlite.py
│   └── gateway_cloud.py
├── aws/
│   ├── lambda/
│   │   ├── telemetry_processor/
│   │   └── dashboard_api/
│   ├── iot/
│   │   └── README.md
│   └── dynamodb/
│       └── README.md
├── dashboard/
│   └── API_INTEGRATION.md
├── docs/
│   ├── architecture.md
│   └── data-flow.md
├── .gitignore
└── README.md
```

## Security

Never commit `.pem`, `.key`, `.crt`, `.p12`, `.pfx`, AWS access keys, AWS secret keys, database files, `.env` files containing secrets, private SSH keys, or generated certificate bundles.

Use environment variables or local configuration files ignored by Git.

## Project status

Validated pipeline:

**ESP32 Mesh → Raspberry Pi → SQLite → MQTT → AWS IoT Core → Lambda → DynamoDB → API Gateway → Dashboard API**
