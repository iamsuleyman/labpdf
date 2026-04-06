export function generatePDF(
  data: Record<string, unknown>,
  options?: Record<string, unknown>
): Promise<string>

export function createLabReportPdf(
  data: Record<string, unknown>,
  options?: Record<string, unknown>
): Promise<string>

export const DEFAULT_PATIENT: Record<string, string>
export const DEFAULT_DOCTOR: Record<string, string>
export const DEFAULT_SPECIMEN: Record<string, string>
