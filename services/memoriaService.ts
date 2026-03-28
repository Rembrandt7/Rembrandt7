import { supabase } from './supabaseClient';

export const saveMemoriaIA = async (memoria: string, filename: string) => {
    const { error } = await supabase
        .storage
        .from('savejson')
        .upload(filename.replace('.json', '_memoria.json'), JSON.stringify({ memoria }, null, 2), {
            contentType: 'application/json',
            upsert: true
        });
    return error;
};

export const loadADN = async (filename: string) => {
    const { data, error } = await supabase
        .storage
        .from('savejson')
        .download(filename);
    
    if (error) return null;
    const text = await data.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        return text;
    }
};
