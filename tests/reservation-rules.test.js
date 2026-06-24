import { describe, expect, it } from "vitest";
import {
  hasReservationConflict,
  minutesFromTime,
  overlaps,
} from "../backend/src/reservation-rules.js";

describe("regras auxiliares de reserva", () => {
  it("converte horário para minutos", () => {
    expect(minutesFromTime("07:30")).toBe(450);
    expect(minutesFromTime("18:00")).toBe(1080);
  });

  it("detecta sobreposição entre intervalos", () => {
    expect(overlaps("08:00", "10:00", "09:00", "11:00")).toBe(true);
    expect(overlaps("08:00", "10:00", "07:00", "09:00")).toBe(true);
  });

  it("permite intervalos apenas encostados", () => {
    expect(overlaps("08:00", "10:00", "10:00", "12:00")).toBe(false);
    expect(overlaps("10:00", "12:00", "08:00", "10:00")).toBe(false);
  });

  it("considera conflito apenas com reservas ativas", () => {
    const reservations = [
      { id: 1, inicio: "08:00", termino: "10:00", status: "cancelada" },
      { id: 2, inicio: "10:00", termino: "12:00", status: "rejeitada" },
      { id: 3, inicio: "13:00", termino: "15:00", status: "aprovada" },
    ];

    expect(
      hasReservationConflict({
        reservations,
        inicio: "09:00",
        termino: "11:00",
      }),
    ).toBe(false);
    expect(
      hasReservationConflict({
        reservations,
        inicio: "14:00",
        termino: "16:00",
      }),
    ).toBe(true);
  });

  it("ignora a própria reserva durante uma edição", () => {
    const reservations = [{ id: 7, inicio: "08:00", termino: "10:00", status: "pendente" }];

    expect(
      hasReservationConflict({
        reservations,
        inicio: "08:30",
        termino: "09:30",
        ignoreReservationId: 7,
      }),
    ).toBe(false);
  });
});
