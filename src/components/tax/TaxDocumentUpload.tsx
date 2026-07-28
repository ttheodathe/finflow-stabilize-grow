import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileText, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TaxDocument, TaxDocumentType } from "@/types/tax.types";

export function TaxDocumentUpload({
  documents,
  isLoading,
  canManage,
  onUpload,
  onGetUrl,
  onDelete,
}: {
  documents: TaxDocument[];
  isLoading: boolean;
  canManage: boolean;
  onUpload: (file: File, docType: TaxDocumentType) => Promise<unknown>;
  onGetUrl: (filePath: string) => Promise<string>;
  onDelete: (id: string, filePath: string) => Promise<unknown>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file, "supporting");
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleView(doc: TaxDocument) {
    try {
      const url = await onGetUrl(doc.file_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open document");
    }
  }

  async function handleDelete(doc: TaxDocument) {
    if (!confirm(`Delete ${doc.file_name}?`)) return;
    try {
      await onDelete(doc.id, doc.file_path);
      toast.success("Document deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Filing documents</CardTitle>
        {canManage && (
          <>
            <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <Skeleton className="h-10 w-full" />}
        {!isLoading && documents.length === 0 && (
          <p className="text-sm text-muted-foreground">No documents attached yet.</p>
        )}
        {!isLoading &&
          documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-border p-2"
            >
              <button
                type="button"
                onClick={() => handleView(doc)}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                {doc.file_name}
              </button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleView(doc)}>
                  <Download className="h-4 w-4" />
                </Button>
                {canManage && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
