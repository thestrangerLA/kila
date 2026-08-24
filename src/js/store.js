import { DEFAULT_INITIAL_BALANCE, generateSampleTransactions, generateSampleStock } from './sampleData.js';

const STORAGE_KEYS = {
  TRANSACTIONS: 'kila_biz_transactions_kip',
  INITIAL_BALANCE: 'kila_biz_initial_balance_kip',
  ACTUAL_BALANCE: 'kila_biz_actual_balance_kip',
  STOCK: 'kila_biz_football_stock_kip',
  COD: 'kila_biz_cod_orders_kip',
  THEME: 'kila_biz_theme'
};

class BizStore {
  constructor() {
    this.transactions = [];
    this.initialBalance = 0;
    this.actualBalance = 0;   // เงินในบัญชีจริง (กรอกแมนวล)
    this.inventory = [];
    this.codOrders = [];      // ติดตาม COD ขนส่ง (ANS, HAL, MX)
    this.theme = 'dark';
    this.listeners = [];

    this.init();
  }

  init() {
    this.loadFromStorage();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  loadFromStorage() {
    try {
      const savedTx    = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const savedBal   = localStorage.getItem(STORAGE_KEYS.INITIAL_BALANCE);
      const savedActual = localStorage.getItem(STORAGE_KEYS.ACTUAL_BALANCE);
      const savedStock = localStorage.getItem(STORAGE_KEYS.STOCK);
      const savedCOD   = localStorage.getItem(STORAGE_KEYS.COD);
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);

      if (savedTx)      this.transactions   = JSON.parse(savedTx);
      if (savedBal  !== null) this.initialBalance = parseFloat(savedBal)  || 0;
      if (savedActual !== null) this.actualBalance = parseFloat(savedActual) || 0;
      if (savedStock)   this.inventory      = JSON.parse(savedStock);
      if (savedCOD)     this.codOrders      = JSON.parse(savedCOD);
      if (savedTheme)   this.theme          = savedTheme;
    } catch (e) {
      console.error('Error loading data from LocalStorage', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS,   JSON.stringify(this.transactions));
      localStorage.setItem(STORAGE_KEYS.INITIAL_BALANCE, this.initialBalance.toString());
      localStorage.setItem(STORAGE_KEYS.ACTUAL_BALANCE,  this.actualBalance.toString());
      localStorage.setItem(STORAGE_KEYS.STOCK,           JSON.stringify(this.inventory));
      localStorage.setItem(STORAGE_KEYS.COD,             JSON.stringify(this.codOrders));
      localStorage.setItem(STORAGE_KEYS.THEME,           this.theme);
    } catch (e) {
      console.error('Error saving data to LocalStorage', e);
    }
  }

  setActualBalance(amount) {
    this.actualBalance = Math.max(0, parseFloat(amount) || 0);
    this.saveToStorage();
    this.notify();
  }

  // Clear ALL transactions and inventory (keep theme & balances)
  clearAllData() {
    this.transactions   = [];
    this.inventory      = [];
    this.codOrders       = [];
    this.initialBalance = 0;
    this.actualBalance  = 0;
    
    // Wipe local storage items
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.STOCK);
    localStorage.removeItem(STORAGE_KEYS.COD);
    localStorage.removeItem(STORAGE_KEYS.INITIAL_BALANCE);
    localStorage.removeItem(STORAGE_KEYS.ACTUAL_BALANCE);

    this.saveToStorage();
    this.notify();
  }

  // Export full store state to JSON object for PC Backup
  exportAllDataJSON() {
    return {
      version: 1,
      appName: 'KilaBizAccount',
      exportDate: new Date().toISOString(),
      initialBalance: this.initialBalance,
      actualBalance: this.actualBalance,
      transactions: this.transactions,
      inventory: this.inventory,
      codOrders: this.codOrders
    };
  }

  // Import full store state from JSON object
  importAllDataJSON(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.initialBalance === 'number') this.initialBalance = data.initialBalance;
    if (typeof data.actualBalance === 'number') this.actualBalance = data.actualBalance;
    if (Array.isArray(data.transactions)) this.transactions = data.transactions;
    if (Array.isArray(data.inventory)) this.inventory = data.inventory;
    if (Array.isArray(data.codOrders)) this.codOrders = data.codOrders;

    this.saveToStorage();
    this.notify();
    return true;
  }

  setInitialBalance(amount) {
    this.initialBalance = Math.max(0, parseFloat(amount) || 0);
    this.saveToStorage();
    this.notify();
  }

  setTheme(theme) {
    this.theme = theme;
    this.saveToStorage();
    this.notify();
  }

  // Transactions CRUD
  addTransaction(tx) {
    const newTx = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date: tx.date || new Date().toISOString().split('T')[0],
      type: tx.type || 'income',
      category: tx.category || 'ทั่วไป',
      amount: parseFloat(tx.amount) || 0,
      linkedCost: parseFloat(tx.linkedCost) || 0,
      paymentMethod: tx.paymentMethod || 'transfer',
      note: tx.note || '',
      tags: tx.tags || ''
    };

    this.transactions.unshift(newTx);
    this.saveToStorage();
    this.notify();
    return newTx;
  }

  updateTransaction(id, updatedTx) {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      this.transactions[index] = {
        ...this.transactions[index],
        ...updatedTx,
        amount: parseFloat(updatedTx.amount) || 0
      };
      this.saveToStorage();
      this.notify();
    }
  }

  deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.saveToStorage();
    this.notify();
  }

  // Football Kits Inventory Stock Management
  addStockItem(item) {
    const newItem = {
      id: 'stk-' + Date.now(),
      code: item.code || ('FB-' + Math.floor(1000 + Math.random() * 9000)),
      name: item.name || 'ชุดฟุตบอลใหม่',
      team: item.team || 'ทั่วไป',
      size: item.size || 'M',
      costPrice: parseFloat(item.costPrice) || 0,
      sellingPrice: parseFloat(item.sellingPrice) || 0,
      stockQty: parseInt(item.stockQty, 10) || 0,
      minQty: parseInt(item.minQty, 10) || 5,
      kitType: item.kitType || 'Home',
      season: item.season || '2026/2027',
      image: item.image || '',
      note: item.note || ''
    };

    this.inventory.unshift(newItem);
    this.saveToStorage();
    this.notify();
    return newItem;
  }

  updateStockItem(id, updatedData) {
    const idx = this.inventory.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.inventory[idx] = {
        ...this.inventory[idx],
        ...updatedData,
        costPrice: parseFloat(updatedData.costPrice) || 0,
        sellingPrice: parseFloat(updatedData.sellingPrice) || 0,
        stockQty: parseInt(updatedData.stockQty, 10) || 0,
        minQty: parseInt(updatedData.minQty, 10) || 5,
        kitType: updatedData.kitType || this.inventory[idx].kitType || 'Home',
        season: updatedData.season || this.inventory[idx].season || '2026/2027',
        image: updatedData.image !== undefined ? updatedData.image : this.inventory[idx].image
      };
      this.saveToStorage();
      this.notify();
    }
  }

  deleteStockItem(id) {
    this.inventory = this.inventory.filter(i => i.id !== id);
    this.saveToStorage();
    this.notify();
  }

  // Stock In / Stock Out with Auto-Transaction creation
  adjustStockQty(id, qtyChange, actionType = 'sell', note = '') {
    const item = this.inventory.find(i => i.id === id);
    if (!item) return false;

    const qty = Math.abs(parseInt(qtyChange, 10)) || 0;
    if (qty === 0) return false;

    if (actionType === 'sell') {
      if (item.stockQty < qty) {
        alert(`สต็อกสินค้าไม่เพียงพอ! (มีคงเหลือเพียง ${item.stockQty} ชุด)`);
        return false;
      }
      item.stockQty -= qty;
      const totalIncome = qty * item.sellingPrice;
      const totalCostLinked = qty * item.costPrice; // ต้นทุนรวมสำหรับ qty ชุดที่ขาย

      this.addTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        category: 'ขายชุดฟุตบอล',
        amount: totalIncome,
        linkedCost: totalCostLinked,
        paymentMethod: 'transfer',
        note: `[ขายชุดบอล] ${item.name} (${item.size}) จำนวน ${qty} ชุด ${note ? '(' + note + ')' : ''}`,
        tags: `ชุดบอล, ${item.team}, ${item.size}`
      });
    } else if (actionType === 'restock') {
      item.stockQty += qty;
      const totalCost = qty * item.costPrice;

      this.addTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'cost',
        category: 'สั่งซื้อชุดบอลเข้าสต็อก',
        amount: totalCost,
        paymentMethod: 'transfer',
        note: `[เติมสต็อก] ${item.name} (${item.size}) จำนวน ${qty} ชุด ${note ? '(' + note + ')' : ''}`,
        tags: `เติมสต็อก, ${item.team}`
      });
    }

    this.saveToStorage();
    this.notify();
    return true;
  }

  // POS Order Checkout Batch Process
  checkoutPOSOrder({ cart = [], discount = 0, paymentMethod = 'cash', cashReceived = 0, note = '' }) {
    if (!cart || cart.length === 0) return null;

    let subtotal = 0;
    const itemSummaryList = [];

    // Deduct stock for each cart item
    cart.forEach(cartItem => {
      const stockItem = this.inventory.find(i => i.id === cartItem.id);
      if (stockItem) {
        stockItem.stockQty = Math.max(0, stockItem.stockQty - cartItem.qty);
      }
      const lineTotal = cartItem.qty * cartItem.sellingPrice;
      subtotal += lineTotal;
      itemSummaryList.push(`${cartItem.name} (${cartItem.size}) x${cartItem.qty}`);
    });

    const disc = Math.max(0, parseFloat(discount) || 0);
    const grandTotal = Math.max(0, subtotal - disc);
    const received = parseFloat(cashReceived) || grandTotal;
    const change = Math.max(0, received - grandTotal);

    const orderId = 'POS-' + Date.now().toString().slice(-6);
    const dateStr = new Date().toISOString().split('T')[0];

    // Add Income Transaction to Accounting Ledger automatically!
    // Calculate total cost of goods sold (COGS) for net profit tracking
    let totalCOGS = 0;
    cart.forEach(cartItem => {
      const stockItem = this.inventory.find(i => i.id === cartItem.id);
      if (stockItem) {
        totalCOGS += cartItem.qty * (stockItem.costPrice || 0);
      }
    });

    this.addTransaction({
      date: dateStr,
      type: 'income',
      category: 'ขายชุดฟุตบอล',
      amount: grandTotal,
      linkedCost: totalCOGS,
      paymentMethod: paymentMethod,
      note: `[ขายหน้าร้าน POS #${orderId}] ${itemSummaryList.join(', ')} ${note ? '(' + note + ')' : ''}`,
      tags: `POS, ยอดขายหน้าร้าน, ${paymentMethod}`
    });

    this.saveToStorage();
    this.notify();

    return {
      orderId,
      date: dateStr,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      cart: [...cart],
      subtotal,
      discount: disc,
      grandTotal,
      paymentMethod,
      cashReceived: received,
      change,
      note
    };
  }

  // Summaries
  getSummary() {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalCost = 0;
    let directCostPaid = 0; // ยอดจ่ายออกจริงสำหรับรายการประเภท cost

    this.transactions.forEach(t => {
      const amt = t.amount || 0;
      if (t.type === 'income') {
        totalIncome += amt;
        if (t.linkedCost > 0) {
          totalCost += t.linkedCost;
        }
      }
      else if (t.type === 'expense') {
        totalExpense += amt;
      }
      else if (t.type === 'cost') {
        totalCost += amt;
        directCostPaid += amt;
      }
    });

    const totalOutflow = totalExpense + totalCost;
    const netProfit = totalIncome - totalOutflow;

    // เงินสดคงเหลือสะสมจริงในมือ/ธนาคาร = เงินสดตั้งต้น + รายรับรวมทั้งหมด - รายจ่าย - ต้นทุนที่จ่ายออกจริง
    const cashBalance = this.initialBalance + totalIncome - totalExpense - directCostPaid;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    let totalStockQty = 0;
    let totalStockValueCost = 0;
    let totalStockValueSell = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    this.inventory.forEach(item => {
      const q = item.stockQty || 0;
      totalStockQty += q;
      totalStockValueCost += q * (item.costPrice || 0);
      totalStockValueSell += q * (item.sellingPrice || 0);

      if (q === 0) outOfStockCount++;
      else if (q <= (item.minQty || 5)) lowStockCount++;
    });

    return {
      initialBalance: this.initialBalance,
      actualBalance: this.actualBalance,
      balanceDiff: cashBalance - this.actualBalance,  // ส่วนต่าง (บวก = บัญชีน้อยกว่าที่คำนวณ)
      totalIncome,
      totalExpense,
      totalCost,
      totalOutflow,
      netProfit,
      cashBalance,
      profitMargin,
      totalStockQty,
      totalStockValueCost,
      totalStockValueSell,
      lowStockCount,
      outOfStockCount,
      totalStockItems: this.inventory.length
    };
  }

  getFilteredTransactions({ search = '', type = 'all', category = 'all', month = 'all', year = 'all', dateFrom = '', dateTo = '' } = {}) {
    return this.transactions.filter(t => {
      if (type !== 'all' && t.type !== type) return false;
      if (category !== 'all' && t.category !== category) return false;

      // Date filters
      if (month !== 'all' && !t.date.startsWith(`${t.date.slice(0,4)}-${month}`)) return false;
      if (year !== 'all' && !t.date.startsWith(year)) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;

      if (search) {
        const q = search.toLowerCase();
        const inCat = t.category.toLowerCase().includes(q);
        const inNote = (t.note || '').toLowerCase().includes(q);
        const inTags = (t.tags || '').toLowerCase().includes(q);
        const inAmt = t.amount.toString().includes(q);
        if (!inCat && !inNote && !inTags && !inAmt) return false;
      }
      return true;
    });
  }

  // Compute summary for a filtered subset of transactions
  getFilteredSummary(filters = {}) {
    const txList = this.getFilteredTransactions(filters);
    let totalIncome = 0, totalExpense = 0, totalCost = 0;
    txList.forEach(t => {
      const amt = t.amount || 0;
      if (t.type === 'income') {
        totalIncome += amt;
        if (t.linkedCost > 0) {
          totalCost += t.linkedCost;
        }
      }
      else if (t.type === 'expense') totalExpense += amt;
      else if (t.type === 'cost') totalCost += amt;
    });
    const totalOutflow = totalExpense + totalCost;
    const netProfit = totalIncome - totalOutflow;

    // Cash Balance is always cumulative all-time total (includes carryover from previous months)
    const fullSummary = this.getSummary();
    const cashBalance = fullSummary.cashBalance;

    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    return { totalIncome, totalExpense, totalCost, totalOutflow, netProfit, cashBalance, profitMargin, initialBalance: this.initialBalance, txCount: txList.length };
  }

  // Get all unique years present in transactions
  getAvailableYears() {
    const years = new Set(this.transactions.map(t => t.date.slice(0,4)).filter(Boolean));
    return [...years].sort((a, b) => b - a); // descending
  }

  getFilteredInventory({ search = '', size = 'all', status = 'all' } = {}) {
    return this.inventory.filter(item => {
      if (size !== 'all' && item.size !== size) return false;
      if (status === 'in_stock' && item.stockQty <= (item.minQty || 5)) return false;
      if (status === 'low_stock' && (item.stockQty > (item.minQty || 5) || item.stockQty === 0)) return false;
      if (status === 'out_of_stock' && item.stockQty > 0) return false;

      if (search) {
        const q = search.toLowerCase();
        const inName = item.name.toLowerCase().includes(q);
        const inTeam = item.team.toLowerCase().includes(q);
        const inCode = item.code.toLowerCase().includes(q);
        const inKit = (item.kitType || '').toLowerCase().includes(q);
        const inSeason = (item.season || '').toLowerCase().includes(q);
        const inNote = item.note.toLowerCase().includes(q);
        if (!inName && !inTeam && !inCode && !inKit && !inSeason && !inNote) return false;
      }
      return true;
    });
  }

  // COD Orders Management (ANS, HAL, MX)
  addCODOrder(order) {
    const newOrder = {
      id: 'cod-' + Date.now(),
      date: order.date || new Date().toISOString().split('T')[0],
      courier: order.courier || 'ANS', // ANS, HAL, MX
      trackingNo: order.trackingNo || '',
      customerName: order.customerName || '',
      codAmount: parseFloat(order.codAmount) || 0,
      costAmount: parseFloat(order.costAmount) || 0,
      shippingFee: parseFloat(order.shippingFee) || 0,
      status: order.status || 'pending', // pending, completed, returned
      note: order.note || ''
    };

    this.codOrders.unshift(newOrder);
    this.saveToStorage();
    this.notify();
    return newOrder;
  }

  updateCODOrder(id, updatedData) {
    const idx = this.codOrders.findIndex(o => o.id === id);
    if (idx !== -1) {
      this.codOrders[idx] = {
        ...this.codOrders[idx],
        ...updatedData,
        codAmount: parseFloat(updatedData.codAmount) || 0,
        costAmount: parseFloat(updatedData.costAmount) || 0,
        shippingFee: parseFloat(updatedData.shippingFee) || 0
      };
      this.saveToStorage();
      this.notify();
    }
  }

  deleteCODOrder(id) {
    this.codOrders = this.codOrders.filter(o => o.id !== id);
    this.saveToStorage();
    this.notify();
  }

  updateCODStatus(id, newStatus) {
    const order = this.codOrders.find(o => o.id === id);
    if (!order) return;

    order.status = newStatus;

    // If marked as completed (โอนแล้ว), auto-add Income Transaction to ledger if not added yet
    if (newStatus === 'completed' && !order.incomeTxAdded) {
      order.incomeTxAdded = true;
      this.addTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        category: 'ขายชุดฟุตบอล',
        amount: order.codAmount,
        linkedCost: order.costAmount,
        paymentMethod: 'transfer',
        note: `[COD ${order.courier} โอนแล้ว] พัสดุ #${order.trackingNo} - ${order.customerName}`,
        tags: `COD, ${order.courier}, โอนแล้ว`
      });
    }

    this.saveToStorage();
    this.notify();
  }

  getCODSummaryByCourier(courierName, { month = 'all', year = 'all' } = {}) {
    const list = this.codOrders.filter(o => {
      if (o.courier !== courierName) return false;
      if (month !== 'all' && !o.date.startsWith(`${o.date.slice(0,4)}-${month}`)) return false;
      if (year !== 'all' && !o.date.startsWith(year)) return false;
      return true;
    });

    let totalCount = list.length;
    let pendingCount = 0;
    let totalAmount = 0;      // รวมเงิน
    let pendingAmount = 0;    // ค้างจ่าย
    let totalProfit = 0;      // กำไรรวม
    let actualProfit = 0;     // กำไรจริง

    list.forEach(o => {
      const cod = o.codAmount || 0;
      const cost = o.costAmount || 0;
      const profit = cod - cost;

      if (o.status !== 'returned') {
        totalAmount += cod;
        totalProfit += profit;
      }

      if (o.status === 'pending') {
        pendingCount++;
        pendingAmount += cod;
      } else if (o.status === 'completed') {
        actualProfit += profit;
      }
    });

    return {
      totalCount,
      pendingCount,
      totalAmount,
      pendingAmount,
      totalProfit,
      actualProfit
    };
  }

  getFilteredCODOrders({ search = '', courier = 'all', status = 'all', month = 'all', year = 'all', date = 'all' } = {}) {
    return this.codOrders.filter(o => {
      if (courier !== 'all' && o.courier !== courier) return false;
      if (status !== 'all' && o.status !== status) return false;
      if (month !== 'all' && !o.date.startsWith(`${o.date.slice(0,4)}-${month}`)) return false;
      if (year !== 'all' && !o.date.startsWith(year)) return false;
      if (date !== 'all' && o.date !== date) return false;

      if (search) {
        const q = search.toLowerCase();
        const inTrack = (o.trackingNo || '').toLowerCase().includes(q);
        const inCust = (o.customerName || '').toLowerCase().includes(q);
        const inProd = (o.productName || '').toLowerCase().includes(q);
        const inNote = (o.note || '').toLowerCase().includes(q);
        const inAmt = o.codAmount.toString().includes(q);
        if (!inTrack && !inCust && !inProd && !inNote && !inAmt) return false;
      }
      return true;
    });
  }

  getAvailableCODYears() {
    const years = new Set(this.codOrders.map(o => o.date.slice(0,4)).filter(Boolean));
    return [...years].sort((a, b) => b - a);
  }

  getAvailableCODDatesInMonth(month = 'all', year = 'all') {
    const filtered = this.codOrders.filter(o => {
      if (month !== 'all' && !o.date.startsWith(`${o.date.slice(0,4)}-${month}`)) return false;
      if (year !== 'all' && !o.date.startsWith(year)) return false;
      return true;
    });
    const dates = new Set(filtered.map(o => o.date).filter(Boolean));
    return [...dates].sort((a, b) => b.localeCompare(a));
  }

  resetToSampleData(triggerNotify = true) {
    this.transactions = generateSampleTransactions();
    this.initialBalance = DEFAULT_INITIAL_BALANCE;
    this.inventory = generateSampleStock();
    this.codOrders = [];
    this.saveToStorage();
    if (triggerNotify) this.notify();
  }
}

export const store = new BizStore();
