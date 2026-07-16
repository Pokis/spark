FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/cloud-contracts/package.json packages/cloud-contracts/package.json
COPY services/control-plane/package.json services/control-plane/package.json
RUN npm install --ignore-scripts --no-audit --no-fund
COPY packages/cloud-contracts packages/cloud-contracts
COPY services/control-plane services/control-plane
RUN npm run build --workspace @spark/cloud-contracts \
  && npm run build --workspace @spark/control-plane \
  && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/cloud-contracts ./packages/cloud-contracts
COPY --from=build /app/services/control-plane/dist ./services/control-plane/dist
USER node
EXPOSE 8080
CMD ["node", "services/control-plane/dist/server.js"]
