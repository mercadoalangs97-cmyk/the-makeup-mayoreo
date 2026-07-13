// Guías (blog) para SEO + GEO (posicionamiento en Google y en motores de IA).
// Contenido curado que responde preguntas reales de consumidoras y revendedoras,
// con enlaces internos a la tienda y al mayoreo.

export type Bloque =
  | { t: "p"; html: string }
  | { t: "h2"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "cta"; href: string; text: string };

export type Guia = {
  slug: string;
  titulo: string;
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
    descripcion:
      "Aprende a elegir la base perfecta para piel grasa, seca o mixta, y cómo acertar con tu tono. Guía práctica de AMAREA.",
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
      { t: "p", html: "En AMAREA tenemos bases originales de <strong>L'Oréal, Maybelline, NYX y e.l.f</strong> para todo tipo de piel, por pieza y con envío a todo México." },
      { t: "cta", href: "/amarea?ver=filtros", text: "Ver bases en la tienda →" },
    ],
  },
  {
    slug: "maquillaje-original-como-saber-si-es-autentico",
    titulo: "Maquillaje original vs. imitación: 5 señales para saber si es auténtico",
    descripcion:
      "¿Cómo saber si tu maquillaje es original y no pirata? 5 señales para comprar auténtico y no arriesgar tu piel.",
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
      { t: "p", html: "La forma más segura es comprar en tiendas que <strong>garanticen originalidad</strong>. En AMAREA todo nuestro catálogo es <strong>100% original</strong> de marcas importadas —e.l.f, NYX, Maybelline, L'Oréal y Pixi— con pago seguro por Mercado Pago." },
      { t: "cta", href: "/amarea", text: "Comprar maquillaje 100% original →" },
    ],
  },
  {
    slug: "como-vender-maquillaje-al-mayoreo",
    titulo: "Guía para revendedoras: cómo empezar a vender maquillaje al mayoreo",
    descripcion:
      "Cómo empezar tu negocio de maquillaje: qué lote comprar, cómo poner precios y dónde vender. Guía de mayoreo AMAREA.",
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
      { t: "p", html: "En AMAREA tenemos <strong>lotes de maquillaje al mayoreo de 10 a 500 piezas</strong>, de marcas originales, para que empieces o hagas crecer tu negocio." },
      { t: "cta", href: "/mayoreo", text: "Ver lotes de mayoreo →" },
    ],
  },
  {
    slug: "labiales-mate-satinado-o-gloss",
    titulo: "Labiales: mate, satinado o gloss — ¿cuál te conviene?",
    descripcion:
      "Diferencias entre labial mate, satinado y gloss, y cómo elegir tu acabado y tono ideal. Guía de labiales AMAREA.",
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
      { t: "p", html: "En AMAREA tienes labiales originales de NYX, Maybelline, L'Oréal y más — mate, satinado y gloss — por pieza." },
      { t: "cta", href: "/amarea?ver=filtros", text: "Ver labiales →" },
    ],
  },
];

export function getGuia(slug: string): Guia | undefined {
  return GUIAS.find((g) => g.slug === slug);
}
