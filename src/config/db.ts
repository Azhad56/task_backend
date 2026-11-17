import mongoose from "mongoose";

export async function connectDb(uri: string, debug = false): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  mongoose.set("debug", debug);
  return mongoose.connect(uri);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
