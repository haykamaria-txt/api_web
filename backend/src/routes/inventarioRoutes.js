import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";

export default function inventarioRoutes(controller, middleware) {
  const router = Router();
  router.get("/", middleware.auth, asyncHandler(controller.list.bind(controller)));
  return router;
}
