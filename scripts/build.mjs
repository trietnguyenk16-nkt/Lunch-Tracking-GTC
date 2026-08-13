import { mkdir, writeFile } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await writeFile(
  "dist/index.html",
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lunch Tracking GTC</title>
  </head>
  <body>
    <main>
      <h1>Lunch Tracking GTC</h1>
      <p>The service is deployed. The settlement health endpoint is available at <a href="/api/health">/api/health</a>.</p>
    </main>
  </body>
</html>
`,
);
