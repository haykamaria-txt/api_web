import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";

export default function relatorioRoutes(reservaController, problemaController, middleware) {
  const router = Router();
  router.get(
    "/utilizacao",
    middleware.auth,
    middleware.adminOnly,
    asyncHandler(reservaController.utilizationReport.bind(reservaController)),
  );
  router.get(
    "/historico",
    middleware.auth,
    middleware.adminOnly,
    asyncHandler(reservaController.history.bind(reservaController)),
  );
  router.get(
    "/labs-mais-utilizados",
    middleware.auth,
    middleware.adminOnly,
    asyncHandler(reservaController.mostUsedLabs.bind(reservaController)),
  );
  router.get(
    "/problemas",
    middleware.auth,
    middleware.adminOnly,
    asyncHandler(problemaController.report.bind(problemaController)),
  );
  return router;
}
