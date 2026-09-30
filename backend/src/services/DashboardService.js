import { activeReservationStatuses } from "../reservation-rules.js";

export default class DashboardService {
  constructor(usuarioRepository, reservaRepository, problemaRepository, inventarioRepository) {
    this.usuarios = usuarioRepository;
    this.reservas = reservaRepository;
    this.problemas = problemaRepository;
    this.inventario = inventarioRepository;
  }

  async summary(requester) {
    const [users, reservations, problems, inventory] = await Promise.all([
      this.usuarios.findAll(),
      this.reservas.findAll(requester.role === "admin" ? {} : { userId: requester.id }),
      this.problemas.findAll(requester.role === "admin" ? {} : { userId: requester.id }),
      this.inventario.findAll(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const weekLimit = new Date();
    weekLimit.setDate(weekLimit.getDate() + 7);
    const weekLimitText = weekLimit.toISOString().slice(0, 10);

    return {
      professores: users.filter((user) => user.role === "professor").length,
      agendamentosHoje: reservations.filter(
        (reservation) =>
          reservation.data === today && activeReservationStatuses.has(reservation.status),
      ).length,
      reclamacoesAbertas: problems.filter((problem) => problem.status !== "resolvido").length,
      agendamentosSemana: reservations.filter(
        (reservation) =>
          reservation.data >= today &&
          reservation.data <= weekLimitText &&
          activeReservationStatuses.has(reservation.status),
      ).length,
      itensIndisponiveis: inventory.reduce((sum, item) => sum + Number(item.indisponivel || 0), 0),
    };
  }
}
