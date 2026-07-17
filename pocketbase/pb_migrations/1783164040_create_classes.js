/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let collection;
    try {
      collection = app.findCollectionByNameOrId("classes");
    } catch (_) {
      collection = new Collection({
        type: "base",
        name: "classes",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
          { name: "name", type: "text", required: true, max: 200 },
          { name: "period", type: "text", max: 100 },
          { name: "year", type: "number", onlyInt: true },
          { name: "teacher", type: "text", max: 200 },
          { name: "description", type: "text", max: 2000 },
          { name: "createdAt", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updatedAt", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(collection);
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId("classes");
      app.delete(collection);
    } catch (_) {}
  },
);
