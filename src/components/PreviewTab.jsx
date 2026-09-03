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

  const handleExportWord = async () => {
    const cssStyles = `
      <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; margin: 0; padding: 0; }
        @page WordSection1 {
          size: 8.5in 11.0in;
          margin: 0.45in 0.7in 0.4in 0.7in;
          mso-header-margin: 0.3in;
          mso-footer-margin: 0.3in;
          mso-paper-source: 0;
          mso-footer: f1;
        }
        div.WordSection1 { page: WordSection1; }

        /* Normalizar parrafos para evitar espacios fantasma en Word */
        p { margin: 0; padding: 0; mso-margin-top-alt: 0; mso-margin-bottom-alt: 0; }

        /* Header con logos */
        .piar-official-header { width: 100%; border-collapse: collapse; border: 1px solid #000; background-color: #fff; margin-bottom: 8pt; mso-keep-together: yes; page-break-inside: avoid; }
        .piar-official-header td { border: 1px solid #000; padding: 8pt 10pt; vertical-align: middle; text-align: center; }
        .piar-official-header .title-cell { text-align: center; font-family: Arial, Helvetica, sans-serif; vertical-align: middle; padding: 8pt 6pt; }
        .piar-official-header .logo-cell { text-align: center; vertical-align: middle; padding: 6pt 8pt; }
        .piar-official-header .piar-text { font-size: 11pt; font-weight: bold; color: #000; display: block; margin: 0; padding: 0; line-height: 1.2; text-align: center; }
        .piar-official-header .decreto-text { font-size: 8.5pt; font-weight: 600; color: #000; margin: 3pt 0 0 0; padding: 0; display: block; line-height: 1.2; text-align: center; }
        .piar-official-header img { vertical-align: middle; display: inline-block; margin: 0 auto; max-width: 330px; height: auto; }

        /* Encabezados de sección */
        .piar-section-header { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; font-weight: bold; text-decoration: underline; margin: 6pt 0 2pt 0; color: #000; display: block; }

        /* Saltos de página */
        .preview-page-break { page-break-before: always; clear: both; }

        /* Tablas del documento */
        .piar-official-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 4pt; background-color: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; page-break-inside: avoid; mso-keep-together: yes; }
        .piar-official-table td, .piar-official-table th { border: 1px solid #000; padding: 2.5pt 4.5pt; vertical-align: top; color: #000; line-height: 1.25; }
        .piar-official-table td strong { font-weight: bold; font-size: 8pt; color: #000; display: inline; }
        .piar-official-table .field-label { font-size: 8pt; font-weight: normal; color: #000; display: block; margin-bottom: 1pt; }
        .piar-official-table .table-info-note { font-style: normal; color: #000; font-size: 7.5pt; }
        .piar-official-table h2 { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; font-weight: bold; color: #000; margin: 1pt 0; text-transform: uppercase; line-height: 1.2; }
        .piar-official-table h3 { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; font-weight: bold; color: #000; margin: 1pt 0 0 0; line-height: 1.2; }

        /* Ocultar elementos de pantalla que no van en Word */
        .preview-container > *:not(.preview-document) { display: none !important; }
        .no-print { display: none !important; }
        .mobile-print-notice { display: none !important; }
        .piar-official-footer { display: none !important; }
      </style>
    `;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Documento PIAR</title>${cssStyles}</head><body>`;
    
    // Clonar solo el .preview-document (no el container gris con fondo)
    const documentElement = document.querySelector('.preview-document');
    if (!documentElement) {
      showToast('No hay contenido para exportar', 'error');
      return;
    }

    const clone = documentElement.cloneNode(true);

    // Convertir preview-page-break a parrafos de salto de pagina que Word respeta
    const pageBreaks = clone.querySelectorAll('.preview-page-break');
    pageBreaks.forEach(pb => {
      const p = document.createElement('p');
      p.setAttribute('style', 'page-break-before:always;mso-break-type:section-break;margin:0;padding:0;border:0;font-size:1pt;line-height:1pt;');
      p.innerHTML = '<span style="mso-special-character:line-break">&nbsp;</span>';
      pb.parentNode.replaceChild(p, pb);
    });

    // Asegurar centrado vertical nativo en headers para Word
    const headerTables = clone.querySelectorAll('.piar-official-header');
    headerTables.forEach(ht => {
      ht.querySelectorAll('td').forEach(td => {
        td.setAttribute('valign', 'middle');
        td.setAttribute('align', 'center');
      });
    });

    // Convert block divs to inline spans con <br> para eliminar espaciado extra de Word
    const tables = clone.querySelectorAll('.piar-official-table');
    tables.forEach(table => {
      const tds = table.querySelectorAll('td, th');
      tds.forEach(td => {
        const divs = Array.from(td.children).filter(child => child.tagName === 'DIV');
        divs.forEach((div, index) => {
          const span = document.createElement('span');
          span.innerHTML = div.innerHTML;
          if (div.className) span.className = div.className;
          if (div.style.cssText) span.style.cssText = div.style.cssText;
          
          td.insertBefore(span, div);
          if (index < divs.length - 1) {
            td.insertBefore(document.createElement('br'), div);
          }
          td.removeChild(div);
        });
      });
    });

    let htmlContent = clone.outerHTML;

    if (htmlContent.includes('Imagen1.png')) {
      const baseUrl = window.location.origin;
      htmlContent = htmlContent.replace(/src="\/Imagen1\.png"/g, `src="${baseUrl}/Imagen1.png"`);
    } else {
      htmlContent = htmlContent.replace(/<img[^>]*src="\/Imagen1\.png"[^>]*>/g, '<strong>Mineducación y Gobierno de Colombia</strong>');
    }

    const footerHtml = `
      <div style="mso-element:footer" id="f1">
        <p class="MsoFooter" style="text-align: center; font-size: 8pt; color: #555; font-family: Arial, sans-serif; line-height: 1.3; margin: 0; padding: 0;">
          V14.16/02/2018. - Ver documento de instrucciones.<br/>
          Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017
        </p>
      </div>
    `;

    const sourceHTML = header + `<div class="WordSection1">${htmlContent}</div>` + footerHtml + `</body></html>`;
    
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
    <>
      <div className="card">
      <div className="card-title-container no-print">
        <h3 className="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          {isBlankTemplate ? 'Vista Previa (Formulario en Blanco)' : 'Vista Previa del Documento PIAR'}
        </h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-md3-filled" onClick={handleExportWord} style={{ padding: '8px 16px', fontSize: '13px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
            <span>Guardar en Word</span>
          </button>
          <button className="btn-md3-filled" onClick={handlePrint} style={{ padding: '8px 16px', fontSize: '13px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            <span>Imprimir / Guardar PDF</span>
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
          <button className="btn-md3-filled" onClick={handleExportWord} style={{ width: '100%', justifyContent: 'center', marginTop: '16px', gap: '8px', padding: '12px' }}>
            <span className="material-symbols-outlined">description</span>
            <span>Guardar en Word</span>
          </button>
          <button className="btn-md3-filled" onClick={handlePrint} style={{ width: '100%', justifyContent: 'center', marginTop: '8px', gap: '8px', padding: '12px' }}>
            <span className="material-symbols-outlined">print</span>
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      </div>

      <div className="preview-container">
        <div id="preview-document-content" className="preview-document">
          {/* ==================== ANEXO 1 ==================== */}
          <table className="piar-official-header" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="logo-cell" style={{ textAlign: 'center', verticalAlign: 'middle', width: '70%' }}>
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" style={{ width: '350px', height: 'auto', display: 'block', margin: '0 auto' }} />
                </td>
                <td className="title-cell" style={{ verticalAlign: 'middle', width: '30%' }}>
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: '18px 0 12px 0', fontSize: '5pt' }}>&nbsp;</p>

          <table className="piar-official-table">
            <tbody>
              <tr>
                <td colSpan="2" style={{ textAlign: 'center', padding: '4px' }}>
                  <div style={{ margin: 0, fontSize: '11pt', fontWeight: 'bold' }}>INFORMACIÓN GENERAL DEL ESTUDIANTE</div>
                  <div style={{ margin: '2px 0 0 0', fontSize: '10pt', fontWeight: 'bold' }}>(Información para la matrícula – Anexo 1 PIAR)</div>
                </td>
              </tr>
              <tr>
                <td colSpan="2">
                  <div className="field-label">Fecha y Lugar de Diligenciamiento</div>
                  <table style={{ width: '100%', border: 'none', margin: 0, padding: 0 }}>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', padding: 0, verticalAlign: 'bottom' }}>
                          {v(gen1.fechaDiligenciamiento ? fmtDate(gen1.fechaDiligenciamiento) : '')} {v(gen1.lugarDiligenciamiento)}
                        </td>
                        <td style={{ border: 'none', padding: 0, textAlign: 'right', verticalAlign: 'bottom', color: '#888' }}>
                          DD/MM/AAAA
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Nombre de la Persona que diligencia:</div>
                  <div style={{}}>{v(gen1.nombreDiligencia)}</div>
                </td>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Rol que desempeña en la SE o la IE:</div>
                  <div style={{}}>{v(gen1.rolDiligencia)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="piar-section-header">1): Información general del estudiante</div>
          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Nombres</div>
                  <div>{v(est.nombres)}</div>
                </td>
                <td colSpan="2" style={{ width: '50%' }}>
                  <div className="field-label">Apellidos</div>
                  <div>{v(est.apellidos)}</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Lugar de nacimiento:</div>
                  <div>{v(est.lugarNacimiento)}</div>
                </td>
                <td style={{ width: '15%' }}>
                  <div className="field-label">Edad</div>
                  <div>{v(est.edad)}</div>
                </td>
                <td style={{ width: '35%' }}>
                  <div className="field-label">Fecha de nacimiento <span style={{ color: '#888', fontWeight: 'normal' }}>DD/MM/AAAA</span></div>
                  <div>{fmtDate(est.fechaNacimiento)}</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Tipo: TI. {est.tipoIdentificacion === 'TI' ? 'X' : '_'} CC {est.tipoIdentificacion === 'CC' ? 'X' : '_'} RC {est.tipoIdentificacion === 'RC' ? 'X' : '_'} otro: ¿cuál? {!['TI','CC','RC',''].includes(est.tipoIdentificacion) ? est.tipoIdentificacion : ''}</div>
                </td>
                <td colSpan="2" style={{ width: '50%' }}>
                  <div className="field-label">No de identificación</div>
                  <div>{v(est.numeroIdentificacion)}</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Departamento donde vive</div>
                  <div>{v(est.departamento)}</div>
                </td>
                <td colSpan="2" style={{ width: '50%' }}>
                  <div className="field-label">Municipio</div>
                  <div>{v(est.municipio)}</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Dirección de vivienda</div>
                  <div>{v(est.direccion)}</div>
                </td>
                <td colSpan="2" style={{ width: '50%' }}>
                  <div className="field-label">Barrio/vereda:</div>
                  <div>{v(est.barrioVereda)}</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Teléfono</div>
                  <div>{v(est.telefono)}</div>
                </td>
                <td colSpan="2" style={{ width: '50%' }}>
                  <div className="field-label">Correo electrónico</div>
                  <div>{v(est.email)}</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}>
                  <div className="field-label">¿Está en centro de protección? NO {(!isBlankTemplate && est.centroProteccion === 'NO') ? 'X' : '_'} SI {(!isBlankTemplate && est.centroProteccion === 'SI') ? 'X' : '_'} ¿dónde?</div>
                  <div>{est.centroProteccion === 'SI' ? v(est.centroProteccionDonde) : ''}</div>
                </td>
                <td colSpan="2" style={{ width: '50%' }}>
                  <div className="field-label">Grado al que aspira ingresar:</div>
                  <div>{v(est.gradoAspirado)}</div>
                </td>
              </tr>
              <tr>
                <td colSpan="3">
                  Si el estudiante no tiene registro civil debe iniciarse la gestión con la familia y la Registraduría
                </td>
              </tr>
              <tr>
                <td colSpan="3">
                  <div className="field-label">¿Se reconoce o pertenece a un grupo étnico? ¿Cuál?</div>
                  <div style={{}}>{v(est.grupoEtnico)}</div>
                </td>
              </tr>
              <tr>
                <td colSpan="3">
                  <div className="field-label">¿Se reconoce como víctima del conflicto armado? Si {(!isBlankTemplate && est.victimaConflicto === 'SI') ? 'X' : '__'} No {(!isBlankTemplate && est.victimaConflicto === 'NO') ? 'X' : '__'} (Cuenta con el respectivo registro? Si {(!isBlankTemplate && est.victimaConflictoRegistro === 'SI') ? 'X' : '__'} No {(!isBlankTemplate && est.victimaConflictoRegistro === 'NO') ? 'X' : '_'})</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="piar-section-header">2) Entorno Salud:</div>
          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ width: '45%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                    <span>Afiliación al sistema de salud</span>
                    <span>SI {(!isBlankTemplate && sal.afiliacionSalud === 'SI') ? 'X' : '_'}</span>
                    <span>No {(!isBlankTemplate && sal.afiliacionSalud === 'NO') ? 'X' : '___'}</span>
                  </div>
                </td>
                <td style={{ width: '25%' }}>
                  <div className="field-label">EPS</div>
                  <div style={{}}>{v(sal.eps)}</div>
                </td>
                <td style={{ width: '15%', verticalAlign: 'middle' }}>
                  Contributivo {(!isBlankTemplate && sal.regimen === 'Contributivo') ? 'X' : ''}
                </td>
                <td style={{ width: '15%', verticalAlign: 'middle' }}>
                  Subsidiado {(!isBlankTemplate && sal.regimen === 'Subsidiado') ? 'X' : ''}
                </td>
              </tr>
              <tr>
                <td colSpan="4">
                  <div className="field-label">Lugar donde le atienden en caso de emergencia:</div>
                  <div style={{}}>{v(sal.lugarEmergencia)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="piar-official-table" style={{ marginTop: -13 }}>
            <tbody>
              <tr>
                <td style={{ width: '35%' }}>¿El niño está siendo atendido<br />por el sector salud?</td>
                <td style={{ width: '8%', textAlign: 'center' }}>Si<br />{(!isBlankTemplate && sal.atendidoSectorSalud === 'SI') ? 'X' : ''}</td>
                <td style={{ width: '8%', textAlign: 'center' }}>No<br />{(!isBlankTemplate && sal.atendidoSectorSalud === 'NO') ? 'X' : ''}</td>
                <td style={{ width: '49%' }}>
                  <div className="field-label">Frecuencia:</div>
                  <div style={{}}>{v(sal.frecuenciaAtencion)}</div>
                </td>
              </tr>
              <tr>
                <td>Tiene diagnóstico médico:</td>
                <td style={{ textAlign: 'center' }}>Si<br />{(!isBlankTemplate && sal.diagnosticoMedico === 'SI') ? 'X' : ''}</td>
                <td style={{ textAlign: 'center' }}>No<br />{(!isBlankTemplate && sal.diagnosticoMedico === 'NO') ? 'X' : ''}</td>
                <td>
                  <div className="field-label">Cuál:</div>
                  <div style={{}}>{v(sal.diagnosticoCual)}</div>
                </td>
              </tr>
              <tr>
                <td rowSpan="3" style={{ verticalAlign: 'middle' }}>¿El niño está asistiendo a<br />terapias?</td>
                <td rowSpan="3" style={{ textAlign: 'center', verticalAlign: 'middle' }}>Si<br />{(!isBlankTemplate && sal.atendidoTerapias === 'SI') ? 'X' : ''}</td>
                <td rowSpan="3" style={{ textAlign: 'center', verticalAlign: 'middle' }}>No<br />{(!isBlankTemplate && sal.atendidoTerapias === 'NO') ? 'X' : ''}</td>
                <td style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000', width: '60%', padding: '4px 6px' }}>
                          <span className="field-label" style={{ display: 'inline', marginRight: '4px' }}>¿Cuál?</span>{v(sal.terapias?.[0]?.cual)}
                        </td>
                        <td style={{ border: 'none', borderBottom: '1px solid #000', width: '40%', padding: '4px 6px' }}>
                          <span className="field-label" style={{ display: 'inline', marginRight: '4px' }}>Frecuencia</span>{v(sal.terapias?.[0]?.frecuencia)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px 6px' }}>
                          <span className="field-label" style={{ display: 'inline', marginRight: '4px' }}>¿Cuál?</span>{v(sal.terapias?.[1]?.cual)}
                        </td>
                        <td style={{ border: 'none', borderBottom: '1px solid #000', padding: '4px 6px' }}>
                          <span className="field-label" style={{ display: 'inline', marginRight: '4px' }}>Frecuencia</span>{v(sal.terapias?.[1]?.frecuencia)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: 'none', borderRight: '1px solid #000', borderBottom: 'none', padding: '4px 6px' }}>
                          <span className="field-label" style={{ display: 'inline', marginRight: '4px' }}>¿Cuál?</span>{v(sal.terapias?.[2]?.cual)}
                        </td>
                        <td style={{ border: 'none', borderBottom: 'none', padding: '4px 6px' }}>
                          <span className="field-label" style={{ display: 'inline', marginRight: '4px' }}>Frecuencia</span>{v(sal.terapias?.[2]?.frecuencia)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="piar-official-table" style={{ marginTop: -13 }}>
            <tbody>
              <tr>
                <td style={{ width: '50%' }}>
                  <div style={{ marginBottom: '8px' }}>¿Actualmente recibe tratamiento médico por alguna<br />enfermedad en particular? SI {(!isBlankTemplate && sal.tratamientoMedico === 'SI') ? 'X' : '___'} NO {(!isBlankTemplate && sal.tratamientoMedico === 'NO') ? 'X' : '___'}</div>
                </td>
                <td style={{ width: '50%' }}>
                  <div className="field-label">¿Cuál? <span style={{ color: '#888', fontWeight: 'normal' }}>Ejemplo: para controlar epilepsia, uso de oxígeno, insulina, etc.)</span></div>
                  <div>{v(sal.tratamientoCual)}</div>
                </td>
              </tr>
              <tr>
                <td colSpan="2">
                  <div className="field-label">¿Consume medicamentos? Si {(!isBlankTemplate && sal.consumeMedicamentos === 'SI') ? 'X' : '__'} No {(!isBlankTemplate && sal.consumeMedicamentos === 'NO') ? 'X' : '__'} Frecuencia y horario <span style={{ color: '#888', fontWeight: 'normal' }}>(Nombre medicamento y si debe consumirlo en horario de clases)</span></div>
                  <div style={{}}>{v(sal.medicamentosFrecuencia)}</div>
                </td>
              </tr>
              <tr>
                <td colSpan="2">
                  <div className="field-label">¿Cuenta con productos de apoyo para favorecer su movilidad, comunicación e independencia? NO {(!isBlankTemplate && sal.productosApoyo === 'NO') ? 'X' : '____'} SI {(!isBlankTemplate && sal.productosApoyo === 'SI') ? 'X' : '____'} ¿Cuáles? <span style={{ color: '#888', fontWeight: 'normal' }}>Ejemplos: Sillas de ruedas, bastones, tableros de comunicación, audifonos etc.</span></div>
                  <div style={{}}>{v(sal.productosApoyoCuales)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="piar-official-footer">
            <div>V14.16/02/2018. - Ver documento de instrucciones.</div>
            <div>Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017</div>
          </div>

          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="logo-cell" style={{ textAlign: 'center', verticalAlign: 'middle', width: '70%' }}>
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" style={{ width: '350px', height: 'auto', display: 'block', margin: '0 auto' }} />
                </td>
                <td className="title-cell" style={{ verticalAlign: 'middle', width: '30%' }}>
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: '8px 0 4px 0', fontSize: '5pt' }}>&nbsp;</p>

          <div className="piar-section-header">3) Entorno Hogar:</div>
          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ width: '25%' }}><div className="field-label">Nombre de la madre</div><div style={{}}>{v(hog.nombreMadre)}</div></td>
                <td style={{ width: '25%' }}><div className="field-label">Nombre del padre</div><div style={{}}>{v(hog.nombrePadre)}</div></td>
                <td style={{ width: '50%' }}></td>
              </tr>
              <tr>
                <td><div className="field-label">Ocupación de la madre</div><div style={{}}>{v(hog.ocupacionMadre)}</div></td>
                <td><div className="field-label">Ocupación del padre</div><div style={{}}>{v(hog.ocupacionPadre)}</div></td>
                <td></td>
              </tr>
              <tr>
                <td><div className="field-label">Nivel educativo alcanzado <span style={{ color: '#888', fontWeight: 'normal', fontSize: '7pt' }}>Prim/Bto/Téc/Tecn/univ.</span></div><div>{v(hog.nivelMadre)}</div></td>
                <td><div className="field-label">Nivel educativo alcanzado <span style={{ color: '#888', fontWeight: 'normal', fontSize: '7pt' }}>Prim/Bto/Téc/Tecn/univ.</span></div><div>{v(hog.nivelPadre)}</div></td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ width: '25%' }}><div className="field-label">Nombre Cuidador</div><div style={{}}>{v(hog.nombreCuidador)}</div></td>
                <td style={{ width: '25%' }}>
                  <div className="field-label">Parentesco con el estudiante:</div>
                  <div style={{}}>{v(hog.parentescoCuidador)}</div>
                </td>
                <td style={{ width: '25%' }}>
                  <div className="field-label">Nivel educativo cuidador <span style={{ color: '#888', fontWeight: 'normal', fontSize: '7pt' }}>Prim/Bto/Téc/Tecn/univ.</span></div>
                  <div>{v(hog.nivelCuidador)}</div>
                </td>
                <td style={{ width: '25%' }}>
                  <div className="field-label">Teléfono</div>
                  <div>{v(hog.telefonoCuidador)}</div>
                  <div className="field-label" style={{ marginTop: '4px' }}>Correo electrónico:</div>
                  <div>{v(hog.emailCuidador)}</div>
                </td>
              </tr>
              <tr>
                <td><div className="field-label">No. Hermanos</div><div style={{}}>{v(hog.numHermanos)}</div></td>
                <td><div className="field-label">Lugar que ocupa:</div><div style={{}}>{v(hog.lugarHermanos)}</div></td>
                <td colSpan="2"><div className="field-label">¿Quiénes apoyan la crianza del estudiante?</div><div style={{}}>{v(hog.apoyanCrianza)}</div></td>
              </tr>
              <tr>
                <td colSpan="2"><div className="field-label">Personas con quien vive:</div><div style={{}}>{v(hog.personasConQuienVive)}</div></td>
                <td colSpan="2"></td>
              </tr>
              <tr>
                <td colSpan="2"><div className="field-label">¿Está bajo protección? Si {(!isBlankTemplate && hog.bajoProteccion === 'SI') ? 'X' : '_'} No {(!isBlankTemplate && hog.bajoProteccion === 'NO') ? 'X' : '_'}</div></td>
                <td colSpan="2"></td>
              </tr>
              <tr>
                <td colSpan="4">
                  <div className="field-label">La familia recibe algún subsidio de alguna entidad o institución: SI {(!isBlankTemplate && hog.recibeSubsidio === 'SI') ? 'X' : '__'} NO {(!isBlankTemplate && hog.recibeSubsidio === 'NO') ? 'X' : '__'} ¿Cuál? <span style={{ color: '#888', fontWeight: 'normal' }}>(Ejemplos: Prosperidad Social, ICBF, Fundaciones, ONG, etc.)</span></div>
                  <div style={{}}>{v(hog.subsidioCual)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="piar-section-header">4. Entorno Educativo:</div>
          <div style={{ fontWeight: 'bold', fontSize: '9pt', textDecoration: 'underline', marginTop: 3, marginBottom: 3 }}>Información de la Trayectoria Educativa</div>
          <table className="piar-official-table" style={{ marginBottom: 8 }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', padding: '4px 8px' }}>
                  <div className="field-label">¿Ha estado vinculado en otra institución educativa, fundación o modalidad de educación inicial?</div>
                </td>
                <td style={{ width: '50%', padding: '4px 8px' }}>
                  <div className="field-label">NO {(!isBlankTemplate && tra.vinculadoAntes === 'NO') ? 'X' : '___'} ¿Por qué?</div>
                  <div style={{ marginBottom: '4px' }}>{(!isBlankTemplate && tra.vinculadoAntes === 'NO') ? v(tra.observaciones) : ''}</div>
                  <div className="field-label">SI {(!isBlankTemplate && tra.vinculadoAntes === 'SI') ? 'X' : '___'} ¿Cuáles?</div>
                  <div style={{}}>{(!isBlankTemplate && tra.vinculadoAntes === 'SI') ? v(tra.vinculadoCuales) : ''}</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '35%', padding: '4px 8px' }}>
                  <div className="field-label">Ultimo grado cursado</div>
                  <div style={{}}>{v(tra.ultimoGrado)}</div>
                </td>
                <td style={{ width: '65%', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', height: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', borderRight: '1px solid #000', width: '40%', padding: '4px 6px' }}>
                          <div className="field-label">¿Aprobó? SI {(!isBlankTemplate && tra.aprobo === 'SI') ? 'X' : '___'} NO {(!isBlankTemplate && tra.aprobo === 'NO') ? 'X' : '___'}</div>
                        </td>
                        <td style={{ border: 'none', width: '60%', padding: '4px 6px' }}>
                          <div className="field-label">Observaciones: <span style={{ color: '#888', fontWeight: 'normal' }}>(incluir motivos del cambio de la modalidad o de la institución educativa)</span></div>
                          <div style={{}}>{v(tra.observaciones)}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%', padding: '4px 8px' }}>
                  <div className="field-label">¿Se recibe informe pedagógico cualitativo que describa el proceso de desarrollo y aprendizaje del estudiante y/o PIAR?<br/>NO {(!isBlankTemplate && tra.recibeInforme === 'NO') ? 'X' : '___'} SI {(!isBlankTemplate && tra.recibeInforme === 'SI') ? 'X' : '___'}</div>
                </td>
                <td style={{ width: '50%', padding: '4px 8px' }}>
                  <div className="field-label">¿De qué institución o modalidad proviene el informe?</div>
                  <div style={{}}>{v(tra.informeProcedencia)}</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%', padding: '4px 8px' }}>
                  <div className="field-label">¿Está asistiendo en la actualidad a programas complementarios? NO {(!isBlankTemplate && tra.programasComplementarios === 'NO') ? 'X' : '___'} SI {(!isBlankTemplate && tra.programasComplementarios === 'SI') ? 'X' : '___'}</div>
                </td>
                <td style={{ width: '50%', padding: '4px 8px' }}>
                  <div className="field-label">¿Cuáles? <span style={{ color: '#888', fontWeight: 'normal' }}>(Ejemplo: Deportes, danzas, música, pintura, recreación, otros cursos)</span></div>
                  <div style={{}}>{v(tra.programasCuales)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 'bold', fontSize: '9pt', textDecoration: 'underline', marginTop: 6, marginBottom: 3 }}>Información de la institución educativa en la que se matricula:</div>
          <table className="piar-official-table" style={{ marginBottom: 8 }}>
            <tbody>
              <tr>
                <td style={{ width: '60%', padding: '4px 8px' }}>
                  <div className="field-label">Nombre de la Institución educativa a la que se matricula:</div>
                  <div style={{}}>{v(ins.nombreIE)}</div>
                </td>
                <td style={{ width: '40%', padding: '4px 8px' }}>
                  <div className="field-label">Sede:</div>
                  <div style={{}}>{v(ins.sede)}</div>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '4px 8px' }}>
                  <div className="field-label">Medio que usará el estudiante para transportarse a la institución educativa.</div>
                  <div style={{}}>{v(ins.medioTransporte)}</div>
                </td>
                <td style={{ padding: '4px 8px' }}>
                  <div className="field-label">Distancia entre la institución educativa o sede y el hogar del estudiante (Tiempo)</div>
                  <div style={{}}>{v(ins.distanciaTiempo)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="piar-official-table" style={{ marginTop: 10, minHeight: 60 }}>
            <tbody>
              <tr>
                <td style={{ width: '33.3%', height: 50, verticalAlign: 'bottom', borderBottom: 'none' }}>
                  <div className="field-label" style={{ marginBottom: '30px' }}>Nombre y firma</div>
                  <div>{v(firmaA1?.[0]?.nombre)}</div>
                </td>
                <td style={{ width: '33.3%', height: 50, verticalAlign: 'bottom', borderBottom: 'none' }}>
                  <div className="field-label" style={{ marginBottom: '30px' }}>Nombre y firma</div>
                  <div>{v(firmaA1?.[1]?.nombre)}</div>
                </td>
                <td style={{ width: '33.3%', height: 50, verticalAlign: 'bottom', borderBottom: 'none' }}>
                  <div className="field-label" style={{ marginBottom: '30px' }}>Nombre y firma</div>
                  <div>{v(firmaA1?.[2]?.nombre)}</div>
                </td>
              </tr>
              <tr>
                <td style={{ borderTop: 'none' }}>
                  <div className="field-label">Área</div>
                  <div>{v(firmaA1?.[0]?.area)}</div>
                </td>
                <td style={{ borderTop: 'none' }}>
                  <div className="field-label">Área</div>
                  <div>{v(firmaA1?.[1]?.area)}</div>
                </td>
                <td style={{ borderTop: 'none' }}>
                  <div className="field-label">Área</div>
                  <div>{v(firmaA1?.[2]?.area)}</div>
                </td>
              </tr>
            </tbody>
          </table>



          {/* ==================== ANEXO 2 ==================== */}
                    <div className="piar-official-footer">
            <div>V14.16/02/2018. - Ver documento de instrucciones.</div>
            <div>Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017</div>
          </div>

          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="logo-cell" style={{ textAlign: 'center', verticalAlign: 'middle', width: '70%' }}>
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" style={{ width: '350px', height: 'auto', display: 'block', margin: '0 auto' }} />
                </td>
                <td className="title-cell" style={{ verticalAlign: 'middle', width: '30%' }}>
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: '18px 0 12px 0', fontSize: '5pt' }}>&nbsp;</p>

          <table className="piar-official-table">
            <tbody>
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '12px' }}>
                  <div style={{ margin: 0, fontSize: '11pt', fontWeight: 'bold' }}>Plan Individual de Ajustes Razonables – PIAR –</div>
                  <div style={{ margin: '2px 0 0 0', fontSize: '10pt', fontWeight: 'bold' }}>ANEXO 2</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '25%' }}>
                  <div className="field-label">Fecha de elaboración:</div>
                  <div style={{ minHeight: '16px' }}>{fmtDate(gen2.fechaElaboracion)} <span style={{ color: '#888', fontWeight: 'normal' }}>DD/MM/AA</span></div>
                </td>
                <td style={{ width: '35%' }}>
                  <div className="field-label">Institución educativa:</div>
                  <div style={{}}>{v(gen2.institucion)}</div>
                </td>
                <td style={{ width: '20%' }}>
                  <div className="field-label">Sede:</div>
                  <div style={{}}>{v(gen2.sede)}</div>
                </td>
                <td style={{ width: '20%' }}>
                  <div className="field-label">Jornada:</div>
                  <div style={{}}>{v(gen2.jornada)}</div>
                </td>
              </tr>
              <tr>
                <td colSpan="4">
                  <div className="field-label">Docentes que elaboran y cargo:</div>
                  <div style={{}}>{v(gen2.docentesElaboran)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="piar-official-table">
            <tbody>
              <tr>
                <td colSpan="2" style={{ textAlign: 'center', fontWeight: 'bold' }}>DATOS DEL ESTUDIANTE</td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Nombre del estudiante:</div>
                  <div style={{ minHeight: '16px' }}>{isBlankTemplate ? '' : v(activeStudent?.nombre)}</div>
                </td>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Documento de Identificación:</div>
                  <div style={{}}>{v(est.numeroIdentificacion)}</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Edad:</div>
                  <div style={{}}>{v(est.edad)}</div>
                </td>
                <td style={{ width: '50%' }}>
                  <div className="field-label">Grado:</div>
                  <div style={{ minHeight: '16px' }}>{isBlankTemplate ? '' : v(activeStudent?.grado)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 'bold', fontSize: '10pt', marginTop: 15, marginBottom: 8 }}>1. Características del Estudiante:</div>
          <table className="piar-official-table">
            <tbody>
              <tr>
                <td style={{ height: 100 }}>
                  <div className="field-label" style={{ color: '#666', fontStyle: 'italic', marginBottom: '10px' }}>Descripción general del estudiante con énfasis en gustos e intereses o aspectos que le desagradan, expectativas del estudiante y la familia.</div>
                  <div style={{ minHeight: '16px' }}>
                    {est.nombres ? `Expectativas de la familia y el estudiante: Acompañamiento en el hogar, fortalecimiento académico y desarrollo de habilidades sociales.` : ''}
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ height: 180 }}>
                  <div className="field-label" style={{ color: '#666', fontStyle: 'italic', marginBottom: '10px' }}>Descripción en términos de lo que hace, puede hacer o requiere apoyo el estudiante para favorecer su proceso educativo.<br/><br/>Indique las habilidades, competencias, cualidades, aprendizajes con las que cuenta el estudiante para el grado en el que fue matriculado.</div>
                  <div style={{}}>{v(s.anexo2.caracteristicasEstudiante)}</div>
                </td>
              </tr>
            </tbody>
          </table>



                    <div className="piar-official-footer">
            <div>V14.16/02/2018. - Ver documento de instrucciones.</div>
            <div>Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017</div>
          </div>

          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="logo-cell" style={{ textAlign: 'center', verticalAlign: 'middle', width: '70%' }}>
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" style={{ width: '350px', height: 'auto', display: 'block', margin: '0 auto' }} />
                </td>
                <td className="title-cell" style={{ verticalAlign: 'middle', width: '30%' }}>
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: '5px 0', fontSize: '5pt' }}>&nbsp;</p>

          <div style={{ fontWeight: 'bold', fontSize: '10pt', marginTop: 15, marginBottom: 8, pageBreakAfter: 'avoid', breakAfter: 'avoid' }}>2. Ajustes Razonables.</div>
          <table className="piar-official-table" style={{ fontSize: '8pt' }}>
            <thead>
              <tr style={{ textAlign: 'center', backgroundColor: '#fff' }}>
                <th style={{ width: '12%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>ÁREA S/ A P R E N D I Z A J E S</th>
                <th style={{ width: '22%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>OBJETIVOS/PROPÓSITOS<br /><span style={{ fontWeight: 'normal', fontSize: '7.5pt' }}>(Estas son para todo el grado, de acuerdo con los EBC y los DBA)<br /><br /><strong>Primer trimestre</strong></span></th>
                <th style={{ width: '22%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>BARRERAS QUE SE EVIDENCIAN EN EL CONTEXTO SOBRE LAS QUE SE DEBEN TRABAJAR</th>
                <th style={{ width: '22%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>AJUSTES RAZONABLES<br /><span style={{ fontWeight: 'normal', fontSize: '7.5pt' }}>(Apoyos/estrategias)</span></th>
                <th style={{ width: '22%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>EVALUACIÓN DE LOS AJUSTES<br /><br /><span style={{ fontWeight: 'normal', fontSize: '7.5pt' }}>(Dejar espacio para observaciones. Realizar seguimiento 3 veces en el año como mínimo- de acuerdo con la periodicidad establecida en el Sistema Institucional de Evaluación de los Estudiantes SIEE)</span></th>
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



                    <div className="piar-official-footer">
            <div>V14.16/02/2018. - Ver documento de instrucciones.</div>
            <div>Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017</div>
          </div>

          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="logo-cell" style={{ textAlign: 'center', verticalAlign: 'middle', width: '70%' }}>
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" style={{ width: '350px', height: 'auto', display: 'block', margin: '0 auto' }} />
                </td>
                <td className="title-cell" style={{ verticalAlign: 'middle', width: '30%' }}>
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>


          <div style={{ fontWeight: 'bold', fontSize: '9pt', marginTop: 8, marginBottom: 4 }}>
            3. Recomendaciones para el Plan de Mejoramiento Institucional (PMI) para la eliminación de barreras y la creación de procesos para la participación, el aprendizaje y el progreso de los estudiantes:
          </div>
          <table className="piar-official-table">
            <thead>
              <tr style={{ backgroundColor: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
                <th style={{ width: '25%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>ACTORES</th>
                <th style={{ width: '35%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>ACCIONES</th>
                <th style={{ width: '40%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>ESTRATEGIAS A IMPLEMENTAR</th>
              </tr>
            </thead>
            <tbody>
              {pmi.map(p => (
                <tr key={p.actor}>
                  <td style={{ fontWeight: 'bold' }}>{p.actor}</td>
                  <td>{v(p.acciones)}</td>
                  <td>{v(p.estrategias)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: '8.5pt', color: '#000', lineHeight: 1.4, marginTop: 8 }}>
            <strong>Firma y cargo de quienes realizan el proceso de valoración:</strong> Docentes, coordinadores, docente de apoyo, etc.
          </div>

          <table className="piar-official-table" style={{ marginTop: 8 }}>
            <tbody>
              <tr>
                <td style={{ width: '33.3%', height: 35, verticalAlign: 'bottom', borderBottom: 'none' }}>
                  <div className="field-label" style={{ marginBottom: '18px' }}>Nombre y firma</div>
                  <div>
                    {firmaA2?.[0]?.signature ? (
                      <img src={firmaA2[0].signature} alt="Firma" style={{ maxHeight: '30px', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
                    ) : ''}
                    {v(firmaA2?.[0]?.nombre)}
                  </div>
                </td>
                <td style={{ width: '33.3%', height: 35, verticalAlign: 'bottom', borderBottom: 'none' }}>
                  <div className="field-label" style={{ marginBottom: '18px' }}>Nombre y firma</div>
                  <div>
                    {firmaA2?.[1]?.signature ? (
                      <img src={firmaA2[1].signature} alt="Firma" style={{ maxHeight: '30px', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
                    ) : ''}
                    {v(firmaA2?.[1]?.nombre)}
                  </div>
                </td>
                <td style={{ width: '33.3%', height: 35, verticalAlign: 'bottom', borderBottom: 'none' }}>
                  <div className="field-label" style={{ marginBottom: '18px' }}>Nombre y firma</div>
                  <div>
                    {firmaA2?.[2]?.signature ? (
                      <img src={firmaA2[2].signature} alt="Firma" style={{ maxHeight: '30px', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
                    ) : ''}
                    {v(firmaA2?.[2]?.nombre)}
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ borderTop: 'none' }}>
                  <div className="field-label">Área</div>
                  <div>{v(firmaA2?.[0]?.area)}</div>
                </td>
                <td style={{ borderTop: 'none' }}>
                  <div className="field-label">Área</div>
                  <div>{v(firmaA2?.[1]?.area)}</div>
                </td>
                <td style={{ borderTop: 'none' }}>
                  <div className="field-label">Área</div>
                  <div>{v(firmaA2?.[2]?.area)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ==================== ANEXO 3 ==================== */}
                    <div className="piar-official-footer">
            <div>V14.16/02/2018. - Ver documento de instrucciones.</div>
            <div>Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017</div>
          </div>

          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="logo-cell" style={{ textAlign: 'center', verticalAlign: 'middle', width: '70%' }}>
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" style={{ width: '350px', height: 'auto', display: 'block', margin: '0 auto' }} />
                </td>
                <td className="title-cell" style={{ verticalAlign: 'middle', width: '30%' }}>
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: '18px 0 12px 0', fontSize: '5pt' }}>&nbsp;</p>

          <table className="piar-official-table">
            <tbody>
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '12px' }}>
                  <div style={{ margin: 0, fontSize: '11pt', fontWeight: 'bold' }}>ACTA DE ACUERDO</div>
                  <div style={{ margin: '2px 0 0 0', fontSize: '10pt', fontWeight: 'bold' }}>Plan Individual de Ajustes Razonables – PIAR – ANEXO 3</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '35%' }}>
                  <div className="field-label">Fecha:</div>
                  <table style={{ width: '100%', border: 'none', margin: 0, padding: 0 }}>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', padding: 0 }}>{fmtDate(gen3.fecha)}</td>
                        <td style={{ border: 'none', padding: 0, textAlign: 'right', color: '#888', fontWeight: 'normal' }}>DD/MM/AAAA</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td style={{ width: '65%' }} colSpan="2">
                  <div className="field-label">Institución educativa y Sede:</div>
                  <div style={{}}>{v(gen3.institucionSede)}</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '35%' }}>
                  <div className="field-label">Nombre del estudiante:</div>
                  <div style={{ minHeight: '16px' }}>{isBlankTemplate ? '' : v(activeStudent?.nombre)}</div>
                </td>
                <td style={{ width: '35%' }}>
                  <div className="field-label">Documento de Identificación:</div>
                  <div style={{}}>{v(est.numeroIdentificacion)}</div>
                </td>
                <td style={{ width: '30%' }}>
                  <div className="field-label" style={{ display: 'inline', marginRight: '8px' }}>Edad:</div>{v(est.edad)}<br />
                  <div className="field-label" style={{ display: 'inline', marginRight: '8px' }}>Grado:</div>{isBlankTemplate ? '' : v(activeStudent?.grado)}
                </td>
              </tr>
              <tr>
                <td style={{ width: '35%' }}>
                  <div className="field-label">Nombres equipo directivo y docentes:</div>
                </td>
                <td colSpan="2" style={{ verticalAlign: 'middle' }}>{v(gen3.docentesEquipo)}</td>
              </tr>
              <tr>
                <td style={{ width: '35%' }}>
                  <div className="field-label">Nombres familia del estudiante:</div>
                </td>
                <td style={{ width: '35%' }}>{v(gen3.familiaEstudiante?.[0]?.nombre)}</td>
                <td style={{ width: '30%' }}>
                  <div className="field-label" style={{ display: 'inline', marginRight: '8px' }}>Parentesco:</div>{v(gen3.familiaEstudiante?.[0]?.parentesco)}
                </td>
              </tr>
              <tr>
                <td style={{ width: '35%' }}></td>
                <td style={{ width: '35%' }}>{v(gen3.familiaEstudiante?.[1]?.nombre)}</td>
                <td style={{ width: '30%' }}>
                  <div className="field-label" style={{ display: 'inline', marginRight: '8px' }}>Parentesco:</div>{v(gen3.familiaEstudiante?.[1]?.parentesco)}
                </td>
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

                    <div className="piar-official-footer">
            <div>V14.16/02/2018. - Ver documento de instrucciones.</div>
            <div>Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017</div>
          </div>

          <div className="preview-page-break"></div>

          <table className="piar-official-header" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="logo-cell" style={{ textAlign: 'center', verticalAlign: 'middle', width: '70%' }}>
                  <img src="/Imagen1.png" alt="Mineducación y Gobierno de Colombia" style={{ width: '350px', height: 'auto', display: 'block', margin: '0 auto' }} />
                </td>
                <td className="title-cell" style={{ verticalAlign: 'middle', width: '30%' }}>
                  <div className="piar-text">PIAR</div>
                  <div className="decreto-text">Decreto 1421/2017</div>
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: '5px 0', fontSize: '5pt' }}>&nbsp;</p>

          <div style={{ fontSize: '9.5pt', color: '#000', marginTop: 15, marginBottom: 10, fontWeight: 'bold' }}>
            Y en casa apoyará con las siguientes actividades:
          </div>

          <table className="piar-official-table" style={{ fontSize: '9pt' }}>
            <thead>
              <tr style={{ backgroundColor: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
                <th style={{ width: '25%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>Nombre de la Actividad</th>
                <th style={{ width: '55%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>Descripción de la estrategia</th>
                <th style={{ width: '20%', border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>Frecuencia (D / S / P)</th>
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

          <table className="piar-official-table" style={{ marginTop: 20, minHeight: 60, border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ width: '45%', height: 50, verticalAlign: 'bottom', border: 'none', borderBottom: '1px solid #000', padding: '0 8px 4px 8px' }}>
                  <div style={{ textAlign: 'center' }}>
                    {firmas?.estudianteSignature ? (
                      <img src={firmas.estudianteSignature} alt="Firma Estudiante" style={{ maxHeight: '30px', maxWidth: '100%', objectFit: 'contain', display: 'inline-block' }} />
                    ) : (
                      <div style={{ height: '30px' }} />
                    )}
                  </div>
                </td>
                <td style={{ width: '10%', border: 'none' }}></td>
                <td style={{ width: '45%', height: 50, verticalAlign: 'bottom', border: 'none', borderBottom: '1px solid #000', padding: '0 8px 4px 8px' }}>
                  <div style={{ textAlign: 'center' }}>
                    {firmas?.acudienteSignature ? (
                      <img src={firmas.acudienteSignature} alt="Firma Acudiente" style={{ maxHeight: '30px', maxWidth: '100%', objectFit: 'contain', display: 'inline-block' }} />
                    ) : (
                      <div style={{ height: '30px' }} />
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ border: 'none', paddingTop: 4 }}>
                  <div className="field-label">Estudiante</div>
                </td>
                <td style={{ border: 'none' }}></td>
                <td style={{ border: 'none', paddingTop: 4 }}>
                  <div className="field-label">Acudiente / familia</div>
                </td>
              </tr>

              <tr>
                <td style={{ width: '45%', height: 50, verticalAlign: 'bottom', border: 'none', borderBottom: '1px solid #000', padding: '0 8px 4px 8px', paddingTop: '30px' }}>
                  <div style={{ textAlign: 'center' }}>
                    {firmas?.docentesSignature ? (
                      <img src={firmas.docentesSignature} alt="Firma Docentes" style={{ maxHeight: '30px', maxWidth: '100%', objectFit: 'contain', display: 'inline-block' }} />
                    ) : (
                      <div style={{ height: '30px' }} />
                    )}
                  </div>
                </td>
                <td style={{ width: '10%', border: 'none' }}></td>
                <td style={{ width: '45%', height: 50, verticalAlign: 'bottom', border: 'none', borderBottom: '1px solid #000', padding: '0 8px 4px 8px', paddingTop: '30px' }}>
                </td>
              </tr>
              <tr>
                <td style={{ border: 'none', paddingTop: 4 }}>
                  <div className="field-label">Docentes</div>
                </td>
                <td style={{ border: 'none' }}></td>
                <td style={{ border: 'none', paddingTop: 4 }}>
                  <div className="field-label">Docentes</div>
                </td>
              </tr>

              <tr>
                <td style={{ width: '45%', height: 50, verticalAlign: 'bottom', border: 'none', borderBottom: '1px solid #000', padding: '0 8px 4px 8px', paddingTop: '30px' }}>
                  <div style={{ textAlign: 'center' }}>
                    {firmas?.directivoSignature ? (
                      <img src={firmas.directivoSignature} alt="Firma Directivo" style={{ maxHeight: '30px', maxWidth: '100%', objectFit: 'contain', display: 'inline-block' }} />
                    ) : (
                      <div style={{ height: '30px' }} />
                    )}
                  </div>
                </td>
                <td style={{ width: '10%', border: 'none' }}></td>
                <td style={{ width: '45%', border: 'none' }}></td>
              </tr>
              <tr>
                <td style={{ border: 'none', paddingTop: 4 }}>
                  <div className="field-label">Directivo docente</div>
                </td>
                <td style={{ border: 'none' }}></td>
                <td style={{ border: 'none' }}></td>
              </tr>
            </tbody>
          </table>

          <div className="piar-official-footer">
            <div>V14.16/02/2018. - Ver documento de instrucciones.</div>
            <div>Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017</div>
          </div>

          {/* Footer fijo repetido al fondo de todas las hojas impresas / PDF */}
          <div className="piar-official-footer-print" aria-hidden="true">
            <div>V14.16/02/2018. - Ver documento de instrucciones.</div>
            <div>Ministerio de Educación Nacional – Viceministerio de Educación Preescolar, Básica y Media – Decreto 1421 de 2017</div>
          </div>
        </div>
      </div>
      </div>

      {/* Botones de Navegación del Wizard */}
      <div className="wizard-nav-container no-print">
        <button type="button" className="btn-wizard-prev" onClick={() => switchTab && switchTab('tab-anexo3')}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
          <span>Anterior Anexo 3</span>
        </button>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button type="button" className="btn-wizard-next" onClick={() => switchTab && switchTab('tab-dashboard')}>
            <span>Finalizar y Salir</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
          </button>
        </div>
      </div>
    </>
  );
}

