const express = require('express');
const multer = require('multer');
const path = require('path');
const branding = require('../controllers/brandingController');
const { validateUploadFile, LOGO_MIMES, IMAGE_MIMES } = require('../utils/uploadSecurity');

const router = express.Router();

const FAVICON_MIMES = {
  ...IMAGE_MIMES,
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};

const uploadDir = branding.getBrandingUploadDir();

function makeStorage(kind) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext =
        kind === 'logo'
          ? LOGO_MIMES[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.png'
          : FAVICON_MIMES[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `empresa-${req.empresa_id}-${kind}-${Date.now()}${ext}`);
    },
  });
}

function fileFilter(kind) {
  return (req, file, cb) => {
    const allowed = kind === 'logo' ? LOGO_MIMES : FAVICON_MIMES;
    const maxBytes = kind === 'logo' ? 2 * 1024 * 1024 : 512 * 1024;
    const check = validateUploadFile(file, {
      allowedMimes: allowed,
      maxBytes,
      label: kind === 'logo' ? 'logo' : 'favicon',
    });
    if (!check.ok) cb(new Error(check.error));
    else cb(null, true);
  };
}

const uploadLogo = multer({
  storage: makeStorage('logo'),
  fileFilter: fileFilter('logo'),
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('logo');

const uploadFavicon = multer({
  storage: makeStorage('favicon'),
  fileFilter: fileFilter('favicon'),
  limits: { fileSize: 512 * 1024 },
}).single('favicon');

function handleUpload(middleware, handler) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || 'Upload inválido' });
      handler(req, res, next);
    });
  };
}

router.get('/', branding.getBranding);
router.post('/logo', handleUpload(uploadLogo, branding.uploadLogo));
router.post('/favicon', handleUpload(uploadFavicon, branding.uploadFavicon));
router.delete('/logo', branding.removeLogo);
router.delete('/favicon', branding.removeFavicon);

module.exports = router;
