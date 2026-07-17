import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarCheck, Plus, AlertTriangle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { absenceLimit } from '@/lib/diary';

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function PresencaPage() {
  const { turma } = useOutletContext();
  const [students, setStudents] = useState([]);
  const [dates, setDates] = useState([]);
  const [records, setRecords] = useState({}); // `${studentId}|${date}` -> {id, present}
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const limit = absenceLimit(turma.totalClasses);

  const load = async () => {
    setLoading(true);
    try {
      const [sts, att] = await Promise.all([
        pb.collection('students').getFullList({ filter: `classId = "${turma.id}"`, sort: 'name' }),
        pb.collection('attendance').getFullList({ filter: `classId = "${turma.id}"` }),
      ]);
      setStudents(sts);
      const map = {};
      const dateSet = new Set();
      att.forEach((a) => { map[`${a.studentId}|${a.date}`] = { id: a.id, present: a.present }; dateSet.add(a.date); });
      setRecords(map);
      setDates(Array.from(dateSet).sort());
    } catch (err) {
      toast.error('Erro ao carregar presença.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [turma.id]);

  const addDate = () => {
    if (!newDate) return;
    if (dates.includes(newDate)) { toast.info('Data já existe.'); return; }
    setDates((prev) => [...prev, newDate].sort());
    setNewDate('');
  };

  const absencesByStudent = useMemo(() => {
    const c = {};
    Object.entries(records).forEach(([key, v]) => {
      const [sid] = key.split('|');
      if (v.present === false) c[sid] = (c[sid] || 0) + 1;
    });
    return c;
  }, [records]);

  const syncDiaryAbsences = async (studentId, total) => {
    try {
      const diaries = await pb.collection('diaries').getFullList({ filter: `classId = "${turma.id}" && studentId = "${studentId}"` });
      await Promise.all(diaries.map((d, i) =>
        pb.collection('diaries').update(d.id, { absences: total }, { requestKey: `abs-${studentId}-${i}` })));
    } catch (err) { /* non-fatal */ }
  };

  const cycle = async (studentId, date) => {
    const key = `${studentId}|${date}`;
    const cur = records[key];
    // undefined -> present true -> present false -> removed
    let next;
    if (!cur) next = { present: true };
    else if (cur.present === true) next = { id: cur.id, present: false };
    else next = null; // delete

    // optimistic + compute new absence total from the updated map
    let newTotal = 0;
    setRecords((prev) => {
      const copy = { ...prev };
      if (next === null) delete copy[key]; else copy[key] = { ...copy[key], present: next.present };
      newTotal = Object.entries(copy).filter(([k, v]) => k.split('|')[0] === studentId && v.present === false).length;
      return copy;
    });

    try {
      if (next === null) {
        if (cur?.id) await pb.collection('attendance').delete(cur.id, { requestKey: key });
      } else if (cur?.id) {
        await pb.collection('attendance').update(cur.id, { present: next.present }, { requestKey: key });
      } else {
        const rec = await pb.collection('attendance').create(
          { classId: turma.id, studentId, date, present: next.present }, { requestKey: key });
        setRecords((prev) => ({ ...prev, [key]: { id: rec.id, present: rec.present } }));
      }
      syncDiaryAbsences(studentId, newTotal);
    } catch (err) {
      if (err?.status !== 0) { toast.error('Erro ao salvar presença.'); load(); }
    }
  };

  const cellFor = (studentId, date) => {
    const v = records[`${studentId}|${date}`];
    const state = v == null ? 'none' : v.present ? 'P' : 'F';
    const styles = {
      none: 'bg-secondary/50 text-muted-foreground hover:bg-secondary',
      P: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
      F: 'bg-red-100 text-red-800 hover:bg-red-200',
    };
    return (
      <button onClick={() => cycle(studentId, date)}
        className={cn('h-8 w-8 rounded-md text-xs font-semibold transition-colors', styles[state])}>
        {state === 'none' ? '·' : state}
      </button>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Presença</h2>
          <p className="text-muted-foreground text-sm mt-1">Clique para alternar: · vazio → P (presente) → F (falta).</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Adicionar data de aula</label>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-40" />
          </div>
          <Button onClick={addDate} className="gap-1.5"><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
      </div>

      <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4" /> Limite de faltas permitido: <strong>{limit}</strong> (25% de {turma.totalClasses || 200} aulas)
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {loading ? (
          <div className="p-6 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}</div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <CalendarCheck className="h-9 w-9 mx-auto opacity-50" strokeWidth={1.5} />
            <p className="mt-3">Cadastre alunos para registrar presença.</p>
          </div>
        ) : (
          <table className="text-sm">
            <thead className="bg-secondary/60 text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 bg-secondary/95 px-4 py-3 font-medium text-left">Aluno</th>
                {dates.map((d) => <th key={d} className="px-2 py-3 font-medium whitespace-nowrap">{fmtDate(d)}</th>)}
                <th className="px-4 py-3 font-medium">Faltas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => {
                const abs = absencesByStudent[s.id] || 0;
                const over = abs > limit;
                return (
                  <tr key={s.id} className="hover:bg-secondary/30">
                    <td className="sticky left-0 z-10 bg-card px-4 py-2 font-medium whitespace-nowrap">{s.name}</td>
                    {dates.map((d) => <td key={d} className="px-2 py-2 text-center">{cellFor(s.id, d)}</td>)}
                    <td className="px-4 py-2 text-center">
                      <span className={cn('font-mono font-semibold', over ? 'text-destructive' : 'text-foreground')}>{abs}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && students.length > 0 && dates.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Adicione uma data de aula para começar a marcar presença.</p>
        )}
      </div>
    </div>
  );
}
