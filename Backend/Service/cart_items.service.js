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
//console.log("Dans le fichier cart_items")
// ######################################################################## INSERT ########################################################################
async function insertCart_itemsService(data) {
  await addUuidIfNeeded("cart_items", data);
  const insertQuery = new TableBuilder("cart_items").insert(data).build();
  const result = await pool.query(insertQuery.query, insertQuery.parameters);
  return cleanFields(result.rows[0]);
}

//######################################################################## GET ALL ########################################################################
async function getAllCart_itemsService({
  limit,
  offset,
  orderBy,
  orderAttr,
  fields,
  filter,
} = {}) {
  const builder = new TableBuilder("cart_items").select("*");

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
async function getCart_itemsByIdService(id, { fields } = {}) {
  const builder = new TableBuilder("cart_items").select("*");

  if (fields) builder.select(fields.join(", "));

  builder.where("id", "=", id).where("deleted", "=", false);

  const { query, parameters } = builder.build();
  const result = await pool.query(query, parameters);
  return cleanFields(result.rows[0]);
}

//######################################################################## UPDATE ########################################################################
async function updateCart_itemsService(id, data) {
  const query = new TableBuilder("cart_items")
    .update(data)
    .where("id", "=", id)
    .build();

  const result = await pool.query(query.query, query.parameters);
  return cleanFields(result.rows[0]);
}

//######################################################################## SOFT DELETE ########################################################################
async function deleteCart_itemsService(id) {
  const builder = new TableBuilder("cart_items").update({ deleted: true });

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
      ? `L'élément avec l'id ${id} de la table cart_items a bien été supprimé`
      : `Tous les éléments de la table cart_items ont bien été supprimés`,
    count: result.rows.length,
  };
}

module.exports = {
  insertCart_itemsService,
  getAllCart_itemsService,
  getCart_itemsByIdService,
  updateCart_itemsService,
  deleteCart_itemsService,
};
