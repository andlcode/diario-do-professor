import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, FileDown, Printer, Eye, Trash2, FileSpreadsheet, FileMinus } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { periodsFor, num } from '@/lib/diary';

const TOTAL_ROWS = 60;
const PAGE_SIZE = 35;

const PERIOD_TYPE_LABEL = {
  bimestre: 'Bimestral',
  trimestre: 'Trimestral',
  semestre: 'Semestral',
};

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PERIOD_OPTIONS = [
  { value: 'sem1', label: 'Primeiro Semestre' },
  { value: 'sem2', label: 'Segundo Semestre' },
  { value: 'ano', label: 'Ano Letivo Completo' },
  ...MONTHS.map((m, i) => ({ value: `m${i}`, label: m })),
];

function monthsForPeriod(value) {
  if (value === 'sem1') return [0, 1, 2, 3, 4, 5];
  if (value === 'sem2') return [6, 7, 8, 9, 10, 11];
  if (value === 'ano') return null;
  const match = String(value).match(/^m(\d+)$/);
  if (match) return [Number(match[1])];
  return null;
}

function monthIndexFromDate(dateStr) {
  const parts = String(dateStr || '').split('-');
  if (parts.length < 2) return -1;
  return Number(parts[1]) - 1;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDateBr(d) {
  if (!d) return '';
  return String(d).split('-').reverse().join('/');
}

function computeReport(row, notes) {
  const noteValues = notes.map((p) => {
    const per = row?.periods?.[p] || {};
    return num(per.eval1_note1) + num(per.eval2_note1) + num(per.eval3_note1);
  });
  const totalSum = noteValues.reduce((a, b) => a + b, 0);
  const rec = num(row?.recoveryNote);
  const totalFinal = rec > totalSum ? rec : totalSum;
  return { noteValues, totalFinal };
}

function buildHeaderTable(turma, monthLabel, periodLabel) {
  return `
  <table class="header-table">
    <tr>
      <td class="label">Curso</td><td>${escapeHtml(turma.curso)}</td>
      <td class="label">Série</td><td>${escapeHtml(turma.serie)}</td>
    </tr>
    <tr>
      <td class="label">Turma</td><td>${escapeHtml(turma.name)}</td>
      <td class="label">Mês</td><td>${escapeHtml(monthLabel)}</td>
    </tr>
    <tr>
      <td class="label">Ano</td><td>${escapeHtml(turma.year)}</td>
      <td class="label">Componente Curricular</td><td>${escapeHtml(turma.disciplina)}</td>
    </tr>
    <tr>
      <td class="label">Professor(a)</td><td>${escapeHtml(turma.teacher)}</td>
      <td class="label">Período</td><td>${escapeHtml(periodLabel)}</td>
    </tr>
    <tr>
      <td class="label">Data de Emissão</td><td colspan="3">${new Date().toLocaleDateString('pt-BR')}</td>
    </tr>
  </table>`;
}

function buildDiaryHeader(turma, periodLabel, blank) {
  if (blank) {
    return `
    <div class="diary-head">
      <div class="diary-logo">LOGO</div>
      <div class="diary-title">
        <h1>DIÁRIO DE CLASSE</h1>
      </div>
      <div class="diary-spacer"></div>
    </div>
    <table class="diary-header-table">
      <tr>
        <td class="label">Escola</td><td class="fill" colspan="3"></td>
        <td class="label">Professor(a)</td><td class="fill" colspan="2"></td>
      </tr>
      <tr>
        <td class="label">Etapa / Série</td><td class="fill"></td>
        <td class="label">Turma</td><td class="fill"></td>
        <td class="label">Turno</td><td class="fill"></td>
      </tr>
      <tr>
        <td class="label">Período</td><td class="fill"></td>
        <td class="label">Total de Aulas</td><td class="fill"></td>
        <td class="label">Ano</td><td class="fill"></td>
      </tr>
    </table>`;
  }
  return `
  <div class="diary-head">
    <div class="diary-logo">LOGO</div>
    <div class="diary-title">
      <h1>DIÁRIO DE CLASSE</h1>
    </div>
    <div class="diary-spacer"></div>
  </div>
  <table class="diary-header-table">
    <tr>
      <td class="label">Escola</td><td class="fill" colspan="3">${escapeHtml(turma.escola)}</td>
      <td class="label">Professor(a)</td><td class="fill" colspan="2">${escapeHtml(turma.teacher)}</td>
    </tr>
    <tr>
      <td class="label">Etapa / Série</td><td class="fill">${escapeHtml(turma.serie)}</td>
      <td class="label">Turma</td><td class="fill">${escapeHtml(turma.name)}</td>
      <td class="label">Turno</td><td class="fill">${escapeHtml(turma.turno)}</td>
    </tr>
    <tr>
      <td class="label">Período</td><td class="fill">${escapeHtml(periodLabel)}</td>
      <td class="label">Total de Aulas</td><td class="fill">${turma.totalClasses ?? ''}</td>
      <td class="label">Ano</td><td class="fill">${escapeHtml(turma.year)}</td>
    </tr>
  </table>`;
}

function buildHeaderSummary(turma, periodLabel, blank) {
  if (blank) {
    return `
    <table class="header-table">
      <tr>
        <td class="label">Turma</td><td></td>
        <td class="label">Ano</td><td></td>
      </tr>
      <tr>
        <td class="label">Professor(a)</td><td></td>
        <td class="label">Período</td><td></td>
      </tr>
    </table>`;
  }
  return `
  <table class="header-table">
    <tr>
      <td class="label">Turma</td><td>${escapeHtml(turma.name)}</td>
      <td class="label">Ano</td><td>${escapeHtml(turma.year)}</td>
    </tr>
    <tr>
      <td class="label">Professor(a)</td><td>${escapeHtml(turma.teacher)}</td>
      <td class="label">Período</td><td>${escapeHtml(periodLabel)}</td>
    </tr>
  </table>`;
}

function buildGradeTable({ notes, students, dataByStudent, blank }) {
  const rowsHtml = [];
  const emptyNoteCells = notes.map(() => '<td></td><td></td><td></td><td class="nota"></td>').join('');
  for (let i = 0; i < TOTAL_ROWS; i += 1) {
    const s = students[i];
    const num2 = i + 1;
    if (!s) {
      rowsHtml.push(`<tr><td class="num">${num2}</td><td class="name"></td>${emptyNoteCells}<td></td><td class="nota"></td><td></td><td></td></tr>`);
      continue;
    }
    if (blank) {
      rowsHtml.push(`<tr><td class="num">${num2}</td><td class="name">${escapeHtml(s.name)}</td>${emptyNoteCells}<td></td><td class="nota"></td><td></td><td></td></tr>`);
      continue;
    }
    const row = dataByStudent[s.id] || {};
    const { noteValues, totalFinal } = computeReport(row, notes);
    const ev = (p, f) => {
      const per = row.periods?.[p] || {};
      return (per[f] != null && per[f] !== '' ? Number(per[f]).toFixed(1) : '');
    };
    const notesCells = notes.map((p, ni) => (
      `<td>${ev(p, 'eval1_note1')}</td><td>${ev(p, 'eval2_note1')}</td><td>${ev(p, 'eval3_note1')}</td><td class="nota">${noteValues[ni].toFixed(1)}</td>`
    )).join('');
    const rec = row.recoveryNote != null && row.recoveryNote > 0 ? Number(row.recoveryNote).toFixed(1) : '';
    const faltas = row.absences != null ? row.absences : '';
    const status = row.status || '';
    rowsHtml.push(`<tr><td class="num">${num2}</td><td class="name">${escapeHtml(s.name)}</td>${notesCells}<td>${rec}</td><td class="nota">${totalFinal.toFixed(1)}</td><td>${faltas}</td><td>${escapeHtml(status)}</td></tr>`);
  }

  const headTop = notes.map((p) => `<th colspan="4">Nota ${p}</th>`).join('');
  const headSub = notes.map((p) => `<th>Av1</th><th>Av2</th><th>Av3</th><th>N${p}</th>`).join('');

  return `
    <table class="grade-table">
      <thead>
        <tr>
          <th rowspan="2">Nº</th>
          <th rowspan="2">Nome do Aluno</th>
          ${headTop}
          <th rowspan="2">Recup.</th>
          <th rowspan="2">Total<br>Final</th>
          <th rowspan="2">Faltas</th>
          <th rowspan="2">Situação</th>
        </tr>
        <tr>${headSub}</tr>
      </thead>
      <tbody>${rowsHtml.join('')}</tbody>
    </table>`;
}

// Sheet 2 (landscape): single wide table — N, Nome, Notas, Avaliações internas,
// Recup., Total Final, Faltas, Situação, Data do Conteúdo, Conteúdo Ministrado.
function buildGradeTableLandscape({ notes, students, dataByStudent, blank, contents, rowCount, startIndex }) {
  const contentList = contents || [];
  const rowsHtml = [];
  const emptyEvalCells = notes.map(() => '<td class="av"></td><td class="av"></td><td class="av"></td><td class="nsum"></td>').join('');

  for (let i = 0; i < rowCount; i += 1) {
    const s = students[i];
    const c = contentList[i];
    const num2 = startIndex + i + 1;

    if (blank) {
      rowsHtml.push(`<tr><td class="num">${num2}</td><td class="name"></td>${emptyEvalCells}<td class="recup"></td><td class="total"></td><td class="faltas"></td><td class="situacao"></td><td class="data"></td><td class="conteudo"></td></tr>`);
      continue;
    }
    if (!s) {
      rowsHtml.push(`<tr><td class="num"></td><td class="name"></td>${emptyEvalCells}<td class="recup"></td><td class="total"></td><td class="faltas"></td><td class="situacao"></td><td class="data"></td><td class="conteudo"></td></tr>`);
      continue;
    }
    const contentDate = c ? formatDateBr(c.date) : '';
    const contentText = c ? escapeHtml(c.contentText).replace(/\n/g, '<br>') : '';
    const row = dataByStudent[s.id] || {};
    const { noteValues, totalFinal } = computeReport(row, notes);
    const ev = (p, f) => {
      const per = row.periods?.[p] || {};
      return (per[f] != null && per[f] !== '' ? Number(per[f]).toFixed(1) : '');
    };
    const evalCells = notes.map((p, ni) => (
      `<td class="av">${ev(p, 'eval1_note1')}</td><td class="av">${ev(p, 'eval2_note1')}</td><td class="av">${ev(p, 'eval3_note1')}</td><td class="nsum">${noteValues[ni].toFixed(1)}</td>`
    )).join('');
    const rec = row.recoveryNote != null && row.recoveryNote > 0 ? Number(row.recoveryNote).toFixed(1) : '';
    const faltas = row.absences != null ? row.absences : '';
    const status = row.status || '';
    rowsHtml.push(`<tr><td class="num">${num2}</td><td class="name">${escapeHtml(s.name)}</td>${evalCells}<td class="recup">${rec}</td><td class="total">${totalFinal.toFixed(1)}</td><td class="faltas">${faltas}</td><td class="situacao">${escapeHtml(status)}</td><td class="data">${contentDate}</td><td class="conteudo">${contentText}</td></tr>`);
  }

  const evalHeadTop = notes.map((p) => `<th colspan="4">Aval. Nota ${p}</th>`).join('');
  const evalHeadSub = notes.map((p) => `<th class="av">Av1</th><th class="av">Av2</th><th class="av">Av3</th><th class="nsum">N${p}</th>`).join('');

  return `
    <table class="grade-table grade-table--landscape">
      <thead>
        <tr>
          <th class="num" rowspan="2">Nº</th>
          <th class="name" rowspan="2">Nome do Aluno</th>
          ${evalHeadTop}
          <th class="recup" rowspan="2">Recup.</th>
          <th class="total" rowspan="2">Total<br>Final</th>
          <th class="faltas" rowspan="2">Faltas</th>
          <th class="situacao" rowspan="2">Situação</th>
          <th class="data" rowspan="2">Data</th>
          <th class="conteudo" rowspan="2">Conteúdo Ministrado</th>
        </tr>
        <tr>${evalHeadSub}</tr>
      </thead>
      <tbody>${rowsHtml.join('')}</tbody>
    </table>`;
  }

function buildAttendanceTable({ students, attendanceByStudent, dates, blank, rowCount, startIndex }) {
  const rowsHtml = [];
  let dateHeaders = '';
  
  if (blank) {
    // For blank report, generate 30 empty date columns
    dateHeaders = Array(30).fill(0).map(() => '<th class="att-day"></th>').join('');
    for (let i = 0; i < rowCount; i += 1) {
      const num2 = startIndex + i + 1;
      rowsHtml.push(`<tr><td class="num">${num2}</td><td class="name"></td>${Array(30).fill(0).map(() => '<td class="att-day"></td>').join('')}</tr>`);
    }
  } else {
    // For complete report, use actual dates
    dateHeaders = dates.map((d) => `<th class="att-day">${formatDateBr(d).slice(0, 5)}</th>`).join('');
    for (let i = 0; i < rowCount; i += 1) {
      const s = students[i];
      const num2 = startIndex + i + 1;
      if (!s) {
        rowsHtml.push(`<tr><td class="num">${num2}</td><td class="name"></td>${dates.map(() => '<td class="att-day">.</td>').join('')}</tr>`);
        continue;
      }
      const marks = attendanceByStudent[s.id] || {};
      const dayCells = dates.map((d) => {
        const v = marks[d];
        if (v === true) return '<td class="att-day">P</td>';
        if (v === false) return '<td class="att-day">F</td>';
        return '<td class="att-day">.</td>';
      }).join('');
      rowsHtml.push(`<tr><td class="num">${num2}</td><td class="name">${escapeHtml(s.name)}</td>${dayCells}</tr>`);
    }
  }

  return `
    <table class="att-table">
      <thead>
        <tr>
          <th>N</th>
          <th>NOME DO ALUNO</th>
          ${dateHeaders}
        </tr>
      </thead>
      <tbody>${rowsHtml.join('')}</tbody>
    </table>`;
}

function buildSheetOne({ turma, periodLabel, students, attendanceByStudent, dates, blank, rowCount, startIndex }) {
  return `
  <section class="page sheet-landscape${blank ? ' sheet-landscape--blank' : ''}">
    ${buildDiaryHeader(turma, periodLabel, blank)}

    ${buildAttendanceTable({ students, attendanceByStudent, dates, blank, rowCount, startIndex })}

    <div class="diary-footer">
      <div class="sig-item"><span class="sig-label">Assinatura do Professor(a):</span><span class="sig-fill"></span></div>
      <div class="sig-item"><span class="sig-label">Assinatura do Coordenador(a):</span><span class="sig-fill"></span></div>
      <div class="sig-item small"><span class="sig-label">Emitido em:</span><span class="sig-fill"></span></div>
    </div>
  </section>`;
}

function buildSheetTwo({ turma, notes, periodLabel, students, dataByStudent, blank, contents, rowCount, startIndex }) {
  const gradeTable = buildGradeTableLandscape({ notes, students, dataByStudent, blank, contents, rowCount, startIndex });

  return `
  <section class="page sheet-landscape${blank ? ' sheet-landscape--blank' : ''}">
    <h1>${blank ? '' : escapeHtml(turma.name)}</h1>
    <div class="subtitle">Folha 2 — Conteúdo Programático e Avaliações ${blank ? '— em branco' : ''} · Período: ${periodLabel}</div>

    ${buildHeaderSummary(turma, periodLabel, blank)}

    <h3 class="section-title">Avaliações Internas, Notas e Conteúdo Programático</h3>
    ${gradeTable}

    ${blank ? `
    <div class="footer">
      <div class="item"><span>TOTAL DE AULAS PREVISTAS:</span><span class="fill-line"></span></div>
      <div class="item"><span>TOTAL DE AULAS DADAS:</span><span class="fill-line"></span></div>
      <div class="sig">
        <div class="sig-line"><div class="line">Assinatura do(a) Professor(a)</div></div>
        <div class="sig-line"><div class="line">Assinatura do(a) Coordenador(a)</div></div>
      </div>
    </div>` : `
    <div class="footer footer--complete">
      <div class="item item--short"><span>TOTAL DE AULAS PREVISTAS:</span><span class="fill-line fill-line--short"></span></div>
      <div class="item item--short"><span>TOTAL DE AULAS DADAS:</span><span class="fill-line fill-line--short"></span></div>
      <div class="sig-inline"><span class="sig-inline-label">Assinatura do(a) Professor(a):</span><span class="sig-inline-fill"></span></div>
      <div class="sig-inline"><span class="sig-inline-label">Assinatura do(a) Coordenador(a):</span><span class="sig-inline-fill"></span></div>
    </div>`}
  </section>`;
}

function buildHtml({ turma, notes, periodLabel, monthLabel, students, dataByStudent, blank, contents, attendanceByStudent, dates }) {
  const contentList = contents || [];
  // Relatório completo: cada folha deve ter exatamente 35 linhas (alunos + linhas vazias
  // até completar 35); novas folhas são geradas apenas quando o total de alunos excede
  // múltiplos de 35. Relatório em branco mantém a lógica original (sem alteração).
  const pages1 = blank
    ? Math.max(1, Math.ceil(Math.max(students.length, TOTAL_ROWS) / PAGE_SIZE))
    : Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const pages2 = blank
    ? Math.max(1, Math.ceil(Math.max(students.length, TOTAL_ROWS) / PAGE_SIZE))
    : Math.max(1, Math.ceil(Math.max(students.length, contentList.length) / PAGE_SIZE));

  const totalRows1 = pages1 * PAGE_SIZE;
  const totalRows2 = pages2 * PAGE_SIZE;

  let sheet1 = '';
  for (let p = 0; p < pages1; p += 1) {
    const startIndex = p * PAGE_SIZE;
    const rowCount = Math.min(PAGE_SIZE, totalRows1 - startIndex);
    const studentsSlice = students.slice(startIndex, startIndex + rowCount);
    sheet1 += buildSheetOne({
      turma, periodLabel, monthLabel, students: studentsSlice, attendanceByStudent, dates, blank, rowCount, startIndex,
    });
  }

  let sheet2 = '';
  for (let p = 0; p < pages2; p += 1) {
    const startIndex = p * PAGE_SIZE;
    const rowCount = Math.min(PAGE_SIZE, totalRows2 - startIndex);
    const studentsSlice = students.slice(startIndex, startIndex + rowCount);
    const contentsSlice = contentList.slice(startIndex, startIndex + rowCount);
    sheet2 += buildSheetTwo({
      turma, notes, periodLabel, students: studentsSlice, dataByStudent, blank, contents: contentsSlice, rowCount, startIndex,
    });
  }

  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>Relatório - ${escapeHtml(turma.name)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    @page diaryLandscape { size: A4 landscape; margin: 20mm 10mm 6mm 10mm; }
    @page diaryLandscapeBlank { size: A4 landscape; margin: 20mm 10mm 1mm 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 0; margin: 0; }
    .page { padding: 16px; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .page.sheet-landscape { page: diaryLandscape; padding-top: 4px; }
    .page.sheet-landscape--blank { page: diaryLandscapeBlank; padding-top: 0; padding-bottom: 0; }
    .page.sheet-landscape--blank .diary-head { margin-bottom: 0; }
    .page.sheet-landscape--blank .diary-logo { height: 16px; }
    .page.sheet-landscape--blank .diary-title h1 { font-size: 10px; margin: 0; }
    .page.sheet-landscape--blank table.diary-header-table { margin-bottom: 1px; }
    .page.sheet-landscape--blank table.diary-header-table td { padding: 1px 3px; font-size: 8.5px; }
    .page.sheet-landscape--blank .diary-footer { margin-top: 8px; gap: 4px 12px; }
    .page.sheet-landscape--blank table.att-table th, .page.sheet-landscape--blank table.att-table td { padding: 2px 1px; height: 16px; }
    .page.sheet-landscape--blank table.att-table th { font-size: 6.5px; }
    .page.sheet-landscape--blank table.att-table td { font-size: 7px; }
    .page.sheet-landscape--blank .diary-footer .sig-item { flex: 1 1 320px; gap: 2px; }
    .page.sheet-landscape--blank .diary-footer .sig-item.small { flex: 0 1 200px; }
    .page.sheet-landscape--blank .diary-footer .sig-label { font-size: 8.5px; }
    .page.sheet-landscape--blank .diary-footer .sig-fill { height: 14px; min-width: 260px; }
    .page.sheet-landscape--blank table.grade-table--landscape th, .page.sheet-landscape--blank table.grade-table--landscape td { height: 15px; padding: 1px 3px; }
    .page.sheet-landscape--blank table.grade-table--landscape td.name { white-space: normal; }
    .page.sheet-landscape--blank .subtitle { margin-bottom: 4px; }
    .page.sheet-landscape--blank table.header-table { margin-bottom: 4px; }
    .page.sheet-landscape--blank table.header-table td { padding: 3px 6px; }
    .page.sheet-landscape--blank .section-title { margin: 4px 0 4px; padding-bottom: 2px; }
    .page.sheet-landscape--blank .footer { margin-top: 4px; gap: 4px 20px; }
    .page.sheet-landscape--blank .footer .item { gap: 4px; }
    .page.sheet-landscape--blank .footer .fill-line { height: 12px; }
    .page.sheet-landscape--blank .footer .sig { margin-top: 8px; gap: 32px; }
    .page.sheet-landscape--blank .footer .sig .sig-line .line { margin-top: 14px; padding-top: 3px; }
    h1 { font-size: 18px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: .02em; }
    .subtitle { font-size: 12px; color: #555; margin-bottom: 14px; }
    table.header-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; }
    table.header-table td { border: 1px solid #333; padding: 6px 8px; }
    table.header-table td.label { font-weight: bold; width: 14%; background: #f3f3f1; }
    .section-title { font-size: 13px; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: .03em; border-bottom: 2px solid #333; padding-bottom: 4px; }
    .box { border: 1px solid #333; margin-bottom: 12px; }
    .box-title { font-weight: bold; font-size: 12px; background: #f3f3f1; padding: 5px 8px; border-bottom: 1px solid #333; text-transform: uppercase; }
    .diary-head { display: flex; align-items: center; border: 1px solid #333; margin-bottom: 0; }
    .diary-logo { width: 55px; height: 42px; flex-shrink: 0; border-right: 1px solid #333; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999; text-align: center; }
    .diary-title { flex: 1; text-align: center; }
    .diary-title h1 { font-size: 17px; margin: 0; letter-spacing: .04em; }
    .diary-spacer { width: 55px; flex-shrink: 0; }
    table.diary-header-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 11.5px; border-top: none; }
    table.diary-header-table td { border: 1px solid #333; padding: 5px 8px; }
    table.diary-header-table td.label { font-weight: bold; background: #f3f3f1; width: 12%; white-space: nowrap; }
    table.diary-header-table td.fill { min-width: 60px; }
    table.att-table { width: 100%; border-collapse: collapse; font-size: 9px; }
    table.att-table th, table.att-table td { border: 1px solid #333; text-align: center; padding: 1px 2px; height: 13px; }
    table.att-table th { background: #f3f3f1; font-size: 8.5px; }
    table.att-table td.name, table.att-table th.name-header { text-align: left; min-width: 150px; }
    table.att-table td.num, table.att-table th.num-header { width: 20px; }
    table.att-table th.att-day, table.att-table td.att-day { width: 14px; font-size: 8px; color: #777; }
    table.att-table td.nota { background: #f3f3f1; font-weight: bold; }
    .diary-footer { margin-top: 8px; font-size: 12px; display: flex; flex-wrap: wrap; gap: 16px 32px; }
    .diary-footer .sig-item { display: flex; align-items: baseline; gap: 6px; flex: 1 1 260px; }
    .diary-footer .sig-item.small { flex: 0 1 200px; }
    .diary-footer .sig-label { white-space: nowrap; font-weight: 600; }
    .diary-footer .sig-fill { flex: 1; border-bottom: 1px dotted #333; height: 14px; min-width: 120px; }
    table.content-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
    table.content-table th, table.content-table td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
    table.content-table th { background: #f3f3f1; font-weight: bold; text-transform: uppercase; }
    table.content-table td.dias { width: 15%; }
    table.content-table td.resumo { width: 85%; }
    table.content-table th.dias-header { width: 15%; }
    table.content-table th.resumo-header { width: 85%; }
    .resumo-grid { padding: 8px; font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .resumo-grid > div { display: flex; align-items: flex-end; gap: 6px; }
    .resumo-grid .line { flex: 1; border-bottom: 1px solid #333; height: 14px; }
    table.grade-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    table.grade-table th, table.grade-table td { border: 1px solid #333; text-align: center; padding: 3px 4px; height: 18px; }
    table.grade-table th { background: #f3f3f1; font-size: 10px; }
    table.grade-table td.nota { background: #f3f3f1; font-weight: bold; }
    table.grade-table td.name { text-align: left; min-width: 190px; }
    table.grade-table td.num { width: 26px; }
    table.grade-table--landscape { font-size: 8px; table-layout: fixed; width: 100%; }
    table.grade-table--landscape th, table.grade-table--landscape td { padding: 2px 3px; height: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .page.sheet-landscape:not(.sheet-landscape--blank) table.grade-table--landscape tbody tr:last-child th,
    .page.sheet-landscape:not(.sheet-landscape--blank) table.grade-table--landscape tbody tr:last-child td { height: 7px; padding: 0px 3px; line-height: 1; font-size: 7px; }
    table.grade-table--landscape th { font-size: 7.5px; line-height: 1.15; white-space: normal; }
    /* Column widths for landscape grade table */
    table.grade-table--landscape th.num, table.grade-table--landscape td.num { width: 3%; }
    table.grade-table--landscape th.name, table.grade-table--landscape td.name { width: 18%; text-align: left; white-space: nowrap; }
    table.grade-table--landscape th.av, table.grade-table--landscape td.av { width: 2.5%; }
    table.grade-table--landscape th.nsum, table.grade-table--landscape td.nsum { width: 3%; background: #f3f3f1; font-weight: bold; }
    table.grade-table--landscape th.recup, table.grade-table--landscape td.recup { width: 3%; }
    table.grade-table--landscape th.total, table.grade-table--landscape td.total { width: 4%; }
    table.grade-table--landscape th.faltas, table.grade-table--landscape td.faltas { width: 3%; }
    table.grade-table--landscape th.situacao, table.grade-table--landscape td.situacao { width: 5%; }
    table.grade-table--landscape th.data, table.grade-table--landscape td.data { width: 7%; font-size: 7.5px; }
    table.grade-table--landscape th.conteudo, table.grade-table--landscape td.conteudo { width: 28%; text-align: left; white-space: normal; font-size: 7.5px; line-height: 1.2; }
    .footer { margin-top: 16px; font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
    .footer .item { display: flex; align-items: flex-end; gap: 6px; }
    .footer .fill-line { flex: 1; border-bottom: 1px solid #333; height: 16px; }
    .footer.footer--complete { margin-top: 3px; display: flex; flex-wrap: nowrap; align-items: flex-end; gap: 8px 10px; }
    .footer--complete .item--short { flex: 0 0 auto; gap: 3px; white-space: nowrap; }
    .footer--complete .fill-line--short { flex: 0 0 28px; border-bottom: 1px solid #333; height: 14px; }
    .footer--complete .sig-inline { display: flex; align-items: flex-end; gap: 5px; flex: 1 1 auto; min-width: 0; }
    .footer--complete .sig-inline-label { white-space: nowrap; font-weight: 600; }
    .footer--complete .sig-inline-fill { flex: 1; border-bottom: 1px dotted #333; height: 14px; min-width: 160px; }
    .footer .sig { grid-column: 1 / -1; margin-top: 18px; display: flex; gap: 48px; }
    .footer .sig.full { justify-content: center; }
    .footer .sig.full .sig-line { max-width: 320px; }
    .footer .sig .sig-line { flex: 1; text-align: center; }
    .footer .sig .sig-line .line { border-top: 1px solid #333; margin-top: 30px; padding-top: 4px; }
    .gen { margin-top: 14px; font-size: 10px; color: #888; text-align: right; }
    @media print { .gen { display: none; } }
  </style></head><body>
  ${sheet1}
  ${sheet2}
  <p class="gen">Gerado em ${new Date().toLocaleString('pt-BR')} · Diário do Professor</p>
  </body></html>`;
}

export default function RelatoriosPage() {
  const { turma } = useOutletContext();
  const notes = periodsFor(turma);
  const periodLabel = PERIOD_TYPE_LABEL[turma.periodType] || 'Bimestral';
  const [periodoGeracao, setPeriodoGeracao] = useState('ano');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const monthLabel = useMemo(() => {
    const m = periodoGeracao.match(/^m(\d+)$/);
    return m ? MONTHS[Number(m[1])] : '';
  }, [periodoGeracao]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await pb.collection('attendance_reports').getFullList({
        filter: `classId = "${turma.id}"`, sort: '-generatedAt',
      });
      setReports(list);
    } catch (err) {
      toast.error('Erro ao carregar relatórios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [turma.id]);

  const generate = async (blank) => {
    if (!turma?.escola || !turma?.teacher || !turma?.serie || !turma?.turno) {
      toast.error('Cadastro da turma incompleto. Preencha Escola, Professor(a), Série e Turno antes de gerar.');
      return;
    }
    setGenerating(true);
    try {
      const [students, diaries, contents, attendance] = await Promise.all([
        pb.collection('students').getFullList({ filter: `classId = "${turma.id}"`, sort: 'name' }),
        pb.collection('diaries').getFullList({ filter: `classId = "${turma.id}"` }),
        pb.collection('contents').getFullList({ filter: `classId = "${turma.id}"`, sort: 'date' }),
        pb.collection('attendance').getFullList({ filter: `classId = "${turma.id}"`, sort: 'date' }),
      ]);
      if (!blank && students.length === 0) {
        toast.error('Esta turma não tem alunos cadastrados. Cadastre alunos ou gere o relatório em branco.');
        setGenerating(false);
        return;
      }
      const dataByStudent = {};
      students.forEach((s) => { dataByStudent[s.id] = { periods: {}, recoveryNote: '', absences: 0, status: '' }; });
      diaries.forEach((d) => {
        const p = Number(d.period);
        if (!dataByStudent[d.studentId]) return;
        dataByStudent[d.studentId].periods[p] = {
          eval1_note1: d.eval1_note1,
          eval2_note1: d.eval2_note1,
          eval3_note1: d.eval3_note1,
        };
        if (p === 1) {
          dataByStudent[d.studentId].recoveryNote = d.recoveryNote;
          dataByStudent[d.studentId].absences = d.absences;
          dataByStudent[d.studentId].status = d.status;
        }
      });
      const months = monthsForPeriod(periodoGeracao);
      const attendanceFiltered = months
        ? attendance.filter((a) => months.includes(monthIndexFromDate(a.date)))
        : attendance;
      const contentsFiltered = months
        ? contents.filter((c) => months.includes(monthIndexFromDate(c.date)))
        : contents;

      const attendanceByStudent = {};
      const dateSet = new Set();
      attendanceFiltered.forEach((a) => {
        if (!attendanceByStudent[a.studentId]) attendanceByStudent[a.studentId] = {};
        attendanceByStudent[a.studentId][a.date] = !!a.present;
        dateSet.add(a.date);
      });
      const dates = Array.from(dateSet).sort();
      const html = buildHtml({
        turma, notes, periodLabel, monthLabel, students, dataByStudent, blank, contents: contentsFiltered, attendanceByStudent, dates,
      });
      const fileName = `${blank ? 'branco' : 'completo'}-${turma.name.replace(/\s+/g, '_')}.pdf`;
      await pb.collection('attendance_reports').create({
        classId: turma.id, reportType: blank ? 'branco' : 'digital', content: html, fileName,
      });
      toast.success('Relatório gerado (2 folhas).');
      load();
    } catch (err) {
      toast.error('Erro ao gerar relatório.');
    } finally {
      setGenerating(false);
    }
  };

  // Abre o relatório numa janela de impressão do navegador. O usuário escolhe
  // "Salvar como PDF" ou uma impressora física — ambos respeitam as regras
  // @page (A4 paisagem, margens) do HTML gerado, produzindo um PDF fiel.
  const openForPrint = (r) => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Permita pop-ups para gerar o PDF.'); return; }
    w.document.open();
    w.document.write(r.content || '');
    w.document.close();
    w.focus();
    const trigger = () => {
      try { w.print(); } catch (_) { /* ignore */ }
    };
    // Aguarda o carregamento completo (fontes/estilos) antes de imprimir.
    if (w.document.readyState === 'complete') setTimeout(trigger, 250);
    else w.onload = () => setTimeout(trigger, 250);
  };

  const download = (r) => openForPrint(r);
  const print = (r) => openForPrint(r);

  const confirmDelete = async () => {
    try {
      await pb.collection('attendance_reports').delete(toDelete.id);
      toast.success('Relatório removido.');
      setToDelete(null);
      load();
    } catch (err) { toast.error('Erro ao remover.'); }
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Relatórios</h2>
      <p className="text-muted-foreground text-sm mt-1">Gere relatórios em 2 folhas: notas/faltas e conteúdo da aula, seguindo o layout da planilha física.</p>
      <span className="mt-3 inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
        Período: {periodLabel}
      </span>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 sm:max-w-sm">
        <Label>Período de geração do relatório</Label>
        <p className="text-xs text-muted-foreground mt-1 mb-2">Filtra as datas incluídas no relatório. O cabeçalho impresso usa somente os dados do cadastro da turma.</p>
        <Select value={periodoGeracao} onValueChange={setPeriodoGeracao}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <button onClick={() => generate(false)} disabled={generating}
          className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/40 hover:shadow-sm transition disabled:opacity-50">
          <FileSpreadsheet className="h-6 w-6 text-primary" strokeWidth={1.75} />
          <p className="mt-3 font-medium">Relatório completo da turma</p>
          <p className="text-sm text-muted-foreground">2 folhas: notas/faltas de todos os alunos + conteúdo da aula com datas.</p>
        </button>
        <button onClick={() => generate(true)} disabled={generating}
          className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/40 hover:shadow-sm transition disabled:opacity-50">
          <FileMinus className="h-6 w-6 text-accent" strokeWidth={1.75} />
          <p className="mt-3 font-medium">Relatório em branco da turma</p>
          <p className="text-sm text-muted-foreground">2 folhas: cabeçalho e lista de alunos, demais campos vazios para preenchimento manual.</p>
        </button>
      </div>

      <h3 className="font-display text-lg font-semibold mt-10 mb-3">Histórico de relatórios</h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}</div>
        ) : reports.length === 0 ? (
          <div className="py-14 text-center text-muted-foreground">
            <FileText className="h-9 w-9 mx-auto opacity-50" strokeWidth={1.5} />
            <p className="mt-3">Nenhum relatório gerado ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`h-9 w-9 rounded-lg grid place-items-center ${r.reportType === 'branco' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                  {r.reportType === 'branco' ? <FileMinus className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{r.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.reportType === 'branco' ? 'Em branco' : 'Completo'} · {new Date(r.generatedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setPreview(r)} className="p-2 rounded-md hover:bg-secondary" title="Visualizar"><Eye className="h-4 w-4" /></button>
                  <button onClick={() => download(r)} className="p-2 rounded-md hover:bg-secondary" title="Salvar em PDF"><FileDown className="h-4 w-4" /></button>
                  <button onClick={() => print(r)} className="p-2 rounded-md hover:bg-secondary" title="Imprimir"><Printer className="h-4 w-4" /></button>
                  <button onClick={() => setToDelete(r)} className="p-2 rounded-md hover:bg-destructive/10 text-destructive" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-display">{preview?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] rounded-lg border border-border overflow-hidden bg-white">
            <iframe title="preview" srcDoc={preview?.content || ''} className="w-full h-full" />
          </div>
          <div className="flex justify-end">
            <button onClick={() => preview && openForPrint(preview)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Printer className="h-4 w-4" /> Salvar em PDF / Imprimir
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover relatório?</AlertDialogTitle>
            <AlertDialogDescription>"{toDelete?.fileName}" será removido permanentemente.</AlertDialogDescription>
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
