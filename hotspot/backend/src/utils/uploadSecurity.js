const path = require('path');
const appConfig = require('../config/app');

const IMAGE_MIMES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const VIDEO_MIMES = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const LOGO_MIMES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function validateUploadFile(file, { allowedMimes, maxBytes, label = 'arquivo' }) {
  if (!file) return { ok: false, error: `Nenhum ${label} enviado.` };
  if (!allowedMimes[file.mimetype]) {
    return { ok: false, error: `Tipo não permitido: ${file.mimetype}` };
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  const expectedExt = allowedMimes[file.mimetype];
  if (ext && ext !== expectedExt && !(file.mimetype === 'image/jpeg' && ext === '.jpeg')) {
    return { ok: false, error: `Extensão ${ext} não corresponde ao MIME ${file.mimetype}` };
  }
  if (file.size > maxBytes) {
    return { ok: false, error: `${label} excede o tamanho máximo (${Math.round(maxBytes / 1024 / 1024)} MB).` };
  }
  return { ok: true, ext: expectedExt };
}

const campanhaRules = {
  allowedMimes: { ...IMAGE_MIMES, ...VIDEO_MIMES },
  maxBytes: appConfig.upload.maxVideoBytes,
};

const logoRules = {
  allowedMimes: LOGO_MIMES,
  maxBytes: appConfig.upload.maxLogoBytes,
};

module.exports = {
  IMAGE_MIMES,
  VIDEO_MIMES,
  LOGO_MIMES,
  validateUploadFile,
  campanhaRules,
  logoRules,
  MAX_IMAGE_BYTES: appConfig.upload.maxImageBytes,
  MAX_VIDEO_BYTES: appConfig.upload.maxVideoBytes,
};
