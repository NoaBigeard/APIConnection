const pool = require("../database/db");
const { v4: uuidv4 } = require("uuid");

// ################################################## pour aller chercher le query ##################################################
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
// ################################################## pour get les columns ##################################################

async function getTableColumns(tableName) {
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name = $1 AND table_schema = 'public'`,
    [tableName],
  );
  return result.rows.map((r) => r.column_name);
}
// ################################################## pour ajouter un uuid si besoin ##################################################

async function addUuidIfNeeded(tableName, data) {
  const columns = await getTableColumns(tableName);
  if (columns.includes("uuid") && !data.uuid) {
    data.uuid = uuidv4();
  }
  return data;
}

function checkPermission(requestingUser, ownerId) {
  if (requestingUser.access_level <= 10 && requestingUser.id !== ownerId) {
    const err = new Error("No permission");
    err.status = 403;
    throw err;
  }
}


module.exports = {
  parseQuery,
  getTableColumns,
  addUuidIfNeeded,
  checkPermission,
};
