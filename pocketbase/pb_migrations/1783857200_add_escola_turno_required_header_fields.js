/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("classes");

    if (!collection.fields.getByName("escola")) {
      collection.fields.add(
        new TextField({ name: "escola", max: 200, required: true }),
      );
    }
    if (!collection.fields.getByName("turno")) {
      collection.fields.add(
        new SelectField({
          name: "turno",
          maxSelect: 1,
          required: true,
          values: ["Manhã", "Tarde", "Noite", "Integral"],
        }),
      );
    }

    const teacherField = collection.fields.getByName("teacher");
    if (teacherField) teacherField.required = true;

    const serieField = collection.fields.getByName("serie");
    if (serieField) serieField.required = true;

    const periodField = collection.fields.getByName("period");
    if (periodField) periodField.required = true;

    const periodTypeField = collection.fields.getByName("periodType");
    if (periodTypeField) periodTypeField.required = true;

    const totalClassesField = collection.fields.getByName("totalClasses");
    if (totalClassesField) totalClassesField.required = true;

    const yearField = collection.fields.getByName("year");
    if (yearField) yearField.required = true;

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("classes");

    ["escola", "turno"].forEach((name) => {
      const field = collection.fields.getByName(name);
      if (field) collection.fields.removeById(field.id);
    });

    const teacherField = collection.fields.getByName("teacher");
    if (teacherField) teacherField.required = false;

    const serieField = collection.fields.getByName("serie");
    if (serieField) serieField.required = false;

    const periodField = collection.fields.getByName("period");
    if (periodField) periodField.required = false;

    const periodTypeField = collection.fields.getByName("periodType");
    if (periodTypeField) periodTypeField.required = false;

    const totalClassesField = collection.fields.getByName("totalClasses");
    if (totalClassesField) totalClassesField.required = false;

    const yearField = collection.fields.getByName("year");
    if (yearField) yearField.required = false;

    app.save(collection);
  },
);
