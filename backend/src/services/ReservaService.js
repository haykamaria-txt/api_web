import {
  activeReservationStatuses,
  hasReservationConflict,
  minutesFromTime,
  overlaps,
} from "../reservation-rules.js";
import ServiceError from "./ServiceError.js";
import { publicUser } from "./UsuarioService.js";

const reservationStatuses = ["pendente", "aprovada", "rejeitada", "cancelada"];

function requireField(value, message) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new ServiceError(400, message);
  }
}

function todayAtMidnight() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function normalizeDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new ServiceError(400, "Data invalida.");
  return date.toISOString().slice(0, 10);
}

function ensureMinimumAdvance(dateValue) {
  const reservationDate = new Date(`${dateValue}T00:00:00`);
  const diffDays = Math.floor((reservationDate - todayAtMidnight()) / 86_400_000);
  if (diffDays < 3) {
    throw new ServiceError(400, "Reservas devem ser feitas com no mínimo 3 dias de antecedência.");
  }
}

function ensureFutureEditable(dateValue) {
  const reservationDate = new Date(`${dateValue}T00:00:00`);
  if (reservationDate < todayAtMidnight()) {
    throw new ServiceError(400, "Reservas passadas não podem ser editadas ou canceladas.");
  }
}

function parseTime(value, fieldName) {
  requireField(value, `${fieldName} é obrigatório.`);
  const normalized = String(value);
  if (!/^\d{2}:\d{2}$/.test(normalized)) throw new ServiceError(400, `${fieldName} inválido.`);
  const [hours, minutes] = normalized.split(":").map(Number);
  if (hours > 23 || minutes > 59) throw new ServiceError(400, `${fieldName} inválido.`);
  return normalized;
}

function parsePositiveInteger(value, message) {
  requireField(value, message);
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new ServiceError(400, message);
  return number;
}

function formatTime(totalMinutes) {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

export default class ReservaService {
  constructor(reservaRepository, laboratorioRepository, usuarioRepository) {
    this.reservas = reservaRepository;
    this.laboratorios = laboratorioRepository;
    this.usuarios = usuarioRepository;
  }

  async enrich(reservation) {
    const [user, lab] = await Promise.all([
      this.usuarios.findById(reservation.userId),
      this.laboratorios.findById(reservation.labId),
    ]);
    return { ...reservation, professor: publicUser(user), laboratorio: lab };
  }

  async ensureRules({ labId, data, inicio, termino, ignoreReservationId, quantidadeAlunos }) {
    if (minutesFromTime(inicio) >= minutesFromTime(termino)) {
      throw new ServiceError(400, "Horário de início deve ser anterior ao término.");
    }
    const lab = await this.laboratorios.findById(labId);
    if (!lab || lab.ativo === false) throw new ServiceError(404, "Laboratório não encontrado.");
    if (quantidadeAlunos && Number(quantidadeAlunos) > Number(lab.capacidade)) {
      throw new ServiceError(400, "A capacidade do laboratório não atende à turma informada.");
    }
    const reservations = await this.reservas.findAll({ labId, data });
    if (hasReservationConflict({ reservations, inicio, termino, ignoreReservationId })) {
      throw new ServiceError(409, "Já existe reserva para este laboratório no horário informado.");
    }
  }

  async create(body, requester) {
    const data = normalizeDate(body.data);
    const inicio = parseTime(body.inicio, "Horário de início");
    const termino = parseTime(body.termino, "Horário de término");
    const labId = await this.resolveLabId(body);
    const quantidadeAlunos = parsePositiveInteger(
      body.quantidadeAlunos,
      "Quantidade de alunos invalida.",
    );
    ensureMinimumAdvance(data);
    await this.ensureRules({ labId, data, inicio, termino, quantidadeAlunos });
    const reservation = await this.reservas.create({
      userId: requester.id,
      labId,
      data,
      inicio,
      termino,
      quantidadeAlunos,
      status: "pendente",
      observacao: body.observacao || "",
    });
    return this.enrich(reservation);
  }

  async list(filters, requester) {
    const reservations = await this.reservas.findAll({
      ...filters,
      userId: requester.role === "admin" ? filters.userId : requester.id,
    });
    return Promise.all(reservations.map((reservation) => this.enrich(reservation)));
  }

  async findById(id, requester) {
    const reservation = await this.reservas.findById(id);
    if (!reservation) throw new ServiceError(404, "Reserva não encontrada.");
    if (requester.role !== "admin" && Number(reservation.userId) !== Number(requester.id)) {
      throw new ServiceError(403, "Usuários só podem consultar suas próprias reservas.");
    }
    return this.enrich(reservation);
  }

  async update(id, body, requester) {
    const current = await this.reservas.findById(id);
    if (!current) throw new ServiceError(404, "Reserva não encontrada.");
    if (requester.role !== "admin" && Number(current.userId) !== Number(requester.id)) {
      throw new ServiceError(403, "Usuários só podem editar suas próprias reservas.");
    }

    const next = {
      userId: current.userId,
      labId: body.labId || body.laboratorioId || current.labId,
      data: body.data ? normalizeDate(body.data) : current.data,
      inicio: body.inicio ? parseTime(body.inicio, "Horário de início") : current.inicio,
      termino: body.termino ? parseTime(body.termino, "Horário de término") : current.termino,
      quantidadeAlunos:
        body.quantidadeAlunos !== undefined
          ? parsePositiveInteger(body.quantidadeAlunos, "Quantidade de alunos invalida.")
          : current.quantidadeAlunos,
      status: requester.role === "admin" ? body.status || current.status : current.status,
      observacao: body.observacao ?? current.observacao,
    };

    if (!reservationStatuses.includes(next.status)) {
      throw new ServiceError(400, "Status de reserva inválido.");
    }
    ensureFutureEditable(current.data);
    if (requester.role === "professor") ensureMinimumAdvance(next.data);
    await this.ensureRules({ ...next, ignoreReservationId: current.id });
    const updated = await this.reservas.update(id, next);
    if (!updated) throw new ServiceError(404, "Reserva não encontrada.");
    return this.enrich(updated);
  }

  async cancel(id, requester) {
    const current = await this.reservas.findById(id);
    if (!current) throw new ServiceError(404, "Reserva não encontrada.");
    if (requester.role !== "admin" && Number(current.userId) !== Number(requester.id)) {
      throw new ServiceError(403, "Usuários só podem cancelar suas próprias reservas.");
    }
    ensureFutureEditable(current.data);
    await this.reservas.update(id, { status: "cancelada" });
  }

  async approve(id) {
    const current = await this.reservas.findById(id);
    if (!current) throw new ServiceError(404, "Reserva não encontrada.");
    await this.ensureRules({ ...current, ignoreReservationId: current.id });
    const updated = await this.reservas.update(id, { status: "aprovada" });
    return this.enrich(updated);
  }

  async reject(id) {
    const updated = await this.reservas.update(id, { status: "rejeitada" });
    if (!updated) throw new ServiceError(404, "Reserva não encontrada.");
    return this.enrich(updated);
  }

  async resolveLabId(body) {
    const labId = Number(body.labId || body.laboratorioId);
    if (Number.isInteger(labId) && labId > 0) return labId;
    if (body.laboratorio) {
      const labs = await this.laboratorios.findAll();
      const lab = labs.find((item) => item.nome === body.laboratorio);
      if (lab) return lab.id;
    }
    throw new ServiceError(400, "Laboratório é obrigatório.");
  }

  async buildSchedule(data) {
    const [labs, reservations] = await Promise.all([
      this.laboratorios.findAll(),
      this.reservas.findAll({ data }),
    ]);
    const active = reservations.filter((reservation) =>
      activeReservationStatuses.has(reservation.status),
    );
    return labs.map((lab) => {
      const slots = [];
      for (let start = 7 * 60; start < 18 * 60; start += 30) {
        const inicio = formatTime(start);
        const termino = formatTime(start + 30);
        const reservation = active.find(
          (item) =>
            Number(item.labId) === Number(lab.id) &&
            overlaps(inicio, termino, item.inicio, item.termino),
        );
        slots.push({
          inicio,
          termino,
          status: reservation ? "ocupado" : "livre",
          reservaId: reservation?.id || null,
        });
      }
      return { laboratorio: lab, slots };
    });
  }

  async calendar(dataValue) {
    const data = dataValue ? normalizeDate(dataValue) : new Date().toISOString().slice(0, 10);
    const [reservations, labs] = await Promise.all([
      this.reservas.findAll({ data }),
      this.buildSchedule(data),
    ]);
    return {
      data,
      reservas: await Promise.all(reservations.map((reservation) => this.enrich(reservation))),
      laboratorios: labs,
    };
  }

  async calendarByLab(dataValue, labId) {
    const data = dataValue ? normalizeDate(dataValue) : new Date().toISOString().slice(0, 10);
    const schedule = await this.buildSchedule(data);
    const labSchedule = schedule.find((item) => Number(item.laboratorio.id) === Number(labId));
    if (!labSchedule) throw new ServiceError(404, "Laboratório não encontrado.");
    return { data, ...labSchedule };
  }

  async availableLabs(query) {
    const labs = await this.laboratorios.findAll();
    if (!query.data || !query.inicio || !query.termino) return labs;
    const data = normalizeDate(query.data);
    const inicio = parseTime(query.inicio, "Horário de início");
    const termino = parseTime(query.termino, "Horário de término");
    if (minutesFromTime(inicio) >= minutesFromTime(termino)) {
      throw new ServiceError(400, "Horário de início deve ser anterior ao término.");
    }
    const reservations = await this.reservas.findAll({ data });
    return labs.filter(
      (lab) =>
        !reservations.some(
          (reservation) =>
            Number(reservation.labId) === Number(lab.id) &&
            activeReservationStatuses.has(reservation.status) &&
            overlaps(inicio, termino, reservation.inicio, reservation.termino),
        ),
    );
  }

  async reserved(dataValue) {
    const data = dataValue ? normalizeDate(dataValue) : undefined;
    const reservations = (await this.reservas.findAll({ data })).filter((reservation) =>
      activeReservationStatuses.has(reservation.status),
    );
    return Promise.all(reservations.map((reservation) => this.enrich(reservation)));
  }

  async recommendation(user) {
    const labs = await this.laboratorios.findAll();
    const userReservations = await this.reservas.findAll({ userId: user.id });
    const favoriteLabId = userReservations[0]?.labId || labs[0]?.id;
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return {
      data: date.toISOString().slice(0, 10),
      inicio: "08:00",
      termino: "10:00",
      laboratorio: labs.find((lab) => Number(lab.id) === Number(favoriteLabId)) || labs[0],
    };
  }

  async utilizationReport() {
    const [reservations, labs] = await Promise.all([
      this.reservas.findAll(),
      this.laboratorios.findAll({ includeInactive: true }),
    ]);
    return labs.map((lab) => {
      const labReservations = reservations.filter(
        (reservation) =>
          Number(reservation.labId) === Number(lab.id) &&
          reservation.status !== "cancelada" &&
          reservation.status !== "rejeitada",
      );
      const totalMinutes = labReservations.reduce(
        (sum, reservation) =>
          sum + minutesFromTime(reservation.termino) - minutesFromTime(reservation.inicio),
        0,
      );
      return {
        laboratorio: lab,
        totalReservas: labReservations.length,
        horasUtilizadas: Number((totalMinutes / 60).toFixed(1)),
      };
    });
  }

  async mostUsedLabs() {
    return (await this.utilizationReport()).sort(
      (left, right) => right.totalReservas - left.totalReservas,
    );
  }

  async history() {
    return Promise.all(
      (await this.reservas.findAll()).map((reservation) => this.enrich(reservation)),
    );
  }
}
