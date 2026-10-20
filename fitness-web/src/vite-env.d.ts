/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Overrides the derived "admin." URL, e.g. https://admin.example.com */
  readonly VITE_ADMIN_URL?: string;
  readonly VITE_APP_URL?: string;
}
