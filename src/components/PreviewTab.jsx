import { usePiar } from '../context/PiarContext';
import { escHtml, PLantillasPIAR } from '../lib/piarTemplates';

export default function PreviewTab({ showToast, switchTab }) {
  const { getActiveStudent } = usePiar();
  const activeStudent = getActiveStudent();
  const isBlankTemplate = !activeStudent;

  const displayStudent = activeStudent || {
    nombre: '',
    grado: '',
    data: PLantillasPIAR.blanco
  };

  const s = displayStudent.data;

  const v = (val) => val && String(val).trim() ? String(val) : (isBlankTemplate ? '' : '—');
  
  const fmtDate = (d) => {
    if (!d) return isBlankTemplate ? '' : '—';
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  const est = s.anexo1.estudiante;
  const sal = s.anexo1.salud;
  const hog = s.anexo1.hogar;
  const tra = s.anexo1.trayectoria;
  const ins = s.anexo1.institucion;
  const gen1 = s.anexo1.general;
  const gen2 = s.anexo2.general;
  const gen3 = s.anexo3.general;
  const ajustes = s.anexo2.ajustesRazonables || [];
  const rawPmi = s.anexo2.pmiRecomendaciones || [];
  const defaultPmiActors = [
    { actor: "FAMILIA, CUIDADORES O CON QUIENES VIVE", acciones: "", estrategias: "" },
    { actor: "DOCENTES", acciones: "", estrategias: "" },
    { actor: "DIRECTIVOS", acciones: "", estrategias: "" },
    { actor: "ADMINISTRATIVOS", acciones: "", estrategias: "" },
    { actor: "PARES (Sus compañeros)", acciones: "", estrategias: "" }
  ];
  const pmi = defaultPmiActors.map(defaultItem => {
    const existing = rawPmi.find(r => r.actor && r.actor.trim().toUpperCase() === defaultItem.actor.toUpperCase());
    return existing ? { ...defaultItem, ...existing } : defaultItem;
  });
  const actividades = s.anexo3.actividadesHogar || [];
  const firmaA1 = s.anexo1.firmas || [{}, {}, {}];
  const firmaA2 = s.anexo2.firmas || [{}, {}, {}];
  const firmas = s.anexo3.firmas || {};

  // Separación de ajustes
  const normAjustes = ajustes.filter(a => !a.area.toLowerCase().startsWith('otras'));
  const otrasCategories = [
    { key: 'Convivencia', label: 'Convivencia' },
    { key: 'Socialización', label: 'Socialización' },
    { key: 'Participación', label: 'Participación' },
    { key: 'Autonomía', label: 'Autonomía' },
    { key: 'Autocontrol', label: 'Autocontrol' }
  ].map(cat => {
    const found = ajustes.find(a => a.area.toLowerCase().includes(cat.key.toLowerCase()));
    return {
      label: cat.label,
      barreras: found ? (found.barreras || found.bareras) : '',
      ajustes: found ? found.ajustes : '',
      evaluacion: found ? found.evaluacion : '',
      trimestre: found ? found.trimestre : '',
      docente: found ? found.docente : ''
    };
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Documento PIAR</title></head><body>";
    const footer = "</body></html>";
    
    const content = document.querySelector('.preview-container');
    if (!content) {
      if (showToast) showToast('Error al exportar a Word', 'danger');
      return;
    }
    
    const sourceHTML = header + content.innerHTML + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'documento_piar.doc';
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (showToast) showToast('Documento exportado a Word');
  };

  return (
    <div className="card">
      <div className="card-title-container no-print">
        <h3 className="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          {isBlankTemplate ? 'Vista Previa (Formulario en Blanco)' : 'Vista Previa del Documento PIAR'}
        </h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={handleExportWord}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
            Guardar en Word
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>
      <p className="card-description no-print" style={{ marginBottom: 20 }}>
        Esta es una previsualización del documento PIAR completo tal como se imprimirá.
      </p>

      {isBlankTemplate && (
        <div className="no-print" style={{ 
          backgroundColor: 'rgba(236, 106, 6, 0.1)', 
          border: '1px dashed var(--warning)', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          color: 'var(--text-main)'
        }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--warning)', fontSize: '24px' }}>info</span>
          <div>
            <strong style={{ display: 'block', marginBottom: '2px' }}>Modo Documento en Blanco</strong>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              No has seleccionado ningún estudiante. Estás viendo la plantilla vacía del formulario PIAR. Puedes visualizar su formato o imprimirla/guardarla en blanco para rellenarla manualmente.
            </span>
          </div>
        </div>
      )}

      {/* Mobile view placeholder */}
      <div className="mobile-print-notice no-print">
        <div className="mobile-print-notice-card">
          <span className="material-symbols-outlined notice-icon">picture_as_pdf</span>
          <h4>Vista Previa no disponible en celular</h4>
          <p>
            El documento oficial tiene formato de hoja de impresión (A4/Carta) y contiene tablas amplias. Para visualizarlo y guardarlo, por favor utiliza el botón de abajo.
          </p>
          <button className="btn btn-primary" onClick={handleExportWord} style={{ width: '100%', justifyContent: 'center', marginTop: '16px', gap: '8px' }}>
            <span className="material-symbols-outlined">description</span>
            Guardar en Word
          </button>
          <button className="btn btn-primary" onClick={handlePrint} style={{ width: '100%', justifyContent: 'center', marginTop: '8px', gap: '8px' }}>
            <span className="material-symbols-outlined">print</span>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <div className="preview-container">
        <div id="preview-document-content" className="preview-document">
          {/* ==================== ANEXO 1 ==================== */}
          <table className="piar-official-header">
            <tbody>
              <tr>
                <td className="logo-cell">
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" />
                </td>
                <td className="title-cell">
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="piar-official-title-box">
            <h2>INFORMACIÓN GENERAL DEL ESTUDIANTE</h2>
            <h3>(Información para la matrícula – Anexo 1 PIAR)</h3>
          </div>

          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ width: '50%' }}>
                  <strong>Fecha y Lugar de Diligenciamiento:</strong> {v(gen1.fechaDiligenciamiento ? fmtDate(gen1.fechaDiligenciamiento) : '')} {v(gen1.lugarDiligenciamiento)}
                </td>
                <td style={{ width: '50%', color: '#888', textAlign: 'right', fontSize: '8.5pt' }}>DD/MM/AAAA</td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}><strong>Nombre de la Persona que diligencia:</strong> {v(gen1.nombreDiligencia)}</td>
                <td style={{ width: '50%' }}><strong>Rol que desempeña en la SE o la IE:</strong> {v(gen1.rolDiligencia)}</td>
              </tr>
            </tbody>
          </table>

          <div className="piar-section-header">1): Información general del estudiante</div>
          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ width: '50%' }}><strong>Nombres:</strong> {v(est.nombres)}</td>
                <td style={{ width: '50%' }}><strong>Apellidos:</strong> {v(est.apellidos)}</td>
              </tr>
              <tr>
                <td style={{ width: '35%' }}><strong>Lugar de nacimiento:</strong> {v(est.lugarNacimiento)}</td>
                <td style={{ width: '15%' }}><strong>Edad:</strong> {v(est.edad)}</td>
                <td style={{ width: '50%' }}><strong>Fecha de nacimiento:</strong> {fmtDate(est.fechaNacimiento)} <span style={{ color: '#888', fontSize: '8pt', float: 'right' }}>DD/MM/AAAA</span></td>
              </tr>
              <tr>
                <td style={{ width: '35%' }}>
                  <strong>Tipo: TI__ CC__ RC_ otro: ¿cuál?</strong> {v(est.tipoIdentificacion)}
                </td>
                <td colSpan="2" style={{ width: '65%' }}>
                  <strong>No de identificación:</strong> {v(est.numeroIdentificacion)}
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}><strong>Departamento donde vive:</strong> {v(est.departamento)}</td>
                <td colSpan="2" style={{ width: '50%' }}><strong>Municipio:</strong> {v(est.municipio)}</td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}><strong>Dirección de vivienda:</strong> {v(est.direccion)}</td>
                <td colSpan="2" style={{ width: '50%' }}><strong>Barrio/vereda:</strong> {v(est.barrioVereda)}</td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}><strong>Teléfono:</strong> {v(est.telefono)}</td>
                <td colSpan="2" style={{ width: '50%' }}><strong>Correo electrónico:</strong> {v(est.email)}</td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}>
                  <strong>¿Está en centro de protección? NO_ SI _ ¿dónde?</strong> {v(est.centroProteccion)} {est.centroProteccion === 'SI' ? `— ${v(est.centroProteccionDonde)}` : ''}
                </td>
                <td colSpan="2" style={{ width: '50%' }}>
                  <strong>Grado al que aspira ingresar:</strong> {v(est.gradoAspirado)}
                </td>
              </tr>
              <tr>
                <td colSpan="3" className="table-info-note">
                  Si el estudiante no tiene registro civil debe iniciarse la gestión con la familia y la Registraduría
                </td>
              </tr>
              <tr>
                <td colSpan="3">
                  <strong>¿Se reconoce o pertenece a un grupo étnico? ¿Cuál?</strong> {v(est.grupoEtnico)}
                </td>
              </tr>
              <tr>
                <td colSpan="3">
                  <strong>¿Se reconoce como víctima del conflicto armado? Si__ No__ (Cuenta con el respectivo registro? Si__ No__)</strong> {v(est.victimaConflicto)} {est.victimaConflicto === 'SI' ? `— Registro: ${v(est.victimaConflictoRegistro)}` : ''}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="preview-page-break"></div>

          <div className="piar-section-header">2) Entorno Salud:</div>
          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ width: '45%' }}>
                  <strong>Afiliación al sistema de salud</strong> SI {(!isBlankTemplate && sal.afiliacionSalud === 'SI') ? '✔' : '___'} No {(!isBlankTemplate && sal.afiliacionSalud === 'NO') ? '✔' : '___'}
                </td>
                <td style={{ width: '25%' }}><strong>EPS:</strong> {v(sal.eps)}</td>
                <td style={{ width: '15%' }}><strong>Contributivo:</strong> {(!isBlankTemplate && sal.regimen === 'Contributivo') ? '✔' : ''}</td>
                <td style={{ width: '15%' }}><strong>Subsidiado:</strong> {(!isBlankTemplate && sal.regimen === 'Subsidiado') ? '✔' : ''}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>Lugar donde le atienden en caso de emergencia:</strong> {v(sal.lugarEmergencia)}</td>
              </tr>
            </tbody>
          </table>

          <table className="piar-official-table" style={{ marginTop: -15 }}>
            <tbody>
              <tr>
                <td style={{ width: '35%' }}><strong>¿El niño está siendo atendido por el sector salud?</strong></td>
                <td style={{ width: '8%', textAlign: 'center' }}>Si<br />{(!isBlankTemplate && sal.atendidoSectorSalud === 'SI') ? '✔' : ''}</td>
                <td style={{ width: '8%', textAlign: 'center' }}>No<br />{(!isBlankTemplate && sal.atendidoSectorSalud === 'NO') ? '✔' : ''}</td>
                <td style={{ width: '49%' }}><strong>Frecuencia:</strong><br />{v(sal.frecuenciaAtencion)}</td>
              </tr>
              <tr>
                <td><strong>Tiene diagnóstico médico:</strong></td>
                <td style={{ textAlign: 'center' }}>Si<br />{(!isBlankTemplate && sal.diagnosticoMedico === 'SI') ? '✔' : ''}</td>
                <td style={{ textAlign: 'center' }}>No<br />{(!isBlankTemplate && sal.diagnosticoMedico === 'NO') ? '✔' : ''}</td>
                <td><strong>Cuál:</strong><br />{v(sal.diagnosticoCual)}</td>
              </tr>
              <tr>
                <td rowSpan="3" style={{ verticalAlign: 'middle' }}><strong>¿El niño está asistiendo a terapias?</strong></td>
                <td rowSpan="3" style={{ textAlign: 'center', verticalAlign: 'middle' }}>Si<br />{(!isBlankTemplate && sal.atendidoTerapias === 'SI') ? '✔' : ''}</td>
                <td rowSpan="3" style={{ textAlign: 'center', verticalAlign: 'middle' }}>No<br />{(!isBlankTemplate && sal.atendidoTerapias === 'NO') ? '✔' : ''}</td>
                <td style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000', width: '60%', padding: '4px 6px' }}><strong>¿Cuál?</strong> {v(sal.terapias?.[0]?.cual)}</td>
                        <td style={{ border: 'none', borderBottom: '1px solid #000', width: '40%', padding: '4px 6px' }}><strong>Frecuencia:</strong> {v(sal.terapias?.[0]?.frecuencia)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px 6px' }}><strong>¿Cuál?</strong> {v(sal.terapias?.[1]?.cual)}</td>
                        <td style={{ border: 'none', borderBottom: '1px solid #000', padding: '4px 6px' }}><strong>Frecuencia:</strong> {v(sal.terapias?.[1]?.frecuencia)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: 'none', borderRight: '1px solid #000', borderBottom: 'none', padding: '4px 6px' }}><strong>¿Cuál?</strong> {v(sal.terapias?.[2]?.cual)}</td>
                        <td style={{ border: 'none', borderBottom: 'none', padding: '4px 6px' }}><strong>Frecuencia:</strong> {v(sal.terapias?.[2]?.frecuencia)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="piar-official-table" style={{ marginTop: -15 }}>
            <tbody>
              <tr>
                <td style={{ width: '50%' }}>
                  <strong>¿Actualmente recibe tratamiento médico por alguna enfermedad en particular?</strong> SI {(!isBlankTemplate && sal.tratamientoMedico === 'SI') ? '✔' : '___'} NO {(!isBlankTemplate && sal.tratamientoMedico === 'NO') ? '✔' : '___'}
                </td>
                <td style={{ width: '50%' }}>
                  <strong>¿Cuál?</strong> <span style={{ fontSize: '8pt', color: '#666', fontWeight: 'normal' }}>Ejemplo: para epilepsia, oxígeno, insulina, etc.</span><br />
                  {v(sal.tratamientoCual)}
                </td>
              </tr>
              <tr>
                <td colSpan="2">
                  <strong>¿Consume medicamentos? Si {(!isBlankTemplate && sal.consumeMedicamentos === 'SI') ? '✔' : '___'} No {(!isBlankTemplate && sal.consumeMedicamentos === 'NO') ? '✔' : '___'} Frecuencia y horario:</strong> <span style={{ fontSize: '8pt', color: '#666', fontWeight: 'normal' }}>(Si debe consumirlo en horario de clases)</span><br />
                  {v(sal.medicamentosFrecuencia)}
                </td>
              </tr>
              <tr>
                <td colSpan="2">
                  <strong>¿Cuenta con productos de apoyo para favorecer su movilidad, comunicación e independencia?</strong> NO {(!isBlankTemplate && sal.productosApoyo === 'NO') ? '✔' : '___'} SI {(!isBlankTemplate && sal.productosApoyo === 'SI') ? '✔' : '___'} <strong>¿Cuáles?</strong> <span style={{ fontSize: '8pt', color: '#666', fontWeight: 'normal' }}>(Silla de ruedas, bastón, audífonos, etc.)</span><br />
                  {v(sal.productosApoyoCuales)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="piar-section-header">3) Entorno Hogar:</div>
          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ width: '25%' }}><strong>Nombre de la madre:</strong></td>
                <td style={{ width: '25%' }}>{v(hog.nombreMadre)}</td>
                <td style={{ width: '25%' }}><strong>Nombre del padre:</strong></td>
                <td style={{ width: '25%' }}>{v(hog.nombrePadre)}</td>
              </tr>
              <tr>
                <td><strong>Ocupación de la madre:</strong></td>
                <td>{v(hog.ocupacionMadre)}</td>
                <td><strong>Ocupación del padre:</strong></td>
                <td>{v(hog.ocupacionPadre)}</td>
              </tr>
              <tr>
                <td><strong>Nivel educativo alcanzado:</strong></td>
                <td>{v(hog.nivelMadre)}<span style={{ fontSize: '7pt', color: '#888', display: 'block' }}>Prim/Sec/Tec/Tecn/Univ</span></td>
                <td><strong>Nivel educativo alcanzado:</strong></td>
                <td>{v(hog.nivelPadre)}<span style={{ fontSize: '7pt', color: '#888', display: 'block' }}>Prim/Sec/Tec/Tecn/Univ</span></td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 15, borderTop: '1px solid #000', paddingTop: 5, fontSize: '7.5pt', color: '#000', fontFamily: 'sans-serif', lineHeight: 1.3, marginBottom: 20 }}>
            <span style={{ float: 'right', fontWeight: 'bold' }}>V14.16/02/2018. - Ver documento de instrucciones.</span>
            Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017
          </div>

          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ marginTop: 20 }}>
            <tbody>
              <tr>
                <td className="logo-cell">
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" />
                </td>
                <td className="title-cell">
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ width: '25%' }}><strong>Nombre Cuidador:</strong><br />{v(hog.nombreCuidador)}</td>
                <td style={{ width: '25%' }}><strong>Parentesco cuidador:</strong><br />{v(hog.parentescoCuidador)}</td>
                <td style={{ width: '25%' }}><strong>Nivel educativo cuidador:</strong><br />{v(hog.nivelCuidador)}<span style={{ fontSize: '7pt', color: '#888', display: 'block' }}>Prim/Sec/Tec/Tecn/Univ</span></td>
                <td style={{ width: '25%' }}><strong>Teléfono / Correo:</strong><br />{v(hog.telefonoCuidador)} / {v(hog.emailCuidador)}</td>
              </tr>
              <tr>
                <td><strong>No. Hermanos:</strong><br />{v(hog.numHermanos)}</td>
                <td><strong>Lugar que ocupa:</strong><br />{v(hog.lugarHermanos)}</td>
                <td colSpan="2"><strong>¿Quiénes apoyan la crianza del estudiante?</strong><br />{v(hog.apoyanCrianza)}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>Personas con quien vive:</strong><br />{v(hog.personasConQuienVive)}</td>
              </tr>
              <tr>
                <td colSpan="2"><strong>¿Está bajo protección?</strong> Si {(!isBlankTemplate && hog.bajoProteccion === 'SI') ? '✔' : '___'} No {(!isBlankTemplate && hog.bajoProteccion === 'NO') ? '✔' : '___'}</td>
                <td colSpan="2"></td>
              </tr>
              <tr>
                <td colSpan="4">
                  <strong>La familia recibe algún subsidio de alguna entidad:</strong> SI {(!isBlankTemplate && hog.recibeSubsidio === 'SI') ? '✔' : '___'} NO {(!isBlankTemplate && hog.recibeSubsidio === 'NO') ? '✔' : '___'} <strong>¿Cuál?</strong> {v(hog.subsidioCual)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="piar-section-header">4. Entorno Educativo:</div>
          <div style={{ fontWeight: 700, fontSize: '9.5pt', textDecoration: 'underline', marginTop: 3, marginBottom: 3 }}>Información de la Trayectoria Educativa</div>
          <table className="piar-official-table" style={{ marginBottom: 8 }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', padding: '4px 8px' }}>
                  <strong>¿Ha estado vinculado en otra institución, fundación o educación inicial?</strong> SI {(!isBlankTemplate && tra.vinculadoAntes === 'SI') ? '✔' : '___'} NO {(!isBlankTemplate && tra.vinculadoAntes === 'NO') ? '✔' : '___'}
                </td>
                <td style={{ width: '50%', padding: '4px 8px' }}>
                  <strong>NO___ ¿Por qué?</strong> {(!isBlankTemplate && tra.vinculadoAntes === 'NO') ? v(tra.observaciones) : ''}<br />
                  <strong>SI___ ¿Cuáles?</strong> {(!isBlankTemplate && tra.vinculadoAntes === 'SI') ? v(tra.vinculadoCuales) : ''}
                </td>
              </tr>
              <tr>
                <td style={{ width: '35%', padding: '4px 8px' }}><strong>Ultimo grado cursado:</strong><br />{v(tra.ultimoGrado)}</td>
                <td style={{ width: '65%', padding: 0 }} colSpan="2">
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', borderRight: '1px solid #000', width: '40%', padding: '4px 6px' }}>
                          <strong>¿Aprobó?</strong> SI {(!isBlankTemplate && tra.aprobo === 'SI') ? '✔' : '___'} NO {(!isBlankTemplate && tra.aprobo === 'NO') ? '✔' : '___'}
                        </td>
                        <td style={{ border: 'none', width: '60%', padding: '4px 6px' }}><strong>Observaciones:</strong> {v(tra.observaciones)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%', padding: '4px 8px' }}>
                  <strong>¿Se recibe informe pedagógico cualitativo o PIAR previo?</strong> NO {(!isBlankTemplate && tra.recibeInforme === 'NO') ? '✔' : '___'} SI {(!isBlankTemplate && tra.recibeInforme === 'SI') ? '✔' : '___'}
                </td>
                <td style={{ width: '50%', padding: '4px 8px' }}><strong>¿De qué institución proviene el informe?</strong><br />{v(tra.informeProcedencia)}</td>
              </tr>
              <tr>
                <td style={{ width: '50%', padding: '4px 8px' }}>
                  <strong>¿Está asistiendo en la actualidad a programas complementarios?</strong> NO {(!isBlankTemplate && tra.programasComplementarios === 'NO') ? '✔' : '___'} SI {(!isBlankTemplate && tra.programasComplementarios === 'SI') ? '✔' : '___'}
                </td>
                <td style={{ width: '50%', padding: '4px 8px' }}><strong>¿Cuáles?</strong><br />{v(tra.programasCuales)}</td>
              </tr>
            </tbody>
          </table>

          <div className="preview-page-break"></div>

          <div style={{ fontWeight: 700, fontSize: '9.5pt', textDecoration: 'underline', marginTop: 6, marginBottom: 3 }}>Información de la institución educativa en la que se matricula:</div>
          <table className="piar-official-table" style={{ marginBottom: 8 }}>
            <tbody>
              <tr>
                <td style={{ width: '60%', padding: '4px 8px' }}><strong>Nombre de la Institución educativa:</strong><br />{v(ins.nombreIE)}</td>
                <td style={{ width: '40%', padding: '4px 8px' }}><strong>Sede:</strong><br />{v(ins.sede)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 8px' }}><strong>Medio que usará para transportarse:</strong><br />{v(ins.medioTransporte)}</td>
                <td style={{ padding: '4px 8px' }}><strong>Distancia y tiempo estimado:</strong><br />{v(ins.distanciaTiempo)}</td>
              </tr>
            </tbody>
          </table>

          <table className="piar-official-table" style={{ marginTop: 10, minHeight: 60 }}>
            <tbody>
              <tr>
                <td style={{ width: '33.3%', height: 50, verticalAlign: 'bottom', borderBottom: 'none' }}><strong>Nombre y firma:</strong> {v(firmaA1?.[0]?.nombre)}</td>
                <td style={{ width: '33.3%', height: 50, verticalAlign: 'bottom', borderBottom: 'none' }}><strong>Nombre y firma:</strong> {v(firmaA1?.[1]?.nombre)}</td>
                <td style={{ width: '33.3%', height: 50, verticalAlign: 'bottom', borderBottom: 'none' }}><strong>Nombre y firma:</strong> {v(firmaA1?.[2]?.nombre)}</td>
              </tr>
              <tr>
                <td style={{ borderTop: 'none' }}><strong>Área:</strong> {v(firmaA1?.[0]?.area)}</td>
                <td style={{ borderTop: 'none' }}><strong>Área:</strong> {v(firmaA1?.[1]?.area)}</td>
                <td style={{ borderTop: 'none' }}><strong>Área:</strong> {v(firmaA1?.[2]?.area)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 15, borderTop: '1px solid #000', paddingTop: 5, fontSize: '7.5pt', color: '#000', fontFamily: 'sans-serif', lineHeight: 1.3 }}>
            <span style={{ float: 'right', fontWeight: 'bold' }}>V14.16/02/2018. - Ver documento de instrucciones.</span>
            Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017
          </div>

          {/* ==================== ANEXO 2 ==================== */}
          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ marginTop: 20 }}>
            <tbody>
              <tr>
                <td className="logo-cell">
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" />
                </td>
                <td className="title-cell">
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="piar-official-title-box">
            <h2>Plan Individual de Ajustes Razonables – PIAR –</h2>
            <h3>ANEXO 2</h3>
          </div>

          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ width: '25%' }}><strong>Fecha de elaboración:</strong><br />{fmtDate(gen2.fechaElaboracion)} <span style={{ color: '#888', fontSize: '8pt', float: 'right' }}>DD/MM/AA</span></td>
                <td style={{ width: '35%' }}><strong>Institución educativa:</strong><br />{v(gen2.institucion)}</td>
                <td style={{ width: '20%' }}><strong>Sede:</strong><br />{v(gen2.sede)}</td>
                <td style={{ width: '20%' }}><strong>Jornada:</strong><br />{v(gen2.jornada)}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>Docentes que elaboran:</strong><br />{v(gen2.docentesElaboran)}</td>
              </tr>
            </tbody>
          </table>

          <table className="piar-official-table">
            <tbody>
              <tr>
                <td colSpan="2" style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>DATOS DEL ESTUDIANTE</td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}><strong>Nombre del estudiante:</strong><br />{isBlankTemplate ? '' : v(activeStudent?.nombre)}</td>
                <td style={{ width: '50%' }}><strong>Documento de Identificación:</strong><br />{v(est.numeroIdentificacion)}</td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}><strong>Edad:</strong><br />{v(est.edad)}</td>
                <td style={{ width: '50%' }}><strong>Grado:</strong><br />{isBlankTemplate ? '' : v(activeStudent?.grado)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 700, fontSize: '10pt', marginTop: 15, marginBottom: 8 }}>1. Características del Estudiante:</div>
          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ height: 100 }}>
                  <strong>Descripción general del estudiante con énfasis en gustos, intereses o aspectos que le desagradan, expectativas de la familia:</strong><br />
                  <span style={{ fontSize: '9pt', color: '#444' }}>
                    {est.nombres ? `Expectativas de la familia y el estudiante: Acompañamiento en el hogar, fortalecimiento académico y desarrollo de habilidades sociales.` : ''}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ height: 180 }}>
                  <strong>Descripción en términos de lo que hace, puede hacer o requiere apoyo el estudiante para favorecer su proceso educativo.</strong><br />
                  <span style={{ fontSize: '8.5pt', color: '#666', display: 'block', marginBottom: 6 }}>Habilidades, competencias, cualidades y aprendizajes con las que cuenta el estudiante.</span>
                  {v(s.anexo2.caracteristicasEstudiante)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 15, borderTop: '1px solid #000', paddingTop: 5, fontSize: '7.5pt', color: '#000', fontFamily: 'sans-serif', lineHeight: 1.3 }}>
            <span style={{ float: 'right', fontWeight: 'bold' }}>V14.16/02/2018. - Ver documento de instrucciones.</span>
            Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017
          </div>

          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ marginTop: 20 }}>
            <tbody>
              <tr>
                <td className="logo-cell">
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" />
                </td>
                <td className="title-cell">
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 700, fontSize: '10pt', marginTop: 15, marginBottom: 8 }}>2. Ajustes Razonables.</div>
          <table className="piar-official-table" style={{ fontSize: '8.5pt' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', textAlign: 'center' }}>
                <td style={{ width: '12%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>ÁREA / APRENDIZAJE</td>
                <td style={{ width: '25%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>OBJETIVOS/PROPÓSITOS<br /><span style={{ fontWeight: 'normal', fontSize: '7.5pt' }}>(EBC / DBA)<br /><strong>Primer cuatrimestre/trimestre</strong></span></td>
                <td style={{ width: '21%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>BARRERAS QUE SE EVIDENCIAN</td>
                <td style={{ width: '21%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>AJUSTES RAZONABLES<br /><span style={{ fontWeight: 'normal', fontSize: '7.5pt' }}>(Apoyos/estrategias)</span></td>
                <td style={{ width: '21%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>EVALUACIÓN DE LOS AJUSTES<br /><span style={{ fontWeight: 'normal', fontSize: '7.5pt' }}>(Observaciones de seguimiento)</span></td>
              </tr>
            </thead>
            <tbody>
              {normAjustes.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: 10 }}>Sin ajustes razonables registrados.</td>
                </tr>
              ) : (
                normAjustes.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                      {a.area}
                      {a.trimestre && <span style={{ fontWeight: 'normal', fontSize: '7.5pt', color: '#475569', display: 'block', marginTop: 4 }}>{a.trimestre}</span>}
                      <span style={{ fontWeight: 'normal', fontSize: '7.5pt', color: '#0f172a', display: 'block', marginTop: 2 }}>Docente: {a.docente || '—'}</span>
                    </td>
                    <td>{v(a.objetivos)}</td>
                    <td>{v(a.barreras || a.bareras)}</td>
                    <td>{v(a.ajustes)}</td>
                    <td>{v(a.evaluacion)}</td>
                  </tr>
                ))
              )}
              
              {/* Otras categories rows */}
              <tr>
                <td rowSpan="5" style={{ fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }}>Otras</td>
                <td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                  {otrasCategories[0].label}
                  {otrasCategories[0].trimestre && <span style={{ fontWeight: 'normal', fontSize: '7.5pt', color: '#475569', display: 'block', marginTop: 4 }}>{otrasCategories[0].trimestre}</span>}
                  <span style={{ fontWeight: 'normal', fontSize: '7.5pt', color: '#0f172a', display: 'block', marginTop: 2 }}>Docente: {otrasCategories[0].docente || '—'}</span>
                </td>
                <td>{v(otrasCategories[0].barreras)}</td>
                <td>{v(otrasCategories[0].ajustes)}</td>
                <td>{v(otrasCategories[0].evaluacion)}</td>
              </tr>
              {otrasCategories.slice(1).map(cat => (
                <tr key={cat.label}>
                  <td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                    {cat.label}
                    {cat.trimestre && <span style={{ fontWeight: 'normal', fontSize: '7.5pt', color: '#475569', display: 'block', marginTop: 4 }}>{cat.trimestre}</span>}
                    <span style={{ fontWeight: 'normal', fontSize: '7.5pt', color: '#0f172a', display: 'block', marginTop: 2 }}>Docente: {cat.docente || '—'}</span>
                  </td>
                  <td>{v(cat.barreras)}</td>
                  <td>{v(cat.ajustes)}</td>
                  <td>{v(cat.evaluacion)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: '8pt', color: '#000', fontWeight: 'bold', lineHeight: 1.4, marginBottom: 8, marginTop: 8 }}>
            Nota: Para educación inicial y Preescolar, los propósitos se orientarán de acuerdo con las bases curriculares y DBA de transición, que no son por áreas.
          </div>
          <div style={{ fontSize: '7.5pt', color: '#555', fontStyle: 'italic', marginBottom: 15 }}>
            Las Instituciones educativas podrán ajustar de acuerdo con los avances en educación inclusiva y con el SIEE.
          </div>

          <div style={{ marginTop: 15, borderTop: '1px solid #000', paddingTop: 5, fontSize: '7.5pt', color: '#000', fontFamily: 'sans-serif', lineHeight: 1.3 }}>
            <span style={{ float: 'right', fontWeight: 'bold' }}>V14.16/02/2018. - Ver documento de instrucciones.</span>
            Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017
          </div>

          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ marginTop: 20 }}>
            <tbody>
              <tr>
                <td className="logo-cell">
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" />
                </td>
                <td className="title-cell">
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 700, fontSize: '9pt', marginTop: 15, marginBottom: 8, textDecoration: 'underline' }}>
            7). RECOMENDACIONES PARA EL PLAN DE MEJORAMIENTO INSTITUCIONAL PARA LA ELIMINACIÓN DE BARRERAS Y LA CREACIÓN DE PROCESOS PARA LA PARTICIPACIÓN, EL APRENDIZAJE Y EL PROGRESO DE LOS ESTUDIANTES:
          </div>

          <table className="piar-official-table">
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', textAlign: 'center' }}>
                <th style={{ width: '25%', border: '1px solid #000', padding: 6 }}>ACTORES</th>
                <th style={{ width: '35%', border: '1px solid #000', padding: 6 }}>ACCIONES</th>
                <th style={{ width: '40%', border: '1px solid #000', padding: 6 }}>ESTRATEGIAS A IMPLEMENTAR</th>
              </tr>
            </thead>
            <tbody>
              {pmi.map(p => (
                <tr key={p.actor}>
                  <td><strong>{p.actor}</strong></td>
                  <td>{v(p.acciones)}</td>
                  <td>{v(p.estrategias)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: '8.5pt', color: '#000', lineHeight: 1.4, marginTop: 15 }}>
            <strong>Firma y cargo de quienes realizan el proceso de valoración:</strong> Docentes, coordinadores, docente de apoyo, etc.
          </div>

          <table className="piar-official-table" style={{ marginTop: 25, minHeight: 80 }}>
            <tbody>
              <tr>
                <td style={{ width: '33.3%', height: 50, verticalAlign: 'bottom', borderBottom: 'none' }}><strong>Nombre y firma:</strong> {v(firmaA2?.[0]?.nombre)}</td>
                <td style={{ width: '33.3%', height: 50, verticalAlign: 'bottom', borderBottom: 'none' }}><strong>Nombre y firma:</strong> {v(firmaA2?.[1]?.nombre)}</td>
                <td style={{ width: '33.3%', height: 50, verticalAlign: 'bottom', borderBottom: 'none' }}><strong>Nombre y firma:</strong> {v(firmaA2?.[2]?.nombre)}</td>
              </tr>
              <tr>
                <td style={{ borderTop: 'none' }}><strong>Área:</strong> {v(firmaA2?.[0]?.area)}</td>
                <td style={{ borderTop: 'none' }}><strong>Área:</strong> {v(firmaA2?.[1]?.area)}</td>
                <td style={{ borderTop: 'none' }}><strong>Área:</strong> {v(firmaA2?.[2]?.area)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 15, borderTop: '1px solid #000', paddingTop: 5, fontSize: '7.5pt', color: '#000', fontFamily: 'sans-serif', lineHeight: 1.3 }}>
            <span style={{ float: 'right', fontWeight: 'bold' }}>V14.16/02/2018. - Ver documento de instrucciones.</span>
            Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017
          </div>

          {/* ==================== ANEXO 3 ==================== */}
          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ marginTop: 20 }}>
            <tbody>
              <tr>
                <td className="logo-cell">
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" />
                </td>
                <td className="title-cell">
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="piar-official-title-box">
            <h2>ACTA DE ACUERDO</h2>
            <h3>Plan Individual de Ajustes Razonables – PIAR – ANEXO 3</h3>
          </div>

          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ width: '35%' }}><strong>Fecha:</strong><br />{fmtDate(gen3.fecha)} <span style={{ color: '#888', fontSize: '8pt', float: 'right' }}>DD/MM/AAAA</span></td>
                <td style={{ width: '65%' }} colSpan="2"><strong>Institución educativa y Sede:</strong><br />{v(gen3.institucionSede)}</td>
              </tr>
              <tr>
                <td style={{ width: '35%' }}><strong>Nombre del estudiante:</strong><br />{isBlankTemplate ? '' : v(activeStudent?.nombre)}</td>
                <td style={{ width: '35%' }}><strong>Documento de Identificación:</strong><br />{v(est.numeroIdentificacion)}</td>
                <td style={{ width: '30%' }}><strong>Edad:</strong> {v(est.edad)}<br /><strong>Grado:</strong> {isBlankTemplate ? '' : v(activeStudent?.grado)}</td>
              </tr>
              <tr>
                <td style={{ width: '35%' }}><strong>Nombres equipo directivo y docentes:</strong></td>
                <td colSpan="2" style={{ verticalAlign: 'middle' }}>{v(gen3.docentesEquipo)}</td>
              </tr>
              <tr>
                <td style={{ width: '35%' }}><strong>Nombres familia del estudiante:</strong></td>
                <td style={{ width: '35%' }}>{v(gen3.familiaEstudiante?.[0]?.nombre)}</td>
                <td style={{ width: '30%' }}><strong>Parentesco:</strong> {v(gen3.familiaEstudiante?.[0]?.parentesco)}</td>
              </tr>
              <tr>
                <td style={{ width: '35%' }}></td>
                <td style={{ width: '35%' }}>{v(gen3.familiaEstudiante?.[1]?.nombre)}</td>
                <td style={{ width: '30%' }}><strong>Parentesco:</strong> {v(gen3.familiaEstudiante?.[1]?.parentesco)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontSize: '9.5pt', color: '#000', lineHeight: 1.5, margin: '15px 0' }}>
            <p style={{ marginBottom: 10 }}>Según el Decreto 1421 de 2017 la educación inclusiva es un proceso permanente que reconoce, valora y responde a la diversidad para promover el aprendizaje y participación.</p>
            <p style={{ marginBottom: 10 }}>La inclusión solo es posible cuando se unen los esfuerzos del colegio, el estudiante y la familia. De ahí la importancia de formalizar el acta.</p>
            <p style={{ marginBottom: 6 }}><strong>El Establecimiento Educativo</strong> ha realizado la valoración y definido los ajustes razonables.</p>
            <p style={{ marginBottom: 10 }}><strong>La Familia se compromete</strong> a cumplir y firmar los compromisos señalados en el PIAR, y en particular a:</p>
          </div>

          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ height: 250 }}>
                  <span style={{ fontSize: '8.5pt', color: '#666', display: 'block', marginBottom: 8, fontStyle: 'italic' }}>Compromisos específicos para implementar en el aula:</span>
                  {v(s.anexo3.compromisosAula)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 15, borderTop: '1px solid #000', paddingTop: 5, fontSize: '7.5pt', color: '#000', fontFamily: 'sans-serif', lineHeight: 1.3 }}>
            <span style={{ float: 'right', fontWeight: 'bold' }}>V14.16/02/2018. - Ver documento de instrucciones.</span>
            Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017
          </div>

          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ marginTop: 20 }}>
            <tbody>
              <tr>
                <td className="logo-cell">
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" />
                </td>
                <td className="title-cell">
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontSize: '9.5pt', color: '#000', marginTop: 15, marginBottom: 10, fontWeight: 'bold' }}>
            Y en casa apoyará con las siguientes actividades:
          </div>

          <table className="piar-official-table" style={{ fontSize: '9pt' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', textAlign: 'center' }}>
                <th style={{ width: '25%', border: '1px solid #000', padding: 6 }}>Nombre de la Actividad</th>
                <th style={{ width: '55%', border: '1px solid #000', padding: 6 }}>Descripción de la estrategia</th>
                <th style={{ width: '20%', border: '1px solid #000', padding: 6 }}>Frecuencia (D / S / P)</th>
              </tr>
            </thead>
            <tbody>
              {actividades.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: 10 }}>Sin actividades registradas.</td>
                </tr>
              ) : (
                actividades.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 'bold' }}>{a.actividad}</td>
                    <td>{v(a.descripcion)}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      <span style={{ margin: '0 4px', padding: '1px 4px', border: (!isBlankTemplate && a.frecuencia === 'D') ? '1px solid #000' : 'none' }}>D</span>
                      <span style={{ margin: '0 4px', padding: '1px 4px', border: (!isBlankTemplate && a.frecuencia === 'S') ? '1px solid #000' : 'none' }}>S</span>
                      <span style={{ margin: '0 4px', padding: '1px 4px', border: (!isBlankTemplate && a.frecuencia === 'P') ? '1px solid #000' : 'none' }}>P</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#000', marginTop: 20, marginBottom: 5 }}>
            Firma de los Actores comprometidos:
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20, fontSize: '9.5pt', color: '#000' }}>
            <tbody>
              <tr>
                <td style={{ width: '45%', borderBottom: '1px solid #000', height: 65, verticalAlign: 'bottom', paddingBottom: 4, textAlign: 'center' }}>
                  {firmas?.estudianteSignature ? (
                    <img src={firmas.estudianteSignature} alt="Firma Estudiante" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto 4px auto' }} />
                  ) : (
                    <div style={{ height: '45px' }} />
                  )}
                </td>
                <td style={{ width: '10%' }}></td>
                <td style={{ width: '45%', borderBottom: '1px solid #000', height: 65, verticalAlign: 'bottom', paddingBottom: 4, textAlign: 'center' }}>
                  {firmas?.acudienteSignature ? (
                    <img src={firmas.acudienteSignature} alt="Firma Acudiente" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto 4px auto' }} />
                  ) : (
                    <div style={{ height: '45px' }} />
                  )}
                </td>
              </tr>
              <tr>
                <td style={{ paddingTop: 4, fontWeight: 'bold' }}>Estudiante</td>
                <td></td>
                <td style={{ paddingTop: 4, fontWeight: 'bold' }}>Acudiente / familia</td>
              </tr>
              <tr>
                <td style={{ width: '45%', borderBottom: '1px solid #000', height: 65, verticalAlign: 'bottom', paddingBottom: 4, textAlign: 'center' }}>
                  {firmas?.docentesSignature ? (
                    <img src={firmas.docentesSignature} alt="Firma Docentes" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto 4px auto' }} />
                  ) : (
                    <div style={{ height: '45px' }} />
                  )}
                </td>
                <td></td>
                <td style={{ width: '45%', borderBottom: '1px solid #000', height: 65, verticalAlign: 'bottom', paddingBottom: 4 }}>
                  {/* Secondary docente signature line */}
                </td>
              </tr>
              <tr>
                <td style={{ paddingTop: 4, fontWeight: 'bold' }}>Docentes</td>
                <td></td>
                <td style={{ paddingTop: 4, fontWeight: 'bold' }}>Docentes</td>
              </tr>
              <tr>
                <td colSpan="3" style={{ width: '100%', borderBottom: '1px solid #000', height: 65, verticalAlign: 'bottom', paddingBottom: 4, textAlign: 'center' }}>
                  {firmas?.directivoSignature ? (
                    <img src={firmas.directivoSignature} alt="Firma Directivo" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto 4px auto' }} />
                  ) : (
                    <div style={{ height: '45px' }} />
                  )}
                </td>
              </tr>
              <tr>
                <td colSpan="3" style={{ paddingTop: 4, fontWeight: 'bold' }}>Directivo docente</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 15, borderTop: '1px solid #000', paddingTop: 5, fontSize: '7.5pt', color: '#000', fontFamily: 'sans-serif', lineHeight: 1.3 }}>
            <span style={{ float: 'right', fontWeight: 'bold' }}>V14.16/02/2018. - Ver documento de instrucciones.</span>
            Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017
          </div>
        </div>
      </div>

      {/* Botones de Navegación del Wizard en Vista Previa */}
      <div className="no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '32px', 
        paddingTop: '16px', 
        borderTop: '1px solid var(--border-color)',
        gap: '12px'
      }}>
        <button type="button" className="btn-wizard-prev" onClick={() => switchTab && switchTab('tab-anexo3')}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
          <span>Anterior Anexo 3</span>
        </button>

        <button type="button" className="btn-wizard-next" onClick={() => switchTab && switchTab('tab-dashboard')}>
          <span>Finalizar y Salir</span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
        </button>
      </div>
    </div>
  );
}
