
// app.js - Roteador principal e handlers de eventos

// ── STATE ─────────────────────────────────────────────────────
const state = {
  user: null,
  view: 'list',       // 'list' | 'detail' | 'new-req' | 'materials' | 'dashboard' | 'admin-panel'
  selectedReqId: null,
  statusFilter: '',
  obraFilter: '',
  search: '',
  alertDismissed: false,
  itemCount: 1,
};

const app = document.getElementById('app');
const overlay = document.getElementById('modal-overlay');

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type='success') {
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = (type==='success'?'✓ ':type==='error'?'✗ ':'ℹ ') + msg;
  tc.appendChild(t);
  setTimeout(()=>t.remove(), 3500);
}

// ── RENDER ROOT ───────────────────────────────────────────────
function render() {
  if (!state.user) { app.innerHTML = renderLogin(); bindLogin(); return; }
  const reqs = getRequisitions();
  const alertCount = getPendingAlertCount();
  let html = `<div class="layout">
    ${renderSidebar(state.user, alertCount)}
    <div class="main-content">
      ${renderTopBar(state.user, reqs)}
      ${state.user.role==='compras' && alertCount>0 && !state.alertDismissed ? renderAlertBanner(alertCount) : ''}
      <div class="page-content">${renderView(reqs)}</div>
    </div>
  </div>`;
  app.innerHTML = html;
  bindLayout();
  bindView(reqs);
}

function renderView(reqs) {
  const role = state.user.role;
  
  if (state.view === 'admin-panel' && hasPermission(role, 'admin-panel')) return renderAdminPanel();
  if (state.view === 'materials' && hasPermission(role, 'materials')) return renderMaterialsAdmin(state.user);
  if (state.view === 'dashboard' && hasPermission(role, 'dashboard')) return renderDashboard(reqs);
  
  if (state.view === 'detail') {
    const req = getRequisitionById(state.selectedReqId);
    if (!req) { state.view='list'; return renderView(reqs); }
    return renderReqDetail(req, state.user);
  }
  if (state.view === 'new-req' && hasPermission(role, 'new-req')) return renderNewReqForm(state.user);
  
  // Default fallback if current view is not permitted
  if (!hasPermission(role, state.view)) {
    if (hasPermission(role, 'list')) { state.view = 'list'; }
    else if (hasPermission(role, 'dashboard')) { state.view = 'dashboard'; }
    else { state.view = 'list'; }
  }

  if (state.view === 'dashboard') return renderDashboard(reqs);
  return renderReqList(getFilteredReqs(reqs), state.user);
}

function getFilteredReqs(reqs) {
  let u = state.user;
  let list = u.role==='obra' ? reqs.filter(r=>r.userId===u.id)
           : u.role==='compras' ? reqs.filter(r=>['aprovado','cotacao','pedido','entregue'].includes(r.status))
           : reqs;
  if (state.statusFilter) list = list.filter(r=>r.status===state.statusFilter);
  if (state.obraFilter)   list = list.filter(r=>r.obra===state.obraFilter);
  if (state.search.trim()) {
    const s = state.search.toLowerCase();
    list = list.filter(r=>[r.id,r.necessity,r.obra,getUserById(r.userId).name,r.osNumber||''].join(' ').toLowerCase().includes(s));
  }
  return list;
}

// ── BIND LAYOUT ───────────────────────────────────────────────
function bindLayout() {
  document.getElementById('btn-logout')?.addEventListener('click', ()=>{ logout(); state.user=null; state.view='list'; render(); });
  document.getElementById('nav-list')?.addEventListener('click', ()=>{ state.view='list'; render(); });
  document.getElementById('nav-dashboard')?.addEventListener('click', ()=>{ state.view='dashboard'; render(); });
  document.getElementById('nav-materials')?.addEventListener('click', ()=>{ state.view='materials'; render(); });
  document.getElementById('nav-admin')?.addEventListener('click', ()=>{ state.view='admin-panel'; render(); });
  document.getElementById('alert-close')?.addEventListener('click', ()=>{ state.alertDismissed=true; render(); });
}

// ── BIND LOGIN ────────────────────────────────────────────────
function bindLogin() {
  document.getElementById('login-form')?.addEventListener('submit', e=>{
    e.preventDefault();
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    const user = login(u, p);
    if (user) { state.user=user; state.alertDismissed=false; render(); }
    else { app.innerHTML = renderLogin('Usuário ou senha incorretos. Tente novamente.'); bindLogin(); }
  });
}

// ── BIND VIEWS ────────────────────────────────────────────────
function bindView(reqs) {
  if (state.view==='admin-panel') { bindAdminPanel(); return; }
  if (state.view==='materials') { bindMaterialsView(); return; }
  if (state.view==='detail')    { bindDetailView(); return; }
  if (state.view==='new-req')   { bindNewReqView(); return; }
  if (state.view==='dashboard') { bindDashboardView(); return; }
  bindListView(reqs);
}

// LIST VIEW
function bindListView(reqs) {
  document.getElementById('btn-new-req')?.addEventListener('click', ()=>{ state.view='new-req'; state.itemCount=1; render(); });
  document.getElementById('btn-export')?.addEventListener('click', ()=>exportCSV(getFilteredReqs(reqs)));

  const searchEl = document.getElementById('search-input');
  if (searchEl) { searchEl.value=state.search; searchEl.addEventListener('input', e=>{ state.search=e.target.value; renderCardList(); }); }

  const obraEl = document.getElementById('obra-filter');
  if (obraEl) { obraEl.value=state.obraFilter; obraEl.addEventListener('change', e=>{ state.obraFilter=e.target.value; renderCardList(); }); }

  document.querySelectorAll('#status-pills .pill').forEach(p=>{
    if (p.dataset.status===state.statusFilter) p.classList.add('active'); else p.classList.remove('active');
    p.addEventListener('click', ()=>{ state.statusFilter=p.dataset.status; document.querySelectorAll('#status-pills .pill').forEach(x=>x.classList.remove('active')); p.classList.add('active'); renderCardList(); });
  });

  document.querySelectorAll('.obra-tag[data-obra]').forEach(t=>{
    if (t.dataset.obra===state.obraFilter) t.classList.add('active');
    t.addEventListener('click', ()=>{ state.obraFilter=(state.obraFilter===t.dataset.obra?'':t.dataset.obra); render(); });
  });

  document.querySelectorAll('.req-card').forEach(c=>{
    c.addEventListener('click', ()=>{ state.selectedReqId=c.dataset.reqId; state.view='detail'; render(); });
  });
}

function renderCardList() {
  const reqs = getRequisitions();
  const filtered = getFilteredReqs(reqs);
  const container = document.getElementById('req-cards');
  if (!container) return;
  container.innerHTML = filtered.length===0
    ? `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Nenhuma requisição encontrada</div></div>`
    : filtered.map(r=>renderReqCard(r)).join('');
  container.querySelectorAll('.req-card').forEach(c=>{
    c.addEventListener('click', ()=>{ state.selectedReqId=c.dataset.reqId; state.view='detail'; render(); });
  });
}

// DETAIL VIEW
function bindDetailView() {
  const req = getRequisitionById(state.selectedReqId);
  if (!req) return;

  document.getElementById('btn-back')?.addEventListener('click', ()=>{ state.view='list'; render(); });
  document.getElementById('btn-print-pdf')?.addEventListener('click', ()=>printReqPDF(req));

  // Coordinator actions
  const approveBtn = document.getElementById('btn-approve');
  if (approveBtn) {
    approveBtn.addEventListener('click', ()=>{
      const os = document.getElementById('coord-os').value.trim();
      updateRequisition(req.id, { status:'aprovado', approvedAt:todayStr(), osNumber:os||req.osNumber });
      showToast('Requisição aprovada com sucesso!');
      state.view='list'; render();
    });
  }

  document.getElementById('btn-reject-toggle')?.addEventListener('click', ()=>{
    document.getElementById('reject-section').style.display='block';
    document.getElementById('btn-reject-toggle').classList.add('hidden');
    document.getElementById('btn-reject-confirm').classList.remove('hidden');
    document.getElementById('btn-reject-cancel').classList.remove('hidden');
    document.getElementById('btn-approve').disabled=true;
  });

  document.getElementById('btn-reject-cancel')?.addEventListener('click', ()=>{
    document.getElementById('reject-section').style.display='none';
    document.getElementById('btn-reject-toggle').classList.remove('hidden');
    document.getElementById('btn-reject-confirm').classList.add('hidden');
    document.getElementById('btn-reject-cancel').classList.add('hidden');
    document.getElementById('btn-approve').disabled=false;
  });

  document.getElementById('btn-reject-confirm')?.addEventListener('click', ()=>{
    const note = document.getElementById('reject-note').value.trim();
    if (!note) { showToast('Informe o motivo da rejeição.','error'); return; }
    const os = document.getElementById('coord-os').value.trim();
    updateRequisition(req.id, { status:'rejeitado', rejectNote:note, osNumber:os||req.osNumber });
    showToast('Requisição rejeitada.','error');
    state.view='list'; render();
  });

  // Compras actions
  document.getElementById('btn-save-quote')?.addEventListener('click', ()=>{
    const supplier = document.getElementById('quote-supplier').value.trim();
    const delivery = document.getElementById('quote-delivery').value;
    if (!delivery) { showToast('Informe a data estimada de entrega.','error'); return; }
    updateRequisition(req.id, { status:'cotacao', quotedAt:todayStr(), supplier, estimatedDelivery:delivery });
    showToast('Cotação salva com sucesso!');
    state.selectedReqId=req.id; render();
  });

  document.getElementById('btn-mark-ordered')?.addEventListener('click', ()=>{
    updateRequisition(req.id, { status:'pedido', orderedAt:todayStr() });
    showToast('Pedido registrado!');
    state.selectedReqId=req.id; render();
  });

  document.getElementById('btn-mark-delivered')?.addEventListener('click', ()=>{
    updateRequisition(req.id, { status:'entregue', deliveredAt:todayStr() });
    showToast('Entrega confirmada! ✅');
    state.view='list'; render();
  });

  // Comments
  const commentText = document.getElementById('comment-text');
  const sendComment = ()=>{
    const t = commentText?.value.trim();
    if (!t) return;
    addComment(req.id, state.user.id, t);
    commentText.value='';
    const updatedReq = getRequisitionById(req.id);
    const list = document.getElementById('comment-list');
    if (list) list.outerHTML = renderComments(updatedReq, state.user);
    document.getElementById('comment-list')?.scrollTo(0,9999);
  };
  document.getElementById('btn-send-comment')?.addEventListener('click', sendComment);
  commentText?.addEventListener('keydown', e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendComment();} });

  // Dashboard clickthrough
  document.querySelectorAll('.dash-req-row').forEach(r=>{
    r.addEventListener('click',()=>{ state.selectedReqId=r.dataset.reqId; state.view='detail'; render(); });
  });
  document.getElementById('btn-export-dash')?.addEventListener('click',()=>exportCSV(getRequisitions()));
}

// NEW REQ VIEW
function bindNewReqView() {
  const categories = getMaterialCategories();
  const materials = getActiveMaterials();

  const addItem = ()=>{
    const idx = state.itemCount;
    const container = document.getElementById('items-container');
    const row = document.createElement('div');
    row.innerHTML = renderItemRow(idx, categories, materials, null);
    container.appendChild(row.firstElementChild);
    state.itemCount++;
    rebindItemHandlers();
  };

  const rebindItemHandlers = ()=>{
    document.querySelectorAll('.item-cat').forEach(sel=>{
      sel.onchange = e=>{
        const idx = parseInt(sel.dataset.idx);
        const cat = sel.value;
        const matsForCat = materials.filter(m=>m.category===cat);
        const matSel = document.querySelector(`.item-mat[data-idx="${idx}"]`);
        if (matSel) {
          matSel.innerHTML = matsForCat.map(m=>`<option value="${m.id}" data-unit="${m.defaultUnit}">${m.name}</option>`).join('');
          updateUnit(idx);
        }
        const bitolaSel = document.querySelector(`.item-bitola[data-idx="${idx}"]`);
        const colorSel = document.querySelector(`.item-color[data-idx="${idx}"]`);
        if (bitolaSel) bitolaSel.style.display = cat==='Cabeamento' ? 'block' : 'none';
        if (colorSel) colorSel.style.display = cat==='Cabeamento' ? 'block' : 'none';
      };
    });
    document.querySelectorAll('.item-mat').forEach(sel=>{
      sel.onchange = ()=>updateUnit(parseInt(sel.dataset.idx));
    });
    document.querySelectorAll('.remove-item').forEach(btn=>{
      btn.onclick = ()=>{
        if (document.querySelectorAll('.item-row').length<=1) return;
        document.getElementById(`item-${btn.dataset.idx}`)?.remove();
        renumberItems();
      };
    });
  };

  const updateUnit = idx=>{
    const matSel = document.querySelector(`.item-mat[data-idx="${idx}"]`);
    const unitSel = document.querySelector(`.item-unit[data-idx="${idx}"]`);
    if (!matSel||!unitSel) return;
    const opt = matSel.selectedOptions[0];
    const u = opt?.dataset.unit||'un';
    unitSel.value=u;
  };

  const renumberItems = ()=>{
    document.querySelectorAll('.item-row').forEach((row,i)=>{
      const numEl = row.querySelector('div[style*="border-radius:50%"]');
      if (numEl) numEl.textContent=i+1;
    });
  };

  // Initial item
  const container = document.getElementById('items-container');
  const row = document.createElement('div');
  row.innerHTML = renderItemRow(0, categories, materials, null);
  container.appendChild(row.firstElementChild);
  rebindItemHandlers();

  document.getElementById('btn-add-item')?.addEventListener('click', addItem);

  const cancelFn = ()=>{ state.view='list'; render(); };
  document.getElementById('btn-cancel-req')?.addEventListener('click', cancelFn);
  document.getElementById('btn-cancel-req2')?.addEventListener('click', cancelFn);

  document.getElementById('btn-submit-req')?.addEventListener('click', ()=>{
    const necessity = document.getElementById('req-necessity').value.trim();
    const deadline = document.getElementById('req-deadline').value;
    const osNumber = document.getElementById('req-os')?.value?.trim() || '';

    if (!necessity) { showToast('Informe a necessidade do material.','error'); return; }
    if (!deadline) { showToast('Informe o prazo máximo de entrega.','error'); return; }

    const items = [];
    let valid = true;
    document.querySelectorAll('.item-row').forEach((row,i)=>{
      const matSel = row.querySelector('.item-mat');
      const qtySel = row.querySelector('.item-qty');
      const unitSel = row.querySelector('.item-unit');
      const obsSel = row.querySelector('.item-obs');
      const catSel = row.querySelector('.item-cat');
      if (!qtySel.value||!matSel.value) { valid=false; return; }
      const bitolaSel = row.querySelector('.item-bitola');
      const colorSel = row.querySelector('.item-color');
      const mat = materials.find(m=>m.id===parseInt(matSel.value));
      const bitola = catSel.value === 'Cabeamento' && bitolaSel ? bitolaSel.value : null;
      const color = catSel.value === 'Cabeamento' && colorSel ? colorSel.value : null;
      items.push({ id:i+1, category:catSel.value, name:mat?.name||matSel.options[matSel.selectedIndex]?.text||'', matId:parseInt(matSel.value), qty:parseInt(qtySel.value), unit:unitSel.value, obs:obsSel.value, bitola, color });
    });

    if (!valid||items.length===0) { showToast('Preencha todos os itens corretamente.','error'); return; }

    addRequisition({ userId:state.user.id, obra:state.user.obra, osNumber, necessity, deadline, items });
    showToast('Requisição enviada com sucesso! ✅');
    state.view='list'; render();
  });
}

// DASHBOARD VIEW
function bindDashboardView() {
  document.querySelectorAll('#dashboard-view .obra-tag').forEach(t=>{
    t.addEventListener('click', ()=>{
      const reqs = t.dataset.obra==='' ? getRequisitions() : getRequisitions().filter(r=>r.obra===t.dataset.obra);
      document.querySelectorAll('#dashboard-view .obra-tag').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      document.querySelector('#dashboard-view').outerHTML = renderDashboard(reqs);
      bindDashboardView();
    });
  });
  document.getElementById('btn-export-dash')?.addEventListener('click',()=>exportCSV(getRequisitions()));
  document.querySelectorAll('.dash-req-row').forEach(r=>{
    r.addEventListener('click',()=>{ state.selectedReqId=r.dataset.reqId; state.view='detail'; render(); });
  });
}

// MATERIALS VIEW
function bindMaterialsView() {
  document.getElementById('btn-back-materials')?.addEventListener('click',()=>{ state.view='list'; render(); });

  document.getElementById('btn-open-add-material')?.addEventListener('click',()=>{
    overlay.innerHTML = renderAddMaterialModal();
    overlay.classList.remove('hidden');
    bindMaterialModal();
  });

  document.querySelectorAll('.mat-toggle').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id=parseInt(btn.dataset.matId);
      const mat=getMaterials().find(m=>m.id===id);
      if(mat){ updateMaterial(id,{active:!mat.active}); render(); }
    });
  });

  document.querySelectorAll('.mat-delete').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(confirm('Remover este material do catálogo?')){ deleteMaterial(parseInt(btn.dataset.matId)); showToast('Material removido.'); render(); }
    });
  });
}

function bindMaterialModal() {
  const closeModal = ()=>{ overlay.classList.add('hidden'); overlay.innerHTML=''; };
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-close2')?.addEventListener('click', closeModal);

  document.getElementById('mat-cat-select')?.addEventListener('change', e=>{
    const newEl = document.getElementById('mat-cat-new');
    newEl.classList.toggle('hidden', e.target.value!=='__new__');
  });

  document.getElementById('btn-save-material')?.addEventListener('click', ()=>{
    const catSel = document.getElementById('mat-cat-select').value;
    const catNew = document.getElementById('mat-cat-new').value.trim();
    const category = catSel==='__new__' ? catNew : catSel;
    const name = document.getElementById('mat-name').value.trim();
    const defaultUnit = document.getElementById('mat-unit').value;
    if (!category) { showToast('Informe a categoria.','error'); return; }
    if (!name) { showToast('Informe o nome do material.','error'); return; }
    addMaterial({ category, name, defaultUnit });
    showToast('Material adicionado ao catálogo!');
    closeModal(); render();
  });
}

// ── PDF EXPORT ────────────────────────────────────────────────
function printReqPDF(req) {
  const owner = getUserById(req.userId);
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${req.id} — ASPEM</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;color:#1E293B;padding:32px;font-size:13px}
  .hd{display:flex;justify-content:space-between;border-bottom:3px solid #F59E0B;padding-bottom:16px;margin-bottom:20px}
  .logo{font-size:20px;font-weight:900}.info{font-size:11px;color:#64748B;margin-top:4px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
  .box{background:#F8FAFC;border-radius:8px;padding:12px}.lbl{font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:3px}.val{font-size:14px;font-weight:700}
  .sec{margin-bottom:18px}.sec-t{font-size:12px;font-weight:800;text-transform:uppercase;border-bottom:1px solid #E2E8F0;padding-bottom:6px;margin-bottom:10px}
  .nb{background:#FFFBEB;border-left:4px solid #F59E0B;padding:12px;border-radius:0 8px 8px 0;line-height:1.6}
  table{width:100%;border-collapse:collapse}th{background:#F1F5F9;padding:8px;text-align:left;font-size:11px;font-weight:700;color:#64748B}td{padding:8px;border-bottom:1px solid #F1F5F9;font-size:12px}
  .pbtn{background:#F59E0B;color:#0F172A;border:none;padding:8px 18px;border-radius:6px;font-weight:700;cursor:pointer;margin-bottom:20px}
  @media print{.pbtn{display:none}}</style></head><body>
  <button class="pbtn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  <div class="hd">
    <div><div class="logo">⚡ ASPEM</div><div class="info">Sistema de Requisição de Materiais Elétricos</div></div>
    <div style="text-align:right"><div style="font-size:18px;font-weight:900;font-family:monospace">${req.id}</div>
    <div style="font-size:11px;color:#64748B">${STATUS[req.status].icon} ${STATUS[req.status].label}</div></div>
  </div>
  <div class="grid">
    <div class="box"><div class="lbl">Obra</div><div class="val">${req.obra}</div></div>
    <div class="box"><div class="lbl">Solicitante</div><div class="val">${owner.name}</div></div>
    <div class="box"><div class="lbl">OS / Centro de Custo</div><div class="val">${req.osNumber||'—'}</div></div>
    <div class="box"><div class="lbl">Data da Requisição</div><div class="val">${fmtDate(req.createdAt)}</div></div>
    <div class="box"><div class="lbl">Prazo Necessário</div><div class="val" style="color:#EF4444">${fmtDate(req.deadline)}</div></div>
    <div class="box"><div class="lbl">Entrega Estimada</div><div class="val" style="color:#10B981">${fmtDate(req.estimatedDelivery)}</div></div>
  </div>
  <div class="sec"><div class="sec-t">📝 Necessidade do Material</div><div class="nb">${req.necessity}</div></div>
  <div class="sec"><div class="sec-t">📦 Lista de Materiais</div>
    <table><thead><tr><th>#</th><th>Categoria</th><th>Material</th><th>Qtd</th><th>Un.</th><th>Cor</th><th>Bitola</th><th>Obs.</th></tr></thead><tbody>
    ${req.items.map((it,i)=>`<tr><td>${i+1}</td><td>${it.category}</td><td>${it.name||it.description||''}</td><td style="text-align:center;font-weight:700">${it.qty}</td><td style="text-align:center">${it.unit}</td><td style="text-align:center">${it.color||'—'}</td><td style="text-align:center">${it.bitola||'—'}</td><td style="color:#94A3B8">${it.obs||'—'}</td></tr>`).join('')}
    </tbody></table>
  </div>
  ${req.supplier?`<div class="grid"><div class="box"><div class="lbl">Fornecedor</div><div class="val">${req.supplier}</div></div></div>`:''}
  </body></html>`;
  const w = window.open('','_blank','width=900,height=700');
  if(w){w.document.write(html);w.document.close();}
}

// ── INIT ──────────────────────────────────────────────────────
function init() {
  const saved = getCurrentUser();
  if (saved) state.user = saved;
  render();
}

window.addEventListener('DOMContentLoaded', init);

// ADMIN PANEL VIEW
function bindAdminPanel() {
  document.getElementById('btn-save-perms')?.addEventListener('click', () => {
    const permissions = getPermissions();
    document.querySelectorAll('.perm-check').forEach(chk => {
      const role = chk.dataset.role;
      const view = chk.dataset.view;
      if (chk.checked) {
        if (!permissions[role].includes(view)) permissions[role].push(view);
      } else {
        permissions[role] = permissions[role].filter(v => v !== view);
      }
    });
    savePermissions(permissions);
    showToast('Permissões atualizadas com sucesso!');
    render();
  });

  document.getElementById('btn-open-add-user')?.addEventListener('click', () => {
    overlay.innerHTML = renderAddUserModal();
    overlay.classList.remove('hidden');
    bindUserModal();
  });

  document.querySelectorAll('.user-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.uid);
      const user = getUserById(id);
      if (user) {
        overlay.innerHTML = renderAddUserModal(user);
        overlay.classList.remove('hidden');
        bindUserModal();
      }
    });
  });

  document.querySelectorAll('.user-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja excluir este usuário?')) {
        const id = parseInt(btn.dataset.uid);
        deleteUser(id);
        showToast('Usuário removido.');
        render();
      }
    });
  });
}

function bindUserModal() {
  const closeModal = () => { overlay.classList.add('hidden'); overlay.innerHTML=''; };
  document.getElementById('modal-close-user')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-user')?.addEventListener('click', closeModal);

  document.getElementById('btn-save-user')?.addEventListener('click', () => {
    const idStr = document.getElementById('user-id').value;
    const isEdit = !!idStr;
    const name = document.getElementById('user-name').value.trim();
    const username = document.getElementById('user-username').value.trim();
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;
    const obra = document.getElementById('user-obra').value.trim();

    if (!name || !username || !password || !role) {
      showToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }

    const userData = { name, username, password, role, obra: obra || null };

    if (isEdit) {
      updateUser(parseInt(idStr), userData);
      showToast('Usuário atualizado com sucesso!');
    } else {
      addUser(userData);
      showToast('Usuário criado com sucesso!');
    }

    closeModal();
    render();
  });
}
