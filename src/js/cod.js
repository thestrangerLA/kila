// COD (Cash On Delivery) Courier Management Module (ANS, HAL, MX)
import { store } from './store.js';

export function renderCODView(searchQuery = '', courierFilter = 'all', statusFilter = 'all') {
  renderCODCourierCards();
  renderCODTable(searchQuery, courierFilter, statusFilter);
}

// 1. Render Courier Summary Cards (ANS, HAL, MX) matching user's screenshot layout
export function renderCODCourierCards() {
  const couriers = [
    { key: 'ANS', name: 'ANS', colorClass: 'cod-card-ans', iconColor: '#3b82f6', textColor: '#60a5fa' },
    { key: 'HAL', name: 'HAL', colorClass: 'cod-card-hal', iconColor: '#10b981', textColor: '#34d399' },
    { key: 'MX',  name: 'MX',  colorClass: 'cod-card-mx',  iconColor: '#f97316', textColor: '#fb923c' }
  ];

  couriers.forEach(c => {
    const metrics = store.getCODSummaryByCourier(c.key);
    
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

// 2. Render COD Orders Table
export function renderCODTable(searchQuery = '', courierFilter = 'all', statusFilter = 'all') {
  const tbody = document.getElementById('codTableBody');
  const emptyState = document.getElementById('codEmptyState');
  if (!tbody) return;

  const list = store.getFilteredCODOrders({
    search: searchQuery,
    courier: courierFilter,
    status: statusFilter
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

  tbody.innerHTML = list.map(o => {
    const profit = o.codAmount - o.costAmount - o.shippingFee;

    return `
      <tr>
        <td style="font-size:13px; font-weight:600;">${o.date}</td>
        <td>${courierBadges[o.courier] || o.courier}</td>
        <td>
          <strong style="color:var(--text-primary);">${o.trackingNo || '-'}</strong>
          <div style="font-size:11px; color:var(--text-dim);">${o.customerName || '-'}</div>
        </td>
        <td class="text-right" style="font-weight:700; color:var(--income-color);">₭${(o.codAmount || 0).toLocaleString()}</td>
        <td class="text-right" style="color:var(--amber-color);">₭${(o.costAmount || 0).toLocaleString()}</td>
        <td class="text-right" style="color:var(--text-dim);">₭${(o.shippingFee || 0).toLocaleString()}</td>
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
  }).join('');
}
