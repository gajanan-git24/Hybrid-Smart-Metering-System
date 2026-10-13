# Raspberry Pi Gateway

The Raspberry Pi acts as the data concentrator between the ESP-NOW mesh and AWS cloud services.

## Requirements

- Raspberry Pi OS / Debian-based Linux
- Python 3
- `pyserial`
- AWS IoT Python SDK used by the deployment

## USB serial

The fixed gateway ESP32 is connected by USB and normally appears as:

```text
/dev/ttyUSB0
```

Typical serial rate:

```text
115200
```

## Virtual environment

```bash
source ~/hybridmesh-env/bin/activate
```

## Cloud gateway

```bash
cd ~/pendrive_data/FEDORA-WS-L/aws_major
python gateway_cloud.py
```

The gateway reads telemetry from the serial port, stores it locally in SQLite, and publishes live telemetry to AWS IoT Core.

## Security

Keep AWS certificates, private keys, endpoint configuration, and local database files outside the repository. The `.gitignore` prevents common secret and database file types from being committed.
