const pool = require("../database/db");
const path = require("path");
const fs = require("fs");
const prettier = require("prettier");
const { TableBuilder } = require("../Model/generic.model");

const pathService = path.join(__dirname, "../Service");
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function generateTemplate(tableName) {
  return `const pool = require("../database/db");
          const { v4: uuidv4 } = require("uuid");
          const bcrypt = require("bcrypt");
          const { TableBuilder } = require("../Model/generic.model");
          const { cleanFields } = require("../Utils/template");
          const { check } = require("../Middleware/auth.middleware");
          const { addUuidIfNeeded } = require("../Utils/dbHelper");
          const {
            sendMailInscription,
            sendMailResetPassword,
          } = require("../Utils/mailer");
          //console.log("Dans le fichier ${tableName}")
         // ######################################################################## INSERT ########################################################################
          async function insert${capitalize(tableName)}Service(data){
              if (data.password) {
                  data.password = await bcrypt.hash(data.password, 10);
                }
              await addUuidIfNeeded("${tableName}", data);
              const insertQuery = new TableBuilder("${tableName}").insert(data).build();
              const result = await pool.query(insertQuery.query, insertQuery.parameters);
              return cleanFields(result.rows[0]);

          }

          //######################################################################## GET ALL ########################################################################
          async function getAll${capitalize(tableName)}Service({ limit, offset, orderBy, orderAttr, fields, filter } = {}) {
              const builder = new TableBuilder("${tableName}").select("*");
              
              if (fields) builder.select(fields.join(", "));
              
              if (filter) {
                const [column, operator, value] = filter;
                const operatorList = { gt: ">", lt: "<", ge: ">=", le: "<=", eq: "=", neq: "!=" };
                builder.where(column, operatorList[operator] || "=", value);
                builder.where("deleted", "=", false);
              } else {
                builder.where("deleted", "=", false);
              }
              
              builder.limit(limit || 10).offset(offset || 0).orderBy(orderBy || "id", orderAttr || "ASC");
              
              const { query, parameters } = builder.build();
              const result = await pool.query(query, parameters);
              return cleanFields(result.rows);
          }

         // ######################################################################## GET ONE  ########################################################################
        async function get${capitalize(tableName)}ByIdService(id, { fields } = {}) {
            const builder = new TableBuilder("${tableName}").select("*");
             
              if (fields) builder.select(fields.join(", "));
             
              builder
                .where("id", "=", id)
                .where("deleted", "=", false);
             
              const { query, parameters } = builder.build();
              const result = await pool.query(query, parameters);
              return cleanFields(result.rows[0]);
        }

            //######################################################################## UPDATE ########################################################################
            async function update${capitalize(tableName)}Service(id, data) {
                const query = new TableBuilder("${tableName}")
                  .update(data)
                  .where("id", "=", id)
                  .build();

                const result = await pool.query(query.query, query.parameters);
                return cleanFields(result.rows[0]);
            }

          //######################################################################## SOFT DELETE ########################################################################
            async function delete${capitalize(tableName)}Service(id) {
                const builder = new TableBuilder("${tableName}").update({ deleted: true });

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
                     ? \`L'élément avec l'id \${id} de la table ${tableName} a bien été supprimé\`
                     : \`Tous les éléments de la table ${tableName} ont bien été supprimés\`,
                   count: result.rows.length,
                };
                             
            }
                
            module.exports = {
            insert${capitalize(tableName)}Service,
            getAll${capitalize(tableName)}Service,
            get${capitalize(tableName)}ByIdService,
            update${capitalize(tableName)}Service,
            delete${capitalize(tableName)}Service,
            }
            ;
`;
}

async function generateServiceFiles() {
  const result = await pool.query(
    `SELECT table_name FROM information_schema.tables 
     WHERE table_schema='public'`,
  );
  const tableList = result.rows.map((row) => row.table_name);
  // console.log("Tables trouvées :", tableList);

  if (!fs.existsSync(pathService)) {
    fs.mkdirSync(pathService, { recursive: true });
  }
  for (const table of tableList) {
    const filePath = path.join(pathService, `${table}.service.js`);
    if (!fs.existsSync(filePath)) {
      const formatted = await prettier.format(generateTemplate(table), {
        parser: "babel",
      });

      fs.writeFileSync(filePath, formatted);
      console.log(`Fichier créé : ${table}.service.js`);
    } else {
      console.log(`Déjà existant : ${table}.service.js`);
    }
  }
}

async function cleanFields(data) {
  const configQuery = new TableBuilder("configurations").select("*").build();
  const {
    rows: [config],
  } = await pool.query(configQuery.query, configQuery.parameters);
  const fieldsToClean = config?.fields_to_clean || [];

  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];

  const cleaned = items.map((item) => {
    const cleanItem = { ...item };
    fieldsToClean.forEach((field) => delete cleanItem[field]);
    return cleanItem;
  });

  return isArray ? cleaned : cleaned[0];
}

module.exports = { generateServiceFiles, cleanFields };
