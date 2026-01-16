# Usamos Node.js LTS
FROM node:20-slim

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto de Next.js
EXPOSE 3000

# El comando de inicio ya está en el docker-compose
CMD ["npm", "run", "dev"]