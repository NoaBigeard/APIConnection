const fs = require("fs");
const path = require("path");

const accessLogPath = path.join(__dirname, "../Logs/access.log");
const errorLogPath = path.join(__dirname, "../Logs/error.log");

const logsDir = path.join(__dirname, "../Logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

function writeLog(filePath, message) {
  const date = new Date().toISOString();
  fs.appendFile(filePath, `[${date}] ${message}\n`, (err) => {
    if (err) console.error("Erreur écriture log:", err);
  });
}

function accessLog(req, res, next) {
  res.on("finish", () => {
    const user = req.user ? `user:${req.user.id}` : "non connecté";
    const message = `${req.method} ${req.originalUrl} - statusCode:${res.statusCode} - ${user} - ip:${req.ip}`;
    writeLog(accessLogPath, message);
  });
  next();
}

function errorLog(err, message) {
  writeLog(
    errorLogPath,
    `${err.status || 500} - ${message} - ${err.stack || ""}`,
    
  );
    // writeLog(errorLogPath, `${err.status || 500} - ${message}`);

}

module.exports = { accessLog, errorLog };
