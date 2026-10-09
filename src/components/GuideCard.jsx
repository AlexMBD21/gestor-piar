import './GuideCard.css';

const STEPS = [
  {
    num: '01',
    icon: 'person_add',
    title: 'Crear Estudiante',
    desc: <>Haz clic en <strong>"+ Nuevo"</strong> para iniciar el registro en blanco.</>,
    color: '#3b82f6'
  },
  {
    num: '02',
    icon: 'edit_note',
    title: 'Diligenciar Anexos',
    desc: <>Completa los <strong>Anexos 1, 2 y 3</strong> según el progreso del estudiante.</>,
    color: '#8b5cf6'
  },
  {
    num: '03',
    icon: 'cloud_upload',
    title: 'Guardar Aportación',
    desc: <>Presiona <strong>"Guardar Aportación"</strong> para sincronizar los datos en la nube.</>,
    color: '#10b981'
  },
  {
    num: '04',
    icon: 'download',
    title: 'Descargar Documento',
    desc: <>Exporta el PIAR oficial generado en formatos <strong>Word</strong> o <strong>PDF</strong>.</>,
    color: '#f59e0b'
  }
];

export default function GuideCard() {
  return (
    <div className="guide-card-container">
      <div className="guide-card-header">
        <div className="guide-card-header-main">
          <div className="guide-card-icon-badge">
            <span className="material-symbols-outlined">menu_book</span>
          </div>
          <div className="guide-card-header-titles">
            <h4 className="guide-card-title">Guía de Uso Rápido</h4>
            <span className="guide-card-subtitle">4 pasos para gestionar el PIAR</span>
          </div>
        </div>
      </div>

      <div className="guide-card-body">
        <p className="guide-card-intro">
          Sigue estos sencillos pasos para diligenciar e imprimir el Plan Individual de Ajustes Razonables:
        </p>

        <div className="guide-card-steps">
          {STEPS.map((step, idx) => (
            <div key={step.num} className="guide-card-step-item" style={{ '--i': idx, '--step-color': step.color }}>
              <div className="guide-card-step-left">
                <span className="guide-card-step-icon">
                  <span className="material-symbols-outlined">{step.icon}</span>
                </span>
              </div>
              <div className="guide-card-step-content">
                <div className="guide-card-step-header">
                  <span className="guide-card-step-num">{step.num}</span>
                  <h5 className="guide-card-step-title">{step.title}</h5>
                </div>
                <p className="guide-card-step-desc">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
