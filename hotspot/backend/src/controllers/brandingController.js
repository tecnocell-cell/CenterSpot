const path = require('path');
const fs = require('fs');
const db = require('../../db');
const { DEFAULT_LOGO_URL, DEFAULT_FAVICON_URL, DEFAULT_EMPRESA_SLUG } = require('../constants/brandingDefaults');
const { audit } = require('../utils/audit');

function resolveBrandingRow(empresa) {
  if (!empresa) return null;
  return {
    empresa_id: empresa.id,
    empresa_nome: empresa.nome,
    empresa_slug: empresa.slug,
    logo_url: empresa.logo_url || DEFAULT_LOGO_URL,
    favicon_url: empresa.favicon_url || DEFAULT_FAVICON_URL,
    logo_custom: Boolean(empresa.logo_url),
    favicon_custom: Boolean(empresa.favicon_url),
    default_logo_url: DEFAULT_LOGO_URL,
    default_favicon_url: DEFAULT_FAVICON_URL,
  };
}

async function fetchEmpresaById(empresaId) {
  const [[row]] = await db.execute(
    'SELECT id, nome, slug, logo_url, favicon_url FROM empresas WHERE id = ?',
    [empresaId]
  );
  return row;
}

async function fetchEmpresaBySlug(slug) {
  const [[row]] = await db.execute(
    'SELECT id, nome, slug, logo_url, favicon_url FROM empresas WHERE slug = ? AND ativo = 1',
    [slug]
  );
  return row;
}

exports.getBranding = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    if (!empresaId) {
      return res.status(403).json({ message: 'Empresa não identificada' });
    }
    const empresa = await fetchEmpresaById(empresaId);
    if (!empresa) return res.status(404).json({ message: 'Empresa não encontrada' });
    res.json(resolveBrandingRow(empresa));
  } catch (err) {
    console.error('getBranding:', err);
    res.status(500).json({ message: 'Erro ao carregar identidade visual' });
  }
};

exports.getPublicBranding = async (req, res) => {
  try {
    const slug = req.params.slug || req.query.slug || DEFAULT_EMPRESA_SLUG;
    const empresa = await fetchEmpresaBySlug(slug);
    if (!empresa) {
      return res.json({
        empresa_slug: slug,
        logo_url: DEFAULT_LOGO_URL,
        favicon_url: DEFAULT_FAVICON_URL,
        logo_custom: false,
        favicon_custom: false,
        default_logo_url: DEFAULT_LOGO_URL,
        default_favicon_url: DEFAULT_FAVICON_URL,
      });
    }
    res.json(resolveBrandingRow(empresa));
  } catch (err) {
    console.error('getPublicBranding:', err);
    res.status(500).json({ message: 'Erro ao carregar branding' });
  }
};

async function saveBrandingUrl(empresaId, field, url) {
  const col = field === 'logo' ? 'logo_url' : 'favicon_url';
  await db.execute(`UPDATE empresas SET ${col} = ? WHERE id = ?`, [url, empresaId]);
}

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.empresa_id) return res.status(403).json({ message: 'Empresa não identificada' });
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });

    const url = `/uploads/branding/${req.file.filename}`;
    await saveBrandingUrl(req.empresa_id, 'logo', url);
    await audit.action(req, 'branding_logo', 'empresa', req.empresa_id, { logo_url: url });

    const empresa = await fetchEmpresaById(req.empresa_id);
    res.json({ success: true, ...resolveBrandingRow(empresa) });
  } catch (err) {
    console.error('uploadLogo:', err);
    res.status(500).json({ message: err.message || 'Erro ao enviar logo' });
  }
};

exports.uploadFavicon = async (req, res) => {
  try {
    if (!req.empresa_id) return res.status(403).json({ message: 'Empresa não identificada' });
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });

    const url = `/uploads/branding/${req.file.filename}`;
    await saveBrandingUrl(req.empresa_id, 'favicon', url);
    await audit.action(req, 'branding_favicon', 'empresa', req.empresa_id, { favicon_url: url });

    const empresa = await fetchEmpresaById(req.empresa_id);
    res.json({ success: true, ...resolveBrandingRow(empresa) });
  } catch (err) {
    console.error('uploadFavicon:', err);
    res.status(500).json({ message: err.message || 'Erro ao enviar favicon' });
  }
};

exports.removeLogo = async (req, res) => {
  try {
    if (!req.empresa_id) return res.status(403).json({ message: 'Empresa não identificada' });
    await saveBrandingUrl(req.empresa_id, 'logo', null);
    await audit.action(req, 'branding_logo_reset', 'empresa', req.empresa_id);
    const empresa = await fetchEmpresaById(req.empresa_id);
    res.json({ success: true, ...resolveBrandingRow(empresa) });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover logo' });
  }
};

exports.removeFavicon = async (req, res) => {
  try {
    if (!req.empresa_id) return res.status(403).json({ message: 'Empresa não identificada' });
    await saveBrandingUrl(req.empresa_id, 'favicon', null);
    await audit.action(req, 'branding_favicon_reset', 'empresa', req.empresa_id);
    const empresa = await fetchEmpresaById(req.empresa_id);
    res.json({ success: true, ...resolveBrandingRow(empresa) });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover favicon' });
  }
};

exports.getBrandingUploadDir = () => {
  const dir = path.join(__dirname, '../../../frontend/public/uploads/branding');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};
