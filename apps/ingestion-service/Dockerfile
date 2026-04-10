FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

ENV NODE_ENV=production
ENV PORT=3040

EXPOSE 3040

CMD ["node", "server.js"]
