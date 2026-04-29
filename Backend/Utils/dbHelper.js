const pool = require("../database/db");
const { v4: uuidv4 } = require("uuid");

function parseQuery(req) {
  const fields = req.query.fields
    ? req.query.fields.split(",").map((fields) => fields.trim())
    : null;

  const filter = req.query.filter
    ? req.query.filter.split(",").map((filter) => filter.trim())
    : null;

  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  const orderBy = req.query.orderBy || "id";
  const orderAttr = req.query.orderAttr || "ASC";

  return { fields, filter, limit, offset, orderBy, orderAttr };
}

async function getTableColumns(tableName) {
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name = $1 AND table_schema = 'public'`,
    [tableName],
  );
  return result.rows.map((r) => r.column_name);
}

async function addUuidIfNeeded(tableName, data) {
  const columns = await getTableColumns(tableName);
  if (columns.includes("uuid") && !data.uuid) {
    data.uuid = uuidv4();
  }
  return data;
}
module.exports = { parseQuery, getTableColumns, addUuidIfNeeded };
