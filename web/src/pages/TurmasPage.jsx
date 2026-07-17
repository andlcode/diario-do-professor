import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Plus, Pencil, Trash2, Users, ArrowRight, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { periodCountFor } from '@/lib/diary';

const emptyForm = {
  name: '', escola: '', teacher: '', serie: '', turno: '',
  period: 'Bimestre', periodType: 'bimestre', year: new Date().getFullYear(),
  totalClasses: 200, description: '',
};

export default function TurmasPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await pb.collection('classes').getFullList({ sort: '-createdAt' });
      setClasses(list);
      const students = await pb.collection('students').getFullList({ fields: 'classId' });
      const c = {};
      students.forEach((s) => { c[s.classId] = (c[s.classId] || 0) + 1; });
      setCounts(c);
    } catch (err) {
      toast.error('Erro ao carregar turmas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name || '', escola: t.escola || '', teacher: t.teacher || '', serie: t.serie || '',
      turno: t.turno || '', period: t.period || 'Bimestre', periodType: t.periodType || 'bimestre',
      year: t.year || new Date().getFullYear(),
      totalClasses: t.totalClasses ?? 200, description: t.description || '',
    });
    setDialogOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Informe o nome da turma.'); return; }
    if (!form.escola.trim()) { toast.error('Informe a escola.'); return; }
    if (!form.teacher.trim()) { toast.error('Informe o(a) professor(a).'); return; }
    if (!form.serie.trim()) { toast.error('Informe a etapa/série.'); return; }
    if (!form.turno) { toast.error('Informe o turno.'); return; }
    if (!Number(form.year)) { toast.error('Informe o ano.'); return; }
    if (!Number(form.totalClasses)) { toast.error('Informe o total de aulas.'); return; }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(), escola: form.escola.trim(), teacher: form.teacher.trim(),
        serie: form.serie.trim(), turno: form.turno,
        period: form.period, periodType: form.periodType,
        periodCount: periodCountFor(form.periodType),
        year: Number(form.year) || null,
        totalClasses: Number(form.totalClasses) || 0, description: form.description.trim(),
      };
      if (editing) {
        await pb.collection('classes').update(editing.id, data);
        toast.success('Turma atualizada.');
        setDialogOpen(false);
        load();
      } else {
        const rec = await pb.collection('classes').create(data);
        toast.success('Turma criada com sucesso.');
        setDialogOpen(false);
        navigate(`/turmas/${rec.id}/alunos`);
      }
    } catch (err) {
      toast.error('Não foi possível salvar a turma.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await pb.collection('classes').delete(toDelete.id);
      toast.success('Turma removida.');
      setToDelete(null);
      load();
    } catch (err) {
      toast.error('Erro ao remover turma.');
    }
  };

  return (
    <div className="min-h-[100dvh]">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-[72rem] px-5 py-5 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary-foreground/10 grid place-items-center">
            <GraduationCap className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold leading-tight">Diário do Professor</h1>
            <p className="text-sm text-primary-foreground/70">Gestão de turmas, notas, presença e relatórios</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[72rem] px-5 py-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-3xl font-semibold">Minhas Turmas</h2>
            <p className="text-muted-foreground mt-1">
              {classes.length} {classes.length === 1 ? 'turma cadastrada' : 'turmas cadastradas'}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Nova turma
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card py-20 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/60" strokeWidth={1.5} />
            <p className="mt-4 font-medium">Nenhuma turma ainda</p>
            <p className="text-sm text-muted-foreground mt-1">Crie sua primeira turma para começar.</p>
            <Button onClick={openCreate} className="mt-5 gap-2"><Plus className="h-4 w-4" /> Nova turma</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="group rounded-xl border border-border bg-card p-5 flex flex-col shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold truncate">{t.name}</h3>
                    <p className="text-sm text-muted-foreground">{t.period} · {t.year}</p>
                  </div>
                  <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded-md hover:bg-secondary" title="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setToDelete(t)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive" title="Deletar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {t.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.description}</p>}
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" /> {counts[t.id] || 0} alunos
                  </span>
                  <Button size="sm" variant="secondary" className="gap-1.5"
                    onClick={() => navigate(`/turmas/${t.id}/alunos`)}>
                    Acessar <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Editar turma' : 'Nova turma'}</DialogTitle>
            <DialogDescription>Preencha os dados da turma.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da turma</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: 9º Ano B - Matemática" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="escola">Escola</Label>
                <Input id="escola" value={form.escola} onChange={(e) => setForm({ ...form, escola: e.target.value })} placeholder="Ex: Escola Municipal João Silva" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teacher">Professor(a)</Label>
                <Input id="teacher" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} placeholder="Ex: Maria Souza" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="serie">Etapa / Série</Label>
                <Input id="serie" value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} placeholder="Ex: 9º Ano" />
              </div>
              <div className="grid gap-2">
                <Label>Turno</Label>
                <Select value={form.turno} onValueChange={(v) => setForm({ ...form, turno: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o turno" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manhã">Manhã</SelectItem>
                    <SelectItem value="Tarde">Tarde</SelectItem>
                    <SelectItem value="Noite">Noite</SelectItem>
                    <SelectItem value="Integral">Integral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo de Período</Label>
                <Select value={form.periodType} onValueChange={(v) => setForm({ ...form, periodType: v, period: v.charAt(0).toUpperCase() + v.slice(1) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bimestre">Bimestre (2 períodos)</SelectItem>
                    <SelectItem value="trimestre">Trimestre (3 períodos)</SelectItem>
                    <SelectItem value="semestre">Semestre (6 períodos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="year">Ano</Label>
                <Input id="year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tc">Total de aulas no ano</Label>
              <Input id="tc" type="number" value={form.totalClasses} onChange={(e) => setForm({ ...form, totalClasses: e.target.value })} />
              <p className="text-xs text-muted-foreground">Usado para calcular o limite de faltas (25%).</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Descrição</Label>
              <Textarea id="desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover turma?</AlertDialogTitle>
            <AlertDialogDescription>
              A turma "{toDelete?.name}" e todos os alunos, notas e registros de presença associados serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
