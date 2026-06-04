const pool = require("../database/db");

async function connectionModel(mail) {
  const result = await pool.query(
    `SELECT * FROM users 
    WHERE mail = $1 AND mail_verified = true AND deleted = false
    ORDER BY id DESC
    LIMIT 1`,
    [mail],
  );
  return result.rows[0];
}

module.exports = {
  connectionModel,
};
