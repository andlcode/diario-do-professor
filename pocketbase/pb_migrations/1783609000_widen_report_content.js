/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("attendance_reports");
    const field = collection.fields.getByName("content");
    if (field) {
      field.max = 2000000;
      app.save(collection);
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("attendance_reports");
    const field = collection.fields.getByName("content");
    if (field) {
      field.max = 100000;
      app.save(collection);
    }
  },
);
