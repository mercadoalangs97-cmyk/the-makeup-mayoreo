"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Panel del bot vendedor: conversaciones de WhatsApp y Telegram, propuestas
// por aprobar (modo copiloto), lotes con foto y cotizaciones del bot. Entra
// con el mismo usuario y contraseña del panel de inventario.

type Conv = {
  canal_id: string; canal: string; nombre: string | null; telefono: string | null; estado: string; cotizacion_id: string | null;
  lote_id: string | null; ultimo_cliente_en: string | null; ultimo_bot_en: string | null; resumen: Record<string, unknown> | null;
};
type Msg = { id: number; direccion: "in" | "out"; tipo: string; texto: string | null; media: { lote_id?: string } | null; por: string; creado: string };
type Pend = { id: number; canal_id: string; texto: string; adjunto: { tipo: string; lote_id: string } | null; creado: string };
type Lote = { id: string; nombre: string; piezas: number; precio: number; tipo: string; descripcion: string | null; fotos: { url: string }[]; estado: string; apartado_para: string | null; apartado_hasta: string | null; cotizacion_id: string | null; vendido_a: string | null; salida_registrada: boolean; creado_en: string };
type Cot = { id: string; canal_id: string; lote_id: string | null; total: number | null; link: string | null; creada: string; seguimientos: number; cerrada: boolean; sitio: { cliente_nombre: string | null; total: number; vistas: number | null; pago_click_en: number | null; pagada: boolean | null; transferencia_aviso_en: number | null; apartado_monto: number | null } | null };

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
  const [tab, setTab] = useState<"chats" | "lotes" | "cots">("chats");
  const [convs, setConvs] = useState<Conv[]>([]); const [pends, setPends] = useState<Pend[]>([]); const [modo, setModo] = useState("copiloto");
  const [sel, setSel] = useState<string | null>(null);
  const [hilo, setHilo] = useState<{ mensajes: Msg[]; conversacion: Conv | null; cotizacion: Record<string, unknown> | null; lote: Lote | null } | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]); const [cots, setCots] = useState<Cot[]>([]);
  const [texto, setTexto] = useState(""); const [ocupado, setOcupado] = useState(false); const [aviso, setAviso] = useState("");
  const [filtro, setFiltro] = useState("");
  const finRef = useRef<HTMLDivElement>(null);

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
      setConvs(d.conversaciones || []); setPends(d.pendientes || []); setModo(d.modo || "copiloto");
    } catch { /* se reintenta en el siguiente ciclo */ }
  }, [api, token]);
  const cargarHilo = useCallback(async (canal: string) => {
    try { setHilo(await api("mensajes", `&canal=${encodeURIComponent(canal)}`)); } catch { /* idem */ }
  }, [api]);
  const cargarLotes = useCallback(async () => { try { setLotes((await api("lotes")).lotes || []); } catch { /* idem */ } }, [api]);
  const cargarCots = useCallback(async () => { try { setCots((await api("cotizaciones")).cotizaciones || []); } catch { /* idem */ } }, [api]);

  useEffect(() => {
    if (!token) return;
    cargarLista(); cargarLotes(); cargarCots();
    const t = setInterval(() => { cargarLista(); if (sel) cargarHilo(sel); }, 12000);
    return () => clearInterval(t);
  }, [token, sel, cargarLista, cargarHilo, cargarLotes, cargarCots]);
  useEffect(() => { if (sel) cargarHilo(sel); }, [sel, cargarHilo]);
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
  async function estado(canal: string, est: string) { if (await accion({ accion: "estado", canalId: canal, estado: est })) { await cargarLista(); if (sel === canal) await cargarHilo(canal); } }
  async function pendiente(id: number, acc: "ok" | "no" | "editar") {
    let txt: string | null = null;
    if (acc === "editar") { txt = window.prompt("Texto que se manda en lugar del propuesto:"); if (!txt) return; }
    await accion({ accion: "pendiente", id, op: acc, texto: txt });
    await cargarLista(); if (sel) await cargarHilo(sel);
  }
  async function loteAccion(id: string, acc: string, extra: Record<string, unknown> = {}) {
    if (acc === "vendido" && !window.confirm(`¿Marcar ${id} como vendido?`)) return;
    if (acc === "quitar" && !window.confirm(`¿Retirar ${id} de la venta?`)) return;
    if (await accion({ accion: "lote", id, op: acc, ...extra })) await cargarLotes();
  }

  const lista = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return convs.filter((c) => !f || (c.nombre ?? "").toLowerCase().includes(f) || (c.telefono ?? "").includes(f) || c.canal_id.includes(f));
  }, [convs, filtro]);
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
          <button className={tab === "chats" ? "on" : ""} onClick={() => setTab("chats")}>Chats{pends.length ? ` · ${pends.length} por aprobar` : ""}</button>
          <button className={tab === "lotes" ? "on" : ""} onClick={() => { setTab("lotes"); cargarLotes(); }}>Lotes</button>
          <button className={tab === "cots" ? "on" : ""} onClick={() => { setTab("cots"); cargarCots(); }}>Cotizaciones</button>
        </nav>
        <span className="pb-modo">
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
            {lista.map((c) => (
              <button key={c.canal_id} className={"pb-conv" + (sel === c.canal_id ? " sel" : "") + (c.estado !== "bot" ? " " + c.estado : "")} onClick={() => setSel(c.canal_id)}>
                <div className="l1">{canalIcono(c.canal_id)} <b>{c.nombre || "Sin nombre"}</b> <span className="hace">{hace(c.ultimo_cliente_en)}</span></div>
                <div className="l2">
                  {c.telefono || c.canal_id} · {c.estado === "bot" ? "bot" : c.estado === "escalada" ? "EN TU CONTROL" : "pausada"}
                  {c.cotizacion_id ? ` · ${c.cotizacion_id}` : ""}{c.lote_id ? ` · ${c.lote_id}` : ""}
                  {pendsDe(c.canal_id).length ? ` · ⏳ ${pendsDe(c.canal_id).length} por aprobar` : ""}
                </div>
              </button>
            ))}
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
                  </div>
                  <div className="acciones">
                    {hilo.conversacion?.estado !== "escalada" && <button onClick={() => estado(sel, "escalada")}>Tomar control</button>}
                    {hilo.conversacion?.estado !== "bot" && <button onClick={() => estado(sel, "bot")}>Devolver al bot</button>}
                    {hilo.conversacion?.estado !== "pausada" && <button onClick={() => estado(sel, "pausada")}>Pausar</button>}
                    <button onClick={() => accion({ accion: "seguimiento", canalId: sel })}>Seguimiento</button>
                  </div>
                </div>
                <div className="pb-msgs">
                  {hilo.mensajes.map((m) => (
                    <div key={m.id} className={"pb-msg " + (m.direccion === "in" ? "in" : m.por === "alan" ? "alan" : m.por === "sistema" ? "sis" : "bot")}>
                      {m.tipo === "fotos" && <div className="tag">📷 fotos del {m.media?.lote_id}</div>}
                      {m.tipo === "photo" && <div className="tag">📎 foto de la clienta</div>}
                      <div className="txt">{m.texto}</div>
                      <div className="meta">{m.direccion === "in" ? "clienta" : m.por} · {hora(m.creado)}</div>
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
                  <textarea placeholder="Escribir a la clienta (la conversación pasa a tu control)" value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} />
                  <button disabled={ocupado || !texto.trim()} onClick={enviar}>Enviar</button>
                </div>
              </>
            )}
          </div>
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
  .pb-conv .l2 { font-size: 12px; color: #8a7068; margin-top: 2px; }
  .pb-hilo { display: grid; grid-template-rows: auto 1fr auto; min-height: 0; }
  .pb-hilo-top { display: flex; gap: 10px; align-items: center; padding: 10px 14px; background: #fff; border-bottom: 1px solid #f2e0d8; flex-wrap: wrap; }
  .pb-hilo-top .sub { font-size: 13px; color: #8a7068; } .pb-hilo-top .acciones { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; }
  .pb-hilo-top .volver { display: none; }
  .pb-msgs { overflow: auto; padding: 14px; display: grid; gap: 8px; align-content: start; }
  .pb-msg { max-width: 78%; padding: 8px 12px; border-radius: 12px; font-size: 15px; white-space: pre-wrap; background: #fff; border: 1px solid #f2e0d8; }
  .pb-msg.in { justify-self: start; background: #fff; } .pb-msg.bot { justify-self: end; background: #f2e0d8; }
  .pb-msg.alan { justify-self: end; background: #e8d5a8; } .pb-msg.sis { justify-self: end; background: #eee; }
  .pb-msg.pend { justify-self: end; background: #fff7e0; border-color: #e0a000; }
  .pb-msg .meta { font-size: 11px; color: #8a7068; margin-top: 4px; } .pb-msg .tag { font-size: 12px; color: #9e5550; margin-bottom: 4px; }
  .pb-msg .btns { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
  .pb-escribir { display: flex; gap: 8px; padding: 10px 14px; background: #fff; border-top: 1px solid #f2e0d8; }
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
