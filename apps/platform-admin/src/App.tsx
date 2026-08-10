import { FormEvent, useEffect, useState } from "react";

type Tenant = { key: string; name: string; status: string; backupEnabled: boolean; lastBackup: string | null; lastBackupError?: string | null };
type StorageStatus = { configured: boolean; bucket: string | null; endpoint: string | null };
type R2Form = { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "No se pudo completar la operación.");
  }
  return response.json() as Promise<T>;
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [backupRunning, setBackupRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try { await api("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }); onLogin(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo iniciar sesión."); }
    finally { setLoading(false); }
  }

  return <main className="login-shell"><section className="login-card"><div className="brand-mark" aria-hidden="true">N</div><p className="eyebrow">NEXUS PLATFORM</p><h1>Administración de plataforma</h1><p className="muted">Acceso privado para infraestructura, tenants y respaldos.</p><form onSubmit={submit} className="login-form"><label>Usuario<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><label>Contraseña<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? "Verificando..." : "Entrar"}</button></form></section></main>;
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [storage, setStorage] = useState<StorageStatus>({ configured: false, bucket: null, endpoint: null });
  const [storageOpen, setStorageOpen] = useState(false);
  const [form, setForm] = useState<R2Form>({ endpoint: "", bucket: "", accessKeyId: "", secretAccessKey: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try { const result = await api<{ tenants: Tenant[]; storage: StorageStatus }>("/tenants"); setTenants(result.tenants); setStorage(result.storage); setAuthenticated(true); }
    catch (reason) { setAuthenticated(false); if (reason instanceof Error && !reason.message.includes("401")) setError(reason.message); }
  }
  useEffect(() => { void load(); }, []);

  function openStorage() { setForm({ endpoint: "", bucket: storage.bucket || "", accessKeyId: "", secretAccessKey: "" }); setNotice(""); setError(""); setStorageOpen(true); }

  async function toggleBackup(tenant: Tenant) {
    try { const result = await api<{ tenant: Tenant }>(`/tenants/${tenant.key}/backup`, { method: "PATCH", body: JSON.stringify({ enabled: !tenant.backupEnabled }) }); setTenants((current) => current.map((item) => item.key === tenant.key ? result.tenant : item)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo actualizar el backup."); }
  }

  async function saveStorage(event: FormEvent) {
    event.preventDefault();
    try { const result = await api<{ storage: StorageStatus }>("/storage", { method: "PATCH", body: JSON.stringify({ r2: form }) }); setStorage(result.storage); setForm((current) => ({ ...current, secretAccessKey: "" })); setNotice("Destino central guardado. La ejecución de backups aún no está activada."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo guardar la configuración."); }
  }

  async function runBackups() {
    setBackupRunning(true); setError("");
    try { await api("/backups/run", { method: "POST" }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudieron ejecutar los backups."); }
    finally { setBackupRunning(false); }
  }

  if (authenticated === null) return <main className="loading-shell">Cargando...</main>;
  if (!authenticated) return <Login onLogin={() => void load()} />;

  return <main className="platform-shell">
    <header className="topbar"><div className="brand-mark" aria-hidden="true">N</div><div><p className="eyebrow">NEXUS PLATFORM</p><h1>Administración de plataforma</h1></div><button className="text-button" onClick={async () => { await api("/auth/logout", { method: "POST" }); setAuthenticated(false); }}>Cerrar sesión</button></header>

    <section className="intro"><div><p className="eyebrow">CONTROL CENTRAL</p><h2>Infraestructura y tenants</h2><p className="intro-copy">Administra la salud de Nexus y la política de respaldos desde un espacio separado de los paneles de cada tenant.</p></div><div className="status-chip"><span /> Servicios operativos</div></section>
    {error && <p className="form-error global-error" role="alert">{error}</p>}

    <section className="metrics" aria-label="Estado de plataforma"><article><span className="metric-label">Tenants registrados</span><strong>{tenants.length}</strong><small>En el registro actual</small></article><article><span className="metric-label">Backups habilitados</span><strong>{tenants.filter((tenant) => tenant.backupEnabled).length}</strong><small>Política por tenant</small></article><article><span className="metric-label">Destino central</span><strong>{storage.configured ? "Listo" : "Pendiente"}</strong><small>{storage.bucket || "R2 aún no configurado"}</small></article></section>

    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">PLATAFORMA</p><h2>Almacenamiento de backups</h2></div><button className="primary-button" onClick={openStorage}>{storage.configured ? "Editar destino" : "Configurar destino"}</button></div><div className="storage-summary"><div className="tenant-icon" aria-hidden="true">R2</div><div><h3>Bucket central de Nexus</h3><p>{storage.bucket || "Sin bucket configurado"}</p></div><span className="tenant-status"><i /> {storage.configured ? "Configurado" : "Pendiente"}</span><small>Los objetos se separarán por tenant y base de datos.</small></div></section>

    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">PLATAFORMA</p><h2>Tenants</h2></div><span className="section-note">Política de respaldo</span></div><div className="tenant-list">{tenants.map((tenant) => <article className="tenant-row" key={tenant.key}><div className="tenant-icon" aria-hidden="true">{tenant.name.slice(0, 1)}</div><div className="tenant-main"><h3>{tenant.name}</h3><p>{tenant.key}</p></div><div className="tenant-detail"><span>Respaldo</span><strong>{tenant.backupEnabled ? "Habilitado" : "Deshabilitado"}</strong><small>{tenant.lastBackup ? `Último: ${tenant.lastBackup}` : "Aún sin ejecuciones"}</small></div><span className="tenant-status"><i /> {tenant.status}</span><button className={`switch ${tenant.backupEnabled ? "on" : ""}`} aria-label={`${tenant.backupEnabled ? "Deshabilitar" : "Habilitar"} backup de ${tenant.name}`} onClick={() => void toggleBackup(tenant)}><span /></button></article>)}</div></section>

    <section className="notice"><div className="notice-icon" aria-hidden="true">i</div><div><h2>Los backups requieren una configuración explícita</h2><p>Primero se define el destino central. Después se habilita cada tenant. La ejecución y la restauración se incorporarán tras validar un ciclo completo de recuperación.</p></div></section>

    {storageOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setStorageOpen(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="storage-title"><button className="modal-close" onClick={() => setStorageOpen(false)} aria-label="Cerrar">×</button><p className="eyebrow">CONFIGURACIÓN DE PLATAFORMA</p><h2 id="storage-title">Bucket central de backups</h2><p className="muted">Este destino será compartido por Nexus. Las rutas se organizarán por tenant y tipo de base de datos.</p><form onSubmit={saveStorage} className="config-form"><label>Endpoint R2<input value={form.endpoint} onChange={(event) => setForm({ ...form, endpoint: event.target.value })} placeholder="https://...r2.cloudflarestorage.com" required /></label><label>Bucket<input value={form.bucket} onChange={(event) => setForm({ ...form, bucket: event.target.value })} placeholder="nexus-backups" required /></label><label>Access Key ID<input value={form.accessKeyId} onChange={(event) => setForm({ ...form, accessKeyId: event.target.value })} placeholder={storage.configured ? "Dejar vacío para conservarla" : "Access Key ID"} /></label><label>Secret Access Key<input value={form.secretAccessKey} onChange={(event) => setForm({ ...form, secretAccessKey: event.target.value })} type="password" autoComplete="new-password" placeholder={storage.configured ? "Dejar vacío para conservarla" : "••••••••"} /></label>{notice && <p className="form-success">{notice}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setStorageOpen(false)}>Cancelar</button><button className="primary-button">Guardar configuración</button></div></form></section></div>}
  </main>;
}

export default App;
