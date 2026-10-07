// "Manage charts" dialog: export, import (preview + merge/replace), and delete-all with confirmation.
import { buildExport, parseImport, planImport, MAX_FILE_BYTES } from '../lib/charts-io.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * @param {{
 *   getProfiles: () => object[],
 *   applyProfiles: (list: object[]) => void,
 *   clearEverything: () => void,
 *   describe: (p: object) => { name: string, sub: string },
 *   newId: () => string,
 * }} ctx
 */
export function initManage(ctx) {
  const dlg = $('#manage-dialog');
  const views = { main: $('#manage-main'), import: $('#manage-import'), delete: $('#manage-delete') };
  let pending = null; // { parsed, fileName }

  const say = (msg, isError = false) => {
    const el = $('#manage-status');
    el.hidden = !msg;
    el.textContent = msg || '';
    el.classList.toggle('error', isError);
  };

  function show(view) {
    for (const [k, el] of Object.entries(views)) el.hidden = k !== view;
    $('#manage-footer').hidden = view !== 'main';
  }

  function renderMain() {
    const list = ctx.getProfiles();
    $('#manage-count').textContent = list.length
      ? `${plural(list.length, 'chart')} saved in this browser.`
      : 'No charts are saved in this browser.';
    $('#manage-list').innerHTML = list.map((p) => { const d = ctx.describe(p); return `<li><span>${esc(d.name)}</span><span class="sub">${esc(d.sub)}</span></li>`; }).join('');
    $('#export-charts').disabled = list.length === 0;
    $('#delete-all').disabled = list.length === 0;
    show('main');
  }

  function download(profiles) {
    const { json, filename } = buildExport(profiles);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return filename;
  }

  function exportAll(after) {
    const list = ctx.getProfiles();
    if (!list.length) return;
    const name = download(list);
    say(`Exported ${plural(list.length, 'chart')} to ${name}. Keep the file private.`);
    after?.();
  }

  /* ----- import ----- */
  function currentPlan() {
    const mode = document.querySelector('input[name="import-mode"]:checked').value;
    return planImport(ctx.getProfiles(), pending.parsed.charts, mode);
  }

  function renderImport() {
    const { parsed, fileName } = pending;
    const plan = currentPlan();
    const bad = parsed.errors;
    const parts = [`${plural(plan.toAdd.length, 'chart')} will be added`];
    if (plan.duplicates.length) parts.push(`${plural(plan.duplicates.length, 'duplicate')} skipped`);
    if (bad.length) parts.push(`${plural(bad.length, 'chart')} can't be imported`);
    $('#import-summary').innerHTML = `<b>${esc(fileName)}</b>: ${esc(parts.join(', '))}.`;
    $('#import-details').innerHTML =
      plan.toAdd.map((p) => { const d = ctx.describe(p); return `<li><span>${esc(d.name)}</span><span class="sub">new · ${esc(d.sub)}</span></li>`; }).join('') +
      plan.duplicates.map((p) => { const d = ctx.describe(p); return `<li><span>${esc(d.name)}</span><span class="sub">already saved · skipped</span></li>`; }).join('') +
      bad.map((e) => `<li class="bad"><span>${esc(e.name)}</span><span class="sub">${esc(e.reason)}</span></li>`).join('');

    const replace = plan.mode === 'replace';
    $('#import-replace-warning').hidden = !replace;
    if (replace) {
      $('#import-replace-text').textContent = `This removes the ${plural(plan.removed, 'chart')} saved in this browser and replaces ${plan.removed === 1 ? 'it' : 'them'} with ${plural(plan.toAdd.length, 'chart')} from the file.`;
    }
    const nothing = plan.toAdd.length === 0 && !replace;
    $('#import-go').disabled = nothing || (replace && !$('#import-replace-ok').checked);
    $('#import-go').textContent = replace ? 'Replace my charts' : nothing ? 'Nothing new to import' : `Import ${plural(plan.toAdd.length, 'chart')}`;
    show('import');
  }

  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    say('');
    if (file.size > MAX_FILE_BYTES) { say('That file is too large to be a chart backup.', true); return; }
    let text;
    try { text = await file.text(); } catch { say("Couldn't read that file.", true); return; }
    const parsed = parseImport(text, ctx.newId);
    if (parsed.fileError) { say(parsed.fileError, true); return; }
    if (!parsed.charts.length) { say(`No valid charts in that file${parsed.errors.length ? ` (${plural(parsed.errors.length, 'chart')} had problems)` : ''}.`, true); return; }
    pending = { parsed, fileName: file.name };
    $('#import-replace-ok').checked = false;
    document.querySelector('input[name="import-mode"][value="merge"]').checked = true;
    renderImport();
  });

  document.querySelectorAll('input[name="import-mode"]').forEach((r) => r.addEventListener('change', () => { $('#import-replace-ok').checked = false; renderImport(); }));
  $('#import-replace-ok').addEventListener('change', renderImport);
  $('#import-backup-first').addEventListener('click', () => exportAll());
  $('#import-back').addEventListener('click', () => { pending = null; renderMain(); });
  $('#import-go').addEventListener('click', () => {
    if (!pending) return;
    const plan = currentPlan();
    if (plan.mode === 'replace' && !$('#import-replace-ok').checked) return;
    ctx.applyProfiles(plan.result);
    pending = null;
    renderMain();
    say(plan.mode === 'replace'
      ? `Replaced ${plural(plan.removed, 'saved chart')} with ${plural(plan.toAdd.length, 'chart')}.`
      : `Imported ${plural(plan.toAdd.length, 'chart')}${plan.duplicates.length ? `, skipped ${plural(plan.duplicates.length, 'duplicate')}` : ''}.`);
  });

  /* ----- delete all ----- */
  function renderDelete() {
    const list = ctx.getProfiles();
    $('#delete-summary').textContent = `${plural(list.length, 'chart')} will be permanently removed from this browser:`;
    $('#delete-list').innerHTML = list.map((p) => { const d = ctx.describe(p); return `<li><span>${esc(d.name)}</span><span class="sub">${esc(d.sub)}</span></li>`; }).join('');
    $('#delete-ok').checked = false;
    $('#delete-confirm').disabled = true;
    $('#delete-confirm').textContent = `Delete ${list.length === 1 ? '1 chart' : `all ${list.length}`}`;
    show('delete');
  }
  $('#delete-all').addEventListener('click', () => { say(''); renderDelete(); });
  $('#delete-ok').addEventListener('change', (e) => { $('#delete-confirm').disabled = !e.target.checked; });
  $('#delete-backup-first').addEventListener('click', () => exportAll());
  $('#delete-cancel').addEventListener('click', renderMain);
  $('#delete-confirm').addEventListener('click', () => {
    if (!$('#delete-ok').checked) return;
    ctx.clearEverything();
    dlg.close();
  });

  $('#export-charts').addEventListener('click', () => { say(''); exportAll(); });
  $('#manage-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { pending = null; say(''); });

  return { open() { say(''); renderMain(); dlg.showModal(); } };
}
