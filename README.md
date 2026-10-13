# SIGESC · Sistema de Gestión Documental del Politécnico

Portal web de control documental (alineado con ISO 9001), construido con **Google Apps Script**.
Los archivos se guardan en **Google Drive** y los metadatos en una **hoja de cálculo índice**.
Todo queda bajo la cuenta propietaria (Departamento de Calidad); el equipo entra solo por el portal,
con su propio usuario interno, sin cuentas de Google.

## Qué incluye

| Función | Detalle |
|---|---|
| Login interno | Usuario `nombre.apellido`. Todos empiezan con la misma clave genérica (un dígito) y el sistema les propone cambiarla. Las claves se guardan con sal y hash, nunca en claro. Bloqueo de 15 min tras 5 intentos fallidos. |
| Carpetas por departamento | Una carpeta raíz por área/puesto, creada automáticamente. Dentro, cada equipo crea libremente sus subcarpetas. La lista de áreas sigue abierta: se agregan desde *Administración → Áreas*. |
| Permisos por área y por rol | Acceso granular por área: OP1 (1er ciclo) **no** ve OP2 (2do ciclo) aunque compartan grupo. Los roles añaden alcance: Dirección puede abrir todas las áreas en solo lectura y un asistente no puede cambiar estados ni restaurar versiones. |
| Mapa de transparencia | Todos ven el mapa completo de áreas y carpetas. Las áreas sin acceso aparecen con candado y permiten **solicitar acceso**; la persona responsable lo aprueba en lectura o en edición. |
| Código SIGESC automático | `SIGESC-<ÁREA>-<AÑO>-<consecutivo>`, p. ej. `SIGESC-CAL-2026-0007`. |
| Responsable automático | Se toma del usuario que sube el archivo. |
| Estados ISO 9001 | Vigente / En revisión / Obsoleto. Al volver de «En revisión» a «Vigente» se reprograma la próxima revisión. |
| Versiones | Cada versión nueva conserva la anterior (en `_Sistema/_Versiones`). Cualquier versión se puede descargar o **restaurar**. |
| Historial y auditoría | Quién subió, modificó, vio o descargó cada documento y cuándo, con el detalle «antes → después». La auditoría completa se puede filtrar y exportar a CSV. |
| Buscador | Por código SIGESC, nombre, etiquetas, responsable y **contenido** del archivo (índice de texto completo de Drive: PDF, Word, Docs…). Solo muestra resultados de áreas a las que la persona tiene acceso. |
| Notificaciones | Campana en el portal y, si la persona registra su correo, aviso por email. Avisa de revisiones por vencer (30, 15, 7, 1 y 0 días, y cada semana si está vencida), documentos nuevos en el área, cambios de estado y solicitudes de acceso. |
| Envíos a Calidad | Cualquier área envía sus **informes, cronogramas**, planes, actas o evidencias al Departamento de Calidad sin necesitar acceso a la carpeta de Calidad: al subir el documento (casilla «Enviar también a Calidad») o desde la ficha (botón «Enviar a Calidad»). Calidad los ve en su **Bandeja de Calidad**, recibe aviso en la campana/correo y los marca como *Recibido* o los *Devuelve* con observaciones; quien envió recibe la respuesta. |
| Imprimir | Botón **Imprimir** en cada documento y versión: el portal lo convierte a PDF (Word, Excel, PowerPoint, PDF, imágenes y archivos de Google; las hojas de cálculo salen en horizontal y ajustadas al ancho). En el teléfono se abre el PDF para imprimir desde *Compartir → Imprimir*. Las listas (p. ej. la bandeja de Calidad) se imprimen limpias, en blanco y sin menús. |
| Panel de control | Totales por estado, próximas revisiones, documentos en revisión y actividad reciente. |
| Salud documental | % por área de documentos vigentes con la revisión al día. |
| Cronómetro de uso | Reloj visible desde 00:00:00 en cada ingreso. Acumula el tiempo por persona y por día; *Mi tiempo* muestra el histórico. Dirección y Calidad ven el del equipo. |
| Saludo | «Buenos días, [nombre]», la fecha y una frase que cambia cada día. También se dice en voz alta (se puede desactivar). |
| Diseño | Azul marino `#10204A` y dorado `#C9A227`, tipografía serif formal, botones con relieve suave, color pastel propio por área y **modo oscuro** con los colores institucionales invertidos. |
| PWA | «Drive Sagrado», instalable con ícono en la pantalla de inicio de Android y iPhone (carpeta `pwa/`). |

## Estructura

```
src/                     Proyecto de Apps Script
  appsscript.json        Manifiesto (zona horaria Santo Domingo; web app como propietaria)
  Config.gs              Áreas, usuarios, roles, frases y parámetros iniciales
  Main.gs                doGet(), setup() e instalación del disparador diario
  Auth.gs                Login, sesiones y claves
  Permisos.gs            Permisos por área + rol
  Carpetas.gs            Carpetas de área y subcarpetas
  Documentos.gs          Subida, versiones, estados, descarga y búsqueda
  Auditoria.gs           Registro de auditoría e historial por documento
  Notificaciones.gs      Campana, correo y avisos de vencimiento
  Uso.gs                 Cronómetro e histórico de uso
  Envios.gs              Envíos de informes y cronogramas a Calidad (bandeja)
  Panel.gs               Panel de control, mapa y salud documental
  Admin.gs               Usuarios, áreas, accesos y solicitudes
  Index.html / Estilos.html / App.html   Interfaz del portal
pwa/                     Contenedor PWA «Drive Sagrado» (se publica aparte, p. ej. en GitHub Pages)
```

## Instalación

> **Forma rápida:** la carpeta `despliegue/archivos/` trae todo el código del servidor combinado en un solo `Codigo.gs`, más los `.html` y el `appsscript.json`, listos para pegar en el editor. Pasos en `despliegue/LEEME.md`.

1. **Crear el proyecto.** En <https://script.google.com>, con la cuenta de Saudy, cree un proyecto nuevo y copie todos los archivos de `src/` (en *Configuración del proyecto*, active «Mostrar el archivo de manifiesto appsscript.json» para pegarlo).
   Otra opción es usar [clasp](https://github.com/google/clasp): `clasp create --type webapp --rootDir src`, y luego `clasp push`.
2. **(Opcional) Elegir la clave genérica.** En *Configuración del proyecto → Propiedades de script*, agregue `CLAVE_INICIAL` con el dígito elegido (1–9). Si no la define, se usa `1`.
3. **Ejecutar `setup()`** desde el editor y aceptar los permisos. Esto crea:
   - la carpeta raíz **«SIGESC · Gestión Documental»** en el Drive de la propietaria,
   - una carpeta por área (Orientación y Psicología agrupa 1er y 2do ciclo),
   - la hoja **«SIGESC · Índice de metadatos»** en `_Sistema/`,
   - los 11 usuarios iniciales y el disparador diario de avisos (7:00 a. m.).
   El registro de ejecución muestra los enlaces y la lista de usuarios. `setup()` se puede volver a ejecutar sin duplicar nada.
4. **Publicar.** *Implementar → Nueva implementación → Aplicación web*:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**

   Comparta la URL `/exec` con el equipo. El acceso real lo controla el login del portal.
5. **Servicio avanzado de Drive (para imprimir Word/Excel/PowerPoint).** El manifiesto ya lo declara (`Drive API v3`). Si copia los archivos a mano, en el editor vaya a *Servicios → Agregar un servicio → Drive API* (versión v3, identificador `Drive`). Después ejecute cualquier función (p. ej. `instalarDisparadores`) para aceptar los permisos nuevos.
6. **Actualizar la aplicación publicada.** Tras copiar los cambios: *Implementar → Administrar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar*. Así la URL `/exec` no cambia. Si crea una implementación nueva, la URL cambia y hay que ponerla en `pwa/config.js`.
7. **Logo oficial.** Suba el logo del Politécnico (PNG) a un lugar público, por ejemplo `pwa/icons/logo.png` en GitHub Pages, y defina la propiedad de script `LOGO_URL` con su dirección. Mientras tanto se muestra un escudo provisional.

### Usuarios iniciales

| Usuario | Persona | Área | Rol |
|---|---|---|---|
| `antonia.santana` | Antonia Santana | Dirección Académica | Dirección |
| `mariela.garcia` | Mariela García | Coordinación Académica | Coordinación |
| `raisiry.campusano` | Raisiry Campusano | Coord. de Asuntos Técnico-Profesionales | Coordinación |
| `saudy.martinez` | Saudy Martínez | Departamento de Calidad | Administración |
| `evelyn.romero` | Evelyn Romero | Encargada de Registro | Responsable |
| `jenny.herrera` | Jenny Herrera | Secretaría Académica | Responsable |
| `luisana.cepeda` | Luisana Cepeda | Asistente Académica | Asistente |
| `berkys.mendoza` | Berkys Mendoza | Recursos Humanos | Responsable |
| `ana.mena` | Ana Mena | Vinculación Laboral | Responsable |
| `kenia.leon` | Kenia León | Orientación y Psicología · 1er Ciclo | Responsable |
| `krismari.mejia` | Krismari Mejía de la Cruz | Orientación y Psicología · 2do Ciclo | Responsable |

El **Departamento de Pastoral** queda creado sin responsable. Cuando se conozca, se crea el usuario y se asigna desde *Administración*.

### Roles

| Rol | Abre todas las áreas (lectura) | Cambia estados | Restaura versiones | Aprueba accesos a su área | Administra / auditoría |
|---|---|---|---|---|---|
| Administración | ✔ (y edita todo) | ✔ | ✔ | ✔ (todas) | ✔ / ✔ |
| Dirección | ✔ | ✔ | ✔ | ✔ | — / ✔ |
| Coordinación | — | ✔ | ✔ | ✔ | — |
| Responsable de área | — | ✔ | ✔ | ✔ | — |
| Asistente | — | — | — | — | — |

Los roles se ajustan en `ROLES` (`Config.gs`). El acceso adicional a otras áreas se otorga por solicitud o desde *Administración → Accesos otorgados*.

## PWA «Drive Sagrado» (instalar en el teléfono)

Apps Script sirve el portal dentro de un marco de Google, en otro dominio, así que el navegador no acepta allí un `manifest` ni un *service worker*. Por eso `pwa/` es un contenedor ligero que se publica aparte y abre el portal a pantalla completa:

| Archivo | Para qué sirve |
|---|---|
| `pwa/manifest.json` | Nombre «Drive Sagrado», colores `#10204A`, modo `standalone`, íconos de 192 y 512 px. |
| `pwa/sw.js` | Guarda los archivos esenciales del contenedor (HTML, manifest, íconos) para que abra con conexión inestable, y cumple el requisito del navegador para ofrecer «Instalar». El portal y los documentos **no** se guardan en caché: siempre se piden en línea, para respetar permisos y auditoría. |
| `pwa/index.html` | Enlaza el manifest, registra el service worker, incluye las etiquetas para iPhone (`apple-touch-icon`, `apple-mobile-web-app-capable`) y muestra una barra discreta «Instalar» (en iPhone indica *Compartir → Agregar a pantalla de inicio*). |
| `pwa/config.js` | La URL `/exec` de la aplicación web de Apps Script. |
| `pwa/icons/` | `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180 px). |

Pasos:

1. Edite `pwa/config.js` y pegue la URL `/exec` de la aplicación web.
2. Publique la carpeta `pwa/` en un hosting estático con HTTPS (por ejemplo GitHub Pages). El service worker exige HTTPS.
3. Abra esa dirección en el teléfono. En Android/Chrome aparece **Instalar**. En iPhone (Safari): **Compartir → Agregar a pantalla de inicio**.

**Íconos:** se generaron a partir del logo oficial del Politécnico Salesiano Sagrado Corazón de Jesús (`pwa/icons/logo-oficial.png`). Para los íconos de 192, 512 y 180 px se usa el emblema salesiano centrado sobre blanco, dentro de la zona segura, para que Android pueda recortarlo en círculo sin cortarlo; el texto del logo no sería legible a ese tamaño. `pwa/icons/logo.png` es el logo completo con texto. Una vez publicada la carpeta `pwa/`, su dirección (p. ej. `https://<usuario>.github.io/drive-sagrado/icons/logo.png`) puede usarse como propiedad de script `LOGO_URL` para que el portal muestre el logo oficial. Si cambia los íconos, suba el número de versión de `CACHE` en `pwa/sw.js` para que los teléfonos tomen los nuevos.

## Seguridad y límites

- La clave genérica de un dígito es débil: conviene que cada persona la cambie en su primer ingreso (el portal lo propone y la administración ve quién sigue con la clave genérica).
- Las sesiones expiran tras 6 h sin actividad. Todas las acciones validan la sesión y los permisos en el servidor.
- Las funciones de mantenimiento (`setup`, `instalarDisparadores`) solo se ejecutan desde el editor por la cuenta propietaria.
- Tamaño máximo por archivo: 25 MB (`CONFIG.TAMANO_MAXIMO_MB`).
- No se eliminan documentos: siguiendo el control documental de ISO 9001, se marcan como **Obsoleto**, de modo que conservan su historial.
- Los avisos por correo usan la cuota de MailApp de la cuenta propietaria (100 por día en cuentas personales de Gmail).
