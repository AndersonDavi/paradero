# Diseño

Paradero tiene un solo sistema de diseño. Cada medida, color y tipo de letra sale de `src/theme`, y `npm run check` falla si alguien escribe un número o un color suelto en una pantalla o un componente. Así la app se ve igual en cada pantalla, y quien llegue nuevo al código no tiene que adivinar.

## Tokens

Todo vive en `src/theme/tokens.ts` y `src/theme/colors.ts`.

| Token | Para qué | Ejemplo |
| --- | --- | --- |
| `space[n]` | Cuadrícula de 4 puntos. La llave es el paso: `space[4]` son 16 | `gap: space[3]` |
| `radius` | Esquinas: `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `sheet` 32 · `pill` | `borderRadius: radius.lg` |
| `size.icon` | Íconos: `xs` 12 · `sm` 16 · `md` 20 · `lg` 24 | `<Icon size="sm" />` |
| `size.control` | Alto de botones y campos: `sm` 36 · `md` 48 · `lg` 56 | `height: size.control.lg` |
| `size.tile`, `size.glyph` | Cuadros con glifo y el glifo que cabe en cada uno | `<Tile tier="lg" />` |
| `size.dot`, `size.line` | Puntos de estado y líneas | `borderWidth: size.line.rule` |
| `layout` | Medidas de pantalla: margen lateral, espacio para la barra de pestañas, mapa de detalle | `paddingBottom: layout.tabBarClearance` |
| `type` | Escala tipográfica: `poster`, `hero`, `heading`, `display`, `title`, `headline`, `body`, `callout`, `caption`, `eyebrow`, `chrome` | `<Text variant="title" />` |
| `usePalette()` | Colores del tema claro u oscuro | `p.text`, `p.surface`, `p.shadow` |
| `signal`, `systems`, `photo` | Puntos de estado, color de cada parte del sistema, texto sobre fotos | `signal.live` |

## Identidad

Paradero se viste con la identidad de Croma, la misma de usecroma.com:

- **Claro y oscuro.** Sigue al teléfono por defecto; en Bien público → Apariencia se puede fijar en Clara u Oscura (`src/lib/appearance.ts`). Claro es papel cálido (`#FDFCFC`) con tinta casi negra; oscuro es `#09090B` con superficies que se aclaran al acercarse.
- **Títulos que se desvanecen.** `poster`, `hero`, `heading` y `display` son Geist apretada y se desvanecen hacia abajo, de `p.text` a `p.fadeTo`. `Text` lo hace solo.
- **Etiquetas en mono.** `eyebrow` es Geist Mono en mayúsculas con espaciado ancho.
- **El marco.** `chrome` es Victor Mono en mayúsculas: `+ Infraestructura de datos públicos`, `usecroma.com +`.
- **Rutas como etiquetas.** Borde fino y letra mono; la próxima en llegar va sólida.
- **Bordes antes que sombras.** Las tarjetas se separan con un borde fino.

## Movimiento

Nada rebota. Todo entra con una curva que se asienta (`src/theme/motion.ts`): `motion.enter` para contenido que llega, `motion.appear` para superficies, `motion.layout` para filas que cambian de lugar. Sin resortes. Y con "Reducir movimiento" activo, nada se mueve.

## Accesibilidad

Paradero es para todas las personas de Bogotá, así que la accesibilidad no es un modo aparte: es el diseño. La meta es WCAG 2.2 AA, la que exige la Resolución 1519 de 2020 a los servicios digitales del Estado, y AAA en alto contraste.

| Ajuste del teléfono | Qué hace Paradero | Dónde |
| --- | --- | --- |
| Más contraste (iOS) / Texto de alto contraste (Android) | Cambia a la paleta de alto contraste: negro y blanco puros, sin desvanecidos, bordes visibles. También se puede activar solo en Paradero | `usePalette`, `HIGH_LIGHT`, `HIGH_DARK` |
| Tamaño de texto | Todo el texto crece. Desde los tamaños de accesibilidad, las filas se apilan en vez de apretarse | `useLargeText`, `NextBus`, `ArrivalRow` |
| Texto en negrita | Cada peso sube un paso, porque las fuentes propias no lo hacen solas | `Text` |
| Reducir movimiento | Sin pulsos, sin dígitos que ruedan, sin animaciones de entrada | `Dot`, `Minutes`, Reanimated |
| Reducir transparencia | El vidrio se vuelve una superficie sólida | `Glass` |
| VoiceOver / TalkBack | Frases completas, títulos marcados como encabezados, el mapa se oculta porque la lista dice lo mismo, avisos al guardar | `accessibilityLabel`, `announce` |

Reglas:

- `npm run check` mide el contraste de cada paleta. Un color que falle no pasa.
- Todo lo que se toca mide al menos 44 puntos, aunque se vea más pequeño (`hitSlop`).
- Botones y chips crecen con el texto (`minHeight`, nunca `height`).
- El color nunca es la única señal: cada punto de estado va con su texto.

## Tipografía

**Geist** para la interfaz y los títulos, **Geist Mono** para las etiquetas y las rutas, **Victor Mono** para el marco. Todas vienen con la SIL Open Font License. Monoblock, la fuente de etiquetas de Croma, no se incluye porque su licencia no permite redistribuirla en un repositorio abierto.

## Componentes

Antes de escribir estilos, usa lo que ya existe:

| Componente | Uso |
| --- | --- |
| `Text` | Todo texto. Nunca `fontSize` a mano |
| `Button` | `primary`, `secondary`, `quiet`; alto `md` o `lg` |
| `Chip` | Filtros y sugerencias |
| `Tile` | Cuadro con un glifo o ícono; `StopTile` para paraderos |
| `Rail` | Fila horizontal de tarjetas, con espacio para que la sombra no se corte |
| `DetailScreen` | Mapa arriba y hoja de detalle encima, para paraderos y rutas |
| `Minutes` | Minutos que ruedan; `sm`, `md`, `lg`, alineados a la línea base |
| `RouteBadge`, `Dot`, `Icon`, `Bone`, `SkeletonList`, `Empty`, `FeedStatus` | Piezas pequeñas compartidas |

## Reglas

- Si una medida no existe, se agrega al token con un nombre de rol, no se escribe en la pantalla.
- Las sombras necesitan espacio: dentro de un `ScrollView` horizontal usa `Rail`.
- El texto nunca tiene alto fijo; las tarjetas crecen con su contenido.
- Lo que carga ocupa el mismo espacio que lo que llega (`Bone`), para que nada salte.
- Cada elemento que se toca tiene `accessibilityRole` y una etiqueta completa en español.
