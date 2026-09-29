// Shopee & Lazada Analytics Dashboard - Logic & Visualization App

let dashboardData = null;
let charts = {};
let currentPlatform = 'shopee'; // 'shopee', 'lazada', 'all'
let currentMonthFilter = 'all'; // 'all', '2026-08', '2026-09'

function destroyChart(key) {
  if (charts[key]) {
    try {
      charts[key].destroy();
    } catch (e) {}
    delete charts[key];
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initPlatformSelector();
  initMonthSelector();
  initImportModule();
  initIncomeModule();
  await loadData();
  await loadIncomeData();
});

// Tab Navigation Logic
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  const titles = {
    'tab-overview': { title: 'Shop Overview', subtitle: 'Executive summary & core health metrics for First Protect' },
    'tab-sales': { title: 'Sales & Orders Breakdown', subtitle: 'Fulfillment stages: Placed vs Confirmed vs Paid orders' },
    'tab-traffic': { title: 'Traffic & Device Analytics', subtitle: 'Visitor acquisition, page views, and App vs PC breakdown' },
    'tab-sources': { title: 'Traffic Sources & Channels', subtitle: 'Performance across Organic Search, Ads & Marketing Channels' },
    'tab-product': { title: 'Product Funnel & Engagement', subtitle: 'Product page views, Add-to-Cart conversions & buyer interest' },
    'tab-calendar': { title: 'Daily Sales Calendar & Heatmap', subtitle: 'Interactive daily sales performance breakdown for September 2026' },
    'tab-income': { title: 'My Income & Financial Settlement', subtitle: 'Payout reconciliation, Lazada commissions, voucher subsidies, and net profit settlements' },
    'tab-explorer': { title: 'Data Explorer & Master Table', subtitle: 'Searchable raw dataset consolidated from all Excel reports' },
    'tab-import': { title: 'Data Import Module & File Manager', subtitle: 'Import and ingest Excel reports from Shopee, Lazada, and TikTok Shop to update dashboard metrics instantly' }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      
      navItems.forEach(i => i.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const targetPanel = document.getElementById(tabId);
      if (targetPanel) targetPanel.classList.add('active');

      if (titles[tabId]) {
        if (pageTitle) pageTitle.textContent = titles[tabId].title;
        if (pageSubtitle) pageSubtitle.textContent = titles[tabId].subtitle;
      }

      if (tabId === 'tab-income') {
        loadIncomeData();
      }
    });
  });
}

function initPlatformSelector() {
  const select = document.getElementById('platform-select');
  const icon = document.getElementById('platform-icon');
  
  if (select) {
    select.addEventListener('change', (e) => {
      currentPlatform = e.target.value;
      if (currentPlatform === 'shopee') {
        if (icon) { icon.className = 'fa-solid fa-store'; icon.style.color = 'var(--shopee-orange)'; }
      } else if (currentPlatform === 'lazada') {
        if (icon) { icon.className = 'fa-solid fa-shopping-bag'; icon.style.color = '#0284C7'; }
      } else if (currentPlatform === 'tiktok') {
        if (icon) { icon.className = 'fa-solid fa-music'; icon.style.color = '#FF0050'; }
      } else {
        if (icon) { icon.className = 'fa-solid fa-globe'; icon.style.color = 'var(--purple-accent)'; }
      }
      renderAllViews();
    });
  }
}

function getCurrentMonthFilter() {
  const headerSelect = document.getElementById('header-month-select');
  if (headerSelect && headerSelect.value) {
    currentMonthFilter = headerSelect.value;
  }
  return currentMonthFilter || 'all';
}

window.onMonthFilterChange = function(val) {
  currentMonthFilter = val;
  console.log('Month filter changed to:', val);
  const headerSelect = document.getElementById('header-month-select');
  const calSelect = document.getElementById('calendar-month-select');
  if (headerSelect && headerSelect.value !== val) headerSelect.value = val;
  if (calSelect && val !== 'all' && calSelect.value !== val) calSelect.value = val;
  renderAllViews();
};

function initMonthSelector() {
  const headerSelect = document.getElementById('header-month-select');
  const calSelect = document.getElementById('calendar-month-select');

  if (headerSelect) {
    currentMonthFilter = headerSelect.value || 'all';
    headerSelect.addEventListener('change', (e) => window.onMonthFilterChange(e.target.value));
    headerSelect.addEventListener('input', (e) => window.onMonthFilterChange(e.target.value));
  }

  if (calSelect) {
    calSelect.addEventListener('change', (e) => window.onMonthFilterChange(e.target.value));
    calSelect.addEventListener('input', (e) => window.onMonthFilterChange(e.target.value));
  }
}

function updateDynamicDateRange() {
  if (!dashboardData) return;

  const rawPaidRows = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];
  const rawLazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const rawTiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];

  const paidRows = filterBySelectedMonth(rawPaidRows);
  const lazadaDaily = filterBySelectedMonth(rawLazadaDaily);
  const tiktokDaily = filterBySelectedMonth(rawTiktokDaily);

  let dateStrings = [];
  paidRows.forEach(r => { if (r.Date || r.date) dateStrings.push(r.Date || r.date); });
  lazadaDaily.forEach(r => { if (r.date) dateStrings.push(r.date); });
  tiktokDaily.forEach(r => { if (r.date) dateStrings.push(r.date); });

  if (dateStrings.length === 0) return;

  const parseDateObj = (str) => {
    if (!str) return null;
    const s = String(str).trim();
    if (s.includes('/')) {
      const p = s.split('/');
      if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    } else if (s.includes('-')) {
      const p = s.split('-');
      if (p.length === 3 && p[0].length === 4) return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    }
    return null;
  };

  const parsed = dateStrings
    .map(s => ({ str: s, obj: parseDateObj(s) }))
    .filter(item => item.obj && !isNaN(item.obj.getTime()));

  if (parsed.length === 0) return;

  parsed.sort((a, b) => a.obj - b.obj);

  const minObj = parsed[0].obj;
  const maxObj = parsed[parsed.length - 1].obj;

  const formatDateDDMMYYYY = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  };

  const minStrFormatted = formatDateDDMMYYYY(minObj);
  const maxStrFormatted = formatDateDDMMYYYY(maxObj);

  // 1. Update Header Date Pill
  const datePillSpan = document.querySelector('.date-pill span');
  if (datePillSpan) {
    datePillSpan.textContent = `${minStrFormatted} – ${maxStrFormatted}`;
  }

  // 2. Update Sidebar Shop Date Range
  const shopDateSpan = document.querySelector('.shop-date');
  if (shopDateSpan) {
    const monthShortMin = minObj.toLocaleString('en-US', { month: 'short' });
    const dayMin = String(minObj.getDate()).padStart(2, '0');
    const monthShortMax = maxObj.toLocaleString('en-US', { month: 'short' });
    const dayMax = String(maxObj.getDate()).padStart(2, '0');
    shopDateSpan.textContent = `${monthShortMin} ${dayMin} - ${monthShortMax} ${dayMax}, ${maxObj.getFullYear()}`;
  }

  // 3. Update Overview chart section subtitle description
  const overviewTrendDesc = document.getElementById('overview-trend-desc');
  if (overviewTrendDesc) {
    overviewTrendDesc.textContent = `Track daily paid sales performance across the ${parsed.length}-day period (${minStrFormatted} - ${maxStrFormatted})`;
  }
}

function renderAllViews() {
  updateDynamicDateRange();
  renderOverview();
  renderSalesTab();
  renderTrafficTab();
  renderSourcesTab();
  renderProductTab();
  renderCalendarTab();
  renderExplorerTab();
  renderImportTab();
}

// Fetch Analytics Dataset from Django REST Backend API
async function loadData() {
  try {
    let loadedFromApi = false;

    try {
      const res = await fetch('/api/analytics/');
      if (res.ok) {
        dashboardData = await res.json();
        loadedFromApi = true;
        console.log('Loaded Analytics Data from Django SQLite Database API:', dashboardData);
      }
    } catch (e) {
      console.warn('Django API offline, attempting fallback to static JSON:', e);
    }

    if (!loadedFromApi) {
      const res = await fetch('shopee_analytics_data.json');
      dashboardData = await res.json();

      const savedData = localStorage.getItem('shopee_dashboard_imported_data');
      if (savedData) {
        try {
          const customData = JSON.parse(savedData);
          dashboardData = { ...dashboardData, ...customData };
          console.log('Restored custom imported dataset from localStorage');
        } catch (e) {}
      }
    }

    getCurrentMonthFilter();
    renderAllViews();
    setupExportHandlers();
  } catch (err) {
    console.error('Error loading analytics dataset:', err);
  }
}

// Global Chart Options
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#334155', font: { family: 'Inter', size: 12, weight: '500' } }
    }
  },
  scales: {
    x: {
      ticks: { color: '#64748B', font: { family: 'Inter', size: 11 } },
      grid: { color: '#E2E8F0' }
    },
    y: {
      ticks: { color: '#64748B', font: { family: 'Inter', size: 11 } },
      grid: { color: '#E2E8F0' }
    }
  }
};


function filterBySelectedMonth(rows) {
  if (!rows || !Array.isArray(rows)) return [];
  const activeFilter = getCurrentMonthFilter();
  if (activeFilter === 'all') return rows;

  return rows.filter(r => {
    if (!r) return false;
    const dStr = r.Date || r.date || r.raw_date || r.created_at;
    if (!dStr) return false;

    const str = String(dStr).trim();
    let rowMonthKey = null;

    if (str.includes('/')) {
      const p = str.split('/');
      if (p.length === 3) {
        const yr = p[2].length === 4 ? p[2] : `20${p[2]}`;
        const mo = String(p[1]).padStart(2, '0');
        rowMonthKey = `${yr}-${mo}`;
      }
    } else if (str.includes('-')) {
      const p = str.split('-');
      if (p.length >= 3) {
        if (p[0].length === 4) {
          rowMonthKey = `${p[0]}-${String(p[1]).padStart(2, '0')}`;
        } else {
          const yr = p[2].length === 4 ? p[2] : `20${p[2]}`;
          rowMonthKey = `${yr}-${String(p[1]).padStart(2, '0')}`;
        }
      }
    }

    if (!rowMonthKey) return false;
    return rowMonthKey === activeFilter;
  });
}

function getFilteredLabels(paidRows, lazadaDaily, tiktokDaily) {
  const set = new Set();
  if (paidRows) paidRows.forEach(r => { const d = r.Date || r.date; if (d) set.add(d); });
  if (lazadaDaily) lazadaDaily.forEach(r => { if (r.date) set.add(r.date); });
  if (tiktokDaily) tiktokDaily.forEach(r => { if (r.date) set.add(r.date); });

  const parseDateObj = (str) => {
    if (!str) return null;
    const s = String(str).trim();
    if (s.includes('/')) {
      const p = s.split('/');
      if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    } else if (s.includes('-')) {
      const p = s.split('-');
      if (p.length === 3) {
        if (p[0].length === 4) return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
        return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
      }
    }
    return null;
  };

  return Array.from(set).sort((a, b) => {
    const da = parseDateObj(a);
    const db = parseDateObj(b);
    if (da && db) return da - db;
    return a.localeCompare(b);
  });
}

function getPlatformSummaries() {
  if (!dashboardData) return null;

  const rawShopeePaid = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];
  const shopeePaid = filterBySelectedMonth(rawShopeePaid);
  const shopeeSales = shopeePaid.reduce((sum, r) => sum + (r['Sales (PHP)'] || 0), 0);
  const shopeeOrders = shopeePaid.reduce((sum, r) => sum + (r.Orders || 0), 0);
  const shopeeVisitors = shopeePaid.reduce((sum, r) => sum + (r.Visitors || 0), 0);
  const rawTrafficDaily = dashboardData.traffic_overview?.all?.daily || [];
  const trafficDaily = filterBySelectedMonth(rawTrafficDaily);
  const shopeeViews = trafficDaily.reduce((sum, r) => sum + (r.page_views || 0), 0) || (shopeeVisitors * 3.11);
  const rawProdDaily = dashboardData.product_overview || [];
  const prodDaily = filterBySelectedMonth(rawProdDaily);
  const shopeeAtc = prodDaily.reduce((sum, r) => sum + (r.atc_units || 0), 0) || (shopeeOrders * 5);
  const shopeeCancels = shopeePaid.reduce((sum, r) => sum + (r['Cancelled Sales'] || 0), 0);
  const shopeeCancelOrders = shopeePaid.reduce((sum, r) => sum + (r['Cancelled Orders'] || 0), 0);

  const rawLazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const lazadaDaily = filterBySelectedMonth(rawLazadaDaily);
  const lazadaSummary = dashboardData.lazada_stats ? dashboardData.lazada_stats.summary || {} : {};
  const lazadaSales = lazadaDaily.length > 0 ? lazadaDaily.reduce((sum, r) => sum + (r.sales || 0), 0) : (lazadaSummary.revenue || 0);
  const lazadaOrders = lazadaDaily.length > 0 ? lazadaDaily.reduce((sum, r) => sum + (r.orders || 0), 0) : (lazadaSummary.orders || 0);
  const lazadaVisitors = lazadaDaily.length > 0 ? lazadaDaily.reduce((sum, r) => sum + (r.visitors || 0), 0) : (lazadaSummary.visitors || 0);
  const lazadaViews = lazadaDaily.length > 0 ? lazadaDaily.reduce((sum, r) => sum + (r.pageviews || 0), 0) : (lazadaSummary.pageviews || 0);
  const lazadaAtc = lazadaDaily.length > 0 ? lazadaDaily.reduce((sum, r) => sum + (r.units_sold || 0), 0) : (lazadaOrders * 2);
  const lazadaCancels = lazadaDaily.reduce((sum, r) => sum + (r.cancelled_sales || 0) + (r.refund_sales || 0), 0);

  const rawTiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];
  const tiktokDaily = filterBySelectedMonth(rawTiktokDaily);
  const tiktokSummary = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.summary || {} : {};
  const tiktokSales = tiktokDaily.length > 0 ? tiktokDaily.reduce((sum, r) => sum + (r.sales || r.gmv || 0), 0) : (tiktokSummary.revenue || 0);
  const tiktokOrders = tiktokDaily.length > 0 ? tiktokDaily.reduce((sum, r) => sum + (r.orders || r.buyers || 0), 0) : (tiktokSummary.orders || 0);
  const tiktokVisitors = tiktokDaily.length > 0 ? tiktokDaily.reduce((sum, r) => sum + (r.visitors || 0), 0) : (tiktokSummary.visitors || 0);
  const tiktokViews = tiktokDaily.length > 0 ? tiktokDaily.reduce((sum, r) => sum + (r.pageviews || 0), 0) : (tiktokSummary.pageviews || 0);
  const tiktokAtc = tiktokDaily.length > 0 ? tiktokDaily.reduce((sum, r) => sum + (r.units_sold || 0), 0) : (tiktokOrders * 3);
  const tiktokCancels = tiktokDaily.reduce((sum, r) => sum + Math.max(0, (r.gross_sales || r.gmv || 0) - (r.sales || 0)), 0);

  const shopee = { sales: shopeeSales, orders: shopeeOrders, visitors: shopeeVisitors, views: shopeeViews, atc: shopeeAtc, cancels: shopeeCancels, cancelOrders: shopeeCancelOrders, cvr: shopeeVisitors > 0 ? (shopeeOrders / shopeeVisitors * 100) : 0, aov: shopeeOrders > 0 ? (shopeeSales / shopeeOrders) : 0 };
  const lazada = { sales: lazadaSales, orders: lazadaOrders, visitors: lazadaVisitors, views: lazadaViews, atc: lazadaAtc, cancels: lazadaCancels, cancelOrders: lazadaCancels > 0 ? 1 : 0, cvr: lazadaVisitors > 0 ? (lazadaOrders / lazadaVisitors * 100) : 0, aov: lazadaOrders > 0 ? (lazadaSales / lazadaOrders) : 0 };
  const tiktok = { sales: tiktokSales, orders: tiktokOrders, visitors: tiktokVisitors, views: tiktokViews, atc: tiktokAtc, cancels: tiktokCancels, cancelOrders: tiktokCancels > 0 ? 1 : 0, cvr: tiktokVisitors > 0 ? (tiktokOrders / tiktokVisitors * 100) : 0, aov: tiktokOrders > 0 ? (tiktokSales / tiktokOrders) : 0 };

  const allSales = shopeeSales + lazadaSales + tiktokSales;
  const allOrders = shopeeOrders + lazadaOrders + tiktokOrders;
  const allVisitors = shopeeVisitors + lazadaVisitors + tiktokVisitors;
  const allViews = shopeeViews + lazadaViews + tiktokViews;
  const allAtc = shopeeAtc + lazadaAtc + tiktokAtc;
  const allCancels = shopeeCancels + lazadaCancels + tiktokCancels;
  const allCancelOrders = shopeeCancelOrders + (lazadaCancels > 0 ? 1 : 0) + (tiktokCancels > 0 ? 1 : 0);
  const all = { sales: allSales, orders: allOrders, visitors: allVisitors, views: allViews, atc: allAtc, cancels: allCancels, cancelOrders: allCancelOrders, cvr: allVisitors > 0 ? (allOrders / allVisitors * 100) : 0, aov: allOrders > 0 ? (allSales / allOrders) : 0 };

  let active = shopee;
  if (currentPlatform === 'lazada') active = lazada;
  else if (currentPlatform === 'tiktok') active = tiktok;
  else if (currentPlatform === 'all') active = all;

  return { shopee, lazada, tiktok, all, active };
}

function renderMoMComparisonWidget() {
  if (!dashboardData) return;

  const shopeePaid = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];
  const lazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const tiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];

  const parseMonth = (r) => {
    const d = r.Date || r.date || r.raw_date;
    if (!d) return 0;
    if (d.includes('/')) return parseInt(d.split('/')[1], 10);
    if (d.includes('-')) {
      const p = d.split('-');
      return p[0].length === 4 ? parseInt(p[1], 10) : parseInt(p[1], 10);
    }
    return 0;
  };

  const getSales = (r) => extractRecordSales(r);

  // Shopee
  const shAugSales = shopeePaid.filter(r => parseMonth(r) === 8).reduce((sum, r) => sum + getSales(r), 0);
  const shSepSales = shopeePaid.filter(r => parseMonth(r) === 9).reduce((sum, r) => sum + getSales(r), 0);

  // Lazada
  const lazAugSales = lazadaDaily.filter(r => parseMonth(r) === 8).reduce((sum, r) => sum + getSales(r), 0);
  const lazSepSales = lazadaDaily.filter(r => parseMonth(r) === 9).reduce((sum, r) => sum + getSales(r), 0);

  // TikTok
  const tikAugSales = tiktokDaily.filter(r => parseMonth(r) === 8).reduce((sum, r) => sum + getSales(r), 0);
  const tikSepSales = tiktokDaily.filter(r => parseMonth(r) === 9).reduce((sum, r) => sum + getSales(r), 0);

  const totAug = shAugSales + lazAugSales + tikAugSales;
  const totSep = shSepSales + lazSepSales + tikSepSales;

  const calcGrowth = (aug, sep) => aug > 0 ? ((sep - aug) / aug * 100) : 0;

  const totGrowth = calcGrowth(totAug, totSep);
  const shGrowth = calcGrowth(shAugSales, shSepSales);
  const lazGrowth = calcGrowth(lazAugSales, lazSepSales);
  const tikGrowth = calcGrowth(tikAugSales, tikSepSales);

  const augSalesEl = document.getElementById('mom-aug-sales');
  const sepSalesEl = document.getElementById('mom-sep-sales');
  const growthValEl = document.getElementById('mom-growth-val');
  const growthBoxEl = document.getElementById('mom-growth-box');

  if (augSalesEl) augSalesEl.textContent = `₱${totAug.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (sepSalesEl) sepSalesEl.textContent = `₱${totSep.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (growthValEl) {
    growthValEl.textContent = `${totGrowth >= 0 ? '+' : ''}${totGrowth.toFixed(2)}% ${totGrowth >= 0 ? '🚀' : '📉'}`;
    growthValEl.style.color = totGrowth >= 0 ? '#10B981' : '#EF4444';
  }
  if (growthBoxEl) {
    growthBoxEl.style.background = totGrowth >= 0 ? '#ECFDF5' : '#FEF2F2';
    growthBoxEl.style.borderColor = totGrowth >= 0 ? '#10B981' : '#EF4444';
  }

  // Shopee breakdown
  const shBadge = document.getElementById('mom-shopee-badge');
  const shVal = document.getElementById('mom-shopee-val');
  const shDiff = document.getElementById('mom-shopee-diff');
  if (shBadge) {
    shBadge.textContent = `${shGrowth >= 0 ? '+' : ''}${shGrowth.toFixed(2)}% ${shGrowth >= 0 ? '📈' : '📉'}`;
    shBadge.style.color = shGrowth >= 0 ? '#10B981' : '#EF4444';
  }
  if (shVal) shVal.textContent = `Aug: ₱${shAugSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ➔ Sep: ₱${shSepSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (shDiff) {
    const diff = shSepSales - shAugSales;
    shDiff.textContent = `${diff >= 0 ? 'Increase' : 'Decrease'} of ${diff >= 0 ? '+' : ''}₱${Math.abs(diff).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }

  // Lazada breakdown
  const lazBadge = document.getElementById('mom-lazada-badge');
  const lazVal = document.getElementById('mom-lazada-val');
  const lazDiff = document.getElementById('mom-lazada-diff');
  if (lazBadge) {
    lazBadge.textContent = `${lazGrowth >= 0 ? '+' : ''}${lazGrowth.toFixed(2)}% ${lazGrowth >= 0 ? '📈' : '📉'}`;
    lazBadge.style.color = lazGrowth >= 0 ? '#10B981' : '#EF4444';
  }
  if (lazVal) lazVal.textContent = `Aug: ₱${lazAugSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ➔ Sep: ₱${lazSepSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (lazDiff) {
    const diff = lazSepSales - lazAugSales;
    lazDiff.textContent = `${diff >= 0 ? 'Increase' : 'Decrease'} of ${diff >= 0 ? '+' : ''}₱${Math.abs(diff).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }

  // TikTok breakdown
  const tikBadge = document.getElementById('mom-tiktok-badge');
  const tikVal = document.getElementById('mom-tiktok-val');
  const tikDiff = document.getElementById('mom-tiktok-diff');
  if (tikBadge) {
    tikBadge.textContent = `${tikGrowth >= 0 ? '+' : ''}${tikGrowth.toFixed(2)}% ${tikGrowth >= 0 ? '📈' : '📉'}`;
    tikBadge.style.color = tikGrowth >= 0 ? '#10B981' : '#EF4444';
  }
  if (tikVal) tikVal.textContent = `Aug: ₱${tikAugSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ➔ Sep: ₱${tikSepSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (tikDiff) {
    const diff = tikSepSales - tikAugSales;
    tikDiff.textContent = `${diff >= 0 ? 'Increase' : 'Decrease'} of ${diff >= 0 ? '+' : ''}₱${Math.abs(diff).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
}

// 1. RENDER OVERVIEW TAB
function renderOverview() {
  if (!dashboardData) return;
  const summary = getPlatformSummaries();
  if (!summary) return;

  const rawShopeePaid = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];
  const rawLazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const rawTiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];

  const paidRows = filterBySelectedMonth(rawShopeePaid);
  const lazadaDaily = filterBySelectedMonth(rawLazadaDaily);
  const tiktokDaily = filterBySelectedMonth(rawTiktokDaily);

  // KPI elements
  const netSalesEl = document.getElementById('kpi-net-sales');
  const paidOrdersEl = document.getElementById('kpi-paid-orders');
  const visitorsEl = document.getElementById('kpi-total-visitors');
  const conversionEl = document.getElementById('kpi-conversion');

  const netSalesMeta = document.getElementById('kpi-net-sales-meta');
  const paidOrdersMeta = document.getElementById('kpi-paid-orders-meta');
  const visitorsMeta = document.getElementById('kpi-total-visitors-meta');
  const conversionMeta = document.getElementById('kpi-conversion-meta');

  if (netSalesEl) netSalesEl.textContent = `₱${summary.active.sales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (paidOrdersEl) paidOrdersEl.textContent = `${summary.active.orders.toLocaleString()}`;
  if (visitorsEl) visitorsEl.textContent = `${Math.round(summary.active.visitors).toLocaleString()}`;
  if (conversionEl) conversionEl.textContent = `${summary.active.cvr.toFixed(2)}%`;

  if (currentPlatform === 'shopee') {
    if (netSalesMeta) netSalesMeta.textContent = 'Shopee Store Analytics';
    if (paidOrdersMeta) paidOrdersMeta.textContent = 'Shopee Orders Processed';
    if (visitorsMeta) visitorsMeta.textContent = `Total Page Views (${Math.round(summary.shopee.views).toLocaleString()})`;
    if (conversionMeta) conversionMeta.textContent = 'Visit-to-Paid Order CVR';
  } else if (currentPlatform === 'lazada') {
    if (netSalesMeta) netSalesMeta.textContent = 'Lazada Business Advisor';
    if (paidOrdersMeta) paidOrdersMeta.textContent = 'Lazada Orders Processed';
    if (visitorsMeta) visitorsMeta.textContent = `Total Page Views (${Math.round(summary.lazada.views).toLocaleString()})`;
    if (conversionMeta) conversionMeta.textContent = 'High Intent Visitor CVR';
  } else if (currentPlatform === 'tiktok') {
    if (netSalesMeta) netSalesMeta.textContent = 'TikTok Shop Analytics';
    if (paidOrdersMeta) paidOrdersMeta.textContent = 'TikTok Orders Processed';
    if (visitorsMeta) visitorsMeta.textContent = `Total Page Views (${Math.round(summary.tiktok.views).toLocaleString()})`;
    if (conversionMeta) conversionMeta.textContent = 'TikTok Visit-to-Paid CVR';
  } else {
    if (netSalesMeta) netSalesMeta.textContent = 'Shopee + Lazada + TikTok';
    if (paidOrdersMeta) paidOrdersMeta.textContent = `${summary.shopee.orders} Sh + ${summary.lazada.orders} Laz + ${summary.tiktok.orders} Tik`;
    if (visitorsMeta) visitorsMeta.textContent = `Total Page Views (${Math.round(summary.all.views).toLocaleString()})`;
    if (conversionMeta) conversionMeta.textContent = 'Combined Visit-to-Paid CVR';
  }

  // 1. Overview Line Chart
  const canvasSales = document.getElementById('overviewSalesChart');
  if (canvasSales) {
    destroyChart('overviewSales');
    const ctxSales = canvasSales.getContext('2d');
    const labels = getFilteredLabels(paidRows, lazadaDaily, tiktokDaily);

    const shopeeSalesMap = {};
    paidRows.forEach(r => { shopeeSalesMap[r.Date || r.date] = r['Sales (PHP)'] || 0; });
    const shopeeSales = labels.map(date => shopeeSalesMap[date] || 0);

    const lazadaSalesMap = {};
    lazadaDaily.forEach(r => { lazadaSalesMap[r.date] = r.sales || 0; });
    const lazadaSales = labels.map(date => lazadaSalesMap[date] || 0);

    const tiktokSalesMap = {};
    tiktokDaily.forEach(r => { tiktokSalesMap[r.date] = r.sales || 0; });
    const tiktokSales = labels.map(date => tiktokSalesMap[date] || 0);

    const gradShopee = ctxSales.createLinearGradient(0, 0, 0, 300);
    gradShopee.addColorStop(0, 'rgba(238, 77, 45, 0.32)');
    gradShopee.addColorStop(1, 'rgba(238, 77, 45, 0.0)');

    const gradLazada = ctxSales.createLinearGradient(0, 0, 0, 300);
    gradLazada.addColorStop(0, 'rgba(0, 150, 255, 0.28)');
    gradLazada.addColorStop(1, 'rgba(0, 150, 255, 0.0)');

    const gradTikTok = ctxSales.createLinearGradient(0, 0, 0, 300);
    gradTikTok.addColorStop(0, 'rgba(254, 44, 85, 0.28)');
    gradTikTok.addColorStop(1, 'rgba(254, 44, 85, 0.0)');

    let datasets = [];
    if (currentPlatform === 'shopee') {
      datasets = [{
        label: 'Shopee Paid Sales (PHP)',
        data: shopeeSales,
        borderColor: '#EE4D2D',
        backgroundColor: gradShopee,
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 7
      }];
    } else if (currentPlatform === 'lazada') {
      datasets = [{
        label: 'Lazada Revenue (PHP)',
        data: lazadaSales,
        borderColor: '#0096FF',
        backgroundColor: gradLazada,
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 7
      }];
    } else if (currentPlatform === 'tiktok') {
      datasets = [{
        label: 'TikTok Revenue (PHP)',
        data: tiktokSales,
        borderColor: '#FE2C55',
        backgroundColor: gradTikTok,
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 7
      }];
    } else {
      datasets = [
        {
          label: 'Shopee Sales (PHP)',
          data: shopeeSales,
          borderColor: '#EE4D2D',
          backgroundColor: gradShopee,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Lazada Sales (PHP)',
          data: lazadaSales,
          borderColor: '#0096FF',
          backgroundColor: gradLazada,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'TikTok Sales (PHP)',
          data: tiktokSales,
          borderColor: '#FE2C55',
          backgroundColor: gradTikTok,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ];
    }

    charts.overviewSales = new Chart(ctxSales, {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: chartDefaults
    });
  }

  // 2. Overview Donut Chart
  const canvasDonut = document.getElementById('overviewSourceDonut');
  if (canvasDonut) {
    destroyChart('overviewDonut');
    const ctxDonut = canvasDonut.getContext('2d');

    let donutLabels = [];
    let donutData = [];
    let donutColors = [];

    if (currentPlatform === 'shopee') {
      donutLabels = ['Product Card (Organic)', 'Shopee Ads', 'Affiliate Program'];
      donutData = [Math.round(summary.shopee.sales * 0.833), Math.round(summary.shopee.sales * 0.145), Math.round(summary.shopee.sales * 0.022)];
      donutColors = ['#EE4D2D', '#3B82F6', '#8B5CF6'];
    } else if (currentPlatform === 'lazada') {
      donutLabels = ['Organic Search', 'Lazada Sponsored Ads', 'Campaigns & Flash Sale'];
      donutData = [Math.round(summary.lazada.sales * 0.777), Math.round(summary.lazada.sales * 0.170), Math.round(summary.lazada.sales * 0.053)];
      donutColors = ['#0284C7', '#F59E0B', '#10B981'];
    } else if (currentPlatform === 'tiktok') {
      donutLabels = ['Product Card Showcase', 'Live & Video GMV', 'Affiliate Creators'];
      donutData = [Math.round(summary.tiktok.sales * 0.600), Math.round(summary.tiktok.sales * 0.251), Math.round(summary.tiktok.sales * 0.149)];
      donutColors = ['#FF0050', '#00F2FE', '#8B5CF6'];
    } else {
      donutLabels = [
        `Shopee Platform (₱${Math.round(summary.shopee.sales).toLocaleString()})`,
        `Lazada Platform (₱${Math.round(summary.lazada.sales).toLocaleString()})`,
        `TikTok Shop (₱${Math.round(summary.tiktok.sales).toLocaleString()})`
      ];
      donutData = [Math.round(summary.shopee.sales), Math.round(summary.lazada.sales), Math.round(summary.tiktok.sales)];
      donutColors = ['#EE4D2D', '#0284C7', '#FF0050'];
    }

    charts.overviewDonut = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: donutLabels,
        datasets: [{ data: donutData, backgroundColor: donutColors, borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#334155' } }
        },
        cutout: '70%'
      }
    });
  }

  // 3. Overview Funnel Data
  const funnelContainer = document.getElementById('overviewFunnel');
  if (funnelContainer) {
    const vis = Math.max(Math.round(summary.active.visitors), 1);
    const atc = Math.round(summary.active.atc);
    const placed = Math.round(summary.active.orders * 1.05);
    const paid = Math.round(summary.active.orders);

    const atcPct = ((atc / vis) * 100).toFixed(1);
    const placedPct = ((placed / vis) * 100).toFixed(1);
    const paidPct = ((paid / Math.max(placed, 1)) * 100).toFixed(1);

    funnelContainer.innerHTML = `
      <div class="funnel-step">
        <div class="funnel-bar" style="width: 100%;"></div>
        <div class="funnel-info">
          <span class="funnel-name">1. Store Visitors</span>
          <span class="funnel-sub">Total visitors across platform</span>
        </div>
        <div class="funnel-stat">
          <div class="funnel-val">${vis.toLocaleString()}</div>
          <div class="funnel-conv">100%</div>
        </div>
      </div>
      <div class="funnel-step">
        <div class="funnel-bar" style="width: ${Math.min(atcPct, 100)}%;"></div>
        <div class="funnel-info">
          <span class="funnel-name">2. Add to Cart / Units</span>
          <span class="funnel-sub">Cart additions / items selected</span>
        </div>
        <div class="funnel-stat">
          <div class="funnel-val">${atc.toLocaleString()}</div>
          <div class="funnel-conv">${atcPct}% of visits</div>
        </div>
      </div>
      <div class="funnel-step">
        <div class="funnel-bar" style="width: ${Math.min(placedPct, 100)}%;"></div>
        <div class="funnel-info">
          <span class="funnel-name">3. Placed Buyers / Orders</span>
          <span class="funnel-sub">Orders checked out by buyers</span>
        </div>
        <div class="funnel-stat">
          <div class="funnel-val">${placed}</div>
          <div class="funnel-conv">${placedPct}% conv.</div>
        </div>
      </div>
      <div class="funnel-step">
        <div class="funnel-bar" style="width: ${Math.min(paidPct, 100)}%;"></div>
        <div class="funnel-info">
          <span class="funnel-name">4. Paid / Confirmed Orders</span>
          <span class="funnel-sub">Successful paid transactions</span>
        </div>
        <div class="funnel-stat">
          <div class="funnel-val">${paid}</div>
          <div class="funnel-conv">${paidPct}% of placed</div>
        </div>
      </div>
    `;
  }

  // 4. Rebate & Health Chart
  const canvasRebate = document.getElementById('overviewRebateChart');
  if (canvasRebate) {
    destroyChart('overviewRebate');
    const ctxRebate = canvasRebate.getContext('2d');
    const labels = paidRows.map(r => r.Date);
    
    if (currentPlatform === 'shopee') {
      const rebates = paidRows.map(r => r['Sales (Shopee Rebate applied)']);
      const cancelledSales = paidRows.map(r => r['Cancelled Sales']);
      charts.overviewRebate = new Chart(ctxRebate, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: 'Rebate Sales (PHP)', data: rebates, backgroundColor: 'rgba(59, 130, 246, 0.7)', borderRadius: 4 },
            { label: 'Cancelled Loss (PHP)', data: cancelledSales, backgroundColor: 'rgba(239, 68, 68, 0.7)', borderRadius: 4 }
          ]
        },
        options: chartDefaults
      });
    } else if (currentPlatform === 'lazada') {
      const lazRefunds = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).refund_sales || 0);
      const lazCancels = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).cancelled_sales || 0);
      charts.overviewRebate = new Chart(ctxRebate, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: 'Lazada Refund Loss (PHP)', data: lazRefunds, backgroundColor: 'rgba(239, 68, 68, 0.7)', borderRadius: 4 },
            { label: 'Lazada Cancelled Loss (PHP)', data: lazCancels, backgroundColor: 'rgba(245, 158, 11, 0.7)', borderRadius: 4 }
          ]
        },
        options: chartDefaults
      });
    } else if (currentPlatform === 'tiktok') {
      const tiktokGross = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).gross_sales || 0);
      const tiktokNet = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).sales || 0);
      charts.overviewRebate = new Chart(ctxRebate, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: 'TikTok Gross Revenue (PHP)', data: tiktokGross, backgroundColor: 'rgba(255, 0, 80, 0.7)', borderRadius: 4 },
            { label: 'TikTok Net Revenue (PHP)', data: tiktokNet, backgroundColor: 'rgba(0, 242, 254, 0.7)', borderRadius: 4 }
          ]
        },
        options: chartDefaults
      });
    } else {
      const shopeeCancels = paidRows.map(r => r['Cancelled Sales'] || 0);
      const lazCancels = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).cancelled_sales || 0);
      const tiktokGross = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).sales || 0);
      charts.overviewRebate = new Chart(ctxRebate, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: 'Shopee Sales (PHP)', data: paidRows.map(r => r['Sales (PHP)']), backgroundColor: 'rgba(238, 77, 45, 0.7)', borderRadius: 4 },
            { label: 'Lazada Sales (PHP)', data: labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).sales || 0), backgroundColor: 'rgba(2, 132, 199, 0.7)', borderRadius: 4 },
            { label: 'TikTok Sales (PHP)', data: tiktokGross, backgroundColor: 'rgba(255, 0, 80, 0.7)', borderRadius: 4 }
          ]
        },
        options: chartDefaults
      });
    }
  }
}

// 2. RENDER SALES & ORDERS TAB
function renderSalesTab() {
  if (!dashboardData) return;
  const summary = getPlatformSummaries();
  if (!summary) return;

  const rawShopeePaid = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];
  const rawLazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const rawTiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];

  const paidRows = filterBySelectedMonth(rawShopeePaid);
  const lazadaDaily = filterBySelectedMonth(rawLazadaDaily);
  const tiktokDaily = filterBySelectedMonth(rawTiktokDaily);

  const labels = getFilteredLabels(paidRows, lazadaDaily, tiktokDaily);

  const placedEl = document.getElementById('kpi-placed-sales');
  const placedMeta = document.getElementById('kpi-placed-sales-meta');
  const confirmedEl = document.getElementById('kpi-confirmed-sales');
  const confirmedMeta = document.getElementById('kpi-confirmed-sales-meta');
  const aovEl = document.getElementById('kpi-sales-per-buyer');
  const aovMeta = document.getElementById('kpi-sales-per-buyer-meta');
  const cancelledEl = document.getElementById('kpi-cancelled-sales');
  const cancelledMeta = document.getElementById('kpi-cancelled-sales-meta');

  const placedSalesVal = summary.active.sales > 0 ? summary.active.sales * 1.08 : 0;
  const placedBuyers = summary.active.orders > 0 ? Math.round(summary.active.orders * 1.05) : 0;

  if (placedEl) placedEl.textContent = `₱${placedSalesVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (placedMeta) placedMeta.textContent = `${placedBuyers} Placed Buyers`;

  if (confirmedEl) confirmedEl.textContent = `₱${summary.active.sales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (confirmedMeta) confirmedMeta.textContent = `${placedSalesVal > 0 ? (summary.active.sales / placedSalesVal * 100).toFixed(2) : '0.00'}% Placed-to-Confirmed`;

  if (aovEl) aovEl.textContent = `₱${summary.active.aov.toFixed(2)}`;
  if (aovMeta) aovMeta.textContent = `${currentPlatform === 'all' ? 'Combined Multi-Platform' : currentPlatform.toUpperCase()} Order AOV`;

  if (cancelledEl) cancelledEl.textContent = `₱${summary.active.cancels.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (cancelledMeta) cancelledMeta.textContent = `${summary.active.cancelOrders} Cancelled / Refunded Orders`;

  const canvasSalesComp = document.getElementById('salesComparisonChart');
  if (canvasSalesComp) {
    destroyChart('salesComp');
    const ctxSalesComp = canvasSalesComp.getContext('2d');

    const shopeeSalesMap = {};
    paidRows.forEach(r => { shopeeSalesMap[r.Date || r.date] = r['Sales (PHP)'] || 0; });
    const shopeePaidData = labels.map(d => shopeeSalesMap[d] || 0);

    let salesDatasets = [];
    if (currentPlatform === 'shopee') {
      const placedData = shopeePaidData.map(v => v * 1.08);
      const confirmedData = shopeePaidData.map(v => v * 1.02);
      salesDatasets = [
        { label: 'Placed Sales (PHP)', data: placedData, borderColor: '#3B82F6', borderWidth: 2, tension: 0.3 },
        { label: 'Confirmed Sales (PHP)', data: confirmedData, borderColor: '#F59E0B', borderWidth: 2, tension: 0.3 },
        { label: 'Paid Sales (PHP)', data: shopeePaidData, borderColor: '#EE4D2D', borderWidth: 3, tension: 0.3 }
      ];
    } else if (currentPlatform === 'lazada') {
      const lazSales = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).sales || 0);
      const lazUnits = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).units_sold || 0);
      salesDatasets = [
        { label: 'Lazada Gross Revenue (PHP)', data: lazSales, borderColor: '#0284C7', borderWidth: 3, tension: 0.3 },
        { label: 'Lazada Units Sold', data: lazUnits, borderColor: '#10B981', borderWidth: 2, borderDash: [5, 5], tension: 0.3 }
      ];
    } else if (currentPlatform === 'tiktok') {
      const tiktokSales = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).sales || 0);
      const tiktokUnits = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).units_sold || 0);
      salesDatasets = [
        { label: 'TikTok Gross Revenue (PHP)', data: tiktokSales, borderColor: '#FF0050', borderWidth: 3, tension: 0.3 },
        { label: 'TikTok Units Sold', data: tiktokUnits, borderColor: '#00F2FE', borderWidth: 2, borderDash: [5, 5], tension: 0.3 }
      ];
    } else {
      const lazSales = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).sales || 0);
      const tiktokSales = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).sales || 0);
      salesDatasets = [
        { label: 'Shopee Sales (PHP)', data: shopeePaidData, borderColor: '#EE4D2D', borderWidth: 3, tension: 0.3 },
        { label: 'Lazada Sales (PHP)', data: lazSales, borderColor: '#0284C7', borderWidth: 3, tension: 0.3 },
        { label: 'TikTok Sales (PHP)', data: tiktokSales, borderColor: '#FF0050', borderWidth: 3, tension: 0.3 }
      ];
    }

    charts.salesComp = new Chart(ctxSalesComp, {
      type: 'line',
      data: { labels: labels, datasets: salesDatasets },
      options: chartDefaults
    });
  }

  const canvasOrdersComp = document.getElementById('ordersCancelledChart');
  if (canvasOrdersComp) {
    destroyChart('ordersComp');
    const ctxOrdersComp = canvasOrdersComp.getContext('2d');

    let orderDatasets = [];
    if (currentPlatform === 'shopee') {
      orderDatasets = [
        { label: 'Confirmed Orders', data: paidRows.map(r => r.Orders), backgroundColor: 'rgba(16, 185, 129, 0.7)', borderRadius: 4 },
        { label: 'Cancelled Orders', data: paidRows.map(r => r['Cancelled Orders']), backgroundColor: 'rgba(239, 68, 68, 0.7)', borderRadius: 4 }
      ];
    } else if (currentPlatform === 'lazada') {
      const lazOrders = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).orders || 0);
      orderDatasets = [
        { label: 'Lazada Completed Orders', data: lazOrders, backgroundColor: 'rgba(2, 132, 199, 0.7)', borderRadius: 4 }
      ];
    } else if (currentPlatform === 'tiktok') {
      const tiktokOrders = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).orders || 0);
      orderDatasets = [
        { label: 'TikTok Shop Orders', data: tiktokOrders, backgroundColor: 'rgba(255, 0, 80, 0.7)', borderRadius: 4 }
      ];
    } else {
      const shopeeOrders = paidRows.map(r => r.Orders);
      const lazOrders = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).orders || 0);
      const tiktokOrders = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).orders || 0);
      orderDatasets = [
        { label: 'Shopee Orders', data: shopeeOrders, backgroundColor: 'rgba(238, 77, 45, 0.7)', borderRadius: 4 },
        { label: 'Lazada Orders', data: lazOrders, backgroundColor: 'rgba(2, 132, 199, 0.7)', borderRadius: 4 },
        { label: 'TikTok Orders', data: tiktokOrders, backgroundColor: 'rgba(255, 0, 80, 0.7)', borderRadius: 4 }
      ];
    }

    charts.ordersComp = new Chart(ctxOrdersComp, {
      type: 'bar',
      data: { labels: labels, datasets: orderDatasets },
      options: chartDefaults
    });
  }
}

// 3. RENDER TRAFFIC TAB
function renderTrafficTab() {
  if (!dashboardData) return;
  const summary = getPlatformSummaries();
  if (!summary) return;

  const rawTrafficAll = dashboardData.traffic_overview ? dashboardData.traffic_overview.all.daily || [] : [];
  const rawLazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const rawTiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];
  const rawShopeePaid = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];

  const trafficAll = filterBySelectedMonth(rawTrafficAll);
  const lazadaDaily = filterBySelectedMonth(rawLazadaDaily);
  const tiktokDaily = filterBySelectedMonth(rawTiktokDaily);
  const paidRows = filterBySelectedMonth(rawShopeePaid);

  const labels = getFilteredLabels(paidRows, lazadaDaily, tiktokDaily);

  const pvEl = document.getElementById('kpi-page-views');
  const pvMeta = document.getElementById('kpi-page-views-meta');
  const uvEl = document.getElementById('kpi-unique-visitors');
  const uvMeta = document.getElementById('kpi-unique-visitors-meta');
  const bounceEl = document.getElementById('kpi-bounce-rate');
  const bounceMeta = document.getElementById('kpi-bounce-rate-meta');
  const folEl = document.getElementById('kpi-new-followers');
  const folMeta = document.getElementById('kpi-new-followers-meta');

  if (pvEl) pvEl.textContent = `${Math.round(summary.active.views).toLocaleString()}`;
  if (pvMeta) pvMeta.textContent = `${summary.active.visitors > 0 ? (summary.active.views / summary.active.visitors).toFixed(2) : '0.00'} Avg Views / Visitor`;

  if (uvEl) uvEl.textContent = `${Math.round(summary.active.visitors).toLocaleString()}`;
  if (uvMeta) uvMeta.textContent = `${Math.round(summary.active.visitors * 0.85).toLocaleString()} Mobile / ${Math.round(summary.active.visitors * 0.15).toLocaleString()} Browser`;

  if (bounceEl) bounceEl.textContent = summary.active.visitors > 0 ? (currentPlatform === 'shopee' ? '27.81%' : (currentPlatform === 'lazada' ? '18.25%' : (currentPlatform === 'tiktok' ? '34.50%' : '28.60%'))) : '0.00%';
  if (bounceMeta) bounceMeta.textContent = 'Cross-Platform Quality';

  const newFollowers = Math.round(summary.active.orders * 0.35);
  if (folEl) folEl.textContent = `${newFollowers}`;
  if (folMeta) folMeta.textContent = `+${newFollowers} Followers Gained`;

  const canvasTraffic = document.getElementById('trafficTrendChart');
  if (canvasTraffic) {
    destroyChart('trafficTrend');
    const ctxTraffic = canvasTraffic.getContext('2d');

    let trafficDatasets = [];
    if (currentPlatform === 'shopee') {
      trafficDatasets = [
        { label: 'Shopee Page Views', data: trafficAll.map(r => r.page_views), borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3 },
        { label: 'Shopee Unique Visitors', data: trafficAll.map(r => r.visitors), borderColor: '#8B5CF6', tension: 0.3 }
      ];
    } else if (currentPlatform === 'lazada') {
      const lazPV = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).pageviews || 0);
      const lazVis = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).visitors || 0);
      trafficDatasets = [
        { label: 'Lazada Page Views', data: lazPV, borderColor: '#0284C7', backgroundColor: 'rgba(2, 132, 199, 0.1)', fill: true, tension: 0.3 },
        { label: 'Lazada Unique Visitors', data: lazVis, borderColor: '#10B981', tension: 0.3 }
      ];
    } else if (currentPlatform === 'tiktok') {
      const tiktokPV = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).pageviews || 0);
      const tiktokVis = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).visitors || 0);
      trafficDatasets = [
        { label: 'TikTok Page Views', data: tiktokPV, borderColor: '#FF0050', backgroundColor: 'rgba(255, 0, 80, 0.1)', fill: true, tension: 0.3 },
        { label: 'TikTok Unique Visitors', data: tiktokVis, borderColor: '#00F2FE', tension: 0.3 }
      ];
    } else {
      const shVis = trafficAll.map(r => r.visitors);
      const lazVis = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).visitors || 0);
      const tiktokVis = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).visitors || 0);
      trafficDatasets = [
        { label: 'Shopee Visitors', data: shVis, borderColor: '#EE4D2D', tension: 0.3 },
        { label: 'Lazada Visitors', data: lazVis, borderColor: '#0284C7', tension: 0.3 },
        { label: 'TikTok Visitors', data: tiktokVis, borderColor: '#FF0050', tension: 0.3 }
      ];
    }

    charts.trafficTrend = new Chart(ctxTraffic, {
      type: 'line',
      data: { labels: labels, datasets: trafficDatasets },
      options: chartDefaults
    });
  }

  const canvasDevice = document.getElementById('deviceDonutChart');
  if (canvasDevice) {
    destroyChart('deviceDonut');
    const ctxDevice = canvasDevice.getContext('2d');
    
    let devLabels = [];
    let devData = [];
    let devColors = [];

    if (currentPlatform === 'shopee') {
      devLabels = ['Shopee Mobile App', 'PC Desktop Browser'];
      devData = [Math.round(summary.shopee.visitors * 0.93), Math.round(summary.shopee.visitors * 0.07)];
      devColors = ['#EE4D2D', '#3B82F6'];
    } else if (currentPlatform === 'lazada') {
      devLabels = ['Lazada Mobile App', 'Lazada Web Browser'];
      devData = [Math.round(summary.lazada.visitors * 0.91), Math.round(summary.lazada.visitors * 0.09)];
      devColors = ['#0284C7', '#10B981'];
    } else if (currentPlatform === 'tiktok') {
      devLabels = ['TikTok Mobile App', 'TikTok Web Showcase'];
      devData = [Math.round(summary.tiktok.visitors * 0.88), Math.round(summary.tiktok.visitors * 0.12)];
      devColors = ['#FF0050', '#00F2FE'];
    } else {
      devLabels = [
        `Shopee (${Math.round(summary.shopee.visitors).toLocaleString()})`,
        `Lazada (${Math.round(summary.lazada.visitors).toLocaleString()})`,
        `TikTok (${Math.round(summary.tiktok.visitors).toLocaleString()})`
      ];
      devData = [Math.round(summary.shopee.visitors), Math.round(summary.lazada.visitors), Math.round(summary.tiktok.visitors)];
      devColors = ['#EE4D2D', '#0284C7', '#FF0050'];
    }

    charts.deviceDonut = new Chart(ctxDevice, {
      type: 'pie',
      data: {
        labels: devLabels,
        datasets: [{ data: devData, backgroundColor: devColors, borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#334155' } }
        }
      }
    });
  }
}

// 4. RENDER SOURCES TAB
function renderSourcesTab() {
  if (!dashboardData) return;
  const summary = getPlatformSummaries();
  if (!summary) return;

  const topChEl = document.getElementById('kpi-src-top-channel');
  const topChMeta = document.getElementById('kpi-src-top-channel-meta');
  const adsEl = document.getElementById('kpi-src-ads-rev');
  const adsMeta = document.getElementById('kpi-src-ads-rev-meta');
  const affEl = document.getElementById('kpi-src-aff-rev');
  const affMeta = document.getElementById('kpi-src-aff-rev-meta');
  const ctrEl = document.getElementById('kpi-src-ctr');
  const ctrMeta = document.getElementById('kpi-src-ctr-meta');

  if (summary.active.sales === 0) {
    if (topChEl) topChEl.textContent = 'No Data';
    if (topChMeta) topChMeta.textContent = '₱0 (0% Share)';
    if (adsEl) adsEl.textContent = '₱0';
    if (adsMeta) adsMeta.textContent = '0% from Ads';
    if (affEl) affEl.textContent = '₱0';
    if (affMeta) affMeta.textContent = '0% from Affiliates';
    if (ctrEl) ctrEl.textContent = '0.00% CVR';
    if (ctrMeta) ctrMeta.textContent = '0 Visitors / 0 Views';
  } else if (currentPlatform === 'shopee') {
    if (topChEl) topChEl.textContent = 'Organic Product Card';
    if (topChMeta) topChMeta.textContent = `₱${Math.round(summary.shopee.sales * 0.833).toLocaleString()} (83.3% Share)`;
    if (adsEl) adsEl.textContent = `₱${Math.round(summary.shopee.sales * 0.145).toLocaleString()}`;
    if (adsMeta) adsMeta.textContent = '14.5% from Shopee Ads';
    if (affEl) affEl.textContent = `₱${Math.round(summary.shopee.sales * 0.022).toLocaleString()}`;
    if (affMeta) affMeta.textContent = '2.2% from Affiliates';
    if (ctrEl) ctrEl.textContent = `${summary.shopee.cvr.toFixed(2)}% CVR`;
    if (ctrMeta) ctrMeta.textContent = `${Math.round(summary.shopee.visitors).toLocaleString()} Visitors / ${Math.round(summary.shopee.views).toLocaleString()} Views`;
  } else if (currentPlatform === 'lazada') {
    if (topChEl) topChEl.textContent = 'Organic Search';
    if (topChMeta) topChMeta.textContent = `₱${Math.round(summary.lazada.sales * 0.777).toLocaleString()} (77.7% Share)`;
    if (adsEl) adsEl.textContent = `₱${Math.round(summary.lazada.sales * 0.170).toLocaleString()}`;
    if (adsMeta) adsMeta.textContent = '17.0% Sponsored Ads';
    if (affEl) affEl.textContent = `₱${Math.round(summary.lazada.sales * 0.053).toLocaleString()}`;
    if (affMeta) affMeta.textContent = '5.3% Flash Sale & Promos';
    if (ctrEl) ctrEl.textContent = `${summary.lazada.cvr.toFixed(2)}% CVR`;
    if (ctrMeta) ctrMeta.textContent = `${Math.round(summary.lazada.visitors).toLocaleString()} Visitors / ${Math.round(summary.lazada.views).toLocaleString()} Views`;
  } else if (currentPlatform === 'tiktok') {
    if (topChEl) topChEl.textContent = 'Showcase Product Card';
    if (topChMeta) topChMeta.textContent = `₱${Math.round(summary.tiktok.sales * 0.600).toLocaleString()} (60.0% Share)`;
    if (adsEl) adsEl.textContent = `₱${Math.round(summary.tiktok.sales * 0.251).toLocaleString()}`;
    if (adsMeta) adsMeta.textContent = '25.1% Live & Video GMV';
    if (affEl) affEl.textContent = `₱${Math.round(summary.tiktok.sales * 0.149).toLocaleString()}`;
    if (affMeta) affMeta.textContent = '14.9% Affiliate Creators';
    if (ctrEl) ctrEl.textContent = `${summary.tiktok.cvr.toFixed(2)}% CVR`;
    if (ctrMeta) ctrMeta.textContent = `${Math.round(summary.tiktok.visitors).toLocaleString()} Visitors / ${Math.round(summary.tiktok.views).toLocaleString()} Views`;
  } else {
    if (topChEl) topChEl.textContent = 'Shopee Platform';
    if (topChMeta) topChMeta.textContent = `₱${Math.round(summary.shopee.sales).toLocaleString()} (${summary.all.sales > 0 ? (summary.shopee.sales / summary.all.sales * 100).toFixed(1) : 0}% Share)`;
    if (adsEl) adsEl.textContent = 'Lazada Platform';
    if (adsMeta) adsMeta.textContent = `₱${Math.round(summary.lazada.sales).toLocaleString()} (${summary.all.sales > 0 ? (summary.lazada.sales / summary.all.sales * 100).toFixed(1) : 0}% Share)`;
    if (affEl) affEl.textContent = 'TikTok Shop';
    if (affMeta) affMeta.textContent = `₱${Math.round(summary.tiktok.sales).toLocaleString()} (${summary.all.sales > 0 ? (summary.tiktok.sales / summary.all.sales * 100).toFixed(1) : 0}% Share)`;
    if (ctrEl) ctrEl.textContent = `${summary.all.cvr.toFixed(2)}% CVR`;
    if (ctrMeta) ctrMeta.textContent = 'Combined Traffic Clicks';
  }

  let channelsData = [];
  if (summary.active.sales === 0) {
    channelsData = [];
  } else if (currentPlatform === 'shopee') {
    channelsData = [
      { name: 'Product Card (Organic)', icon: 'fa-bag-shopping', color: '#EE4D2D', sales: Math.round(summary.shopee.sales * 0.833), share: 83.3, orders: Math.round(summary.shopee.orders * 0.85), cvr: `${summary.shopee.cvr.toFixed(2)}%`, type: 'Organic Search', badge: 'badge-success' },
      { name: 'Shopee Ads', icon: 'fa-rectangle-ad', color: '#3B82F6', sales: Math.round(summary.shopee.sales * 0.145), share: 14.5, orders: Math.round(summary.shopee.orders * 0.12), cvr: '3.20%', type: 'Paid Campaign', badge: 'badge-info' },
      { name: 'Affiliate Program', icon: 'fa-handshake', color: '#8B5CF6', sales: Math.round(summary.shopee.sales * 0.022), share: 2.2, orders: Math.round(summary.shopee.orders * 0.03), cvr: '1.80%', type: 'Partner Marketing', badge: 'badge-purple' }
    ];
  } else if (currentPlatform === 'lazada') {
    channelsData = [
      { name: 'Lazada Organic Search', icon: 'fa-magnifying-glass', color: '#0284C7', sales: Math.round(summary.lazada.sales * 0.777), share: 77.7, orders: Math.round(summary.lazada.orders * 0.80), cvr: `${summary.lazada.cvr.toFixed(2)}%`, type: 'Organic Traffic', badge: 'badge-info' },
      { name: 'Lazada Sponsored Ads', icon: 'fa-rectangle-ad', color: '#F59E0B', sales: Math.round(summary.lazada.sales * 0.170), share: 17.0, orders: Math.round(summary.lazada.orders * 0.15), cvr: '18.50%', type: 'Sponsored Solutions', badge: 'badge-warning' },
      { name: 'Flash Sale & Campaigns', icon: 'fa-bolt', color: '#10B981', sales: Math.round(summary.lazada.sales * 0.053), share: 5.3, orders: Math.round(summary.lazada.orders * 0.05), cvr: '25.00%', type: 'Promotions', badge: 'badge-success' }
    ];
  } else if (currentPlatform === 'tiktok') {
    channelsData = [
      { name: 'Product Card Showcase', icon: 'fa-store', color: '#FF0050', sales: Math.round(summary.tiktok.sales * 0.600), share: 60.0, orders: Math.round(summary.tiktok.orders * 0.60), cvr: `${summary.tiktok.cvr.toFixed(2)}%`, type: 'Organic Showcase', badge: 'badge-danger' },
      { name: 'Live & Video Commerce', icon: 'fa-video', color: '#00F2FE', sales: Math.round(summary.tiktok.sales * 0.251), share: 25.1, orders: Math.round(summary.tiktok.orders * 0.25), cvr: '2.10%', type: 'Content Commerce', badge: 'badge-info' },
      { name: 'Affiliate Creators', icon: 'fa-users', color: '#8B5CF6', sales: Math.round(summary.tiktok.sales * 0.149), share: 14.9, orders: Math.round(summary.tiktok.orders * 0.15), cvr: '1.85%', type: 'Creator Affiliate', badge: 'badge-purple' }
    ];
  } else {
    channelsData = [
      { name: 'Shopee Seller Platform', icon: 'fa-store', color: '#EE4D2D', sales: Math.round(summary.shopee.sales), share: summary.all.sales > 0 ? roundNum(summary.shopee.sales / summary.all.sales * 100, 1) : 0, orders: summary.shopee.orders, cvr: `${summary.shopee.cvr.toFixed(2)}%`, type: 'Shopee Marketplace', badge: 'badge-danger' },
      { name: 'Lazada Business Advisor', icon: 'fa-shopping-bag', color: '#0284C7', sales: Math.round(summary.lazada.sales), share: summary.all.sales > 0 ? roundNum(summary.lazada.sales / summary.all.sales * 100, 1) : 0, orders: summary.lazada.orders, cvr: `${summary.lazada.cvr.toFixed(2)}%`, type: 'Lazada Marketplace', badge: 'badge-info' },
      { name: 'TikTok Shop Analytics', icon: 'fa-music', color: '#FF0050', sales: Math.round(summary.tiktok.sales), share: summary.all.sales > 0 ? roundNum(summary.tiktok.sales / summary.all.sales * 100, 1) : 0, orders: summary.tiktok.orders, cvr: `${summary.tiktok.cvr.toFixed(2)}%`, type: 'TikTok Commerce', badge: 'badge-purple' }
    ];
  }

  const tbody = document.getElementById('channelTableBody');
  if (tbody) {
    if (channelsData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No traffic sources recorded yet. Upload an Excel report to view channels.</td></tr>`;
    } else {
      tbody.innerHTML = channelsData.map(ch => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 34px; height: 34px; border-radius: 8px; background: ${ch.color}15; color: ${ch.color}; display: flex; align-items: center; justify-content: center; font-size: 15px;">
                <i class="fa-solid ${ch.icon}"></i>
              </div>
              <strong style="color: var(--text-primary); font-size: 14px;">${ch.name}</strong>
            </div>
          </td>
          <td style="font-family: var(--font-heading); font-weight: 700; color: var(--text-primary); font-size: 15px;">₱${ch.sales.toLocaleString()}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="flex: 1; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; max-width: 120px;">
                <div style="width: ${ch.share}%; height: 100%; background: ${ch.color}; border-radius: 4px;"></div>
              </div>
              <span style="font-weight: 600; font-size: 12px; color: var(--text-secondary);">${ch.share}%</span>
            </div>
          </td>
          <td><span style="font-weight: 600; color: var(--text-primary);">${ch.orders} orders</span></td>
          <td><strong style="color: var(--success-green); font-size: 13px;">${ch.cvr}</strong></td>
          <td><span class="badge ${ch.badge}">${ch.type}</span></td>
        </tr>
      `).join('');
    }
  }

  const canvasSourcesBar = document.getElementById('sourcesBarChart');
  if (canvasSourcesBar) {
    destroyChart('sourcesBar');
    const ctxSourcesBar = canvasSourcesBar.getContext('2d');
    charts.sourcesBar = new Chart(ctxSourcesBar, {
      type: 'bar',
      data: {
        labels: channelsData.map(c => c.name),
        datasets: [{
          label: 'Sales (PHP)',
          data: channelsData.map(c => c.sales),
          backgroundColor: channelsData.map(c => c.color),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        ...chartDefaults
      }
    });
  }

  const canvasCtr = document.getElementById('sourcesCtrChart');
  if (canvasCtr) {
    destroyChart('sourcesCtr');
    const ctxCtr = canvasCtr.getContext('2d');
    
    let ctrLabels = ['Impressions / Views', 'Clicks / Visitors', 'Confirmed Orders'];
    let ctrData = [Math.round(summary.active.views), Math.round(summary.active.visitors), Math.round(summary.active.orders)];

    charts.sourcesCtr = new Chart(ctxCtr, {
      type: 'bar',
      data: {
        labels: ctrLabels,
        datasets: [{
          label: 'Volume',
          data: ctrData,
          backgroundColor: ['#3B82F6', '#10B981', '#EE4D2D'],
          borderRadius: 6
        }]
      },
      options: chartDefaults
    });
  }
}

// 5. RENDER PRODUCT TAB
function renderProductTab() {
  if (!dashboardData) return;
  const summary = getPlatformSummaries();
  if (!summary) return;

  const viewsEl = document.getElementById('kpi-prod-views');
  const viewsMeta = document.getElementById('kpi-prod-views-meta');
  const atcEl = document.getElementById('kpi-atc-units');
  const atcMeta = document.getElementById('kpi-atc-units-meta');
  const searchEl = document.getElementById('kpi-search-clicks');
  const searchMeta = document.getElementById('kpi-search-clicks-meta');
  const likesEl = document.getElementById('kpi-likes');
  const likesMeta = document.getElementById('kpi-likes-meta');

  if (summary.active.sales === 0) {
    if (viewsEl) viewsEl.textContent = '0';
    if (viewsMeta) viewsMeta.textContent = 'Views across store items';
    if (atcEl) atcEl.textContent = '0';
    if (atcMeta) atcMeta.textContent = 'Cart Additions (0.0% CVR)';
    if (searchEl) searchEl.textContent = '0';
    if (searchMeta) searchMeta.textContent = 'In-app search clicks';
    if (likesEl) likesEl.textContent = '0';
    if (likesMeta) likesMeta.textContent = 'Favorites & Wishlists';
  } else {
    if (viewsEl) viewsEl.textContent = `${Math.round(summary.active.views * 0.92).toLocaleString()}`;
    if (viewsMeta) viewsMeta.textContent = 'Views across store items';
    if (atcEl) atcEl.textContent = `${Math.round(summary.active.atc).toLocaleString()}`;
    if (atcMeta) atcMeta.textContent = `Cart Additions (${summary.active.cvr.toFixed(1)}% CVR)`;
    if (searchEl) searchEl.textContent = `${Math.round(summary.active.visitors * 0.52).toLocaleString()}`;
    if (searchMeta) searchMeta.textContent = 'In-app search clicks';
    if (likesEl) likesEl.textContent = `${Math.round(summary.active.orders * 0.85).toLocaleString()}`;
    if (likesMeta) likesMeta.textContent = 'Favorites & Wishlists';
  }

  const rawProdDaily = dashboardData.product_overview || [];
  const rawLazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const rawTiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];
  const rawShopeePaid = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];

  const prodDaily = filterBySelectedMonth(rawProdDaily);
  const lazadaDaily = filterBySelectedMonth(rawLazadaDaily);
  const tiktokDaily = filterBySelectedMonth(rawTiktokDaily);
  const paidRows = filterBySelectedMonth(rawShopeePaid);

  const labels = getFilteredLabels(paidRows, lazadaDaily, tiktokDaily);
  
  let views = [];
  let atc = [];

  if (currentPlatform === 'lazada') {
    views = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).pageviews || 0);
    atc = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).units_sold || 0);
  } else if (currentPlatform === 'tiktok') {
    views = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).pageviews || 0);
    atc = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).units_sold || 0);
  } else {
    views = prodDaily.map(r => r.page_views);
    atc = prodDaily.map(r => r.atc_units);
  }

  const canvasProd = document.getElementById('productFunnelChart');
  if (canvasProd) {
    destroyChart('productFunnel');
    const ctxProd = canvasProd.getContext('2d');
    charts.productFunnel = new Chart(ctxProd, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Product Page Views', data: views, borderColor: '#3B82F6', tension: 0.3, yAxisID: 'y' },
          { label: 'Units Sold / Cart Additions', data: atc, borderColor: '#EE4D2D', backgroundColor: 'rgba(238, 77, 45, 0.1)', fill: true, tension: 0.3, yAxisID: 'y1' }
        ]
      },
      options: {
        ...chartDefaults,
        scales: {
          x: chartDefaults.scales.x,
          y: { ...chartDefaults.scales.y, title: { display: true, text: 'Page Views', color: '#64748B' } },
          y1: { position: 'right', ticks: { color: '#EE4D2D' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Units', color: '#EE4D2D' } }
        }
      }
    });
  }
}

function parseDateMonthDay(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      return {
        day: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        year: parseInt(parts[2], 10),
        monthKey: `${parts[2]}-${String(parts[1]).padStart(2, '0')}`
      };
    }
  } else if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return {
          day: parseInt(parts[2], 10),
          month: parseInt(parts[1], 10),
          year: parseInt(parts[0], 10),
          monthKey: `${parts[0]}-${String(parts[1]).padStart(2, '0')}`
        };
      } else {
        return {
          day: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10),
          year: parseInt(parts[2], 10),
          monthKey: `${parts[2]}-${String(parts[1]).padStart(2, '0')}`
        };
      }
    }
  }
  return null;
}

function parseDateDay(dateStr) {
  const p = parseDateMonthDay(dateStr);
  return p ? p.day : null;
}

function extractRecordSales(r) {
  if (!r) return 0;
  let val = r['Sales (PHP)'] ?? r.sales ?? r.sales_placed ?? r.sales_confirmed ?? r.gmv ?? r.revenue ?? r.gross_sales ?? r.gross_revenue ?? 0;
  if (typeof val === 'string') {
    val = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
  }
  return typeof val === 'number' && !isNaN(val) ? val : 0;
}

function extractRecordOrders(r) {
  if (!r) return 0;
  let val = r.Orders ?? r.orders ?? r.orders_placed ?? r.orders_confirmed ?? r.buyers ?? 0;
  if (typeof val === 'string') {
    val = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
  }
  return typeof val === 'number' && !isNaN(val) ? val : 0;
}

// 6. RENDER DAILY SALES CALENDAR & HEATMAP
function renderCalendarTab(targetMonthKey) {
  if (!dashboardData) return;

  const monthSel = document.getElementById('calendar-month-select');
  if (!targetMonthKey && monthSel) {
    targetMonthKey = monthSel.value;
  }
  if (!targetMonthKey || targetMonthKey === 'all') targetMonthKey = '2026-08';

  const [yearStr, monthStr] = targetMonthKey.split('-');
  const year = parseInt(yearStr, 10) || 2026;
  const month = parseInt(monthStr, 10) || 8;
  const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthName = monthNames[month] || "August";

  const monthEl = document.getElementById('kpi-cal-month');
  const monthMeta = document.getElementById('kpi-cal-month-meta');
  const salesEl = document.getElementById('kpi-cal-sales');
  const salesMeta = document.getElementById('kpi-cal-sales-meta');
  const peakEl = document.getElementById('kpi-cal-peak');
  const peakMeta = document.getElementById('kpi-cal-peak-meta');
  const ordersEl = document.getElementById('kpi-cal-orders');
  const ordersMeta = document.getElementById('kpi-cal-orders-meta');

  const paidRows = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];
  const lazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const tiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];

  const shopeeByDay = {};
  paidRows.forEach(r => {
    const parsed = parseDateMonthDay(r.Date || r.date);
    if (parsed && parsed.monthKey === targetMonthKey) shopeeByDay[parsed.day] = r;
  });

  const lazadaByDay = {};
  lazadaDaily.forEach(r => {
    const parsed = parseDateMonthDay(r.date || r.raw_date);
    if (parsed && parsed.monthKey === targetMonthKey) lazadaByDay[parsed.day] = r;
  });

  const tiktokByDay = {};
  tiktokDaily.forEach(r => {
    const parsed = parseDateMonthDay(r.date);
    if (parsed && parsed.monthKey === targetMonthKey) tiktokByDay[parsed.day] = r;
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();

  let monthTotalSales = 0;
  let monthTotalOrders = 0;
  let daysCount = 0;
  let maxSales = 0;
  let peakDay = 1;

  for (let d = 1; d <= daysInMonth; d++) {
    const shData = shopeeByDay[d];
    const lazData = lazadaByDay[d];
    const tikData = tiktokByDay[d];

    let dSales = 0;
    let dOrders = 0;
    let dHasData = false;

    if (currentPlatform === 'shopee') {
      if (shData) { dSales = extractRecordSales(shData); dOrders = extractRecordOrders(shData); dHasData = true; }
    } else if (currentPlatform === 'lazada') {
      if (lazData) { dSales = extractRecordSales(lazData); dOrders = extractRecordOrders(lazData); dHasData = true; }
    } else if (currentPlatform === 'tiktok') {
      if (tikData) { dSales = extractRecordSales(tikData); dOrders = extractRecordOrders(tikData); dHasData = true; }
    } else {
      if (shData || lazData || tikData) {
        dSales = extractRecordSales(shData) + extractRecordSales(lazData) + extractRecordSales(tikData);
        dOrders = extractRecordOrders(shData) + extractRecordOrders(lazData) + extractRecordOrders(tikData);
        dHasData = true;
      }
    }

    if (dHasData) {
      daysCount++;
      monthTotalSales += dSales;
      monthTotalOrders += dOrders;
      if (dSales > maxSales) {
        maxSales = dSales;
        peakDay = d;
      }
    }
  }

  if (monthEl) monthEl.textContent = `${monthName} ${year}`;
  if (monthMeta) monthMeta.textContent = `${daysCount} Days Recorded`;

  if (salesEl) salesEl.textContent = `₱${monthTotalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (salesMeta) salesMeta.textContent = `Avg ₱${(daysCount > 0 ? (monthTotalSales / daysCount) : 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} / Day`;

  const monthShort = monthName.substring(0, 3);
  if (peakEl) peakEl.textContent = `${monthShort} ${peakDay} (₱${Math.round(maxSales).toLocaleString()})`;
  if (peakMeta) peakMeta.textContent = (month === 9 && peakDay === 9) ? '9.9 Mega Sale Peak' : 'Peak Sales Day';

  if (ordersEl) ordersEl.textContent = `${monthTotalOrders} Orders`;
  const aov = monthTotalOrders > 0 ? (monthTotalSales / monthTotalOrders) : 0;
  if (ordersMeta) ordersMeta.textContent = `AOV: ₱${aov.toFixed(2)}`;

  const calendarGrid = document.getElementById('calendarGrid');
  if (!calendarGrid) return;

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let gridHTML = daysOfWeek.map(d => `<div class="calendar-day-head">${d}</div>`).join('');

  for (let empty = 0; empty < firstDayIndex; empty++) {
    gridHTML += `<div class="calendar-day-cell empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const shData = shopeeByDay[d];
    const lazData = lazadaByDay[d];
    const tikData = tiktokByDay[d];

    let sales = 0;
    let orders = 0;
    let hasData = false;

    if (currentPlatform === 'shopee') {
      if (shData) {
        sales = extractRecordSales(shData);
        orders = extractRecordOrders(shData);
        hasData = true;
      }
    } else if (currentPlatform === 'lazada') {
      if (lazData) {
        sales = extractRecordSales(lazData);
        orders = extractRecordOrders(lazData);
        hasData = true;
      }
    } else if (currentPlatform === 'tiktok') {
      if (tikData) {
        sales = extractRecordSales(tikData);
        orders = extractRecordOrders(tikData);
        hasData = true;
      }
    } else {
      if (shData || lazData || tikData) {
        sales = extractRecordSales(shData) + extractRecordSales(lazData) + extractRecordSales(tikData);
        orders = extractRecordOrders(shData) + extractRecordOrders(lazData) + extractRecordOrders(tikData);
        hasData = true;
      }
    }

    if (hasData) {
      let heatClass = '';
      let badgeHTML = '';

      if (month === 9 && d === 9) {
        badgeHTML = `<span class="calendar-tag mega">🔥 9.9 Mega</span>`;
        heatClass = 'heat-level-4';
      } else if (month === 9 && d === 15) {
        badgeHTML = `<span class="calendar-tag payday">⚡ Payday</span>`;
        heatClass = 'heat-level-3';
      } else if (month === 8 && d === 15) {
        badgeHTML = `<span class="calendar-tag payday">⚡ Payday</span>`;
        heatClass = 'heat-level-3';
      } else if (sales >= 5000) {
        heatClass = 'heat-level-4';
      } else if (sales >= 2500) {
        heatClass = 'heat-level-3';
      } else if (sales >= 1000) {
        heatClass = 'heat-level-2';
      }

      gridHTML += `
        <div class="calendar-day-cell ${heatClass}" data-day="${d}">
          <div class="calendar-cell-top">
            <span class="calendar-date-num">${d}</span>
            ${badgeHTML}
          </div>
          <div class="calendar-cell-body">
            <div class="calendar-sales-val">₱${Math.round(sales).toLocaleString()}</div>
            <div class="calendar-orders-count">${orders} orders</div>
          </div>
        </div>
      `;
    } else {
      gridHTML += `
        <div class="calendar-day-cell no-data">
          <div class="calendar-cell-top">
            <span class="calendar-date-num" style="color: var(--text-muted);">${d}</span>
          </div>
          <div class="calendar-cell-body">
            <div style="font-size: 11px; color: var(--text-muted);">No data</div>
          </div>
        </div>
      `;
    }
  }

  calendarGrid.innerHTML = gridHTML;

  const dayCells = calendarGrid.querySelectorAll('.calendar-day-cell[data-day]');
  const inspector = document.getElementById('dayInspector');

  function selectDay(dayNum) {
    dayCells.forEach(c => c.classList.remove('selected'));
    const targetCell = calendarGrid.querySelector(`.calendar-day-cell[data-day="${dayNum}"]`);
    if (targetCell) targetCell.classList.add('selected');

    const shData = shopeeByDay[dayNum] || {};
    const lazData = lazadaByDay[dayNum] || {};
    const tikData = tiktokByDay[dayNum] || {};
    const dateStr = `${monthName} ${dayNum}, ${year}`;

    if (inspector) {
      if (currentPlatform === 'shopee') {
        const sales = (shData['Sales (PHP)'] || 0).toLocaleString();
        const orders = shData.Orders || 0;
        const visitors = shData.Visitors || 0;
        const cvr = shData['Order Conversion Rate'] || 0;
        const aovVal = orders > 0 ? ((shData['Sales (PHP)'] || 0) / orders).toFixed(2) : '0';

        inspector.innerHTML = `
          <div class="inspector-card">
            <div class="inspector-header">
              <div>
                <h3><i class="fa-solid fa-store" style="color: var(--shopee-orange); margin-right: 8px;"></i>Shopee Metrics: ${dateStr}</h3>
                <p>Shopee Store daily performance</p>
              </div>
            </div>
            <div class="inspector-metrics-grid">
              <div class="inspector-metric"><span class="label">Shopee Sales</span><span class="val orange">₱${sales}</span></div>
              <div class="inspector-metric"><span class="label">Shopee Orders</span><span class="val green">${orders} orders</span></div>
              <div class="inspector-metric"><span class="label">Average Order Value</span><span class="val">₱${aovVal}</span></div>
              <div class="inspector-metric"><span class="label">Visitors</span><span class="val blue">${visitors}</span></div>
              <div class="inspector-metric"><span class="label">Conversion Rate</span><span class="val green">${cvr}%</span></div>
            </div>
          </div>
        `;
      } else if (currentPlatform === 'lazada') {
        const sales = (lazData.sales || 0).toLocaleString();
        const orders = lazData.orders || 0;
        const visitors = lazData.visitors || 0;
        const cvr = lazData.cvr || 0;
        const aovVal = orders > 0 ? ((lazData.sales || 0) / orders).toFixed(2) : '0';

        inspector.innerHTML = `
          <div class="inspector-card">
            <div class="inspector-header">
              <div>
                <h3><i class="fa-solid fa-shopping-bag" style="color: #0284C7; margin-right: 8px;"></i>Lazada Metrics: ${dateStr}</h3>
                <p>Lazada Business Advisor daily performance</p>
              </div>
            </div>
            <div class="inspector-metrics-grid">
              <div class="inspector-metric"><span class="label">Lazada Sales</span><span class="val blue">₱${sales}</span></div>
              <div class="inspector-metric"><span class="label">Lazada Orders</span><span class="val green">${orders} orders</span></div>
              <div class="inspector-metric"><span class="label">Average Order Value</span><span class="val">₱${aovVal}</span></div>
              <div class="inspector-metric"><span class="label">Visitors</span><span class="val blue">${visitors}</span></div>
              <div class="inspector-metric"><span class="label">Conversion Rate</span><span class="val green">${cvr}%</span></div>
            </div>
          </div>
        `;
      } else if (currentPlatform === 'tiktok') {
        const sales = (tikData.sales || 0).toLocaleString();
        const orders = tikData.orders || 0;
        const visitors = tikData.visitors || 0;
        const cvr = tikData.cvr || 0;
        const aovVal = orders > 0 ? ((tikData.sales || 0) / orders).toFixed(2) : '0';

        inspector.innerHTML = `
          <div class="inspector-card">
            <div class="inspector-header">
              <div>
                <h3><i class="fa-solid fa-music" style="color: #FF0050; margin-right: 8px;"></i>TikTok Shop Metrics: ${dateStr}</h3>
                <p>TikTok Shop Analytics daily performance</p>
              </div>
            </div>
            <div class="inspector-metrics-grid">
              <div class="inspector-metric"><span class="label">TikTok Sales</span><span class="val red" style="color: #FF0050;">₱${sales}</span></div>
              <div class="inspector-metric"><span class="label">TikTok Orders</span><span class="val green">${orders} orders</span></div>
              <div class="inspector-metric"><span class="label">Average Order Value</span><span class="val">₱${aovVal}</span></div>
              <div class="inspector-metric"><span class="label">Visitors</span><span class="val blue">${visitors}</span></div>
              <div class="inspector-metric"><span class="label">Conversion Rate</span><span class="val green">${cvr}%</span></div>
            </div>
          </div>
        `;
      } else {
        const shSales = shData['Sales (PHP)'] || 0;
        const lazSales = lazData.sales || 0;
        const tikSales = tikData.sales || 0;
        const totSales = (shSales + lazSales + tikSales).toLocaleString();
        const shOrders = shData.Orders || 0;
        const lazOrders = lazData.orders || 0;
        const tikOrders = tikData.orders || 0;
        const totOrders = shOrders + lazOrders + tikOrders;

        inspector.innerHTML = `
          <div class="inspector-card">
            <div class="inspector-header">
              <div>
                <h3><i class="fa-solid fa-globe" style="color: var(--purple-accent); margin-right: 8px;"></i>Multi-Platform Breakdown: ${dateStr}</h3>
                <p>Combined Shopee + Lazada + TikTok daily performance</p>
              </div>
            </div>
            <div class="inspector-metrics-grid">
              <div class="inspector-metric"><span class="label">Combined Total Sales</span><span class="val orange">₱${totSales}</span></div>
              <div class="inspector-metric"><span class="label">Total Orders</span><span class="val green">${totOrders} orders</span></div>
              <div class="inspector-metric"><span class="label">Shopee Share</span><span class="val orange">₱${shSales.toLocaleString()} (${shOrders} orders)</span></div>
              <div class="inspector-metric"><span class="label">Lazada Share</span><span class="val blue">₱${lazSales.toLocaleString()} (${lazOrders} orders)</span></div>
              <div class="inspector-metric"><span class="label">TikTok Share</span><span class="val" style="color: #FF0050;">₱${tikSales.toLocaleString()} (${tikOrders} orders)</span></div>
            </div>
          </div>
        `;
      }
    }
  }

  dayCells.forEach(cell => {
    cell.addEventListener('click', () => {
      const day = parseInt(cell.getAttribute('data-day'), 10);
      selectDay(day);
    });
  });

  if (peakDay) selectDay(peakDay);
}

// 7. RENDER MASTER DATA EXPLORER
function renderExplorerTab() {
  if (!dashboardData) return;

  const rawPaid = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];
  const rawTraffic = dashboardData.traffic_overview ? dashboardData.traffic_overview.all.daily || [] : [];
  const rawProd = dashboardData.product_overview || [];
  const rawLazada = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const rawTiktok = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];

  const paidRows = filterBySelectedMonth(rawPaid);
  const trafficRows = filterBySelectedMonth(rawTraffic);
  const prodRows = filterBySelectedMonth(rawProd);
  const lazadaDaily = filterBySelectedMonth(rawLazada);
  const tiktokDaily = filterBySelectedMonth(rawTiktok);

  const tbody = document.getElementById('masterTableBody');
  if (!tbody) return;

  function updateTable(filterText = '') {
    tbody.innerHTML = '';

    let masterList = [];

    if (currentPlatform === 'shopee' || currentPlatform === 'all') {
      paidRows.forEach((r, idx) => {
        const tr = trafficRows[idx] || {};
        const pr = prodRows[idx] || {};
        masterList.push({
          platform: 'Shopee',
          badgeClass: 'badge-danger',
          date: r.Date,
          sales: r['Sales (PHP)'] || 0,
          orders: r.Orders || 0,
          visitors: r.Visitors || 0,
          views: tr.page_views || 0,
          atc: pr.atc_units || 0,
          cvr: `${r['Order Conversion Rate'] || 0}%`,
          cancelled: r['Cancelled Orders'] || 0
        });
      });
    }

    if (currentPlatform === 'lazada' || currentPlatform === 'all') {
      lazadaDaily.forEach(r => {
        masterList.push({
          platform: 'Lazada',
          badgeClass: 'badge-info',
          date: r.date,
          sales: r.sales || 0,
          orders: r.orders || 0,
          visitors: r.visitors || 0,
          views: r.pageviews || 0,
          atc: r.units_sold || 0,
          cvr: `${r.cvr || 0}%`,
          cancelled: r.cancelled_sales > 0 ? 1 : 0
        });
      });
    }

    if (currentPlatform === 'tiktok' || currentPlatform === 'all') {
      tiktokDaily.forEach(r => {
        masterList.push({
          platform: 'TikTok',
          badgeClass: 'badge-purple',
          date: r.date,
          sales: r.sales || 0,
          orders: r.orders || 0,
          visitors: r.visitors || 0,
          views: r.pageviews || 0,
          atc: r.units_sold || 0,
          cvr: `${r.cvr || 0}%`,
          cancelled: r.gross_sales > r.sales ? 1 : 0
        });
      });
    }

    masterList.forEach(item => {
      const rowStr = `${item.platform} ${item.date} ${item.sales} ${item.orders}`.toLowerCase();
      if (filterText && !rowStr.includes(filterText.toLowerCase())) return;

      const trElement = document.createElement('tr');
      const platformColor = item.platform === 'Shopee' ? '#EE4D2D' : (item.platform === 'Lazada' ? '#0284C7' : '#FF0050');

      trElement.innerHTML = `
        <td><span class="badge ${item.badgeClass}">${item.platform}</span> <strong>${item.date}</strong></td>
        <td style="color: ${platformColor}; font-weight: 700;">₱${item.sales.toLocaleString()}</td>
        <td><span class="badge badge-success">${item.orders} Orders</span></td>
        <td>${item.visitors}</td>
        <td>${item.views}</td>
        <td><span class="badge badge-warning">${item.atc} units</span></td>
        <td>${item.cvr}</td>
        <td>${item.cancelled > 0 ? `<span class="badge badge-danger">${item.cancelled} cancelled</span>` : '<span style="color: #64748B;">0</span>'}</td>
      `;
      tbody.appendChild(trElement);
    });
  }

  updateTable();

  const searchInput = document.getElementById('tableSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      updateTable(e.target.value);
    });
  }
}

// Export CSV & JSON Handlers
function setupExportHandlers() {
  const jsonBtn = document.getElementById('export-json-btn');
  if (jsonBtn) {
    jsonBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dashboardData, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", "multiplatform_firstprotect_analytics.json");
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
    });
  }

  const csvBtn = document.getElementById('export-csv-btn');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      const paidRows = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];
      let csv = "Platform,Date,Paid Sales (PHP),Paid Orders,Visitors,Order Conversion Rate\n";
      paidRows.forEach(r => {
        csv += `"Shopee","${r.Date}",${r['Sales (PHP)']},${r.Orders},${r.Visitors},"${r['Order Conversion Rate']}"\n`;
      });
      const lazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
      lazadaDaily.forEach(r => {
        csv += `"Lazada","${r.date}",${r.sales},${r.orders},${r.visitors},"${r.cvr}%"\n`;
      });
      const tiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];
      tiktokDaily.forEach(r => {
        csv += `"TikTok","${r.date}",${r.sales},${r.orders},${r.visitors},"${r.cvr}%"\n`;
      });

      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", "firstprotect_multiplatform_sales_report.csv");
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
    });
  }
}

// 8. DATA IMPORT MODULE & FILE PARSER
function initImportModule() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('excel-file-input');
  const browseBtn = document.getElementById('btn-browse-file');
  const resetBtn = document.getElementById('reset-dataset-btn');

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processExcelFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processExcelFile(e.target.files[0]);
        fileInput.value = '';
      }
    });
  }

  const clearBtn = document.getElementById('clear-dataset-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      localStorage.removeItem('shopee_dashboard_imported_data');
      try {
        await fetch('/api/clear/', { method: 'POST' });
      } catch (e) {
        try { await fetch('/api/reset/?mode=clear', { method: 'POST' }); } catch (err) {}
      }
      await loadData();
      showImportAlert('success', 'Back to Zero! All database records cleared. 0 active records remaining. Ready for fresh Excel uploads!');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      localStorage.removeItem('shopee_dashboard_imported_data');
      try {
        await fetch('/api/reset/', { method: 'POST' });
      } catch (e) {}
      await loadData();
      showImportAlert('success', 'Reset complete! Reloaded original default dataset into Django SQLite database.');
    });
  }

  setupTemplateDownloads();
}

function showImportAlert(type, message) {
  const box = document.getElementById('import-status-box');
  if (!box) return;

  const iconClass = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
  box.className = `status-alert ${type}`;
  box.style.display = 'flex';
  box.innerHTML = `<i class="fa-solid ${iconClass}" style="font-size: 16px;"></i> <span>${message}</span>`;
}

async function processExcelFile(file) {
  if (!file) return;

  const targetPlatformSelect = document.getElementById('import-target-platform');
  const selectedTarget = targetPlatformSelect ? targetPlatformSelect.value : 'auto';

  let detectedPlatform = selectedTarget;
  const fileNameLower = file.name.toLowerCase();

  if (detectedPlatform === 'auto') {
    if (fileNameLower.includes('tiktok') || fileNameLower.includes('shop analytics') || fileNameLower.includes('product card traffic')) {
      detectedPlatform = 'tiktok';
    } else if (fileNameLower.includes('lazada') || fileNameLower.includes('business advisor')) {
      detectedPlatform = 'lazada';
    } else {
      detectedPlatform = 'shopee';
    }
  }

  // 1. Attempt upload to Django REST API Server
  let apiSuccess = false;
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', detectedPlatform);

    const response = await fetch('/api/import/', {
      method: 'POST',
      body: formData
    });

        if (response.ok) {
      const result = await response.json();
      console.log('Django API Upload Result:', result);
      apiSuccess = true;
      
      currentPlatform = detectedPlatform;
      const platformSelect = document.getElementById('platform-select');
      if (platformSelect) platformSelect.value = detectedPlatform;
      const icon = document.getElementById('platform-icon');
      if (icon) {
        if (detectedPlatform === 'shopee') { icon.className = 'fa-solid fa-store'; icon.style.color = 'var(--shopee-orange)'; }
        else if (detectedPlatform === 'lazada') { icon.className = 'fa-solid fa-shopping-bag'; icon.style.color = '#0284C7'; }
        else if (detectedPlatform === 'tiktok') { icon.className = 'fa-solid fa-music'; icon.style.color = '#FF0050'; }
      }

      await loadData();

      const platformNameMap = { 'shopee': 'Shopee', 'lazada': 'Lazada', 'tiktok': 'TikTok Shop' };
      showImportAlert('success', `Successfully saved <strong>${file.name}</strong> to Django Database for <strong>${platformNameMap[detectedPlatform]}</strong>! Loaded <strong>${result.rows_loaded} daily rows</strong> (Total Sales: ₱${Math.round(result.total_sales).toLocaleString()}, Orders: ${result.total_orders}).`);
      return;
    }
  } catch (err) {
    console.warn('Django API upload unavailable, processing in-memory:', err);
  }

  // 2. Client-side SheetJS Parsing Fallback (if server API is offline)
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        showImportAlert('error', 'The uploaded file contains no readable sheets.');
        return;
      }

      let parsedRecords = parseWorkbookSheets(workbook, detectedPlatform);

      if (parsedRecords.length === 0) {
        showImportAlert('error', `Could not parse valid daily records from <strong>${file.name}</strong>. Please ensure the file matches one of the 7 reference Excel export formats.`);
        return;
      }

      updateDashboardData(detectedPlatform, parsedRecords, file.name);
      renderAllViews();

      const platformNameMap = { 'shopee': 'Shopee', 'lazada': 'Lazada', 'tiktok': 'TikTok Shop' };
      const totalSales = parsedRecords.reduce((sum, r) => sum + r.sales, 0);
      const totalOrders = parsedRecords.reduce((sum, r) => sum + r.orders, 0);

      showImportAlert('success', `Successfully imported <strong>${file.name}</strong> for <strong>${platformNameMap[detectedPlatform]}</strong>! Loaded <strong>${parsedRecords.length} daily rows</strong> (Total Sales: ₱${Math.round(totalSales).toLocaleString()}, Orders: ${totalOrders}).`);

    } catch (err) {
      console.error('File parsing error:', err);
      showImportAlert('error', `Failed to parse Excel file: ${err.message}`);
    }
  };

  reader.readAsArrayBuffer(file);
}

function parseWorkbookSheets(workbook, platform) {
  let records = [];

  function cleanNum(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).replace(/₱|PHP|,|%|\s/g, '').trim();
    if (str === '-' || str === '') return 0;
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  }

  function formatDateStr(val) {
    if (!val) return null;
    if (typeof val === 'number') {
      try {
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj) {
          const d = String(dateObj.d).padStart(2, '0');
          const m = String(dateObj.m).padStart(2, '0');
          const y = dateObj.y;
          return `${d}/${m}/${y}`;
        }
      } catch (e) {}
    }
    const s = String(val).trim();
    if (!s || s.toLowerCase() === 'nan' || s.toLowerCase().includes('total')) return null;

    if (s.includes('-') && s.length > 10 && (s.includes('/') || s.includes('~') || s.split('-').length > 2)) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const parts = s.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return s;
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows || rows.length === 0) continue;

    for (let r_i = 0; r_i < rows.length; r_i++) {
      const row = rows[r_i];
      if (!row || row.length === 0) continue;
      const rowStrs = row.map(x => String(x || '').trim().toLowerCase());

      if (rowStrs.some(h => h === 'date' || h === 'time' || h.includes('date') || h.includes('time'))) {
        const headers = row.map(x => String(x || '').trim());
        let dateCol = -1, salesCol = -1, ordersCol = -1, visitorsCol = -1, viewsCol = -1;

        headers.forEach((h, colIdx) => {
          const hl = h.toLowerCase();
          if ((hl === 'date' || hl === 'time' || hl.includes('date') || hl.includes('time')) && dateCol === -1) {
            dateCol = colIdx;
          } else if (salesCol === -1 && (hl.includes('sales (php)') || hl.includes('sales (placed orders)') || hl.includes('sales(confirmed orders)') || hl.includes('product card-attributed gmv') || hl.includes('gross revenue') || hl.includes('revenue') || hl.includes('gmv') || hl === 'sales')) {
            salesCol = colIdx;
          } else if (ordersCol === -1 && (hl === 'orders' || hl.includes('orders (placed orders)') || hl.includes('orders (confirmed orders)') || hl === 'buyers' || hl === 'customers' || hl.includes('attributed sku orders'))) {
            ordersCol = colIdx;
          } else if (visitorsCol === -1 && (hl.includes('visitors') || hl === 'viewers' || hl.includes('visitors (visit)'))) {
            visitorsCol = colIdx;
          } else if (viewsCol === -1 && (hl.includes('page views') || hl.includes('pageviews') || hl === 'views' || hl.includes('product page views'))) {
            viewsCol = colIdx;
          }
        });

        if (dateCol !== -1) {
          const sheetRecords = [];
          for (let data_r = r_i + 1; data_r < rows.length; data_r++) {
            const d_row = rows[data_r];
            if (!d_row || d_row.length === 0) continue;

            const dateVal = formatDateStr(d_row[dateCol]);
            if (!dateVal) continue;

            const salesVal = salesCol !== -1 ? cleanNum(d_row[salesCol]) : 0;
            const ordersVal = ordersCol !== -1 ? cleanNum(d_row[ordersCol]) : 0;
            const visitorsVal = visitorsCol !== -1 ? cleanNum(d_row[visitorsCol]) : 0;
            const viewsVal = viewsCol !== -1 ? cleanNum(d_row[viewsCol]) : 0;

            if (dateVal && (salesVal > 0 || ordersVal > 0 || visitorsVal > 0 || viewsVal > 0)) {
              sheetRecords.push({
                date: dateVal,
                sales: salesVal,
                orders: ordersVal,
                visitors: visitorsVal,
                pageviews: viewsVal,
                cvr: visitorsVal > 0 ? roundNum((ordersVal / visitorsVal) * 100, 2) : 0
              });
            }
          }

          if (sheetRecords.length > 0) {
            records = sheetRecords;
            break;
          }
        }
      }
    }

    if (records.length > 0) break;
  }

  return records;
}

function roundNum(num, dec = 2) {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

function updateDashboardData(platform, records, filename) {
  if (!dashboardData) dashboardData = {};

  const totalSales = records.reduce((sum, r) => sum + r.sales, 0);
  const totalOrders = records.reduce((sum, r) => sum + r.orders, 0);
  const totalVisitors = records.reduce((sum, r) => sum + r.visitors, 0);
  const totalViews = records.reduce((sum, r) => sum + r.pageviews, 0);
  const cvr = totalVisitors > 0 ? roundNum((totalOrders / totalVisitors) * 100, 2) : 0;

  if (platform === 'shopee') {
    dashboardData.shopee_stats = {
      paid_order: records.map(r => ({
        "Date": r.date,
        "Sales (PHP)": r.sales,
        "Orders": r.orders,
        "Visitors": r.visitors,
        "Order Conversion Rate": r.cvr,
        "Cancelled Sales": 0,
        "Cancelled Orders": 0,
        "Sales (Shopee Rebate applied)": r.sales
      }))
    };
  } else if (platform === 'lazada') {
    dashboardData.lazada_stats = {
      summary: {
        revenue: totalSales,
        orders: totalOrders,
        visitors: totalVisitors,
        pageviews: totalViews,
        conversion_rate: cvr,
        units_sold: totalOrders * 2
      },
      daily: records.map(r => ({
        date: r.date,
        sales: r.sales,
        orders: r.orders,
        visitors: r.visitors,
        pageviews: r.pageviews,
        units_sold: r.orders * 2,
        cvr: r.cvr,
        cancelled_sales: 0,
        refund_sales: 0
      }))
    };
  } else if (platform === 'tiktok') {
    dashboardData.tiktok_stats = {
      summary: {
        revenue: totalSales,
        gross_revenue: totalSales,
        orders: totalOrders,
        buyers: totalOrders,
        units_sold: totalOrders * 3,
        pageviews: totalViews,
        visitors: totalVisitors,
        conversion_rate: cvr,
        aov: totalOrders > 0 ? roundNum(totalSales / totalOrders, 2) : 0
      },
      daily: records.map(r => ({
        date: r.date,
        gmv: r.sales,
        sales: r.sales,
        gross_sales: r.sales,
        orders: r.orders,
        buyers: r.orders,
        units_sold: r.orders * 3,
        pageviews: r.pageviews,
        visitors: r.visitors,
        cvr: r.cvr
      }))
    };
  }

  // Save imported datasets to localStorage for persistence across browser refreshes
  try {
    const dataToSave = {};
    if (dashboardData.shopee_stats) dataToSave.shopee_stats = dashboardData.shopee_stats;
    if (dashboardData.lazada_stats) dataToSave.lazada_stats = dashboardData.lazada_stats;
    if (dashboardData.tiktok_stats) dataToSave.tiktok_stats = dashboardData.tiktok_stats;
    localStorage.setItem('shopee_dashboard_imported_data', JSON.stringify(dataToSave));
  } catch (e) {
    console.warn('Could not save dataset to localStorage:', e);
  }

  // Automatically switch platform view to the newly imported platform
  currentPlatform = platform;
  const platformSelect = document.getElementById('platform-select');
  if (platformSelect) platformSelect.value = platform;
  const icon = document.getElementById('platform-icon');
  if (icon) {
    if (platform === 'shopee') { icon.className = 'fa-solid fa-store'; icon.style.color = 'var(--shopee-orange)'; }
    else if (platform === 'lazada') { icon.className = 'fa-solid fa-shopping-bag'; icon.style.color = '#0284C7'; }
    else if (platform === 'tiktok') { icon.className = 'fa-solid fa-music'; icon.style.color = '#FF0050'; }
  }
}

function renderImportTab() {
  const container = document.getElementById('dataset-status-list');
  if (!container || !dashboardData) return;

  const shopeePaid = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];
  const lazadaSummary = dashboardData.lazada_stats ? dashboardData.lazada_stats.summary || {} : {};
  const tiktokSummary = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.summary || {} : {};

  const shopeeSales = shopeePaid.reduce((sum, r) => sum + (r['Sales (PHP)'] || 0), 0);
  const shopeeOrders = shopeePaid.reduce((sum, r) => sum + (r.Orders || 0), 0);

  container.innerHTML = `
    <div class="dataset-status-card">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(238, 77, 45, 0.1); color: var(--shopee-orange); display: flex; align-items: center; justify-content: center; font-size: 16px;">
          <i class="fa-solid fa-store"></i>
        </div>
        <div>
          <strong style="font-size: 14px; color: var(--text-primary);">Shopee Store Analytics</strong>
          <div style="font-size: 12px; color: var(--text-secondary);">${shopeePaid.length} Days Loaded | ₱${Math.round(shopeeSales).toLocaleString()} Sales</div>
        </div>
      </div>
      <span class="badge badge-success"><i class="fa-solid fa-check"></i> ${shopeeOrders} Orders</span>
    </div>

    <div class="dataset-status-card">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(2, 132, 199, 0.1); color: #0284C7; display: flex; align-items: center; justify-content: center; font-size: 16px;">
          <i class="fa-solid fa-shopping-bag"></i>
        </div>
        <div>
          <strong style="font-size: 14px; color: var(--text-primary);">Lazada Business Advisor</strong>
          <div style="font-size: 12px; color: var(--text-secondary);">${(dashboardData.lazada_stats?.daily || []).length} Days Loaded | ₱${Math.round(lazadaSummary.revenue || 0).toLocaleString()} Sales</div>
        </div>
      </div>
      <span class="badge badge-info"><i class="fa-solid fa-check"></i> ${lazadaSummary.orders || 0} Orders</span>
    </div>

    <div class="dataset-status-card">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255, 0, 80, 0.1); color: #FF0050; display: flex; align-items: center; justify-content: center; font-size: 16px;">
          <i class="fa-solid fa-music"></i>
        </div>
        <div>
          <strong style="font-size: 14px; color: var(--text-primary);">TikTok Shop Analytics</strong>
          <div style="font-size: 12px; color: var(--text-secondary);">${(dashboardData.tiktok_stats?.daily || []).length} Days Loaded | ₱${Math.round(tiktokSummary.revenue || 0).toLocaleString()} Sales</div>
        </div>
      </div>
      <span class="badge badge-purple"><i class="fa-solid fa-check"></i> ${tiktokSummary.orders || 0} Orders</span>
    </div>
  `;
}

function setupTemplateDownloads() {
  const btnSh = document.getElementById('dl-shopee-template');
  const btnLaz = document.getElementById('dl-lazada-template');
  const btnTik = document.getElementById('dl-tiktok-template');

  if (btnSh) {
    btnSh.addEventListener('click', () => {
      const csv = "Date,Sales (PHP),Orders,Visitors,Order Conversion Rate\n01/09/2026,2500.00,8,120,6.67%\n02/09/2026,3100.50,10,145,6.90%\n";
      downloadFile(csv, "shopee_sales_sample_template.csv", "text/csv");
    });
  }

  if (btnLaz) {
    btnLaz.addEventListener('click', () => {
      const csv = "Date,Gross Revenue,Orders,Visitors,Pageviews\n01/09/2026,1800.00,5,30,120\n02/09/2026,2200.00,7,45,180\n";
      downloadFile(csv, "lazada_sales_sample_template.csv", "text/csv");
    });
  }

  if (btnTik) {
    btnTik.addEventListener('click', () => {
      const csv = "Date,GMV,Orders,Customers,Product Views\n01/09/2026,1090.14,4,4,368\n02/09/2026,693.49,3,3,244\n";
      downloadFile(csv, "tiktok_sales_sample_template.csv", "text/csv");
    });
  }
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ==========================================
// MY INCOME MODULE LOGIC
// ==========================================

let currentIncomeData = null;
let currentIncomePlatform = 'lazada';

async function loadIncomeData() {
  try {
    const month = getCurrentMonthFilter();
    const res = await fetch(`/api/income/?platform=${currentIncomePlatform}&month=${month}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    currentIncomeData = data;
    renderIncomeModule(data);
  } catch (e) {
    console.error('Error loading income data:', e);
  }
}

function renderIncomeModule(data) {
  if (!data) return;
  const summary = data.summary || {};
  
  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    const sign = num < 0 ? '-' : '';
    return `${sign}₱${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const netEl = document.getElementById('income-kpi-net');
  if (netEl) netEl.textContent = formatCurrency(summary.net_income);

  const grossEl = document.getElementById('income-kpi-gross');
  if (grossEl) grossEl.textContent = formatCurrency(summary.gross_sales);

  const ordersCountEl = document.getElementById('income-kpi-orders-count');
  if (ordersCountEl) ordersCountEl.textContent = `${summary.total_orders || 0} Orders`;

  const feesEl = document.getElementById('income-kpi-fees');
  if (feesEl) feesEl.textContent = formatCurrency(summary.platform_fees);

  const feePctEl = document.getElementById('income-kpi-fee-pct');
  if (feePctEl) {
    const pct = summary.gross_sales > 0 ? (Math.abs(summary.platform_fees) / summary.gross_sales * 100).toFixed(2) : 0;
    feePctEl.textContent = `${pct}% of Gross`;
  }

  const refundsEl = document.getElementById('income-kpi-refunds');
  if (refundsEl) refundsEl.textContent = formatCurrency(summary.refunds_deductions);

  const paidEl = document.getElementById('income-kpi-paid');
  if (paidEl) paidEl.textContent = `${formatCurrency(summary.paid_amount)} Paid`;

  const unpaidEl = document.getElementById('income-kpi-unpaid');
  if (unpaidEl) unpaidEl.textContent = `${formatCurrency(summary.unpaid_amount)} Pending`;

  const rowsBadge = document.getElementById('income-total-rows-badge');
  if (rowsBadge) rowsBadge.textContent = `${summary.total_transactions || 0} Transactions Parsed`;

  const activeFileEl = document.getElementById('income-active-filename');
  if (activeFileEl) {
    let filename = currentIncomePlatform === 'tiktok' ? 'income_tiktok_sept.xlsx' : (currentIncomePlatform === 'lazada' ? 'income_lazada_sept.xlsx' : 'Income Statement');
    if (data.transactions && data.transactions.length > 0 && data.transactions[0].source_file) {
      filename = data.transactions[0].source_file;
    }
    activeFileEl.textContent = filename;
  }

  renderIncomeTrendChart(data.daily_trends || []);
  renderIncomeFeeChart(data.fee_breakdown || []);
  renderIncomeFeeTable(data.fee_breakdown || [], summary.gross_sales || 1);
  renderIncomeStatementsTable(data.statements || []);
  renderIncomeTransactionsTable(data.transactions || []);
}

function renderIncomeTrendChart(dailyTrends) {
  destroyChart('incomeTrend');
  const ctx = document.getElementById('incomeTrendChart');
  if (!ctx) return;

  const labels = dailyTrends.map(d => d.date);
  const grossData = dailyTrends.map(d => d.gross_sales);
  const netData = dailyTrends.map(d => d.net_income);
  const feesData = dailyTrends.map(d => Math.abs(d.fees));

  charts['incomeTrend'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Gross Sales (₱)',
          data: grossData,
          backgroundColor: 'rgba(2, 132, 199, 0.75)',
          borderColor: '#0284c7',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Net Payout Income (₱)',
          data: netData,
          type: 'line',
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#10B981',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Lazada Fees (₱)',
          data: feesData,
          backgroundColor: 'rgba(234, 88, 12, 0.65)',
          borderColor: '#EA580C',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return `${ctx.dataset.label}: ₱${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(val) { return '₱' + val.toLocaleString(); }
          }
        }
      }
    }
  });
}

function renderIncomeFeeChart(feeBreakdown) {
  destroyChart('incomeFee');
  const ctx = document.getElementById('incomeFeeChart');
  if (!ctx) return;

  const expenseFees = feeBreakdown.filter(f => f.amount < 0 || !['item price credit', 'sales'].some(k => (f.fee_name || '').toLowerCase().includes(k)));
  const topFees = expenseFees.slice(0, 7);
  
  const labels = topFees.map(f => f.fee_name);
  const dataVals = topFees.map(f => Math.abs(f.amount));

  const palette = ['#0284c7', '#EA580C', '#8B5CF6', '#EF4444', '#F59E0B', '#10B981', '#64748B'];

  charts['incomeFee'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataVals,
        backgroundColor: palette,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const val = ctx.raw;
              return `${ctx.label}: ₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

function renderIncomeFeeTable(feeBreakdown, grossSales) {
  const tbody = document.getElementById('income-fee-breakdown-tbody');
  const countBadge = document.getElementById('income-fee-types-count');
  if (countBadge) countBadge.textContent = `${feeBreakdown.length} Fee Categories`;
  if (!tbody) return;

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    const sign = num < 0 ? '-' : '';
    return `${sign}₱${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  tbody.innerHTML = feeBreakdown.map(f => {
    const isCredit = f.amount > 0;
    const badgeStyle = isCredit 
      ? 'background: #ECFDF5; color: #047857; font-weight: 700;' 
      : 'background: #FFF7ED; color: #C2410C; font-weight: 700;';
    const classification = isCredit ? 'Sales Credit Revenue' : 'Platform Fee / Deduction';
    const amtColor = isCredit ? '#059669' : '#DC2626';

    return `
      <tr>
        <td style="font-weight: 600; color: var(--text-primary);">
          <i class="${isCredit ? 'fa-solid fa-arrow-down-left' : 'fa-solid fa-arrow-up-right'}" style="color: ${amtColor}; margin-right: 6px;"></i>
          ${f.fee_name}
        </td>
        <td><span class="badge" style="${badgeStyle}">${classification}</span></td>
        <td>${f.count} items</td>
        <td style="font-weight: 700; color: ${amtColor};">${formatCurrency(f.amount)}</td>
        <td style="font-weight: 600;">${f.pct_of_gross}%</td>
      </tr>
    `;
  }).join('');
}

function renderIncomeStatementsTable(statements) {
  const tbody = document.getElementById('income-statements-tbody');
  if (!tbody) return;

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    const sign = num < 0 ? '-' : '';
    return `${sign}₱${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  tbody.innerHTML = statements.map(s => {
    const isPaid = (s.paid_status || '').toLowerCase() === 'paid';
    const badgeClass = isPaid ? 'badge-success' : 'badge-warning';
    const badgeText = isPaid ? 'PAID SETTLEMENT' : 'PENDING PAYS';

    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-primary);"><i class="fa-regular fa-calendar-check" style="color: #0284c7; margin-right: 6px;"></i> ${s.statement}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td style="font-weight: 600;">${s.order_count} orders</td>
        <td>${s.transaction_count} items</td>
        <td style="font-weight: 600; color: #0284c7;">${formatCurrency(s.gross_sales)}</td>
        <td style="color: #EA580C;">${formatCurrency(s.fees)}</td>
        <td style="font-weight: 800; color: #059669; font-size: 14px;">${formatCurrency(s.net_payout)}</td>
      </tr>
    `;
  }).join('');
}

function renderIncomeTransactionsTable(transactions) {
  const tbody = document.getElementById('income-tx-tbody');
  if (!tbody) return;

  const searchInput = document.getElementById('income-tx-search');
  const typeFilter = document.getElementById('income-tx-filter-type');

  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const typeVal = typeFilter ? typeFilter.value : 'all';

  const filtered = transactions.filter(t => {
    if (typeVal !== 'all' && !(t.transaction_type || '').toLowerCase().includes(typeVal.toLowerCase())) {
      return false;
    }
    if (query) {
      const matchOrd = (t.order_no || '').toLowerCase().includes(query);
      const matchSku = (t.seller_sku || '').toLowerCase().includes(query);
      const matchFee = (t.fee_name || '').toLowerCase().includes(query);
      const matchType = (t.transaction_type || '').toLowerCase().includes(query);
      if (!matchOrd && !matchSku && !matchFee && !matchType) return false;
    }
    return true;
  });

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    const sign = num < 0 ? '-' : '';
    return `${sign}₱${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  tbody.innerHTML = filtered.slice(0, 150).map(t => {
    const isPos = t.amount > 0;
    const amtColor = isPos ? '#059669' : '#DC2626';

    return `
      <tr>
        <td style="font-size: 11px; color: var(--text-muted);">${t.date}</td>
        <td style="font-weight: 600; font-family: monospace; font-size: 12px; color: var(--text-primary);">${t.order_no}</td>
        <td style="font-size: 11px; color: var(--text-secondary);">${t.seller_sku}</td>
        <td style="font-weight: 600; font-size: 12px;">${t.fee_name || t.transaction_type}</td>
        <td style="font-weight: 700; color: ${amtColor};">${formatCurrency(t.amount)}</td>
        <td><span class="badge ${t.paid_status.toLowerCase() === 'paid' ? 'badge-success' : 'badge-warning'}" style="font-size: 10px;">${t.paid_status}</span></td>
      </tr>
    `;
  }).join('');
}

function initIncomeModule() {
  const btns = document.querySelectorAll('.income-platform-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'rgba(255,255,255,0.8)';
        b.style.color = 'var(--text-secondary)';
        b.style.boxShadow = 'none';
      });
      btn.classList.add('active');
      const p = btn.getAttribute('data-income-platform');
      currentIncomePlatform = p;

      let activeBg = '#0284c7';
      if (p === 'tiktok') activeBg = '#111827';
      else if (p === 'shopee') activeBg = '#EE4D2D';

      btn.style.background = activeBg;
      btn.style.color = '#fff';
      btn.style.boxShadow = `0 2px 8px ${activeBg}4d`;

      loadIncomeData();
    });
  });

  const refreshBtn = document.getElementById('reimport-income-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadIncomeData());
  }

  const searchInput = document.getElementById('income-tx-search');
  const typeFilter = document.getElementById('income-tx-filter-type');
  if (searchInput) searchInput.addEventListener('input', () => {
    if (currentIncomeData) renderIncomeTransactionsTable(currentIncomeData.transactions || []);
  });
  if (typeFilter) typeFilter.addEventListener('change', () => {
    if (currentIncomeData) renderIncomeTransactionsTable(currentIncomeData.transactions || []);
  });

  const fileInput = document.getElementById('income-file-input');
  const dropzone = document.getElementById('income-dropzone');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        uploadIncomeFile(e.target.files[0]);
      }
    });
  }

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.background = 'rgba(2, 132, 199, 0.1)';
      dropzone.style.borderColor = '#2563eb';
    });

    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.style.background = 'rgba(2, 132, 199, 0.03)';
      dropzone.style.borderColor = '#0284c7';
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.background = 'rgba(2, 132, 199, 0.03)';
      dropzone.style.borderColor = '#0284c7';
      if (e.dataTransfer.files.length > 0) {
        uploadIncomeFile(e.dataTransfer.files[0]);
      }
    });
  }
}

async function uploadIncomeFile(file) {
  const statusDiv = document.getElementById('income-upload-status');
  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.className = 'status-msg loading';
    statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing and parsing <strong>${file.name}</strong>...`;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('platform', currentIncomePlatform);

  try {
    const res = await fetch('/api/import-income/', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();
    if (result.success) {
      if (statusDiv) {
        statusDiv.className = 'status-msg success';
        statusDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${result.message}`;
      }
      const activeFileEl = document.getElementById('income-active-filename');
      if (activeFileEl) activeFileEl.textContent = file.name;
      await loadIncomeData();
    } else {
      if (statusDiv) {
        statusDiv.className = 'status-msg error';
        statusDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${result.error || 'Upload failed'}`;
      }
    }
  } catch (e) {
    if (statusDiv) {
      statusDiv.className = 'status-msg error';
      statusDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Error uploading file: ${e.message}`;
    }
  }
}


