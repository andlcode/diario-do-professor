/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("classes");

    if (!collection.fields.getByName("curso")) {
      collection.fields.add(
        new TextField({ name: "curso", max: 200, required: false }),
      );
    }
    if (!collection.fields.getByName("serie")) {
      collection.fields.add(
        new TextField({ name: "serie", max: 100, required: false }),
      );
    }
    if (!collection.fields.getByName("disciplina")) {
      collection.fields.add(
        new TextField({ name: "disciplina", max: 200, required: false }),
      );
    }

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("classes");

    ["curso", "serie", "disciplina"].forEach((name) => {
      const field = collection.fields.getByName(name);
      if (field) {
        collection.fields.removeById(field.id);
      }
    });

    app.save(collection);
  },
);
