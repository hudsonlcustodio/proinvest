import { useEffect, useState, type ChangeEvent } from "react";
import { CheckCircle, FileCsv, PlugsConnected, WarningCircle } from "@phosphor-icons/react";
import { api, getReferences } from "../api";
import type { Account, Instrument, Strategy } from "../types";
import type { ConnectionView, ConnectorProvider, StagingRecordView, SyncRunView } from "../../../../packages/contracts/src/connections";

const json = (method: string, body?: unknown): RequestInit => ({
  method, headers: { "content-type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
});
type NoticeValue = { kind: "success" | "error"; text: string };

function Header({ kicker, title, copy }: { kicker: string; title: string; copy: string }) {
  return <header className="content-header"><div><p className="kicker">{kicker}</p><h1>{title}</h1><p>{copy}</p></div></header>;
}
function Status({ value }: { value: string }) { return <span className={`status ${value.toLowerCase()}`}>{value}</span>; }
function Notice({ value }: { value: NoticeValue }) {
  return <div className="notice" role={value.kind === "error" ? "alert" : "status"}>
    {value.kind === "error" ? <WarningCircle size={19} /> : <CheckCircle size={19} />}<span>{value.text}</span>
  </div>;
}
function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="state" role="alert"><WarningCircle size={24} /><h3>Não foi possível carregar os dados</h3><p>{message}</p><button className="button secondary" onClick={retry}>Tentar novamente</button></div>;
}

export function ConnectionsPage() {
  const [providers, setProviders] = useState<ConnectorProvider[]>([]);
  const [items, setItems] = useState<ConnectionView[] | null>(null);
  const [notice, setNotice] = useState<NoticeValue | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const [p, c] = await Promise.all([
        api<{ items: ConnectorProvider[] }>("/v1/connections/providers"),
        api<{ items: ConnectionView[] }>("/v1/connections")
      ]);
      setProviders(p.items); setItems(c.items); setNotice(null); return true;
    } catch (error) { setItems(null); setNotice({ kind: "error", text: (error as Error).message }); return false; }
  };
  useEffect(() => { void load(); }, []);
  const create = async () => {
    setBusy(true); setNotice(null);
    try {
      await api("/v1/connections", json("POST", { providerKey: "FILE_IMPORT", displayName: "Importação CSV" }));
      if (await load()) setNotice({ kind: "success", text: "Conexão de importação criada." });
    } catch (error) { setNotice({ kind: "error", text: (error as Error).message }); }
    finally { setBusy(false); }
  };
  const upload = async (connectionId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setNotice(null);
    try {
      const result = await api<{ fetched: number; ready: number; pending: number; duplicate: number; rejected: number }>(
        `/v1/connections/${connectionId}/imports`, json("POST", { filename: file.name, content: await file.text() }));
      if (await load()) setNotice({ kind: "success", text: `${result.fetched} registro(s): ${result.ready} prontos, ${result.pending} pendentes, ${result.duplicate} duplicados e ${result.rejected} rejeitados.` });
    } catch (error) { setNotice({ kind: "error", text: (error as Error).message }); }
    finally { setBusy(false); event.target.value = ""; }
  };
  return <>
    <Header kicker="Dados externos" title="Conexões" copy="Entradas somente leitura. Nesta versão, apenas importação CSV está implementada e disponível." />
    <section className="section"><div className="section-head"><h2>Providers disponíveis</h2><p>Nenhum provider live foi escolhido</p></div>
      <div className="connection-grid">{providers.map(p => <article className="panel connection-card" key={p.key}><FileCsv size={24} /><div><h3>{p.name}</h3><p>{p.kind} · somente leitura</p><small>{p.capabilities.join(" · ")}</small></div><Status value={p.available ? "AVAILABLE" : "INCOMPLETE"} /></article>)}</div>
    </section>
    <section className="section"><div className="section-head"><h2>Conexões configuradas</h2><button className="button primary" disabled={busy || items === null} onClick={create}>Adicionar importação CSV</button></div>
      {notice && <Notice value={notice} />}
      {items === null ? !notice && <div className="state" role="status">Carregando conexões…</div> :
        items.length ? <div className="connection-grid">{items.map(c => <article className="panel connection-card" key={c.id}>
          <PlugsConnected size={24} /><div><h3>{c.displayName}</h3><p>{c.providerKey} · somente leitura</p><small>Último sync: {c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString("pt-BR") : "ainda não executado"}</small></div>
          <Status value={c.status} /><label className="button secondary file-button">Importar CSV<input aria-label={`Selecionar CSV para ${c.displayName}`} type="file" accept=".csv,text/csv" disabled={busy} onChange={event => void upload(c.id, event)} /></label>
        </article>)}</div> : <div className="state"><FileCsv size={24} /><h3>Nenhuma conexão configurada</h3><p>Adicione a importação CSV para iniciar o fluxo de staging e reconciliação.</p></div>}
      {items === null && notice?.kind === "error" && <button className="button secondary" onClick={() => void load()}>Tentar novamente</button>}
    </section>
  </>;
}

export function SyncPage() {
  const [items, setItems] = useState<SyncRunView[] | null>(null);
  const [error, setError] = useState("");
  const load = async () => {
    setError("");
    try { setItems((await api<{ items: SyncRunView[] }>("/v1/connections/sync-runs")).items); }
    catch (cause) { setItems(null); setError((cause as Error).message); }
  };
  useEffect(() => { void load(); }, []);
  return <><Header kicker="Observabilidade" title="Sync Center" copy="Execuções sanitizadas, sem credenciais ou payload bruto." />
    {error ? <ErrorState message={error} retry={() => void load()} /> :
      items === null ? <div className="state" role="status">Carregando sincronizações…</div> :
      items.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr>
        <th>Status</th><th>Início</th><th className="align-right">Duração</th><th className="align-right">Lidos</th><th className="align-right">Prontos</th><th className="align-right">Importados</th><th className="align-right">Duplicados</th><th className="align-right">Pendentes</th><th className="align-right">Rejeitados</th>
      </tr></thead><tbody>{items.map(x => <tr key={x.id}><td><Status value={x.status} /></td><td>{new Date(x.startedAt).toLocaleString("pt-BR")}</td><td className="align-right num">{x.durationMs === null ? "—" : `${x.durationMs} ms`}</td><td className="align-right num">{x.fetched}</td><td className="align-right num">{x.ready}</td><td className="align-right num">{x.imported}</td><td className="align-right num">{x.duplicate}</td><td className="align-right num">{x.pending}</td><td className="align-right num">{x.rejected}</td></tr>)}</tbody></table></div> :
      <div className="state"><CheckCircle size={24} /><h3>Nenhuma sincronização</h3><p>As execuções aparecem aqui após uma importação CSV.</p></div>}
  </>;
}

export function ReconciliationPage() {
  const [items, setItems] = useState<StagingRecordView[] | null>(null);
  const [refs, setRefs] = useState<{ strategies: Strategy[]; accounts: Account[]; instruments: Instrument[] }>({ strategies: [], accounts: [], instruments: [] });
  const [notice, setNotice] = useState<NoticeValue | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = async () => {
    setLoadingError("");
    try {
      const [staged, references] = await Promise.all([api<{ items: StagingRecordView[] }>("/v1/connections/reconciliation"), getReferences()]);
      setItems(staged.items); setRefs(references); return true;
    } catch (error) { setItems(null); setLoadingError((error as Error).message); return false; }
  };
  useEffect(() => { void load(); }, []);
  const resolve = async (item: StagingRecordView, form: HTMLFormElement) => {
    const data = new FormData(form);
    const body = { strategyId: String(data.get("strategyId")), instrumentId: String(data.get("instrumentId")), accountId: String(data.get("accountId")) };
    setBusyId(item.id); setNotice(null);
    try { await api(`/v1/connections/reconciliation/${item.id}`, json("PATCH", body)); if (await load()) setNotice({ kind: "success", text: "Referências reconciliadas. O registro está pronto para confirmação." }); }
    catch (error) { setNotice({ kind: "error", text: (error as Error).message }); }
    finally { setBusyId(null); }
  };
  const action = async (item: StagingRecordView, name: "promote" | "reject") => {
    setBusyId(item.id); setNotice(null);
    try { await api(`/v1/connections/reconciliation/${item.id}/${name}`, json("POST")); if (await load()) setNotice({ kind: "success", text: name === "promote" ? "Operação importada com provenance." : "Registro rejeitado." }); }
    catch (error) { setNotice({ kind: "error", text: (error as Error).message }); }
    finally { setBusyId(null); }
  };
  return <><Header kicker="Controle humano" title="Reconciliação" copy="Strategy, instrumento e conta precisam estar resolvidos antes da promoção canônica." />
    {notice && <Notice value={notice} />}
    {loadingError ? <ErrorState message={loadingError} retry={() => void load()} /> :
      items === null ? <div className="state" role="status">Carregando registros…</div> :
      <div className="reconciliation-list">
        {items.map(item => <article className="panel reconciliation-card" key={item.id}>
          <div className="reconciliation-head"><div><strong>{item.normalized.symbol || "Símbolo ausente"}</strong><span>{item.normalized.externalId || "sem external ID"}</span></div><Status value={item.status} /></div>
          <p>{item.normalized.quantity || "?"} × {item.normalized.entryPrice || "?"} {item.normalized.currency || ""} · {item.normalized.openedAt || "data ausente"}</p>
          {item.issues.length > 0 && <ul>{item.issues.map(x => <li key={x}>{x}</li>)}</ul>}
          {item.status === "PENDING" && <form onSubmit={event => { event.preventDefault(); void resolve(item, event.currentTarget); }} className="reconciliation-form">
            <select className="select" name="strategyId" aria-label="Strategy" required defaultValue={item.strategyId ?? ""}><option value="">Strategy</option>{refs.strategies.filter(x => x.templateType === "EQUITY_HOLDING").map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <select className="select" name="instrumentId" aria-label="Instrumento" required defaultValue={item.instrumentId ?? ""}><option value="">Instrumento</option>{refs.instruments.filter(x => x.assetClass === "EQUITY" && x.symbol === item.normalized.symbol && x.currency?.toUpperCase() === item.normalized.currency).map(x => <option key={x.id} value={x.id}>{x.symbol} · {x.currency}</option>)}</select>
            <select className="select" name="accountId" aria-label="Conta" required defaultValue={item.accountId ?? ""}><option value="">Conta</option>{refs.accounts.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <button className="button secondary" disabled={busyId === item.id}>Resolver</button>
          </form>}
          <div className="form-actions"><button className="button secondary" disabled={busyId === item.id || !["PENDING", "READY"].includes(item.status)} onClick={() => void action(item, "reject")}>Rejeitar</button><button className="button primary" disabled={busyId === item.id || item.status !== "READY"} onClick={() => void action(item, "promote")}>Confirmar e importar</button></div>
        </article>)}
        {!items.length && <div className="state"><CheckCircle size={24} /><h3>Nada para reconciliar</h3><p>Registros importados ou rejeitados continuam auditáveis quando existirem.</p></div>}
      </div>}
  </>;
}
