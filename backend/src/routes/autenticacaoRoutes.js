import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";

export default function autenticacaoRoutes(controller, middleware) {
  const router = Router();
  router.post(
    "/cadastro",
    middleware.optionalAuth,
    asyncHandler(controller.register.bind(controller)),
  );
  router.post("/login", asyncHandler(controller.login.bind(controller)));
  router.get("/perfil", middleware.auth, controller.getProfile.bind(controller));
  router.put("/perfil", middleware.auth, asyncHandler(controller.updateProfile.bind(controller)));
  return router;
}
