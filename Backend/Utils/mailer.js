//Brevo
const SibApiV3Sdk = require("sib-api-v3-sdk");

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const api = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendMailInscription({ mail, code }) {
  await api.sendTransacEmail({
    sender: { email: "nooabigeard@gmail.com", name: "Ton Site" },
    to: [{ email: mail }],
    subject: "Valide ton compte",
    htmlContent:
      "<p>Afin de finaliser votre compte, merci d'effectuer la validation avec le code suivant : </p>" +
      `<h2>${code}</h2>`,
  });
}
async function sendMailResetPassword({ mail, token }) {
  await api.sendTransacEmail({
    sender: { email: "nooabigeard@gmail.com", name: "Ton Site" },
    to: [{ email: mail }],
    subject: "Réinitialiser votre mot de passe",
    htmlContent: `<p>Afin de réinitialiser votre mot de passe, veuillez suivre le lien suivant :</p>
   <a href="${process.env.LINK_FRONT}/reset?token=${token}">
     Réinitialiser mon mot de passe
   </a>`,
  });
}
module.exports = { sendMailInscription, sendMailResetPassword };
