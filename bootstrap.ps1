# === bootstrap.ps1 (PowerShell) ===
$ErrorActionPreference = "Stop"

# Ruta raíz del proyecto (carpeta donde está este script)
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $base

function Write-File($Path, $Content) {
  New-Item -ItemType Directory -Force -Path (Split-Path $Path) | Out-Null
  Set-Content -Path $Path -Value $Content -NoNewline -Encoding UTF8
}

# ---------- Crear raíz del monorepo ----------
$root = Join-Path $base "app"
New-Item -ItemType Directory -Force -Path $root | Out-Null

Write-File "$root\package.json" @"
{
  "name": "app",
  "private": true,
  "packageManager": "pnpm@8.15.4",
  "workspaces": ["frontend", "backend/gateway"]
}
"@

Write-File "$root\pnpm-workspace.yaml" @"
packages:
  - "frontend"
  - "backend/gateway"
"@

Write-File "$root\.gitignore" @"
node_modules
dist
.next
.env
.DS_Store
minio-data
"@

Write-File "$root\.env.example" @"
# FRONTEND
NEXT_PUBLIC_APP_NAME=SocialX
GATEWAY_URL=http://localhost:8080

# BACKEND GATEWAY
PORT=8080
CORS_ORIGINS=http://localhost:3000
RATE_LIMIT_IP_MAX=1000
RATE_LIMIT_SENSITIVE_MAX=10
REDIS_URL=redis://localhost:6379

# JWT / JWKS (ES256) - colocar clave real en producción
JWT_JWKS={"keys":[{"kty":"EC","crv":"P-256","x":"REEMPLAZAR","y":"REEMPLAZAR","alg":"ES256","use":"sig","kid":"k1"}]}

# S3 / MinIO (dev)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=app-media
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_USE_PATH_STYLE=true
"@

# ---------- Frontend ----------
$fe = Join-Path $root "frontend"
New-Item -ItemType Directory -Force -Path "$fe\pages\feed","$fe\pages\api\bff","$fe\lib" | Out-Null

Write-File "$fe\package.json" @"
{
  "name": "frontend",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  },
  "devDependencies": {
    "@types/node": "20.11.30",
    "@types/react": "18.2.66",
    "typescript": "5.4.5"
  }
}
"@

Write-File "$fe\tsconfig.json" @"
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "incremental": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "types": ["node"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
"@

Write-File "$fe\next.config.mjs" @"
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: https:",
              "media-src 'self' blob: https:",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'strict-dynamic'",
              "connect-src 'self' https:",
              "frame-ancestors 'none'"
            ].join("; ")
          }
        ]
      }
    ];
  }
};
export default nextConfig;
"@

Write-File "$fe\middleware.ts" @"
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const rid = req.headers.get("x-request-id") || crypto.randomUUID();
  res.headers.set("x-request-id", rid);

  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("token")?.value || req.headers.get("authorization");
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
  }
  return res;
}
"@

Write-File "$fe\lib\http.ts" @"
export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.get("x-request-id")) headers.set("x-request-id", crypto.randomUUID());
  const r = await fetch(`/api/bff${path}`, { ...init, headers });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
"@

Write-File "$fe\pages\api\bff\feed.ts" @"
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const qs = req.url?.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  const url = `${process.env.GATEWAY_URL}/v1/feed${qs}`;
  const r = await fetch(url, {
    method: req.method,
    headers: {
      "Authorization": req.headers.authorization || "",
      "X-Request-Id": (req.headers["x-request-id"] as string) || crypto.randomUUID(),
      "Content-Type": "application/json"
    },
    body: req.method !== "GET" ? JSON.stringify(req.body || {}) : undefined
  });
  res.status(r.status);
  r.headers.forEach((v, k) => { if (k.toLowerCase() === "content-type") res.setHeader(k, v); });
  res.send(await r.text());
}
"@

Write-File "$fe\pages\feed\index.tsx" @"
import { GetServerSideProps } from "next";

type Post = { id: string; text: string; createdAt: string };

export default function FeedPage({ posts }: { posts: Post[] }) {
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Feed</h1>
      {posts.length === 0 && <p>Sin publicaciones.</p>}
      {posts.map(p => (
        <article key={p.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 12, opacity: .6 }}>{new Date(p.createdAt).toLocaleString()}</div>
          <p>{p.text}</p>
        </article>
      ))}
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cursor = typeof query.cursor === "string" ? `?cursor=${encodeURIComponent(query.cursor)}` : "";
  const r = await fetch(`${process.env.GATEWAY_URL}/v1/feed${cursor}`, {
    headers: { "Authorization": req.headers.authorization || "", "X-Request-Id": (req.headers["x-request-id"] as string) || "" }
  });
  const data = await r.json().catch(() => ({ items: [] }));
  return { props: { posts: data.items || [] } };
};
"@

# ---------- Backend / Gateway ----------
$gw = Join-Path $root "backend\gateway"
New-Item -ItemType Directory -Force -Path "$gw\src\plugins","$gw\src\routes" | Out-Null

Write-File "$gw\package.json" @"
{
  "name": "gateway",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node --enable-source-maps dist/index.js",
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "3.609.0",
    "@aws-sdk/s3-presigned-post": "3.609.0",
    "@fastify/cors": "10.0.1",
    "@fastify/helmet": "12.1.1",
    "@fastify/rate-limit": "10.1.1",
    "fastify": "4.26.2",
    "ioredis": "5.3.2",
    "pino": "9.0.0"
  },
  "devDependencies": {
    "@types/node": "20.11.30",
    "tsx": "4.7.0",
    "typescript": "5.4.5"
  }
}
"@

Write-File "$gw\tsconfig.json" @"
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
"@

Write-File "$gw\src\index.ts" @"
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { requestIdPlugin } from "./plugins/request-id.js";
import health from "./routes/health.js";
import auth from "./routes/auth.js";
import feed from "./routes/feed.js";
import media from "./routes/media.js";

const app = Fastify({ logger: { level: "info" } });

// CORS allowlist
const allowed = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
await app.register(cors, {
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
  credentials: true
});

// WAF/Headers
await app.register(helmet, {
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "blob:", "https:"],
      scriptSrc: ["'self'", "'strict-dynamic'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https:"],
      frameAncestors: ["'none'"]
    }
  },
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  crossOriginEmbedderPolicy: false
});

// Rate limit
await app.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_IP_MAX || 1000),
  timeWindow: "1 minute",
  ban: 1
});

app.register(requestIdPlugin);
app.register(health, { prefix: "/health" });
app.register(auth, { prefix: "/v1/auth" });
app.register(feed, { prefix: "/v1" });
app.register(media, { prefix: "/v1/media" });

const port = Number(process.env.PORT || 8080);
app.listen({ port, host: "0.0.0.0" }).catch(err => {
  app.log.error(err);
  process.exit(1);
});
"@

Write-File "$gw\src\plugins\request-id.ts" @"
import { FastifyPluginAsync } from "fastify";

export const requestIdPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (req, reply) => {
    const id = (req.headers["x-request-id"] as string) || crypto.randomUUID();
    reply.header("x-request-id", id);
  });
};
"@

Write-File "$gw\src\routes\health.ts" @"
import { FastifyPluginAsync } from "fastify";
const plugin: FastifyPluginAsync = async (app) => {
  app.get("/", async () => ({ ok: true, ts: new Date().toISOString() }));
};
export default plugin;
"@

Write-File "$gw\src\routes\auth.ts" @"
import { FastifyPluginAsync } from "fastify";

const plugin: FastifyPluginAsync = async (app) => {
  app.get("/.well-known/jwks.json", async () => {
    if (!process.env.JWT_JWKS) return app.httpErrors.internalServerError("JWT_JWKS faltante");
    return JSON.parse(process.env.JWT_JWKS);
  });
};
export default plugin;
"@

Write-File "$gw\src\routes\feed.ts" @"
import { FastifyPluginAsync } from "fastify";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const plugin: FastifyPluginAsync = async (app) => {
  app.get("/feed", async () => {
    return { items: [], cursor: null };
  });

  app.post<{ Body: { text: string } }>("/feed", async (req, reply) => {
    const key = (req.headers["x-idempotency-key"] as string) || "";
    if (!key) return app.httpErrors.badRequest("X-Idempotency-Key requerido");
    const cacheKey = `idem:/v1/feed:${key}`;
    const cached = await redis.get(cacheKey);
    if (cached) return reply.header("x-idempotent-replay", "1").send(JSON.parse(cached));
    const post = { id: crypto.randomUUID(), text: req.body.text, createdAt: new Date().toISOString() };
    const resp = { post };
    await redis.setex(cacheKey, 24 * 3600, JSON.stringify(resp));
    return resp;
  });
};
export default plugin;
"@

Write-File "$gw\src\routes\media.ts" @"
import { FastifyPluginAsync } from "fastify";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY || "", secretAccessKey: process.env.S3_SECRET_KEY || "" },
  forcePathStyle: process.env.S3_USE_PATH_STYLE === "true"
});

const plugin: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { key?: string; contentType: string; size: number } }>("/upload/presign", async (req) => {
    const { contentType, size } = req.body;
    if (!contentType) return app.httpErrors.badRequest("contentType requerido");
    if (size > 512 * 1024 * 1024) return app.httpErrors.badRequest("archivo demasiado grande");
    const key = req.body.key || `u/${crypto.randomUUID()}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Conditions: [["content-length-range", 0, 512 * 1024 * 1024], ["starts-with", "$Content-Type", ""]],
      Fields: { "Content-Type": contentType },
      Expires: 600
    });

    const base = (process.env.S3_ENDPOINT || "").replace(/\/+$/, "");
    const publicUrl = `${base}/${process.env.S3_BUCKET}/${key}`;
    return { url, fields, publicUrl, expiresInSeconds: 600 };
  });
};
export default plugin;
"@

# ---------- Infra (Docker Compose dev) ----------
$infra = Join-Path $root "infra"
New-Item -ItemType Directory -Force -Path "$infra\k8s\gateway","$infra\sql\ledger" | Out-Null

Write-File "$infra\docker-compose.dev.yml" @"
version: "3.9"
services:
  redis:
    image: redis:7
    ports: ["6379:6379"]
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]
    volumes: ["./minio-data:/data"]
  create-bucket:
    image: minio/mc
    depends_on: [minio]
    entrypoint: >
      /bin/sh -c "
      sleep 2;
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb -p local/app-media || true;
      "
"@

Write-File "$root\README_RUN.txt" @"
1) Instalar Node.js 20 LTS y Docker Desktop.
2) PowerShell: npm i -g pnpm
3) cd app
4) Copy-Item .env.example .env
5) docker compose -f .\infra\docker-compose.dev.yml up -d
6) pnpm install
7) pnpm --filter gateway dev
8) (otra consola) pnpm --filter frontend dev
9) Abrir: http://localhost:3000/feed
"@

Write-Host "Listo: estructura creada en $root"
