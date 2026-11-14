/* Internal project ledger: overview, projects, invoices, clients, backup. */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var app = $('#app'), esc = PL.esc;
  var S = { clients: [], projects: [], invoices: [], documents: [], uploads: [], tab: 'overview', pf: 'active', inf: 'all' };

  load();

  function load() {
    app.innerHTML = '<div class="empty"><strong>Loading</strong>Fetching projects and invoices.</div>';
    return PL.api('/admin/data').then(function (r) {
      S.clients = r.clients; S.projects = r.projects; S.invoices = r.invoices; S.documents = r.documents; S.uploads = r.uploads;
      render();
    }).catch(function (e) { app.innerHTML = '<div class="panel empty"><strong>Could not load data</strong>' + esc((e && e.message) || 'Try refreshing the page.') + '</div>'; });
  }
  function reload() { return load(); }
  function post(path, body) { return PL.api(path, { method: 'POST', body: body }); }
  function del(path) { return PL.api(path, { method: 'DELETE' }); }

  function byId(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function clientOf(p) { return p ? byId(S.clients, p.client_id) : null; }
  function projOf(inv) { return byId(S.projects, inv.project_id); }
  function fail(e) { PL.toast('Could not save: ' + ((e && e.message) || 'error')); }

  /* ---------- shell ---------- */
  var TABS = [['overview', 'Overview'], ['projects', 'Projects'], ['invoices', 'Invoices'], ['clients', 'Clients'], ['backup', 'Backup']];
  function render() {
    var t = $('#tabs'); t.hidden = false;
    t.innerHTML = TABS.map(function (x) { return '<button class="tab" data-tab="' + x[0] + '"' + (S.tab === x[0] ? ' aria-current="page"' : '') + '>' + x[1] + '</button>'; }).join('');
    ({ overview: vOverview, projects: vProjects, invoices: vInvoices, clients: vClients, backup: vBackup })[S.tab]();
  }
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]'); if (b) { S.tab = b.dataset.tab; render(); }
  });

  /* ---------- overview ---------- */
  function totals() {
    var y = String(new Date().getFullYear()), open = 0, over = 0, overN = 0, coll = 0, billed = 0;
    S.invoices.forEach(function (i) {
      var st = PL.status(i), a = +i.amount || 0;
      if (st === 'paid') { if ((i.paid_on || '').slice(0, 4) === y) coll += a; }
      else { open += a; if (st === 'overdue') { over += a; overN++; } }
      if ((i.issued || '').slice(0, 4) === y) billed += a;
    });
    return { open: open, over: over, overN: overN, coll: coll, billed: billed, y: y, active: S.projects.filter(function (p) { return (p.stage || 0) < 4; }).length };
  }
  function monthsBack(n) { var out = [], d = new Date(); for (var k = n - 1; k >= 0; k--) { var m = new Date(d.getFullYear(), d.getMonth() - k, 1); out.push({ key: m.getFullYear() + '-' + ('0' + (m.getMonth() + 1)).slice(-2), label: m.toLocaleDateString('en-US', { month: 'short' }), b: 0, c: 0 }); } return out; }
  function chart() {
    var ms = monthsBack(12), max = 0;
    S.invoices.forEach(function (i) { ms.forEach(function (m) { if ((i.issued || '').slice(0, 7) === m.key) m.b += +i.amount || 0; if (i.paid_on && i.paid_on.slice(0, 7) === m.key) m.c += +i.amount || 0; }); });
    ms.forEach(function (m) { max = Math.max(max, m.b, m.c); });
    var step = Math.pow(10, Math.floor(Math.log10(Math.max(max, 1)))), nice = [1, 2, 2.5, 5, 10].map(function (f) { return f * step; }).filter(function (v) { return v * 4 >= max; })[0] || step * 10;
    var W = 720, H = 250, L = 44, R = 8, T = 10, B = 26, pw = W - L - R, ph = H - T - B, g = pw / ms.length, bw = Math.min(14, g / 2 - 3), s = '';
    for (var k = 0; k <= 4; k++) { var v = nice / 4 * k, y = T + ph - ph * (v / nice); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="rgba(27,42,74,.15)"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + PL.short(v) + '</text>'; }
    ms.forEach(function (m, i) {
      var cx = L + g * i + g / 2, hb = ph * m.b / nice, hc = ph * m.c / nice;
      s += '<rect x="' + (cx - bw - 1) + '" y="' + (T + ph - hb) + '" width="' + bw + '" height="' + hb + '" fill="#B9C2D3"><title>' + m.label + ' billed ' + PL.money(m.b) + '</title></rect>';
      s += '<rect x="' + (cx + 1) + '" y="' + (T + ph - hc) + '" width="' + bw + '" height="' + hc + '" fill="#152544"><title>' + m.label + ' collected ' + PL.money(m.c) + '</title></rect>';
      s += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + m.label + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Billed and collected revenue by month, last 12 months">' + s + '</svg>';
  }
  function vOverview() {
    var t = totals(), h = '<div class="head"><div><h2>Overview</h2><p>Billing and collections as of ' + PL.fdate(PL.today()) + '.</p></div></div>';
    h += '<div class="kpis"><div class="kpi"><small>Outstanding</small><strong>' + PL.money(t.open) + '</strong><span>Open and overdue invoices</span></div>' +
      '<div class="kpi' + (t.over ? ' bad' : '') + '"><small>Overdue</small><strong>' + PL.money(t.over) + '</strong><span>' + t.overN + ' invoice' + (t.overN === 1 ? '' : 's') + ' past due</span></div>' +
      '<div class="kpi"><small>Collected ' + t.y + '</small><strong>' + PL.money(t.coll) + '</strong><span>Billed ' + PL.money(t.billed) + ' this year</span></div>' +
      '<div class="kpi"><small>Active projects</small><strong>' + t.active + '</strong><span>Not yet delivered</span></div></div>';
    h += '<div class="cols"><section class="panel"><h3>Billed and collected</h3><div class="legend"><span><i style="background:#B9C2D3"></i>Billed (by issue date)</span><span><i style="background:#152544"></i>Collected (by payment date)</span></div>' + chart() + '</section>';
    var items = [];
    S.invoices.forEach(function (i) {
      if (i.paid_on) return; var d = PL.diffDays(i.due, PL.today()), c = clientOf(projOf(i)), who = esc((c && c.name) || '');
      if (d < 0) items.push({ k: d, t: 'Invoice ' + esc(i.number) + ' overdue', s: who + ' · ' + PL.money(i.amount) + ' · ' + (-d) + ' day' + (d === -1 ? '' : 's') + ' late', bad: 1 });
      else if (d <= 7) items.push({ k: d, t: 'Invoice ' + esc(i.number) + ' due ' + (d === 0 ? 'today' : 'in ' + d + ' day' + (d === 1 ? '' : 's')), s: who + ' · ' + PL.money(i.amount) });
    });
    S.projects.forEach(function (p) { if ((p.stage || 0) >= 4 || !p.due) return; var d = PL.diffDays(p.due, PL.today()); if (d <= 14) items.push({ k: d, t: esc(p.name) + (d < 0 ? ' past delivery date' : ' due ' + (d === 0 ? 'today' : 'in ' + d + ' days')), s: esc(PL.STAGES[p.stage || 0]), bad: d < 0 }); });
    items.sort(function (a, b) { return a.k - b.k; });
    h += '<section class="panel"><h3>Needs attention</h3>' + (items.length ? '<div class="list" style="margin-top:8px">' + items.slice(0, 8).map(function (i) { return '<div class="item"><div>' + i.t + '<small>' + i.s + '</small></div>' + (i.bad ? '<span class="pill bad">Late</span>' : '') + '</div>'; }).join('') + '</div>' : '<div class="empty"><strong>Nothing urgent</strong>No overdue invoices or near-term deadlines.</div>') + '</section></div>';
    var rows = S.clients.map(function (c) {
      var b = 0, p = 0, o = 0; S.invoices.forEach(function (i) { var pr = projOf(i); if (!pr || pr.client_id !== c.id) return; var a = +i.amount || 0; b += a; if (i.paid_on) p += a; else o += a; });
      return { c: c, b: b, p: p, o: o, n: S.projects.filter(function (x) { return x.client_id === c.id; }).length };
    }).sort(function (a, b) { return b.b - a.b; });
    h += '<section class="panel"><h3>Revenue by client</h3>' + (rows.length ? '<div class="tablewrap"><table><thead><tr><th>Client</th><th class="num">Projects</th><th class="num">Billed</th><th class="num">Collected</th><th class="num">Outstanding</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td>' + esc(r.c.name) + '</td><td class="num">' + r.n + '</td><td class="num">' + PL.money(r.b) + '</td><td class="num">' + PL.money(r.p) + '</td><td class="num">' + PL.money(r.o) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty"><strong>No clients yet</strong>Add your first client on the Clients tab.</div>') + '</section>';
    app.innerHTML = h;
  }

  /* ---------- projects ---------- */
  function vProjects() {
    var list = S.projects.filter(function (p) { return S.pf === 'all' || (S.pf === 'active' ? (p.stage || 0) < 4 : (p.stage || 0) >= 4); });
    list.sort(function (a, b) { return (a.due || '9999').localeCompare(b.due || '9999'); });
    var h = '<div class="head"><div><h2>Projects</h2><p>Stage, schedule, and billing for each engagement.</p></div><button class="btn" id="newP">New project</button></div>';
    h += '<div class="filters">' + [['active', 'Active'], ['done', 'Delivered'], ['all', 'All']].map(function (f) { return '<button class="chip" data-pf="' + f[0] + '" aria-pressed="' + (S.pf === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div>';
    if (!list.length) h += '<div class="panel empty"><strong>' + (S.projects.length ? 'Nothing in this view' : 'No projects yet') + '</strong>' + (S.projects.length ? 'Try another filter.' : 'Add a client first, then a project to track its stage and invoices.') + '</div>';
    else {
      h += '<div class="panel"><div class="tablewrap"><table><thead><tr><th>Project</th><th>Stage</th><th>Due</th><th class="num">Fee</th><th class="num">Invoiced</th><th class="num">Paid</th></tr></thead><tbody>';
      list.forEach(function (p) {
        var c = clientOf(p), b = 0, pd = 0, st = p.stage || 0, nd = S.documents.filter(function (d) { return d.project_id === p.id; }).length;
        S.invoices.forEach(function (i) { if (i.project_id === p.id) { b += +i.amount || 0; if (i.paid_on) pd += +i.amount || 0; } });
        h += '<tr><td><button class="link" data-editp="' + esc(p.id) + '">' + esc(p.name) + '</button><small style="display:block;color:var(--muted)">' + esc((c && c.name) || 'No client') + '</small></td>' +
          '<td class="stagecell"><div class="steps">' + PL.STAGES.map(function (_, k) { return '<i' + (k <= st ? ' class="on"' : '') + '></i>'; }).join('') + '</div><small>' + esc(PL.STAGES[st]) + '</small></td><td>' + PL.fdate(p.due) + '</td><td class="num">' + PL.money(p.fee) + '</td><td class="num">' + PL.money(b) + '</td><td class="num">' + PL.money(pd) + '</td></tr>';
      });
      h += '</tbody></table></div></div>';
    }
    app.innerHTML = h; $('#newP').onclick = function () { formProject(); };
  }
  function formProject(id) {
    var p = id ? byId(S.projects, id) : { stage: 0 };
    if (!S.clients.length) { PL.toast('Add a client first on the Clients tab.'); return; }
    PL.drawer('<h2>' + (id ? 'Edit project' : 'New project') + '</h2><form id="f" novalidate>' +
      '<div class="field"><label for="f-name">Project name</label><input id="f-name" value="' + esc(p.name) + '" required></div>' +
      '<div class="field"><label for="f-client">Client</label><select id="f-client"><option value="">Select a client</option>' + S.clients.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === p.client_id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="row2"><div class="field"><label for="f-stage">Stage</label><select id="f-stage">' + PL.STAGES.map(function (s, k) { return '<option value="' + k + '"' + (k === (p.stage || 0) ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="f-due">Delivery date</label><input id="f-due" type="date" value="' + esc(p.due) + '"></div></div>' +
      '<div class="field"><label for="f-fee">Fee ($)</label><input id="f-fee" type="number" min="0" step="0.01" value="' + esc(p.fee) + '"></div>' +
      '<div class="field"><label for="f-update">Update shown to the client</label><textarea id="f-update">' + esc(p.client_update) + '</textarea></div>' +
      '<div class="field"><label for="f-note">Internal note (never shown to the client)</label><textarea id="f-note">' + esc(p.internal_note) + '</textarea></div>' +
      '<div class="actions"><button class="btn" type="submit">Save project</button><button class="btn ghost" type="button" id="cancel">Cancel</button>' + (id ? '<button class="btn danger" type="button" id="del">Delete</button>' : '') + '</div></form>');
    $('#f').onsubmit = function (e) {
      e.preventDefault();
      var name = $('#f-name').value.trim(), cid = $('#f-client').value;
      if (!name || !cid) { PL.toast('Enter a project name and choose a client.'); return; }
      var row = { id: id || undefined, name: name, client_id: cid, stage: +$('#f-stage').value, due: $('#f-due').value || null, client_update: $('#f-update').value.trim(), fee: +$('#f-fee').value || 0, internal_note: $('#f-note').value.trim() };
      post('/admin/projects', row)
        .then(function () { PL.closeDrawer(); PL.toast('Project saved.'); return reload(); }).catch(fail);
    };
    $('#cancel').onclick = PL.closeDrawer;
    var delBtn = $('#del');
    if (delBtn) { var n = S.invoices.filter(function (i) { return i.project_id === id; }).length; PL.armDelete(delBtn, function () { del('/admin/projects/' + id).then(function () { PL.closeDrawer(); PL.toast('Project deleted.'); return reload(); }).catch(fail); }, 'also deletes ' + n + ' invoice(s)'); }
  }

  /* ---------- invoices ---------- */
  function nextNumber() { var y = new Date().getFullYear(), mx = 0; S.invoices.forEach(function (i) { var m = /^INV-(\d{4})-(\d+)$/.exec(i.number || ''); if (m && +m[1] === y) mx = Math.max(mx, +m[2]); }); return 'INV-' + y + '-' + ('00' + (mx + 1)).slice(-3); }
  function vInvoices() {
    var list = S.invoices.filter(function (i) { return S.inf === 'all' || PL.status(i) === S.inf; });
    list.sort(function (a, b) { return (b.issued || '').localeCompare(a.issued || ''); });
    var h = '<div class="head"><div><h2>Invoices</h2><p>Terms are Net 15 from the issue date unless you change the due date.</p></div><div class="actions" style="margin:0"><button class="btn ghost" id="exp">Export CSV</button><button class="btn" id="newI">New invoice</button></div></div>';
    h += '<div class="filters">' + [['all', 'All'], ['open', 'Open'], ['overdue', 'Overdue'], ['paid', 'Paid']].map(function (f) { return '<button class="chip" data-inf="' + f[0] + '" aria-pressed="' + (S.inf === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div>';
    if (!list.length) h += '<div class="panel empty"><strong>' + (S.invoices.length ? 'Nothing in this view' : 'No invoices yet') + '</strong>' + (S.invoices.length ? 'Try another filter.' : 'Create an invoice record to track when it is due and paid.') + '</div>';
    else {
      h += '<div class="panel"><div class="tablewrap"><table><thead><tr><th>Invoice</th><th>Client and project</th><th>Issued</th><th>Due</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead><tbody>';
      list.forEach(function (i) {
        var p = projOf(i), c = clientOf(p), st = PL.status(i);
        h += '<tr><td><button class="link" data-editi="' + esc(i.id) + '">' + esc(i.number) + '</button></td><td>' + esc((c && c.name) || '—') + '<small style="display:block;color:var(--muted)">' + esc((p && p.name) || '') + '</small></td><td>' + PL.fdate(i.issued) + '</td><td>' + PL.fdate(i.due) + '</td><td class="num">' + PL.money(i.amount) + '</td><td>' + PL.pill(st) + (st === 'paid' ? '<small style="display:block;color:var(--muted)">' + PL.fdate(i.paid_on) + '</small>' : '') + '</td><td>' + (st !== 'paid' ? '<button class="btn ghost sm" data-paid="' + esc(i.id) + '">Mark paid</button>' : '') + '</td></tr>';
      });
      h += '</tbody></table></div></div>';
    }
    app.innerHTML = h; $('#newI').onclick = function () { formInvoice(); }; $('#exp').onclick = exportCsv;
  }
  function formInvoice(id) {
    var i = id ? byId(S.invoices, id) : { issued: PL.today(), due: PL.addDays(PL.today(), 15), number: nextNumber() };
    if (!S.projects.length) { PL.toast('Add a project first.'); return; }
    PL.drawer('<h2>' + (id ? 'Edit invoice' : 'New invoice') + '</h2><form id="f" novalidate>' +
      '<div class="row2"><div class="field"><label for="f-num">Invoice number</label><input id="f-num" value="' + esc(i.number) + '" required></div><div class="field"><label for="f-amt">Amount ($)</label><input id="f-amt" type="number" min="0" step="0.01" value="' + esc(i.amount) + '" required></div></div>' +
      '<div class="field"><label for="f-proj">Project</label><select id="f-proj"><option value="">Select a project</option>' + S.projects.map(function (p) { var c = clientOf(p); return '<option value="' + esc(p.id) + '"' + (p.id === i.project_id ? ' selected' : '') + '>' + esc((c ? c.name + ' · ' : '') + p.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="row2"><div class="field"><label for="f-iss">Issued</label><input id="f-iss" type="date" value="' + esc(i.issued) + '"></div><div class="field"><label for="f-due">Due</label><input id="f-due" type="date" value="' + esc(i.due) + '"></div></div>' +
      '<p class="hint">Changing the issue date resets the due date to Net 15.</p>' +
      '<div class="field"><label for="f-paid">Date paid (leave empty if unpaid)</label><input id="f-paid" type="date" value="' + esc(i.paid_on) + '"></div>' +
      '<div class="actions"><button class="btn" type="submit">Save invoice</button><button class="btn ghost" type="button" id="cancel">Cancel</button>' + (id ? '<button class="btn danger" type="button" id="del">Delete</button>' : '') + '</div></form>');
    $('#f-iss').onchange = function () { if (this.value) $('#f-due').value = PL.addDays(this.value, 15); };
    $('#f').onsubmit = function (e) {
      e.preventDefault();
      var num = $('#f-num').value.trim(), pid = $('#f-proj').value, amt = +$('#f-amt').value;
      if (!num || !pid || !(amt > 0)) { PL.toast('Enter an invoice number, an amount above zero, and a project.'); return; }
      var row = { number: num, project_id: pid, amount: amt, issued: $('#f-iss').value || PL.today(), due: $('#f-due').value || PL.addDays(PL.today(), 15), paid_on: $('#f-paid').value || null };
      post('/admin/invoices', Object.assign({ id: id || undefined }, row)).then(function () { PL.closeDrawer(); PL.toast('Invoice saved.'); return reload(); }).catch(function (err) { PL.toast(/duplicate|unique/i.test((err && err.message) || '') ? 'That invoice number is already used.' : 'Could not save: ' + ((err && err.message) || 'error')); });
    };
    $('#cancel').onclick = PL.closeDrawer;
    var delB = $('#del'); if (delB) PL.armDelete(delB, function () { del('/admin/invoices/' + id).then(function () { PL.closeDrawer(); PL.toast('Invoice deleted.'); return reload(); }).catch(fail); }, 'delete this invoice?');
  }
  function exportCsv() {
    var rows = [['Invoice', 'Client', 'Project', 'Issued', 'Due', 'Amount', 'Status', 'Paid on']];
    S.invoices.forEach(function (i) { var p = projOf(i), c = clientOf(p); rows.push([i.number, (c && c.name) || '', (p && p.name) || '', i.issued, i.due, i.amount, PL.status(i), i.paid_on || '']); });
    var csv = rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'central-analytics-invoices-' + PL.today() + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- clients ---------- */
  function vClients() {
    var h = '<div class="head"><div><h2>Clients</h2><p>Companies you bill. Each project and invoice belongs to one client.</p></div><button class="btn" id="newC">New client</button></div>';
    if (!S.clients.length) h += '<div class="panel empty"><strong>No clients yet</strong>Add a client, then create projects and invoices under it.</div>';
    else {
      h += '<div class="panel"><div class="tablewrap"><table><thead><tr><th>Client</th><th>Contact email</th><th class="num">Projects</th></tr></thead><tbody>' + S.clients.map(function (c) { return '<tr><td><button class="link" data-editc="' + esc(c.id) + '">' + esc(c.name) + '</button></td><td>' + esc(c.email || '—') + '</td><td class="num">' + S.projects.filter(function (p) { return p.client_id === c.id; }).length + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    }
    app.innerHTML = h; $('#newC').onclick = function () { formClient(); };
  }
  function formClient(id) {
    var c = id ? byId(S.clients, id) : {};
    PL.drawer('<h2>' + (id ? 'Edit client' : 'New client') + '</h2><form id="f" novalidate><div class="field"><label for="f-name">Client name</label><input id="f-name" value="' + esc(c.name) + '" required></div>' +
      '<div class="field"><label for="f-email">Contact email (optional)</label><input id="f-email" type="email" value="' + esc(c.email) + '"></div>' +
      '<div class="actions"><button class="btn" type="submit">Save client</button><button class="btn ghost" type="button" id="cancel">Cancel</button>' + (id ? '<button class="btn danger" type="button" id="del">Delete</button>' : '') + '</div></form>');
    $('#f').onsubmit = function (e) {
      e.preventDefault();
      var name = $('#f-name').value.trim(), em = $('#f-email').value.trim().toLowerCase();
      if (!name) { PL.toast('Enter a client name.'); return; }
      if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { PL.toast('Enter a valid email address.'); return; }
      var row = { name: name, email: em || null };
      post('/admin/clients', Object.assign({ id: id || undefined }, row)).then(function () { PL.closeDrawer(); PL.toast('Client saved.'); return reload(); }).catch(fail);
    };
    $('#cancel').onclick = PL.closeDrawer;
    var delB = $('#del');
    if (delB) PL.armDelete(delB, function () {
      if (S.projects.some(function (p) { return p.client_id === id; })) { PL.toast('Delete or reassign this client’s projects first.'); return; }
      del('/admin/clients/' + id).then(function () { PL.closeDrawer(); PL.toast('Client deleted.'); return reload(); }).catch(fail);
    }, 'delete this client?');
  }


  /* ---------- backup ---------- */
  function vBackup() {
    var n = S.clients.length + ' clients, ' + S.projects.length + ' projects, ' + S.invoices.length + ' invoices';
    app.innerHTML = '<div class="head"><div><h2>Backup</h2><p>Your ledger is stored in this browser only: ' + n + '. Download a backup file to keep it safe or to open it on another device.</p></div></div>' +
      '<section class="panel"><h3>Download</h3><p class="hint" style="margin:0 0 12px">Saves everything to a file. Do this after you make changes.</p><button class="btn" id="bk-dl">Download backup</button></section>' +
      '<section class="panel"><h3>Restore</h3><p class="hint" style="margin:0 0 12px">Loading a backup replaces what is currently on this device.</p><input type="file" id="bk-file" accept="application/json,.json"> <button class="btn ghost" id="bk-go">Restore from file</button></section>' +
      '<section class="panel"><h3>Erase</h3><p class="hint" style="margin:0 0 12px">Removes all ledger data from this browser. Download a backup first.</p><button class="btn danger" id="bk-clear">Erase everything</button></section>';
    $('#bk-dl').onclick = function () {
      var blob = new Blob([JSON.stringify(Ledger.raw(), null, 2)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'central-analytics-ledger-' + PL.today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
    $('#bk-go').onclick = function () {
      var f = $('#bk-file').files[0]; if (!f) { PL.toast('Choose a backup file first.'); return; }
      var r = new FileReader();
      r.onload = function () { try { Ledger.replace(JSON.parse(r.result)); PL.toast('Backup restored.'); reload(); } catch (e) { PL.toast(e.message || 'Could not read that file.'); } };
      r.readAsText(f);
    };
    armBtn($('#bk-clear'), 'Click again to erase', function () { Ledger.clear(); PL.toast('Erased.'); reload(); });
  }
  function armBtn(b, label, fn) { var t = b.textContent; b.onclick = function () { if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = label; setTimeout(function () { if (b.isConnected) { delete b.dataset.armed; b.textContent = t; } }, 5000); return; } fn(); }; }

  /* ---------- shared click handling ---------- */
  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-pf],[data-inf],[data-editp],[data-editi],[data-editc],[data-paid]'); if (!t) return;
    if (t.dataset.pf) { S.pf = t.dataset.pf; render(); }
    else if (t.dataset.inf) { S.inf = t.dataset.inf; render(); }
    else if (t.dataset.editp) formProject(t.dataset.editp);
    else if (t.dataset.editi) formInvoice(t.dataset.editi);
    else if (t.dataset.editc) formClient(t.dataset.editc);
    else if (t.dataset.paid) {
      t.disabled = true;
      (function () { var inv = byId(S.invoices, t.dataset.paid); return post('/admin/invoices', Object.assign({}, inv, { paid_on: PL.today() })); })().then(function () { PL.toast('Marked paid.'); return reload(); }).catch(function (err) { t.disabled = false; fail(err); });
    }
  });
})();
