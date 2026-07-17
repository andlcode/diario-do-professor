/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let collection;
    try {
      collection = app.findCollectionByNameOrId("attendance_reports");
    } catch (_) {
      const classes = app.findCollectionByNameOrId("classes");
      collection = new Collection({
        type: "base",
        name: "attendance_reports",
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
            name: "reportType",
            type: "select",
            maxSelect: 1,
            values: ["digital", "branco"],
          },
          { name: "content", type: "text", max: 100000 },
          { name: "fileName", type: "text", max: 300 },
          { name: "generatedAt", type: "autodate", onCreate: true, onUpdate: false },
        ],
        indexes: ["CREATE INDEX idx_reports_class ON attendance_reports (classId)"],
      });
      app.save(collection);
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId("attendance_reports");
      app.delete(collection);
    } catch (_) {}
  },
);
