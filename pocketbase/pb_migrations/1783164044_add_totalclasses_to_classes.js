/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("classes");
    if (!collection.fields.getByName("totalClasses")) {
      collection.fields.add(
        new NumberField({
          name: "totalClasses",
          onlyInt: true,
          min: 0,
        }),
      );
      app.save(collection);
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("classes");
    if (collection.fields.getByName("totalClasses")) {
      collection.fields.removeByName("totalClasses");
      app.save(collection);
    }
  },
);
