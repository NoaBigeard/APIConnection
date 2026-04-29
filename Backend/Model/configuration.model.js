const pool = require("../database/db");

async function getConfigurationModel() {
  const result = await pool.query(
    `SELECT website_name, nb_failed_attempt, nb_two_factor_authentification, fields_to_clean, creation_date, change_date, deleted 
    FROM configurations`,
  );
  return result.rows[0];
}

module.exports = {
  getConfigurationModel,
};
