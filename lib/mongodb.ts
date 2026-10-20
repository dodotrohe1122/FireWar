import { MongoClient, type Collection } from "mongodb";
import type { FireNodeData, NodeReading } from "@/models/node-reading";

const globalForMongo = globalThis as typeof globalThis & {
  fireMongoClient?: MongoClient;
  fireMongoCollection?: Promise<Collection<NodeReading>>;
};

export async function getNodeReadingsCollection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!globalForMongo.fireMongoCollection) {
    const client = new MongoClient(uri);
    globalForMongo.fireMongoClient = client;
    globalForMongo.fireMongoCollection = client
      .connect()
      .then(async () => {
        const database = client.db(process.env.MONGODB_DB ?? "firewar");
        const collection = database.collection<NodeReading>("node_readings");
        await collection.createIndex({ node_id: 1, received_at: -1 });
        await collection.createIndex(
          { received_at: 1 },
          { expireAfterSeconds: 300, name: "ttl_received_at_5m" },
        );
        return collection;
      })
      .catch(async (error: unknown) => {
        globalForMongo.fireMongoCollection = undefined;
        globalForMongo.fireMongoClient = undefined;
        await client.close().catch(() => undefined);
        throw error;
      });
  }

  return globalForMongo.fireMongoCollection;
}

export async function saveNodeReading(
  reading: FireNodeData,
  topic: string,
  receivedAt = new Date(),
) {
  const collection = await getNodeReadingsCollection();

  await collection.insertOne({
    ...reading,
    received_at: receivedAt,
    topic,
  });
}
