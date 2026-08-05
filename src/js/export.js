// Export to CSV & Print / PDF Financial Summary Report (KIP Currency)

export function exportToCSV(transactions) {
  if (!transactions || transactions.length === 0) {
    alert('ไม่มีข้อมูลรายการสำหรับส่งออก');
    return;
  }

  const headers = ['ลำดับ', 'วันที่', 'ประเภท', 'หมวดหมู่', 'จำนวนเงิน (KIP ₭)', 'ช่องทางชำระ', 'หมายเหตุ', 'แท็ก'];
  
  const typeMap = {
    income: 'รายรับ',
    expense: 'รายจ่าย',
    cost: 'ต้นทุน'
  };

  const methodMap = {
    transfer: 'โอนเงิน',
    cash: 'เงินสด',
    card: 'บัตรเครดิต'
  };

  const rows = transactions.map((t, idx) => [
    idx + 1,
    t.date,
    typeMap[t.type] || t.type,
    `"${(t.category || '').replace(/"/g, '""')}"`,
    t.amount,
    methodMap[t.paymentMethod] || t.paymentMethod,
    `"${(t.note || '').replace(/"/g, '""')}"`,
    `"${(t.tags || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `รายงานบัญชีธุรกิจ_KIP_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printFinancialReport(summary, transactions, inventory) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('กรุณาอนุญาตให้เปิด Pop-up เพื่อพิมพ์รายงาน');
    return;
  }

  const todayStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>รายงานสรุปงบการเงินธุรกิจขายชุดบอล - ${todayStr}</title>
      <style>
        body { font-family: 'Sarabun', 'Prompt', sans-serif; padding: 30px; color: #1e293b; background: #fff; }
        h1, h2, h3 { margin-bottom: 8px; }
        .header { border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 25px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
        .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
        .card .title { font-size: 13px; color: #64748b; margin-bottom: 5px; }
        .card .val { font-size: 20px; font-weight: bold; }
        .income { color: #059669; }
        .expense { color: #e11d48; }
        .cost { color: #d97706; }
        .balance { color: #0284c7; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        th { background: #f1f5f9; font-weight: bold; }
        .text-right { text-align: right; }
        .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📑 รายงานสรุปงบการเงินและสต็อกสินค้าธุรกิจชุดฟุตบอล</h1>
        <p>ออกเมื่อวันที่: <strong>${todayStr}</strong> | สกุลเงิน: <strong>กีบลาว (KIP ₭)</strong></p>
      </div>

      <h2>1. สรุปภาพรวมทางการเงิน (Financial Summary - KIP)</h2>
      <div class="grid">
        <div class="card">
          <div class="title">เงินสดตั้งต้น (Initial Balance)</div>
          <div class="val">₭${summary.initialBalance.toLocaleString()}</div>
        </div>
        <div class="card">
          <div class="title">รายรับรวม (Total Income)</div>
          <div class="val income">₭${summary.totalIncome.toLocaleString()}</div>
        </div>
        <div class="card">
          <div class="title">ต้นทุนสินค้าสั่งซื้อ (COGS)</div>
          <div class="val cost">₭${summary.totalCost.toLocaleString()}</div>
        </div>
        <div class="card">
          <div class="title">รายจ่ายดำเนินงาน (Expenses)</div>
          <div class="val expense">₭${summary.totalExpense.toLocaleString()}</div>
        </div>
        <div class="card">
          <div class="title">กำไรสุทธิ (Net Profit)</div>
          <div class="val ${summary.netProfit >= 0 ? 'income' : 'expense'}">₭${summary.netProfit.toLocaleString()}</div>
        </div>
        <div class="card">
          <div class="title">เงินสดคงเหลือสุทธิ (Cash Balance)</div>
          <div class="val balance">₭${summary.cashBalance.toLocaleString()}</div>
        </div>
      </div>

      <h2>2. สรุปมูลค่าสต็อกชุดฟุตบอลคงเหลือ (Football Kits Inventory Summary)</h2>
      <div class="grid">
        <div class="card">
          <div class="title">จำนวนชุดบอลคงเหลือรวม</div>
          <div class="val">${summary.totalStockQty.toLocaleString()} ชุด</div>
        </div>
        <div class="card">
          <div class="title">มูลค่าสต็อกราคาทุนรวม</div>
          <div class="val cost">₭${summary.totalStockValueCost.toLocaleString()}</div>
        </div>
        <div class="card">
          <div class="title">มูลค่าสต็อกราคาขายรวม</div>
          <div class="val income">₭${summary.totalStockValueSell.toLocaleString()}</div>
        </div>
      </div>

      <h2>3. รายการธุรกรรมล่าสุด (Recent Transactions)</h2>
      <table>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>ประเภท</th>
            <th>หมวดหมู่</th>
            <th>หมายเหตุ</th>
            <th class="text-right">จำนวนเงิน (KIP ₭)</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.slice(0, 25).map(t => `
            <tr>
              <td>${t.date}</td>
              <td>${t.type === 'income' ? 'รายรับ' : t.type === 'cost' ? 'ต้นทุน' : 'รายจ่าย'}</td>
              <td>${t.category}</td>
              <td>${t.note || '-'}</td>
              <td class="text-right" style="font-weight: bold; color: ${t.type === 'income' ? '#059669' : t.type === 'cost' ? '#d97706' : '#e11d48'}">
                ${t.type === 'income' ? '+' : '-'}₭${t.amount.toLocaleString()}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        พิมพ์จากระบบ Kila BizAccount - ระบบบัญชีธุรกิจ & สต็อกชุดบอล (KIP Currency)
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
