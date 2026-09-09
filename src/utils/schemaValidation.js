import { z } from 'zod';

export const piarSchema = z.object({
  estudianteNombre: z.string().min(3, "El nombre del estudiante debe tener al menos 3 caracteres."),
  estudianteEdad: z.string().optional(),
  grado: z.string().optional(),
}).passthrough(); // Permitir el resto de los campos libres

export const validatePiarData = (data) => {
  try {
    // Solo validamos las propiedades base si existen
    if (data.estudianteNombre !== undefined) {
      piarSchema.parse(data);
    }
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0].message };
    }
    return { success: false, message: "Error de validación desconocido." };
  }
};
