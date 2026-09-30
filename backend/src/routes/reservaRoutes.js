import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";

export default function reservaRoutes(controller, middleware) {
  const router = Router();
  router.post(
    "/reservas",
    middleware.auth,
    middleware.professorOnly,
    asyncHandler(controller.create.bind(controller)),
  );
  router.get("/reservas", middleware.auth, asyncHandler(controller.list.bind(controller)));
  router.get(
    "/reservas/recomendacao",
    middleware.auth,
    middleware.professorOnly,
    asyncHandler(controller.recommendation.bind(controller)),
  );
  router.get("/reservas/:id", middleware.auth, asyncHandler(controller.findById.bind(controller)));
  router.put("/reservas/:id", middleware.auth, asyncHandler(controller.update.bind(controller)));
  router.delete("/reservas/:id", middleware.auth, asyncHandler(controller.cancel.bind(controller)));
  router.patch(
    "/reservas/:id/aprovar",
    middleware.auth,
    middleware.adminOnly,
    asyncHandler(controller.approve.bind(controller)),
  );
  router.patch(
    "/reservas/:id/rejeitar",
    middleware.auth,
    middleware.adminOnly,
    asyncHandler(controller.reject.bind(controller)),
  );
  router.get("/calendario", middleware.auth, asyncHandler(controller.calendar.bind(controller)));
  router.get(
    "/calendario/laboratorio/:id",
    middleware.auth,
    asyncHandler(controller.calendarByLab.bind(controller)),
  );
  router.get(
    "/calendario/disponiveis",
    middleware.auth,
    asyncHandler(controller.availableLabs.bind(controller)),
  );
  router.get(
    "/calendario/reservados",
    middleware.auth,
    asyncHandler(controller.reserved.bind(controller)),
  );
  return router;
}
