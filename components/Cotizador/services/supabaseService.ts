import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DefaultConfigProfile } from '../types';

// --- Types ---
export interface LibraryItem {
  category: 'clients' | 'projects' | 'conditions' | 'prefixes' | 'activities' | 'serviceCategories' | 'client_metadata' | 'activity_metadata' | 'default_configs' | 'active_default_config_id';
  value: string;
}

let supabase: SupabaseClient | null = null;

export const initSupabase = (url: string, key: string) => {
  if (!url || !key) {
    supabase = null;
    return false;
  }
  try {
    supabase = createClient(url, key);
    return true;
  } catch (error) {
    console.error("Error initializing Supabase", error);
    return false;
  }
};

export const fetchLibraryFromCloud = async (): Promise<LibraryItem[] | null> => {
  if (!supabase) return null;

  try {
    console.log("Iniciando sincronización con Supabase...");

    // 1. Obtener datos de la tabla original 'library' (Datos manuales)
    const libraryPromise = supabase
      .from('library')
      .select('category, value');

    // 2. Obtener datos de la tabla 'Arquitecturas' (Servicios)
    const arquitecturasPromise = supabase
      .from('Arquitecturas')
      .select('*');

    // 3. Obtener datos de la tabla 'Contactos' (Clientes y Títulos)
    const contactosPromise = supabase
      .from('Contactos')
      .select('*');

    // 4. Obtener datos de la tabla 'Trabajos' (Palabras Clave / Proyectos)
    const trabajosPromise = supabase
      .from('Trabajos')
      .select('*');

    const [libraryResponse, arquitecturasResponse, contactosResponse, trabajosResponse] = await Promise.all([
      libraryPromise,
      arquitecturasPromise,
      contactosPromise,
      trabajosPromise
    ]);

    const combinedItems: LibraryItem[] = [];

    // --- Procesar tabla library (la original/manual) ---
    if (libraryResponse.data) {
      // Filtramos para evitar duplicados Y EXCLUIMOS CLIENTES de aquí para usar solo la tabla Contactos
      const filteredManualData = (libraryResponse.data as LibraryItem[]).filter(item => 
        item.category !== 'activities' && 
        item.category !== 'serviceCategories' &&
        item.category !== 'clients'
      );
      combinedItems.push(...filteredManualData);
    }

    // --- Procesar tabla Arquitecturas (Servicios) ---
    if (arquitecturasResponse.data) {
      arquitecturasResponse.data.forEach((row: any) => {
        const termino = row['terminos arquitectura'];
        const cat = row['categoria'];

        if (termino && typeof termino === 'string') {
          combinedItems.push({ category: 'activities', value: termino });

          // NEW: Store metadata connecting term to category
          if (cat && typeof cat === 'string') {
             combinedItems.push({
                 category: 'activity_metadata',
                 value: JSON.stringify({ name: termino, category: cat })
             });
          }
        }
        
        if (cat && typeof cat === 'string') {
            combinedItems.push({ category: 'serviceCategories', value: cat });
        }
      });
    }

    // --- Procesar tabla Contactos (Clientes y Títulos) ---
    if (contactosResponse.data) {
        console.log(`Se encontraron ${contactosResponse.data.length} contactos.`);
        
        contactosResponse.data.forEach((row: any) => {
            // Intentamos obtener el nombre de columnas comunes
            // Asumimos que puede llamarse "Nombre", "Cliente" o "nombre"
            const nombre = row['cliente'] || row['Cliente'] || row['Nombre'] || row['nombre'];
            // Aceptamos 'lic' como titulo también y le damos prioridad
            const titulo = row['lic'] || row['Lic'] || row['Titulo'] || row['titulo'];

            if (nombre && typeof nombre === 'string' && nombre.trim() !== '') {
                // 1. Agregar a la lista de Clientes
                combinedItems.push({
                    category: 'clients',
                    value: nombre.trim()
                });

                // 2. Metadata del título
                // Si el título existe, lo usamos. Si no (o es NULL), usamos cadena vacía.
                let titleToStore = '';
                if (titulo && typeof titulo === 'string' && titulo.toUpperCase() !== 'NULL' && titulo.trim() !== '') {
                    titleToStore = titulo.trim();
                }
                
                // Siempre enviamos metadata para clientes de la DB, para que el frontend sepa
                // si debe poner un título o borrarlo (si es vacío).
                combinedItems.push({
                    category: 'client_metadata',
                    value: JSON.stringify({ name: nombre.trim(), title: titleToStore })
                });
            }
        });
    }

    // --- Procesar tabla Trabajos (Palabras Clave / Proyectos) ---
    if (trabajosResponse.data) {
        console.log(`Se encontraron ${trabajosResponse.data.length} trabajos.`);
        
        trabajosResponse.data.forEach((row: any) => {
            const trabajo = row['Trabajos'] || row['trabajos'] || row['Nombre'];
            
            if (trabajo && typeof trabajo === 'string' && trabajo.trim() !== '') {
                combinedItems.push({
                    category: 'projects',
                    value: trabajo.trim()
                });
            }
        });
    }

    return combinedItems;

  } catch (err) {
    console.error("Error fetching library from cloud:", err);
    return null;
  }
};

export const addToCloud = async (category: string, value: string) => {
  if (!supabase) return;

  try {
    // LÓGICA ESPECIAL PARA SERVICIOS -> Tabla 'Arquitecturas'
    if (category === 'activities') {
        const { data } = await supabase
            .from('Arquitecturas')
            .select('*')
            .eq('terminos arquitectura', value)
            .maybeSingle();

        if (!data) {
            await supabase.from('Arquitecturas').insert([{
                "terminos arquitectura": value,
                "categoria": "Manual App" 
            }]);
        }
    } 
    // LÓGICA ESPECIAL PARA CLIENTES -> Tabla 'Contactos'
    else if (category === 'clients') {
        const { data } = await supabase
            .from('Contactos')
            .select('*')
            .eq('cliente', value) // Usamos columna 'cliente'
            .maybeSingle();

        if (!data) {
            await supabase.from('Contactos').insert([{
                "cliente": value
            }]);
        }
    }
    // RESTO -> Tabla 'library'
    else if (category !== 'serviceCategories' && category !== 'client_metadata') {
        const { data } = await supabase
            .from('library')
            .select('id')
            .eq('category', category)
            .eq('value', value)
            .maybeSingle();

        if (!data) {
            await supabase.from('library').insert([{ category, value }]);
        }
    }

  } catch (err) {
    console.error("Error adding to cloud:", err);
  }
};

export const listStorageFiles = async (bucket: string, path: string = '') => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage.from(bucket).list(path);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error listing storage files:", err);
    return null;
  }
};

export const getPublicUrl = (bucket: string, path: string) => {
  if (!supabase) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const deleteFromCloud = async (category: string, value: string) => {
  if (!supabase) return;
  try {
    if (category === 'activities') {
        await supabase
            .from('Arquitecturas')
            .delete()
            .eq('terminos arquitectura', value);
    }
    else if (category === 'clients') {
        await supabase
            .from('Contactos')
            .delete()
            .eq('cliente', value);
    }
    // Solo borramos de 'library' el resto
    else if (category !== 'serviceCategories' && category !== 'client_metadata') {
        await supabase
        .from('library')
        .delete()
        .eq('category', category)
        .eq('value', value);
    }
      
  } catch (err) {
    console.error("Error deleting from cloud:", err);
  }
};

export const uploadDefaultConfigsToCloud = async (configs: DefaultConfigProfile[], activeId?: string) => {
  if (!supabase) return false;
  try {
    // 1. Delete previous default_configs entries to keep clean state
    await supabase.from('library').delete().eq('category', 'default_configs');
    
    // 2. Insert each profile
    for (const config of configs) {
      await supabase.from('library').insert([{
        category: 'default_configs',
        value: JSON.stringify(config)
      }]);
    }

    // 3. Update active default ID if provided
    if (activeId) {
      await supabase.from('library').delete().eq('category', 'active_default_config_id');
      await supabase.from('library').insert([{
        category: 'active_default_config_id',
        value: activeId
      }]);
    }

    return true;
  } catch (err) {
    console.error("Error saving default configs to cloud:", err);
    return false;
  }
};

export interface SavedInvoiceItem {
  id: string;
  projectName: string;
  clientName: string;
  date: string;
  total: number;
  data: any;
  updatedAt: string;
}

export const saveInicioFacturaToCloud = async (quoteData: any): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const jsonStr = JSON.stringify(quoteData);

    // 1. Guardar en tabla library para persistencia instantánea
    await supabase.from('library').delete().eq('category', 'inicio_factura');
    const { error: dbError } = await supabase.from('library').insert([{
      category: 'inicio_factura',
      value: jsonStr
    }]);

    if (dbError) {
      console.warn("Error guardando inicio_factura en tabla library:", dbError);
    }

    // 2. Guardar también en Storage en carpeta específica 'inicio_factura'
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      await supabase.storage.from('Rembrandtcosas').upload('inicio_factura/inicio_factura.json', blob, {
        upsert: true,
        contentType: 'application/json'
      });
    } catch (storageErr) {
      console.warn("Storage upload inicio_factura opcional falló:", storageErr);
    }

    return true;
  } catch (err) {
    console.error("Error en saveInicioFacturaToCloud:", err);
    return false;
  }
};

export const fetchInicioFacturaFromCloud = async (): Promise<any | null> => {
  if (!supabase) return null;
  try {
    // 1. Intentar desde tabla library
    const { data, error } = await supabase
      .from('library')
      .select('value')
      .eq('category', 'inicio_factura')
      .maybeSingle();

    if (data && data.value) {
      try {
        return JSON.parse(data.value);
      } catch (pe) {
        console.warn("Error parseando inicio_factura desde tabla:", pe);
      }
    }

    // 2. Alternativa: Descargar de Storage si existe
    try {
      const { data: fileData, error: fileErr } = await supabase.storage
        .from('Rembrandtcosas')
        .download('inicio_factura/inicio_factura.json');

      if (!fileErr && fileData) {
        const text = await fileData.text();
        return JSON.parse(text);
      }
    } catch (e) {
      // Ignorar si no está en storage
    }

    return null;
  } catch (err) {
    console.error("Error en fetchInicioFacturaFromCloud:", err);
    return null;
  }
};

export const saveInvoiceToCloud = async (invoice: SavedInvoiceItem): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const jsonStr = JSON.stringify(invoice);

    // Guardar en tabla library
    // Si ya existe el ID, eliminar previo
    await supabase.from('library').delete().eq('category', 'facturas_guardadas').like('value', `%"id":"${invoice.id}"%`);
    const { error: dbErr } = await supabase.from('library').insert([{
      category: 'facturas_guardadas',
      value: jsonStr
    }]);

    if (dbErr) console.warn("Error al guardar factura en library:", dbErr);

    // Guardar en Storage en carpeta específica 'facturas'
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      await supabase.storage.from('Rembrandtcosas').upload(`facturas/${invoice.id}.json`, blob, {
        upsert: true,
        contentType: 'application/json'
      });
    } catch (stErr) {
      console.warn("Error opcional en Storage facturas:", stErr);
    }

    return true;
  } catch (err) {
    console.error("Error en saveInvoiceToCloud:", err);
    return false;
  }
};

export const fetchSavedInvoicesFromCloud = async (): Promise<SavedInvoiceItem[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('library')
      .select('value')
      .eq('category', 'facturas_guardadas');

    if (error || !data) return [];

    const invoices: SavedInvoiceItem[] = [];
    data.forEach(item => {
      try {
        const parsed = JSON.parse(item.value);
        if (parsed && parsed.id) {
          invoices.push(parsed);
        }
      } catch (e) {
        console.warn("Error parseando factura guardada:", e);
      }
    });

    // Ordenar de más reciente a más antigua
    invoices.sort((a, b) => new Date(b.updatedAt || b.date).getTime() - new Date(a.updatedAt || a.date).getTime());
    return invoices;
  } catch (err) {
    console.error("Error en fetchSavedInvoicesFromCloud:", err);
    return [];
  }
};

export const deleteInvoiceFromCloud = async (invoiceId: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    await supabase.from('library').delete().eq('category', 'facturas_guardadas').like('value', `%"id":"${invoiceId}"%`);
    try {
      await supabase.storage.from('Rembrandtcosas').remove([`facturas/${invoiceId}.json`]);
    } catch (e) {}
    return true;
  } catch (err) {
    console.error("Error en deleteInvoiceFromCloud:", err);
    return false;
  }
};

export const fetchDefaultConfigsFromCloud = async (): Promise<{ configs: DefaultConfigProfile[], activeId?: string } | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('library')
      .select('category, value')
      .in('category', ['default_configs', 'active_default_config_id']);

    if (error || !data) return null;

    const configs: DefaultConfigProfile[] = [];
    let activeId: string | undefined = undefined;

    data.forEach(item => {
      if (item.category === 'default_configs') {
        try {
          const parsed = JSON.parse(item.value);
          if (parsed && parsed.id && parsed.name) {
            configs.push(parsed);
          }
        } catch (e) {
          console.warn("Could not parse config profile from cloud:", e);
        }
      } else if (item.category === 'active_default_config_id') {
        activeId = item.value;
      }
    });

    return { configs, activeId };
  } catch (err) {
    console.error("Error fetching default configs from cloud:", err);
    return null;
  }
};
