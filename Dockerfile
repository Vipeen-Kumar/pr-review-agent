FROM node:lts-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev && npm cache clean --force

COPY env-loader.js ./
COPY server.js ./
COPY gemini.js ./
COPY config ./config
COPY controllers ./controllers
COPY models ./models
COPY repositories ./repositories
COPY routes ./routes
COPY services ./services
COPY storage ./storage
COPY utils ./utils
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]