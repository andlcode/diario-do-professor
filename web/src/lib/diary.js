// Business rule helpers mirrored on the client for live preview.
// The PocketBase hook is the source of truth on save.

export const PERIOD_LABELS = {
  1: '1º Período',
  2: '2º Período',
  3: '3º Período',
  4: '4º Período',
  5: '5º Período',
  6: '6º Período',
};

// How many periods a class has, based on its periodType.
export function periodCountFor(periodType) {
  switch (periodType) {
    case 'trimestre':
      return 3;
    case 'semestre':
      return 6;
    case 'bimestre':
    default:
      return 2;
  }
}

export function periodsFor(turma) {
  const count = turma?.periodCount || periodCountFor(turma?.periodType);
  return Array.from({ length: count }, (_, i) => i + 1);
}

// legacy: kept for any older imports
export const PERIODS = [1, 2, 3, 4];

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Compute a single "nota" (note1/note2/note3) from its 3 evaluations.
export function computeNote(d, suffix) {
  return num(d[`eval1_note${suffix}`]) + num(d[`eval2_note${suffix}`]) + num(d[`eval3_note${suffix}`]);
}

export function computeTotals(d) {
  // Prefer eval fields; fall back to stored note fields.
  const hasEvals =
    d.eval1_note1 != null || d.eval2_note1 != null || d.eval3_note1 != null ||
    d.eval1_note2 != null || d.eval2_note2 != null || d.eval3_note2 != null ||
    d.eval1_note3 != null || d.eval2_note3 != null || d.eval3_note3 != null;
  let note1;
  let note2;
  let note3;
  if (hasEvals) {
    note1 = computeNote(d, 1);
    note2 = computeNote(d, 2);
    note3 = computeNote(d, 3);
  } else {
    note1 = num(d.note1);
    note2 = num(d.note2);
    note3 = num(d.note3);
  }
  const total = note1 + note2 + note3;
  const rec = num(d.recoveryNote);
  const totalFinal = rec > total ? rec : total;
  return { note1, note2, note3, total, totalFinal };
}

export function computeStatus(d, totalClasses) {
  const { totalFinal } = computeTotals(d);
  const limit = 0.25 * (num(totalClasses) || 200);
  if (num(d.absences) > limit) return 'Reprovado por Falta';
  return totalFinal >= 15 ? 'Aprovado' : 'Reprovado';
}

export function absenceLimit(totalClasses) {
  return Math.floor(0.25 * (num(totalClasses) || 200));
}

export function statusColor(status) {
  switch (status) {
    case 'Aprovado':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Reprovado':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Reprovado por Falta':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}
