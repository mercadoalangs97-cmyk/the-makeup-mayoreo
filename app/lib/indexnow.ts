import { SITE_URL } from "./site";

// IndexNow: avisa a Bing (y por lo tanto a ChatGPT y Copilot, que usan su
// índice) en cuanto publicamos o cambiamos una página, en vez de esperar a que
// pasen a rastrear el sitio solos.
//
// La llave NO es secreta: vive en un archivo público del propio sitio
// (/{llave}.txt). Bing la lee de ahí para comprobar que somos dueños del
// dominio. Esta es la que generó Bing Webmaster Tools para esta cuenta.
//
// Si algún día se cambia: crear el .txt nuevo en public/ ANTES de cambiar esta
// constante, y dejar el archivo viejo unos días (IndexNow admite varias llaves
// y así no se rompe ningún aviso ya encolado).
export const INDEXNOW_KEY = "11bf5f27adfe4fc78ef7bc7225ebcdcd";

const HOST = new URL(SITE_URL).host;

export type ResultadoIndexNow = {
  ok: boolean;
  status: number;
  enviadas: number;
  detalle?: string;
};

/**
 * Avisa a IndexNow de una o varias URLs. Best-effort: si falla no debe romper
 * el flujo que lo llamó (publicar un producto, un cron, etc.).
 */
export async function avisarIndexNow(
  urls: string[]
): Promise<ResultadoIndexNow> {
  // Solo URLs de nuestro dominio y sin repetidas (IndexNow rechaza el lote
  // completo si viene una de otro host).
  const lista = [...new Set(urls.filter(Boolean))].filter((u) => {
    try {
      return new URL(u).host === HOST;
    } catch {
      return false;
    }
  });

  if (lista.length === 0) {
    return { ok: false, status: 0, enviadas: 0, detalle: "sin_urls_validas" };
  }

  // El protocolo acepta máximo 10 000 URLs por envío.
  const urlList = lista.slice(0, 10000);

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });
    // 200 = recibido, 202 = recibido y pendiente de validar la llave.
    return {
      ok: res.status === 200 || res.status === 202,
      status: res.status,
      enviadas: urlList.length,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      enviadas: 0,
      detalle: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Atajo para avisar de un producto que acabamos de publicar o actualizar. */
export function urlProducto(sku: string): string {
  return `${SITE_URL}/amarea/${encodeURIComponent(sku)}`;
}
