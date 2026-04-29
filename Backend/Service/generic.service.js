// const pool = require("../database/db");
// const { v4: uuidv4 } = require("uuid");
// const bcrypt = require("bcrypt");
// const { TableBuilder } = require("../Model/generic.model");
// const { cleanFields } = require("../Utils/template");

// async function getTableService({ table, id, fields, filter }) {
//   const builder = new TableBuilder(table);

//   if (fields) builder.select(fields.join(", "));

//   if (filter) {
//     const [column, operator, value] = filter;
//     const operatorList = { gt: ">", lt: "<", ge: ">=", le: "<=", eq: "=", neq: "!=" };
//     builder.where(column, operatorList[operator], value);
//   } else {
//     builder.where("deleted", "=", false);
//   }

//   builder.orderBy("id");
//   const { query, parameters } = builder.build();
//   const result = await pool.query(query, parameters);

//   if (id) {
//     const cleaned = await cleanFields([result.rows[0]]);
//     return cleaned[0];
//   }
//   return await cleanFields(result.rows);
// }

// async function insertTableService({ table, data }) {
//   const columnsResult = await pool.query(
//     `SELECT column_name FROM information_schema.columns 
//      WHERE table_name = $1 AND table_schema = 'public'`,
//     [table],
//   );
//   const existingColumns = columnsResult.rows.map((row) => row.column_name);
//   const invalidFields = Object.keys(data).filter(
//     (field) => !existingColumns.includes(field),
//   );
//   if (invalidFields.length > 0) {
//     throw { status: 400, message: `Champs invalides : ${invalidFields.join(", ")}` };
//   }
//   if (table === "users" && data.password) {
//     data.password = await bcrypt.hash(data.password, 10);
//   }
//   if (!data.uuid) data.uuid = uuidv4();

//   const insertQuery = new TableBuilder(table).insert(data).build();
//   const { rows: [created] } = await pool.query(insertQuery.query, insertQuery.parameters);
//   return cleanFields(created);
// }

// async function softDeleteService({ table, id }) {
//   const builder = new TableBuilder(table).update({ deleted: true });
//   if (id) builder.where("id", "=", id);

//   const { query, parameters } = builder.build();
//   const { rows } = await pool.query(query, parameters);

//   if (id && rows.length === 0) {
//     throw { status: 404, message: "Élément introuvable" };
//   }
//   return {
//     message: id ? "Élément supprimé avec succès" : `${rows.length} éléments supprimés`,
//   };
// }

// module.exports = { getTableService, insertTableService, softDeleteService };