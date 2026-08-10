const tenants = [
  { name: "Las Trojes", key: "trojes", backup: "Pendiente de configurar", status: "Activo" },
  { name: "Manzana", key: "manzana", backup: "Deshabilitado", status: "Activo" },
];

function App() {
  return (
    <main className="platform-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">N</div>
        <div>
          <p className="eyebrow">NEXUS PLATFORM</p>
          <h1>Administración de plataforma</h1>
        </div>
        <span className="environment">Fundación inicial</span>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">CONTROL CENTRAL</p>
          <h2>Infraestructura y tenants</h2>
          <p className="intro-copy">
            Este espacio centralizará la salud de Nexus, las políticas de respaldo y la configuración de plataforma.
          </p>
        </div>
        <div className="status-chip"><span /> Servicios operativos</div>
      </section>

      <section className="metrics" aria-label="Estado de plataforma">
        <article><span className="metric-label">Tenants registrados</span><strong>{tenants.length}</strong><small>En el registro actual</small></article>
        <article><span className="metric-label">Backups activos</span><strong>0</strong><small>Configuración pendiente</small></article>
        <article><span className="metric-label">Salud del servidor</span><strong>Estable</strong><small>Contabo operativo</small></article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">PLATAFORMA</p><h2>Tenants</h2></div>
          <span className="section-note">Vista inicial</span>
        </div>
        <div className="tenant-list">
          {tenants.map((tenant) => (
            <article className="tenant-row" key={tenant.key}>
              <div className="tenant-icon" aria-hidden="true">{tenant.name.slice(0, 1)}</div>
              <div className="tenant-main"><h3>{tenant.name}</h3><p>{tenant.key}</p></div>
              <div className="tenant-detail"><span>Backups</span><strong>{tenant.backup}</strong></div>
              <span className="tenant-status"><i /> {tenant.status}</span>
              <button type="button" disabled>Configurar</button>
            </article>
          ))}
        </div>
      </section>

      <section className="notice">
        <div className="notice-icon" aria-hidden="true">i</div>
        <div><h2>Configuración segura en preparación</h2><p>Las credenciales de R2 y las acciones de backup se conectarán después de habilitar la API de plataforma.</p></div>
      </section>
    </main>
  );
}

export default App;
