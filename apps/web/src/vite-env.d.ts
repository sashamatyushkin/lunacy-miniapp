/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_BOT_USERNAME?: string;
  readonly VITE_APP_SHORTNAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
