import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DefaultConfigProfile } from '../types';
import { supabase as defaultClient } from '../../../services/supabaseClient';

// --- Types ---
export interface LibraryItem {
  category: 'clients' | 'projects' | 'conditions' | 'prefixes' | 'activities' | 'serviceCategories' | 'client_metadata' | 'activity_metadata' | 'default_configs' | 'active_default_config_id';
  value: string;
}

let supabase: SupabaseClient | null = defaultClient;

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
    const payload = JSON.stringify({ configs, activeId });
    await supabase.storage.from('savejson').upload('default_configs.json', payload, {
      upsert: true,
      contentType: 'application/json'
    });
    localStorage.setItem('rembrandt_default_configs_cache', payload);
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

    // 1. Respaldo de versión previa en savejson
    try {
      const { data: prevFileData } = await supabase.storage.from('savejson').download('inicio_factura.json');
      if (prevFileData) {
        const prevText = await prevFileData.text();
        if (prevText) {
          await supabase.storage.from('savejson').upload('inicio_factura_backup.json', prevText, {
            upsert: true,
            contentType: 'application/json'
          });
          localStorage.setItem('rembrandt_inicio_factura_backup', prevText);
        }
      }
    } catch (bErr) {
      console.warn("Respaldo automático previo omitido o primer inicio:", bErr);
    }

    // 2. Guardar inicio_factura en savejson
    await supabase.storage.from('savejson').upload('inicio_factura.json', jsonStr, {
      upsert: true,
      contentType: 'application/json'
    });
    localStorage.setItem('rembrandt_inicio_factura', jsonStr);

    return true;
  } catch (err) {
    console.error("Error en saveInicioFacturaToCloud:", err);
    return false;
  }
};

export const saveInicioFacturaBackupToCloud = async (quoteData: any): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const toSave = {
      ...quoteData,
      _isManualBackup: true,
      _backupSavedAt: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(toSave);

    await supabase.storage.from('savejson').upload('inicio_factura_backup.json', jsonStr, {
      upsert: true,
      contentType: 'application/json'
    });
    localStorage.setItem('rembrandt_inicio_factura_backup', jsonStr);

    return true;
  } catch (err) {
    console.error("Error en saveInicioFacturaBackupToCloud:", err);
    return false;
  }
};

export const fetchInicioFacturaBackupFromCloud = async (): Promise<any | null> => {
  if (!supabase) return null;
  try {
    const { data: fileData, error } = await supabase.storage
      .from('savejson')
      .download('inicio_factura_backup.json');

    if (!error && fileData) {
      const text = await fileData.text();
      return JSON.parse(text);
    }

    const local = localStorage.getItem('rembrandt_inicio_factura_backup');
    if (local) return JSON.parse(local);

    return null;
  } catch (err) {
    console.error("Error en fetchInicioFacturaBackupFromCloud:", err);
    try {
      const local = localStorage.getItem('rembrandt_inicio_factura_backup');
      if (local) return JSON.parse(local);
    } catch {}
    return null;
  }
};

export const getFolioCounterFromCloud = async (): Promise<number | null> => {
  if (!supabase) return null;
  try {
    const { data: fileData, error } = await supabase.storage
      .from('savejson')
      .download('quote_folio_counter.json');

    if (!error && fileData) {
      const text = await fileData.text();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.counter === 'number') {
        return parsed.counter;
      }
    }
  } catch (err) {
    // Silently continue to fallback
  }

  try {
    const saved = localStorage.getItem('rembrandt_quote_folio_counter');
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num)) return num;
    }
  } catch {}

  return null;
};

export const saveFolioCounterToCloud = async (counter: number): Promise<boolean> => {
  try {
    localStorage.setItem('rembrandt_quote_folio_counter', counter.toString());
    if (supabase) {
      const payload = JSON.stringify({ counter, updatedAt: new Date().toISOString() });
      await supabase.storage.from('savejson').upload('quote_folio_counter.json', payload, {
        upsert: true,
        contentType: 'application/json'
      });
    }
    return true;
  } catch (err) {
    return false;
  }
};

export const getHighestFolioFromCloud = async (): Promise<number> => {
  let highest = 1000;
  try {
    // 1. Contador guardado
    const cloudCounter = await getFolioCounterFromCloud();
    if (cloudCounter && cloudCounter >= highest) {
      highest = cloudCounter;
    }

    // 2. Revisar folios en facturas guardadas (tanto en cloud como local)
    const savedInvoices = await fetchSavedInvoicesFromCloud();
    savedInvoices.forEach(inv => {
      const folioVal = inv.data?.folio;
      if (folioVal) {
        const parsed = parseInt(folioVal, 10);
        if (!isNaN(parsed) && parsed >= highest) {
          highest = parsed + 1;
        }
      }
    });

    const localCounter = localStorage.getItem('rembrandt_quote_folio_counter');
    if (localCounter) {
      const p = parseInt(localCounter, 10);
      if (!isNaN(p) && p >= highest) {
        highest = p;
      }
    }
  } catch (err) {
    console.warn("Error en getHighestFolioFromCloud:", err);
  }
  return highest;
};

export const fetchInicioFacturaFromCloud = async (): Promise<any | null> => {
  if (!supabase) return null;
  try {
    const { data: fileData, error: fileErr } = await supabase.storage
      .from('savejson')
      .download('inicio_factura.json');

    if (!fileErr && fileData) {
      const text = await fileData.text();
      return JSON.parse(text);
    }

    const local = localStorage.getItem('rembrandt_inicio_factura');
    if (local) return JSON.parse(local);

    return null;
  } catch (err) {
    console.error("Error en fetchInicioFacturaFromCloud:", err);
    try {
      const local = localStorage.getItem('rembrandt_inicio_factura');
      if (local) return JSON.parse(local);
    } catch {}
    return null;
  }
};

export const saveInvoiceToCloud = async (invoice: SavedInvoiceItem): Promise<boolean> => {
  try {
    // Limpiar binarios pesados (base64 de PDFs) para que el JSON quede ultra ligero (< 5KB)
    const cleanInvoice: SavedInvoiceItem = {
      ...invoice,
      data: {
        ...invoice.data,
        taxSituationPdfB64: undefined // No persistir PDFs pesados dentro del JSON
      }
    };

    // 1. Cargar facturas actuales
    let currentInvoices: SavedInvoiceItem[] = [];
    try {
      if (supabase) {
        const { data: fileData, error } = await supabase.storage
          .from('savejson')
          .download('facturas_guardadas.json');
        if (!error && fileData) {
          const text = await fileData.text();
          currentInvoices = JSON.parse(text);
        }
      }
    } catch (e) {
      console.warn("No se pudo leer facturas_guardadas.json previo:", e);
    }

    if (!currentInvoices || !Array.isArray(currentInvoices) || currentInvoices.length === 0) {
      const local = localStorage.getItem('rembrandt_saved_invoices');
      if (local) {
        try { currentInvoices = JSON.parse(local); } catch {}
      }
    }

    if (!Array.isArray(currentInvoices)) {
      currentInvoices = [];
    }

    // 2. Reemplazar si ya existe o agregar al principio
    const existingIdx = currentInvoices.findIndex(i => i.id === cleanInvoice.id);
    if (existingIdx >= 0) {
      currentInvoices[existingIdx] = cleanInvoice;
    } else {
      currentInvoices.unshift(cleanInvoice);
    }

    // 3. Guardar en Storage savejson
    const payload = JSON.stringify(currentInvoices);
    if (supabase) {
      await supabase.storage.from('savejson').upload('facturas_guardadas.json', payload, {
        upsert: true,
        contentType: 'application/json'
      });
    }

    // 4. Guardar copia local en localStorage
    localStorage.setItem('rembrandt_saved_invoices', payload);

    return true;
  } catch (err) {
    console.error("Error en saveInvoiceToCloud:", err);
    return false;
  }
};

export const fetchSavedInvoicesFromCloud = async (): Promise<SavedInvoiceItem[]> => {
  let invoices: SavedInvoiceItem[] = [];
  try {
    if (supabase) {
      const { data: fileData, error } = await supabase.storage
        .from('savejson')
        .download('facturas_guardadas.json');

      if (!error && fileData) {
        const text = await fileData.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          invoices = parsed;
        }
      }
    }
  } catch (err) {
    console.warn("Fallo lectura desde savejson, recurriendo a localStorage:", err);
  }

  if (invoices.length === 0) {
    try {
      const local = localStorage.getItem('rembrandt_saved_invoices');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) invoices = parsed;
      }
    } catch {}
  }

  // Ordenar siempre por número de folio descendente (de mayor a menor, ej. 01005, 01004, 01000...)
  invoices.sort((a, b) => {
    const folioA = parseInt(a.data?.folio || '0', 10);
    const folioB = parseInt(b.data?.folio || '0', 10);
    if (!isNaN(folioA) && !isNaN(folioB) && folioA !== folioB) {
      return folioB - folioA;
    }
    return new Date(b.updatedAt || b.date).getTime() - new Date(a.updatedAt || a.date).getTime();
  });

  return invoices;
};

export const deleteInvoiceFromCloud = async (invoiceId: string): Promise<boolean> => {
  try {
    let currentInvoices = await fetchSavedInvoicesFromCloud();
    currentInvoices = currentInvoices.filter(i => i.id !== invoiceId);

    const payload = JSON.stringify(currentInvoices);
    if (supabase) {
      await supabase.storage.from('savejson').upload('facturas_guardadas.json', payload, {
        upsert: true,
        contentType: 'application/json'
      });
    }
    localStorage.setItem('rembrandt_saved_invoices', payload);
    return true;
  } catch (err) {
    console.error("Error en deleteInvoiceFromCloud:", err);
    return false;
  }
};

export const fetchDefaultConfigsFromCloud = async (): Promise<{ configs: DefaultConfigProfile[], activeId?: string } | null> => {
  if (!supabase) return null;
  try {
    const { data: fileData, error } = await supabase.storage
      .from('savejson')
      .download('default_configs.json');

    if (!error && fileData) {
      const text = await fileData.text();
      return JSON.parse(text);
    }

    const local = localStorage.getItem('rembrandt_default_configs_cache');
    if (local) return JSON.parse(local);

    return null;
  } catch (err) {
    console.error("Error fetching default configs from cloud:", err);
    try {
      const local = localStorage.getItem('rembrandt_default_configs_cache');
      if (local) return JSON.parse(local);
    } catch {}
    return null;
  }
};
