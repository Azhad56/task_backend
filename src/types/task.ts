export const TASK_STATUSES = ["todo", "in_progress", "completed"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export const TASK_SORT_FIELDS = ["createdAt", "dueDate"] as const;
export const SORT_ORDERS = ["asc", "desc"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export type TaskDto = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskSummary = {
  total: number;
  todo: number;
  in_progress: number;
  completed: number;
};

export type TaskListResult = {
  tasks: TaskDto[];
  summary: TaskSummary;
};

export type TaskQuery = {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  sortBy: TaskSortField;
  order: SortOrder;
};

export type CreateTaskInput = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
};
