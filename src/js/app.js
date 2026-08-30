import confetti from 'canvas-confetti';
import { store } from './store.js';
import { renderCharts } from './charts.js';
import { exportToCSV, printFinancialReport, exportJSONBackup } from './export.js';
import { renderStockView } from './stock.js';
import { posManager } from './pos.js';
import { renderCODView, populateStockDropdownInCODModal, clearCODModalCart, setCODModalCart, codModalCart } from './cod.js';
import { firebaseSync } from './firebase.js';

// App Controller
class App {
  constructor() {
    // Auto-detect current month & year from calendar
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());

    this.currentFilterType = 'all';
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.editingTxId = null;

    // Stock Filters & State
    this.stockSearchQuery = '';
    this.stockSizeFilter = 'all';
    this.stockStatusFilter = 'all';
    this.editingStockId = null;

    // COD Tracking State & Filters (Default to Auto Current Month & Year)
    this.codSearchQuery = '';
    this.codCourierFilter = 'all';
    this.codStatusFilter = 'all';
    this.codMonth = currentMonth;
    this.codYear = currentYear;
    this.codDate = 'all';
    this.editingCODId = null;

    // Date Filters for Dashboard & Transactions (Default to Current Calendar Month & Year)
    this.dashMonth = currentMonth;
    this.dashYear = currentYear;
    this.dashDateFrom = '';
    this.dashDateTo = '';

    this.txMonth = currentMonth;
    this.txYear = currentYear;
    this.txDateFrom = '';
    this.txDateTo = '';

    this.init();
  }

  init() {
    this.bindEvents();

    // Set initial select dropdown values to current month
    const dashM = document.getElementById('dashFilterMonth');
    if (dashM) dashM.value = this.dashMonth;
    const txM = document.getElementById('txFilterMonth');
    if (txM) txM.value = this.txMonth;
    const codM = document.getElementById('codFilterMonth');
    if (codM) codM.value = this.codMonth;

    // Subscribe to store updates
    store.subscribe(() => this.render());

    // Initial render
    this.applyTheme(store.theme);
    this.render();

    // Initial badges update
    this.updateDashFilterBadge();
    this.updateTxDateFilterBadge();
    this.updateCODFilterBadge();
  }

  bindEvents() {
    // 1. Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // 2. Theme Toggle
    document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
      const nextTheme = store.theme === 'dark' ? 'light' : 'dark';
      store.setTheme(nextTheme);
      this.applyTheme(nextTheme);
      this.showToast(`สลับเป็น ${nextTheme === 'dark' ? 'Dark Mode' : 'Light Mode'} เรียบร้อย`);
    });

    // 3. Initial Balance Modal
    document.getElementById('btnInitialBalance')?.addEventListener('click', () => {
      document.getElementById('balAmount').value = store.initialBalance;
      this.openModal('balModal');
    });

    document.getElementById('btnCloseBalModal')?.addEventListener('click', () => this.closeModal('balModal'));
    document.getElementById('btnCancelBalModal')?.addEventListener('click', () => this.closeModal('balModal'));

    document.getElementById('balForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = parseFloat(document.getElementById('balAmount').value) || 0;
      store.setInitialBalance(val);
      this.closeModal('balModal');
      this.showToast('อัปเดตเงินสดเริ่มต้นเรียบร้อย (KIP)');
    });

    // 4. Actual Bank Balance (เงินในบัญชีจริง) Modal
    const openActualBal = () => {
      document.getElementById('actualBalAmount').value = store.actualBalance || '';
      this.openModal('actualBalModal');
    };
    document.getElementById('btnActualBalance')?.addEventListener('click', openActualBal);
    document.getElementById('btnEditActualBalance')?.addEventListener('click', openActualBal);
    document.getElementById('btnCloseActualBalModal')?.addEventListener('click', () => this.closeModal('actualBalModal'));
    document.getElementById('btnCancelActualBalModal')?.addEventListener('click', () => this.closeModal('actualBalModal'));
    document.getElementById('actualBalForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = parseFloat(document.getElementById('actualBalAmount').value) || 0;
      store.setActualBalance(val);
      this.closeModal('actualBalModal');
      this.showToast('บันทึกเงินในบัญชีจริงเรียบร้อย!');
    });

    // 4b. Firebase Cloud Sync Settings Modal & Data Upload
    const statusLogEl = document.getElementById('firebaseSyncStatusLog');

    document.getElementById('btnFirebaseStatus')?.addEventListener('click', () => {
      const urlInput = document.getElementById('firebaseDatabaseUrl');
      const chkAuto = document.getElementById('chkFirebaseAutoSync');
      if (urlInput) urlInput.value = firebaseSync.databaseUrl || '';
      if (chkAuto) chkAuto.checked = firebaseSync.autoSyncEnabled;
      if (statusLogEl) statusLogEl.style.display = 'none';
      this.openModal('firebaseModal');
    });

    document.getElementById('btnCloseFirebaseModal')?.addEventListener('click', () => this.closeModal('firebaseModal'));
    document.getElementById('btnSaveFirebaseSettings')?.addEventListener('click', () => {
      const url = document.getElementById('firebaseDatabaseUrl')?.value || '';
      const auto = document.getElementById('chkFirebaseAutoSync')?.checked;
      firebaseSync.setDatabaseUrl(url);
      firebaseSync.setAutoSync(auto);
      this.closeModal('firebaseModal');
      this.showToast('บันทึกการตั้งค่า Firebase Cloud Sync เรียบร้อย');
    });

    document.getElementById('btnUploadToFirebase')?.addEventListener('click', async () => {
      const url = document.getElementById('firebaseDatabaseUrl')?.value || '';
      const auto = document.getElementById('chkFirebaseAutoSync')?.checked;
      firebaseSync.setDatabaseUrl(url);
      firebaseSync.setAutoSync(auto);

      if (!url) {
        alert('กรุณากรอก Firebase Database URL ก่อนทำการอัปโหลด (เช่น https://your-project-id-default-rtdb.firebaseio.com/)');
        return;
      }

      if (statusLogEl) {
        statusLogEl.style.display = 'block';
        statusLogEl.textContent = '⏳ กำลังอัปโหลดข้อมูลทั้งหมดขึ้น Firebase Cloud...';
      }

      try {
        await firebaseSync.uploadLocalToCloud();
        if (statusLogEl) statusLogEl.textContent = '✅ อัปโหลดขึ้น Firebase Cloud สำเร็จเรียบร้อย!';
        this.showToast('⬆️ อัปโหลดข้อมูลขึ้น Firebase Cloud เรียบร้อยแล้ว!');
      } catch (err) {
        if (statusLogEl) statusLogEl.textContent = `❌ ${err.message}`;
        alert(`อัปโหลดล้มเหลว: ${err.message}`);
      }
    });

    document.getElementById('btnDownloadFromFirebase')?.addEventListener('click', async () => {
      const url = document.getElementById('firebaseDatabaseUrl')?.value || '';
      const auto = document.getElementById('chkFirebaseAutoSync')?.checked;
      firebaseSync.setDatabaseUrl(url);
      firebaseSync.setAutoSync(auto);

      if (!url) {
        alert('กรุณากรอก Firebase Database URL ก่อนดึงข้อมูล');
        return;
      }

      if (statusLogEl) {
        statusLogEl.style.display = 'block';
        statusLogEl.textContent = '⏳ กำลังดึงข้อมูลจาก Firebase Cloud ลงเครื่องนี้...';
      }

      try {
        await firebaseSync.downloadCloudToLocal();
        if (statusLogEl) statusLogEl.textContent = '✅ ดึงข้อมูลจาก Firebase Cloud สำเร็จเรียบร้อย!';
        this.showToast('⬇️ ดึงข้อมูลจาก Firebase Cloud สำเร็จเรียบร้อย!');
      } catch (err) {
        if (statusLogEl) statusLogEl.textContent = `❌ ${err.message}`;
        alert(`ดึงข้อมูลล้มเหลว: ${err.message}`);
      }
    });

    // 4b. Clear All Data
    document.getElementById('btnClearAllData')?.addEventListener('click', () => this.openModal('clearDataModal'));
    document.getElementById('btnCloseClearModal')?.addEventListener('click', () => this.closeModal('clearDataModal'));
    document.getElementById('btnCancelClearData')?.addEventListener('click', () => this.closeModal('clearDataModal'));
    document.getElementById('btnConfirmClearData')?.addEventListener('click', () => {
      store.clearAllData();
      this.closeModal('clearDataModal');
      this.showToast('ล้างข้อมูลทั้งหมดเรียบร้อย — พร้อมกรอกข้อมูลใหม่ของคุณได้เลย!');
    });


    // 5. CSV & PC Backup / Restore Buttons
    document.getElementById('btnExportCSV')?.addEventListener('click', () => {
      const filtered = store.getFilteredTransactions({
        search: this.searchQuery,
        type: this.currentFilterType,
        category: this.currentCategory
      });
      exportToCSV(filtered);
    });

    // Save Backup JSON to PC
    document.getElementById('btnBackupPC')?.addEventListener('click', () => {
      const backupData = store.exportAllDataJSON();
      exportJSONBackup(backupData);
      this.showToast('สำรองข้อมูลทั้งหมดลงเครื่อง PC เรียบร้อยแล้ว!');
    });

    // Restore Backup JSON from PC
    const fileInput = document.getElementById('fileRestoreJSON');
    document.getElementById('btnRestorePC')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (store.importAllDataJSON(data)) {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
            this.showToast('นำเข้าข้อมูลสำรองจากไฟล์ PC สำเร็จเรียบร้อย!');
          } else {
            alert('รูปแบบไฟล์สำรองไม่ถูกต้อง');
          }
        } catch (err) {
          alert('เกิดข้อผิดพลาดในการอ่านไฟล์สำรอง: ' + err.message);
        }
        fileInput.value = '';
      };
      reader.readAsText(file);
    });

    // 6. Transaction Modal & Form
    document.getElementById('btnOpenAddModal')?.addEventListener('click', () => {
      this.editingTxId = null;
      document.getElementById('txForm').reset();
      document.getElementById('txModalTitle').innerHTML = '<i class="fa-solid fa-circle-plus"></i> บันทึกรายการใหม่';
      document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
      // Default income is checked → show cost row
      const costRow = document.getElementById('txCostRow');
      if (costRow) costRow.style.display = 'flex';
      this.updateNetProfitPreview();
      this.openModal('txModal');
    });

    document.getElementById('btnCloseTxModal')?.addEventListener('click', () => this.closeModal('txModal'));
    document.getElementById('btnCancelTxModal')?.addEventListener('click', () => this.closeModal('txModal'));

    document.getElementById('txForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const txData = {
        type: document.querySelector('input[name="txType"]:checked')?.value || 'income',
        date: document.getElementById('txDate').value,
        amount: parseFloat(document.getElementById('txAmount').value) || 0,
        category: document.getElementById('txCategory').value,
        paymentMethod: document.getElementById('txPaymentMethod').value,
        note: document.getElementById('txNote').value,
        tags: document.getElementById('txTags').value,
        linkedCost: parseFloat(document.getElementById('txLinkedCost').value) || 0
      };

      if (this.editingTxId) {
        store.updateTransaction(this.editingTxId, txData);
        this.showToast('อัปเดตรายการเรียบร้อย');
      } else {
        store.addTransaction(txData);
        this.showToast('บันทึกรายการใหม่เรียบร้อยแล้ว');
      }

      this.closeModal('txModal');
    });

    // Show/Hide linkedCost row based on type selection
    const updateCostRowVisibility = () => {
      const type = document.querySelector('input[name="txType"]:checked')?.value;
      const costRow = document.getElementById('txCostRow');
      if (costRow) costRow.style.display = (type === 'income') ? 'flex' : 'none';
      this.updateNetProfitPreview();
    };
    document.querySelectorAll('input[name="txType"]').forEach(radio => {
      radio.addEventListener('change', updateCostRowVisibility);
    });

    // Live Net Profit preview
    document.getElementById('txLinkedCost')?.addEventListener('input', () => this.updateNetProfitPreview());
    document.getElementById('txAmount')?.addEventListener('input', () => this.updateNetProfitPreview());

    // Transaction Bill Modal
    document.getElementById('btnCloseTxBillModal')?.addEventListener('click', () => this.closeModal('txBillModal'));
    document.getElementById('btnCloseTxBillModal2')?.addEventListener('click', () => this.closeModal('txBillModal'));
    document.getElementById('btnPrintTxBill')?.addEventListener('click', () => {
      const content = document.getElementById('txBillContent')?.innerHTML || '';
      const win = window.open('', '_blank', 'width=400,height=600');
      win.document.write(`<html><head><title>บิลรายการ - Kila BizAccount</title><style>
        body{font-family:"Prompt",sans-serif;margin:24px;font-size:13px;color:#111;}
        .rcpt-header{text-align:center;margin-bottom:12px;}
        .rcpt-header h3{margin:0;font-size:16px;}
        .rcpt-line{display:flex;justify-content:space-between;padding:4px 0;}
        .rcpt-totals-box{border-top:2px solid #333;margin-top:10px;padding-top:10px;}
        .grand{font-weight:700;font-size:15px;}
        .rcpt-footer{text-align:center;margin-top:16px;font-size:11px;color:#888;}
        .hidden{display:none;}
      </style></head><body>${content}</body></html>`);
      win.document.close();
      win.print();
    });


    // 7. Transaction Filters & Search Controls
    document.getElementById('txSearch')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderTransactionsTable();
    });

    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentFilterType = e.currentTarget.dataset.filterType;
        this.renderTransactionsTable();
      });
    });

    document.getElementById('txCategoryFilter')?.addEventListener('change', (e) => {
      this.currentCategory = e.target.value;
      this.renderTransactionsTable();
    });

    // 7b. Transaction Date Filters
    document.getElementById('txFilterMonth')?.addEventListener('change', (e) => {
      this.txMonth = e.target.value;
      this.renderTransactionsTable();
      this.updateTxDateFilterBadge();
    });
    document.getElementById('txFilterYear')?.addEventListener('change', (e) => {
      this.txYear = e.target.value;
      this.renderTransactionsTable();
      this.updateTxDateFilterBadge();
    });
    document.getElementById('txFilterDateFrom')?.addEventListener('change', (e) => {
      this.txDateFrom = e.target.value;
      // Clear month/year selects if using range
      if (this.txDateFrom) { this.txMonth = 'all'; this.txYear = 'all'; document.getElementById('txFilterMonth').value = 'all'; document.getElementById('txFilterYear').value = 'all'; }
      this.renderTransactionsTable();
      this.updateTxDateFilterBadge();
    });
    document.getElementById('txFilterDateTo')?.addEventListener('change', (e) => {
      this.txDateTo = e.target.value;
      this.renderTransactionsTable();
      this.updateTxDateFilterBadge();
    });
    document.getElementById('btnTxClearDateFilter')?.addEventListener('click', () => {
      this.txMonth = 'all'; this.txYear = 'all'; this.txDateFrom = ''; this.txDateTo = '';
      document.getElementById('txFilterMonth').value = 'all';
      document.getElementById('txFilterYear').value = 'all';
      document.getElementById('txFilterDateFrom').value = '';
      document.getElementById('txFilterDateTo').value = '';
      this.renderTransactionsTable();
      this.updateTxDateFilterBadge();
    });

    // 7c. Dashboard Date Filters
    document.getElementById('dashFilterMonth')?.addEventListener('change', (e) => {
      this.dashMonth = e.target.value;
      this.renderDashboard();
      this.updateDashFilterBadge();
    });
    document.getElementById('dashFilterYear')?.addEventListener('change', (e) => {
      this.dashYear = e.target.value;
      this.renderDashboard();
      this.updateDashFilterBadge();
    });
    document.getElementById('dashFilterDateFrom')?.addEventListener('change', (e) => {
      this.dashDateFrom = e.target.value;
      if (this.dashDateFrom) { this.dashMonth = 'all'; this.dashYear = 'all'; document.getElementById('dashFilterMonth').value = 'all'; document.getElementById('dashFilterYear').value = 'all'; }
      this.renderDashboard();
      this.updateDashFilterBadge();
    });
    document.getElementById('dashFilterDateTo')?.addEventListener('change', (e) => {
      this.dashDateTo = e.target.value;
      this.renderDashboard();
      this.updateDashFilterBadge();
    });
    document.getElementById('btnDashClearFilter')?.addEventListener('click', () => {
      this.dashMonth = 'all'; this.dashYear = 'all'; this.dashDateFrom = ''; this.dashDateTo = '';
      document.getElementById('dashFilterMonth').value = 'all';
      document.getElementById('dashFilterYear').value = 'all';
      document.getElementById('dashFilterDateFrom').value = '';
      document.getElementById('dashFilterDateTo').value = '';
      this.renderDashboard();
      this.updateDashFilterBadge();
    });


    // 8. Football Kits Stock Management Events
    document.getElementById('btnOpenAddStockModal')?.addEventListener('click', () => {
      this.editingStockId = null;
      document.getElementById('stockForm').reset();
      this.resetStockImagePreview('');
      document.getElementById('stockModalTitle').innerHTML = '<i class="fa-solid fa-shirt"></i> เพิ่มรายการชุดฟุตบอลเข้าสต็อก';
      document.getElementById('stkCode').value = 'FB-' + Math.floor(1000 + Math.random() * 9000);
      this.openModal('stockModal');
    });

    document.getElementById('stkImageFile')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          this.resetStockImagePreview(evt.target.result);
        };
        reader.readAsDataURL(file);
      }
    });

    document.getElementById('btnRemoveStkImage')?.addEventListener('click', () => {
      this.resetStockImagePreview('');
    });

    document.getElementById('btnCloseStockModal')?.addEventListener('click', () => this.closeModal('stockModal'));
    document.getElementById('btnCancelStockModal')?.addEventListener('click', () => this.closeModal('stockModal'));

    document.getElementById('stockForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const stockData = {
        code: document.getElementById('stkCode').value,
        name: document.getElementById('stkName').value,
        team: document.getElementById('stkTeam').value,
        size: document.getElementById('stkSize').value,
        kitType: document.getElementById('stkKitType')?.value || 'Home',
        season: document.getElementById('stkSeason')?.value || '2026/2027',
        costPrice: parseFloat(document.getElementById('stkCostPrice').value) || 0,
        sellingPrice: parseFloat(document.getElementById('stkSellingPrice').value) || 0,
        stockQty: parseInt(document.getElementById('stkStockQty').value, 10) || 0,
        minQty: parseInt(document.getElementById('stkMinQty').value, 10) || 5,
        image: document.getElementById('stkImageBase64')?.value || '',
        note: document.getElementById('stkNote').value
      };

      if (this.editingStockId) {
        store.updateStockItem(this.editingStockId, stockData);
        this.showToast('อัปเดตข้อมูลชุดบอลเรียบร้อย');
      } else {
        store.addStockItem(stockData);
        this.showToast('เพิ่มชุดบอลเข้าสต็อกเรียบร้อยแล้ว!');
      }

      this.closeModal('stockModal');
    });

    document.getElementById('stockSearch')?.addEventListener('input', (e) => {
      this.stockSearchQuery = e.target.value;
      renderStockView(this.stockSearchQuery, this.stockSizeFilter, this.stockStatusFilter);
      this.attachStockTableListeners();
    });

    document.getElementById('stockSizeFilter')?.addEventListener('change', (e) => {
      this.stockSizeFilter = e.target.value;
      renderStockView(this.stockSearchQuery, this.stockSizeFilter, this.stockStatusFilter);
      this.attachStockTableListeners();
    });

    document.getElementById('stockStatusFilter')?.addEventListener('change', (e) => {
      this.stockStatusFilter = e.target.value;
      renderStockView(this.stockSearchQuery, this.stockSizeFilter, this.stockStatusFilter);
      this.attachStockTableListeners();
    });

    // Stock Adjust Modal (Sell / Restock)
    document.getElementById('btnCloseAdjModal')?.addEventListener('click', () => this.closeModal('stockAdjustModal'));
    document.getElementById('btnCancelAdjModal')?.addEventListener('click', () => this.closeModal('stockAdjustModal'));

    document.getElementById('stockAdjustForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const stkId = document.getElementById('adjStkId').value;
      const type = document.getElementById('adjType').value;
      const qty = parseInt(document.getElementById('adjQty').value, 10) || 0;
      const note = document.getElementById('adjNote').value;

      const success = store.adjustStockQty(stkId, qty, type, note);
      if (success) {
        this.closeModal('stockAdjustModal');
        if (type === 'sell') {
          confetti({ particleCount: 50, spread: 50, origin: { y: 0.8 } });
          this.showToast(`บันทึกการขายสำเร็จ! ตัดสต็อก ${qty} ชุด และบันทึกรายรับเรียบร้อย`);
        } else {
          this.showToast(`เติมสต็อกสำเร็จ! เพิ่มสต็อก ${qty} ชุด และบันทึกต้นทุนเรียบร้อย`);
        }
      }
    });

    // 8b. COD Courier Tracking Events
    const updateCODPricePreview = () => {
      const sel = document.getElementById('codStockItemId');
      const opt = sel?.options[sel.selectedIndex];
      const qty = parseInt(document.getElementById('codQty')?.value, 10) || 1;

      if (opt && opt.value) {
        const costPrice = parseFloat(opt.dataset.cost) || 0;
        const sellingPrice = parseFloat(opt.dataset.sell) || 0;

        const totalCost = costPrice * qty;
        const totalSell = sellingPrice * qty;
        const totalProfit = totalSell - totalCost;

        document.getElementById('lblCODCostPrice').textContent = `₭${totalCost.toLocaleString()}`;
        document.getElementById('lblCODSellingPrice').textContent = `₭${totalSell.toLocaleString()}`;
        document.getElementById('lblCODProfit').textContent = `₭${totalProfit.toLocaleString()}`;
      } else {
        document.getElementById('lblCODCostPrice').textContent = '₭0';
        document.getElementById('lblCODSellingPrice').textContent = '₭0';
        document.getElementById('lblCODProfit').textContent = '₭0';
      }
    };

    document.getElementById('btnOpenAddCODModal')?.addEventListener('click', () => {
      this.editingCODId = null;
      document.getElementById('codForm').reset();
      clearCODModalCart();
      const s = document.getElementById('codStockSearch'); if (s) s.value = '';
      populateStockDropdownInCODModal();
      document.getElementById('codModalTitle').innerHTML = '<i class="fa-solid fa-truck-fast"></i> บันทึกรายการ COD ขนส่ง';
      document.getElementById('codDate').value = new Date().toISOString().split('T')[0];
      this.openModal('codModal');
    });

    document.getElementById('btnClearCODModalCart')?.addEventListener('click', () => {
      clearCODModalCart();
    });

    document.getElementById('codStockSearch')?.addEventListener('input', (e) => {
      populateStockDropdownInCODModal(e.target.value);
    });

    document.getElementById('btnCloseCODModal')?.addEventListener('click', () => this.closeModal('codModal'));
    document.getElementById('btnCancelCODModal')?.addEventListener('click', () => this.closeModal('codModal'));

    document.getElementById('codForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (codModalCart.length === 0) {
        alert('กรุณาคลิกเลือกชุดบอลอย่างน้อย 1 รายการลงพัสดุก่อนบันทึก');
        return;
      }

      let totalCost = 0;
      let totalSell = 0;
      let totalQty = 0;
      const productSummaries = [];

      codModalCart.forEach(item => {
        totalCost += (item.costPrice || 0) * item.qty;
        totalSell += (item.sellingPrice || 0) * item.qty;
        totalQty += item.qty;
        productSummaries.push(`${item.name} (${item.size}) x${item.qty}`);
      });

      const codData = {
        courier: document.getElementById('codCourier').value,
        date: document.getElementById('codDate').value,
        trackingNo: document.getElementById('codTrackingNo').value,
        customerName: document.getElementById('codCustomerName').value,
        items: [...codModalCart],
        productName: productSummaries.join(', '),
        qty: totalQty,
        codAmount: totalSell,
        costAmount: totalCost,
        status: document.getElementById('codStatus').value,
        note: document.getElementById('codNote')?.value || ''
      };

      if (this.editingCODId) {
        store.updateCODOrder(this.editingCODId, codData);
        this.showToast('อัปเดตรายการ COD เรียบร้อย');
      } else {
        store.addCODOrder(codData);
        this.showToast('เพิ่มรายการ COD เรียบร้อยแล้ว!');
      }

      this.closeModal('codModal');
    });

    document.getElementById('codSearch')?.addEventListener('input', (e) => {
      this.codSearchQuery = e.target.value;
      this.renderCODPage();
    });

    document.getElementById('codCourierFilter')?.addEventListener('change', (e) => {
      this.codCourierFilter = e.target.value;
      this.renderCODPage();
    });

    document.getElementById('codStatusFilter')?.addEventListener('change', (e) => {
      this.codStatusFilter = e.target.value;
      this.renderCODPage();
    });

    document.getElementById('codFilterMonth')?.addEventListener('change', (e) => {
      this.codMonth = e.target.value;
      this.codDate = 'all';
      this.renderCODPage();
    });

    document.getElementById('codFilterYear')?.addEventListener('change', (e) => {
      this.codYear = e.target.value;
      this.codDate = 'all';
      this.renderCODPage();
    });

    document.getElementById('codFilterDate')?.addEventListener('change', (e) => {
      this.codDate = e.target.value;
      this.renderCODPage();
    });

    document.getElementById('btnResetCODFilters')?.addEventListener('click', () => {
      this.codSearchQuery = '';
      this.codCourierFilter = 'all';
      this.codStatusFilter = 'all';
      this.codMonth = 'all';
      this.codYear = 'all';
      this.codDate = 'all';

      const s = document.getElementById('codSearch'); if (s) s.value = '';
      const c = document.getElementById('codCourierFilter'); if (c) c.value = 'all';
      const st = document.getElementById('codStatusFilter'); if (st) st.value = 'all';
      const m = document.getElementById('codFilterMonth'); if (m) m.value = 'all';
      const y = document.getElementById('codFilterYear'); if (y) y.value = 'all';
      const d = document.getElementById('codFilterDate'); if (d) d.value = 'all';

      this.renderCODPage();
    });

    // 9. Print Report Button
    document.getElementById('btnPrintReport')?.addEventListener('click', () => {
      const summary = store.getSummary();
      printFinancialReport(summary, store.transactions, store.inventory);
    });
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('#btnThemeToggle i');
    if (icon) {
      icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabName}`);
    });

    if (tabName === 'dashboard') {
      this.renderDashboard();
    } else if (tabName === 'pos') {
      posManager.renderCatalog();
      posManager.renderCart();
    } else if (tabName === 'stock') {
      renderStockView(this.stockSearchQuery, this.stockSizeFilter, this.stockStatusFilter);
      this.attachStockTableListeners();
    } else if (tabName === 'cod') {
      this.renderCODPage();
    } else if (tabName === 'transactions') {
      this.renderTransactionsTable();
    }
  }

  openModal(modalId) {
    document.getElementById(modalId)?.classList.remove('hidden');
  }

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
  }

  showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--income-color)"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  render() {
    // Populate year dropdowns every time data might change
    this.populateYearDropdowns();

    const summary = store.getSummary(); // full summary for header balance
    const lblBal = document.getElementById('lblInitialBalance');
    if (lblBal) lblBal.textContent = `₭${summary.initialBalance.toLocaleString()}`;

    const lblActual = document.getElementById('lblActualBalance');
    if (lblActual) lblActual.textContent = `₭${summary.actualBalance.toLocaleString()}`;

    // Render filtered dashboard
    this.renderDashboard();

    // Render Transactions Table
    this.renderTransactionsTable();

    // Render Football Kits Stock Metrics & Table
    this.renderStockMetrics(summary);
    renderStockView(this.stockSearchQuery, this.stockSizeFilter, this.stockStatusFilter);
    this.attachStockTableListeners();

    // Render COD Tracking View
    this.renderCODPage();

    // Render POS Catalog & Cart
    posManager.renderCatalog();
    posManager.renderCart();

    // Render P&L Statement Report (KIP) — always uses full data
    this.renderPNLReport(summary);
  }

  // Populate year dropdowns from actual transaction data + current calendar year
  populateYearDropdowns() {
    const years = store.getAvailableYears();
    const currentYear = String(new Date().getFullYear());
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
    }

    ['dashFilterYear', 'txFilterYear', 'codFilterYear'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      let targetVal = 'all';
      if (id === 'dashFilterYear') targetVal = this.dashYear;
      else if (id === 'txFilterYear') targetVal = this.txYear;
      else if (id === 'codFilterYear') targetVal = this.codYear;

      sel.innerHTML = '<option value="all">-- ทุกปี --</option>';
      years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = `ปี ${y}`;
        sel.appendChild(opt);
      });
      sel.value = years.includes(targetVal) ? targetVal : 'all';
    });
  }

  renderCODPage() {
    renderCODView(this.codSearchQuery, this.codCourierFilter, this.codStatusFilter, this.codMonth, this.codYear, this.codDate);
    this.attachCODTableListeners();
    this.updateCODFilterBadge();
  }

  updateCODFilterBadge() {
    const isFiltered = this.codMonth !== 'all' || this.codYear !== 'all' || this.codDate !== 'all' || this.codCourierFilter !== 'all' || this.codStatusFilter !== 'all';
    const badge = document.getElementById('codFilterBadge');
    const badgeText = document.getElementById('codFilterBadgeText');
    if (!badge) return;
    if (isFiltered) {
      badge.classList.remove('hidden');
      const parts = [];
      if (this.codYear !== 'all') parts.push(`ปี ${this.codYear}`);
      if (this.codMonth !== 'all') parts.push(document.querySelector(`#codFilterMonth option[value="${this.codMonth}"]`)?.textContent || '');
      if (this.codDate !== 'all') parts.push(`วันที่ ${this.codDate}`);
      if (this.codCourierFilter !== 'all') parts.push(this.codCourierFilter);
      if (this.codStatusFilter !== 'all') parts.push(document.querySelector(`#codStatusFilter option[value="${this.codStatusFilter}"]`)?.textContent || '');
      if (badgeText) badgeText.textContent = `กรอง: ${parts.join(' | ')}`;
    } else {
      badge.classList.add('hidden');
    }
  }

  renderDashboard() {
    const dashFilters = {
      month: this.dashMonth,
      year: this.dashYear,
      dateFrom: this.dashDateFrom,
      dateTo: this.dashDateTo
    };
    const summary = store.getFilteredSummary(dashFilters);
    const filteredTx = store.getFilteredTransactions(dashFilters);
    const fullSummary = store.getSummary(); // for actual balance (not date-filtered)

    // Dashboard Metrics (filtered)
    document.getElementById('metricCashBalance').textContent = `₭${summary.cashBalance.toLocaleString()}`;
    document.getElementById('metricTotalIncome').textContent = `₭${summary.totalIncome.toLocaleString()}`;
    document.getElementById('metricTotalCost').textContent = `₭${summary.totalCost.toLocaleString()}`;
    document.getElementById('metricTotalExpense').textContent = `₭${summary.totalExpense.toLocaleString()}`;

    const netProfitEl = document.getElementById('metricNetProfit');
    if (netProfitEl) {
      netProfitEl.textContent = `₭${summary.netProfit.toLocaleString()}`;
      netProfitEl.style.color = summary.netProfit >= 0 ? 'var(--income-color)' : 'var(--expense-color)';
    }
    const marginEl = document.getElementById('metricProfitMargin');
    if (marginEl) marginEl.textContent = `อัตรากำไร: ${summary.profitMargin.toFixed(1)}%`;

    // เงินในบัญชีจริง (always from full data, not date-filtered)
    const actualBal = fullSummary.actualBalance;
    const cashBal   = fullSummary.cashBalance;
    const diff      = cashBal - actualBal;

    const actualEl = document.getElementById('metricActualBalance');
    if (actualEl) actualEl.textContent = `₭${actualBal.toLocaleString()}`;

    const diffEl = document.getElementById('metricBalanceDiff');
    const diffLbl = document.getElementById('metricBalanceDiffLabel');
    if (diffEl) {
      diffEl.textContent = `₭${Math.abs(diff).toLocaleString()}`;
      if (actualBal === 0) {
        diffEl.style.color = 'var(--text-dim)';
        if (diffLbl) diffLbl.textContent = '— ยังไม่ได้บันทึกเงินจริง';
      } else if (diff === 0) {
        diffEl.style.color = 'var(--income-color)';
        if (diffLbl) diffLbl.textContent = '✅ ยอดตรงกันทุกบาท!';
      } else if (diff > 0) {
        diffEl.style.color = 'var(--expense-color)';
        if (diffLbl) diffLbl.textContent = `⚠️ บัญชีจริงน้อยกว่าที่คำนวณ ₭${diff.toLocaleString()}`;
      } else {
        diffEl.style.color = '#818cf8';
        if (diffLbl) diffLbl.textContent = `ℹ️ บัญชีจริงมากกว่าที่คำนวณ ₭${Math.abs(diff).toLocaleString()}`;
      }
    }

    // Charts with filtered data
    renderCharts(filteredTx, store.initialBalance, store.theme === 'dark');
  }

  updateDashFilterBadge() {
    const isFiltered = this.dashMonth !== 'all' || this.dashYear !== 'all' || this.dashDateFrom || this.dashDateTo;
    const badge = document.getElementById('dashFilterBadge');
    const badgeText = document.getElementById('dashFilterBadgeText');
    if (!badge) return;
    if (isFiltered) {
      badge.classList.remove('hidden');
      const parts = [];
      if (this.dashYear !== 'all') parts.push(`ปี ${this.dashYear}`);
      if (this.dashMonth !== 'all') parts.push(document.querySelector(`#dashFilterMonth option[value="${this.dashMonth}"]`)?.textContent || '');
      if (this.dashDateFrom) parts.push(`เริ่ม ${this.dashDateFrom}`);
      if (this.dashDateTo) parts.push(`ถึง ${this.dashDateTo}`);
      if (badgeText) badgeText.textContent = `กรอง: ${parts.join(' | ')}`;
    } else {
      badge.classList.add('hidden');
    }
  }

  updateTxDateFilterBadge() {
    const isFiltered = this.txMonth !== 'all' || this.txYear !== 'all' || this.txDateFrom || this.txDateTo;
    const badge = document.getElementById('txDateFilterBadge');
    const badgeText = document.getElementById('txDateFilterBadgeText');
    if (!badge) return;
    if (isFiltered) {
      badge.classList.remove('hidden');
      const parts = [];
      if (this.txYear !== 'all') parts.push(`ปี ${this.txYear}`);
      if (this.txMonth !== 'all') parts.push(document.querySelector(`#txFilterMonth option[value="${this.txMonth}"]`)?.textContent || '');
      if (this.txDateFrom) parts.push(`เริ่ม ${this.txDateFrom}`);
      if (this.txDateTo) parts.push(`ถึง ${this.txDateTo}`);
      if (badgeText) badgeText.textContent = `กรอง: ${parts.join(' | ')}`;
    } else {
      badge.classList.add('hidden');
    }
  }


  renderTransactionsTable() {
    const tbody = document.getElementById('txTableBody');
    const emptyState = document.getElementById('txEmptyState');
    if (!tbody) return;

    const filtered = store.getFilteredTransactions({
      search: this.searchQuery,
      type: this.currentFilterType,
      category: this.currentCategory,
      month: this.txMonth,
      year: this.txYear,
      dateFrom: this.txDateFrom,
      dateTo: this.txDateTo
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }

    emptyState?.classList.add('hidden');

    const methodMap = { transfer: 'โอนเงิน', cash: 'เงินสด', card: 'บัตรเครดิต' };
    const badgeMap = {
      income: '<span class="badge badge-income">🟢 รายรับ</span>',
      cost: '<span class="badge badge-cost">🟠 ต้นทุน</span>',
      expense: '<span class="badge badge-expense">🔴 รายจ่าย</span>'
    };

    tbody.innerHTML = filtered.map(t => {
      const netProfit = (t.type === 'income' && t.linkedCost > 0)
        ? t.amount - t.linkedCost
        : null;
      const netProfitCell = netProfit !== null
        ? `<span style="font-weight:700;color:${netProfit >= 0 ? 'var(--income-color)' : 'var(--expense-color)'}">₭${netProfit.toLocaleString()}</span>`
        : `<span style="color:var(--text-dim);font-size:11px;">-</span>`;
      return `
      <tr>
        <td><strong>${t.date}</strong></td>
        <td>${badgeMap[t.type] || t.type}</td>
        <td>${t.category}</td>
        <td>
          <div>${t.note || '-'}</div>
          ${t.tags ? `<small style="color: var(--text-dim);"><i class="fa-solid fa-tag"></i> ${t.tags}</small>` : ''}
        </td>
        <td><small>${methodMap[t.paymentMethod] || t.paymentMethod}</small></td>
        <td class="text-right amt-${t.type}">
          ${t.type === 'income' ? '+' : '-'}₭${t.amount.toLocaleString()}
        </td>
        <td class="text-right">${netProfitCell}</td>
        <td class="text-center">
          <div class="action-btns">
            <button class="btn btn-icon btn-sm btn-view-bill" data-id="${t.id}" title="ดูบิล" style="color:var(--accent-primary);">
              <i class="fa-solid fa-file-invoice"></i>
            </button>
            <button class="btn btn-icon btn-sm btn-edit" data-id="${t.id}" title="แก้ไข">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-icon btn-sm btn-delete" data-id="${t.id}" title="ลบ">
              <i class="fa-solid fa-trash" style="color: var(--expense-color)"></i>
            </button>
          </div>
        </td>
      </tr>
    `}).join('');


    // Attach View Bill, Edit & Delete Listeners
    tbody.querySelectorAll('.btn-view-bill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.showTxBill(id);
      });
    });

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.editTransaction(id);
      });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
          store.deleteTransaction(id);
          this.showToast('ลบรายการเรียบร้อย');
        }
      });
    });
  }

  attachCODTableListeners() {
    const tbody = document.getElementById('codTableBody');
    if (!tbody) return;

    tbody.querySelectorAll('.btn-cod-complete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        store.updateCODStatus(id, 'completed');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        this.showToast('อัปเดตสถานะเป็น "โอนแล้ว" และลงบันทึกรายรับให้อัตโนมัติ!');
      });
    });

    tbody.querySelectorAll('.btn-cod-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.editCODOrder(id);
      });
    });

    tbody.querySelectorAll('.btn-cod-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการ COD นี้?')) {
          store.deleteCODOrder(id);
          this.showToast('ลบรายการ COD เรียบร้อย');
        }
      });
    });
  }

  editCODOrder(id) {
    const order = store.codOrders.find(o => o.id === id);
    if (!order) return;

    this.editingCODId = id;
    document.getElementById('codModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> แก้ไขรายการ COD';

    const s = document.getElementById('codStockSearch'); if (s) s.value = '';
    setCODModalCart(order.items || []);
    populateStockDropdownInCODModal();

    document.getElementById('codCourier').value = order.courier;
    document.getElementById('codDate').value = order.date;
    document.getElementById('codTrackingNo').value = order.trackingNo;
    document.getElementById('codCustomerName').value = order.customerName || '';
    document.getElementById('codStatus').value = order.status;
    const noteEl = document.getElementById('codNote'); if (noteEl) noteEl.value = order.note || '';

    this.openModal('codModal');
  }

  editTransaction(id) {
    const tx = store.transactions.find(t => t.id === id);
    if (!tx) return;

    this.editingTxId = id;
    document.getElementById('txModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> แก้ไขรายการ';
    
    const radio = document.querySelector(`input[name="txType"][value="${tx.type}"]`);
    if (radio) radio.checked = true;

    document.getElementById('txDate').value = tx.date;
    document.getElementById('txAmount').value = tx.amount;
    document.getElementById('txCategory').value = tx.category;
    document.getElementById('txPaymentMethod').value = tx.paymentMethod;
    document.getElementById('txNote').value = tx.note || '';
    document.getElementById('txTags').value = tx.tags || '';
    document.getElementById('txLinkedCost').value = tx.linkedCost || '';

    // Show/hide cost row
    const costRow = document.getElementById('txCostRow');
    if (costRow) costRow.style.display = tx.type === 'income' ? 'flex' : 'none';
    this.updateNetProfitPreview();

    this.openModal('txModal');
  }

  updateNetProfitPreview() {
    const amount = parseFloat(document.getElementById('txAmount')?.value) || 0;
    const cost = parseFloat(document.getElementById('txLinkedCost')?.value) || 0;
    const netProfit = amount - cost;
    const previewEl = document.getElementById('txNetProfitPreview');
    if (previewEl) {
      previewEl.textContent = `₭${netProfit.toLocaleString()}`;
      previewEl.style.color = netProfit >= 0 ? 'var(--income-color)' : 'var(--expense-color)';
    }
  }

  showTxBill(id) {
    const tx = store.transactions.find(t => t.id === id);
    if (!tx) return;

    const methodMap = { transfer: 'โอนเงิน', cash: 'เงินสด', card: 'บัตรเครดิต' };
    const typeMap = { income: 'รายรับ 🟢', cost: 'ต้นทุน 🟠', expense: 'รายจ่าย 🔴' };

    // Populate bill content
    document.getElementById('billTxId').textContent = '#TX-' + tx.id.toString().slice(-6).toUpperCase();
    document.getElementById('billDate').textContent = tx.date;
    document.getElementById('billType').textContent = typeMap[tx.type] || tx.type;
    document.getElementById('billCategory').textContent = tx.category;
    document.getElementById('billPaymentMethod').textContent = methodMap[tx.paymentMethod] || tx.paymentMethod;
    document.getElementById('billNote').textContent = tx.note || '-';
    document.getElementById('billTags').textContent = tx.tags || '-';
    
    // Amount label
    const amountLabel = document.getElementById('billAmountLabel');
    const amountEl = document.getElementById('billAmount');
    if (tx.type === 'income') {
      amountLabel.textContent = 'ราคาขาย / รายรับ:';
      amountEl.className = 'text-emerald';
    } else if (tx.type === 'cost') {
      amountLabel.textContent = 'จำนวนต้นทุน:';
      amountEl.className = 'text-amber';
    } else {
      amountLabel.textContent = 'จำนวนรายจ่าย:';
      amountEl.className = 'text-rose';
    }
    amountEl.textContent = `₭${tx.amount.toLocaleString()}`;
    amountEl.style.fontSize = '18px';
    amountEl.style.fontWeight = '700';

    // Net Profit Section (for all income transactions)
    const netProfitSection = document.getElementById('billNetProfitSection');
    if (tx.type === 'income') {
      netProfitSection?.classList.remove('hidden');
      const linkedCost = tx.linkedCost || 0;
      const netProfit = tx.amount - linkedCost;

      document.getElementById('billSellingPrice').textContent = `₭${tx.amount.toLocaleString()}`;

      const costEl = document.getElementById('billLinkedCost');
      if (linkedCost > 0) {
        costEl.textContent = `₭${linkedCost.toLocaleString()}`;
        costEl.style.color = 'var(--cost-color)';
      } else {
        costEl.textContent = '— ยังไม่ได้ระบุ (แก้ไขรายการเพื่อเพิ่ม)';
        costEl.style.color = 'var(--text-dim)';
        costEl.style.fontSize = '11px';
      }

      const netEl = document.getElementById('billNetProfit');
      if (linkedCost > 0) {
        netEl.textContent = `₭${netProfit.toLocaleString()}`;
        netEl.style.color = netProfit >= 0 ? 'var(--income-color)' : 'var(--expense-color)';
      } else {
        netEl.textContent = '— (ต้องระบุต้นทุนก่อน)';
        netEl.style.color = 'var(--text-dim)';
        netEl.style.fontSize = '12px';
      }
    } else {
      netProfitSection?.classList.add('hidden');
    }

    this.openModal('txBillModal');
  }

  renderStockMetrics(summary) {
    document.getElementById('stkTotalQty').textContent = `${summary.totalStockQty.toLocaleString()} ชุด`;
    document.getElementById('stkTotalCostVal').textContent = `₭${summary.totalStockValueCost.toLocaleString()}`;
    document.getElementById('stkTotalSellVal').textContent = `₭${summary.totalStockValueSell.toLocaleString()}`;
    
    const alertCount = summary.lowStockCount + summary.outOfStockCount;
    document.getElementById('stkAlertCount').textContent = `${alertCount} รายการ`;
  }

  attachStockTableListeners() {
    const tbody = document.getElementById('stockTableBody');
    if (!tbody) return;

    tbody.querySelectorAll('.btn-stock-out').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.openStockAdjustModal(id, 'sell');
      });
    });

    tbody.querySelectorAll('.btn-stock-in').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.openStockAdjustModal(id, 'restock');
      });
    });

    tbody.querySelectorAll('.btn-edit-stock').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.editStockItem(id);
      });
    });

    tbody.querySelectorAll('.btn-delete-stock').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้าชุดบอลนี้ออกจากสต็อก?')) {
          store.deleteStockItem(id);
          this.showToast('ลบสินค้าออกจากสต็อกเรียบร้อย');
        }
      });
    });
  }

  openStockAdjustModal(id, actionType) {
    const item = store.inventory.find(i => i.id === id);
    if (!item) return;

    document.getElementById('adjStkId').value = id;
    document.getElementById('adjType').value = actionType;
    document.getElementById('adjQty').value = 1;
    document.getElementById('adjNote').value = '';

    const titleEl = document.getElementById('adjModalTitle');
    const labelEl = document.getElementById('adjQtyLabel');
    const btnSubmit = document.getElementById('btnSubmitAdj');

    if (actionType === 'sell') {
      titleEl.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> บันทึกการขายชุดบอล (Stock Out)';
      labelEl.textContent = `จำนวนที่ขายออก (ชุด) - ราคาขาย ₭${item.sellingPrice.toLocaleString()}/ชุด`;
      btnSubmit.className = 'btn btn-primary';
      btnSubmit.textContent = 'ยืนยันตัดสต็อก & บันทึกรายรับ';
    } else {
      titleEl.innerHTML = '<i class="fa-solid fa-boxes-packing"></i> เติมสต็อกชุดบอล (Stock In)';
      labelEl.textContent = `จำนวนที่สั่งซื้อเพิ่ม (ชุด) - ราคาทุน ₭${item.costPrice.toLocaleString()}/ชุด`;
      btnSubmit.className = 'btn btn-secondary';
      btnSubmit.textContent = 'ยืนยันเพิ่มสต็อก & บันทึกต้นทุน';
    }

    document.getElementById('adjProdName').textContent = `${item.name} (ไซส์ ${item.size})`;
    document.getElementById('adjProdMeta').textContent = `สต็อกปัจจุบัน: ${item.stockQty} ชุด | ทีม: ${item.team}`;

    this.openModal('stockAdjustModal');
  }

  resetStockImagePreview(imageSrc = '') {
    const hiddenInput = document.getElementById('stkImageBase64');
    const fileInput = document.getElementById('stkImageFile');
    const imgPreview = document.getElementById('stkImagePreview');
    const placeholder = document.getElementById('stkImagePlaceholder');
    const removeBtn = document.getElementById('btnRemoveStkImage');

    if (fileInput) fileInput.value = '';
    if (hiddenInput) hiddenInput.value = imageSrc || '';

    if (imageSrc) {
      if (imgPreview) { imgPreview.src = imageSrc; imgPreview.style.display = 'block'; }
      if (placeholder) placeholder.style.display = 'none';
      if (removeBtn) removeBtn.classList.remove('hidden');
    } else {
      if (imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
      if (placeholder) placeholder.style.display = 'block';
      if (removeBtn) removeBtn.classList.add('hidden');
    }
  }

  editStockItem(id) {
    const item = store.inventory.find(i => i.id === id);
    if (!item) return;

    this.editingStockId = id;
    document.getElementById('stockModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> แก้ไขข้อมูลชุดฟุตบอลในสต็อก';
    
    document.getElementById('stkCode').value = item.code;
    document.getElementById('stkName').value = item.name;
    document.getElementById('stkTeam').value = item.team;
    document.getElementById('stkSize').value = item.size;
    const kitSelect = document.getElementById('stkKitType'); if (kitSelect) kitSelect.value = item.kitType || 'Home';
    const seasonSelect = document.getElementById('stkSeason'); if (seasonSelect) seasonSelect.value = item.season || '2026/2027';
    document.getElementById('stkCostPrice').value = item.costPrice;
    document.getElementById('stkSellingPrice').value = item.sellingPrice;
    document.getElementById('stkStockQty').value = item.stockQty;
    document.getElementById('stkMinQty').value = item.minQty || 5;
    document.getElementById('stkNote').value = item.note || '';

    this.resetStockImagePreview(item.image || '');

    this.openModal('stockModal');
  }

  renderPNLReport(summary) {
    document.getElementById('pnlTotalIncome').textContent = `₭${summary.totalIncome.toLocaleString()}`;
    document.getElementById('pnlTotalCost').textContent = `₭${summary.totalCost.toLocaleString()}`;
    
    const grossProfit = summary.totalIncome - summary.totalCost;
    document.getElementById('pnlGrossProfit').textContent = `₭${grossProfit.toLocaleString()}`;

    let expMarketing = 0, expRent = 0, expShipping = 0, expOther = 0;
    store.transactions.forEach(t => {
      if (t.type === 'expense') {
        if (t.category.includes('การตลาด')) expMarketing += t.amount;
        else if (t.category.includes('เช่า') || t.category.includes('ไฟ')) expRent += t.amount;
        else if (t.category.includes('ขนส่ง')) expShipping += t.amount;
        else expOther += t.amount;
      }
    });

    document.getElementById('pnlExpMarketing').textContent = `₭${expMarketing.toLocaleString()}`;
    document.getElementById('pnlExpRent').textContent = `₭${expRent.toLocaleString()}`;
    document.getElementById('pnlExpShipping').textContent = `₭${expShipping.toLocaleString()}`;
    document.getElementById('pnlExpOther').textContent = `₭${expOther.toLocaleString()}`;
    document.getElementById('pnlTotalExpense').textContent = `₭${summary.totalExpense.toLocaleString()}`;

    const pnlNet = document.getElementById('pnlNetProfit');
    if (pnlNet) {
      pnlNet.textContent = `₭${summary.netProfit.toLocaleString()}`;
      pnlNet.style.color = summary.netProfit >= 0 ? 'var(--income-color)' : 'var(--expense-color)';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
