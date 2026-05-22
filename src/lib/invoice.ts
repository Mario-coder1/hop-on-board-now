import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// Wire built-in Roboto VFS (supports Slovak diacritics out of the box)
const vfs =
  (pdfFonts as unknown as { pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string> })
    .pdfMake?.vfs ??
  (pdfFonts as unknown as { vfs: Record<string, string> }).vfs;
(pdfMake as unknown as { vfs: Record<string, string> }).vfs = vfs;

const ISSUER = {
  name: 'Dominko s.r.o.',
  address: 'Brehy 82, 023 13 Čierne',
  ico: '45634521',
  dic: '2023074053',
  icDph: 'SK2023074053',
  email: 'support@takeme.sk',
};

const BRAND = '#0EA5E9';
const INK = '#0F172A';
const MUTED = '#64748B';
const LINE = '#E2E8F0';
const SUCCESS = '#059669';

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  paidAt: Date;
  amount: number;            // celková zaplatená suma (brutto)
  currency: string;
  passengerName: string;
  driverName: string;
  origin: string;
  destination: string;
  rideDate: Date;
  commissionRate?: number;   // default 0.10 (10 %)
}

export function buildInvoiceNumber(requestId: string, paidAt: Date): string {
  const yyyy = paidAt.getFullYear();
  const mm = String(paidAt.getMonth() + 1).padStart(2, '0');
  const suffix = requestId.replace(/-/g, '').slice(-6).toUpperCase();
  return `DOK-${yyyy}${mm}-${suffix}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMoney(n: number, currency: string): string {
  const c = (currency || 'eur').toUpperCase();
  const symbol = c === 'EUR' ? '€' : c;
  return `${n.toFixed(2)} ${symbol}`;
}

const VAT_RATE = 0.23;
const r2 = (n: number) => Math.round(n * 100) / 100;

function buildDocDefinition(data: InvoiceData): TDocumentDefinitions {
  const total = r2(data.amount);
  const commissionRate = data.commissionRate ?? 0.10;
  const commissionGross = r2(total * commissionRate);
  const driverShare = r2(total - commissionGross);
  // Provízia je s DPH (B2C). Rozklad pre účely DPH evidencie:
  const commissionBase = r2(commissionGross / (1 + VAT_RATE));
  const commissionVat = r2(commissionGross - commissionBase);

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: INK, lineHeight: 1.35 },
    styles: {
      h1: { fontSize: 24, bold: true, color: INK, characterSpacing: 1 },
      label: { fontSize: 8, color: MUTED, characterSpacing: 1, bold: true },
      value: { fontSize: 10, color: INK },
      sectionTitle: { fontSize: 9, color: MUTED, bold: true, characterSpacing: 1 },
      partyName: { fontSize: 12, bold: true, color: INK, margin: [0, 2, 0, 4] },
      tableHead: { fontSize: 9, color: MUTED, bold: true, characterSpacing: 1 },
      totalValue: { fontSize: 22, bold: true, color: INK },
      footer: { fontSize: 8, color: MUTED },
    },
    content: [
      // ── Header ───────────────────────────────────────────────────
      {
        columns: [
          {
            stack: [
              { text: 'TakeMe', fontSize: 18, bold: true, color: BRAND, characterSpacing: 1 },
              { text: 'Zdieľané jazdy', style: 'label', margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: 'POTVRDENIE O PLATBE', style: 'h1', alignment: 'right' },
              { text: `č. ${data.invoiceNumber}`, color: MUTED, alignment: 'right', margin: [0, 2, 0, 0] },
            ],
          },
        ],
      },

      // accent bar
      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 3, color: BRAND, r: 1.5 }],
        margin: [0, 14, 0, 18],
      },

      // ── Meta row ─────────────────────────────────────────────────
      {
        columns: [
          { stack: [{ text: 'DÁTUM VYSTAVENIA', style: 'label' }, { text: fmtDate(data.issueDate), style: 'value', margin: [0, 2, 0, 0] }] },
          { stack: [{ text: 'DÁTUM ÚHRADY', style: 'label' }, { text: fmtDate(data.paidAt), style: 'value', margin: [0, 2, 0, 0] }] },
          { stack: [{ text: 'SPÔSOB ÚHRADY', style: 'label' }, { text: 'Online kartou', style: 'value', margin: [0, 2, 0, 0] }] },
          { stack: [{ text: 'STAV', style: 'label' }, { text: 'Uhradené', style: 'value', color: SUCCESS, bold: true, margin: [0, 2, 0, 0] }] },
        ],
        columnGap: 16,
        margin: [0, 0, 0, 22],
      },

      // ── Parties ──────────────────────────────────────────────────
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'SPROSTREDKOVATEĽ', style: 'sectionTitle', margin: [0, 0, 0, 6] },
              { text: ISSUER.name, style: 'partyName' },
              { text: ISSUER.address, color: MUTED },
              { text: `IČO: ${ISSUER.ico}`, margin: [0, 6, 0, 0] },
              { text: `DIČ: ${ISSUER.dic}` },
              { text: `IČ DPH: ${ISSUER.icDph}` },
              { text: ISSUER.email, color: MUTED, margin: [0, 6, 0, 0] },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'PLATITEĽ', style: 'sectionTitle', margin: [0, 0, 0, 6] },
              { text: data.passengerName || 'Pasažier', style: 'partyName' },
              { text: 'Súkromná osoba', color: MUTED },
            ],
          },
        ],
        columnGap: 28,
        margin: [0, 0, 0, 28],
      },

      // ── Service table ───────────────────────────────────────────
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'POPIS', style: 'tableHead', border: [false, false, false, true], borderColor: [LINE, LINE, LINE, LINE], margin: [0, 0, 0, 8] },
              { text: 'SUMA', style: 'tableHead', alignment: 'right', border: [false, false, false, true], borderColor: [LINE, LINE, LINE, LINE], margin: [0, 0, 0, 8] },
            ],
            // Riadok 1 — preprava (vodič)
            [
              {
                border: [false, false, false, true],
                borderColor: [LINE, LINE, LINE, LINE],
                margin: [0, 10, 0, 10],
                stack: [
                  { text: `Zdieľaná jazda — ${fmtDate(data.rideDate)}`, bold: true, fontSize: 11 },
                  { text: `${data.origin}  →  ${data.destination}`, color: MUTED, margin: [0, 3, 0, 0] },
                  { text: `Poskytovateľ prepravy: ${data.driverName} (nie je platca DPH)`, color: MUTED, margin: [0, 2, 0, 0] },
                ],
              },
              { text: fmtMoney(driverShare, data.currency), alignment: 'right', border: [false, false, false, true], borderColor: [LINE, LINE, LINE, LINE], margin: [0, 10, 0, 10] },
            ],
            // Riadok 2 — provízia platformy
            [
              {
                border: [false, false, false, true],
                borderColor: [LINE, LINE, LINE, LINE],
                margin: [0, 10, 0, 10],
                stack: [
                  { text: 'Sprostredkovateľský poplatok TakeMe', bold: true, fontSize: 11 },
                  { text: `Základ ${fmtMoney(commissionBase, data.currency)} + DPH 23 % ${fmtMoney(commissionVat, data.currency)}`, color: MUTED, margin: [0, 3, 0, 0] },
                ],
              },
              { text: fmtMoney(commissionGross, data.currency), alignment: 'right', border: [false, false, false, true], borderColor: [LINE, LINE, LINE, LINE], margin: [0, 10, 0, 10] },
            ],
          ],
        },
        layout: {
          defaultBorder: false,
          hLineColor: () => LINE,
          hLineWidth: () => 0.7,
        },
        margin: [0, 0, 0, 18],
      },

      // ── Total card ───────────────────────────────────────────────
      {
        table: {
          widths: ['*'],
          body: [[{
            fillColor: '#F8FAFC',
            border: [false, false, false, false],
            margin: [16, 14, 16, 14],
            columns: [
              { stack: [
                { text: 'CELKOM UHRADENÉ', style: 'label' },
                { text: 'Online kartou cez Stripe', color: MUTED, fontSize: 9, margin: [0, 2, 0, 0] },
              ]},
              { width: 'auto', stack: [{ text: fmtMoney(total, data.currency), style: 'totalValue', alignment: 'right' }] },
            ],
          }]],
        },
        layout: 'noBorders',
      },

      // ── Legal footer note ───────────────────────────────────────
      {
        stack: [
          {
            text: 'Informácia o doklade',
            bold: true,
            fontSize: 9,
            color: MUTED,
            characterSpacing: 1,
            margin: [0, 22, 0, 6],
          },
          {
            text:
              'Tento doklad slúži ako potvrdenie o úhrade za zdieľanú jazdu. ' +
              `${ISSUER.name} vystupuje ako sprostredkovateľ medzi cestujúcim a vodičom. ` +
              'Predmetom plnenia spoločnosti je výlučne sprostredkovateľský poplatok, ' +
              `ktorý obsahuje DPH 23 % v zmysle zákona č. 222/2004 Z. z. o DPH (IČ DPH: ${ISSUER.icDph}). ` +
              'Samotná preprava je službou vodiča, ktorý nie je platcom DPH. ' +
              'Pre fyzické osoby nie je zo zákona povinné vystavenie faktúry — tento doklad postačuje pre evidenciu a prípadnú reklamáciu.',
            style: 'footer',
          },
        ],
      },
    ],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Vystavené elektronicky cez TakeMe · ${ISSUER.email}`, style: 'footer', margin: [40, 0, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] },
      ],
      margin: [0, 20, 0, 0],
    }),
  };
}

export function downloadInvoice(data: InvoiceData) {
  const doc = pdfMake.createPdf(buildDocDefinition(data));
  doc.download(`potvrdenie-${data.invoiceNumber}.pdf`);
}
