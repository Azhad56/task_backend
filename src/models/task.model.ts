import mongoose, { type InferSchemaType } from "mongoose";
import { TASK_PRIORITIES, TASK_STATUSES } from "../types/task.js";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "todo",
      required: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "medium",
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

export type TaskDocument = InferSchemaType<typeof taskSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Task = mongoose.model("Task", taskSchema);
