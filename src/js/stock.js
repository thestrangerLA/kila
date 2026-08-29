// Football Kits Stock Inventory Manager Module
import { store } from './store.js';

export function renderStockView(searchQuery = '', sizeFilter = 'all', statusFilter = 'all') {
  const tbody = document.getElementById('stockTableBody');
  const emptyState = document.getElementById('stockEmptyState');
  if (!tbody) return;

  const items = store.getFilteredInventory({ search: searchQuery, size: sizeFilter, status: statusFilter });

  if (items.length === 0) {
    tbody.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');

  tbody.innerHTML = items.map(item => {
    const isOutOfStock = item.stockQty === 0;
    const isLowStock = !isOutOfStock && item.stockQty <= (item.minQty || 5);

    let statusBadge = '<span class="badge badge-income"><i class="fa-solid fa-check"></i> พร้อมขาย</span>';
    if (isOutOfStock) {
      statusBadge = '<span class="badge badge-expense"><i class="fa-solid fa-xmark"></i> หมดสต็อก</span>';
    } else if (isLowStock) {
      statusBadge = '<span class="badge badge-cost"><i class="fa-solid fa-triangle-exclamation"></i> ใกล้หมด</span>';
    }

    const totalValCost = item.stockQty * item.costPrice;

    const imgHtml = item.image
      ? `<img src="${item.image}" alt="${item.name}" style="width:58px; height:58px; border-radius:8px; object-fit:cover; border:1px solid var(--border-color); flex-shrink:0; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">`
      : `<div style="width:58px; height:58px; border-radius:8px; background:rgba(99,102,241,0.15); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:22px;"><i class="fa-solid fa-shirt"></i></div>`;

    const kitTypeMap = {
      Home: '🏠 เหย้า',
      Away: '✈️ เยือน',
      Third: '🛡️ เยือน 3',
      Special: '⭐ พิเศษ'
    };
    const kitLabel = kitTypeMap[item.kitType] || item.kitType || '🏠 เหย้า';
    const seasonLabel = item.season || '2026/2027';

    return `
      <tr>
        <td><code>${item.code}</code></td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            ${imgHtml}
            <div>
              <strong>${item.name}</strong>
              <div style="font-size: 11px; color: var(--text-dim); display:flex; gap:6px; align-items:center; margin-top:2px; flex-wrap:wrap;">
                <span><i class="fa-solid fa-shield-halved"></i> ${item.team}</span>
                <span style="background:rgba(99,102,241,0.12); color:#818cf8; border:1px solid rgba(99,102,241,0.25); padding:1px 6px; border-radius:4px; font-size:10px;">${kitLabel}</span>
                <span style="background:rgba(255,255,255,0.06); color:var(--text-secondary); border:1px solid var(--border-color); padding:1px 6px; border-radius:4px; font-size:10px;">${seasonLabel}</span>
              </div>
            </div>
          </div>
        </td>
        <td><span class="size-pill">${item.size}</span></td>
        <td class="text-right">₭${item.costPrice.toLocaleString()}</td>
        <td class="text-right text-emerald">₭${item.sellingPrice.toLocaleString()}</td>
        <td class="text-center" style="font-size: 16px; font-weight: 700; color: ${isOutOfStock ? 'var(--expense-color)' : isLowStock ? 'var(--cost-color)' : 'var(--text-main)'}">
          ${item.stockQty.toLocaleString()} ชุด
        </td>
        <td class="text-right">₭${totalValCost.toLocaleString()}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center">
          <div class="action-btns" style="justify-content:center;">
            <button class="btn btn-icon btn-sm btn-edit-stock" data-id="${item.id}" title="แก้ไขข้อมูล">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-icon btn-sm btn-delete-stock" data-id="${item.id}" title="ลบสินค้า">
              <i class="fa-solid fa-trash" style="color: var(--expense-color)"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}
