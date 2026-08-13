// Re-export zdieľaných pravidiel zrušenia/výplat, aby frontend a edge funkcie
// používali JEDEN zdroj pravdy (VOP čl. 2). Kanonický súbor:
// supabase/functions/_shared/refundRules.ts
export * from "../../supabase/functions/_shared/refundRules";
