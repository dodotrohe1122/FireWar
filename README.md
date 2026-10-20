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

The MQTT subscriber starts with the Next.js Node.js server, and each message
received on `fire/gateway/GW_01/all` is saved as an individual MongoDB document.
Dashboard and node screens query MongoDB for the latest reading per node; they
do not read node values directly from the MQTT subscriber's in-memory cache.
Keep the app server running to ingest readings; a serverless deployment that
suspends background processes needs a separate always-on MQTT worker.

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

The app creates the `node_readings` collection and indexes automatically on
first write. Each document contains the sensor payload, MQTT topic, and
`received_at` server timestamp. MongoDB's TTL index expires each document 5
minutes after it is received; MongoDB runs TTL cleanup asynchronously, and the
history API also filters out readings older than 5 minutes. Read recent
readings from `/api/nodes/history`; optionally filter with
`?node_id=NODE_KITCHEN_01` and set `?limit=100` (maximum 500). The latest
reading per node is available from `/api/nodes`, backed by MongoDB.

The dashboard, building/node list, alerts, node details, and history screens
use these live APIs rather than the original demo sensor/event records. Node
locations are inferred only from recognizable node IDs (`KITCHEN` or `ROOM`);
other IDs are shown as unconfigured instead of being assigned a made-up floor
or room. The history screen displays received MQTT readings from MongoDB and
therefore follows the five-minute retention window above.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
