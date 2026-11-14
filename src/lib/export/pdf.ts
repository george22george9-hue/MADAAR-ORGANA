// ====================================================================
// ORGANA — Arabic Printable PDF Exporter
// Developed by MADAAR Technologies
// ====================================================================

export function exportToPrintablePDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  summaryInfo?: { label: string; value: string | number }[]
) {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const summaryHtml = summaryInfo && summaryInfo.length > 0 ? `
    <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
      ${summaryInfo.map(s => `
        <div style="background: #FAF5F6; border: 1px solid #EAE3E4; border-radius: 8px; padding: 10px 16px; flex: 1; min-width: 140px;">
          <div style="font-size: 11px; color: #81777A; margin-bottom: 4px;">${s.label}</div>
          <div style="font-size: 16px; font-weight: bold; color: #421923;">${s.value}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: right; margin-top: 15px;">
      <thead>
        <tr style="background-color: #702C3B; color: #ffffff;">
          <th style="padding: 10px 12px; border: 1px solid #702C3B; width: 40px; text-align: center;">م</th>
          ${headers.map(h => `<th style="padding: 10px 12px; border: 1px solid #702C3B;">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FDFBFC'};">
            <td style="padding: 8px 12px; border: 1px solid #EAE3E4; text-align: center; color: #81777A;">${idx + 1}</td>
            ${row.map(cell => `<td style="padding: 8px 12px; border: 1px solid #EAE3E4; color: #282326;">${cell ?? '—'}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title} — أورجانا</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
        body {
          font-family: 'IBM Plex Sans Arabic', Tahoma, sans-serif;
          margin: 0;
          padding: 30px;
          color: #282326;
          direction: rtl;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #702C3B;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .church-info {
          text-align: right;
        }
        .brand-info {
          text-align: left;
          font-size: 11px;
          color: #81777A;
        }
        .footer {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #81777A;
          border-top: 1px solid #EAE3E4;
          padding-top: 10px;
        }
        @media print {
          body { padding: 15mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="church-info">
          <h2 style="margin: 0; color: #421923; font-size: 18px;">كنيسة الشهيد العظيم مارجرجس بسندبيس</h2>
          <div style="font-size: 13px; color: #702C3B; font-weight: 600; margin-top: 4px;">خدمة مدارس الأحد — منظومة أورجانا (ORGANA)</div>
        </div>
        <div class="brand-info">
          <div>MADAAR Technologies</div>
          <div>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h1 style="margin: 0 0 6px 0; color: #282326; font-size: 20px;">${title}</h1>
        <div style="color: #81777A; font-size: 13px;">${subtitle}</div>
      </div>

      ${summaryHtml}
      ${tableHtml}

      <div class="footer">
        <div>أورجANA — كل تفصيلة.. في مكانها | مدار للتقنية</div>
        <div>صفحة 1 من 1</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

