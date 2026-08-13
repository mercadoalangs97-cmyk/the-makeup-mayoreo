import { LOTES, PPU_REFERENCIA } from "./lotes";

// Guías (blog) para SEO + GEO (posicionamiento en Google y en motores de IA).
// Contenido curado que responde preguntas reales de consumidoras y revendedoras,
// con enlaces internos a la tienda y al mayoreo.

export type Bloque =
  | { t: "p"; html: string }
  | { t: "h2"; text: string }
  | { t: "ul"; items: string[] }
  // Las tablas son el formato que más citan los buscadores de IA: un dato
  // concreto, ordenado y fácil de extraer.
  | { t: "tabla"; head: string[]; rows: string[][] }
  | { t: "cta"; href: string; text: string };

// Las tablas de precio se calculan de LOTES, nunca se escriben a mano: si
// cambia un precio, la guía cambia sola y no contradice a /mayoreo.
const MIXTOS = LOTES.filter((l) => l.id.startsWith("mixto-")).sort(
  (a, b) => a.piezas - b.piezas
);
const pesos = (n: number) => "$" + n.toLocaleString("es-MX");

const TABLA_LOTES: Bloque = {
  t: "tabla",
  head: ["Lote", "Precio", "Por pieza"],
  rows: MIXTOS.map((l) => [
    `${l.piezas} piezas`,
    pesos(l.precio),
    pesos(Math.round(l.precio / l.piezas)),
  ]),
};

const TABLA_GANANCIA: Bloque = {
  t: "tabla",
  head: ["Lote", "Inviertes", `Vendes a ${pesos(PPU_REFERENCIA)} c/u`, "Diferencia"],
  rows: MIXTOS.filter((l) => l.piezas <= 100).map((l) => {
    const venta = PPU_REFERENCIA * l.piezas;
    return [
      `${l.piezas} piezas`,
      pesos(l.precio),
      pesos(venta),
      pesos(venta - l.precio),
    ];
  }),
};

export type Guia = {
  slug: string;
  titulo: string;
  /** Solo para el <title> del buscador: máx 60 caracteres, con la palabra
   *  clave al principio. El `titulo` largo se sigue usando como H1 visible. */
  tituloSeo: string;
  descripcion: string;
  fecha: string; // ISO (YYYY-MM-DD)
  emoji: string;
  keywords: string[];
  cuerpo: Bloque[];
};

export const GUIAS: Guia[] = [
  {
    slug: "como-elegir-base-de-maquillaje",
    titulo: "Cómo elegir tu base de maquillaje según tu tipo de piel",
    tituloSeo: "Cómo elegir tu base de maquillaje según tu piel",
    descripcion:
      "Cómo elegir la base ideal para piel grasa, seca o mixta y acertar con tu tono a la primera. Guía práctica con bases de e.l.f, NYX y Maybelline.",
    fecha: "2026-07-14",
    emoji: "💧",
    keywords: ["base de maquillaje", "tipo de piel", "base para piel grasa", "cómo elegir base"],
    cuerpo: [
      { t: "p", html: "La base es el corazón de tu maquillaje: si eliges bien, todo lo demás luce mejor. El secreto está en dos cosas — tu <strong>tipo de piel</strong> y tu <strong>tono</strong>. Aquí te lo explicamos fácil." },
      { t: "h2", text: "1. Identifica tu tipo de piel" },
      { t: "ul", items: [
        "Grasa: brillas a media mañana, sobre todo en la zona T (frente y nariz).",
        "Seca: sientes tirantez, se marcan líneas o se resecan zonas.",
        "Mixta: zona T grasa pero mejillas normales/secas.",
        "Normal: ni muy grasa ni muy seca.",
      ]},
      { t: "h2", text: "2. Qué base va con cada piel" },
      { t: "p", html: "<strong>Piel grasa:</strong> busca acabado <strong>mate</strong> y de larga duración, o una base en polvo que controle el brillo. <strong>Piel seca:</strong> elige bases <strong>hidratantes o luminosas</strong> que no resalten la resequedad. <strong>Piel mixta:</strong> una base de acabado natural funciona; puedes matificar solo la zona T. <strong>Piel normal:</strong> casi cualquier base te queda bien." },
      { t: "h2", text: "3. Acierta con el tono" },
      { t: "p", html: "Prueba el tono en la <strong>línea de la mandíbula</strong> (no en la mano) con luz natural: el correcto es el que desaparece en tu piel. Ante la duda entre dos, elige el más claro para el rostro y usa bronceador para calidez." },
      { t: "p", html: "En AMARÉA tenemos bases originales de <strong>L'Oréal, Maybelline, NYX y e.l.f</strong> para todo tipo de piel, por pieza y con envío a todo México." },
      { t: "cta", href: "/amarea?ver=filtros", text: "Ver bases en la tienda →" },
    ],
  },
  {
    slug: "maquillaje-original-como-saber-si-es-autentico",
    titulo: "Maquillaje original vs. imitación: 5 señales para saber si es auténtico",
    tituloSeo: "Maquillaje original o pirata: 5 señales para saberlo",
    descripcion:
      "¿Cómo saber si tu maquillaje es original y no pirata? 5 señales en el empaque, el precio y la textura para comprar auténtico sin arriesgar tu piel.",
    fecha: "2026-07-14",
    emoji: "✅",
    keywords: ["maquillaje original", "cómo saber si es original", "maquillaje pirata", "e.l.f original"],
    cuerpo: [
      { t: "p", html: "El maquillaje pirata no solo se ve peor: puede dañar tu piel. Antes de comprar, revisa estas <strong>5 señales</strong> para asegurarte de que sea 100% original." },
      { t: "h2", text: "1. Empaque y acabados" },
      { t: "p", html: "El original tiene <strong>impresión nítida</strong>, colores correctos y sin faltas de ortografía. Los sellos y la caja se sienten firmes, no endebles." },
      { t: "h2", text: "2. Código de barras y lote" },
      { t: "p", html: "Los productos originales traen <strong>código de barras y número de lote</strong> legibles. Si no los tiene o están mal impresos, sospecha." },
      { t: "h2", text: "3. Textura, color y olor" },
      { t: "p", html: "La imitación suele tener <strong>textura extraña, olor fuerte a químico</strong> o un color distinto al oficial de la marca. El original se siente y huele como debe." },
      { t: "h2", text: "4. Precio demasiado bueno para ser verdad" },
      { t: "p", html: "Un precio ridículamente bajo casi siempre es señal de imitación. El maquillaje original tiene un rango de precio razonable." },
      { t: "h2", text: "5. Compra en lugares confiables" },
      { t: "p", html: "La forma más segura es comprar en tiendas que <strong>garanticen originalidad</strong>. En AMARÉA todo nuestro catálogo es <strong>100% original</strong> de marcas importadas —e.l.f, NYX, Maybelline, L'Oréal y Pixi— con pago seguro por Mercado Pago." },
      { t: "cta", href: "/amarea", text: "Comprar maquillaje 100% original →" },
    ],
  },
  {
    slug: "como-vender-maquillaje-al-mayoreo",
    titulo: "Guía para revendedoras: cómo empezar a vender maquillaje al mayoreo",
    tituloSeo: "Cómo vender maquillaje al mayoreo: guía para empezar",
    descripcion:
      "Cómo empezar tu negocio de maquillaje desde cero: qué lote comprar, cómo poner precios que dejen ganancia y dónde vender. Guía para revendedoras.",
    fecha: "2026-07-14",
    emoji: "🛍️",
    keywords: ["vender maquillaje", "maquillaje al mayoreo", "revender maquillaje", "negocio de maquillaje"],
    cuerpo: [
      { t: "p", html: "Vender maquillaje es uno de los negocios más rentables para empezar desde casa: alta demanda, ticket bajo y buen margen. Aquí van los pasos para arrancar bien." },
      { t: "h2", text: "1. Empieza con un lote surtido" },
      { t: "p", html: "No inviertas todo en un solo producto. Un <strong>lote mixto</strong> te da variedad (labiales, bases, sombras, cejas) para probar qué se vende más en tu zona. Puedes empezar con un lote chico e ir creciendo." },
      { t: "h2", text: "2. Apuesta por marcas que se venden solas" },
      { t: "p", html: "<strong>e.l.f, NYX, Maybelline y L'Oréal</strong> tienen demanda constante: la gente ya las conoce y las busca, así que se venden más fácil que marcas desconocidas." },
      { t: "h2", text: "3. Pon tus precios con margen sano" },
      { t: "p", html: "Calcula tu costo por pieza (precio del lote ÷ número de piezas) y súbele tu ganancia. En maquillaje es común un margen del <strong>40% al 100%</strong> sobre tu costo, según la zona y el producto." },
      { t: "h2", text: "4. Vende donde ya está tu gente" },
      { t: "ul", items: [
        "WhatsApp e Instagram: fotos claras, precio y envío.",
        "Catálogo por historias/estados con lo que tienes disponible.",
        "Recomendación de boca en boca (regala muestras o promos de arranque).",
      ]},
      { t: "p", html: "En AMARÉA tenemos <strong>lotes de maquillaje al mayoreo de 10 a 500 piezas</strong>, de marcas originales, para que empieces o hagas crecer tu negocio." },
      { t: "cta", href: "/mayoreo", text: "Ver lotes de mayoreo →" },
    ],
  },
  {
    slug: "labiales-mate-satinado-o-gloss",
    titulo: "Labiales: mate, satinado o gloss — ¿cuál te conviene?",
    tituloSeo: "Labial mate, satinado o gloss: cuál te conviene",
    descripcion:
      "Diferencias entre labial mate, satinado y gloss: cuánto duran, cómo se sienten y cuál le va mejor a tus labios. Guía para elegir acabado y tono.",
    fecha: "2026-07-14",
    emoji: "💄",
    keywords: ["labiales", "labial mate", "gloss", "cómo elegir labial", "tono de labial"],
    cuerpo: [
      { t: "p", html: "No todos los labiales son iguales. El acabado cambia por completo tu look y su duración. Esta guía te ayuda a elegir entre <strong>mate, satinado y gloss</strong>." },
      { t: "h2", text: "Mate: sofisticado y de larga duración" },
      { t: "p", html: "Sin brillo, color intenso y aguanta muchísimo. Ideal para eventos o un look elegante. Tip: hidrata bien tus labios antes, porque tiende a resecar." },
      { t: "h2", text: "Satinado: natural y cómodo" },
      { t: "p", html: "Un puntito de brillo, cómodo de traer todo el día y favorece a todos. Es el acabado más versátil para el diario." },
      { t: "h2", text: "Gloss: jugoso y en tendencia" },
      { t: "p", html: "Efecto húmedo y voluminoso, muy de moda. Perfecto solo o encima de un labial para dar dimensión. Los <strong>butter gloss de NYX</strong> son de los favoritos." },
      { t: "h2", text: "¿Cómo elijo mi tono?" },
      { t: "p", html: "Los <strong>nudes y rosas</strong> son seguros para el diario; los <strong>rojos y vinos</strong> para looks de impacto. Si dudas, empieza por un tono cercano al color natural de tus labios, un poco más intenso." },
      { t: "p", html: "En AMARÉA tienes labiales originales de NYX, Maybelline, L'Oréal y más — mate, satinado y gloss — por pieza." },
      { t: "cta", href: "/amarea?ver=filtros", text: "Ver labiales →" },
    ],
  },

  // La pregunta que TODAS hacen por WhatsApp antes de comprar. Los números
  // salen de LOTES para que nunca se desfasen de los precios reales.
  {
    slug: "cuanto-cuesta-empezar-a-vender-maquillaje",
    titulo: "¿Cuánto cuesta empezar a vender maquillaje? Números reales",
    tituloSeo: "Cuánto cuesta empezar a vender maquillaje",
    descripcion:
      "Cuánto necesitas para empezar a revender maquillaje en México: precio de los lotes, cuánto sale cada pieza, a cuánto se revende y en qué más se te va el dinero.",
    fecha: "2026-08-13",
    emoji: "💸",
    keywords: [
      "cuánto cuesta empezar a vender maquillaje",
      "cuánto necesito para revender maquillaje",
      "negocio de maquillaje inversión",
      "lotes de maquillaje precio",
    ],
    cuerpo: [
      { t: "p", html: "La respuesta corta: <strong>desde $1,200 pesos más el envío</strong>. Ese es el lote más chico, de 10 piezas. Abajo están todos los precios y, más importante, en qué se te va realmente el dinero — porque el lote no es tu único gasto." },
      { t: "h2", text: "Lo que cuesta cada lote" },
      { t: "p", html: "Estos son nuestros precios completos. Entre más grande el lote, más barata te sale la pieza:" },
      TABLA_LOTES,
      { t: "p", html: "A esto le sumas el <strong>envío</strong>, que va de unos $137 a $250 según tu código postal. Se cotiza con Estafeta al momento y lo ves antes de pagar." },
      { t: "h2", text: "A cuánto se revende" },
      { t: "p", html: "El precio promedio al que se vende esta clase de producto en tienda ronda los <strong>$230 por pieza</strong>. Con ese número, así queda la cuenta:" },
      TABLA_GANANCIA,
      { t: "p", html: "<strong>Ojo con esta tabla:</strong> es una estimación, no una promesa. Tu ganancia real depende del precio al que TÚ vendas, de tu mercado y de qué tan rápido rotes. Si vendes más barato para mover rápido, ganas menos por pieza pero recuperas antes." },
      { t: "h2", text: "En qué más se te va el dinero" },
      { t: "p", html: "Esto es lo que casi nadie te dice y es donde se atoran muchas que empiezan:" },
      { t: "ul", items: [
        "Envío a tu clienta. Si vendes por internet y ofreces envío gratis, sale de tu ganancia: calcula $130 a $200 por pedido.",
        "Comisión de la plataforma de pago. Si cobras con Mercado Pago o similar, se llevan alrededor del 4%.",
        "Producto que tarda en salir. Nunca vendes el lote completo en una semana; ten con qué aguantar mientras rota.",
        "Fotos y presentación. No cuesta dinero pero sí tiempo, y es lo que más te hace vender.",
      ]},
      { t: "h2", text: "Con cuánto conviene empezar" },
      { t: "p", html: "Si es tu primera vez, el <strong>lote de 10 o 15 piezas</strong> es para probar: ver qué se te vende, a qué precio y qué tan rápido. No esperes hacer negocio con él; espera aprender." },
      { t: "p", html: "Si ya vendiste antes y sabes que sí te sale, el salto que más cambia tus números es el de <strong>20 a 50 piezas</strong>." },
      { t: "p", html: "Y algo importante: <strong>no te endeudes para el primer lote.</strong> Empieza con lo que puedas perder sin que te duela, y reinvierte lo que salga." },
      { t: "cta", href: "/mayoreo#precios", text: "Ver todos los precios por pieza →" },
      { t: "p", html: "¿Dudas de qué lote te conviene? Lee <a href=\"/guias/que-lote-de-maquillaje-comprar\">cuál lote elegir según tu presupuesto</a>." },
    ],
  },

  // Comparativa honesta con el mercado del Centro. Es la búsqueda que trae
  // gente esperando pagar $3 por pieza: en vez de perderla, se le explica la
  // diferencia. Comparación NEUTRAL — ningún juicio sobre terceros, solo
  // segmentos de precio y para quién es cada uno.
  {
    slug: "maquillaje-centro-cdmx-vs-original-importado",
    titulo: "Maquillaje del Centro de CDMX vs. original importado: cuál te conviene revender",
    tituloSeo: "Maquillaje del Centro CDMX vs. original importado",
    descripcion:
      "Diferencias reales entre surtirte en el Centro de la CDMX y comprar marcas originales importadas: precio por pieza, a cuánto se revende y para quién es cada uno.",
    fecha: "2026-08-13",
    emoji: "⚖️",
    keywords: [
      "maquillaje mayoreo centro cdmx",
      "maquillaje barato por mayoreo",
      "dónde surtirse para revender maquillaje",
    ],
    cuerpo: [
      { t: "p", html: "Si buscaste \"maquillaje al mayoreo\" seguro viste dos mundos muy distintos: piezas desde unos pesos en el Centro de la Ciudad de México, y marcas conocidas a cien pesos o más. <strong>Ninguno es mejor que el otro</strong> — son negocios diferentes. Esta guía te ayuda a decidir cuál es el tuyo." },
      { t: "h2", text: "La diferencia en una tabla" },
      { t: "tabla", head: ["", "Económico / Centro CDMX", "Original importado"], rows: [
        ["Marcas típicas", "Nacionales y de importación económica", "e.l.f, NYX, Maybelline, L'Oréal, Pixi"],
        ["Costo por pieza", "Desde unos pesos", "$91 a $120"],
        ["A cuánto se revende", "Decenas de pesos", "Alrededor de $230"],
        ["Cómo ganas", "Por volumen", "Por margen"],
        ["Para empezar necesitas", "Muy poco", "Desde $1,200"],
        ["Quién te compra", "Quien busca precio", "Quien busca la marca"],
        ["Qué tan rápido rota", "Rápido", "Más lento, ticket más alto"],
      ]},
      { t: "h2", text: "El negocio de volumen" },
      { t: "p", html: "Surtirte barato funciona si <strong>puedes mover mucha pieza</strong>: tienes un puesto, un local con paso, o una comunidad grande que compra seguido. Ganas poco por unidad, así que necesitas muchas unidades. También implica ir al Centro, cargar, y que el surtido cambie de una semana a otra." },
      { t: "h2", text: "El negocio de marca" },
      { t: "p", html: "Vender marcas originales funciona si <strong>tus clientas ya conocen la marca</strong>. Nadie te pregunta qué es un labial de NYX: lo vieron en TikTok, en la farmacia o en una tienda departamental. Eso te ahorra la parte más difícil de vender, que es explicar el producto." },
      { t: "p", html: "Ganas más por pieza, necesitas menos ventas para el mismo dinero, y el ticket más alto significa menos clientas que atender. A cambio: inviertes más al principio y el producto rota más lento." },
      { t: "h2", text: "Cómo decidir" },
      { t: "ul", items: [
        "Si vendes en persona, con paso de gente y presupuesto corto: el volumen te funciona.",
        "Si vendes por Instagram, WhatsApp o catálogo a conocidas: la marca te funciona mejor, porque tus clientas ya la buscan por nombre.",
        "Si no sabes: prueba con el lote más chico de marca antes de comprometer dinero grande. Vas a saber en tres semanas.",
      ]},
      { t: "h2", text: "Lo que sí conviene revisar, compres donde compres" },
      { t: "p", html: "Independientemente del segmento, revisa que lo que compras sea auténtico: empaque, lote impreso, precio demasiado bueno para ser cierto. Las señales concretas están en <a href=\"/guias/maquillaje-original-como-saber-si-es-autentico\">cómo saber si el maquillaje es original</a>." },
      { t: "cta", href: "/mayoreo", text: "Ver nuestros lotes de marcas originales →" },
    ],
  },

  // La pregunta directa antes de comprar. Ayuda a elegir y de paso orienta al
  // lote que de verdad le conviene, no al más caro.
  {
    slug: "que-lote-de-maquillaje-comprar",
    titulo: "¿Qué lote de maquillaje me conviene según mi presupuesto?",
    tituloSeo: "Qué lote de maquillaje comprar según tu presupuesto",
    descripcion:
      "Cuál lote de maquillaje comprar según cuánto tengas y cómo vendas: de 10 a 500 piezas, con precio por pieza, para quién es cada uno y cuándo conviene dar el salto.",
    fecha: "2026-08-13",
    emoji: "📦",
    keywords: [
      "qué lote de maquillaje comprar",
      "lote de maquillaje para empezar",
      "cuántas piezas comprar para revender",
    ],
    cuerpo: [
      { t: "p", html: "La regla corta: <strong>compra el lote más chico que puedas vender en un mes.</strong> No el más grande que puedas pagar. Producto parado es dinero parado." },
      { t: "h2", text: "Cuál es para ti" },
      { t: "tabla", head: ["Si…", "Te conviene", "Inversión"], rows: [
        ["Nunca has vendido y quieres probar", "10 piezas", "$1,200"],
        ["Ya vendiste y se te acabó rápido", "20 piezas", "$2,140"],
        ["Vendes seguido y quieres surtido", "50 piezas", "$5,100"],
        ["Tienes clientas fijas", "100 piezas", "$9,800"],
        ["Surtes a otras revendedoras", "500 piezas", "$45,700"],
      ]},
      { t: "h2", text: "Cuándo conviene dar el salto" },
      { t: "p", html: "El salto que más cambia tus números es de <strong>10-15 a 20 piezas</strong>: cada pieza te baja de $120 a $107. Son $13 menos por pieza, y sobre 20 piezas son $260 que te quedas tú." },
      { t: "p", html: "De 20 a 50 el precio por pieza baja menos ($107 a $102), pero como son más piezas la ganancia total sube mucho más. Ese salto conviene cuando ya sabes que vendes — no antes." },
      { t: "h2", text: "El error más común" },
      { t: "p", html: "Comprar grande la primera vez \"porque sale más barato\". Sale más barato por pieza, sí, pero si te tardas seis meses en venderlo tuviste tu dinero detenido medio año. <strong>Empieza chico, mide qué tan rápido vendes, y crece con datos.</strong>" },
      { t: "cta", href: "/mayoreo#precios", text: "Ver la tabla completa de precios →" },
      { t: "p", html: "¿No sabes cuánto necesitas en total? Lee <a href=\"/guias/cuanto-cuesta-empezar-a-vender-maquillaje\">cuánto cuesta empezar a vender maquillaje</a>, con envío y comisiones incluidos." },
    ],
  },
];

export function getGuia(slug: string): Guia | undefined {
  return GUIAS.find((g) => g.slug === slug);
}

// Imagen de portada de cada guía (subida al bucket como sitio/guia-<slug>.png).
const GUIAS_IMG_BASE =
  "https://yekvehkmgunoafccwmyp.supabase.co/storage/v1/object/public/product-photos/sitio";
export function guiaImg(slug: string): string {
  return `${GUIAS_IMG_BASE}/guia-${slug}.png`;
}
