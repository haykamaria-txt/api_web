import { Router } from "express";

export default function sistemaRoutes(controller) {
  const router = Router();
  router.get("/", controller.apiInfo.bind(controller));
  return router;
}
