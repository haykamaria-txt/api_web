export const activeReservationStatuses = new Set(["pendente", "aprovada"]);

export function minutesFromTime(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

export function overlaps(firstStart, firstEnd, secondStart, secondEnd) {
  return (
    minutesFromTime(firstStart) < minutesFromTime(secondEnd) &&
    minutesFromTime(firstEnd) > minutesFromTime(secondStart)
  );
}

export function hasReservationConflict({ reservations, inicio, termino, ignoreReservationId }) {
  return reservations.some((reservation) => {
    if (Number(reservation.id) === Number(ignoreReservationId)) return false;
    if (!activeReservationStatuses.has(reservation.status)) return false;
    return overlaps(inicio, termino, reservation.inicio, reservation.termino);
  });
}
