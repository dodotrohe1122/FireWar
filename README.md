This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Live sensor data and MongoDB

The dashboard reads the latest sensor values from the MQTT subscriber. The
subscriber starts with the Next.js Node.js server, and each message received on
`fire/gateway/GW_01/all` is saved as an individual MongoDB document so readings
remain available after the app restarts. Keep the app server running to ingest
readings; a serverless deployment that suspends background processes needs a
separate always-on MQTT worker.

Set these server-side environment variables before starting the app:

```env
MQTT_BROKER_URL=mqtt://127.0.0.1:1883
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=firewar
```

For MongoDB Atlas, use the connection string from your Atlas cluster as
`MONGODB_URI` and allow the app server's IP in the cluster network access list.
Keep credentials in `.env.local` or your deployment's secret settings; do not
expose the MongoDB URI with a `NEXT_PUBLIC_` variable.

For the Gateway, copy `firmware/gateway/include/secrets.h.example` to
`firmware/gateway/include/secrets.h` and configure Wi-Fi credentials locally.
The local file is ignored by Git. Telegram alerts are optional; configure their
credentials there if needed. Rotate any credentials that were previously
committed in source.

The app creates the `node_readings` collection and indexes automatically on
first write. Each document contains the sensor payload, MQTT topic, and
`received_at` server timestamp. MongoDB's TTL index expires each document 5
minutes after it is received; MongoDB runs TTL cleanup asynchronously, and the
history API also filters out readings older than 5 minutes. Read recent
readings from `/api/nodes/history`; optionally filter with
`?node_id=NODE_KITCHEN_01` and set `?limit=100` (maximum 500). The current
in-memory readings remain available at `/api/nodes`.

## Fire alarm levels

This hardware setup uses two ESP32 boards: one Sensor Node and one Gateway.
They exchange newline-delimited JSON over a direct 3.3 V UART connection; no
RS485/MAX485 transceiver is used. Connect Sensor Node GPIO17 (TX) to Gateway
GPIO16 (RX), Sensor Node GPIO16 (RX) to Gateway GPIO17 (TX), and connect both
GND pins. Do not connect 5 V logic signals to ESP32 UART pins. Both sides use
UART2 at 115200 baud.
The Gateway allocates a 1024-byte frame buffer and UART RX queue for the
newline-delimited JSON message.

The Sensor Node evaluates alarm thresholds and controls its active-low buzzer
on GPIO25. The Gateway preserves the Sensor Node's status and publishes a
`system_status` aggregate on the existing
`fire/gateway/GW_01/all` topic. `FIRE` takes priority, then `WARNING`; sensor
errors or offline nodes prevent the system from being reported `NORMAL`.
Dashboard displays these firmware/gateway statuses and does not re-evaluate
sensor thresholds. RoR is transmitted in °C/s; MQ-2 is raw ADC (0-4095), not
ppm. `smoke_ppm` and FRI remain absent/null until calibrated/implemented.
`fire_detected_at_ms` records the Sensor Node's uptime counter; it is not UTC
because the firmware does not yet synchronize its clock with NTP.

Initial test thresholds in `firmware/sensor-node/include/config.h`:

| Signal | WARNING | FIRE | Clear / hysteresis |
| --- | ---: | ---: | ---: |
| Temperature | 40 °C | 60 °C | WARNING clears at 38 °C or lower |
| RoR | 0.08 °C/s | 0.15 °C/s | Clear at 0.05 °C/s or lower |
| MQ-2 raw ADC | 350 | 700 | Clear at 300 or lower |
| Flame | WARNING by itself | FIRE with another warning-level signal | Must remain absent to clear |

These are experimental starting points, not certified fire-safety limits.
Calibrate MQ-2 ADC thresholds after sensor warm-up and in the installed
environment; calibrate the flame module's active level and false-positive
behavior. WARNING needs 2 seconds of evidence and clears after all readings
remain safe for 5 seconds. FIRE stays latched for at least 10 seconds and
downgrades after 10 seconds of valid readings without any FIRE-level evidence.
If WARNING-level evidence remains (for example smoke ADC 456, between the
350 WARNING and 700 FIRE thresholds), it downgrades to `WARNING`, not `FIRE`;
otherwise it returns to `NORMAL`. WARNING only clears after readings stay
below its separate clear thresholds for 5 seconds. Invalid required readings
report `SENSOR_ERROR`; the buzzer uses the warning beep pattern for this state.

### Firmware build and bench checks

Run PlatformIO commands from the repository root:

```powershell
pio run -d firmware/sensor-node -e esp32dev
pio run -d firmware/gateway -e esp32dev
pio run -d firmware/sensor-node -e esp32dev -t upload
pio run -d firmware/gateway -e esp32dev -t upload
pio device monitor -d firmware/sensor-node -b 115200
pio device monitor -d firmware/gateway -b 115200
```

Observe the existing MQTT stream with:

```powershell
mosquitto_sub -h <broker-ip> -t fire/gateway/GW_01/all -v
```

Bench-test with sensor simulators or safe electrical signal inputs; do not
create a real fire. Expected scenarios:

| Bench input | Expected result |
| --- | --- |
| Low temperature, low ADC, flame off | `NORMAL`; buzzer off |
| Temperature above warning for 2 seconds | `WARNING`; 200 ms on / 800 ms off |
| ADC at/above 350 but below 700 | `WARNING`; intermittent buzzer |
| RoR at/above 0.15 °C/s | `FIRE`; continuous buzzer |
| Flame with warning-level temperature, ADC, or RoR | `FIRE`; continuous buzzer |
| `WARNING` escalates to `FIRE` | Continuous buzzer immediately |
| Disconnect DS18B20 or send invalid readings | `SENSOR_ERROR`, never `NORMAL` |
| Sensor Node reports `FIRE` | Gateway and Dashboard report `FIRE` |
| Warning readings fluctuate around thresholds | Hysteresis keeps the warning until all clear thresholds hold 5 seconds |
| Stop one expected node | Gateway `system_status` becomes `OFFLINE` after 15 seconds |

The Gateway currently expects the single directly connected node
`NODE_KITCHEN_01`. Multi-node aggregation would require a different transport
or additional UART links and is not part of this two-board setup.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
