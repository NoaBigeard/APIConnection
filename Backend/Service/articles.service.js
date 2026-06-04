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

  if (articleData.ht_price !== undefined && articleData.ht_price !== "") {
    articleData.ht_price = Math.round(Number(articleData.ht_price) * 100);
  }

  if (articleData.ttc_price !== undefined && articleData.ttc_price !== "") {
    articleData.ttc_price = Math.round(Number(articleData.ttc_price) * 100);
  }

  if (articleData.tva_price !== undefined && articleData.tva_price !== "") {
    articleData.tva_price = Number(articleData.tva_price);
  }

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
  includeDeleted = false,
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
  }
  const shouldIncludeDeleted =
    includeDeleted === true || String(includeDeleted) === "true";

  if (!shouldIncludeDeleted) {
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

// ######################################################################## GET ONE BY ID ########################################################################
async function getArticlesByIdService(id, { fields } = {}) {
  const builder = new TableBuilder("articles").select("*");

  if (fields) builder.select(fields.join(", "));

  builder.where("id", "=", id).where("deleted", "=", false);

  const { query, parameters } = builder.build();
  const result = await pool.query(query, parameters);
  const article = result.rows[0];

  if (!article) return null;

  const photosQuery = new TableBuilder("photos")
    .where("id_article", "=", article.id)
    .where("deleted", "=", false)
    .orderBy("display_orders", "ASC")
    .build();
  const photos = await pool.query(photosQuery.query, photosQuery.parameters);

  return cleanFields({ ...article, photos: photos.rows });
}
// ######################################################################## GET ONE BY UUID ########################################################################

async function getArticlesByUuidService(uuid, { fields } = {}) {
  const builder = new TableBuilder("articles").select("*");

  if (fields) builder.select(fields.join(", "));

  builder.where("uuid", "=", uuid).where("deleted", "=", false);

  const { query, parameters } = builder.build();
  const result = await pool.query(query, parameters);
  const article = result.rows[0];

  if (!article) return null;

  const photosQuery = new TableBuilder("photos")
    .where("id_article", "=", article.id)
    .where("deleted", "=", false)
    .orderBy("display_orders", "ASC")
    .build();
  const photos = await pool.query(photosQuery.query, photosQuery.parameters);

  return cleanFields({ ...article, photos: photos.rows });
}
//######################################################################## UPDATE ########################################################################
async function updateArticlesService(id, data, files = []) {
  const articleData = { ...data };
  delete articleData.photos;

  if (articleData.ht_price !== undefined && articleData.ht_price !== "") {
    articleData.ht_price = Math.round(Number(articleData.ht_price) * 100);
  }

  if (articleData.ttc_price !== undefined && articleData.ttc_price !== "") {
    articleData.ttc_price = Math.round(Number(articleData.ttc_price) * 100);
  }

  if (articleData.tva_price !== undefined && articleData.tva_price !== "") {
    articleData.tva_price = Number(articleData.tva_price);
  }

  const query = new TableBuilder("articles")
    .update(articleData)
    .where("id", "=", id)
    .build();

  const result = await pool.query(query.query, query.parameters);

  if (files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const photoData = {
        url_photo: files[i].location,
        display_orders: i,
        id_article: id,
      };
      await addUuidIfNeeded("photos", photoData);
      const photoQuery = new TableBuilder("photos").insert(photoData).build();
      await pool.query(photoQuery.query, photoQuery.parameters);
    }
  }

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
async function restoreService(id) {
  const builder = new TableBuilder("articles").update({ deleted: false });

  if (id) {
    builder.where("id", "=", id).where("deleted", "=", true);
  } else {
    builder.where("deleted", "=", true);
  }

  const query = builder.build();
  const result = await pool.query(query.query, query.parameters);

  if (id && result.rowCount === 0) {
    throw { status: 404, message: "Élément introuvable ou déjà actif" };
  }

  return {
    message: id
      ? `L'article avec l'id ${id} a bien été réactivé`
      : `Tous les articles ont bien été réactivés`,
    count: result.rowCount || result.rows.length,
  };
}
module.exports = {
  insertArticlesService,
  getAllArticlesService,
  getArticlesByIdService,
  getArticlesByUuidService,
  updateArticlesService,
  deleteArticlesService,
  addPhotosService,
  restoreService,
};
