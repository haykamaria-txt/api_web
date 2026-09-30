import ServiceError from "./ServiceError.js";

export default class PermissaoService {
  requireAdmin(user) {
    if (user?.role !== "admin") {
      throw new ServiceError(403, "Apenas administradores podem executar esta ação.");
    }
  }

  requireProfessor(user) {
    if (user?.role !== "professor") {
      throw new ServiceError(403, "Apenas professores podem realizar reservas.");
    }
  }
}
