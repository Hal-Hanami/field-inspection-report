/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the API of DESIGN §7 answers. Unset: the in-memory adapter (DESIGN §3.4). */
  readonly VITE_API_BASE_URL?: string;
}
