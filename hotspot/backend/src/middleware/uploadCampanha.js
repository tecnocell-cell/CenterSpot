const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const UPLOAD_ROOT = path.join(__dirname, "../../uploads/campanhas");

const {
  IMAGE_MIMES,
  VIDEO_MIMES,
  validateUploadFile,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} = require("../utils/uploadSecurity");

const ALLOWED_MIMES = {
  ...Object.fromEntries(Object.entries(IMAGE_MIMES).map(([m, ext]) => [m, { tipo: "imagem", ext }])),
  ...Object.fromEntries(Object.entries(VIDEO_MIMES).map(([m, ext]) => [m, { tipo: "video", ext }])),
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const empresaId  = req.empresa_id;
    const campanhaId = req.params.id;
    const dir = path.join(UPLOAD_ROOT, String(empresaId), String(campanhaId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const meta = ALLOWED_MIMES[file.mimetype];
    const ext  = meta ? meta.ext : path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  },
});

function fileFilter(req, file, cb) {
  const check = validateUploadFile(file, {
    allowedMimes: { ...IMAGE_MIMES, ...VIDEO_MIMES },
    maxBytes: MAX_VIDEO_BYTES,
    label: "mídia da campanha",
  });
  if (!check.ok) cb(new Error(check.error));
  else cb(null, true);
}

const uploadCampanha = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_VIDEO_BYTES }, // 50 MB global; controller enforces per-type
});

module.exports = { uploadCampanha, ALLOWED_MIMES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, UPLOAD_ROOT };
