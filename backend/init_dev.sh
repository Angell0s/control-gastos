#!/usr/bin/env bash
set -e

echo "Inicializando entorno de desarrollo"

echo "Ejecutando migraciones Alembic"
alembic upgrade head
echo "Migraciones finalizadas correctamente"

if [[ "${WITH_DATA:-0}" == "1" || "$1" == "--with-data" || "$1" == "-d" ]]; then
  echo "Ejecutando script de inicialización de datos"
  python backend/initial_data.py
  echo "Datos iniciales cargados"
fi

echo "Arrancando proceso principal: $*"
exec "$@"
