import asyncHandler from "./asyncHandler.js";
import ServiceError from "../services/ServiceError.js";
import { verifyToken } from "../security.js";

export function createAuthMiddleware(services, jwtSecret) {
  const auth = asyncHandler(async (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const payload = verifyToken(token, jwtSecret);
    if (!payload?.sub) throw new ServiceError(401, "Token inválido ou ausente.");
    const user = await services.usuarios.getById(payload.sub);
    if (!user || user.ativo === false) throw new ServiceError(401, "Usuário não encontrado.");
    req.user = user;
    next();
  });

  const optionalAuth = asyncHandler(async (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const payload = verifyToken(token, jwtSecret);
    if (payload?.sub) req.user = await services.usuarios.getById(payload.sub);
    next();
  });

  const adminOnly = (req, res, next) => {
    try {
      services.permissoes.requireAdmin(req.user);
      next();
    } catch (error) {
      next(error);
    }
  };

  const professorOnly = (req, res, next) => {
    try {
      services.permissoes.requireProfessor(req.user);
      next();
    } catch (error) {
      next(error);
    }
  };

  return { adminOnly, auth, optionalAuth, professorOnly };
}
