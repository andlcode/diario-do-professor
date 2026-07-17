import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { BookOpen, Save, Pencil, Trash2, X } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function ConteudoPage() {
  const { turma } = useOutletContext();
  const [date, setDate] = useState('');
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await pb.collection('contents').getFullList({
        filter: `classId = "${turma.id}"`, sort: '-date',
      });
      setContents(list);
    } catch (err) {
      toast.error('Erro ao carregar conteúdos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [turma.id]);

  const reset = () => { setEditingId(null); setDate(''); setText(''); };

  const save = async () => {
    if (!date) { toast.error('Selecione a data da aula.'); return; }
    if (!text.trim()) { toast.error('Escreva o conteúdo da aula.'); return; }
    setSaving(true);
    try {
      const data = {
        classId: turma.id,
        date,
        contentText: text.trim(),
        teacherId: turma.teacher || '',
      };
      if (editingId) {
        await pb.collection('contents').update(editingId, data);
      } else {
        // enforce one content per class+date; update if exists
        const existing = contents.find((c) => c.date === date);
        if (existing) await pb.collection('contents').update(existing.id, data);
        else await pb.collection('contents').create(data);
      }
      toast.success('Conteúdo salvo.');
      reset();
      load();
    } catch (err) {
      toast.error('Erro ao salvar conteúdo.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (c) => { setEditingId(c.id); setDate(c.date); setText(c.contentText || ''); };

  const confirmDelete = async () => {
    try {
      await pb.collection('contents').delete(toDelete.id);
      toast.success('Conteúdo removido.');
      if (editingId === toDelete.id) reset();
      setToDelete(null);
      load();
    } catch (err) { toast.error('Erro ao remover.'); }
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Conteúdo da Aula</h2>
      <p className="text-muted-foreground text-sm mt-1">Registre o conteúdo lecionado em cada data. Ele aparecerá no diário e nos relatórios.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-xl border border-border bg-card p-5 h-fit">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{editingId ? 'Editar conteúdo' : 'Novo conteúdo'}</h3>
            {editingId && (
              <button onClick={reset} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" /> Cancelar edição
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Data da aula</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Conteúdo lecionado</label>
              <Textarea rows={7} value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Descreva o que foi trabalhado na aula..." />
            </div>
            <Button onClick={save} disabled={saving} className="gap-1.5 justify-self-start">
              <Save className="h-4 w-4" /> Salvar Conteúdo
            </Button>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3">Conteúdos registrados</h3>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}</div>
            ) : contents.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground">
                <BookOpen className="h-9 w-9 mx-auto opacity-50" strokeWidth={1.5} />
                <p className="mt-3">Nenhum conteúdo registrado ainda.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {contents.map((c) => (
                  <li key={c.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-primary">{fmtDate(c.date)}</p>
                        <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">{c.contentText}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => edit(c)} className="p-2 rounded-md hover:bg-secondary" title="Editar"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setToDelete(c)} className="p-2 rounded-md hover:bg-destructive/10 text-destructive" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conteúdo?</AlertDialogTitle>
            <AlertDialogDescription>O conteúdo de {fmtDate(toDelete?.date)} será removido permanentemente.</AlertDialogDescription>
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
