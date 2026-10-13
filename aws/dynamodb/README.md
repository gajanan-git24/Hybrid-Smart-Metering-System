# DynamoDB Telemetry Storage

The cloud data store contains telemetry records delivered by the AWS IoT processing Lambda.

Recommended attributes:

- `meter_id`
- `timestamp`
- `source`
- `sequence`
- `hops`
- `voltage`
- `current`
- `power`
- `frequency`
- `energy`

The dashboard API reads the latest records for the three prototype meters.

Table names, ARNs, account identifiers, and deployment-specific resource IDs are intentionally omitted from public documentation.
