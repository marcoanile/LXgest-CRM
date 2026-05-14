function missingEnv(name) {
  const value = process.env[name];
  return !value || String(value).trim() === '' || String(value).includes('colocar_');
}

function requireEnv(names) {
  const missing = names.filter(missingEnv);
  if (missing.length) {
    const error = new Error(`Integração não configurada. Faltam variáveis: ${missing.join(', ')}`);
    error.status = 412;
    error.missing = missing;
    throw error;
  }
}

function integrationStatus() {
  return {
    openai: !missingEnv('OPENAI_API_KEY'),
    whatsapp: !missingEnv('WHATSAPP_TOKEN') && !missingEnv('WHATSAPP_PHONE_NUMBER_ID'),
    resend: !missingEnv('RESEND_API_KEY'),
    googlePlaces: !missingEnv('GOOGLE_PLACES_API_KEY'),
    apollo: !missingEnv('APOLLO_API_KEY'),
    hunter: !missingEnv('HUNTER_API_KEY'),
    meta: !missingEnv('META_ACCESS_TOKEN') && !missingEnv('META_PAGE_ID'),
    linkedin: !missingEnv('LINKEDIN_ACCESS_TOKEN') && !missingEnv('LINKEDIN_ORGANIZATION_URN')
  };
}

module.exports = { missingEnv, requireEnv, integrationStatus };
