# Telemetry Data Flow

## 1. Meter generation

Each ESP32 represents an individual meter and generates telemetry containing:

- meter ID
- source node
- voltage
- current
- power
- frequency
- energy
- sequence number
- hop count

## 2. Mesh transport

ESP-NOW transports telemetry between neighboring ESP32 nodes. NODE02 and NODE03 can forward telemetry through the mesh so that it reaches NODE01.

## 3. Raspberry Pi ingestion

NODE01 sends received telemetry to the Raspberry Pi over USB serial. The Python gateway parses the newline-delimited `DATA:` JSON records.

Example:

```text
DATA:{"source":"NODE02","meter":"MTR002","sequence":123,"hops":1,"voltage":234.1,"current":3.62,"power":847.44,"frequency":49.8,"energy":126.12}
```

## 4. Local storage

The Raspberry Pi stores telemetry in a local SQLite database. The database file is local deployment data and is not committed to Git.

## 5. Cloud publication

The gateway publishes live telemetry to the MQTT topic:

```text
hybridmesh/telemetry
```

AWS IoT Core receives the message and an IoT Rule invokes the telemetry processing Lambda.

## 6. Cloud storage and API

The processor stores telemetry in DynamoDB. The dashboard API Lambda reads the latest meter data and API Gateway exposes it through `GET /prod/telemetry`.

## 7. Dashboard

The frontend fetches the API response and maps the `meters` array by `meter_id`. The `timestamp` supplied by the API is used as the telemetry reading time.
