import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, ClipboardList, CalendarCheck, FileText, ChevronRight, BookOpen } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { cn } from '@/lib/utils';

const TABS = [
  { to: 'alunos', label: 'Alunos', icon: Users },
  { to: 'diario', label: 'Diário', icon: ClipboardList },
  { to: 'conteudo', label: 'Conteúdo', icon: BookOpen },
  { to: 'presenca', label: 'Presença', icon: CalendarCheck },
  { to: 'relatorios', label: 'Relatórios', icon: FileText },
];

export default function TurmaLayout() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = TABS.find((t) => location.pathname.endsWith(`/${t.to}`)) || TABS[0];
  const [turma, setTurma] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    pb.collection('classes').getOne(classId)
      .then((r) => { if (active) setTurma(r); })
      .catch(() => { if (active) navigate('/'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classId, navigate]);

  return (
    <div className="min-h-[100dvh]">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-[80rem] px-5 py-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Todas as turmas
          </Link>
          <nav className="mt-2 flex items-center gap-1.5 text-xs text-primary-foreground/60">
            <Link to="/" className="hover:text-primary-foreground transition-colors">Turmas</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-primary-foreground/90 max-w-[16rem] truncate">{loading ? '...' : turma?.name}</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-primary-foreground">{activeTab.label}</span>
          </nav>
          <h1 className="font-display text-2xl font-semibold mt-1">
            {loading ? 'Carregando...' : turma?.name}
          </h1>
          {turma && (
            <p className="text-sm text-primary-foreground/70">{turma.period} · {turma.year}</p>
          )}
        </div>
        <nav className="mx-auto max-w-[80rem] px-5 flex gap-1 overflow-x-auto">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                isActive
                  ? 'border-accent text-primary-foreground'
                  : 'border-transparent text-primary-foreground/60 hover:text-primary-foreground'
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[80rem] px-5 py-8">
        {!loading && turma && <Outlet context={{ turma, setTurma }} />}
      </main>
    </div>
  );
}
