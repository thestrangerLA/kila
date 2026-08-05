import Chart from 'chart.js/auto';

let overviewChartInstance = null;
let breakdownChartInstance = null;
let trendChartInstance = null;

export function renderCharts(transactions, initialBalance = 0, isDark = true) {
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const sortedTx = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  const dateMap = {};
  sortedTx.forEach(t => {
    if (!dateMap[t.date]) {
      dateMap[t.date] = { income: 0, expense: 0, cost: 0 };
    }
    if (t.type === 'income') {
      dateMap[t.date].income += t.amount;
      if (t.linkedCost > 0) {
        dateMap[t.date].cost += t.linkedCost;
      }
    }
    if (t.type === 'expense') dateMap[t.date].expense += t.amount;
    if (t.type === 'cost') dateMap[t.date].cost += t.amount;
  });

  const dates = Object.keys(dateMap);
  const incomeData = dates.map(d => dateMap[d].income);
  const expenseData = dates.map(d => dateMap[d].expense);
  const costData = dates.map(d => dateMap[d].cost);

  const dateLabels = dates.map(d => {
    const parts = d.split('-');
    if (parts.length === 3) {
      const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parseInt(parts[2], 10)} ${monthNames[mIdx] || parts[1]}`;
    }
    return d;
  });

  // 1. Overview Bar Chart
  const overviewCtx = document.getElementById('overviewChart')?.getContext('2d');
  if (overviewCtx) {
    if (overviewChartInstance) overviewChartInstance.destroy();

    overviewChartInstance = new Chart(overviewCtx, {
      type: 'bar',
      data: {
        labels: dateLabels.length > 0 ? dateLabels : ['ไม่มีข้อมูล'],
        datasets: [
          {
            label: 'รายรับ (Income)',
            data: incomeData.length > 0 ? incomeData : [0],
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'ต้นทุนสินค้า (Cost)',
            data: costData.length > 0 ? costData : [0],
            backgroundColor: 'rgba(245, 158, 11, 0.85)',
            borderColor: '#f59e0b',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'รายจ่ายดำเนินงาน (Expenses)',
            data: expenseData.length > 0 ? expenseData : [0],
            backgroundColor: 'rgba(244, 63, 94, 0.85)',
            borderColor: '#f43f5e',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, font: { family: 'Prompt, sans-serif', size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ₭${ctx.parsed.y.toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { family: 'Prompt, sans-serif', size: 11 } },
            grid: { color: gridColor }
          },
          y: {
            ticks: {
              color: textColor,
              font: { family: 'Prompt, sans-serif', size: 11 },
              callback: (val) => '₭' + val.toLocaleString()
            },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  // 2. Category Breakdown Doughnut Chart
  const categoryMap = {};
  transactions.forEach(t => {
    if (t.type === 'expense' || t.type === 'cost') {
      const key = `${t.category} (${t.type === 'cost' ? 'ต้นทุน' : 'รายจ่าย'})`;
      categoryMap[key] = (categoryMap[key] || 0) + t.amount;
    }
  });

  const catLabels = Object.keys(categoryMap);
  const catData = Object.values(categoryMap);

  const breakdownColors = [
    '#f43f5e', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899',
    '#14b8a6', '#6366f1', '#eab308', '#06b6d4', '#a855f7'
  ];

  const breakdownCtx = document.getElementById('breakdownChart')?.getContext('2d');
  if (breakdownCtx) {
    if (breakdownChartInstance) breakdownChartInstance.destroy();

    breakdownChartInstance = new Chart(breakdownCtx, {
      type: 'doughnut',
      data: {
        labels: catLabels.length > 0 ? catLabels : ['ไม่มีข้อมูล'],
        datasets: [{
          data: catData.length > 0 ? catData : [1],
          backgroundColor: catData.length > 0 ? breakdownColors.slice(0, catLabels.length) : ['#475569'],
          borderWidth: 2,
          borderColor: isDark ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: textColor, font: { family: 'Prompt, sans-serif', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ₭${ctx.parsed.toLocaleString()}`
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // 3. Cashflow Trend Line Chart
  let cumulativeBalance = initialBalance;
  const trendLabels = ['เริ่มต้น'];
  const trendData = [initialBalance];

  dates.forEach(d => {
    const netDay = dateMap[d].income - (dateMap[d].expense + dateMap[d].cost);
    cumulativeBalance += netDay;

    const parts = d.split('-');
    const formatted = parts.length === 3 ? `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}` : d;

    trendLabels.push(formatted);
    trendData.push(cumulativeBalance);
  });

  const trendCtx = document.getElementById('trendChart')?.getContext('2d');
  if (trendCtx) {
    if (trendChartInstance) trendChartInstance.destroy();

    trendChartInstance = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [{
          label: 'เงินสดคงเหลือสะสม (KIP Cash Balance)',
          data: trendData,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#06b6d4'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, font: { family: 'Prompt, sans-serif', size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `เงินสดคงเหลือ: ₭${ctx.parsed.y.toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { family: 'Prompt, sans-serif', size: 11 } },
            grid: { color: gridColor }
          },
          y: {
            ticks: {
              color: textColor,
              font: { family: 'Prompt, sans-serif', size: 11 },
              callback: (val) => '₭' + val.toLocaleString()
            },
            grid: { color: gridColor }
          }
        }
      }
    });
  }
}
