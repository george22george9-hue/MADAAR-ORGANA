// ====================================================================
// ORGANA — Friday Class Printable Attendance Sheet (كشف حضور ورقي للجمعة)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import { ServedMember } from '@/types/organa';

export function exportFridayAttendanceSheet(options: {
  familyName: string;
  stageName?: string;
  servantName?: string;
  dateStr?: string;
  members: ServedMember[];
}) {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const todayStr = options.dateStr || new Date().toISOString().split('T')[0];

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>كشف حضور يوم الجمعة — ${options.familyName} — ${options.stageName || ''}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&display=swap');
        @page {
          size: A4 portrait;
          margin: 12mm 10mm;
        }
        body {
          font-family: 'IBM Plex Sans Arabic', Tahoma, sans-serif;
          margin: 0;
          padding: 10px;
          color: #1F191B;
          direction: rtl;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #702C3B;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        .title-box {
          text-align: right;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          background: #FAF5F6;
          border: 1px solid #EAE3E4;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 15px;
          font-size: 12px;
        }
        .meta-item strong {
          color: #702C3B;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          text-align: right;
        }
        th {
          background-color: #702C3B !important;
          color: #FFFFFF !important;
          padding: 8px 6px;
          border: 1px solid #702C3B;
          font-weight: 700;
          text-align: center;
        }
        td {
          padding: 7px 6px;
          border: 1px solid #D5CBD0;
          vertical-align: middle;
        }
        .checkbox-cell {
          text-align: center;
          width: 50px;
        }
        .box {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 1.5px solid #702C3B;
          border-radius: 3px;
          background: #FFF;
        }
        .signatures {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          padding: 0 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .signatures div {
          text-align: center;
          min-width: 180px;
          border-top: 1px dashed #702C3B;
          padding-top: 8px;
        }
        .footer-note {
          margin-top: 20px;
          text-align: center;
          font-size: 10px;
          color: #81777A;
        }
        .print-btn {
          position: fixed;
          bottom: 20px;
          left: 20px;
          background: #702C3B;
          color: #FFF;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          font-family: inherit;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        @media print {
          .print-btn { display: none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">طباعة الكشف 🖨️</button>

      <div class="header">
        <div class="title-box">
          <div style="font-size: 12px; color: #702C3B; font-weight: 700;">مطرانية شبرا الخيمة وتوابعها</div>
          <h2 style="margin: 2px 0; color: #421923; font-size: 17px;">كنيسة الشهيد العظيم مارجرجس بسندبيس</h2>
          <div style="font-size: 12px; color: #5A232F; font-weight: 600;">خدمة مدارس الأحد — كشف الحضور والمتابعة الأسبوعي</div>
        </div>
        <div style="text-align: left; font-size: 11px; color: #81777A;">
          <div>منظومة أورجانا (ORGANA)</div>
          <div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">الأسرة: <strong>${options.familyName}</strong></div>
        <div class="meta-item">المرحلة: <strong>${options.stageName || 'كافة المراحل'}</strong></div>
        <div class="meta-item">تاريخ الجمعة: <strong>${todayStr}</strong></div>
        <div class="meta-item">العدد المسجل: <strong>${options.members.length} مخدوم</strong></div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 25px;">م</th>
            <th style="width: 55px;">الكود</th>
            <th style="text-align: right; padding-right: 10px;">اسم المخدوم</th>
            <th style="width: 85px;">المرحلة</th>
            <th style="width: 95px;">الهاتف</th>
            <th style="width: 75px;">البلد</th>
            <th class="checkbox-cell">القداس</th>
            <th class="checkbox-cell">الفصل</th>
            <th class="checkbox-cell">الكشكول</th>
            <th style="width: 140px;">ملاحظات الافتقاد</th>
          </tr>
        </thead>
        <tbody>
          ${options.members.map((m, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FAF8F9'};">
              <td style="text-align: center; font-weight: bold; color: #702C3B;">${idx + 1}</td>
              <td style="text-align: center; font-weight: bold;">${m.code}</td>
              <td style="font-weight: 600; padding-right: 10px;">${m.full_name}</td>
              <td style="text-align: center;">${m.stage || '—'}</td>
              <td style="text-align: center; font-family: monospace;">${m.phone || m.guardian_phone || '—'}</td>
              <td style="text-align: center;">${m.address || '—'}</td>
              <td class="checkbox-cell"><span class="box"></span></td>
              <td class="checkbox-cell"><span class="box"></span></td>
              <td class="checkbox-cell"><span class="box"></span></td>
              <td></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="signatures">
        <div>توقيع خادم المرحلة</div>
        <div>توقيع أمين الأسرة</div>
        <div>بركة قدس أبونا المشرف</div>
      </div>

      <div class="footer-note">
        «اِرْعَ غَنَمِي... اِرْعَ خِرَافِي» (يو 21) — كنيسة الشهيد العظيم مارجرجس بسندبيس
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            // Optional: window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
