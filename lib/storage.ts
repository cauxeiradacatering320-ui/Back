import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const bucketName = process.env.SUPABASE_BUCKET_MODULO || 'imageModulo';

let supabase: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!supabase) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

export async function uploadImage(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const client = getClient();
  const uniqueName = `${Date.now()}-${fileName}`;

  const { error } = await client.storage.from(bucketName).upload(uniqueName, buffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Erro ao fazer upload: ${error.message}`);
  }

  const { data: urlData } = client.storage.from(bucketName).getPublicUrl(uniqueName);

  return urlData.publicUrl;
}
