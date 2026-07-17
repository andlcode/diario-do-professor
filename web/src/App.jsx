import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from './components/ScrollToTop';
import TurmasPage from './pages/TurmasPage';
import TurmaLayout from './pages/TurmaLayout';
import AlunosPage from './pages/AlunosPage';
import DiarioPage from './pages/DiarioPage';
import PresencaPage from './pages/PresencaPage';
import RelatoriosPage from './pages/RelatoriosPage';
import ConteudoPage from './pages/ConteudoPage';

function App() {
    return (
        <Router>
            <ScrollToTop />
            <Routes>
                <Route path="/" element={<TurmasPage />} />
                <Route path="/turmas/:classId" element={<TurmaLayout />}>
                    <Route index element={<AlunosPage />} />
                    <Route path="alunos" element={<AlunosPage />} />
                    <Route path="diario" element={<DiarioPage />} />
                    <Route path="presenca" element={<PresencaPage />} />
                    <Route path="conteudo" element={<ConteudoPage />} />
                    <Route path="relatorios" element={<RelatoriosPage />} />
                </Route>
            </Routes>
            <Toaster richColors position="top-right" />
        </Router>
    );
}

export default App;
