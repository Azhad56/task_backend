import type { PipelineStage } from "mongoose";
import { dateOnlyToUtc } from "../lib/dates.js";
import { escapeRegex } from "../lib/regex.js";
import { Task, type TaskDocument } from "../models/task.model.js";
import type {
  CreateTaskInput,
  TaskDto,
  TaskListResult,
  TaskQuery,
  TaskSummary,
  UpdateTaskInput,
} from "../types/task.js";

type TaskRecord = {
  _id: { toString(): string };
  title: string;
  description?: string | null;
  status: TaskDto["status"];
  priority: TaskDto["priority"];
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toDto(task: TaskRecord): TaskDto {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function emptySummary(): TaskSummary {
  return { total: 0, todo: 0, in_progress: 0, completed: 0 };
}

export async function listTasks(query: TaskQuery): Promise<TaskListResult> {
  const filter: Record<string, unknown> = { deletedAt: null };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.search) {
    filter.title = { $regex: escapeRegex(query.search), $options: "i" };
  }

  const direction = query.order === "asc" ? 1 : -1;
  const pipeline: PipelineStage[] = [{ $match: filter }];

  if (query.sortBy === "dueDate") {
    pipeline.push({
      $addFields: {
        hasDueDate: { $cond: [{ $ifNull: ["$dueDate", false] }, 1, 0] },
      },
    });
    pipeline.push({
      $sort: { hasDueDate: -1, dueDate: direction, createdAt: -1, _id: 1 },
    });
  } else {
    pipeline.push({ $sort: { createdAt: direction, _id: 1 } });
  }

  const [records, grouped] = await Promise.all([
    Task.aggregate<TaskRecord>(pipeline),
    Task.aggregate<{ _id: TaskDto["status"]; count: number }>([
      { $match: { deletedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const summary = emptySummary();
  for (const row of grouped) {
    summary[row._id] = row.count;
    summary.total += row.count;
  }

  return {
    tasks: records.map(toDto),
    summary,
  };
}

export async function getTaskById(id: string): Promise<TaskDto | null> {
  const task = await Task.findOne({ _id: id, deletedAt: null }).lean<TaskDocument | null>();
  return task ? toDto(task) : null;
}

export async function createTask(input: CreateTaskInput): Promise<TaskDto> {
  const task = await Task.create({
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate ? dateOnlyToUtc(input.dueDate) : null,
  });

  return toDto(task);
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<TaskDto | null> {
  const update: Record<string, unknown> = {};

  if (input.title !== undefined) {
    update.title = input.title;
  }
  if (input.description !== undefined) {
    update.description = input.description;
  }
  if (input.status !== undefined) {
    update.status = input.status;
  }
  if (input.priority !== undefined) {
    update.priority = input.priority;
  }
  if (input.dueDate !== undefined) {
    update.dueDate = input.dueDate ? dateOnlyToUtc(input.dueDate) : null;
  }

  const task = await Task.findOneAndUpdate({ _id: id, deletedAt: null }, update, {
    returnDocument: "after",
    runValidators: true,
  }).lean<TaskDocument | null>();

  return task ? toDto(task) : null;
}

export async function deleteTask(id: string): Promise<boolean> {
  const task = await Task.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { returnDocument: "after", runValidators: true },
  ).lean();
  return task !== null;
}
