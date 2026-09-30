import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";

export default function laboratorioRoutes(controller, middleware) {
  const router = Router();
  router.get("/", middleware.auth, asyncHandler(controller.list.bind(controller)));
  router.post(
    "/",
    middleware.auth,
    middleware.adminOnly,
    asyncHandler(controller.create.bind(controller)),
  );
  router.get("/:id", middleware.auth, asyncHandler(controller.findById.bind(controller)));
  router.put(
    "/:id",
    middleware.auth,
    middleware.adminOnly,
    asyncHandler(controller.update.bind(controller)),
  );
  router.delete(
    "/:id",
    middleware.auth,
    middleware.adminOnly,
    asyncHandler(controller.delete.bind(controller)),
  );
  return router;
}
