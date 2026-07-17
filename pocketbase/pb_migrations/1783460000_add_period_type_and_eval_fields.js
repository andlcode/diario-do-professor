/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // ---- classes: periodType + periodCount ----
    const classes = app.findCollectionByNameOrId("classes");
    if (!classes.fields.getByName("periodType")) {
      classes.fields.add(
        new SelectField({
          name: "periodType",
          maxSelect: 1,
          values: ["bimestre", "trimestre", "semestre"],
        }),
      );
    }
    if (!classes.fields.getByName("periodCount")) {
      classes.fields.add(
        new NumberField({ name: "periodCount", onlyInt: true, min: 0 }),
      );
    }
    app.save(classes);

    // ---- diaries: detailed evaluation fields ----
    const diaries = app.findCollectionByNameOrId("diaries");
    const evalFields = [
      "eval1_note1", "eval2_note1", "eval3_note1",
      "eval1_note2", "eval2_note2", "eval3_note2",
      "eval1_note3", "eval2_note3", "eval3_note3",
    ];
    evalFields.forEach((name) => {
      if (!diaries.fields.getByName(name)) {
        diaries.fields.add(new NumberField({ name, min: 0, max: 10 }));
      }
    });

    // recoveryNote now allows 0-30
    const rec = diaries.fields.getByName("recoveryNote");
    if (rec) {
      rec.max = 30;
    }
    // note1/note2/note3 are now sums of three evals (up to 30)
    ["note1", "note2", "note3"].forEach((n) => {
      const f = diaries.fields.getByName(n);
      if (f) f.max = 30;
    });
    app.save(diaries);
  },
  (app) => {
    try {
      const classes = app.findCollectionByNameOrId("classes");
      classes.fields.removeByName("periodType");
      classes.fields.removeByName("periodCount");
      app.save(classes);
    } catch (_) {}
    try {
      const diaries = app.findCollectionByNameOrId("diaries");
      [
        "eval1_note1", "eval2_note1", "eval3_note1",
        "eval1_note2", "eval2_note2", "eval3_note2",
        "eval1_note3", "eval2_note3", "eval3_note3",
      ].forEach((n) => diaries.fields.removeByName(n));
      const rec = diaries.fields.getByName("recoveryNote");
      if (rec) rec.max = 10;
      app.save(diaries);
    } catch (_) {}
  },
);
