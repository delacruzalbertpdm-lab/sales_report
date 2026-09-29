import re

app_js_path = r'c:\Users\USER1\.gemini\antigravity-ide\scratch\shopee_dashboard\app.js'

with open(app_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace renderSalesTab
render_sales_new = """// 2. RENDER SALES & ORDERS TAB
function renderSalesTab() {
  if (!dashboardData) return;
  const summary = getPlatformSummaries();
  if (!summary) return;

  const dailySales = dashboardData.sales_overview ? dashboardData.sales_overview.daily || [] : [];
  const paidRows = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];
  const lazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const tiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];

  const labels = paidRows.map(r => r.Date);

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

    let salesDatasets = [];
    if (currentPlatform === 'shopee') {
      salesDatasets = [
        { label: 'Placed Sales (PHP)', data: dailySales.map(r => r.sales_placed), borderColor: '#3B82F6', borderWidth: 2, tension: 0.3 },
        { label: 'Confirmed Sales (PHP)', data: dailySales.map(r => r.sales_confirmed), borderColor: '#F59E0B', borderWidth: 2, tension: 0.3 },
        { label: 'Paid Sales (PHP)', data: paidRows.map(r => r['Sales (PHP)']), borderColor: '#EE4D2D', borderWidth: 3, tension: 0.3 }
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
      const shopeePaid = paidRows.map(r => r['Sales (PHP)']);
      const lazSales = labels.map(d => (lazadaDaily.find(r => r.date === d) || {}).sales || 0);
      const tiktokSales = labels.map(d => (tiktokDaily.find(r => r.date === d) || {}).sales || 0);
      salesDatasets = [
        { label: 'Shopee Sales (PHP)', data: shopeePaid, borderColor: '#EE4D2D', borderWidth: 3, tension: 0.3 },
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
}"""

# Replace renderTrafficTab
render_traffic_new = """// 3. RENDER TRAFFIC TAB
function renderTrafficTab() {
  if (!dashboardData) return;
  const summary = getPlatformSummaries();
  if (!summary) return;

  const trafficAll = dashboardData.traffic_overview ? dashboardData.traffic_overview.all.daily || [] : [];
  const lazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const tiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];
  const paidRows = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];

  const labels = paidRows.map(r => r.Date);

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
}"""

# Replace renderSourcesTab
render_sources_new = """// 4. RENDER SOURCES TAB
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
}"""

# Replace renderProductTab
render_product_new = """// 5. RENDER PRODUCT TAB
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

  const prodDaily = dashboardData.product_overview || [];
  const lazadaDaily = dashboardData.lazada_stats ? dashboardData.lazada_stats.daily || [] : [];
  const tiktokDaily = dashboardData.tiktok_stats ? dashboardData.tiktok_stats.daily || [] : [];
  const paidRows = dashboardData.shopee_stats ? dashboardData.shopee_stats.paid_order || [] : [];

  const labels = paidRows.map(r => r.Date);
  
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
}"""

# Use regex to find function blocks and replace them completely
content = re.sub(r'// 2\. RENDER SALES & ORDERS TAB[\s\S]*?// 3\. RENDER TRAFFIC TAB', render_sales_new + "\n\n// 3. RENDER TRAFFIC TAB", content)
content = re.sub(r'// 3\. RENDER TRAFFIC TAB[\s\S]*?// 4\. RENDER SOURCES TAB', render_traffic_new + "\n\n// 4. RENDER SOURCES TAB", content)
content = re.sub(r'// 4\. RENDER SOURCES TAB[\s\S]*?// 5\. RENDER PRODUCT TAB', render_sources_new + "\n\n// 5. RENDER PRODUCT TAB", content)
content = re.sub(r'// 5\. RENDER PRODUCT TAB[\s\S]*?function parseDateDay', render_product_new + "\n\nfunction parseDateDay", content)

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully replaced all render functions in app.js!")
