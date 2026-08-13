# OAuth deployment configuration

The production login flow constructs its callback from `VITE_APP_ORIGIN`:

```text
https://YOUR_CANONICAL_DOMAIN/api/oauth/callback
```

Set `VITE_APP_ORIGIN` to one canonical HTTPS origin in the full-stack deployment. Do not use a temporary Vercel preview hostname unless that exact hostname has been added to the OAuth application's allowlist.

For the current deployment, the configured origin is:

```text
https://lunch-tracking-auym7kfc3-triet-finance-tracker.vercel.app
```

The OAuth provider must allow the domain and callback:

```text
lunch-tracking-auym7kfc3-triet-finance-tracker.vercel.app
https://lunch-tracking-auym7kfc3-triet-finance-tracker.vercel.app/api/oauth/callback
```

The Vercel or managed full-stack environment must also contain the existing OAuth variables, including `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, and `JWT_SECRET`. Never commit their values.

If the canonical production hostname changes, update `VITE_APP_ORIGIN`, the OAuth provider allowlist, and the deployment before testing login again. Preview deployments should use a stable preview domain or be added explicitly to the provider allowlist; arbitrary generated preview aliases are not reliable OAuth callback origins.
