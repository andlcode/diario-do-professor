/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const classes = app.findCollectionByNameOrId("classes");
    const students = app.findCollectionByNameOrId("students");

    const collection = new Collection({
      type: "base",
      name: "attendance",
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
        { name: "date", type: "text", required: true, max: 20 },
        { name: "present", type: "bool" },
        { name: "createdAt", type: "autodate", onCreate: true, onUpdate: false },
      ],
      indexes: [
        "CREATE INDEX idx_attendance_class ON attendance (classId)",
        "CREATE UNIQUE INDEX idx_attendance_unique ON attendance (studentId, date)",
      ],
    });
    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("attendance");
    app.delete(collection);
  },
);
