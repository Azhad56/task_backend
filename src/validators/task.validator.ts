import { z } from "zod";
import { isRealDateOnly } from "../lib/dates.js";
import { SORT_ORDERS, TASK_PRIORITIES, TASK_SORT_FIELDS, TASK_STATUSES } from "../types/task.js";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Due date must use YYYY-MM-DD" })
  .refine(isRealDateOnly, { error: "Due date must be a real calendar date" });

const titleSchema = z
  .string()
  .trim()
  .min(1, { error: "Title is required" })
  .max(120, { error: "Title must be 120 characters or fewer" });

const descriptionSchema = z
  .string()
  .trim()
  .max(1000, { error: "Description must be 1000 characters or fewer" });

export const createTaskSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.optional().default(""),
    status: z.enum(TASK_STATUSES).optional().default("todo"),
    priority: z.enum(TASK_PRIORITIES).optional().default("medium"),
    dueDate: dateOnlySchema.nullable().optional().default(null),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueDate: dateOnlySchema.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    error: "At least one field is required",
  });

export const taskIdSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, { error: "Invalid task id" }),
});

export const taskQuerySchema = z
  .object({
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    search: z
      .string()
      .trim()
      .max(120, { error: "Search must be 120 characters or fewer" })
      .optional(),
    sortBy: z.enum(TASK_SORT_FIELDS).optional().default("createdAt"),
    order: z.enum(SORT_ORDERS).optional().default("desc"),
  })
  .strict();

export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
