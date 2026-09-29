# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- production stage ----
FROM node:20-alpine AS production
ARG GIT_COMMIT=dev
ENV GIT_COMMIT=$GIT_COMMIT
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn-v*
COPY --from=build /app/dist ./dist
RUN mkdir -p uploads/slips
EXPOSE 3000
CMD ["node", "dist/main.js"]
