import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";

if (!env.mongodbUri) {
  console.error("MONGODB_URI is required. Copy task_backend/.env.example to task_backend/.env and set it.");
  process.exit(1);
}

await connectDb(env.mongodbUri, env.debug);

const server = app.listen(env.port, () => {
  console.log(`TaskFlow API listening on port ${env.port}`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
