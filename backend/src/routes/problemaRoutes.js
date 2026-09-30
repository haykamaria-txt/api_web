import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";

export default function problemaRoutes(controller, middleware) {
  const router = Router();
  router.post("/", middleware.auth, asyncHandler(controller.create.bind(controller)));
  router.get("/", middleware.auth, asyncHandler(controller.list.bind(controller)));
  router.get("/:id", middleware.auth, asyncHandler(controller.findById.bind(controller)));
  router.put("/:id", middleware.auth, asyncHandler(controller.update.bind(controller)));
  router.delete(
    "/:id",
    middleware.auth,
    middleware.adminOnly,
    asyncHandler(controller.delete.bind(controller)),
  );
  return router;
}
