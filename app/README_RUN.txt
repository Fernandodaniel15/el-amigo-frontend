1) Instalar Node.js 20 LTS y Docker Desktop.
2) PowerShell: npm i -g pnpm
3) cd app
4) Copy-Item .env.example .env
5) docker compose -f .\infra\docker-compose.dev.yml up -d
6) pnpm install
7) pnpm --filter gateway dev
8) (otra consola) pnpm --filter frontend dev
9) Abrir: http://localhost:3000/feed