const multer = require("multer");
const multerS3 = require("multer-s3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const {
  S3Client,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_CREDENTIALS_KEY,
    secretAccessKey: process.env.AWS_CREDENTIALS_SECRET,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET,
    // Pas d'ACL public : le bucket a "Block Public Access" (BlockPublicAcls) activé,
    // donc tout PutObject avec acl: "public-read" est rejeté (AccessDenied).
    // L'objet est créé en privé ; l'accès public se gère via une bucket policy.
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${uuidv4()}${ext}`;
      cb(null, filename);
    },
  }),
});

async function uploadAWSService(file) {
  return {
    message: "Fichier uploadé avec succès",
    filename: file.key,
    url: file.location,
    size: file.size,
    mimetype: file.mimetype,
    bucket: file.bucket,
  };
}
module.exports = { upload, uploadAWSService };
