/* Local data store for the project ledger. Data lives in this browser only (localStorage);
   nothing is sent to any server. Use Backup > Download to move it between devices. */
(function () {
  var KEY = 'ca_ledger_v1';
  function blank() { return { clients: [], projects: [], invoices: [] }; }
  function read() { try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && d.clients && d.projects && d.invoices) return d; } catch (e) { } return blank(); }
  function write(d) { localStorage.setItem(KEY, JSON.stringify(d)); }
  function uid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function upsert(list, row, make) { var i = row.id ? list.findIndex(function (x) { return x.id === row.id; }) : -1; if (i > -1) { list[i] = Object.assign({}, list[i], row); return list[i]; } var n = Object.assign({ id: uid() }, make ? make(row) : row, { id: row.id || undefined }); n.id = n.id || uid(); list.push(n); return n; }
  var L = window.Ledger = {
    all: function () { var d = read(); return { clients: d.clients, projects: d.projects, invoices: d.invoices, documents: [], uploads: [] }; },
    raw: read,
    replace: function (d) {
      if (!d || !Array.isArray(d.clients) || !Array.isArray(d.projects) || !Array.isArray(d.invoices)) throw new Error('That file is not a ledger backup.');
      write({ clients: d.clients, projects: d.projects, invoices: d.invoices });
    },
    clear: function () { write(blank()); },
    saveClient: function (r) { var d = read(); var n = upsert(d.clients, { id: r.id, name: r.name, email: r.email || null }); write(d); return n; },
    saveProject: function (r) { var d = read(); var n = upsert(d.projects, { id: r.id, name: r.name, client_id: r.client_id, stage: +r.stage || 0, due: r.due || null, fee: +r.fee || 0, client_update: r.client_update || '', internal_note: r.internal_note || '' }); write(d); return n; },
    saveInvoice: function (r) {
      var d = read();
      if (d.invoices.some(function (i) { return i.number === r.number && i.id !== r.id; })) throw new Error('That invoice number is already used.');
      var n = upsert(d.invoices, { id: r.id, number: r.number, project_id: r.project_id, amount: +r.amount, issued: r.issued, due: r.due, paid_on: r.paid_on || null }); write(d); return n;
    },
    del: function (type, id) {
      var d = read();
      if (type === 'invoices') d.invoices = d.invoices.filter(function (x) { return x.id !== id; });
      if (type === 'projects') { d.projects = d.projects.filter(function (x) { return x.id !== id; }); d.invoices = d.invoices.filter(function (x) { return x.project_id !== id; }); }
      if (type === 'clients') { if (d.projects.some(function (p) { return p.client_id === id; })) throw new Error('Delete or reassign this client’s projects first.'); d.clients = d.clients.filter(function (x) { return x.id !== id; }); }
      write(d);
    }
  };
  /* Same call shape the screens already use. */
  PL.api = function (path, o) {
    o = o || {}; var m = o.method || 'GET', b = o.body || {};
    return new Promise(function (ok, no) {
      try {
        var r = /^\/admin\/(clients|projects|invoices)(?:\/([\w-]+))?$/.exec(path);
        if (path === '/admin/data') return ok(L.all());
        if (r && m === 'POST') return ok({ id: ({ clients: L.saveClient, projects: L.saveProject, invoices: L.saveInvoice })[r[1]](b).id });
        if (r && m === 'DELETE') { L.del(r[1], r[2]); return ok({ ok: true }); }
        no(new Error('Unsupported'));
      } catch (e) { no(e); }
    });
  };
})();
