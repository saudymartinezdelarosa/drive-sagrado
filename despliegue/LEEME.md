# Despliegue simplificado de SIGESC en Apps Script

La carpeta `archivos/` tiene todo lo necesario para pegar directo en el editor de Apps Script:

| Archivo en `archivos/` | Nombre en el editor | Tipo |
|---|---|---|
| `Codigo.gs` | `Codigo` | Script (.gs), con **todos** los .gs de `src/` combinados |
| `Index.html` | `Index` | HTML |
| `Estilos.html` | `Estilos` | HTML |
| `App.html` | `App` | HTML |
| `appsscript.json` | `appsscript.json` | Manifiesto |

Los nombres de los HTML deben ser exactamente `Index`, `Estilos` y `App`, porque el código los busca por ese nombre.

Para volver a generar estos archivos tras un cambio en `src/`: `bash despliegue/generar.sh`.

## Orden de los pasos

1. **Copia de seguridad (recomendado).** En el editor: *Descripción general → Hacer una copia*. Si algo sale mal, se vuelve a la copia.
2. **Mostrar el manifiesto.** *Configuración del proyecto (engranaje) → marcar «Mostrar el archivo de manifiesto "appsscript.json" en el editor»*.
3. **Borrar los .gs anteriores.** En *Archivos*, elimine `Main.gs`, `Config.gs`, `Auth.gs`, `Db.gs`, `Documentos.gs`, `Panel.gs`, `Admin.gs`, `Auditoria.gs`, `Carpetas.gs`, `Notificaciones.gs`, `Permisos.gs`, `Uso.gs` (y `Envios.gs` si existiera). **Es obligatorio:** si quedan, las funciones se duplican y Apps Script puede usar la versión vieja.
4. **Crear `Codigo.gs`.** *Archivos → + → Secuencia de comandos*, nombre `Codigo`. Borre lo que trae y pegue todo `Codigo.gs`.
5. **Reemplazar los HTML.** Abra `Index`, `Estilos` y `App`, seleccione todo (Ctrl+A), borre y pegue el contenido nuevo de cada uno.
6. **Reemplazar `appsscript.json`.** Pegue el contenido nuevo. Ya trae activado el servicio **Drive API v3** (identificador `Drive`). Al guardar, debe aparecer «Drive» en *Servicios* a la izquierda. Si no aparece: *Servicios → + → Drive API → versión v3 → identificador `Drive` → Agregar*.
7. **Guardar** (Ctrl+S) y comprobar que no salen errores.
8. **Ejecutar `instalarDisparadores`.** Elija la función en la barra superior y pulse *Ejecutar*. Acepte los permisos nuevos (Drive avanzado y conexión externa, usados para convertir Word/Excel a PDF al imprimir). Esto también reinstala el aviso diario de revisiones de las 7:00. **No hace falta ejecutar `setup()`**: la pestaña nueva `Envios` de la hoja índice se crea sola la primera vez que se usa (si lo ejecuta, no pasa nada: no duplica datos).
9. **Publicar la versión nueva sin cambiar el enlace.** *Implementar → Administrar implementaciones → lápiz (editar) → Versión: «Nueva versión» → Implementar*. La URL `/exec` sigue siendo la misma. No use «Nueva implementación»: crea otra URL y la app del teléfono dejaría de abrir la correcta.
10. **Probar.**
    - Entrar como `krismari.mejia` → *Inicio → Enviar informe a Calidad* → elegir archivo → *Guardar y enviar*.
    - Entrar como `saudy.martinez` → pestaña *Bandeja de Calidad* → debe estar el envío → probar *Imprimir*, *Recibido* y *Devolver*.
    - Abrir un Word o un Excel → *Imprimir* → debe abrirse como PDF.
