import jsPDF from 'jspdf';

const ISSUER = {
  name: 'Dominko s.r.o.',
  address: 'Brehy 82, 023 13 Čierne',
  ico: '45634521',
  dic: '2023074053',
  icDph: 'SK2023074053',
  email: 'support@takeme.sk',
};

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  paidAt: Date;
  amount: number;
  currency: string;
  passengerName: string;
  driverName: string;
  origin: string;
  destination: string;
  rideDate: Date;
}

/**
 * Generate a unique invoice number from request id + paid date.
 * Format: TM-YYYYMM-XXXXXX (last 6 chars of uuid, uppercased).
 */
export function buildInvoiceNumber(requestId: string, paidAt: Date): string {
  const yyyy = paidAt.getFullYear();
  const mm = String(paidAt.getMonth() + 1).padStart(2, '0');
  const suffix = requestId.replace(/-/g, '').slice(-6).toUpperCase();
  return `TM-${yyyy}${mm}-${suffix}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMoney(n: number, currency: string): string {
  return `${n.toFixed(2)} ${currency.toUpperCase()}`;
}

export function generateInvoicePdf(data: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 18;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('FAKTÚRA', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Číslo: ${data.invoiceNumber}`, W - 14, y - 6, { align: 'right' });
  doc.text(`Dátum vystavenia: ${fmtDate(data.issueDate)}`, W - 14, y, { align: 'right' });
  doc.text(`Dátum dodania: ${fmtDate(data.paidAt)}`, W - 14, y + 5, { align: 'right' });
  doc.text(`Spôsob úhrady: Online (karta)`, W - 14, y + 10, { align: 'right' });

  y += 18;
  doc.setDrawColor(220);
  doc.line(14, y, W - 14, y);
  y += 8;

  // Issuer + Customer side by side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Dodávateľ', 14, y);
  doc.text('Odberateľ', 110, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const issuerLines = [
    ISSUER.name,
    ISSUER.address,
    `IČO: ${ISSUER.ico}`,
    `DIČ: ${ISSUER.dic}`,
    `IČ DPH: ${ISSUER.icDph}`,
    ISSUER.email,
  ];
  const customerLines = [
    data.passengerName || 'Pasažier',
    'Súkromná osoba',
  ];
  const startY = y;
  issuerLines.forEach((l, i) => doc.text(l, 14, startY + i * 5));
  customerLines.forEach((l, i) => doc.text(l, 110, startY + i * 5));
  y = startY + Math.max(issuerLines.length, customerLines.length) * 5 + 8;

  doc.setDrawColor(220);
  doc.line(14, y, W - 14, y);
  y += 8;

  // Service line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Popis služby', 14, y);
  doc.text('Suma', W - 14, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const serviceLines = [
    `Zdieľaná jazda ${fmtDate(data.rideDate)}`,
    `Trasa: ${data.origin} → ${data.destination}`,
    `Vodič: ${data.driverName}`,
  ];
  serviceLines.forEach((l, i) => {
    const split = doc.splitTextToSize(l, 130);
    doc.text(split, 14, y + i * 5);
  });
  doc.text(fmtMoney(data.amount, data.currency), W - 14, y, { align: 'right' });
  y += serviceLines.length * 5 + 6;

  doc.setDrawColor(220);
  doc.line(14, y, W - 14, y);
  y += 8;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Celkom k úhrade', 14, y);
  doc.text(fmtMoney(data.amount, data.currency), W - 14, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Suma bola uhradená kartou online. Doklad o zaplatení.', 14, y);
  y += 14;
  doc.setTextColor(0);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    'Dodávateľ nie je platiteľ DPH v zmysle §4 zákona o DPH.',
    14,
    285,
  );
  doc.text(`Vystavené elektronicky cez TakeMe — ${ISSUER.email}`, 14, 290);

  return doc;
}

export function downloadInvoice(data: InvoiceData) {
  const doc = generateInvoicePdf(data);
  doc.save(`faktura-${data.invoiceNumber}.pdf`);
}
