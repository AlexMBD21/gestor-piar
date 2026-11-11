import { usePiar } from '../context/PiarContext';
import { PLantillasPIAR } from '../lib/piarTemplates';
import Anexo1DatosPersonales from './anexos/Anexo1DatosPersonales';
import Anexo1Salud from './anexos/Anexo1Salud';
import Anexo1Hogar from './anexos/Anexo1Hogar';
import Anexo1Educativo from './anexos/Anexo1Educativo';
import AnexoQuickNav from './AnexoQuickNav';

const ANEXO1_SECTIONS = [
  { id: 'anexo1-sec-personal', icon: 'badge', label: '1. Datos Personales' },
  { id: 'anexo1-sec-salud', icon: 'medical_services', label: '2. Entorno Salud' },
  { id: 'anexo1-sec-hogar', icon: 'family_restroom', label: '3. Entorno Hogar' },
  { id: 'anexo1-sec-educativo', icon: 'school', label: '4. Entorno Educativo' }
];

export default function Anexo1Form({ switchTab }) {
  const { getActiveStudent, updateLocalPiarData } = usePiar();
  const activeStudent = getActiveStudent();
  const isBlankTemplate = !activeStudent;

  const displayStudent = activeStudent || {
    id: 'blanco-temp',
    data: PLantillasPIAR.blanco
  };

  const data = displayStudent.data;
  const { general, estudiante, salud, hogar, trayectoria, institucion, firmas } = data.anexo1;

  const handleChange = (section, field, value) => {
    const updatedData = { ...data };
    
    // Si cambia nombres o apellidos, actualizar el nombre principal del estudiante
    if (section === 'estudiante' && (field === 'nombres' || field === 'apellidos')) {
      const nom = field === 'nombres' ? value : estudiante.nombres;
      const ape = field === 'apellidos' ? value : estudiante.apellidos;
      updatedData.estudianteNombre = `${nom} ${ape}`.trim() || 'Sin Nombre';
    }

    if (section === 'estudiante' && field === 'gradoAspirado') {
      updatedData.grado = value;
    }

    updatedData.anexo1[section][field] = value;
    updateLocalPiarData(activeStudent.id, updatedData);
  };

  const handleTerapiaChange = (index, field, value) => {
    const updatedData = { ...data };
    updatedData.anexo1.salud.terapias[index][field] = value;
    updateLocalPiarData(activeStudent.id, updatedData);
  };

  const handleFirmaChange = (index, field, value) => {
    const updatedData = { ...data };
    updatedData.anexo1.firmas[index][field] = value;
    updateLocalPiarData(displayStudent.id, updatedData);
  };

  return (
    <>
      <AnexoQuickNav sections={ANEXO1_SECTIONS} ariaLabel="Secciones del Anexo 1" />

      <div style={isBlankTemplate ? { pointerEvents: 'none', opacity: 0.85 } : {}}>
        {/* Diligenciamiento y Datos Personales */}
        <div id="anexo1-sec-personal" className="anexo1-section-anchor">
          <Anexo1DatosPersonales general={general} estudiante={estudiante} handleChange={handleChange} isBlankTemplate={isBlankTemplate} />
        </div>

        {/* Entorno Salud */}
        <div id="anexo1-sec-salud" className="anexo1-section-anchor">
          <Anexo1Salud salud={salud} handleChange={handleChange} handleTerapiaChange={handleTerapiaChange} />
        </div>

        {/* Entorno Hogar */}
        <div id="anexo1-sec-hogar" className="anexo1-section-anchor">
          <Anexo1Hogar hogar={hogar} handleChange={handleChange} />
        </div>

        {/* Entorno Educativo */}
        <div id="anexo1-sec-educativo" className="anexo1-section-anchor">
          <Anexo1Educativo 
            trayectoria={trayectoria} 
            institucion={institucion} 
            firmas={firmas} 
            handleChange={handleChange} 
            handleFirmaChange={handleFirmaChange} 
          />
        </div>
      </div>

      {/* Botones de Navegación del Wizard */}
      <div className="wizard-nav-container no-print">
        <button type="button" className="btn-wizard-prev" onClick={() => switchTab('tab-dashboard')}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
          <span>Volver a Estudiantes</span>
        </button>

        <button type="button" className="btn-wizard-next" onClick={() => switchTab('tab-anexo2')}>
          <span>Siguiente Anexo 2</span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
        </button>
      </div>
    </>
  );
}
