# Built from the repo root:  docker build -f apps/gateway/Dockerfile -t careerforge-gateway .
FROM node:22-alpine
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/config ./packages/config
COPY apps/gateway ./apps/gateway
RUN pnpm install --filter @careerforge/gateway... --frozen-lockfile --prod=false
WORKDIR /repo/apps/gateway
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
USER node
CMD ["pnpm", "start"]
