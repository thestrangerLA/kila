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

    return `
      <tr>
        <td><code>${item.code}</code></td>
        <td>
          <strong>${item.name}</strong>
          <div style="font-size: 11px; color: var(--text-dim);"><i class="fa-solid fa-shield-halved"></i> ทีม: ${item.team}</div>
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
          <div class="action-btns">
            <button class="btn btn-sm btn-primary btn-stock-out" data-id="${item.id}" title="ขายสินค้า (ตัดสต็อก)">
              <i class="fa-solid fa-cart-shopping"></i> ขาย
            </button>
            <button class="btn btn-sm btn-secondary btn-stock-in" data-id="${item.id}" title="เติมสต็อกสินค้า">
              <i class="fa-solid fa-boxes-packing"></i> เติม
            </button>
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
