import crypto from 'crypto';
import https from 'https';

export const MAX_BODEGA_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB en bytes (10,737,418,240)
export const WARNING_BODEGA_BYTES = 8.5 * 1024 * 1024 * 1024; // 8.5 GB (85% para alerta temprana)

export interface BodegaFileItem {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  etag: string;
  category: '3d' | 'image' | 'doc' | 'archive' | 'other';
  downloadUrl: string;
  folder: string; // Carpeta relativa (ej. "Renders" o "Modelos 3D/Casa Club")
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export const getR2Config = (): R2Config => {
  return {
    accountId: process.env.R2_ACCOUNT_ID || '4680c6e63ea7d6d9e7cc03eff74b9c44',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '17b965fe37b8795d7ff855c35cfd1b57',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'a0fcf0f6cb8b9ef735d2df9f8596677746bc56cd7e37bfa4d043428edebb6fc9',
    bucket: process.env.R2_BUCKET || 'rembrandt-bodega'
  };
};

const getCategoryFromKey = (key: string): '3d' | 'image' | 'doc' | 'archive' | 'other' => {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  if (['stl', 'obj', '3mf', 'gcode', 'ply', 'step', 'stp'].includes(ext)) return '3d';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'hdr', 'exr', 'bmp'].includes(ext)) return 'image';
  if (['pdf', 'json', 'csv', 'txt', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) return 'doc';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'other';
};

// Generador de firmas AWS SigV4 sin dependencias externas
const hmac = (key: Buffer | string, data: string): Buffer => {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
};

const sha256 = (data: Buffer | string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

const getSignatureKey = (key: string, dateStamp: string, region: string, service: string): Buffer => {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
};

// Agente HTTPS resiliente para proxies corporativos
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const makeHttpsRequest = (
  options: https.RequestOptions,
  body?: Buffer
): Promise<{ status: number; text: string }> => {
  return new Promise((resolve, reject) => {
    const req = https.request({ ...options, agent: httpsAgent }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode || 200, text: data }));
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
};

// Generar URL pre-firmada para descarga o subida directa
export const getBodegaPreSignedUrl = (
  key: string,
  method: 'GET' | 'PUT' = 'GET',
  expiresInSeconds: number = 86400, // 24 horas por defecto
  customConfig?: Partial<R2Config>
): string => {
  const config = { ...getR2Config(), ...customConfig };
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalUri = `/${config.bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

  const queryParams = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${config.accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', expiresInSeconds.toString()],
    ['X-Amz-SignedHeaders', 'host']
  ];

  queryParams.sort((a, b) => a[0].localeCompare(b[0]));
  const canonicalQueryString = queryParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
};

// Listar archivos del bucket con detección de carpetas
export const listBodegaObjects = async (prefix?: string): Promise<{ 
  items: BodegaFileItem[]; 
  folders: string[]; 
  totalBytes: number;
  maxBytes: number;
  warningBytes: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
}> => {
  const config = getR2Config();
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = `/${config.bucket}`;
  const queryParams: [string, string][] = [['list-type', '2']];
  if (prefix) queryParams.push(['prefix', prefix]);
  queryParams.sort((a, b) => a[0].localeCompare(b[0]));

  const canonicalQueryString = queryParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const payloadHash = sha256('');
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = `GET\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await makeHttpsRequest({
    hostname: host,
    path: `${canonicalUri}?${canonicalQueryString}`,
    method: 'GET',
    headers: {
      'host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authHeader
    }
  });

  if (res.status >= 400) {
    throw new Error(`R2 list error (${res.status}): ${res.text}`);
  }

  const xml = res.text;
  const items: BodegaFileItem[] = [];
  const folderSet = new Set<string>();
  let totalBytes = 0;

  // Parser ligero de XML S3 sin dependencias
  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match;
  while ((match = contentRegex.exec(xml)) !== null) {
    const block = match[1];
    const keyMatch = /<Key>(.*?)<\/Key>/.exec(block);
    const sizeMatch = /<Size>(\d+)<\/Size>/.exec(block);
    const dateMatch = /<LastModified>(.*?)<\/LastModified>/.exec(block);
    const etagMatch = /<ETag>(.*?)<\/ETag>/.exec(block);

    if (keyMatch) {
      const key = keyMatch[1];
      const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
      const lastModified = dateMatch ? dateMatch[1] : new Date().toISOString();
      const etag = etagMatch ? etagMatch[1].replace(/&quot;|"/g, '') : '';
      
      const parts = key.split('/');
      const fileName = parts.pop() || key;
      const folderPath = parts.join('/');

      // Si la ruta contiene carpetas, guardarlas
      if (folderPath) {
        let acc = '';
        for (const p of parts) {
          acc = acc ? `${acc}/${p}` : p;
          folderSet.add(acc);
        }
      }

      // Si es un archivo de marcador de carpeta vacía (.keep), no listarlo como archivo visible
      if (fileName === '.keep' || fileName === '') {
        continue;
      }

      totalBytes += size;
      items.push({
        key,
        name: fileName,
        size,
        lastModified,
        etag,
        category: getCategoryFromKey(key),
        downloadUrl: getBodegaPreSignedUrl(key, 'GET', 86400),
        folder: folderPath
      });
    }
  }

  // Ordenar por fecha más reciente
  items.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  const folders = Array.from(folderSet).sort();

  return { 
    items, 
    folders, 
    totalBytes,
    maxBytes: MAX_BODEGA_BYTES,
    warningBytes: WARNING_BODEGA_BYTES,
    isNearLimit: totalBytes >= WARNING_BODEGA_BYTES,
    isOverLimit: totalBytes >= MAX_BODEGA_BYTES
  };
};

// Subir un archivo al bucket CON PROTECCIÓN ESTRICTA DE 10 GB
export const uploadBodegaObject = async (
  key: string,
  data: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<boolean> => {
  // BLOQUEO ESTRICTO: Verificar que no se sobrepase el límite de 10 GB bajo ninguna circunstancia
  if (data.length > 0) {
    const { totalBytes } = await listBodegaObjects();
    if (totalBytes + data.length > MAX_BODEGA_BYTES) {
      const remainingBytes = Math.max(0, MAX_BODEGA_BYTES - totalBytes);
      const remainingMB = (remainingBytes / (1024 * 1024)).toFixed(1);
      throw new Error(`⛔ LÍMITE DE SEGURIDAD ALCANZADO (10 GB): Este archivo supera el almacenamiento gratuito de 10 GB de Cloudflare R2. Solo quedan ${remainingMB} MB disponibles. La subida fue bloqueada para protegerte de cualquier cobro.`);
    }
  }

  const config = getR2Config();
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = `/${config.bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  const canonicalQueryString = '';
  const payloadHash = sha256(data);

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await makeHttpsRequest(
    {
      hostname: host,
      path: canonicalUri,
      method: 'PUT',
      headers: {
        'content-type': contentType,
        'content-length': data.length,
        'host': host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authHeader
      }
    },
    data
  );

  if (res.status >= 400) {
    throw new Error(`R2 upload error (${res.status}): ${res.text}`);
  }

  return true;
};

// Crear una carpeta en la Bodega
export const createBodegaFolder = async (folderPath: string): Promise<boolean> => {
  const cleanPath = folderPath.replace(/^\/+|\/+$/g, '').trim();
  if (!cleanPath) return false;
  return await uploadBodegaObject(`${cleanPath}/.keep`, Buffer.from(''), 'application/x-directory');
};

// Eliminar un archivo
export const deleteBodegaObject = async (key: string): Promise<boolean> => {
  const config = getR2Config();
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = `/${config.bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  const canonicalQueryString = '';
  const payloadHash = sha256('');

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = `DELETE\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await makeHttpsRequest({
    hostname: host,
    path: canonicalUri,
    method: 'DELETE',
    headers: {
      'host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authHeader
    }
  });

  return res.status === 204 || res.status === 200;
};

// Eliminar una carpeta y todos sus contenidos
export const deleteBodegaFolder = async (folderPath: string): Promise<boolean> => {
  const cleanPath = folderPath.replace(/^\/+|\/+$/g, '').trim();
  if (!cleanPath) return false;

  const prefix = `${cleanPath}/`;
  const { items } = await listBodegaObjects(prefix);
  
  for (const item of items) {
    await deleteBodegaObject(item.key);
  }
  await deleteBodegaObject(`${cleanPath}/.keep`);
  return true;
};
