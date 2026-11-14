/* Shared helpers for the internal project ledger (status.html). */
(function () {
  var PL = window.PL = {};
  PL.STAGES = ['Scoping', 'Data collection', 'Modeling', 'Draft report', 'Final delivered'];

  PL.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  PL.money = function (n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); };
  PL.short = function (n) { n = Number(n || 0); return n >= 1000 ? '$' + (n / 1000).toFixed(n % 1000 ? 1 : 0).replace(/\.0$/, '') + 'k' : '$' + n; };
  PL.iso = function (d) { var m = d.getMonth() + 1, x = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (x < 10 ? '0' : '') + x; };
  PL.today = function () { return PL.iso(new Date()); };
  PL.addDays = function (s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return PL.iso(d); };
  PL.diffDays = function (a, b) { return Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 86400000); };
  PL.fdate = function (s) { if (!s) return '—'; var d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  PL.status = function (inv) { if (inv.paid_on) return 'paid'; return inv.due < PL.today() ? 'overdue' : 'open'; };
  PL.pill = function (st) { var m = { paid: ['ok', 'Paid'], open: ['warn', 'Open'], overdue: ['bad', 'Overdue'] }[st]; return '<span class="pill ' + m[0] + '">' + m[1] + '</span>'; };
  PL.safeName = function (n) { return String(n).replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_').slice(0, 120) || 'file'; };
  PL.fmtSize = function (n) { n = Number(n || 0); if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(0) + ' KB'; if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB'; return (n / 1073741824).toFixed(2) + ' GB'; };

  PL.toast = function (t) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = t; el.hidden = false;
    clearTimeout(PL._tt);
    PL._tt = setTimeout(function () { el.hidden = true; }, 4500);
  };

  /* ---------- API access ---------- */
    PL.layer = function () { return document.getElementById('layer'); };
  PL.drawer = function (html) {
    PL._last = document.activeElement;
    PL.layer().innerHTML = '<div class="scrim" id="scrim"><div class="drawer" role="dialog" aria-modal="true">' + html + '</div></div>';
    document.getElementById('scrim').addEventListener('mousedown', function (e) { if (e.target.id === 'scrim') PL.closeDrawer(); });
    var first = PL.layer().querySelector('input,select,textarea'); if (first) first.focus();
  };
  PL.closeDrawer = function () { PL.layer().innerHTML = ''; if (PL._last && PL._last.focus) try { PL._last.focus(); } catch (e) { } };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && PL.layer() && PL.layer().innerHTML) PL.closeDrawer(); });
  PL.armDelete = function (btn, fn, msg) {
    var armed = false;
    btn.onclick = function () {
      if (!armed) { armed = true; btn.textContent = 'Confirm: ' + msg; clearTimeout(PL._arm); PL._arm = setTimeout(function () { armed = false; btn.textContent = 'Delete'; }, 6000); }
      else fn();
    };
  };
})();
