/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let collection;
    try {
      collection = app.findCollectionByNameOrId("diaries");
    } catch (_) {
      const classes = app.findCollectionByNameOrId("classes");
      const students = app.findCollectionByNameOrId("students");
      collection = new Collection({
        type: "base",
        name: "diaries",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
          {
            name: "classId",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: classes.id,
            cascadeDelete: true,
          },
          {
            name: "studentId",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: students.id,
            cascadeDelete: true,
          },
          { name: "period", type: "number", onlyInt: true },
          { name: "note1", type: "number" },
          { name: "note2", type: "number" },
          { name: "note3", type: "number" },
          { name: "recoveryNote", type: "number" },
          { name: "absences", type: "number", onlyInt: true },
          { name: "total", type: "number" },
          { name: "totalFinal", type: "number" },
          {
            name: "status",
            type: "select",
            maxSelect: 1,
            values: ["Aprovado", "Reprovado", "Reprovado por Falta"],
          },
          { name: "createdAt", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updatedAt", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX idx_diaries_class ON diaries (classId)",
          "CREATE INDEX idx_diaries_student ON diaries (studentId)",
        ],
      });
      app.save(collection);
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId("diaries");
      app.delete(collection);
    } catch (_) {}
  },
);
