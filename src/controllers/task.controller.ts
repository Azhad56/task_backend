import type { Request, Response } from "express";
import { AppError } from "../errors/appError.js";
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
} from "../services/task.service.js";
import {
  createTaskSchema,
  taskIdSchema,
  taskQuerySchema,
  updateTaskSchema,
} from "../validators/task.validator.js";

export async function getTasks(req: Request, res: Response): Promise<void> {
  const query = taskQuerySchema.parse(req.query);
  const data = await listTasks({
    ...query,
    search: query.search ? query.search : undefined,
  });
  res.status(200).json({ success: true, data });
}

export async function getTask(req: Request, res: Response): Promise<void> {
  const { id } = taskIdSchema.parse(req.params);
  const task = await getTaskById(id);
  if (!task) {
    throw new AppError(404, "Task not found");
  }
  res.status(200).json({ success: true, data: task });
}

export async function postTask(req: Request, res: Response): Promise<void> {
  const input = createTaskSchema.parse(req.body);
  const task = await createTask(input);
  res.status(201).json({ success: true, data: task });
}

export async function patchTask(req: Request, res: Response): Promise<void> {
  const { id } = taskIdSchema.parse(req.params);
  const input = updateTaskSchema.parse(req.body);
  const task = await updateTask(id, input);
  if (!task) {
    throw new AppError(404, "Task not found");
  }
  res.status(200).json({ success: true, data: task });
}

export async function removeTask(req: Request, res: Response): Promise<void> {
  const { id } = taskIdSchema.parse(req.params);
  const deleted = await deleteTask(id);
  if (!deleted) {
    throw new AppError(404, "Task not found");
  }
  res.status(204).end();
}
