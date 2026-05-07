const pool = require("../database/db");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { TableBuilder } = require("../Model/generic.model");
const { cleanFields } = require("../Utils/template");
const { check } = require("../Middleware/auth.middleware");
const { addUuidIfNeeded } = require("../Utils/Helper");
const { uploadAWSService } = require("../Utils/upload");

const {
  sendMailInscription,
  sendMailResetPassword,
} = require("../Utils/mailer");
//console.log("Dans le fichier articles")
// ######################################################################## INSERT ########################################################################
async function insertArticlesService(data, files) {
  const articleData = { ...data };
  delete articleData.photos;
  articleData.ttc_price = articleData.ttc_price * 100;
  // console.log(articleData);
  await addUuidIfNeeded("articles", articleData);
  const insertQuery = new TableBuilder("articles").insert(articleData).build();
  const result = await pool.query(insertQuery.query, insertQuery.parameters);
  const article = result.rows[0];

  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const urlPhoto = file.location || file.path || file.url || file.filename;

      if (!urlPhoto) {
        throw {
          status: 500,
          message: "Upload photo invalide : aucune URL exploitable",
        };
      }

      const photoData = {
        url_photo: urlPhoto,
        display_orders: i,
        id_article: article.id,
      };
      await addUuidIfNeeded("photos", photoData);
      const photoQuery = new TableBuilder("photos").insert(photoData).build();
      await pool.query(photoQuery.query, photoQuery.parameters);
    }
  }

  return {
    message: "Article ajouté avec succès",
    article: cleanFields(article),
  };
}

//######################################################################## GET ALL ########################################################################
async function getAllArticlesService({
  limit,
  offset,
  orderBy,
  orderAttr,
  fields,
  filter,
} = {}) {
  const builder = new TableBuilder("articles").select("*");

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

  const articlesWithPhotos = await Promise.all(
    result.rows.map(async (article) => {
      const photosQuery = new TableBuilder("photos")
        .where("id_article", "=", article.id)
        .where("deleted", "=", false)
        .orderBy("display_orders", "ASC")
        .build();
      const photos = await pool.query(
        photosQuery.query,
        photosQuery.parameters,
      );
      return { ...article, photos: photos.rows };
    }),
  );

  return cleanFields(articlesWithPhotos);
}

// ######################################################################## GET ONE  ########################################################################
async function getArticlesByIdService(id, { fields } = {}) {
  const builder = new TableBuilder("articles").select("*");

  if (fields) builder.select(fields.join(", "));

  builder.where("id", "=", id).where("deleted", "=", false);

  const { query, parameters } = builder.build();
  const result = await pool.query(query, parameters);
  return cleanFields(result.rows[0]);
}

//######################################################################## UPDATE ########################################################################
async function updateArticlesService(id, data) {
  const query = new TableBuilder("articles")
    .update(data)
    .where("id", "=", id)
    .build();
  console.log("Query:", query.query);
  console.log("Parameters:", query.parameters);
  const result = await pool.query(query.query, query.parameters);
  return cleanFields(result.rows[0]);
}

//######################################################################## SOFT DELETE ########################################################################
async function deleteArticlesService(id) {
  const builder = new TableBuilder("articles").update({ deleted: true });

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
      ? `L'élément avec l'id ${id} de la table articles a bien été supprimé`
      : `Tous les éléments de la table articles ont bien été supprimés`,
    count: result.rows.length,
  };
}

async function addPhotosService(id_article, files) {
  const photos = [];
  for (let i = 0; i < files.length; i++) {
    const photoData = {
      url_photo: files[i].location,
      display_orders: i,
      id_article,
    };
    await addUuidIfNeeded("photos", photoData);
    const photoQuery = new TableBuilder("photos").insert(photoData).build();
    const result = await pool.query(photoQuery.query, photoQuery.parameters);
    photos.push(result.rows[0]);
  }
  return { message: "Photos ajoutées avec succès", photos };
}
module.exports = {
  insertArticlesService,
  getAllArticlesService,
  getArticlesByIdService,
  updateArticlesService,
  deleteArticlesService,
  addPhotosService,
};
