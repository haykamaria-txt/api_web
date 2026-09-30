import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";

export default function usuarioRoutes(controller, middleware) {
  const router = Router();
  router.get(
    "/",
    middleware.auth,
    middleware.adminOnly,
    asyncHandler(controller.list.bind(controller)),
  );
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
