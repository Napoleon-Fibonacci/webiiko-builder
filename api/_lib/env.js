"use strict";

function nilai(nama, bawaan = "") {
  const v = process.env[nama];
  return v === undefined || v === "" ? bawaan : v;
}

function wajib(nama) {
  const v = nilai(nama);
  if (!v) throw new Error(`Env ${nama} belum diisi.`);
  return v;
}

function batas(nama, bawaan) {
  const v = Number(nilai(nama, String(bawaan)));
  return Number.isFinite(v) && v > 0 ? v : bawaan;
}

const config = {
  get supabaseUrl() {
    return wajib("SUPABASE_URL").replace(/\/+$/, "");
  },
  get supabaseKey() {
    return wajib("SUPABASE_SERVICE_ROLE_KEY");
  },
  get appUrl() {
    return nilai("APP_URL", "http://localhost:3000").replace(/\/+$/, "");
  },
  get sessionSecret() {
    return wajib("SESSION_SECRET");
  },
  get googleId() {
    return wajib("GOOGLE_CLIENT_ID");
  },
  get googleSecret() {
    return wajib("GOOGLE_CLIENT_SECRET");
  },
  get gonkaBase() {
    return nilai(
      "GONKA_BASE_URL",
      "https://hskyauefqcgbvgvxkluj.supabase.co/functions/v1/gonka",
    ).replace(/\/+$/, "");
  },
  get gonkaKeys() {
    return nilai("GONKA_KEYS")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
  get gonkaModel() {
    return nilai("GONKA_MODEL");
  },
  get maxBuildsPerDay() {
    return batas("MAX_BUILDS_PER_DAY", 5);
  },
  get maxProjects() {
    return batas("MAX_PROJECTS", 3);
  },
  get maxSteps() {
    return batas("MAX_BUILD_STEPS", 8);
  },
  get maxTokensPerBuild() {
    return batas("MAX_TOKENS_PER_BUILD", 200000);
  },
  get maxTokensPerDay() {
    return batas("MAX_TOKENS_PER_DAY", 3000000);
  },
  get maxPromptChars() {
    return batas("MAX_PROMPT_CHARS", 2000);
  },
  get maxFileBytes() {
    return batas("MAX_FILE_BYTES", 60000);
  },
  get builderOff() {
    return nilai("BUILDER_OFF", "0") === "1";
  },
  get produksi() {
    return this.appUrl.startsWith("https://");
  },
};

module.exports = { config, nilai, wajib, batas };
