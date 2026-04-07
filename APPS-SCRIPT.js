// ══════════════════════════════════════════════════════════════
// Raga Rush — Google Apps Script Handler (v2 — analytics)
// ══════════════════════════════════════════════════════════════
//
// SETUP:
// 1. Open your Google Sheet → Extensions → Apps Script
// 2. Replace the entire Code.gs contents with this file
// 3. Click Deploy → New deployment → Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 4. Copy the URL → paste into SHEETS_ENDPOINT in index.html
// 5. Set up daily summary trigger:
//    - In Apps Script editor → Triggers (clock icon, left sidebar)
//    - + Add Trigger → Function: computeDailySummary
//    - Event source: Time-driven → Day timer → Midnight to 1am
//
// TABS (auto-created on first event of each type):
//   visits, funnel, sessions, feedback, invites, errors, daily_summary
// ══════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Handle batched events
    if (data.type === 'batch' && Array.isArray(data.events)) {
      data.events.forEach(evt => routeEvent(evt));
      return ContentService.createTextOutput('ok');
    }

    routeEvent(data);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err.message);
  }
}

function routeEvent(data) {
  const type = data.type;
  const TAB_CONFIG = {
    'visit': {
      tab: 'visits',
      cols: ['timestamp','visitor_id','session_id','device','browser','os','screen_size','language','timezone','connection','build','entry_url','referrer','is_returning','play_count']
    },
    'funnel': {
      tab: 'funnel',
      cols: ['timestamp','visitor_id','session_id','stage','from_stage','stage_time_ms','config_mode','config_time','config_count','device','browser','os','build']
    },
    'session': {
      tab: 'sessions',
      cols: ['timestamp','visitor_id','session_id','mode','ragas_completed','ragas_possible','ragas_list','seconds_per_raga','time_spent_s','theme','play_count','completed','end_reason','referrer','device','browser','os','language','screen_size','timezone','connection','build','pipeline','video_size_kb','processing_time_ms']
    },
    'feedback': {
      tab: 'feedback',
      cols: ['timestamp','visitor_id','session_id','reaction','features','comment','app_interest','mode','ragas_completed','ragas_possible','ragas_list','seconds_per_raga','time_spent_s','theme','play_count','device','browser','os','language','screen_size','timezone','connection','build']
    },
    'invite': {
      tab: 'invites',
      cols: ['timestamp','visitor_id','session_id','method','device','browser','os','build']
    },
    'error': {
      tab: 'errors',
      cols: ['timestamp','visitor_id','session_id','error_code','error_message','stage','device','browser','os','build']
    }
  };

  const config = TAB_CONFIG[type];
  if (!config) return;

  const sheet = getOrCreateTab(config.tab, config.cols);
  const row = config.cols.map(col => {
    const val = data[col];
    if (val === undefined || val === null) return '';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    return val;
  });
  sheet.appendRow(row);
}

function getOrCreateTab(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    // Auto-extend headers when new columns are added to TAB_CONFIG
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (existingHeaders.length < headers.length) {
      const newCols = headers.slice(existingHeaders.length);
      const startCol = existingHeaders.length + 1;
      sheet.getRange(1, startCol, 1, newCols.length).setValues([newCols]).setFontWeight('bold');
    }
  }
  return sheet;
}

// ══════════════════════════════════════════════════════════════
// Daily Summary — runs via time-driven trigger (midnight)
// ══════════════════════════════════════════════════════════════

function computeDailySummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = Utilities.formatDate(yesterday, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');

  // Helper: get all rows from a tab for a given date
  function getRowsForDate(tabName) {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet || sheet.getLastRow() < 2) return [];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const tsIdx = headers.indexOf('timestamp');
    if (tsIdx === -1) return [];
    return data.slice(1).filter(row => {
      const ts = String(row[tsIdx]);
      return ts.startsWith(dateStr);
    }).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
  }

  const visits = getRowsForDate('visits');
  const funnel = getRowsForDate('funnel');
  const sessions = getRowsForDate('sessions');
  const feedback = getRowsForDate('feedback');
  const invites = getRowsForDate('invites');
  const errors = getRowsForDate('errors');

  // Unique visitors
  const uniqueVisitors = new Set(visits.map(r => r.visitor_id)).size;
  const returningVisitors = visits.filter(r => String(r.is_returning) === 'TRUE').length;

  // Funnel counts
  const funnelStages = {};
  funnel.forEach(r => {
    funnelStages[r.stage] = (funnelStages[r.stage] || 0) + 1;
  });

  // Session stats
  const totalRagasSung = sessions.reduce((sum, r) => sum + (Number(r.ragas_completed) || 0), 0);
  const completedSessions = sessions.filter(r => String(r.completed) === 'TRUE').length;

  // Most popular raga
  const ragaCounts = {};
  sessions.forEach(r => {
    const list = String(r.ragas_list || '');
    if (!list) return;
    list.split(', ').forEach(raga => {
      const name = raga.trim();
      if (name) ragaCounts[name] = (ragaCounts[name] || 0) + 1;
    });
  });
  let topRaga = '';
  let topRagaCount = 0;
  Object.entries(ragaCounts).forEach(([name, count]) => {
    if (count > topRagaCount) { topRaga = name; topRagaCount = count; }
  });

  // Most popular mode
  const modeCounts = {};
  sessions.forEach(r => {
    const m = r.mode || '';
    if (m) modeCounts[m] = (modeCounts[m] || 0) + 1;
  });
  let topMode = '';
  let topModeCount = 0;
  Object.entries(modeCounts).forEach(([m, c]) => {
    if (c > topModeCount) { topMode = m; topModeCount = c; }
  });

  // Avg setup time
  const setupTimes = funnel.filter(r => r.from_stage === 'setup').map(r => Number(r.stage_time_ms) || 0);
  const avgSetupTimeMs = setupTimes.length ? Math.round(setupTimes.reduce((a, b) => a + b, 0) / setupTimes.length) : 0;

  // Drop-off counts
  const dropCamera = (funnelStages['camera_denied'] || 0);
  const dropPreview = (funnelStages['preview'] || 0) - (funnelStages['countdown'] || 0);
  const dropRecording = (funnelStages['early_end'] || 0);

  // Timezones
  const timezones = new Set(visits.map(r => r.timezone).filter(Boolean));

  const summaryRow = [
    dateStr,
    visits.length,
    uniqueVisitors,
    returningVisitors,
    funnelStages['recording'] || 0,
    completedSessions,
    sessions.length > 0 ? Math.round(completedSessions / sessions.length * 100) + '%' : '0%',
    sessions.length > 0 ? (totalRagasSung / sessions.length).toFixed(1) : '0',
    totalRagasSung,
    topRaga ? topRaga + ' (' + topRagaCount + ')' : '',
    topMode || '',
    funnelStages['shared'] || 0,
    invites.length,
    feedback.length,
    avgSetupTimeMs,
    dropCamera,
    Math.max(0, dropPreview),
    dropRecording,
    errors.length,
    timezones.size
  ];

  const summaryHeaders = [
    'date','visits','unique_visitors','returning_visitors',
    'challenges_started','challenges_completed','completion_rate',
    'avg_ragas_per_session','total_ragas_sung','most_popular_raga',
    'most_popular_mode','shares','invites','feedback_count',
    'avg_setup_time_ms','drop_camera','drop_preview','drop_recording',
    'error_count','timezones'
  ];

  const summarySheet = getOrCreateTab('daily_summary', summaryHeaders);
  summarySheet.appendRow(summaryRow);
}

// ══════════════════════════════════════════════════════════════
// Cumulative stats — used by dashboard to fetch aggregate data
// Call via GET: ?action=stats
// ══════════════════════════════════════════════════════════════

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'stats') {
    return getCumulativeStats();
  }
  return ContentService.createTextOutput('Raga Rush Analytics v2');
}

function getCumulativeStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Total ragas sung
  const sessionsSheet = ss.getSheetByName('sessions');
  let totalRagas = 0, totalSessions = 0, ragaCounts = {}, modeCounts = {}, timezoneCounts = {};
  if (sessionsSheet && sessionsSheet.getLastRow() >= 2) {
    const data = sessionsSheet.getDataRange().getValues();
    const headers = data[0];
    const ragasIdx = headers.indexOf('ragas_completed');
    const listIdx = headers.indexOf('ragas_list');
    const modeIdx = headers.indexOf('mode');
    const tzIdx = headers.indexOf('timezone');
    totalSessions = data.length - 1;
    data.slice(1).forEach(row => {
      totalRagas += (Number(row[ragasIdx]) || 0);
      String(row[listIdx] || '').split(', ').forEach(r => {
        const name = r.trim();
        if (name) ragaCounts[name] = (ragaCounts[name] || 0) + 1;
      });
      const mode = row[modeIdx];
      if (mode) modeCounts[mode] = (modeCounts[mode] || 0) + 1;
      const tz = row[tzIdx];
      if (tz) timezoneCounts[tz] = (timezoneCounts[tz] || 0) + 1;
    });
  }

  // Top raga
  let topRaga = '', topRagaCount = 0;
  Object.entries(ragaCounts).forEach(([name, count]) => {
    if (count > topRagaCount) { topRaga = name; topRagaCount = count; }
  });

  // Visits
  const visitsSheet = ss.getSheetByName('visits');
  const totalVisits = visitsSheet && visitsSheet.getLastRow() >= 2 ? visitsSheet.getLastRow() - 1 : 0;

  const stats = {
    total_ragas: totalRagas,
    total_sessions: totalSessions,
    total_visits: totalVisits,
    top_raga: topRaga,
    top_raga_count: topRagaCount,
    timezones: Object.keys(timezoneCounts).length,
    modes: modeCounts,
    top_ragas: Object.entries(ragaCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
  };

  return ContentService
    .createTextOutput(JSON.stringify(stats))
    .setMimeType(ContentService.MimeType.JSON);
}
