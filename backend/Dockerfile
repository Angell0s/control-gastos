# Usamos una imagen oficial de Python ligera
FROM python:3.11-slim

# Evita que Python escriba archivos .pyc y fuerza el output a la consola
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Instalamos dependencias del sistema necesarias para compilar ciertas librerías
# (libpq-dev es útil para postgres, aunque uses el binario, es buena práctica)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiamos solo el requirements.txt primero (para aprovechar el caché de Docker)
COPY requirements.txt .

# Instalamos las dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del código
COPY . .

# Exponemos el puerto
EXPOSE 8000

# El comando de inicio ya está en el docker-compose, pero este es un buen default
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]