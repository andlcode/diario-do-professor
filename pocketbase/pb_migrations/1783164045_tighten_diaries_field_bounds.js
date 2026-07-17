/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("diaries");

    const note1 = collection.fields.getByName("note1");
    note1.min = 0;
    note1.max = 10;

    const note2 = collection.fields.getByName("note2");
    note2.min = 0;
    note2.max = 10;

    const note3 = collection.fields.getByName("note3");
    note3.min = 0;
    note3.max = 10;

    const recoveryNote = collection.fields.getByName("recoveryNote");
    recoveryNote.min = 0;
    recoveryNote.max = 10;

    const absences = collection.fields.getByName("absences");
    absences.min = 0;

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("diaries");

    const note1 = collection.fields.getByName("note1");
    note1.min = null;
    note1.max = null;

    const note2 = collection.fields.getByName("note2");
    note2.min = null;
    note2.max = null;

    const note3 = collection.fields.getByName("note3");
    note3.min = null;
    note3.max = null;

    const recoveryNote = collection.fields.getByName("recoveryNote");
    recoveryNote.min = null;
    recoveryNote.max = null;

    const absences = collection.fields.getByName("absences");
    absences.min = null;

    app.save(collection);
  },
);
