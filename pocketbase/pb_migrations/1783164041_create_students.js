/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let collection;
    try {
      collection = app.findCollectionByNameOrId("students");
    } catch (_) {
      const classes = app.findCollectionByNameOrId("classes");
      collection = new Collection({
        type: "base",
        name: "students",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
          { name: "name", type: "text", required: true, max: 200 },
          {
            name: "classId",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: classes.id,
            cascadeDelete: true,
          },
          { name: "enrollment", type: "text", max: 100 },
          { name: "email", type: "email" },
          { name: "createdAt", type: "autodate", onCreate: true, onUpdate: false },
        ],
        indexes: ["CREATE INDEX idx_students_class ON students (classId)"],
      });
      app.save(collection);
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId("students");
      app.delete(collection);
    } catch (_) {}
  },
);
