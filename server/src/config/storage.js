const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = process.env.SUPABASE_BUCKET_NAME || 'karpom-kasadara';

/**
 * Upload a file buffer to Supabase Storage
 */
async function uploadFile(path, buffer, mimeType) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return data.path;
}

/**
 * Generate a short-lived signed URL for viewing (5 minutes)
 */
async function getSignedViewUrl(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 300); // 5 minutes
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/**
 * Generate a signed URL for admin download (30 minutes)
 */
async function getSignedDownloadUrl(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 1800, { download: true }); // 30 minutes
  if (error) throw new Error(`Download URL failed: ${error.message}`);
  return data.signedUrl;
}

/**
 * Delete a file from storage
 */
async function deleteFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

module.exports = { uploadFile, getSignedViewUrl, getSignedDownloadUrl, deleteFile };
