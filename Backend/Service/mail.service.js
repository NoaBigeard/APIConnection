const pool = require("../database/db");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { TableBuilder } = require("../Model/generic.model");
const { cleanFields } = require("../Utils/template");
const { check } = require("../Middleware/auth.middleware");
const { addUuidIfNeeded } = require("../Utils/Helper");
const {
  sendMailInscription,
  sendMailResetPassword,
} = require("../Utils/mailer");
//console.log("Dans le fichier mail")
// ######################################################################## INSERT ########################################################################
async function insertMailService(data) {
  await addUuidIfNeeded("mail", data);
  const insertQuery = new TableBuilder("mail").insert(data).build();
  const result = await pool.query(insertQuery.query, insertQuery.parameters);
  return cleanFields(result.rows[0]);
}

//######################################################################## GET ALL ########################################################################
async function getAllMailService({
  limit,
  offset,
  orderBy,
  orderAttr,
  fields,
  filter,
} = {}) {
  const builder = new TableBuilder("mail").select("*");

  if (fields) builder.select(fields.join(", "));

  if (filter) {
    const [column, operator, value] = filter;
    const operatorList = {
      gt: ">",
      lt: "<",
      ge: ">=",
      le: "<=",
      eq: "=",
      neq: "!=",
    };
    builder.where(column, operatorList[operator] || "=", value);
    builder.where("deleted", "=", false);
  } else {
    builder.where("deleted", "=", false);
  }

  builder
    .limit(limit || 10)
    .offset(offset || 0)
    .orderBy(orderBy || "id", orderAttr || "ASC");

  const { query, parameters } = builder.build();
  const result = await pool.query(query, parameters);
  return cleanFields(result.rows);
}

// ######################################################################## GET ONE  ########################################################################
async function getMailByIdService(id, { fields } = {}) {
  const builder = new TableBuilder("mail").select("*");

  if (fields) builder.select(fields.join(", "));

  builder.where("id", "=", id).where("deleted", "=", false);

  const { query, parameters } = builder.build();
  const result = await pool.query(query, parameters);
  return cleanFields(result.rows[0]);
}

//######################################################################## UPDATE ########################################################################
async function updateMailService(id, data) {
  const query = new TableBuilder("mail")
    .update(data)
    .where("id", "=", id)
    .build();

  const result = await pool.query(query.query, query.parameters);
  return cleanFields(result.rows[0]);
}

//######################################################################## SOFT DELETE ########################################################################
async function deleteMailService(id) {
  const builder = new TableBuilder("mail").update({ deleted: true });

  if (id) {
    builder.where("id", "=", id).where("deleted", "=", false);
  } else {
    builder.where("deleted", "=", false);
  }

  const query = builder.build();

  const result = await pool.query(query.query, query.parameters);
  if (id && result.rows.length === 0) {
    throw { status: 404, message: "Élément introuvable" };
  }
  return {
    message: id
      ? `L'élément avec l'id ${id} de la table mail a bien été supprimé`
      : `Tous les éléments de la table mail ont bien été supprimés`,
    count: result.rows.length,
  };
}

module.exports = {
  insertMailService,
  getAllMailService,
  getMailByIdService,
  updateMailService,
  deleteMailService,
};
