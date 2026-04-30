//Brevo
const SibApiV3Sdk = require("sib-api-v3-sdk");
const { TableBuilder } = require("../Model/generic.model");
const pool = require("../database/db");

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const api = new SibApiV3Sdk.TransactionalEmailsApi();

async function getMailTemplate(type, variables = {}) {
  const query = new TableBuilder("mail")
    .where("type", "=", type)
    .where("deleted", "=", false)
    .limit(1)
    .build();

  const {
    rows: [template],
  } = await pool.query(query.query, query.parameters);

  if (!template)
    throw { status: 404, message: `Template mail "${type}" introuvable` };

  let { subject, content } = template;

  Object.entries(variables).forEach(([key, value]) => {
    subject = subject.replaceAll(`{{${key}}}`, value);
    content = content.replaceAll(`{{${key}}}`, value);
  });

  return { subject, content };
}
async function sendMail({ mail, type, variables = {} }) {
  const { subject, content } = await getMailTemplate(type, variables);

  await api.sendTransacEmail({
    sender: {
      email: process.env.MAIL,
      name: process.env.WEBSITE_NAME || "Mon Site",
    },
    to: [{ email: mail }],
    subject,
    htmlContent: content,
  });
}

module.exports = { sendMail };
