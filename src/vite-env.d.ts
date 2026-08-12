/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENGRAVING_API_URL: string;
  readonly VITE_ACCESS_TOKEN: string;
  readonly VITE_ASSOCIATE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
