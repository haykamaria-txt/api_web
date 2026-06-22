import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { createStore } from "./store.js";
import { createToken, hashPassword, verifyPassword, verifyToken } from "./security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, "../../atividade");
const activeReservationStatuses = new Set(["pendente", "aprovada"]);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function requireField(value, message) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new HttpError(400, message);
  }
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function minutesFromTime(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

function overlaps(firstStart, firstEnd, secondStart, secondEnd) {
  return minutesFromTime(firstStart) < minutesFromTime(secondEnd)
    && minutesFromTime(firstEnd) > minutesFromTime(secondStart);
}

function todayAtMidnight() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function normalizeDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, "Data invalida.");
  return date.toISOString().slice(0, 10);
}

function ensureMinimumAdvance(dateValue) {
  const reservationDate = new Date(`${dateValue}T00:00:00`);
  const diffDays = Math.floor((reservationDate - todayAtMidnight()) / 86_400_000);
  if (diffDays < 3) {
    throw new HttpError(400, "Reservas devem ser feitas com no mínimo 3 dias de antecedência.");
  }
}

function ensureFutureEditable(dateValue) {
  const reservationDate = new Date(`${dateValue}T00:00:00`);
  if (reservationDate < todayAtMidnight()) {
    throw new HttpError(400, "Reservas passadas não podem ser editadas ou canceladas.");
  }
}

function parseTime(value, fieldName) {
  requireField(value, `${fieldName} é obrigatório.`);
  const normalized = String(value);
  if (!/^\d{2}:\d{2}$/.test(normalized)) throw new HttpError(400, `${fieldName} inválido.`);
  const [hours, minutes] = normalized.split(":").map(Number);
  if (hours > 23 || minutes > 59) throw new HttpError(400, `${fieldName} inválido.`);
  return normalized;
}

function parsePositiveInteger(value, message) {
  requireField(value, message);
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new HttpError(400, message);
  return number;
}

function normalizeRole(value) {
  return value === "admin" ? "admin" : "professor";
}

async function createApp() {
  const store = await createStore(config);
  const app = express();

  app.use(cors());
  app.use(express.json());

  async function auth(req, res, next) {
    try {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
      const payload = verifyToken(token, config.jwtSecret);
      if (!payload?.sub) throw new HttpError(401, "Token inválido ou ausente.");

      const user = await store.getUserById(payload.sub);
      if (!user || user.ativo === false) throw new HttpError(401, "Usuário não encontrado.");
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  }

  async function optionalAuth(req, res, next) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const payload = verifyToken(token, config.jwtSecret);
    if (payload?.sub) req.user = await store.getUserById(payload.sub);
    next();
  }

  function adminOnly(req, res, next) {
    if (req.user?.role !== "admin") throw new HttpError(403, "Apenas administradores podem executar esta ação.");
    next();
  }

  function professorOnly(req, res, next) {
    if (req.user?.role !== "professor") throw new HttpError(403, "Apenas professores podem realizar reservas.");
    next();
  }

  async function enrichReservation(reservation) {
    const [user, lab] = await Promise.all([
      store.getUserById(reservation.userId),
      store.getLabById(reservation.labId),
    ]);

    return {
      ...reservation,
      professor: user ? publicUser(user) : null,
      laboratorio: lab,
    };
  }

  async function enrichProblem(problem) {
    const [user, lab] = await Promise.all([
      store.getUserById(problem.userId),
      store.getLabById(problem.labId),
    ]);

    return {
      ...problem,
      responsavel: user ? publicUser(user) : null,
      laboratorio: lab,
    };
  }

  async function resolveLabId(body) {
    const labId = Number(body.labId || body.laboratorioId);
    if (Number.isInteger(labId) && labId > 0) return labId;

    if (body.laboratorio) {
      const labs = await store.listLabs();
      const lab = labs.find((item) => item.nome === body.laboratorio);
      if (lab) return lab.id;
    }

    throw new HttpError(400, "Laboratório é obrigatório.");
  }

  async function ensureReservationRules({ labId, data, inicio, termino, ignoreReservationId, quantidadeAlunos }) {
    if (minutesFromTime(inicio) >= minutesFromTime(termino)) {
      throw new HttpError(400, "Horário de início deve ser anterior ao término.");
    }

    const lab = await store.getLabById(labId);
    if (!lab || lab.ativo === false) throw new HttpError(404, "Laboratório não encontrado.");
    if (quantidadeAlunos && Number(quantidadeAlunos) > Number(lab.capacidade)) {
      throw new HttpError(400, "A capacidade do laboratório não atende à turma informada.");
    }

    const reservations = await store.listReservations({ labId, data });
    const hasConflict = reservations.some((reservation) => {
      if (Number(reservation.id) === Number(ignoreReservationId)) return false;
      if (!activeReservationStatuses.has(reservation.status)) return false;
      return overlaps(inicio, termino, reservation.inicio, reservation.termino);
    });

    if (hasConflict) throw new HttpError(409, "Já existe reserva para este laboratório no horário informado.");
  }

  async function buildSchedule(data) {
    const [labs, reservations] = await Promise.all([
      store.listLabs(),
      store.listReservations({ data }),
    ]);
    const activeReservations = reservations.filter((reservation) => activeReservationStatuses.has(reservation.status));

    return labs.map((lab) => {
      const slots = [];
      for (let start = 7 * 60; start < 18 * 60; start += 30) {
        const end = start + 30;
        const inicio = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
        const termino = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
        const reservation = activeReservations.find((item) => (
          Number(item.labId) === Number(lab.id) && overlaps(inicio, termino, item.inicio, item.termino)
        ));

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

  async function reservationReport() {
    const [reservations, labs] = await Promise.all([
      store.listReservations(),
      store.listLabs({ includeInactive: true }),
    ]);
    return labs.map((lab) => {
      const labReservations = reservations.filter((reservation) => (
        Number(reservation.labId) === Number(lab.id) && reservation.status !== "cancelada" && reservation.status !== "rejeitada"
      ));
      const totalMinutes = labReservations.reduce(
        (sum, reservation) => sum + (minutesFromTime(reservation.termino) - minutesFromTime(reservation.inicio)),
        0,
      );

      return {
        laboratorio: lab,
        totalReservas: labReservations.length,
        horasUtilizadas: Number((totalMinutes / 60).toFixed(1)),
      };
    });
  }

  app.get("/api", (req, res) => {
    res.json({
      nome: "Sistema de Agendamento e Monitoramento de Laboratórios Acadêmicos",
      endpoints: ["/autenticacao", "/usuarios", "/labs", "/reservas", "/calendario", "/problemas", "/relatorios"],
      storage: "postgresql",
    });
  });

  app.post("/autenticacao/cadastro", optionalAuth, asyncHandler(async (req, res) => {
    const { nome, matricula, senha } = req.body;
    const role = normalizeRole(req.body.role || req.body.perfil);
    requireField(nome, "Nome é obrigatório.");
    requireField(matricula, "Matrícula é obrigatória.");
    requireField(senha, "Senha é obrigatória.");

    if (role === "admin" && req.user?.role !== "admin") {
      throw new HttpError(403, "Apenas administradores podem cadastrar outro administrador.");
    }

    const existingUser = await store.findUserByMatricula(String(matricula));
    if (existingUser) throw new HttpError(409, "Matrícula já cadastrada.");

    const user = await store.createUser({
      nome: String(nome).trim(),
      matricula: String(matricula).trim(),
      curso: String(req.body.curso || "Geral").trim(),
      role,
      passwordHash: await hashPassword(String(senha)),
    });

    res.status(201).json({ usuario: publicUser(user) });
  }));

  app.post("/autenticacao/login", asyncHandler(async (req, res) => {
    const { matricula, senha } = req.body;
    requireField(matricula, "Matrícula é obrigatória.");
    requireField(senha, "Senha é obrigatória.");

    const user = await store.findUserByMatricula(String(matricula).trim());
    if (!user || !(await verifyPassword(String(senha), user.passwordHash))) {
      throw new HttpError(401, "Matrícula ou senha inválidos.");
    }

    const token = createToken({ sub: user.id, role: user.role }, config.jwtSecret);
    res.json({ token, usuario: publicUser(user) });
  }));

  app.get("/autenticacao/perfil", auth, (req, res) => {
    res.json({ usuario: publicUser(req.user) });
  });

  app.put("/autenticacao/perfil", auth, asyncHandler(async (req, res) => {
    const updates = {
      nome: req.body.nome ?? req.user.nome,
      matricula: req.user.matricula,
      curso: req.body.curso ?? req.user.curso,
      role: req.user.role,
      passwordHash: req.body.senha ? await hashPassword(String(req.body.senha)) : req.user.passwordHash,
      ativo: req.user.ativo,
    };
    const user = await store.updateUser(req.user.id, updates);
    res.json({ usuario: publicUser(user) });
  }));

  app.get("/usuarios", auth, adminOnly, asyncHandler(async (req, res) => {
    const users = await store.listUsers();
    res.json({ usuarios: users.map(publicUser) });
  }));

  app.get("/usuarios/:id", auth, asyncHandler(async (req, res) => {
    if (req.user.role !== "admin" && Number(req.user.id) !== Number(req.params.id)) {
      throw new HttpError(403, "Usuário sem permissão para acessar este cadastro.");
    }
    const user = await store.getUserById(req.params.id);
    if (!user) throw new HttpError(404, "Usuário não encontrado.");
    res.json({ usuario: publicUser(user) });
  }));

  app.put("/usuarios/:id", auth, asyncHandler(async (req, res) => {
    if (req.user.role !== "admin" && Number(req.user.id) !== Number(req.params.id)) {
      throw new HttpError(403, "Usuário sem permissão para atualizar este cadastro.");
    }
    const current = await store.getUserById(req.params.id);
    if (!current) throw new HttpError(404, "Usuário não encontrado.");

    const user = await store.updateUser(req.params.id, {
      nome: req.body.nome ?? current.nome,
      matricula: req.user.role === "admin" ? (req.body.matricula ?? current.matricula) : current.matricula,
      curso: req.body.curso ?? current.curso,
      role: req.user.role === "admin" ? normalizeRole(req.body.role || req.body.perfil || current.role) : current.role,
      passwordHash: req.body.senha ? await hashPassword(String(req.body.senha)) : current.passwordHash,
      ativo: current.ativo,
    });
    res.json({ usuario: publicUser(user) });
  }));

  app.delete("/usuarios/:id", auth, adminOnly, asyncHandler(async (req, res) => {
    const user = await store.deleteUser(req.params.id);
    if (!user) throw new HttpError(404, "Usuário não encontrado.");
    res.status(204).send();
  }));

  app.get("/labs", auth, asyncHandler(async (req, res) => {
    const labs = await store.listLabs();
    const capacidadeMinima = Number(req.query.capacidadeMin || req.query.capacidade || 0);
    res.json({
      laboratorios: labs.filter((lab) => !capacidadeMinima || Number(lab.capacidade) >= capacidadeMinima),
    });
  }));

  app.post("/labs", auth, adminOnly, asyncHandler(async (req, res) => {
    requireField(req.body.nome, "Nome do laboratório é obrigatório.");
    requireField(req.body.tipo, "Tipo do laboratório é obrigatório.");
    requireField(req.body.capacidade, "Capacidade é obrigatória.");

    const lab = await store.createLab({
      nome: String(req.body.nome).trim(),
      tipo: String(req.body.tipo).trim(),
      capacidade: Number(req.body.capacidade),
      localizacao: String(req.body.localizacao || "Não informada").trim(),
      recursos: Array.isArray(req.body.recursos) ? req.body.recursos : [],
    });
    res.status(201).json({ laboratorio: lab });
  }));

  app.get("/labs/:id", auth, asyncHandler(async (req, res) => {
    const lab = await store.getLabById(req.params.id);
    if (!lab || lab.ativo === false) throw new HttpError(404, "Laboratório não encontrado.");
    res.json({ laboratorio: lab });
  }));

  app.put("/labs/:id", auth, adminOnly, asyncHandler(async (req, res) => {
    const current = await store.getLabById(req.params.id);
    if (!current) throw new HttpError(404, "Laboratório não encontrado.");
    const lab = await store.updateLab(req.params.id, {
      nome: req.body.nome ?? current.nome,
      tipo: req.body.tipo ?? current.tipo,
      capacidade: req.body.capacidade ? Number(req.body.capacidade) : current.capacidade,
      localizacao: req.body.localizacao ?? current.localizacao,
      recursos: Array.isArray(req.body.recursos) ? req.body.recursos : current.recursos,
      ativo: current.ativo,
    });
    res.json({ laboratorio: lab });
  }));

  app.delete("/labs/:id", auth, adminOnly, asyncHandler(async (req, res) => {
    const lab = await store.deleteLab(req.params.id);
    if (!lab) throw new HttpError(404, "Laboratório não encontrado.");
    res.status(204).send();
  }));

  app.post("/reservas", auth, professorOnly, asyncHandler(async (req, res) => {
    const data = normalizeDate(req.body.data);
    const inicio = parseTime(req.body.inicio, "Horário de início");
    const termino = parseTime(req.body.termino, "Horário de término");
    const labId = await resolveLabId(req.body);
    const quantidadeAlunos = parsePositiveInteger(req.body.quantidadeAlunos, "Quantidade de alunos invalida.");

    ensureMinimumAdvance(data);
    await ensureReservationRules({ labId, data, inicio, termino, quantidadeAlunos });

    const reservation = await store.createReservation({
      userId: req.user.id,
      labId,
      data,
      inicio,
      termino,
      quantidadeAlunos,
      status: "pendente",
      observacao: req.body.observacao || "",
    });
    res.status(201).json({ reserva: await enrichReservation(reservation) });
  }));

  app.get("/reservas", auth, asyncHandler(async (req, res) => {
    const filters = {
      userId: req.user.role === "admin" ? req.query.userId : req.user.id,
      labId: req.query.labId || req.query.laboratorioId,
      data: req.query.data,
      status: req.query.status,
    };
    const reservations = await store.listReservations(filters);
    res.json({ reservas: await Promise.all(reservations.map(enrichReservation)) });
  }));

  app.get("/reservas/recomendacao", auth, professorOnly, asyncHandler(async (req, res) => {
    const labs = await store.listLabs();
    const userReservations = await store.listReservations({ userId: req.user.id });
    const favoriteLabId = userReservations[0]?.labId || labs[0]?.id;
    const date = new Date();
    date.setDate(date.getDate() + 3);
    const data = date.toISOString().slice(0, 10);

    res.json({
      recomendacao: {
        data,
        inicio: "08:00",
        termino: "10:00",
        laboratorio: labs.find((lab) => Number(lab.id) === Number(favoriteLabId)) || labs[0],
      },
    });
  }));

  app.get("/reservas/:id", auth, asyncHandler(async (req, res) => {
    const reservation = await store.getReservationById(req.params.id);
    if (!reservation) throw new HttpError(404, "Reserva não encontrada.");
    if (req.user.role !== "admin" && Number(reservation.userId) !== Number(req.user.id)) {
      throw new HttpError(403, "Usuários só podem consultar suas próprias reservas.");
    }
    res.json({ reserva: await enrichReservation(reservation) });
  }));

  app.put("/reservas/:id", auth, asyncHandler(async (req, res) => {
    const current = await store.getReservationById(req.params.id);
    if (!current) throw new HttpError(404, "Reserva não encontrada.");
    if (req.user.role !== "admin" && Number(current.userId) !== Number(req.user.id)) {
      throw new HttpError(403, "Usuários só podem editar suas próprias reservas.");
    }

    const next = {
      userId: current.userId,
      labId: req.body.labId || req.body.laboratorioId || current.labId,
      data: req.body.data ? normalizeDate(req.body.data) : current.data,
      inicio: req.body.inicio ? parseTime(req.body.inicio, "Horário de início") : current.inicio,
      termino: req.body.termino ? parseTime(req.body.termino, "Horário de término") : current.termino,
      quantidadeAlunos: req.body.quantidadeAlunos !== undefined
        ? parsePositiveInteger(req.body.quantidadeAlunos, "Quantidade de alunos invalida.")
        : current.quantidadeAlunos,
      status: req.user.role === "admin" ? (req.body.status || current.status) : current.status,
      observacao: req.body.observacao ?? current.observacao,
    };

    ensureFutureEditable(current.data);
    if (req.user.role === "professor") ensureMinimumAdvance(next.data);
    await ensureReservationRules({ ...next, ignoreReservationId: current.id });

    const reservation = await store.updateReservation(req.params.id, next);
    res.json({ reserva: await enrichReservation(reservation) });
  }));

  app.delete("/reservas/:id", auth, asyncHandler(async (req, res) => {
    const current = await store.getReservationById(req.params.id);
    if (!current) throw new HttpError(404, "Reserva não encontrada.");
    if (req.user.role !== "admin" && Number(current.userId) !== Number(req.user.id)) {
      throw new HttpError(403, "Usuários só podem cancelar suas próprias reservas.");
    }
    ensureFutureEditable(current.data);
    await store.updateReservation(req.params.id, { status: "cancelada" });
    res.status(204).send();
  }));

  app.patch("/reservas/:id/aprovar", auth, adminOnly, asyncHandler(async (req, res) => {
    const current = await store.getReservationById(req.params.id);
    if (!current) throw new HttpError(404, "Reserva não encontrada.");
    await ensureReservationRules({ ...current, ignoreReservationId: current.id });
    const reservation = await store.updateReservation(req.params.id, { status: "aprovada" });
    res.json({ reserva: await enrichReservation(reservation) });
  }));

  app.patch("/reservas/:id/rejeitar", auth, adminOnly, asyncHandler(async (req, res) => {
    const reservation = await store.updateReservation(req.params.id, { status: "rejeitada" });
    if (!reservation) throw new HttpError(404, "Reserva não encontrada.");
    res.json({ reserva: await enrichReservation(reservation) });
  }));

  app.get("/calendario", auth, asyncHandler(async (req, res) => {
    const data = req.query.data ? normalizeDate(req.query.data) : new Date().toISOString().slice(0, 10);
    const reservations = await store.listReservations({ data });
    res.json({
      data,
      reservas: await Promise.all(reservations.map(enrichReservation)),
      laboratorios: await buildSchedule(data),
    });
  }));

  app.get("/calendario/laboratorio/:id", auth, asyncHandler(async (req, res) => {
    const data = req.query.data ? normalizeDate(req.query.data) : new Date().toISOString().slice(0, 10);
    const schedule = await buildSchedule(data);
    const labSchedule = schedule.find((item) => Number(item.laboratorio.id) === Number(req.params.id));
    if (!labSchedule) throw new HttpError(404, "Laboratório não encontrado.");
    res.json({ data, ...labSchedule });
  }));

  app.get("/calendario/disponiveis", auth, asyncHandler(async (req, res) => {
    const labs = await store.listLabs();
    if (!req.query.data || !req.query.inicio || !req.query.termino) {
      res.json({ laboratorios: labs });
      return;
    }

    const data = normalizeDate(req.query.data);
    const inicio = parseTime(req.query.inicio, "Horário de início");
    const termino = parseTime(req.query.termino, "Horário de término");
    const reservations = await store.listReservations({ data });
    const availableLabs = labs.filter((lab) => !reservations.some((reservation) => (
      Number(reservation.labId) === Number(lab.id)
        && activeReservationStatuses.has(reservation.status)
        && overlaps(inicio, termino, reservation.inicio, reservation.termino)
    )));
    res.json({ laboratorios: availableLabs });
  }));

  app.get("/calendario/reservados", auth, asyncHandler(async (req, res) => {
    const data = req.query.data ? normalizeDate(req.query.data) : undefined;
    const reservations = (await store.listReservations({ data })).filter((reservation) => activeReservationStatuses.has(reservation.status));
    res.json({ reservas: await Promise.all(reservations.map(enrichReservation)) });
  }));

  app.post("/problemas", auth, asyncHandler(async (req, res) => {
    const labId = await resolveLabId(req.body);
    requireField(req.body.tipo, "Tipo de problema é obrigatório.");
    requireField(req.body.descricao, "Descrição é obrigatória.");
    const problem = await store.createProblem({
      labId,
      userId: req.user.id,
      tipo: String(req.body.tipo).trim(),
      descricao: String(req.body.descricao).trim(),
      status: "aberto",
    });
    res.status(201).json({ problema: await enrichProblem(problem) });
  }));

  app.get("/problemas", auth, asyncHandler(async (req, res) => {
    const problems = await store.listProblems({
      userId: req.user.role === "admin" ? req.query.userId : req.user.id,
      labId: req.query.labId || req.query.laboratorioId,
      status: req.query.status,
    });
    res.json({ problemas: await Promise.all(problems.map(enrichProblem)) });
  }));

  app.get("/problemas/:id", auth, asyncHandler(async (req, res) => {
    const problem = await store.getProblemById(req.params.id);
    if (!problem) throw new HttpError(404, "Problema não encontrado.");
    if (req.user.role !== "admin" && Number(problem.userId) !== Number(req.user.id)) {
      throw new HttpError(403, "Usuário sem permissão para acessar este problema.");
    }
    res.json({ problema: await enrichProblem(problem) });
  }));

  app.put("/problemas/:id", auth, asyncHandler(async (req, res) => {
    const current = await store.getProblemById(req.params.id);
    if (!current) throw new HttpError(404, "Problema não encontrado.");
    if (req.user.role !== "admin" && Number(current.userId) !== Number(req.user.id)) {
      throw new HttpError(403, "Usuário sem permissão para atualizar este problema.");
    }
    const problem = await store.updateProblem(req.params.id, {
      labId: req.body.labId || req.body.laboratorioId || current.labId,
      userId: current.userId,
      tipo: req.body.tipo || current.tipo,
      descricao: req.body.descricao || current.descricao,
      status: req.user.role === "admin" ? (req.body.status || current.status) : current.status,
    });
    res.json({ problema: await enrichProblem(problem) });
  }));

  app.delete("/problemas/:id", auth, adminOnly, asyncHandler(async (req, res) => {
    const deleted = await store.deleteProblem(req.params.id);
    if (!deleted) throw new HttpError(404, "Problema não encontrado.");
    res.status(204).send();
  }));

  app.get("/relatorios/utilizacao", auth, adminOnly, asyncHandler(async (req, res) => {
    res.json({ utilizacao: await reservationReport() });
  }));

  app.get("/relatorios/historico", auth, adminOnly, asyncHandler(async (req, res) => {
    const reservations = await store.listReservations();
    res.json({ historico: await Promise.all(reservations.map(enrichReservation)) });
  }));

  app.get("/relatorios/labs-mais-utilizados", auth, adminOnly, asyncHandler(async (req, res) => {
    const report = await reservationReport();
    res.json({ laboratorios: report.sort((a, b) => b.totalReservas - a.totalReservas) });
  }));

  app.get("/relatorios/problemas", auth, adminOnly, asyncHandler(async (req, res) => {
    const problems = await store.listProblems();
    const byStatus = problems.reduce((acc, problem) => {
      acc[problem.status] = (acc[problem.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ total: problems.length, porStatus: byStatus, problemas: await Promise.all(problems.map(enrichProblem)) });
  }));

  app.get("/dashboard/resumo", auth, asyncHandler(async (req, res) => {
    const [users, reservations, problems, inventory] = await Promise.all([
      store.listUsers(),
      store.listReservations(req.user.role === "admin" ? {} : { userId: req.user.id }),
      store.listProblems(req.user.role === "admin" ? {} : { userId: req.user.id }),
      store.listInventory(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const weekLimit = new Date();
    weekLimit.setDate(weekLimit.getDate() + 7);
    const weekLimitText = weekLimit.toISOString().slice(0, 10);

    res.json({
      professores: users.filter((user) => user.role === "professor").length,
      agendamentosHoje: reservations.filter((reservation) => reservation.data === today && activeReservationStatuses.has(reservation.status)).length,
      reclamacoesAbertas: problems.filter((problem) => problem.status !== "resolvido").length,
      agendamentosSemana: reservations.filter((reservation) => (
        reservation.data >= today && reservation.data <= weekLimitText && activeReservationStatuses.has(reservation.status)
      )).length,
      itensIndisponiveis: inventory.reduce((sum, item) => sum + Number(item.indisponivel || 0), 0),
    });
  }));

  app.get("/inventario", auth, asyncHandler(async (req, res) => {
    const [items, labs] = await Promise.all([store.listInventory(req.query), store.listLabs({ includeInactive: true })]);
    res.json({
      inventario: items.map((item) => ({
        ...item,
        laboratorio: labs.find((lab) => Number(lab.id) === Number(item.labId)) || null,
      })),
    });
  }));

  app.post("/acessos/checkin", auth, asyncHandler(async (req, res) => {
    const labId = await resolveLabId(req.body);
    const access = await store.createAccess({ labId, userId: req.user.id, tipo: "checkin" });
    res.status(201).json({ acesso: access });
  }));

  app.post("/acessos/checkout", auth, asyncHandler(async (req, res) => {
    const labId = await resolveLabId(req.body);
    const access = await store.createAccess({ labId, userId: req.user.id, tipo: "checkout" });
    res.status(201).json({ acesso: access });
  }));

  app.use(express.static(frontendPath));

  app.use((req, res) => {
    res.status(404).json({ erro: "Rota não encontrada." });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const status = error.status || 500;
    res.status(status).json({
      erro: status === 500 ? "Erro interno do servidor." : error.message,
      detalhe: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  });

  return app;
}

const app = await createApp();

app.listen(config.port, () => {
  console.log(`Servidor rodando em http://localhost:${config.port}`);
});
