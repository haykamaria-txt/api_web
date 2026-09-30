import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";

export default function acessoRoutes(controller, middleware) {
  const router = Router();
  router.post("/checkin", middleware.auth, asyncHandler(controller.checkin.bind(controller)));
  router.post("/checkout", middleware.auth, asyncHandler(controller.checkout.bind(controller)));
  return router;
}
