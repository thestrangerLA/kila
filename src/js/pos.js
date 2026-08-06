// Point of Sale (POS) Module for Football Kits Store
import confetti from 'canvas-confetti';
import { store } from './store.js';

class POSManager {
  constructor() {
    this.cart = [];
    this.searchQuery = '';
    this.sizeFilter = 'all';
    this.discount = 0;
    this.lastOrder = null;

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // POS Catalog Search & Filters
    document.getElementById('posSearch')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderCatalog();
    });

    document.getElementById('posSizeFilter')?.addEventListener('change', (e) => {
      this.sizeFilter = e.target.value;
      this.renderCatalog();
    });

    // Discount Input
    document.getElementById('posDiscount')?.addEventListener('input', (e) => {
      this.discount = Math.max(0, parseFloat(e.target.value) || 0);
      this.renderCart();
    });

    // Clear Cart Button
    document.getElementById('btnClearCart')?.addEventListener('click', () => {
      if (this.cart.length === 0) return;
      if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างรายการในตะกร้า?')) {
        this.clearCart();
      }
    });

    // Checkout Button Trigger
    document.getElementById('btnPOSCheckout')?.addEventListener('click', () => {
      if (this.cart.length === 0) {
        alert('กรุณาเลือกชุดฟุตบอลอย่างน้อย 1 รายการลงตะกร้าก่อนชำระเงิน');
        return;
      }
      this.openCheckoutModal();
    });

    // Checkout Form Submission
    document.getElementById('posCheckoutForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.processCheckout();
    });

    document.getElementById('btnClosePosModal')?.addEventListener('click', () => {
      document.getElementById('posCheckoutModal')?.classList.add('hidden');
    });

    document.getElementById('btnCancelPosModal')?.addEventListener('click', () => {
      document.getElementById('posCheckoutModal')?.classList.add('hidden');
    });

    // Cash Received live calculation for change
    document.getElementById('posCashReceived')?.addEventListener('input', (e) => {
      this.calculateChange();
    });

    // Print Receipt Button
    document.getElementById('btnPrintReceiptSlip')?.addEventListener('click', () => {
      if (this.lastOrder) {
        this.printReceiptSlip(this.lastOrder);
      }
    });

    document.getElementById('btnCloseReceiptModal')?.addEventListener('click', () => {
      document.getElementById('posReceiptModal')?.classList.add('hidden');
    });
  }

  addToCart(stockItem) {
    if (stockItem.stockQty <= 0) {
      alert('สินค้าชุดนี้หมดสต็อกแล้ว!');
      return;
    }

    const existing = this.cart.find(c => c.id === stockItem.id);
    if (existing) {
      if (existing.qty >= stockItem.stockQty) {
        alert(`ไม่สามารถเพิ่มได้เกินจำนวนสต็อกคงเหลือ (${stockItem.stockQty} ชุด)`);
        return;
      }
      existing.qty++;
    } else {
      this.cart.push({
        id: stockItem.id,
        code: stockItem.code,
        name: stockItem.name,
        team: stockItem.team,
        size: stockItem.size,
        sellingPrice: stockItem.sellingPrice,
        qty: 1,
        maxStock: stockItem.stockQty
      });
    }

    this.renderCart();
  }

  updateQty(itemId, newQty) {
    const item = this.cart.find(c => c.id === itemId);
    if (!item) return;

    if (newQty <= 0) {
      this.removeFromCart(itemId);
      return;
    }

    if (newQty > item.maxStock) {
      alert(`สต็อกคงเหลือเพียง ${item.maxStock} ชุดเท่านั้น`);
      item.qty = item.maxStock;
    } else {
      item.qty = newQty;
    }

    this.renderCart();
  }

  removeFromCart(itemId) {
    this.cart = this.cart.filter(c => c.id !== itemId);
    this.renderCart();
  }

  clearCart() {
    this.cart = [];
    this.discount = 0;
    const discInput = document.getElementById('posDiscount');
    if (discInput) discInput.value = '';
    this.renderCart();
  }

  renderCatalog() {
    const container = document.getElementById('posCatalogGrid');
    const emptyState = document.getElementById('posCatalogEmpty');
    if (!container) return;

    const items = store.getFilteredInventory({
      search: this.searchQuery,
      size: this.sizeFilter,
      status: 'all'
    });

    if (items.length === 0) {
      container.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }

    emptyState?.classList.add('hidden');

    container.innerHTML = items.map(item => {
      const isOutOfStock = item.stockQty <= 0;
      const inCartItem = this.cart.find(c => c.id === item.id);
      const cartQty = inCartItem ? inCartItem.qty : 0;

      return `
        <div class="pos-prod-card glass-card ${isOutOfStock ? 'disabled' : ''}" data-id="${item.id}">
          <div class="pos-card-header">
            <span class="size-pill">${item.size}</span>
            <span class="pos-stock-badge ${isOutOfStock ? 'out' : item.stockQty <= 5 ? 'low' : ''}">
              ${isOutOfStock ? 'หมด' : 'เหลือ ' + item.stockQty + ' ชุด'}
            </span>
          </div>

          <div class="pos-card-icon">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px;">` : `<i class="fa-solid fa-shirt"></i>`}
          </div>

          <div class="pos-card-body">
            <div class="pos-team-tag"><i class="fa-solid fa-shield-halved"></i> ${item.team}</div>
            <h4 class="pos-prod-title">${item.name}</h4>
            <div class="pos-prod-price">₭${item.sellingPrice.toLocaleString()}</div>
          </div>

          ${cartQty > 0 ? `<div class="pos-cart-count-badge">${cartQty}</div>` : ''}

          <button class="btn btn-primary btn-sm btn-block margin-top-xs" ${isOutOfStock ? 'disabled' : ''}>
            <i class="fa-solid fa-cart-plus"></i> ${isOutOfStock ? 'สินค้าหมด' : '+ ใส่ตะกร้า'}
          </button>
        </div>
      `;
    }).join('');

    // Click handler for product cards
    container.querySelectorAll('.pos-prod-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const item = store.inventory.find(i => i.id === id);
        if (item) this.addToCart(item);
      });
    });
  }

  renderCart() {
    const tbody = document.getElementById('posCartTableBody');
    const emptyState = document.getElementById('posCartEmpty');
    const lblSubtotal = document.getElementById('posSubtotal');
    const lblGrandTotal = document.getElementById('posGrandTotal');
    const btnCheckout = document.getElementById('btnPOSCheckout');

    if (!tbody) return;

    if (this.cart.length === 0) {
      tbody.innerHTML = '';
      emptyState?.classList.remove('hidden');
      if (lblSubtotal) lblSubtotal.textContent = '₭0';
      if (lblGrandTotal) lblGrandTotal.textContent = '₭0';
      if (btnCheckout) btnCheckout.disabled = true;
      return;
    }

    emptyState?.classList.add('hidden');
    if (btnCheckout) btnCheckout.disabled = false;

    let subtotal = 0;

    tbody.innerHTML = this.cart.map(item => {
      const lineTotal = item.qty * item.sellingPrice;
      subtotal += lineTotal;

      return `
        <tr>
          <td>
            <strong style="font-size: 13px;">${item.name}</strong>
            <div style="font-size: 11px; color: var(--text-dim);"><span class="size-pill" style="font-size:10px; padding: 1px 4px;">${item.size}</span> ${item.team}</div>
          </td>
          <td class="text-center">
            <div class="cart-qty-controls">
              <button class="btn btn-icon btn-sm btn-qty-minus" data-id="${item.id}">-</button>
              <span class="qty-val">${item.qty}</span>
              <button class="btn btn-icon btn-sm btn-qty-plus" data-id="${item.id}">+</button>
            </div>
          </td>
          <td class="text-right">₭${lineTotal.toLocaleString()}</td>
          <td class="text-center">
            <button class="btn btn-icon btn-sm btn-cart-remove" data-id="${item.id}" title="ลบ">
              <i class="fa-solid fa-xmark" style="color: var(--expense-color)"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const grandTotal = Math.max(0, subtotal - this.discount);

    if (lblSubtotal) lblSubtotal.textContent = `₭${subtotal.toLocaleString()}`;
    if (lblGrandTotal) lblGrandTotal.textContent = `₭${grandTotal.toLocaleString()}`;

    // Attach cart item events
    tbody.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const item = this.cart.find(c => c.id === id);
        if (item) this.updateQty(id, item.qty - 1);
      });
    });

    tbody.querySelectorAll('.btn-qty-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const item = this.cart.find(c => c.id === id);
        if (item) this.updateQty(id, item.qty + 1);
      });
    });

    tbody.querySelectorAll('.btn-cart-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.removeFromCart(id);
      });
    });

    // Refresh catalog badge counts
    this.renderCatalog();
  }

  openCheckoutModal() {
    const modal = document.getElementById('posCheckoutModal');
    if (!modal) return;

    let subtotal = 0;
    this.cart.forEach(c => subtotal += c.qty * c.sellingPrice);
    const grandTotal = Math.max(0, subtotal - this.discount);

    document.getElementById('posModalSubtotal').textContent = `₭${subtotal.toLocaleString()}`;
    document.getElementById('posModalDiscount').textContent = `-₭${this.discount.toLocaleString()}`;
    document.getElementById('posModalGrandTotal').textContent = `₭${grandTotal.toLocaleString()}`;

    const cashInput = document.getElementById('posCashReceived');
    if (cashInput) cashInput.value = grandTotal;

    this.calculateChange();
    modal.classList.remove('hidden');
  }

  calculateChange() {
    let subtotal = 0;
    this.cart.forEach(c => subtotal += c.qty * c.sellingPrice);
    const grandTotal = Math.max(0, subtotal - this.discount);

    const cashInput = document.getElementById('posCashReceived');
    const cashVal = parseFloat(cashInput?.value) || 0;
    const change = Math.max(0, cashVal - grandTotal);

    const lblChange = document.getElementById('posModalChange');
    if (lblChange) {
      lblChange.textContent = `₭${change.toLocaleString()}`;
      lblChange.style.color = cashVal < grandTotal ? 'var(--expense-color)' : 'var(--income-color)';
    }
  }

  processCheckout() {
    const paymentMethod = document.getElementById('posPaymentMethod')?.value || 'cash';
    const cashReceived = parseFloat(document.getElementById('posCashReceived')?.value) || 0;
    const note = document.getElementById('posNote')?.value || '';

    const order = store.checkoutPOSOrder({
      cart: this.cart,
      discount: this.discount,
      paymentMethod,
      cashReceived,
      note
    });

    if (order) {
      this.lastOrder = order;
      document.getElementById('posCheckoutModal')?.classList.add('hidden');
      
      // Clear cart
      this.clearCart();

      // Show celebration confetti
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

      // Open receipt modal
      this.openReceiptModal(order);
    }
  }

  openReceiptModal(order) {
    const modal = document.getElementById('posReceiptModal');
    if (!modal) return;

    document.getElementById('rcptOrderId').textContent = `#${order.orderId}`;
    document.getElementById('rcptDate').textContent = `${order.date} ${order.time}`;
    document.getElementById('rcptPayMethod').textContent = order.paymentMethod === 'transfer' ? 'โอนเงิน (QR)' : order.paymentMethod === 'card' ? 'บัตรเครดิต' : 'เงินสด';

    const itemsContainer = document.getElementById('rcptItemsList');
    if (itemsContainer) {
      itemsContainer.innerHTML = order.cart.map(item => `
        <div class="rcpt-item-row">
          <div>
            <strong>${item.name} (${item.size})</strong>
            <div style="font-size: 11px; color: var(--text-dim);">₭${item.sellingPrice.toLocaleString()} x ${item.qty}</div>
          </div>
          <div style="font-weight: 600;">₭${(item.qty * item.sellingPrice).toLocaleString()}</div>
        </div>
      `).join('');
    }

    document.getElementById('rcptSubtotal').textContent = `₭${order.subtotal.toLocaleString()}`;
    document.getElementById('rcptDiscount').textContent = `-₭${order.discount.toLocaleString()}`;
    document.getElementById('rcptGrandTotal').textContent = `₭${order.grandTotal.toLocaleString()}`;
    document.getElementById('rcptCashReceived').textContent = `₭${order.cashReceived.toLocaleString()}`;
    document.getElementById('rcptChange').textContent = `₭${order.change.toLocaleString()}`;

    modal.classList.remove('hidden');
  }

  printReceiptSlip(order) {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ใบเสร็จรับเงิน #${order.orderId}</title>
        <style>
          body { font-family: 'Sarabun', monospace, sans-serif; width: 280px; margin: 0 auto; padding: 15px; color: #000; font-size: 12px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .header { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .line-item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .totals { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; }
          .grand { font-size: 14px; font-weight: bold; }
          .footer { border-top: 1px dashed #000; margin-top: 15px; padding-top: 10px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <h2 style="margin:0;">ร้านชุดฟุตบอล Kila Biz</h2>
          <p style="margin:2px 0;">ระบบบัญชี & สต็อกชุดบอล (KIP ₭)</p>
          <p style="margin:2px 0;">เลขที่ใบเสร็จ: <strong>#${order.orderId}</strong></p>
          <p style="margin:2px 0;">วันที่: ${order.date} ${order.time}</p>
        </div>

        <div style="margin-bottom: 10px;">
          ${order.cart.map(item => `
            <div class="line-item">
              <div>
                <div>${item.name} (${item.size})</div>
                <small>₭${item.sellingPrice.toLocaleString()} x ${item.qty}</small>
              </div>
              <div class="bold">₭${(item.qty * item.sellingPrice).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="line-item"><span>รวมเงิน:</span><span>₭${order.subtotal.toLocaleString()}</span></div>
          ${order.discount > 0 ? `<div class="line-item"><span>ส่วนลด:</span><span>-₭${order.discount.toLocaleString()}</span></div>` : ''}
          <div class="line-item grand"><span>ยอดรวมสุทธิ:</span><span>₭${order.grandTotal.toLocaleString()}</span></div>
          <div class="line-item"><span>รับเงินมา:</span><span>₭${order.cashReceived.toLocaleString()}</span></div>
          <div class="line-item"><span>เงินทอน:</span><span>₭${order.change.toLocaleString()}</span></div>
        </div>

        <div class="footer text-center">
          <p>*** ขอบคุณที่อุดหนุนชุดบอลร้านเรา ***</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  }
}

export const posManager = new POSManager();
