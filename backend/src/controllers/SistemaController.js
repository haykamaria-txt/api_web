export default class SistemaController {
  apiInfo(req, res) {
    res.json({
      nome: "Sistema de Agendamento e Monitoramento de Laboratórios Acadêmicos",
      endpoints: [
        "/autenticacao",
        "/usuarios",
        "/labs",
        "/reservas",
        "/calendario",
        "/problemas",
        "/relatorios",
      ],
      storage: "postgresql",
    });
  }
}
