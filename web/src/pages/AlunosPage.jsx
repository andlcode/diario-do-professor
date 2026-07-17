import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Mail, Hash, User, ClipboardList, Upload } from 'lucide-react';
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

const emptyForm = { name: '', enrollment: '', email: '' };

export default function AlunosPage() {
  const { turma } = useOutletContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [bulkText, setBulkText] = useState('');
  const [importing, setImporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await pb.collection('students').getFullList({
        filter: `classId = "${turma.id}"`, sort: 'name',
      });
      setStudents(list);
    } catch (err) {
      toast.error('Erro ao carregar alunos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [turma.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      (s.name || '').toLowerCase().includes(q) || (s.enrollment || '').toLowerCase().includes(q));
  }, [students, query]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name || '', enrollment: s.enrollment || '', email: s.email || '' }); setDialogOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Informe o nome do aluno.'); return; }
    setSaving(true);
    try {
      const data = { name: form.name.trim(), enrollment: form.enrollment.trim(), email: form.email.trim(), classId: turma.id };
      if (editing) { await pb.collection('students').update(editing.id, data); toast.success('Aluno atualizado.'); }
      else { await pb.collection('students').create(data); toast.success('Aluno adicionado.'); }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.email ? 'E-mail inválido.' : 'Não foi possível salvar o aluno.');
    } finally {
      setSaving(false);
    }
  };

  const importList = async () => {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast.error('Cole ao menos um nome de aluno para importar.');
      return;
    }

    const existingNames = new Set(students.map((s) => (s.name || '').trim().toLowerCase()));
    const seen = new Set();
    const toCreate = [];
    let duplicates = 0;

    for (const name of lines) {
      const key = name.toLowerCase();
      if (existingNames.has(key) || seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);
      toCreate.push(name);
    }

    if (toCreate.length === 0) {
      toast.error('Todos os nomes já existem nesta turma.');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let failCount = 0;
    try {
      const results = await Promise.allSettled(
        toCreate.map((name, i) =>
          pb.collection('students').create(
            { name, classId: turma.id },
            { requestKey: `import-student-${i}-${Date.now()}` },
          ),
        ),
      );
      results.forEach((r) => { if (r.status === 'fulfilled') successCount += 1; else failCount += 1; });

      if (successCount > 0) {
        toast.success(`${successCount} aluno${successCount > 1 ? 's' : ''} importado${successCount > 1 ? 's' : ''} com sucesso.`);
        setBulkText('');
        load();
      }
      if (failCount > 0) {
        toast.error(`${failCount} aluno${failCount > 1 ? 's' : ''} não pôde${failCount > 1 ? 'ram' : ''} ser importado${failCount > 1 ? 's' : ''}.`);
      }
      if (duplicates > 0) {
        toast.message(`${duplicates} nome${duplicates > 1 ? 's' : ''} duplicado${duplicates > 1 ? 's' : ''} ignorado${duplicates > 1 ? 's' : ''}.`);
      }
    } catch (err) {
      toast.error('Erro ao importar lista de alunos.');
    } finally {
      setImporting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await pb.collection('students').delete(toDelete.id);
      toast.success('Aluno removido.');
      setToDelete(null);
      load();
    } catch (err) {
      toast.error('Erro ao remover aluno.');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold">Alunos</h2>
          <p className="text-muted-foreground text-sm mt-1">{students.length} matriculados</p>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou matrícula" className="pl-9" />
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0"><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold">Cadastro rápido por colagem de lista</h3>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bulk">Colar lista de alunos</Label>
          <Textarea
            id="bulk"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'Cole aqui a lista de alunos (um por linha)\nJoão da Silva\nMaria Oliveira\nPedro Santos'}
            className="min-h-[120px]"
          />
        </div>
        <div className="flex justify-end mt-3">
          <Button onClick={importList} disabled={importing || !bulkText.trim()} className="gap-2">
            <Upload className="h-4 w-4" /> {importing ? 'Importando...' : 'Importar Lista'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <User className="h-9 w-9 mx-auto opacity-50" strokeWidth={1.5} />
            <p className="mt-3">{students.length === 0 ? 'Nenhum aluno cadastrado.' : 'Nenhum resultado para a busca.'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Matrícula</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">E-mail</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <button onClick={() => setViewing(s)} className="font-medium hover:text-primary text-left">{s.name}</button>
                    <div className="text-xs text-muted-foreground sm:hidden">{s.enrollment}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{s.enrollment || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{s.email || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-secondary" title="Editar"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setToDelete(s)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive" title="Deletar"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Editar aluno' : 'Novo aluno'}</DialogTitle>
            <DialogDescription>Dados do aluno na turma {turma.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sname">Nome</Label>
              <Input id="sname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="enr">Matrícula / RA</Label>
              <Input id="enr" value={form.enrollment} onChange={(e) => setForm({ ...form, enrollment: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mail">E-mail</Label>
              <Input id="mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{viewing?.name}</DialogTitle>
            <DialogDescription>Detalhes do aluno</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3"><Hash className="h-4 w-4 text-muted-foreground" /> <span className="text-muted-foreground">Matrícula:</span> {viewing?.enrollment || '—'}</div>
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /> <span className="text-muted-foreground">E-mail:</span> {viewing?.email || '—'}</div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aluno?</AlertDialogTitle>
            <AlertDialogDescription>"{toDelete?.name}" e seus registros de notas e presença serão removidos permanentemente.</AlertDialogDescription>
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
