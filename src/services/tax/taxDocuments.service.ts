import { supabase } from "@/integrations/supabase/client";
import { TaxServiceError, type TaxDocument, type TaxDocumentType } from "@/types/tax.types";

const BUCKET = "tax-documents";

export async function listTaxDocuments(returnId: string): Promise<TaxDocument[]> {
  const { data, error } = await supabase
    .from("tax_documents")
    .select("*")
    .eq("return_id", returnId)
    .order("created_at", { ascending: false });

  if (error) throw new TaxServiceError("FETCH_TAX_DOCUMENTS_FAILED", error.message);
  return (data ?? []) as TaxDocument[];
}

/**
 * Uploads a file to the private tax-documents bucket and records it.
 * Storage path is {companyId}/{returnId}/{timestamp}-{filename} — this
 * exact shape is required by the bucket's RLS policies, which key off the
 * first path segment as the company_id.
 */
export async function uploadTaxDocument(params: {
  companyId: string;
  returnId: string;
  docType: TaxDocumentType;
  file: File;
}): Promise<TaxDocument> {
  const { companyId, returnId, docType, file } = params;
  const path = `${companyId}/${returnId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
  if (uploadError) throw new TaxServiceError("UPLOAD_TAX_DOCUMENT_FAILED", uploadError.message);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("tax_documents")
    .insert({
      return_id: returnId,
      company_id: companyId,
      doc_type: docType,
      file_path: path,
      file_name: file.name,
      uploaded_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) throw new TaxServiceError("SAVE_TAX_DOCUMENT_FAILED", error.message);
  return data as TaxDocument;
}

/** Returns a short-lived signed URL, since the bucket is private. */
export async function getTaxDocumentSignedUrl(
  filePath: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);
  if (error) throw new TaxServiceError("SIGN_TAX_DOCUMENT_URL_FAILED", error.message);
  return data.signedUrl;
}

export async function deleteTaxDocument(id: string, filePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (storageError)
    throw new TaxServiceError("DELETE_TAX_DOCUMENT_FILE_FAILED", storageError.message);

  const { error } = await supabase.from("tax_documents").delete().eq("id", id);
  if (error) throw new TaxServiceError("DELETE_TAX_DOCUMENT_FAILED", error.message);
}
