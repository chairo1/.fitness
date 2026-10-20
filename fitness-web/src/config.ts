// The same build serves the user app and the admin panel; the "admin." subdomain selects the panel.
const ADMIN_PREFIX = 'admin.';

export const IS_ADMIN_HOST = window.location.hostname.startsWith(ADMIN_PREFIX);

const withHost = (hostname: string) => {
  const { protocol, port } = window.location;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

export const adminUrl = () =>
  import.meta.env.VITE_ADMIN_URL ??
  (IS_ADMIN_HOST ? window.location.origin : withHost(ADMIN_PREFIX + window.location.hostname));

export const appUrl = () =>
  import.meta.env.VITE_APP_URL ??
  (IS_ADMIN_HOST ? withHost(window.location.hostname.slice(ADMIN_PREFIX.length)) : window.location.origin);
