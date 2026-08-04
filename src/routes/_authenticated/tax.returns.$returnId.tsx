import { createFileRoute, Link } from "@tanstack/react-router";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useTaxReturnDetail } from "@/hooks/useTaxReturns";
import { usePermissions } from "@/hooks/usePermissions";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { FilingWizard } from "@/components/tax/FilingWizard";
import { TaxDocumentUpload } from "@/components/tax/TaxDocumentUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listTaxDocuments,
  uploadTaxDocument,
  getTaxDocumentSignedUrl,
  deleteTaxDocument,
} from "@/services/tax/taxDocuments.service";

export const Route = createFileRoute("/_authenticated/tax/returns/$returnId")({
  head: () => ({ meta: [{ title: "Tax Return — Finflow Track" }] }),
  component: TaxReturnDetailPage,
});

function TaxReturnDetailPage() {
  const { returnId } = Route.useParams();
  const activeCompanyId = useActiveCompanyId();
  const companyId = activeCompanyId ?? "";
  const currency = useDefaultCurrency();
  const { can } = usePermissions(companyId);
  const queryClient = useQueryClient();

  const { taxReturn, lines, isLoading, submitReturn } = useTaxReturnDetail(returnId);

  const docsQuery = useQuery({
    queryKey: ["tax-documents", returnId],
    queryFn: () => listTaxDocuments(returnId),
    enabled: Boolean(returnId),
  });

  if (isLoading || !taxReturn) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/tax/returns">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to filing history
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold capitalize">{taxReturn.tax_type} return</h1>
        {taxReturn.tax_period && (
          <p className="text-sm text-muted-foreground">
            {new Date(taxReturn.tax_period.period_start).toLocaleDateString()} –{" "}
            {new Date(taxReturn.tax_period.period_end).toLocaleDateString()} · Due{" "}
            {new Date(taxReturn.tax_period.due_date).toLocaleDateString()}
          </p>
        )}
      </div>

      <FilingWizard
        taxReturn={taxReturn}
        lines={lines}
        currency={currency}
        canFile={can("tax.file")}
        onSubmit={submitReturn}
      />

      <TaxDocumentUpload
        documents={docsQuery.data ?? []}
        isLoading={docsQuery.isLoading}
        canManage={can("tax.file")}
        onUpload={async (file, docType) => {
          await uploadTaxDocument({ companyId, returnId, docType, file });
          queryClient.invalidateQueries({ queryKey: ["tax-documents", returnId] });
        }}
        onGetUrl={(filePath) => getTaxDocumentSignedUrl(filePath)}
        onDelete={async (id, filePath) => {
          await deleteTaxDocument(id, filePath);
          queryClient.invalidateQueries({ queryKey: ["tax-documents", returnId] });
        }}
      />
    </div>
  );
}
