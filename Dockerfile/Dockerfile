FROM node:18-alpine

WORKDIR /app

# Package fayllarını kopyala
COPY ../package*.json ./
COPY ../prisma ./prisma/

# Dependencies qur
RUN npm install

# Prisma client yarat
RUN npx prisma generate

# Bütün kodu kopyala (ana qovluqdan)
COPY ../ .

# Port aç
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Tətbiqi başlat
CMD ["npm", "start"]