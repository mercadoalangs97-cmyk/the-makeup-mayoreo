"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Panel del bot vendedor: conversaciones de WhatsApp y Telegram, propuestas
// por aprobar (modo copiloto), lotes con foto y cotizaciones del bot. Entra
// con el mismo usuario y contraseña del panel de inventario.

type Conv = {
  canal_id: string; canal: string; nombre: string | null; telefono: string | null; estado: string; cotizacion_id: string | null;
  lote_id: string | null; ultimo_cliente_en: string | null; ultimo_bot_en: string | null; resumen: Record<string, unknown> | null;
  etapa?: string; compras?: number; total_compras?: number;
};
type Clienta = { telefono: string; nombre: string | null; ciudad: string | null; notas: string | null; canal_id: string | null; ultimo_contacto: string | null; compras: number; total: number; ultima: number };
type Ficha = { clave: string; nombre: string | null; notas: string | null } | null;
type Compras = { n: number; total: number; ultima: number; detalle: { total: number; fecha: number; que: string }[] } | null;

// Etapas del CRM (las calcula el servidor con lo que ya se sabe de cada chat).
const ETAPAS: Record<string, { t: string; c: string }> = {
  nueva: { t: "Nueva", c: "#9ca3af" },
  interesada: { t: "Interesada", c: "#e0a000" },
  cotizada: { t: "Cotizada", c: "#3b82f6" },
  apartada: { t: "Apartada", c: "#8b5cf6" },
  clienta: { t: "Clienta", c: "#16a34a" },
  recompra: { t: "Recompra", c: "#db2777" },
  perdida: { t: "Perdida", c: "#6b7280" },
};
const FILTROS = ["todas", "sin leer", "en tu control", "nueva", "interesada", "cotizada", "apartada", "clienta", "recompra", "perdida"] as const;

/* ---------- "visto" por dispositivo: qué mensajes de clientas ya viste en ESTE panel ---------- */
const VISTO_KEY = "pb-visto-v1";
function leerVisto(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(VISTO_KEY) || "{}"); } catch { return {}; }
}
function guardarVisto(v: Record<string, string>) {
  try { localStorage.setItem(VISTO_KEY, JSON.stringify(v)); } catch { /* modo privado */ }
}

/* ---------- sonido de aviso (Web Audio; en iPhone se desbloquea con el botón de activar avisos) ---------- */
let audioCtx: AudioContext | null = null;
function desbloquearAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx ||= new AC();
    void audioCtx.resume();
  } catch { /* sin audio */ }
}
function sonar() {
  try {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = audioCtx!.createOscillator(); const g = audioCtx!.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, now + i * 0.16); g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.16 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.15);
      o.connect(g); g.connect(audioCtx!.destination); o.start(now + i * 0.16); o.stop(now + i * 0.16 + 0.16);
    });
  } catch { /* sin audio */ }
}
type Msg = { id: number; direccion: "in" | "out"; tipo: string; texto: string | null; media: { lote_id?: string; url?: string; tg_file_id?: string } | null; por: string; creado: string; ext_id?: string | null };
type Pend = { id: number; canal_id: string; texto: string; adjunto: { tipo: string; lote_id: string } | null; creado: string };
type Lote = { id: string; nombre: string; piezas: number; precio: number; tipo: string; descripcion: string | null; fotos: { url: string }[]; estado: string; apartado_para: string | null; apartado_hasta: string | null; cotizacion_id: string | null; vendido_a: string | null; salida_registrada: boolean; creado_en: string };
type Cot = { id: string; canal_id: string; lote_id: string | null; total: number | null; link: string | null; creada: string; seguimientos: number; cerrada: boolean; sitio: { cliente_nombre: string | null; total: number; vistas: number | null; pago_click_en: number | null; pagada: boolean | null; transferencia_aviso_en: number | null; apartado_monto: number | null } | null };

/** Achica una imagen a máx 1600 px y la pasa a JPEG (sirve también para HEIC en Safari). */
async function achicarFoto(f: File): Promise<Blob> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error("No pude abrir la foto")); i.src = url; });
    const esc = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * esc); c.height = Math.round(img.naturalHeight * esc);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error("No pude convertir la foto"))), "image/jpeg", 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}

const fmx = (n: number | null | undefined) => (n == null ? "—" : "$" + Number(n).toLocaleString("es-MX", { maximumFractionDigits: 0 }));
const hace = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} d`;
};
const hora = (iso: string) => new Date(iso).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const canalIcono = (c: string) => (c.startsWith("wa:") ? "🟢" : "🔵");
const estadoCot = (s: Cot["sitio"]) => !s ? "?" : s.pagada ? "PAGADA" : s.transferencia_aviso_en ? "dice que transfirió" : Number(s.apartado_monto) > 0 ? "apartada" : s.pago_click_en ? "le dio a pagar" : (s.vistas ?? 0) ? `vista ${s.vistas}×` : "sin abrir";

export default function PanelBot() {
  const sb = useMemo<SupabaseClient | null>(() => {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL, k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return u && k ? createClient(u, k, { auth: { persistSession: true, storageKey: "panel-bot-auth" } }) : null;
  }, []);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState(""); const [pass, setPass] = useState(""); const [errLogin, setErrLogin] = useState("");
  const [tab, setTab] = useState<"chats" | "clientas" | "lotes" | "cots">("chats");
  const [filtroEtapa, setFiltroEtapa] = useState<(typeof FILTROS)[number]>("todas");
  const [visto, setVisto] = useState<Record<string, string>>({});
  const [avisosOn, setAvisosOn] = useState(false);
  const [clientas, setClientas] = useState<Clienta[]>([]);
  const [notas, setNotas] = useState(""); const [notasCanal, setNotasCanal] = useState<string | null>(null);
  const previoRef = useRef<Record<string, string> | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]); const [pends, setPends] = useState<Pend[]>([]); const [modo, setModo] = useState("copiloto");
  const [sel, setSel] = useState<string | null>(null);
  const [hilo, setHilo] = useState<{ mensajes: Msg[]; conversacion: Conv | null; cotizacion: Record<string, unknown> | null; lote: Lote | null; clienta?: Ficha; compras?: Compras } | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]); const [cots, setCots] = useState<Cot[]>([]);
  const [texto, setTexto] = useState(""); const [ocupado, setOcupado] = useState(false); const [aviso, setAviso] = useState("");
  const [filtro, setFiltro] = useState("");
  const finRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const api = useCallback(async (q: string, extra = "") => {
    const r = await fetch(`/api/bot/panel?q=${q}${extra}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    if (r.status === 401) { setToken(null); throw new Error("Sesión expirada"); }
    return r.json();
  }, [token]);
  const accion = useCallback(async (body: Record<string, unknown>) => {
    setOcupado(true); setAviso("");
    try {
      const r = await fetch(`/api/bot/panel`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      return d;
    } catch (e) { setAviso("❌ " + (e as Error).message); return null; } finally { setOcupado(false); }
  }, [token]);

  const cargarLista = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api("conversaciones");
      const lista: Conv[] = d.conversaciones || [];
      setConvs(lista); setPends(d.pendientes || []); setModo(d.modo || "copiloto");
      // ¿Qué clientas escribieron desde la última vuelta? → sonido + notificación del navegador.
      const actual: Record<string, string> = {};
      for (const c of lista) if (c.ultimo_cliente_en) actual[c.canal_id] = c.ultimo_cliente_en;
      const previo = previoRef.current;
      previoRef.current = actual;
      if (previo) {
        const nuevos = lista.filter((c) => c.ultimo_cliente_en && c.ultimo_cliente_en > (previo[c.canal_id] || ""));
        if (nuevos.length) {
          sonar();
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            for (const c of nuevos.slice(0, 3)) {
              try {
                const n = new Notification(`${c.estado === "escalada" ? "🔴 En tu control · " : "💬 "}${c.nombre || c.telefono || "Clienta"}`, { body: c.estado === "escalada" ? "Te escribió y está esperando que le contestes" : "Mensaje nuevo", tag: c.canal_id });
                n.onclick = () => { window.focus(); setTab("chats"); setSel(c.canal_id); };
              } catch { /* iOS sin PWA: sin notificación del sistema */ }
            }
          }
        }
      }
    } catch { /* se reintenta en el siguiente ciclo */ }
  }, [api, token]);
  const cargarHilo = useCallback(async (canal: string) => {
    try { setHilo(await api("mensajes", `&canal=${encodeURIComponent(canal)}`)); } catch { /* idem */ }
  }, [api]);
  const cargarLotes = useCallback(async () => { try { setLotes((await api("lotes")).lotes || []); } catch { /* idem */ } }, [api]);
  const cargarCots = useCallback(async () => { try { setCots((await api("cotizaciones")).cotizaciones || []); } catch { /* idem */ } }, [api]);
  const cargarClientas = useCallback(async () => { try { setClientas((await api("clientes")).clientes || []); } catch { /* idem */ } }, [api]);

  useEffect(() => {
    if (!token) return;
    cargarLista(); cargarLotes(); cargarCots();
    const t = setInterval(() => { cargarLista(); if (sel) cargarHilo(sel); }, 10000);
    return () => clearInterval(t);
  }, [token, sel, cargarLista, cargarHilo, cargarLotes, cargarCots]);
  useEffect(() => { if (sel) cargarHilo(sel); }, [sel, cargarHilo]);
  useEffect(() => {
    const v = leerVisto();
    setVisto(v);
    setAvisosOn(typeof Notification !== "undefined" && Notification.permission === "granted");
  }, []);
  useEffect(() => {
    // Primera vez en este dispositivo: lo que ya existía no cuenta como "sin leer".
    if (!convs.length) return;
    const v = leerVisto();
    if (!Object.keys(v).length) {
      const todo: Record<string, string> = {};
      for (const c of convs) if (c.ultimo_cliente_en) todo[c.canal_id] = c.ultimo_cliente_en;
      guardarVisto(todo); setVisto(todo);
    }
  }, [convs]);
  // El chat abierto se marca como visto cada vez que se recarga.
  useEffect(() => {
    if (!sel || !hilo?.conversacion?.ultimo_cliente_en) return;
    const v = { ...leerVisto(), [sel]: hilo.conversacion.ultimo_cliente_en };
    guardarVisto(v); setVisto(v);
  }, [sel, hilo?.conversacion?.ultimo_cliente_en]);
  const sinLeer = useCallback((c: Conv) => Boolean(c.ultimo_cliente_en && c.ultimo_cliente_en > (visto[c.canal_id] || "") && c.canal_id !== sel), [visto, sel]);
  const nSinLeer = convs.filter(sinLeer).length;
  useEffect(() => { document.title = (nSinLeer ? `(${nSinLeer}) ` : "") + "Panel del bot · The Makeup"; }, [nSinLeer]);
  // Notas de la clienta abierta.
  useEffect(() => {
    if (!sel || notasCanal === sel) return;
    if (hilo?.conversacion?.canal_id === sel) { setNotas(hilo.clienta?.notas || ""); setNotasCanal(sel); }
  }, [sel, hilo, notasCanal]);
  useEffect(() => { finRef.current?.scrollIntoView({ block: "end" }); }, [hilo?.mensajes.length]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault(); setErrLogin("");
    if (!sb) return setErrLogin("Falta configuración de Supabase.");
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) setErrLogin("Correo o contraseña incorrectos.");
  }
  async function enviar() {
    if (!sel || !texto.trim()) return;
    const d = await accion({ accion: "enviar", canalId: sel, texto: texto.trim() });
    if (d?.ok) { setTexto(""); await cargarHilo(sel); await cargarLista(); }
  }
  async function adjuntar(f: File | undefined) {
    if (!sel || !f) return;
    setOcupado(true); setAviso("");
    try {
      // Las fotos del iPhone pesan 3-8 MB (y pueden venir en HEIC): Vercel rechaza más de 4.5 MB con una
      // respuesta que no es JSON y Safari lo mostraba como "The string did not match the expected pattern".
      // Se achica en el navegador a 1600 px en JPEG antes de subir.
      const chica = await achicarFoto(f);
      const fd = new FormData(); fd.append("archivo", chica, "foto.jpg");
      const r = await fetch("/api/bot/panel", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: fd });
      const txt = await r.text();
      let d: { ok?: boolean; url?: string; error?: string } = {};
      try { d = JSON.parse(txt); } catch { throw new Error(r.status === 413 ? "La foto pesa demasiado" : `El servidor respondió ${r.status}`); }
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      const e = await accion({ accion: "enviar", canalId: sel, fotoUrl: d.url, texto: texto.trim() });
      if (e?.ok) { setTexto(""); await cargarHilo(sel); await cargarLista(); }
    } catch (e) { setAviso("❌ " + (e as Error).message); } finally { setOcupado(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function estado(canal: string, est: string) { if (await accion({ accion: "estado", canalId: canal, estado: est })) { await cargarLista(); if (sel === canal) await cargarHilo(canal); } }
  async function pendiente(id: number, acc: "ok" | "no" | "editar") {
    let txt: string | null = null;
    if (acc === "editar") { txt = window.prompt("Texto que se manda en lugar del propuesto:"); if (!txt) return; }
    await accion({ accion: "pendiente", id, op: acc, texto: txt });
    await cargarLista(); if (sel) await cargarHilo(sel);
  }
  async function activarAvisos() {
    desbloquearAudio();
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      try { await Notification.requestPermission(); } catch { /* Safari viejo */ }
    }
    setAvisosOn(true);
    sonar();
  }
  async function guardarNotas() {
    if (!sel) return;
    const d = await accion({ accion: "nota", canalId: sel, telefono: hilo?.conversacion?.telefono, nombre: hilo?.conversacion?.nombre, notas });
    if (d?.ok) setAviso("✅ Notas guardadas");
  }
  async function loteAccion(id: string, acc: string, extra: Record<string, unknown> = {}) {
    if (acc === "vendido" && !window.confirm(`¿Marcar ${id} como vendido?`)) return;
    if (acc === "quitar" && !window.confirm(`¿Retirar ${id} de la venta?`)) return;
    if (await accion({ accion: "lote", id, op: acc, ...extra })) await cargarLotes();
  }

  const lista = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return convs
      .filter((c) => !f || (c.nombre ?? "").toLowerCase().includes(f) || (c.telefono ?? "").includes(f) || c.canal_id.includes(f))
      .filter((c) => filtroEtapa === "todas" ? true : filtroEtapa === "sin leer" ? sinLeer(c) : filtroEtapa === "en tu control" ? c.estado === "escalada" : c.etapa === filtroEtapa);
  }, [convs, filtro, filtroEtapa, sinLeer]);
  const conteo = (f: (typeof FILTROS)[number]) => f === "todas" ? convs.length : f === "sin leer" ? nSinLeer : f === "en tu control" ? convs.filter((c) => c.estado === "escalada").length : convs.filter((c) => c.etapa === f).length;
  const pendsDe = (canal: string) => pends.filter((p) => p.canal_id === canal);

  if (!token) {
    return (
      <main className="pb-login">
        <form onSubmit={entrar} className="pb-card">
          <h1>Panel del bot</h1>
          <p>Entra con tu usuario del panel de inventario.</p>
          <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)} required />
          {errLogin && <div className="pb-err">{errLogin}</div>}
          <button type="submit">Entrar</button>
        </form>
        <style jsx global>{estilos}</style>
      </main>
    );
  }

  return (
    <main className="pb">
      <header className="pb-top">
        <strong>Bot vendedor</strong>
        <nav>
          <button className={tab === "chats" ? "on" : ""} onClick={() => setTab("chats")}>Chats{nSinLeer ? <span className="pb-badge">{nSinLeer}</span> : null}{pends.length ? ` · ${pends.length} por aprobar` : ""}</button>
          <button className={tab === "clientas" ? "on" : ""} onClick={() => { setTab("clientas"); cargarClientas(); }}>Clientas</button>
          <button className={tab === "lotes" ? "on" : ""} onClick={() => { setTab("lotes"); cargarLotes(); }}>Lotes</button>
          <button className={tab === "cots" ? "on" : ""} onClick={() => { setTab("cots"); cargarCots(); }}>Cotizaciones</button>
        </nav>
        <span className="pb-modo">
          {!avisosOn && <button className="avisos" onClick={activarAvisos}>🔔 Activar avisos</button>}
          modo <b>{modo}</b>
          <button onClick={async () => { const n = modo === "auto" ? "copiloto" : "auto"; if (await accion({ accion: "modo", modo: n })) setModo(n); }}>cambiar</button>
          <button onClick={() => sb?.auth.signOut()}>salir</button>
        </span>
      </header>
      {aviso && <div className="pb-aviso">{aviso}</div>}

      {tab === "chats" && (
        <section className={"pb-chats" + (sel ? " con-hilo" : "")}>
          <aside className="pb-lista">
            <input placeholder="Buscar nombre o teléfono" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
            <div className="pb-filtros">
              {FILTROS.map((f) => {
                const n = conteo(f);
                if (!n && f !== "todas" && f !== filtroEtapa) return null;
                const col = ETAPAS[f]?.c;
                return <button key={f} className={"chip" + (filtroEtapa === f ? " on" : "")} style={col ? { borderColor: col, ...(filtroEtapa === f ? { background: col, color: "#fff" } : { color: col }) } : undefined} onClick={() => setFiltroEtapa(f)}>{ETAPAS[f]?.t || f} {n}</button>;
              })}
            </div>
            {lista.map((c) => {
              const et = ETAPAS[c.etapa || "nueva"] || ETAPAS.nueva;
              const nuevo = sinLeer(c);
              return (
                <button key={c.canal_id} className={"pb-conv" + (sel === c.canal_id ? " sel" : "") + (c.estado !== "bot" ? " " + c.estado : "") + (nuevo ? " nuevo" : "")} style={{ borderLeftColor: c.estado === "escalada" ? "#e0a000" : et.c }} onClick={() => setSel(c.canal_id)}>
                  <div className="l1">{nuevo && <span className="punto" />}{canalIcono(c.canal_id)} <b>{c.nombre || "Sin nombre"}</b> <span className="hace">{hace(c.ultimo_cliente_en)}</span></div>
                  <div className="l2">
                    <span className="etq" style={{ background: et.c }}>{et.t}</span>
                    {c.estado === "escalada" && <span className="etq" style={{ background: "#e0a000" }}>EN TU CONTROL</span>}
                    {c.estado === "pausada" && <span className="etq" style={{ background: "#6b7280" }}>pausada</span>}
                    {(c.compras ?? 0) > 0 && <span className="etq" style={{ background: "#16a34a" }}>🛍 {c.compras} · {fmx(c.total_compras)}</span>}
                    {" "}{c.telefono || c.canal_id}{c.cotizacion_id ? ` · ${c.cotizacion_id}` : ""}{c.lote_id ? ` · ${c.lote_id}` : ""}
                    {pendsDe(c.canal_id).length ? ` · ⏳ ${pendsDe(c.canal_id).length} por aprobar` : ""}
                  </div>
                </button>
              );
            })}
            {!lista.length && <p className="pb-vacio">Sin conversaciones todavía.</p>}
          </aside>
          <div className="pb-hilo">
            {!sel && <p className="pb-vacio">Elige una conversación.</p>}
            {sel && hilo && (
              <>
                <div className="pb-hilo-top">
                  <button className="volver" onClick={() => setSel(null)}>←</button>
                  <div>
                    <b>{hilo.conversacion?.nombre || "Sin nombre"}</b> <small>{hilo.conversacion?.telefono || sel}</small>
                    <div className="sub">
                      estado <b>{hilo.conversacion?.estado}</b>
                      {hilo.cotizacion ? <> · cot <a href={`/cotizacion/${String(hilo.cotizacion.id)}`} target="_blank">{String(hilo.cotizacion.id)}</a> {fmx(Number(hilo.cotizacion.total))} · {estadoCot(hilo.cotizacion as Cot["sitio"])}</> : null}
                      {hilo.lote ? <> · lote <b>{hilo.lote.id}</b> ({hilo.lote.estado})</> : null}
                    </div>
                    <div className="sub">
                      {hilo.compras ? <>🛍 <b>{hilo.compras.n} compra{hilo.compras.n === 1 ? "" : "s"}</b> · {fmx(hilo.compras.total)} · última {new Date(hilo.compras.ultima).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short" })}</> : "Sin compras registradas"}
                    </div>
                    <details className="pb-ficha">
                      <summary>Ficha y notas</summary>
                      {hilo.compras?.detalle.map((d, i) => <div key={i} className="compra">{new Date(d.fecha).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "2-digit" })} · {fmx(d.total)} · {d.que}</div>)}
                      <textarea rows={3} placeholder="Notas de la clienta (qué le gusta, dónde vende, cuándo recompra…)" value={notas} onChange={(e) => setNotas(e.target.value)} />
                      <button disabled={ocupado} onClick={guardarNotas}>Guardar notas</button>
                    </details>
                  </div>
                  <div className="acciones">
                    {hilo.conversacion?.estado !== "escalada" && <button onClick={() => estado(sel, "escalada")}>Tomar control</button>}
                    {hilo.conversacion?.estado !== "bot" && <button onClick={() => estado(sel, "bot")}>Devolver al bot</button>}
                    {hilo.conversacion?.estado !== "pausada" && <button onClick={() => estado(sel, "pausada")}>Pausar</button>}
                    <button onClick={() => accion({ accion: "seguimiento", canalId: sel })}>Seguimiento</button>
                  </div>
                </div>
                <div className="pb-msgs" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); adjuntar(e.dataTransfer.files?.[0]); }}>
                  {hilo.mensajes.map((m) => (
                    <div key={m.id} className={"pb-msg " + (m.direccion === "in" ? "in" : m.por === "alan" ? "alan" : m.por === "sistema" ? "sis" : "bot")}>
                      {m.tipo === "fotos" && m.media?.lote_id !== "panel" && <div className="tag">📷 fotos del {m.media?.lote_id}</div>}
                      {m.media?.url && <img className="foto" src={m.media.url} alt="" loading="lazy" />}
                      {m.tipo === "photo" && !m.media?.url && <div className="tag">📎 foto de la clienta</div>}
                      <div className="txt">{m.texto}</div>
                      <div className="meta">{m.direccion === "in" ? "clienta" : m.por} · {hora(m.creado)}
                        {m.direccion === "out" && m.ext_id && sel?.startsWith("tg:") && Date.now() - Date.parse(m.creado) < 47 * 3600_000 && m.texto !== "[mensaje borrado]" && (
                          <button className="borrar" title="Borrar para la clienta (solo Telegram)" onClick={async () => { if (window.confirm("¿Borrar este mensaje del chat de la clienta?")) { const d = await accion({ accion: "borrar", canalId: sel, extId: m.ext_id }); if (d?.ok) cargarHilo(sel); } }}>🗑</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {pendsDe(sel).map((p) => (
                    <div key={"p" + p.id} className="pb-msg pend">
                      <div className="tag">⏳ Propuesta del bot por aprobar{p.adjunto ? ` (con fotos del ${p.adjunto.lote_id})` : ""}</div>
                      <div className="txt">{p.texto}</div>
                      <div className="btns">
                        <button disabled={ocupado} onClick={() => pendiente(p.id, "ok")}>✅ Aprobar</button>
                        <button disabled={ocupado} onClick={() => pendiente(p.id, "editar")}>✏️ Editar</button>
                        <button disabled={ocupado} onClick={() => pendiente(p.id, "no")}>🗑 Descartar</button>
                      </div>
                    </div>
                  ))}
                  <div ref={finRef} />
                </div>
                <div className="pb-escribir">
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => adjuntar(e.target.files?.[0])} />
                  <button className="clip" title="Adjuntar foto (se manda con el texto como pie)" disabled={ocupado} onClick={() => fileRef.current?.click()}>📎</button>
                  <textarea placeholder="Escribir a la clienta (la conversación pasa a tu control). Puedes pegar o arrastrar una foto aquí." value={texto} onChange={(e) => setTexto(e.target.value)} rows={2}
                    onPaste={(e) => { const f = Array.from(e.clipboardData.files || []).find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); adjuntar(f); } }}
                    onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); adjuntar(e.dataTransfer.files?.[0]); }} />
                  <button disabled={ocupado || !texto.trim()} onClick={enviar}>Enviar</button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {tab === "clientas" && (
        <section className="pb-cots">
          <p className="pb-vacio" style={{ padding: "0 0 10px" }}>Todas las clientas que han escrito al bot o comprado en la web, con sus compras. Las que ya compraron y no han vuelto son candidatas a recompra.</p>
          <table>
            <thead><tr><th>Clienta</th><th>Teléfono</th><th>Compras</th><th>Total</th><th>Última compra</th><th>Último contacto</th><th>Notas</th></tr></thead>
            <tbody>
              {clientas.map((c) => (
                <tr key={c.telefono} className={c.compras >= 2 ? "pagada" : ""}>
                  <td>{c.canal_id ? <button className="link" onClick={() => { setTab("chats"); setSel(c.canal_id); }}>{c.nombre || "—"}</button> : (c.nombre || "—")}</td>
                  <td>{c.telefono}</td>
                  <td>{c.compras || "—"}</td>
                  <td>{c.compras ? fmx(c.total) : "—"}</td>
                  <td>{c.ultima ? new Date(c.ultima).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "2-digit" }) : "—"}</td>
                  <td>{c.ultimo_contacto ? hace(c.ultimo_contacto) : "—"}</td>
                  <td style={{ maxWidth: 260 }}>{c.notas || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!clientas.length && <p className="pb-vacio">Cargando…</p>}
        </section>
      )}

      {tab === "lotes" && (
        <section className="pb-lotes">
          {lotes.map((l) => (
            <div key={l.id} className={"pb-lote " + l.estado}>
              {l.fotos?.[0]?.url ? <img src={l.fotos[0].url} alt={l.id} loading="lazy" /> : <div className="sinfoto">sin foto</div>}
              <div className="info">
                <b>{l.id}</b> · {l.piezas} pzas · {fmx(l.precio)} <span className={"est " + l.estado}>{l.estado}{l.estado === "vendido" && !l.salida_registrada ? " · SIN salida" : ""}</span>
                <div className="desc">{l.descripcion}</div>
                {l.apartado_para && <div className="desc">apartado para {l.apartado_para}{l.apartado_hasta ? ` hasta ${hora(l.apartado_hasta)}` : ""}</div>}
                {l.vendido_a && <div className="desc">vendido a {l.vendido_a}</div>}
                <div className="btns">
                  {l.estado !== "vendido" && <button onClick={() => loteAccion(l.id, "vendido")}>Vendido</button>}
                  {l.estado !== "disponible" && <button onClick={() => loteAccion(l.id, "libre")}>Disponible</button>}
                  {l.estado !== "retirado" && <button onClick={() => loteAccion(l.id, "quitar")}>Retirar</button>}
                  {l.estado === "vendido" && !l.salida_registrada && <button onClick={() => loteAccion(l.id, "salida")}>Salida registrada</button>}
                  <button onClick={() => { const p = window.prompt(`Precio nuevo para ${l.id}:`, String(l.precio)); if (p && Number(p) > 0) loteAccion(l.id, "editar", { precio: Number(p) }); }}>Precio</button>
                </div>
              </div>
            </div>
          ))}
          {!lotes.length && <p className="pb-vacio">Sin lotes. Mándale fotos al bot por Telegram para cargarlos.</p>}
        </section>
      )}

      {tab === "cots" && (
        <section className="pb-cots">
          <table>
            <thead><tr><th>Código</th><th>Clienta</th><th>Total</th><th>Estado</th><th>Lote</th><th>Seg.</th><th>Creada</th></tr></thead>
            <tbody>
              {cots.map((c) => (
                <tr key={c.id} className={c.sitio?.pagada ? "pagada" : c.cerrada ? "cerrada" : ""}>
                  <td><a href={c.link || `/cotizacion/${c.id}`} target="_blank">{c.id}</a></td>
                  <td><button className="link" onClick={() => { setTab("chats"); setSel(c.canal_id); }}>{c.sitio?.cliente_nombre || c.canal_id}</button></td>
                  <td>{fmx(c.sitio?.total ?? c.total)}</td>
                  <td>{estadoCot(c.sitio)}</td>
                  <td>{c.lote_id || "catálogo"}</td>
                  <td>{c.seguimientos}/3</td>
                  <td>{hora(c.creada)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cots.length && <p className="pb-vacio">El bot aún no ha cotizado.</p>}
        </section>
      )}
      <style jsx global>{estilos}</style>
    </main>
  );
}

const estilos = `
  .pb, .pb-login { font-family: Jost, system-ui, sans-serif; color: #2c2420; background: #faf6f0; min-height: 100vh; }
  .pb-login { display: grid; place-items: center; padding: 16px; }
  .pb-card { background: #fff; padding: 24px; border-radius: 14px; width: min(360px, 100%); display: grid; gap: 10px; box-shadow: 0 4px 24px #0001; }
  .pb-card h1 { margin: 0; font-size: 22px; } .pb-card p { margin: 0 0 6px; color: #8a7068; font-size: 14px; }
  .pb input, .pb textarea, .pb-card input { font: inherit; font-size: 16px; padding: 10px; border: 1px solid #d4b8a8; border-radius: 10px; width: 100%; box-sizing: border-box; }
  .pb button, .pb-card button { font: inherit; font-size: 14px; padding: 8px 12px; border-radius: 10px; border: 1px solid #c9807a; background: #fff; color: #9e5550; cursor: pointer; }
  .pb-card button[type=submit] { background: #c9807a; color: #fff; }
  .pb button.on { background: #c9807a; color: #fff; } .pb button:disabled { opacity: .5; }
  .pb-err { color: #b00020; font-size: 14px; } .pb-aviso { background: #fde8e6; color: #9e5550; padding: 8px 16px; }
  .pb-top { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 10px 16px; background: #fff; border-bottom: 1px solid #f2e0d8; position: sticky; top: 0; z-index: 2; }
  .pb-top nav { display: flex; gap: 6px; } .pb-modo { margin-left: auto; font-size: 13px; display: flex; gap: 6px; align-items: center; }
  .pb-chats { display: grid; grid-template-columns: 340px 1fr; height: calc(100vh - 58px); }
  .pb-lista { overflow: auto; border-right: 1px solid #f2e0d8; background: #fff; padding: 8px; display: grid; gap: 6px; align-content: start; }
  .pb-conv { text-align: left; display: block; width: 100%; border: 1px solid #f2e0d8; background: #fff; color: inherit; border-radius: 10px; padding: 8px 10px; }
  .pb-conv.sel { border-color: #c9807a; background: #fdf3f0; } .pb-conv.escalada { border-left: 4px solid #e0a000; } .pb-conv.pausada { opacity: .6; }
  .pb-conv .l1 { display: flex; gap: 6px; align-items: baseline; } .pb-conv .hace { margin-left: auto; color: #8a7068; font-size: 12px; }
  .pb-conv .l2 { font-size: 12px; color: #8a7068; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .pb-conv { border-left-width: 5px !important; }
  .pb-conv.nuevo { background: #fff7f5; } .pb-conv.nuevo b { font-weight: 800; }
  .pb-conv .punto { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #e11d48; margin-right: 2px; flex: none; }
  .pb-conv .etq { color: #fff; border-radius: 999px; padding: 1px 8px; font-size: 11px; }
  .pb-filtros { display: flex; flex-wrap: wrap; gap: 4px; }
  .pb-filtros .chip { padding: 3px 9px; font-size: 12px; border-radius: 999px; }
  .pb-badge { display: inline-block; background: #e11d48; color: #fff; border-radius: 999px; font-size: 11px; padding: 0 7px; margin-left: 6px; }
  .pb-modo .avisos { background: #fde68a; border-color: #e0a000; color: #7a5200; }
  .pb-ficha { margin-top: 6px; font-size: 13px; } .pb-ficha summary { cursor: pointer; color: #9e5550; }
  .pb-ficha .compra { color: #5b4a44; font-size: 12px; margin: 2px 0; } .pb-ficha textarea { margin: 6px 0; font-size: 14px; }
  .pb-hilo { display: grid; grid-template-rows: auto 1fr auto; min-height: 0; }
  .pb-hilo-top { display: flex; gap: 10px; align-items: center; padding: 10px 14px; background: #fff; border-bottom: 1px solid #f2e0d8; flex-wrap: wrap; }
  .pb-hilo-top .sub { font-size: 13px; color: #8a7068; } .pb-hilo-top .acciones { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; }
  .pb-hilo-top .volver { display: none; }
  .pb-msgs { overflow: auto; padding: 14px; display: grid; gap: 8px; align-content: start; }
  .pb-msg { max-width: 78%; padding: 8px 12px; border-radius: 12px; font-size: 15px; white-space: pre-wrap; background: #fff; border: 1px solid #f2e0d8; }
  .pb-msg.in { justify-self: start; background: #fff; } .pb-msg.bot { justify-self: end; background: #f2e0d8; }
  .pb-msg.alan { justify-self: end; background: #e8d5a8; } .pb-msg.sis { justify-self: end; background: #eee; }
  .pb-msg.pend { justify-self: end; background: #fff7e0; border-color: #e0a000; }
  .pb-msg .meta { font-size: 11px; color: #8a7068; margin-top: 4px; display: flex; gap: 6px; align-items: center; }
  .pb-msg .meta .borrar { border: 0; background: none; padding: 0 2px; font-size: 12px; cursor: pointer; opacity: .6; } .pb-msg .meta .borrar:hover { opacity: 1; } .pb-msg .tag { font-size: 12px; color: #9e5550; margin-bottom: 4px; }
  .pb-msg .btns { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
  .pb-escribir { display: flex; gap: 8px; padding: 10px 14px; background: #fff; border-top: 1px solid #f2e0d8; align-items: stretch; }
  .pb-escribir .clip { padding: 8px 10px; font-size: 18px; }
  .pb-msg .foto { display: block; max-width: 260px; max-height: 260px; border-radius: 8px; margin: 4px 0; }
  .pb-vacio { color: #8a7068; padding: 20px; }
  .pb-lotes { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; padding: 14px; }
  .pb-lote { background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #f2e0d8; display: grid; grid-template-columns: 120px 1fr; }
  .pb-lote img { width: 120px; height: 100%; object-fit: cover; } .pb-lote .sinfoto { background: #eee; display: grid; place-items: center; color: #8a7068; }
  .pb-lote .info { padding: 10px; font-size: 14px; } .pb-lote .desc { color: #8a7068; font-size: 12px; margin-top: 4px; }
  .pb-lote .btns { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; } .pb-lote .btns button { padding: 4px 8px; font-size: 12px; }
  .pb-lote.vendido { opacity: .7; } .pb-lote.retirado { opacity: .5; }
  .est { font-size: 12px; padding: 2px 8px; border-radius: 999px; background: #eee; margin-left: 6px; } .est.disponible { background: #dcf5e3; } .est.apartado { background: #fff1c2; } .est.vendido { background: #f2e0d8; }
  .pb-cots { padding: 14px; overflow: auto; } .pb-cots table { border-collapse: collapse; width: 100%; background: #fff; font-size: 14px; }
  .pb-cots th, .pb-cots td { padding: 8px 10px; border-bottom: 1px solid #f2e0d8; text-align: left; } .pb-cots tr.pagada { background: #f0fbf3; } .pb-cots tr.cerrada { opacity: .6; }
  .pb-cots button.link { border: 0; background: none; color: #9e5550; text-decoration: underline; padding: 0; }
  @media (max-width: 760px) {
    .pb-chats { grid-template-columns: 1fr; }
    .pb-chats.con-hilo .pb-lista { display: none; } .pb-chats:not(.con-hilo) .pb-hilo { display: none; }
    .pb-hilo-top .volver { display: inline-block; } .pb-msg { max-width: 92%; }
  }
`;
