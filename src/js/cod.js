// COD (Cash On Delivery) Courier Management Module (ANS, HAL, MX)
import { store } from './store.js';

// Transient COD Modal Cart for Multi-Product Selection
export let codModalCart = [];

export function renderCODView(searchQuery = '', courierFilter = 'all', statusFilter = 'all', monthFilter = 'all', yearFilter = 'all', dateFilter = 'all') {
  renderCODCourierCards(monthFilter, yearFilter);
  populateCODDateDropdown(monthFilter, yearFilter);
  renderCODTable(searchQuery, courierFilter, statusFilter, monthFilter, yearFilter, dateFilter);
  populateStockDropdownInCODModal();
}

// Multi-Product Selection Cart Methods inside COD Modal
export function setCODModalCart(items = []) {
  codModalCart = [...items];
  renderCODModalCart();
}

export function clearCODModalCart() {
  codModalCart = [];
  renderCODModalCart();
}

export function addCODItemToCart(item) {
  const existing = codModalCart.find(c => c.id === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
    codModalCart.push({
      id: item.id,
      code: item.code || 'STK',
      name: item.name || 'ชุดฟุตบอล',
      size: item.size || 'M',
      team: item.team || '',
      costPrice: parseFloat(item.costPrice) || 0,
      sellingPrice: parseFloat(item.sellingPrice) || 0,
      qty: 1
    });
  }
  renderCODModalCart();
}

export function updateCODItemCartQty(itemId, newQty) {
  const item = codModalCart.find(c => c.id === itemId);
  if (!item) return;

  if (newQty <= 0) {
    codModalCart = codModalCart.filter(c => c.id !== itemId);
  } else {
    item.qty = newQty;
  }
  renderCODModalCart();
}

export function removeCODItemFromCart(itemId) {
  codModalCart = codModalCart.filter(c => c.id !== itemId);
  renderCODModalCart();
}

export function renderCODModalCart() {
  const container = document.getElementById('codSelectedItemsList');
  const countEl = document.getElementById('codSelectedItemsCount');
  const clearBtn = document.getElementById('btnClearCODModalCart');
  if (!container) return;

  if (countEl) countEl.textContent = codModalCart.length;
  if (clearBtn) {
    if (codModalCart.length > 0) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  let totalCost = 0;
  let totalSell = 0;
  let totalQty = 0;

  if (codModalCart.length === 0) {
    container.innerHTML = '<div style="color:var(--text-dim); text-align:center; padding:10px;"><i class="fa-solid fa-hand-pointer"></i> คลิกเลือกชุดบอลจากรายการด้านบนลงพัสดุนี้ได้เลย</div>';
  } else {
    container.innerHTML = codModalCart.map(item => {
      const itemCostTotal = (item.costPrice || 0) * item.qty;
      const itemSellTotal = (item.sellingPrice || 0) * item.qty;
      totalCost += itemCostTotal;
      totalSell += itemSellTotal;
      totalQty += item.qty;

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px dashed var(--border-color); gap:8px;">
          <div style="flex:1; min-width:0;">
            <div style="font-weight:600; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
              ${item.name} (${item.size})
            </div>
            <div style="font-size:10px; color:var(--text-dim);">
              ทุน ₭${(item.costPrice || 0).toLocaleString()} | ขาย ₭${(item.sellingPrice || 0).toLocaleString()}
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
            <div style="display:flex; align-items:center; border:1px solid var(--border-color); border-radius:4px; overflow:hidden;">
              <button type="button" class="btn-cod-cart-minus" data-id="${item.id}" style="background:rgba(255,255,255,0.08); border:none; color:var(--text-primary); padding:2px 6px; cursor:pointer;">-</button>
              <span style="padding:2px 8px; font-weight:700; font-size:12px;">${item.qty}</span>
              <button type="button" class="btn-cod-cart-plus" data-id="${item.id}" style="background:rgba(255,255,255,0.08); border:none; color:var(--text-primary); padding:2px 6px; cursor:pointer;">+</button>
            </div>
            <strong style="color:var(--income-color); font-size:12px; min-width:60px; text-align:right;">₭${itemSellTotal.toLocaleString()}</strong>
            <button type="button" class="btn-cod-cart-del" data-id="${item.id}" style="background:transparent; border:none; color:var(--expense-color); cursor:pointer; padding:2px 4px;" title="ลบออก">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach Qty & Delete Listeners in Modal Cart
    container.querySelectorAll('.btn-cod-cart-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const current = codModalCart.find(c => c.id === id);
        if (current) updateCODItemCartQty(id, current.qty - 1);
      });
    });

    container.querySelectorAll('.btn-cod-cart-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const current = codModalCart.find(c => c.id === id);
        if (current) updateCODItemCartQty(id, current.qty + 1);
      });
    });

    container.querySelectorAll('.btn-cod-cart-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        removeCODItemFromCart(id);
      });
    });
  }

  // Update Live Preview Totals in Modal
  const totalProfit = totalSell - totalCost;
  const lblCost = document.getElementById('lblCODCostPrice');
  const lblSell = document.getElementById('lblCODSellingPrice');
  const lblProfit = document.getElementById('lblCODProfit');

  if (lblCost) lblCost.textContent = `₭${totalCost.toLocaleString()}`;
  if (lblSell) lblSell.textContent = `₭${totalSell.toLocaleString()}`;
  if (lblProfit) lblProfit.textContent = `₭${totalProfit.toLocaleString()}`;
}

// Populate Stock Items in COD Modal Visual Selector & Fallback Dropdown
export function populateStockDropdownInCODModal(searchQuery = '') {
  const sel = document.getElementById('codStockItemId');
  const grid = document.getElementById('codProductSelectorGrid');

  const items = store.getFilteredInventory({
    search: searchQuery,
    size: 'all',
    status: 'all'
  });

  if (sel) {
    const currentSelectedId = sel.value;
    sel.innerHTML = '<option value="">-- เลือกสินค้าจากสต็อก --</option>';

    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.dataset.cost = item.costPrice || 0;
      opt.dataset.sell = item.sellingPrice || 0;
      opt.dataset.name = `${item.name} (${item.size})`;
      opt.textContent = `[${item.code || 'STK'}] ${item.name} (${item.size}) — ทุน ₭${(item.costPrice || 0).toLocaleString()} / ขาย ₭${(item.sellingPrice || 0).toLocaleString()} (สต็อก: ${item.stockQty})`;
      sel.appendChild(opt);
    });

    if (currentSelectedId && sel.querySelector(`option[value="${currentSelectedId}"]`)) {
      sel.value = currentSelectedId;
    }
  }

  // Render Visual POS-Style Mini Cards in COD Modal
  if (grid) {
    if (items.length === 0) {
      grid.innerHTML = '<div style="padding:12px; text-align:center; color:var(--text-dim); font-size:12px;"><i class="fa-solid fa-box-open"></i> ไม่พบชุดบอลในสต็อก</div>';
      return;
    }

    grid.innerHTML = items.map(item => {
      const inCart = codModalCart.find(c => c.id === item.id);
      const cartQty = inCart ? inCart.qty : 0;

      return `
        <div class="cod-prod-card-mini ${cartQty > 0 ? 'active' : ''}" data-id="${item.id}">
          <div class="cod-prod-mini-icon" style="width:44px; height:44px;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:44px; height:44px; border-radius:6px; object-fit:cover;">` : `<i class="fa-solid fa-shirt"></i>`}
          </div>
          <div class="cod-prod-mini-info">
            <div class="cod-prod-mini-title">${item.name}</div>
            <div class="cod-prod-mini-meta">
              <span class="size-pill" style="font-size:9px; padding:1px 5px;">${item.size}</span>
              <span><i class="fa-solid fa-shield-halved"></i> ${item.team} (${item.kitType === 'Away' ? 'เยือน' : item.kitType === 'Third' ? 'เยือน 3' : item.kitType === 'Special' ? 'พิเศษ' : 'เหย้า'})</span>
            </div>
          </div>
          <div class="cod-prod-mini-price">
            <div>₭${(item.sellingPrice || 0).toLocaleString()}</div>
            <small style="font-size:9px; color:${cartQty > 0 ? 'var(--income-color)' : 'var(--text-dim)'}; font-weight:${cartQty > 0 ? '700' : 'normal'};">
              ${cartQty > 0 ? `เลือกแล้ว ${cartQty} ชุด` : `เหลือ ${item.stockQty}`}
            </small>
          </div>
        </div>
      `;
    }).join('');

    // Attach Click Event to Mini Cards -> Multi-Add to Cart
    grid.querySelectorAll('.cod-prod-card-mini').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const stockItem = store.inventory.find(i => i.id === id);
        if (stockItem) {
          addCODItemToCart(stockItem);
          populateStockDropdownInCODModal(searchQuery); // Re-render badges
        }
      });
    });
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
    const [yyyy, mm, dd] = d.split('-');
    const label = (dd && mm && yyyy) ? `วันที่ ${dd}/${mm}/${yyyy}` : `วันที่ ${d}`;
    opt.textContent = label;
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

// 2. Render COD Orders Table grouped by Date (Collapsed by default matching screenshot)
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
    const totalCount = dateOrders.length;
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

    const [yyyy, mm, dd] = dateStr.split('-');
    const formattedDateLabel = (dd && mm && yyyy) ? `วันที่ ${dd}/${mm}/${yyyy}` : `วันที่ ${dateStr}`;

    // Date Header Card (Collapsed by default with circular dropdown button)
    html += `
      <tr class="cod-date-group-header" data-date="${dateStr}">
        <td colspan="9" style="padding:12px 16px; background:rgba(30,41,59,0.85); cursor:pointer; border-bottom:1px solid var(--glass-border); border-radius:12px; margin-bottom:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="date-circle-toggle">
                <i class="fa-solid fa-chevron-down cod-date-toggle-icon" style="transition:transform 0.25 ease; transform:rotate(-90deg);"></i>
              </div>
              <strong style="font-size:15px; font-weight:700; color:var(--text-primary); letter-spacing:0.3px;">${formattedDateLabel}</strong>
              <small style="color:var(--text-dim);">(${totalCount} รายการ)</small>
            </div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:12px;">
              <span style="background:rgba(239,68,68,0.12); color:#f87171; border:1px solid rgba(239,68,68,0.3); padding:4px 12px; border-radius:20px; font-weight:600;">
                ค้างโอน: ${pendingCount}/${totalCount} order (₭${pendingAmount.toLocaleString()})
              </span>
              <span style="background:rgba(16,185,129,0.12); color:#34d399; border:1px solid rgba(16,185,129,0.3); padding:4px 12px; border-radius:20px; font-weight:600;">
                กำไรวันนั้น: ₭${totalProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </td>
      </tr>
    `;

    // Order Rows for this date (Hidden/Collapsed by default)
    dateOrders.forEach(o => {
      const profit = (o.codAmount || 0) - (o.costAmount || 0);

      // Product summary formatting
      let displayProducts = o.productName || 'ชุดฟุตบอล';
      if (o.items && o.items.length > 0) {
        displayProducts = o.items.map(i => `${i.name} (${i.size}) x${i.qty}`).join(', ');
      }

      html += `
        <tr class="cod-item-row hidden" data-date-group="${dateStr}">
          <td style="font-size:13px; font-weight:600; padding-left:24px;">${o.date}</td>
          <td>${courierBadges[o.courier] || o.courier}</td>
          <td>
            <strong style="color:var(--text-primary);">${o.trackingNo || '-'}</strong>
            <div style="font-size:11px; color:var(--text-dim);">${o.customerName || '-'}</div>
          </td>
          <td>
            <div style="font-weight:600; color:var(--text-primary);">${displayProducts}</div>
            <small style="color:var(--text-dim);">รวม: ${o.qty || 1} ชุด</small>
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
      if (e.target.closest('button')) return;

      const dateStr = headerRow.dataset.date;
      const icon = headerRow.querySelector('.cod-date-toggle-icon');
      const itemRows = tbody.querySelectorAll(`.cod-item-row[data-date-group="${dateStr}"]`);

      let isOpening = false;
      itemRows.forEach(row => {
        if (row.classList.contains('hidden')) {
          row.classList.remove('hidden');
          isOpening = true;
        } else {
          row.classList.add('hidden');
        }
      });

      if (icon) {
        icon.style.transform = isOpening ? 'rotate(0deg)' : 'rotate(-90deg)';
      }
    });
  });
}
