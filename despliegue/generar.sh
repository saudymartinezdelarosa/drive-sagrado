#!/usr/bin/env bash
# Genera el despliegue simplificado para pegar en el editor de Apps Script:
# un solo Codigo.gs con todos los .gs de src/, más los .html y appsscript.json.
# Uso: bash despliegue/generar.sh
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=despliegue/archivos
rm -rf "$OUT" && mkdir -p "$OUT"
{
  echo "/**"
  echo " * SIGESC · Código del servidor en un solo archivo (generado desde src/*.gs)."
  echo " * No editar aquí: editar src/ y volver a ejecutar despliegue/generar.sh."
  echo " * Commit de origen: $(git rev-parse --short HEAD)"
  echo " */"
  for f in Config Main $(ls src/*.gs | xargs -n1 basename | sed 's/\.gs$//' | grep -vx -e Config -e Main); do
    echo
    echo "/* ======================================================================"
    echo " *  $f.gs"
    echo " * ====================================================================== */"
    echo
    cat "src/$f.gs"
  done
} > "$OUT/Codigo.gs"
cp src/Index.html src/Estilos.html src/App.html src/appsscript.json "$OUT/"
echo "Listo en $OUT:"; ls -l "$OUT"
