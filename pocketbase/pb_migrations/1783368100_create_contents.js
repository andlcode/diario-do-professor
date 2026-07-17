/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const classes = app.findCollectionByNameOrId("classes");
    const collection = new Collection({
      type: "base",
      name: "contents",
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
      fields: [
        {
          cascadeDelete: true,
          collectionId: classes.id,
          name: "classId",
          type: "relation",
          required: true,
          maxSelect: 1,
          minSelect: 0,
        },
        { name: "date", type: "text", required: true, max: 20 },
        { name: "contentText", type: "text", required: false, max: 20000 },
        { name: "teacherId", type: "text", required: false, max: 200 },
        { name: "createdAt", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updatedAt", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_contents_class ON contents (classId)",
        "CREATE UNIQUE INDEX idx_contents_class_date ON contents (classId, date)",
      ],
    });
    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("contents");
    app.delete(collection);
  },
);
