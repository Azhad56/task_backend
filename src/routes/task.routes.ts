import { Router } from "express";
import { getTask, getTasks, patchTask, postTask, removeTask } from "../controllers/task.controller.js";
import { asyncRoute } from "../middleware/asyncRoute.js";

export const taskRouter = Router();

taskRouter.get("/", asyncRoute(getTasks));
taskRouter.post("/", asyncRoute(postTask));
taskRouter.get("/:id", asyncRoute(getTask));
taskRouter.patch("/:id", asyncRoute(patchTask));
taskRouter.delete("/:id", asyncRoute(removeTask));
