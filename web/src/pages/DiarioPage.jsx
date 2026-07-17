import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { cn } from '@/lib/utils';
import { num, statusColor, periodsFor } from '@/lib/diary';

const PERIOD_TYPE_LABEL = {
  bimestre: 'Bimestral',
  trimestre: 'Trimestral',
  semestre: 'Semestral',
};

const EVAL_KEYS = ['eval1_note1', 'eval2_note1', 'eval3_note1'];

const emptyPeriod = () => ({ id: null, eval1_note1: '', eval2_note1: '', eval3_note1: '' });

const emptyRow = (notes) => {
  const periods = {};
  notes.forEach((p) => { periods[p] = emptyPeriod(); });
  return { periods, recoveryNote: '', absences: 0 };
};

function computeOverall(row, notes, totalClasses) {
  const noteValues = notes.map((p) => {
    const per = row.periods?.[p] || {};
    return num(per.eval1_note1) + num(per.eval2_note1) + num(per.eval3_note1);
  });
  const totalSum = noteValues.reduce((a, b) => a + b, 0);
  const rec = num(row.recoveryNote);
  const totalFinal = rec > totalSum ? rec : totalSum;
  const limit = 0.25 * (num(totalClasses) || 200);
  let status;
  if (num(row.absences) > limit) status = 'Reprovado por Falta';
  else status = totalFinal >= 15 ? 'Aprovado' : 'Reprovado';
  return { noteValues, totalFinal, status };
}

export default function DiarioPage() {
  const { turma } = useOutletContext();
  const notes = periodsFor(turma);
  const periodLabel = PERIOD_TYPE_LABEL[turma.periodType] || 'Bimestral';
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [sts, diaries] = await Promise.all([
        pb.collection('students').getFullList({ filter: `classId = "${turma.id}"`, sort: 'name' }),
        pb.collection('diaries').getFullList({ filter: `classId = "${turma.id}"` }),
      ]);
      setStudents(sts);
      const map = {};
      sts.forEach((s) => { map[s.id] = emptyRow(notes); });
      diaries.forEach((d) => {
        const p = Number(d.period);
        if (!map[d.studentId] || !map[d.studentId].periods[p]) return;
        map[d.studentId].periods[p] = {
          id: d.id,
          eval1_note1: d.eval1_note1 ?? '',
          eval2_note1: d.eval2_note1 ?? '',
          eval3_note1: d.eval3_note1 ?? '',
        };
        if (p === 1) {
          map[d.studentId].recoveryNote = d.recoveryNote ?? '';
          map[d.studentId].absences = d.absences ?? 0;
        }
      });
      setRows(map);
    } catch (err) {
      toast.error('Erro ao carregar o diário.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [turma.id]);

  const onChangeEval = (studentId, p, key, value) => {
    setRows((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        periods: {
          ...prev[studentId].periods,
          [p]: { ...prev[studentId].periods[p], [key]: value },
        },
      },
    }));
  };

  const onChangeMeta = (studentId, field, value) => {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const persist = async (studentId, p) => {
    const row = rows[studentId];
    if (!row) return;
    const per = row.periods[p] || emptyPeriod();
    const clamp = (v, max) => { const n = Number(v); if (v === '' || Number.isNaN(n)) return 0; return Math.min(max, Math.max(0, n)); };
    const data = {
      classId: turma.id,
      studentId,
      period: p,
      eval1_note1: clamp(per.eval1_note1, 10),
      eval2_note1: clamp(per.eval2_note1, 10),
      eval3_note1: clamp(per.eval3_note1, 10),
    };
    if (p === 1) {
      data.recoveryNote = clamp(row.recoveryNote, 30);
      data.absences = Number(row.absences) || 0;
    }
    const savingKey = `${studentId}-${p}`;
    setSavingIds((prev) => ({ ...prev, [savingKey]: true }));
    try {
      let rec;
      if (per.id) rec = await pb.collection('diaries').update(per.id, data, { requestKey: `diary-${savingKey}` });
      else rec = await pb.collection('diaries').create(data, { requestKey: `diary-${savingKey}` });
      setRows((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          periods: {
            ...prev[studentId].periods,
            [p]: {
              id: rec.id,
              eval1_note1: rec.eval1_note1 ?? '',
              eval2_note1: rec.eval2_note1 ?? '',
              eval3_note1: rec.eval3_note1 ?? '',
            },
          },
        },
      }));
      toast.success('Nota salva com sucesso.');
    } catch (err) {
      if (err?.status === 0) return;
      toast.error('Erro ao salvar nota. Tente novamente.');
    } finally {
      setSavingIds((prev) => { const next = { ...prev }; delete next[savingKey]; return next; });
    }
  };

  const cellInput = (studentId, p, key) => {
    const savingKey = `${studentId}-${p}`;
    return (
      <input
        type="number" min={0} max={10} step="0.1"
        value={rows[studentId]?.periods?.[p]?.[key] ?? ''}
        onChange={(e) => onChangeEval(studentId, p, key, e.target.value)}
        onBlur={() => persist(studentId, p)}
        disabled={!!savingIds[savingKey]}
        className="w-14 rounded-md border border-input bg-background px-1.5 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      />
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold">Diário de Notas</h2>
        <p className="text-muted-foreground text-sm mt-1">Lance as avaliações (Av1, Av2, Av3) de cada nota. Notas e situação são calculadas automaticamente.</p>
        <span className="mt-3 inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
          Período: {periodLabel}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {loading ? (
          <div className="p-6 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}</div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ClipboardList className="h-9 w-9 mx-auto opacity-50" strokeWidth={1.5} />
            <p className="mt-3">Cadastre alunos para lançar notas.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium w-10">Nº</th>
                <th className="px-3 py-2 font-medium text-left">Aluno</th>
                {notes.map((p) => (
                  <React.Fragment key={p}>
                    <th className="px-1.5 py-2 font-medium">Av1<br /><span className="text-[10px]">N{p}</span></th>
                    <th className="px-1.5 py-2 font-medium">Av2<br /><span className="text-[10px]">N{p}</span></th>
                    <th className="px-1.5 py-2 font-medium">Av3<br /><span className="text-[10px]">N{p}</span></th>
                    <th className="px-1.5 py-2 font-medium bg-primary/5">Nota {p}</th>
                  </React.Fragment>
                ))}
                <th className="px-1.5 py-2 font-medium">Recup.</th>
                <th className="px-1.5 py-2 font-medium">Faltas</th>
                <th className="px-1.5 py-2 font-medium bg-primary/5">Total Final</th>
                <th className="px-3 py-2 font-medium text-left">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s, idx) => {
                const row = rows[s.id] || emptyRow(notes);
                const { noteValues, totalFinal, status } = computeOverall(row, notes, turma.totalClasses);
                const savingMeta = !!savingIds[`${s.id}-1`];
                return (
                  <tr key={s.id} className="hover:bg-secondary/30">
                    <td className="px-2 py-2 text-center text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{s.name}</td>
                    {notes.map((p, ni) => (
                      <React.Fragment key={p}>
                        <td className="px-1.5 py-2 text-center">{cellInput(s.id, p, EVAL_KEYS[0])}</td>
                        <td className="px-1.5 py-2 text-center">{cellInput(s.id, p, EVAL_KEYS[1])}</td>
                        <td className="px-1.5 py-2 text-center">{cellInput(s.id, p, EVAL_KEYS[2])}</td>
                        <td className="px-1.5 py-2 text-center font-mono font-semibold bg-primary/5">{noteValues[ni].toFixed(1)}</td>
                      </React.Fragment>
                    ))}
                    <td className="px-1.5 py-2 text-center">
                      <input
                        type="number" min={0} max={30} step="0.1"
                        value={row.recoveryNote ?? ''}
                        onChange={(e) => onChangeMeta(s.id, 'recoveryNote', e.target.value)}
                        onBlur={() => persist(s.id, 1)}
                        disabled={savingMeta}
                        className="w-14 rounded-md border border-input bg-background px-1.5 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                      />
                    </td>
                    <td className="px-1.5 py-2 text-center">
                      <input
                        type="number" min={0}
                        value={row.absences ?? 0}
                        onChange={(e) => onChangeMeta(s.id, 'absences', e.target.value)}
                        onBlur={() => persist(s.id, 1)}
                        disabled={savingMeta}
                        className="w-14 rounded-md border border-input bg-background px-1.5 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                      />
                    </td>
                    <td className="px-1.5 py-2 text-center font-mono font-semibold bg-primary/5">{totalFinal.toFixed(1)}</td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', statusColor(status))}>{status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3">Cada nota é a soma de suas 3 avaliações (0–10 cada). O número de notas segue o tipo de período da turma. Total Final = maior valor entre a soma das notas e a recuperação. Aprovado com Total Final ≥ 15 e faltas dentro do limite (25% das aulas).</p>
    </div>
  );
}
