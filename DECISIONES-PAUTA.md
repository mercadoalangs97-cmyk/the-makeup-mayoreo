# Decisiones de publicidad pagada

Expediente vivo. Cada entrada guarda **qué se decidió, con qué números y qué
tendría que cambiar** para revisarla. La próxima sesión parte de aquí.

---

## 28-ago-2026 · Meta Ads para producto INDIVIDUAL → **NO, por ahora**

### Semáforo de medición: 🔴 ROJO

| Pieza | Estado |
|---|---|
| Pixel de Meta | **No instalado** — `NEXT_PUBLIC_META_PIXEL_ID` vacío; el sitio en vivo no carga `connect.facebook.net` |
| CAPI server-side | **No existe** |
| Deduplicación / `event_id` | No aplica (no hay dos fuentes) |
| EMQ | Sin medir (no hay eventos) |
| Eventos `ViewContent`/`AddToCart`/`Purchase` | Programados en `app/lib/analytics.ts`, **sin disparar** por falta de ID |

Regla de la skill: en 🔴 no se gasta. El entregable es arreglar la señal.

### Economía unitaria (medida, no supuesta)

Fuente: 45 productos con `precio_mxn` y `costo_unitario` cargados y stock > 0.

| Concepto | Valor |
|---|---|
| Precio promedio por pieza | $238 |
| Costo promedio por pieza | $73 |
| Margen bruto por pieza | $165 (mediana $156) |

Neto por pedido, restando envío real (~$150) y comisión MP (4.5%):

| Piezas | Neto |
|---|---|
| 1 | **$127** |
| 2 | **$282** |
| 3 | **$313** |

- **CAC máximo para no perder:** ~$150-200
- **CPA realista en Meta** para anunciante nuevo sin historial de pixel: $200-400
- **Conclusión:** arranca debajo del agua

Comparación: un lote deja **~$520 netos** con ticket de $2,157.

### El dato que decide

**Cero ventas de producto individual en todo el historial.** 10 ventas pagadas,
las 10 de lote. No es falta de tráfico — el `/shop` lleva meses recibiendo
visitas. La oferta individual **no está probada**, y la pauta es la forma más
cara de probarla.

Además: Meta necesita ~50 conversiones/semana para salir de aprendizaje. A $200
de CAC serían ~$40,000/mes, fuera de presupuesto.

### Qué hacer en su lugar (orden)

1. **63 suscriptores sin contactar** + cupón BIENVENIDA10 (hecho para producto
   individual). Prueba gratis de si el individual vende.
2. **Instagram orgánico** — hace falta igual para `sameAs` del SEO.
3. Vender individual como **complemento a quien ya compró un lote** (el envío de
   $150 se comparte y ahí sí alcanza el margen), no como canal de adquisición.

### Se revisa cuando

- Haya **≥3 ventas individuales** por canales gratis (señal de que la oferta vende), **Y**
- Pixel + CAPI instalados con EMQ ≥8 en `Purchase`, **Y**
- Presupuesto que aguante ≥$150/día por 3 semanas

---

## 28-ago-2026 · Google Ads de lotes → **PAUSADA**

### Los dos periodos

| | Con pauta (25 jul–17 ago) | Sin pauta (18–28 ago) |
|---|---|---|
| Días | 24 | 11 |
| Ventas | 3 | 6 |
| Ingreso | $6,490 | $13,883 |
| Margen | $1,754 | $4,040 |
| Margen/día | $73 | $367 |
| Neto tras pauta ($97/día) | **−$24/día** | — |

Gasto total del mes 1: **$2,326** (508 clics, CPC $4.58, 9.85% CTR).

### Advertencia sobre esta comparación

**No es un experimento limpio.** Tres factores se mezclan:

1. Los arreglos de conversión (cotizador, transferencia SPEI, pop-up quitado de
   `/cotizacion`, seguimientos) aterrizaron entre el 17 y el 27 de agosto.
2. Google atribuye con ventana de 30-90 días: ventas del 19 y 22 de agosto
   probablemente vienen de clics pagados anteriores.
3. Muestra chica: 3 vs 6 ventas.

Lo que **sí** es sólido: el mes 1 no fue rentable, y las ventas no se detuvieron
al apagar la pauta.

### Se reactiva cuando

1. Llegue y se escanee el lote nuevo (haya con qué surtir)
2. Los 63 suscriptores estén trabajados
3. La operación esté tranquila (escaneo, inventario sin negativos)

Entonces: 2-3 semanas con el embudo ya arreglado, midiendo con la tabla
`visitas`, que ya separa `google-ads` de `ia-asistente` — eso es justo lo que la
primera vez no se pudo distinguir.

---

## Contexto que aplica a cualquier campaña futura

- **El navegador de WhatsApp rompe pagos.** Confirmado con un rechazo real de
  Mercado Pago ("por motivos de seguridad", operación 175035769833, $5,378).
  Ya se detecta y se avisa en `/cotizacion`.
- **La transferencia SPEI convierte donde Mercado Pago falla** y no cobra
  comisión: 3 ventas cobradas así, **$426 ahorrados**. En montos altos
  (lotes de 50+) conviene ofrecerla de entrada, no como plan B.
- **El canal más grande hoy son los asistentes de IA** (ChatGPT, Perplexity,
  Gemini), por encima de búsqueda pagada y orgánica. No cuesta por clic.
