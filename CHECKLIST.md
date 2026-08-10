# PinTori — Qué hacer al llegar a la computadora

## Antes de abrir Claude Code

1. Crea la carpeta del proyecto:
   ```
   mkdir pintori && cd pintori
   git init
   ```
2. Copia `SPEC.md` y `PROMPTS.md` a esa carpeta.
3. Abre la carpeta en VSCode.
4. Confirma que el MCP de Mobbin está conectado en Claude Code.

## Decisiones ya tomadas (no las vuelvas a pensar)

- **Nombre**: PinTori
- **Stack**: HTML + CSS + JS, Canvas API, jsPDF. Sin backend.
- **Hosting**: Cloudflare Pages, deploy desde GitHub
- **Tu máquina**: pin de 70 mm terminado, círculo de corte 85 mm
- **Hoja**: Carta y A4, ambas a 300 DPI
- **ML**: detección de rostro en el navegador para centrar el encuadre
- **Idioma**: español por defecto, inglés como opción

## Decisiones pendientes

- Dominio: `pintori.com` / `.app` propio, o `pintori.nomaderia.com`
- Si el repo va público desde el inicio (recomendado, es portafolio)

## Orden de trabajo

Sigue los prompts 0 a 8 en orden. No brinques al 4 sin haber hecho el 1 y 2 —
el diseño visual define cómo se construye el editor, no al revés.

Punto de control: al terminar el prompt 6, imprime una hoja de prueba en papel
normal y mide con regla. Si la escala falla ahí, arréglalo antes de seguir.

## Lo que NO va en la v1

Filtros, stickers, clipart, cuentas de usuario, compartir en redes, pedir pines
físicos, manejo de múltiples hojas. Todo eso infla el proyecto y no resuelve
ninguna queja real del mercado.

## Lo que hace diferente a PinTori

De lo que encontré del mercado, ninguna herramienta actual resuelve esto:

1. Regla de calibración impresa en la hoja
2. Zona de doblez visible mientras editas
3. Marcas de centro para el cortador
4. Aviso de resolución baja antes de imprimir
5. Sin cuenta, sin subir nada a un servidor
6. Encuadre automático por rostro

Si en algún momento dudas qué construir primero, construye lo de esta lista.
