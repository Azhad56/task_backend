import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { Task } from "../src/models/task.model.js";

type TaskBody = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type ErrorBody = {
  success: false;
  error: { message: string; details?: { path: string; message: string }[] };
};

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 60_000 },
  });
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await mongoose.connection.collection("tasks").deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

async function createTask(overrides: Record<string, unknown> = {}) {
  const response = await request(app)
    .post("/api/tasks")
    .send({ title: "Write assessment", ...overrides });
  expect(response.status).toBe(201);
  return response.body.data as TaskBody;
}

describe("health", () => {
  it("returns ok", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: "ok" } });
  });
});

describe("tasks API", () => {
  it("creates a valid task", async () => {
    const response = await request(app).post("/api/tasks").send({
      title: "  Ship TaskFlow  ",
      description: "  Dashboard and API  ",
      priority: "high",
      dueDate: "2026-12-01",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      title: "Ship TaskFlow",
      description: "Dashboard and API",
      status: "todo",
      priority: "high",
      dueDate: "2026-12-01T00:00:00.000Z",
    });
    expect(response.body.data.id).toMatch(/^[a-f0-9]{24}$/i);
  });

  it("rejects a blank title", async () => {
    const response = await request(app).post("/api/tasks").send({ title: "   " });
    const body = response.body as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.details?.some((detail) => detail.path === "title")).toBe(true);
  });

  it("rejects an invalid status", async () => {
    const response = await request(app).post("/api/tasks").send({
      title: "Valid title",
      status: "done",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("fetches the task list and global summary", async () => {
    await createTask({ title: "First", status: "todo" });
    await createTask({ title: "Second", status: "completed", priority: "low" });

    const response = await request(app).get("/api/tasks");

    expect(response.status).toBe(200);
    expect(response.body.data.tasks).toHaveLength(2);
    expect(response.body.data.summary).toEqual({
      total: 2,
      todo: 1,
      in_progress: 0,
      completed: 1,
    });
  });

  it("updates status and keeps summary counts in sync", async () => {
    const task = await createTask({ title: "Finish tests" });
    const response = await request(app).patch(`/api/tasks/${task.id}`).send({ status: "completed" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("completed");

    const list = await request(app).get("/api/tasks");
    expect(list.body.data.summary.completed).toBe(1);
    expect(list.body.data.summary.todo).toBe(0);
  });

  it("deletes a task", async () => {
    const task = await createTask({ title: "Temporary" });
    const response = await request(app).delete(`/api/tasks/${task.id}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");

    const missing = await request(app).get(`/api/tasks/${task.id}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.message).toBe("Task not found");

    const stored = await Task.findById(task.id).lean();
    expect(stored).not.toBeNull();
    expect(stored?.deletedAt).toBeInstanceOf(Date);

    const list = await request(app).get("/api/tasks");
    expect(list.body.data.tasks).toEqual([]);
    expect(list.body.data.summary.total).toBe(0);

    const repeatedDelete = await request(app).delete(`/api/tasks/${task.id}`);
    expect(repeatedDelete.status).toBe(404);
  });

  it("rejects an invalid id", async () => {
    const response = await request(app).get("/api/tasks/not-a-valid-id");
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Invalid request");
  });

  it("returns 404 for a missing record", async () => {
    const response = await request(app).get("/api/tasks/507f1f77bcf86cd799439011");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: { message: "Task not found" },
    });
  });

  it("searches by title and escapes regex characters", async () => {
    await createTask({ title: "Plan launch (alpha)" });
    await createTask({ title: "Write notes" });

    const match = await request(app).get("/api/tasks").query({ search: "(alpha)" });
    expect(match.status).toBe(200);
    expect(match.body.data.tasks.map((task: TaskBody) => task.title)).toEqual(["Plan launch (alpha)"]);

    const literal = await request(app).get("/api/tasks").query({ search: ".*" });
    expect(literal.body.data.tasks).toEqual([]);

    const partial = await request(app).get("/api/tasks").query({ search: "notes" });
    expect(partial.body.data.tasks).toHaveLength(1);
  });

  it("filters by status and priority", async () => {
    await createTask({ title: "High todo", status: "todo", priority: "high" });
    await createTask({ title: "Low todo", status: "todo", priority: "low" });
    await createTask({ title: "High progress", status: "in_progress", priority: "high" });

    const response = await request(app)
      .get("/api/tasks")
      .query({ status: "todo", priority: "high" });

    expect(response.status).toBe(200);
    expect(response.body.data.tasks.map((task: TaskBody) => task.title)).toEqual(["High todo"]);
    expect(response.body.data.summary.total).toBe(3);
  });

  it("sorts by due date with missing dates last", async () => {
    await Task.collection.insertMany([
      {
        title: "Later",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: new Date("2026-12-01T00:00:00.000Z"),
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
        updatedAt: new Date("2026-01-03T00:00:00.000Z"),
      },
      {
        title: "Earlier",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: new Date("2026-02-01T00:00:00.000Z"),
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      {
        title: "Undated",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
        createdAt: new Date("2026-01-04T00:00:00.000Z"),
        updatedAt: new Date("2026-01-04T00:00:00.000Z"),
      },
    ]);

    const ascending = await request(app).get("/api/tasks").query({ sortBy: "dueDate", order: "asc" });
    expect(ascending.body.data.tasks.map((task: TaskBody) => task.title)).toEqual([
      "Earlier",
      "Later",
      "Undated",
    ]);

    const descending = await request(app).get("/api/tasks").query({ sortBy: "dueDate", order: "desc" });
    expect(descending.body.data.tasks.map((task: TaskBody) => task.title)).toEqual([
      "Later",
      "Earlier",
      "Undated",
    ]);
  });

  it("sorts by creation date deterministically", async () => {
    await Task.collection.insertMany([
      {
        title: "Older",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        title: "Newer",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    const newest = await request(app).get("/api/tasks").query({ sortBy: "createdAt", order: "desc" });
    expect(newest.body.data.tasks.map((task: TaskBody) => task.title)).toEqual(["Newer", "Older"]);

    const oldest = await request(app).get("/api/tasks").query({ sortBy: "createdAt", order: "asc" });
    expect(oldest.body.data.tasks.map((task: TaskBody) => task.title)).toEqual(["Older", "Newer"]);
  });

  it("rejects unknown update fields", async () => {
    const task = await createTask();
    const response = await request(app).patch(`/api/tasks/${task.id}`).send({
      title: "Renamed",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    expect(response.status).toBe(400);
    const current = await request(app).get(`/api/tasks/${task.id}`);
    expect(current.body.data.title).toBe("Write assessment");
  });

  it("rejects an invalid query", async () => {
    const response = await request(app).get("/api/tasks").query({ sortBy: "title" });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("does not expose unexpected errors", async () => {
    const response = await request(app)
      .post("/api/tasks")
      .set("Content-Type", "application/json")
      .send("{");

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Invalid JSON");
    expect(JSON.stringify(response.body)).not.toContain("stack");
  });
});
