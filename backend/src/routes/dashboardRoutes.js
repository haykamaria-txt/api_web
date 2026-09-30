import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";

export default function dashboardRoutes(controller, middleware) {
  const router = Router();
  router.get("/resumo", middleware.auth, asyncHandler(controller.summary.bind(controller)));
  return router;
}
