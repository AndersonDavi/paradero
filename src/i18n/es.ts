/**
 * Spanish is the source language. Every other language mirrors this shape, so a missing
 * key fails the type check instead of showing up blank on someone's phone.
 */
export const es = {
  tabs: { nearby: "Cerca", saved: "Guardados", about: "Bien público", search: "Buscar" },

  time: {
    now: "Ya",
    min: "min",
    arriving: "Llegando",
    unknown: "sin hora estimada",
    secondsAgo: (s: number) => `hace ${s} s`,
    minutesAgo: (m: number) => `hace ${m} min`,
    hoursAgo: (h: number) => `hace ${h} h`,
    sinceDay: (day: string, time: string) => `el ${day}, ${time}`,
    walk: (m: number, minutes: number) => `${m} m · ${minutes} min a pie`,
    km: (km: string) => `${km} km`,
    greeting: { night: "Buenas noches", morning: "Buenos días", afternoon: "Buenas tardes" },
  },

  pace: {
    estimated: "Estimado en vivo",
    scheduled: "Según horario",
    onTime: "A tiempo",
    late: (m: number) => `${m} min tarde`,
    early: (m: number) => `${m} min antes`,
  },

  speech: {
    route: (code: string) => `Ruta ${code}`,
    or: " o ",
    arriving: "está llegando",
    arrivesIn: (m: number) => `llega en ${m} ${m === 1 ? "minuto" : "minutos"}`,
    arrival: (route: string, toward: string, when: string, pace: string) => `${route}, hacia ${toward}, ${when}. ${pace}.`,
    nextBus: (arrival: string) => `Próximo bus. ${arrival}`,
    savedCard: (title: string, lines: string[]) => [title, ...lines].join(". "),
    savedLine: (code: string, when: string) => `${code}, ${when}`,
    stop: (kind: string, name: string, meters: number | null, routes: number) =>
      `${kind} ${name}${meters ? `, a ${meters} metros` : ""}. ${routes} ${routes === 1 ? "ruta" : "rutas"}.`,
    loading: "Cargando",
  },

  feed: {
    live: "En vivo",
    scheduled: "Horario programado",
    updated: (since: string) => `Actualizado ${since}`,
    notPublishing: "TransMilenio no está publicando posiciones",
    noLive: "sin datos en vivo",
    noLiveSince: (since: string) => `Sin datos en vivo. Última actualización ${since}. Usamos el horario publicado.`,
  },

  systems: {
    troncal: "TransMilenio",
    dual: "Dual",
    zonal_urbano: "SITP zonal",
    alimentador: "Alimentador",
    zonal_complementario: "Complementario",
    zonal_especial: "Especial",
    transmicable: "TransMiCable",
    other: "Otro",
  },

  variants: { Ciclovía: "Ciclovía", Festivo: "Festivo", Nocturna: "Nocturna", Especial: "Especial" } as Record<string, string>,

  alerts: {
    heading: (n: number) => (n === 1 ? "Novedad en el servicio" : `${n} novedades en el servicio`),
    effects: {
      detour: "Desvío",
      no_service: "Sin servicio",
      reduced_service: "Servicio reducido",
      significant_delays: "Retrasos",
      stop_moved: "Paradero trasladado",
      modified_service: "Cambio en el servicio",
      additional_service: "Servicio adicional",
    } as Record<string, string>,
    other: "Novedad en la operación",
    between: (a: string, b: string) => `Entre ${a} y ${b}.`,
    near: (a: string) => `Cerca de ${a}.`,
    generic: "TransMilenio reporta una novedad en esta ruta.",
  },

  home: {
    question: "¿Para dónde vas?",
    searchLabel: "Buscar ruta, estación o paradero",
    searchPlaceholder: "Ruta, estación o paradero",
    locate: "Centrar el mapa en tu ubicación",
    yourStops: "Tus paraderos",
    nearYou: "Cerca de ti",
    fallbackArea: "En Chapinero",
    count: (n: number) => `${n} ${n === 1 ? "paradero" : "paraderos"} a menos de 700 m`,
    outside: "Parece que no estás en Bogotá. Te mostramos Chapinero; busca cualquier otro paradero arriba.",
    denied: {
      title: "Sin tu ubicación, igual te llevamos",
      body: "Busca cualquier ruta o paradero. Si activas la ubicación, te mostramos los que tienes a una cuadra. Nunca la guardamos.",
      action: "Activar ubicación",
    },
    failed: { title: "No pudimos cargar los paraderos", body: "Revisa tu conexión. Lo intentamos de nuevo apenas vuelva." },
    none: { title: "No hay paraderos a 700 m", body: "Busca el nombre de una estación o la ruta que tomas." },
  },

  common: { retry: "Reintentar", station: "Estación", stop: "Paradero", accessible: "Accesible", done: "Listo", close: "Cerrar", clear: "Borrar" },


  stopRow: { open: "Abre las próximas llegadas" },
  routeRow: { open: "Abre el recorrido y los buses en vía" },

  stop: {
    followHint: "Muestra este bus en el mapa",
    station: "Estación TransMilenio",
    sitp: "Paradero SITP",
    failed: { title: "No pudimos cargar este paradero", body: "Revisa tu conexión. Si sigue fallando, puede que TransMilenio no esté respondiendo." },
    all: "Todas",
    allLabel: "Todas las rutas",
    only: (code: string) => `Solo la ruta ${code}`,
    none: { title: "No hay buses próximos", body: "Puede que el servicio de estas rutas haya terminado por hoy. Mira el horario de cada ruta abajo." },
    nextBus: "Próximo bus",
    later: "Más tarde",
    routesHere: "Rutas que paran aquí",
    report: "¿Algo está mal aquí?",
    save: "Guardar este paradero",
    unsave: "Quitar de tus paraderos",
    saved: { title: "Paradero guardado", body: "Lo verás arriba en Cerca, con sus próximos buses." },
    removed: "Lo quitamos de tus paraderos",
    savedCard: "Paradero guardado",
    noBuses: "Sin buses próximos",
  },

  route: {
    failed: { title: "No pudimos cargar esta ruta", body: "Revisa tu conexión e intenta de nuevo." },
    first: "Primer bus",
    last: "Último bus",
    onRoad: "En vía",
    notPublishing: "TransMilenio no está publicando posiciones, así que no dibujamos buses que podrían no estar ahí.",
    noneNow: (hours: string | null) => `No vemos buses en vía ahora.${hours ? ` Opera de ${hours}.` : ""}`,
    hours: (from: string, to: string) => `${from} a ${to}`,
    onRoadNow: (n: number) => `${n} ${n === 1 ? "bus" : "buses"} en vía. Toca un paradero para ver cuándo llega.`,
    stops: (n: number) => `${n} paradas`,
    stopLabel: (i: number, name: string) => `${name}, parada ${i}`,
    report: "¿Algo está mal en esta ruta?",
    save: "Guardar esta ruta",
    unsave: "Quitar de tus rutas",
    saved: { title: "Ruta guardada", body: "La encuentras en Guardados." },
    removed: "La quitamos de tus rutas",
  },

  saved: {
    empty: {
      title: "Guarda el paradero de tu casa y el del trabajo",
      body: "Toca la estrella en cualquier paradero o ruta. Aparecen aquí y en Cerca con sus próximos buses, sin buscarlos cada mañana. Se guardan solo en tu teléfono.",
      action: "Buscar mi paradero",
    },
    stops: "Paraderos",
    routes: "Rutas",
  },

  search: {
    placeholder: "Ruta, estación o paradero",
    hint: "Escribe la ruta como aparece en el bus",
    pairs: "También encontramos las rutas SITP que van en pareja, como la K635 y la H635, aunque TransMilenio las publique juntas.",
    example: (e: string) => `Buscar ${e}`,
    failed: { title: "No pudimos buscar", body: "Revisa tu conexión e intenta de nuevo." },
    nothing: (q: string) => `Nada con “${q}”`,
    nothingBody: "Prueba solo el código de la ruta, como B10, o una parte del nombre del paradero.",
    routes: "Rutas",
    stops: "Estaciones y paraderos",
  },

  about: {
    publicGoods: "Bienes Públicos Digitales",
    cromaHint: "Abre la página de Croma",
    title: "Bogotá merece la mejor app para moverse.",
    intro: "Paradero es gratis, abierta y de todos. La ponemos a disposición de la Alcaldía de Bogotá y de TransMilenio para que la adopten, la mantengan y la hagan suya.",
    promisesTitle: "Lo que te prometemos",
    promises: {
      account: { title: "Sin cuenta", body: "Abres la app y ya. No pedimos correo, teléfono ni cédula." },
      ads: { title: "Sin publicidad, nunca", body: "Moverte por tu ciudad no debería venir con anuncios." },
      location: { title: "Tu ubicación no se guarda", body: "Solo la usamos con la app abierta, redondeada a una cuadra." },
      live: { title: "Te decimos qué es en vivo", body: "Si TransMilenio deja de publicar, lo ves en pantalla y usamos el horario publicado." },
      code: { title: "Código abierto", body: "Cualquiera puede revisarlo, mejorarlo o llevárselo. Licencia MIT." },
    },
    dataTitle: "De dónde salen los datos",
    data: "De los datos abiertos de TransMilenio: la posición de cada bus cada 20 segundos, los horarios y las novedades del servicio. Croma los organiza para que cualquiera pueda construir sobre ellos.",
    helpTitle: "Hazla mejor con nosotros",
    help: "Si una ruta no aparece, una hora está mal o se te ocurre algo que te haría la vida más fácil, cuéntanos. No necesitas cuenta.",
    report: "Reportar un problema o una idea",
    code: "Ver el código",
    privacy: "Privacidad",
    settingsTitle: "Apariencia y accesibilidad",
    appearance: { label: "Apariencia", system: "Automática", light: "Clara", dark: "Oscura" },
    contrast: { label: "Contraste", system: "Contraste del teléfono", high: "Alto contraste" },
    language: { label: "Idioma", system: "Del teléfono" },
    accessibility:
      "Paradero sigue la accesibilidad de tu teléfono: texto grande, negrita, más contraste, menos movimiento, menos transparencia y lectores de pantalla como VoiceOver y TalkBack.",
    footerLeft: "+ Infraestructura de datos públicos",
    version: (v: string) => `Paradero ${v} · Hecho en Bogotá por Croma y la comunidad`,
  },

  card: {
    shortcut: "Leer mi TuLlave",
    screen: "Tu TuLlave",
    entry: { title: "Tu TuLlave", body: "Mira el saldo acercando la tarjeta al teléfono" },
    title: "Mira el saldo de tu TuLlave",
    intro: { ios: "Acerca la tarjeta a la parte de arriba de tu iPhone y déjala quieta hasta que vibre.", android: "Acerca la tarjeta a la parte de atrás del teléfono y déjala quieta hasta que vibre." },
    read: "Leer mi tarjeta",
    again: "Leer otra vez",
    reading: "Acerca la tarjeta",
    private: "La lectura pasa en tu teléfono. El número de la tarjeta no sale de él y no lo guardamos.",
    balance: "Saldo en la tarjeta",
    readAt: (time: string) => `Leído a las ${time}`,
    pending: "Una recarga en línea aparece aquí cuando la cargas en un validador o un punto de recarga.",
    number: "Número de la tarjeta",
    movements: "Últimos movimientos",
    owed: (amount: string) => `La tarjeta quedó debiendo ${amount}. Se descuenta de tu próxima recarga.`,
    undated: "Sin fecha",
    noMovements: "La tarjeta no tiene movimientos guardados.",
    kinds: { trip: "Viaje", topup: "Recarga", topupCancelled: "Recarga anulada", other: "Movimiento" },
    after: (balance: string) => `Quedó en ${balance}`,
    speech: {
      balance: (amount: string) => `Saldo en la tarjeta: ${amount}.`,
      movement: (kind: string, amount: string, when: string, after: string) => `${kind} de ${amount}${when ? `, ${when}` : ""}. Quedó en ${after}.`,
    },
    sheet: {
      hold: "Acerca tu TuLlave a la parte de arriba del iPhone",
      reading: "Leyendo. No la muevas",
      done: "Listo",
      notCard: "Esa no parece una tarjeta TuLlave",
      lost: "Se movió la tarjeta. Intenta de nuevo",
    },
    errors: {
      unsupported: { title: "Este teléfono no lee tarjetas", body: "Necesitas un teléfono con NFC. En Android, revisa que el NFC esté activado en Ajustes." },
      not_tullave: { title: "No es una TuLlave", body: "Esa tarjeta no respondió como una TuLlave. Prueba con tu tarjeta de TransMilenio." },
      lost: { title: "Se movió la tarjeta", body: "Déjala quieta contra el teléfono hasta que vibre, y vuelve a intentar." },
      timeout: { title: "No encontramos la tarjeta", body: "Acércala más y déjala quieta. Si tiene funda, sácala." },
      failed: { title: "No pudimos leerla", body: "Intenta de nuevo. Algunas tarjetas tardan un poco." },
    },
  },

  report: {
    kinds: {
      time: "Una hora está mal",
      missing: "Falta una ruta o un paradero",
      stop: "Un paradero está mal ubicado",
      idea: "Una idea",
      other: "Otra cosa",
    },
    title: "Cuéntanos qué pasó",
    route: (code: string) => `la ruta ${code}`,
    about: (what: string) => `Sobre ${what}. `,
    anonymous: "No necesitas cuenta ni dejar tus datos.",
    ideaPlaceholder: "¿Qué te haría la vida más fácil?",
    placeholder: "Qué viste, dónde y a qué hora",
    field: "Tu reporte",
    minimum: (n: number) => `Escribe al menos ${n} caracteres.`,
    public: "Tu reporte será público para que todos puedan seguirlo. No escribas tu nombre, teléfono ni cédula; si se cuelan, los ocultamos.",
    tooMany: "Enviaste varios reportes seguidos. Intenta en un rato.",
    failed: "No pudimos enviarlo. Revisa tu conexión e intenta de nuevo.",
    sending: "Enviando…",
    send: "Enviar reporte",
    thanks: "Gracias, ya nos llegó.",
    published: (n: number) => `Quedó publicado como el reporte #${n}. Cualquiera puede ver cómo avanza, también la Alcaldía y TransMilenio.`,
    view: "Ver el reporte",
  },

  onboarding: {
    note: {
      eyebrow: "Una nota de Croma",
      title: "Paradero es de Bogotá.",
      body: "Lo hicimos en Croma como un bien público digital: gratis, de código abierto y sin anuncios, construido sobre los datos abiertos de TransMilenio.",
      body2: "Lo ponemos a disposición de la Alcaldía y de TransMilenio para que lo adopten y lo hagan suyo. Mientras tanto, lo cuidamos contigo.",
      sign: "El equipo de Croma",
      rail: "Bienes Públicos Digitales",
      next: "Continuar",
    },
    byCroma: "Un bien público de Croma",
    by: "por",
    eyebrow: "Un bien público para Bogotá",
    title: "Tu bus, sin adivinar.",
    body: "Cuándo llega tu bus, desde el paradero de la esquina hasta el portal. TransMilenio, SITP y alimentadores en un solo lugar.",
    start: "Empezar",
    promise: "Gratis · Sin cuenta · Sin anuncios",
    locationEyebrow: "Tu ubicación",
    locationTitle: "Te ponemos en el mapa.",
    reasons: {
      stops: "Los paraderos y estaciones a una cuadra de ti",
      walk: "Cuántos minutos caminas hasta cada uno",
      privacy: "Solo con la app abierta y redondeada a una cuadra. Nunca la guardamos.",
    },
    asking: "Un momento…",
    allow: "Permitir ubicación",
    skip: "Ahora no",
    preview: { name: "C.C. Lourdes", meta: "Paradero · 58 m · 1 min a pie", eta: "4 min", label: "Ejemplo: C.C. Lourdes, el próximo bus llega en 4 minutos" },
  },

  notFound: {
    eyebrow: "Paradero no encontrado",
    title: "Este enlace no lleva a ningún lado.",
    body: "Puede que la ruta o el paradero haya cambiado de código. Busca de nuevo desde el inicio.",
    home: "Volver al inicio",
  },

  privacy: {
    screen: "Privacidad",
    eyebrow: "Paradero · Bien público digital de Croma",
    title: "Tu privacidad, en pocas palabras.",
    updated: (date: string) => `Actualizada el ${date}.`,
    sections: [
      { title: "No tienes cuenta", body: "Paradero no pide correo, teléfono, cédula ni nombre. No hay registro ni inicio de sesión." },
      {
        title: "Tu ubicación",
        body: "Solo la usamos con la app abierta y solo si nos das permiso. Antes de salir del teléfono la redondeamos a unos cien metros, y la enviamos a nuestro servidor únicamente para buscar los paraderos cercanos. No la guardamos ni la asociamos a ti.",
      },
      {
        title: "Lo que se queda en tu teléfono",
        body: "Tus paraderos y rutas guardados, sus apodos y tus preferencias de apariencia e idioma viven solo en tu teléfono. Si borras la app, se borran.",
      },
      {
        title: "Reportes",
        body: "Si nos reportas un problema, el texto que escribas se publica en GitHub para que cualquiera pueda seguirlo. Antes de publicarlo ocultamos correos, teléfonos y números de documento. No guardamos quién lo envió. Para limitar el abuso, nuestro servidor cuenta por un rato cuántos reportes llegan desde una misma conexión, solo en memoria.",
      },
      { title: "Sin publicidad ni rastreo", body: "Paradero no tiene anuncios, no usa analítica de terceros y no vende ni comparte datos con nadie." },
      {
        title: "De dónde salen los datos",
        body: "Los horarios, las posiciones de los buses y las novedades vienen de los datos abiertos de TransMilenio, a través de Croma. Nuestro servidor los pide en tu nombre, así que TransMilenio no ve tu conexión. Como cualquier servicio en internet, nuestro proveedor de alojamiento puede registrar datos técnicos de las conexiones por un tiempo corto para operar y proteger el servicio.",
      },
      { title: "Código abierto", body: "Todo lo que dice esta página se puede comprobar en el código, publicado con licencia MIT en github.com/croma-labs/paradero." },
      { title: "Preguntas", body: "Escríbenos desde la app con «Reportar un problema o una idea», o abre un issue en github.com/croma-labs/paradero." },
    ],
  },
};

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? Widen<U>[]
      : T extends object
        ? { [K in keyof T]: Widen<T[K]> }
        : T;

export type Messages = Widen<typeof es>;
