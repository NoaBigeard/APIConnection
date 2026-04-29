const pool = require('./db');
const fs = require('fs');
const path = require('path');

const createTables = fs.readFileSync(
  path.join(__dirname, './createTable.sql'),
  'utf8',
);
const insertDatas = fs.readFileSync(
  path.join(__dirname, './insertData.sql'),
  'utf8',
);

async function init() {
  try {
    await pool.query(createTables);
    console.log('Tables créées ✓');
    await pool.query(insertDatas);
    console.log('Données insérées ✓');
  } catch (err) {
    console.error('Erreur :', err);
  } finally {
    await pool.end();
  }
}

init();
