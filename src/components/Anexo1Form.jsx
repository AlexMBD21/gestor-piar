import { usePiar } from '../context/PiarContext';
import { PLantillasPIAR } from '../lib/piarTemplates';
import Anexo1DatosPersonales from './anexos/Anexo1DatosPersonales';
import Anexo1Salud from './anexos/Anexo1Salud';
import Anexo1Hogar from './anexos/Anexo1Hogar';
import Anexo1Educativo from './anexos/Anexo1Educativo';

export default function Anexo1Form({ showToast, switchTab }) {
  const { getActiveStudent, updateLocalPiarData, saveActivePiar, unsavedChanges } = usePiar();
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

      <div style={isBlankTemplate ? { pointerEvents: 'none', opacity: 0.85 } : {}}>
        {/* Diligenciamiento y Datos Personales */}
        <Anexo1DatosPersonales general={general} estudiante={estudiante} handleChange={handleChange} isBlankTemplate={isBlankTemplate} />

        {/* Entorno Salud */}
        <Anexo1Salud salud={salud} handleChange={handleChange} handleTerapiaChange={handleTerapiaChange} />

        {/* Entorno Hogar */}
        <Anexo1Hogar hogar={hogar} handleChange={handleChange} />

        {/* Entorno Educativo */}
        <Anexo1Educativo 
          trayectoria={trayectoria} 
          institucion={institucion} 
          firmas={firmas} 
          handleChange={handleChange} 
          handleFirmaChange={handleFirmaChange} 
        />
      </div>

      {/* Botones de Navegación del Wizard */}
      <div className="no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '32px', 
        paddingTop: '16px', 
        borderTop: '1px solid var(--border-color)',
        gap: '12px'
      }}>
        <div style={{ flex: 1 }}>
            {unsavedChanges && !isBlankTemplate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s ease-in-out' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--warning)', animation: 'pulse 1.5s infinite ease-in-out' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--warning)' }}>Tienes aportaciones sin guardar</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {!isBlankTemplate && (
              <button type="button" className="btn btn-primary" onClick={async () => {
                const success = await saveActivePiar();
                if (success) showToast('Aportación guardada correctamente');
                else showToast('Error al guardar', 'danger');
              }}>
                Guardar Aportación
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => switchTab('tab-anexo2')}>
              Siguiente Anexo 2 &rarr;
            </button>
          </div>
        </div>
    </>
  );
}
