// COD (Cash On Delivery) Courier Management Module (ANS, HAL, MX)
import { store } from './store.js';

export function renderCODView(searchQuery = '', courierFilter = 'all', statusFilter = 'all', monthFilter = 'all', yearFilter = 'all', dateFilter = 'all') {
  renderCODCourierCards(monthFilter, yearFilter);
  populateCODDateDropdown(monthFilter, yearFilter);
  renderCODTable(searchQuery, courierFilter, statusFilter, monthFilter, yearFilter, dateFilter);
  populateStockDropdownInCODModal();
}

// Populate Stock Items in COD Modal Dropdown
export function populateStockDropdownInCODModal() {
  const sel = document.getElementById('codStockItemId');
  if (!sel) return;

  const current = sel.value;
  sel.innerHTML = '<option value="">-- เลือกสินค้าจากสต็อก --</option>';

  store.inventory.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.dataset.cost = item.costPrice || 0;
    opt.dataset.sell = item.sellingPrice || 0;
    opt.dataset.name = `${item.name} (${item.size})`;
    opt.textContent = `[${item.code || 'STK'}] ${item.name} (${item.size}) — ทุน ₭${(item.costPrice || 0).toLocaleString()} / ขาย ₭${(item.sellingPrice || 0).toLocaleString()} (สต็อก: ${item.stockQty})`;
    sel.appendChild(opt);
  });

  if (current && sel.querySelector(`option[value="${current}"]`)) {
    sel.value = current;
  }
}

// Populate Date Selector Dropdown for COD
export function populateCODDateDropdown(monthFilter = 'all', yearFilter = 'all') {
  const sel = document.getElementById('codFilterDate');
  if (!sel) return;

  const current = sel.value;
  const dates = store.getAvailableCODDatesInMonth(monthFilter, yearFilter);

  sel.innerHTML = '<option value="all">-- ทุกวันที่ในเดือน --</option>';
  dates.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = `วันที่ ${d}`;
    sel.appendChild(opt);
  });

  sel.value = dates.includes(current) ? current : 'all';
}

// 1. Render Courier Summary Cards (ANS, HAL, MX) matching user's screenshot layout
export function renderCODCourierCards(monthFilter = 'all', yearFilter = 'all') {
  const couriers = [
    { key: 'ANS', name: 'ANS', colorClass: 'cod-card-ans', iconColor: '#3b82f6', textColor: '#60a5fa' },
    { key: 'HAL', name: 'HAL', colorClass: 'cod-card-hal', iconColor: '#10b981', textColor: '#34d399' },
    { key: 'MX',  name: 'MX',  colorClass: 'cod-card-mx',  iconColor: '#f97316', textColor: '#fb923c' }
  ];

  couriers.forEach(c => {
    const metrics = store.getCODSummaryByCourier(c.key, { month: monthFilter, year: yearFilter });
    
    // Update badge (ค้าง X/Y)
    const badgeEl = document.getElementById(`codBadge${c.key}`);
    if (badgeEl) badgeEl.textContent = `ค้าง ${metrics.pendingCount}/${metrics.totalCount}`;

    // Update รวมเงิน
    const totalEl = document.getElementById(`codTotal${c.key}`);
    if (totalEl) totalEl.textContent = metrics.totalAmount.toLocaleString();

    // Update ค้างจ่าย
    const pendingEl = document.getElementById(`codPending${c.key}`);
    if (pendingEl) pendingEl.textContent = metrics.pendingAmount.toLocaleString();

    // Update กำไรรวม
    const profitEl = document.getElementById(`codProfit${c.key}`);
    if (profitEl) profitEl.textContent = metrics.totalProfit.toLocaleString();

    // Update กำไรจริง
    const actualProfitEl = document.getElementById(`codActualProfit${c.key}`);
    if (actualProfitEl) actualProfitEl.textContent = metrics.actualProfit.toLocaleString();
  });
}

// 2. Render COD Orders Table grouped by Date with Collapsible Dropdown Header
export function renderCODTable(searchQuery = '', courierFilter = 'all', statusFilter = 'all', monthFilter = 'all', yearFilter = 'all', dateFilter = 'all') {
  const tbody = document.getElementById('codTableBody');
  const emptyState = document.getElementById('codEmptyState');
  if (!tbody) return;

  const list = store.getFilteredCODOrders({
    search: searchQuery,
    courier: courierFilter,
    status: statusFilter,
    month: monthFilter,
    year: yearFilter,
    date: dateFilter
  });

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');

  const courierBadges = {
    ANS: '<span class="badge badge-ans" style="background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);">ANS</span>',
    HAL: '<span class="badge badge-hal" style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);">HAL</span>',
    MX:  '<span class="badge badge-mx"  style="background:rgba(249,115,22,0.15);color:#fb923c;border:1px solid rgba(249,115,22,0.3);">MX</span>'
  };

  const statusBadges = {
    pending: '<span class="badge" style="background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);">⏳ ค้างโอน COD</span>',
    completed: '<span class="badge" style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);">✅ โอนแล้ว</span>',
    returned: '<span class="badge" style="background:rgba(148,163,184,0.15);color:#94a3b8;border:1px solid rgba(148,163,184,0.3);">↩️ พัสดุตีกลับ</span>'
  };

  // Group list by date
  const groupedByDate = {};
  list.forEach(o => {
    if (!groupedByDate[o.date]) groupedByDate[o.date] = [];
    groupedByDate[o.date].push(o);
  });

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
  let html = '';

  sortedDates.forEach(dateStr => {
    const dateOrders = groupedByDate[dateStr];
    let pendingCount = 0;
    let pendingAmount = 0;
    let totalProfit = 0;

    dateOrders.forEach(o => {
      const cod = o.codAmount || 0;
      const cost = o.costAmount || 0;
      const profit = cod - cost;

      if (o.status !== 'returned') totalProfit += profit;
      if (o.status === 'pending') {
        pendingCount++;
        pendingAmount += cod;
      }
    });

    // Date Dropdown Header Row
    html += `
      <tr class="cod-date-group-header" data-date="${dateStr}">
        <td colspan="9" style="padding:10px 16px; background:rgba(30,41,59,0.7); cursor:pointer; border-bottom:1px solid var(--glass-border);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-chevron-down cod-date-toggle-icon" style="transition:transform 0.2s ease; color:var(--accent-primary);"></i>
              <i class="fa-solid fa-calendar-day" style="color:var(--accent-primary);"></i>
              <strong style="font-size:14px; color:var(--text-primary);">${dateStr}</strong>
              <small style="color:var(--text-dim);">(${dateOrders.length} รายการ)</small>
            </div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:12px;">
              <span style="background:rgba(239,68,68,0.12); color:#f87171; border:1px solid rgba(239,68,68,0.3); padding:3px 10px; border-radius:12px; font-weight:600;">
                ค้างโอน: ${pendingCount} order (₭${pendingAmount.toLocaleString()})
              </span>
              <span style="background:rgba(16,185,129,0.12); color:#34d399; border:1px solid rgba(16,185,129,0.3); padding:3px 10px; border-radius:12px; font-weight:600;">
                กำไรวันนั้น: ₭${totalProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </td>
      </tr>
    `;

    // Order Rows for this date
    dateOrders.forEach(o => {
      const profit = (o.codAmount || 0) - (o.costAmount || 0);

      html += `
        <tr class="cod-item-row" data-date-group="${dateStr}">
          <td style="font-size:13px; font-weight:600; padding-left:24px;">${o.date}</td>
          <td>${courierBadges[o.courier] || o.courier}</td>
          <td>
            <strong style="color:var(--text-primary);">${o.trackingNo || '-'}</strong>
            <div style="font-size:11px; color:var(--text-dim);">${o.customerName || '-'}</div>
          </td>
          <td>
            <div style="font-weight:600; color:var(--text-primary);">${o.productName || 'ชุดฟุตบอล'}</div>
            <small style="color:var(--text-dim);">จำนวน: ${o.qty || 1} ชุด</small>
          </td>
          <td class="text-right" style="font-weight:700; color:var(--income-color);">₭${(o.codAmount || 0).toLocaleString()}</td>
          <td class="text-right" style="color:var(--amber-color);">₭${(o.costAmount || 0).toLocaleString()}</td>
          <td class="text-right" style="font-weight:700; color:${profit >= 0 ? 'var(--income-color)' : 'var(--expense-color)'}">
            ₭${profit.toLocaleString()}
          </td>
          <td>${statusBadges[o.status] || o.status}</td>
          <td class="text-center">
            <div style="display:flex; gap:4px; justify-content:center;">
              ${o.status === 'pending' ? `
                <button class="btn btn-sm btn-cod-complete" data-id="${o.id}" title="ทำรายการโอนแล้ว" style="background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.4);">
                  <i class="fa-solid fa-check"></i> โอนแล้ว
                </button>
              ` : ''}
              <button class="btn btn-icon btn-sm btn-cod-edit" data-id="${o.id}" title="แก้ไข">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-icon btn-sm btn-cod-delete" data-id="${o.id}" title="ลบ">
                <i class="fa-solid fa-trash-can" style="color:var(--expense-color);"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  });

  tbody.innerHTML = html;

  // Attach Collapsible Group Header Toggle Event
  tbody.querySelectorAll('.cod-date-group-header').forEach(headerRow => {
    headerRow.addEventListener('click', (e) => {
      const dateStr = headerRow.dataset.date;
      const icon = headerRow.querySelector('.cod-date-toggle-icon');
      const itemRows = tbody.querySelectorAll(`.cod-item-row[data-date-group="${dateStr}"]`);

      let isCollapsed = false;
      itemRows.forEach(row => {
        if (row.classList.contains('hidden')) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
          isCollapsed = true;
        }
      });

      if (icon) {
        icon.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
      }
    });
  });
}
