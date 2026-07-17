/// <reference path="../pb_data/types.d.ts" />

// Regras de Negócio do Diário de Professores.
//
// Sempre que um registro de "diaries" for criado ou atualizado, recalcula:
//   note1 = eval1_note1 + eval2_note1 + eval3_note1
//   note2 = eval1_note2 + eval2_note2 + eval3_note2
//   note3 = eval1_note3 + eval2_note3 + eval3_note3
//   total = note1 + note2 + note3
//   totalFinal = MAX(total, recoveryNote)
//   status = "Reprovado por Falta" | "Aprovado" | "Reprovado"
//
// Toda a lógica é inline dentro de cada callback (sem referências a funções de
// escopo externo) para evitar "ReferenceError" no JSVM do PocketBase.

function makeDiaryHandler() {
  return function (e) {
    var DEFAULT_TOTAL_CLASSES = 200;
    var ABSENCE_RATIO = 0.25;
    var APPROVAL_THRESHOLD = 15;
    var record = e.record;

    function clamped(field, min, max, label) {
      var raw = record.get(field);
      if (raw === null || raw === undefined || raw === "") return 0;
      var value = Number(raw);
      if (Number.isNaN(value)) {
        throw new BadRequestError(label + " deve ser um número válido.");
      }
      if (value < min) {
        throw new BadRequestError(label + " não pode ser menor que " + min + ".");
      }
      if (max !== undefined && max !== null && value > max) {
        throw new BadRequestError(label + " não pode ser maior que " + max + ".");
      }
      return value;
    }

    var e1n1 = clamped("eval1_note1", 0, 10, "Avaliação 1 (Nota 1)");
    var e2n1 = clamped("eval2_note1", 0, 10, "Avaliação 2 (Nota 1)");
    var e3n1 = clamped("eval3_note1", 0, 10, "Avaliação 3 (Nota 1)");
    var e1n2 = clamped("eval1_note2", 0, 10, "Avaliação 1 (Nota 2)");
    var e2n2 = clamped("eval2_note2", 0, 10, "Avaliação 2 (Nota 2)");
    var e3n2 = clamped("eval3_note2", 0, 10, "Avaliação 3 (Nota 2)");
    var e1n3 = clamped("eval1_note3", 0, 10, "Avaliação 1 (Nota 3)");
    var e2n3 = clamped("eval2_note3", 0, 10, "Avaliação 2 (Nota 3)");
    var e3n3 = clamped("eval3_note3", 0, 10, "Avaliação 3 (Nota 3)");
    var recoveryNote = clamped("recoveryNote", 0, 30, "Recuperação");
    var absences = clamped("absences", 0, null, "Faltas");

    var note1 = e1n1 + e2n1 + e3n1;
    var note2 = e1n2 + e2n2 + e3n2;
    var note3 = e1n3 + e2n3 + e3n3;
    record.set("note1", note1);
    record.set("note2", note2);
    record.set("note3", note3);

    var total = note1 + note2 + note3;
    record.set("total", total);

    var totalFinal = recoveryNote > total ? recoveryNote : total;
    record.set("totalFinal", totalFinal);

    var totalLessons = DEFAULT_TOTAL_CLASSES;
    var classId = record.get("classId");
    if (classId) {
      try {
        var classRecord = $app.findRecordById("classes", classId);
        var tc = classRecord.getInt("totalClasses");
        if (tc > 0) totalLessons = tc;
      } catch (_) {
        totalLessons = DEFAULT_TOTAL_CLASSES;
      }
    }

    var absenceLimit = totalLessons * ABSENCE_RATIO;
    var status;
    if (absences > absenceLimit) {
      status = "Reprovado por Falta";
    } else if (totalFinal >= APPROVAL_THRESHOLD) {
      status = "Aprovado";
    } else {
      status = "Reprovado";
    }
    record.set("status", status);

    e.next();
  };
}

onRecordCreate(makeDiaryHandler(), "diaries");
onRecordUpdate(makeDiaryHandler(), "diaries");
