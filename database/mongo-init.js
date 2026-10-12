// Optional: run with  mongosh < database/mongo-init.js
// (the FastAPI app also creates the indexes automatically on startup)
const dbx = db.getSiblingDB("energy_carbon_db");

dbx.createCollection("students", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["name", "year", "roll_no", "branch", "section", "email"],
    properties: {
      name: { bsonType: "string" },
      year: { bsonType: "int", minimum: 1, maximum: 4 },
      roll_no: { bsonType: "string" },
      branch: { bsonType: "string" },
      section: { bsonType: "string" },
      email: { bsonType: "string" },
    },
  }},
});
dbx.createCollection("energy_records");
dbx.createCollection("carbon_records");

dbx.students.createIndex({ roll_no: 1 }, { unique: true });
dbx.energy_records.createIndex({ roll_no: 1, created_at: -1 });
dbx.carbon_records.createIndex({ roll_no: 1, created_at: -1 });
print("Collections and indexes ready");
