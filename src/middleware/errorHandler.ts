import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/appError.js";

type ErrorBody = {
  success: false;
  error: {
    message: string;
    details?: { path: string; message: string }[];
  };
};

function sendError(res: Response, statusCode: number, message: string, details?: ErrorBody["error"]["details"]): void {
  const body: ErrorBody = {
    success: false,
    error: details ? { message, details } : { message },
  };
  res.status(statusCode).json(body);
}

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, "Not found");
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    return;
  }

  if (error instanceof ZodError) {
    sendError(
      res,
      400,
      "Invalid request",
      error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join(".") : "request",
        message: issue.message,
      })),
    );
    return;
  }

  if (error instanceof AppError) {
    sendError(
      res,
      error.statusCode,
      error.message,
      Array.isArray(error.details) ? (error.details as { path: string; message: string }[]) : undefined,
    );
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    sendError(res, 400, "Invalid JSON");
    return;
  }

  console.error("Unhandled server error");
  sendError(res, 500, "Unexpected server error");
}
