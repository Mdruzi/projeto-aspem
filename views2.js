
// views2.js - Renderização das telas (parte 2): Detalhe, Formulário, Compras, Dashboard, Materiais

function renderTimeline(req) {
  const steps = [
    {label:'Criado',   date:req.createdAt},
    {label:'Aprovado', date:req.approvedAt},
    {label:'Cotação',  date:req.quotedAt},
    {label:'Pedido',   date:req.orderedAt},
    {label:'Entregue', date:req.deliveredAt},
  ];
  return `
  <div class="timeline">
    ${steps.map((s,i)=>`
      <div class="tl-step">
        ${i<steps.length-1?`<div class="tl-line ${s.date&&steps[i+1].date?'done':''}"></div>`:''}
        <div class="tl-dot ${s.date?'done':''}"></div>
        <div class="tl-label">${s.label}</div>
        <div class="tl-date">${fmtDate(s.date)}</div>
      </div>`).join('')}
  </div>`;
}

function renderComments(req, user) {
  return `
  <div class="comment-list" id="comment-list">
    ${req.comments.length===0
      ?`<div class="empty-state" style="padding:16px"><div class="empty-state-desc">Nenhum comentário ainda.</div></div>`
      :req.comments.map(c=>{
        const u=getUserById(c.userId); const mine=c.userId===user.id;
        return `<div class="comment-item ${mine?'mine':''}">
          <div class="avatar" style="width:30px;height:30px;font-size:11px;flex-shrink:0;background:${mine?'#1B4FD8':'#F59E0B'};color:${mine?'#fff':'#0F172A'}">${u.avatar}</div>
          <div style="max-width:72%">
            <div class="comment-meta ${mine?'flex-between':''}">
              <span class="comment-author">${u.name}</span>
              <span class="comment-date">${fmtDate(c.createdAt)}</span>
            </div>
            <div class="comment-bubble">${c.text}</div>
          </div>
        </div>`;}).join('')}
  </div>
  <div class="comment-input-row">
    <div class="avatar" style="width:30px;height:30px;font-size:11px;flex-shrink:0">${user.avatar}</div>
    <textarea id="comment-text" class="textarea" style="min-height:52px;flex:1;resize:none" placeholder="Comentar... (Enter para enviar, Shift+Enter nova linha)"></textarea>
    <button class="btn btn-primary btn-sm" id="btn-send-comment">➤</button>
  </div>
  <div class="field-hint" style="padding-left:38px">Enter para enviar · Shift+Enter nova linha</div>`;
}

function renderReqDetail(req, user) {
  const owner = getUserById(req.userId);
  const isLate = req.deadline && req.status!=='entregue' && req.status!=='rejeitado' && new Date(req.deadline)<new Date();
  return `
  <div id="req-detail-view">
    <div class="toolbar" style="margin-bottom:16px">
      <button class="btn btn-secondary btn-sm" id="btn-back">← Voltar</button>
      <button class="btn btn-secondary btn-sm" id="btn-print-pdf">🖨️ Exportar PDF</button>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="flex gap-8 flex-center" style="flex-wrap:wrap">
          <span class="fw-black font-mono" style="font-size:18px">${req.id}</span>
          ${renderStatusBadge(req.status)}
          ${isLate?`<span class="badge badge-late">⚠ Prazo Vencido</span>`:''}
          ${req.osNumber?`<span class="req-os" style="font-size:12px;padding:4px 10px">🔧 OS: ${req.osNumber}</span>`:''}
        </div>
        <div style="text-align:right;font-size:12px;color:var(--text-muted)">
          <div>Criado em ${fmtDate(req.createdAt)}</div>
          <div>Prazo: <strong style="color:var(--danger)">${fmtDate(req.deadline)}</strong></div>
        </div>
      </div>
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text-muted)">
        🏗 <strong>${req.obra}</strong> &nbsp;·&nbsp; 👤 <strong>${owner.name}</strong>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">📝 Necessidade do Material</div>
        <div class="necessity-box">${req.necessity}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">📦 Lista de Materiais</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Categoria</th><th>Material</th><th>Qtd</th><th>Un.</th><th>Cor</th><th>Bitola</th><th>Obs.</th></tr></thead>
            <tbody>
              ${req.items.map((it,i)=>`
                <tr>
                  <td>${i+1}</td>
                  <td><span class="cat-badge">${it.category}</span></td>
                  <td>${it.name||it.description||''}</td>
                  <td style="text-align:center;font-weight:700">${it.qty}</td>
                  <td style="text-align:center">${it.unit}</td>
                  <td style="text-align:center">${it.color||'—'}</td>
                  <td style="text-align:center">${it.bitola||'—'}</td>
                  <td style="color:var(--text-muted)">${it.obs||'—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">📅 Histórico de Status</div>
        ${renderTimeline(req)}
      </div>

      ${req.status==='rejeitado'&&req.rejectNote?`
      <div class="detail-section">
        <div class="detail-section-title">❌ Motivo da Rejeição</div>
        <div style="background:#FEF2F2;border-left:4px solid var(--danger);padding:12px 16px;border-radius:0 8px 8px 0;font-size:13px;color:#7F1D1D">${req.rejectNote}</div>
      </div>`:''}

      ${user.role==='coordenador'&&req.status==='pendente'?`
      <div class="detail-section">
        <div class="detail-section-title">⚙️ Ações do Coordenador</div>
        <div class="form-row form-row-2" style="margin-bottom:12px">
          <div>
            <label class="field-label">Número da OS (Ordem de Serviço)</label>
            <input id="coord-os" class="input" placeholder="Ex: OS-2024-007" value="${req.osNumber||''}" />
            <div class="field-hint">Vincula esta requisição ao centro de custo</div>
          </div>
        </div>
        <div id="reject-section" style="display:none;margin-bottom:12px">
          <label class="field-label">Motivo da Rejeição</label>
          <textarea id="reject-note" class="textarea" style="min-height:80px" placeholder="Informe o motivo da rejeição..."></textarea>
        </div>
        <div class="flex gap-10">
          <button class="btn btn-success" id="btn-approve">✅ Aprovar Requisição</button>
          <button class="btn btn-danger" id="btn-reject-toggle">❌ Rejeitar</button>
          <button class="btn btn-danger hidden" id="btn-reject-confirm">Confirmar Rejeição</button>
          <button class="btn btn-secondary hidden" id="btn-reject-cancel">Cancelar</button>
        </div>
      </div>`:''}

      ${user.role==='compras'&&(req.status==='aprovado'||req.status==='cotacao')?`
      <div class="detail-section">
        <div class="detail-section-title">🛒 Informações de Cotação</div>
        <div class="form-row form-row-3" style="margin-bottom:12px">
          <div>
            <label class="field-label">Fornecedor</label>
            <input id="quote-supplier" class="input" value="${req.supplier||''}" placeholder="Nome do fornecedor" />
          </div>
          <div>
            <label class="field-label">Data Estimada de Entrega *</label>
            <input id="quote-delivery" class="input" type="date" value="${req.estimatedDelivery||''}" />
          </div>
        </div>
        <div class="flex gap-10">
          <button class="btn btn-primary" id="btn-save-quote">💾 Salvar Cotação</button>
          ${req.status==='cotacao'?`<button class="btn btn-success" id="btn-mark-ordered">📦 Registrar Pedido</button>`:''}
        </div>
      </div>`:''}

      ${user.role==='compras'&&req.status==='pedido'?`
      <div class="detail-section">
        <div class="detail-section-title">🚚 Confirmação de Entrega</div>
        <div class="flex gap-12 flex-center">
          <div style="font-size:13px;color:var(--text-muted)">Entrega estimada: <strong>${fmtDate(req.estimatedDelivery)}</strong></div>
          <button class="btn btn-success" id="btn-mark-delivered">✅ Confirmar Entrega</button>
        </div>
      </div>`:''}

      ${req.supplier?`
      <div class="detail-section">
        <div class="detail-section-title">💰 Dados da Compra</div>
        <div class="form-row form-row-2">
          <div><label class="field-label">Fornecedor</label><div class="fw-bold" style="font-size:14px">${req.supplier}</div></div>
          <div><label class="field-label">Entrega Estimada</label><div class="fw-bold" style="font-size:14px">${fmtDate(req.estimatedDelivery)}</div></div>
        </div>
      </div>`:''}

      <div class="detail-section" style="padding-bottom:24px">
        <div class="detail-section-title">💬 Comentários ${req.comments.length>0?`<span style="font-weight:400;color:var(--text-muted)">(${req.comments.length})</span>`:''}</div>
        ${renderComments(req, user)}
      </div>
    </div>
  </div>`;
}

function renderNewReqForm(user) {
  const materials = getActiveMaterials();
  const categories = getMaterialCategories();
  return `
  <div id="new-req-view">
    <div class="toolbar" style="margin-bottom:16px">
      <button class="btn btn-secondary btn-sm" id="btn-cancel-req">← Cancelar</button>
    </div>
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title" style="font-size:16px">📨 Nova Requisição de Materiais</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">🏗 Obra: <strong>${user.obra}</strong></div>
        </div>
      </div>
      <div class="card-body">
        <div class="form-row" style="margin-bottom:14px">
          <div>
            <label class="field-label">📝 Justificativa / Necessidade do Material *</label>
            <textarea id="req-necessity" class="textarea" style="min-height:100px" placeholder="Descreva para que será usado, onde será instalado, urgência..."></textarea>
          </div>
        </div>
        <div class="form-row" style="margin-bottom:14px">
          <div>
            <label class="field-label">📅 Prazo Máximo para Entrega *</label>
            <input id="req-deadline" class="input" type="date" min="${todayStr()}" />
            <div class="field-hint">Informe o prazo máximo para chegada do material na obra</div>
          </div>
        </div>

        <div style="font-weight:800;font-size:13px;margin-bottom:12px">📦 Lista de Materiais</div>
        <div id="items-container"></div>
        <button class="btn" id="btn-add-item" style="margin-top:16px;width:100%;padding:14px;border:2px dashed var(--primary);color:var(--primary);font-weight:700;display:flex;justify-content:center;align-items:center;background:rgba(27,79,216,0.05);cursor:pointer;border-radius:6px;transition:0.2s">➕ Adicionar Mais Itens</button>

        <div style="display:flex;gap:12px;margin-top:24px;padding-top:18px;border-top:1px solid var(--border)">
          <button class="btn btn-primary" id="btn-submit-req">📨 Enviar Requisição</button>
          <button class="btn btn-secondary" id="btn-cancel-req2">Cancelar</button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderItemRow(idx, categories, materials, item) {
  const cats = categories;
  const selCat = item ? item.category : cats[0];
  const matsForCat = materials.filter(m => m.category===selCat);
  return `
  <div class="item-row" id="item-${idx}" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap">
    <div style="width:22px;height:22px;border-radius:50%;background:var(--accent);color:#0F172A;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:10px">${idx+1}</div>
    <select class="select item-cat" data-idx="${idx}" style="flex:0 0 170px">
      ${cats.map(c => `<option ${c===selCat?'selected':''}>${c}</option>`).join('')}
    </select>
    <select class="select item-mat" data-idx="${idx}" style="flex:1;min-width:180px">
      ${matsForCat.map(m => `<option value="${m.id}" data-unit="${m.defaultUnit}" ${item&&item.matId===m.id?'selected':''}>${m.name}</option>`).join('')}
    </select>
    <input class="input item-qty" data-idx="${idx}" type="number" placeholder="Qtd" min="1" value="${item?item.qty:''}" style="flex:0 0 70px" />
    <select class="select item-unit" data-idx="${idx}" style="flex:0 0 72px">
      ${UNITS.map(u => `<option ${item&&item.unit===u?'selected':''}>${u}</option>`).join('')}
    </select>
    <!-- Bitola and Color selector for cabling materials -->
    <select class="select item-bitola" data-idx="${idx}" style="flex:0 0 90px; display:${selCat==='Cabeamento'?'block':'none'}">
      <option value="">Bitola...</option>
      ${['1,5mm²','2,5mm²','4,0mm²','6,0mm²','10mm²','16mm²','25mm²','35mm²','50mm²'].map(b => `<option ${item&&item.bitola===b?'selected':''}>${b}</option>`).join('')}
    </select>
    <select class="select item-color" data-idx="${idx}" style="flex:0 0 80px; display:${selCat==='Cabeamento'?'block':'none'}">
      <option value="">Cor...</option>
      ${['Azul','Verde','Preto','Amarelo','Vermelho'].map(col => `<option ${item&&item.color===col?'selected':''}>${col}</option>`).join('')}
    </select>
    <input class="input item-obs" data-idx="${idx}" placeholder="Obs. (opcional)" value="${item?item.obs:''}" style="flex:0 0 150px" />
    <button class="btn btn-danger btn-sm remove-item" data-idx="${idx}" style="flex-shrink:0;margin-top:2px">×</button>
  </div>`;
}

function renderDashboard(reqs) {
  const byS = s => reqs.filter(r => r.status===s).length;
  const done = reqs.filter(r => r.createdAt && r.deliveredAt);
  const avgDays = done.length ? Math.round(done.reduce((a,r) => a+(new Date(r.deliveredAt)-new Date(r.createdAt))/86400000,0)/done.length) : 0;
  const obras = [...new Set(reqs.map(r => r.obra))].sort();
  const barData = Object.entries(STATUS).map(([k,v]) => ({k,v,count:byS(k)}));
  const maxBar = Math.max(...barData.map(d => d.count),1);
  const recent = [...reqs].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,6);

  // OS totals for gestão role
  const osTotals = {};
  reqs.forEach(r => {
    if (!r.osNumber) return;
    const totalQty = r.items.reduce((sum,it) => sum + (it.qty||0),0);
    osTotals[r.osNumber] = (osTotals[r.osNumber]||0) + totalQty;
  });
  const osRows = Object.entries(osTotals).map(([os,qty]) => `
    <tr>
      <td class="font-mono">${os}</td>
      <td class="fw-bold">${qty}</td>
    </tr>`).join('');

  return `
  <div id="dashboard-view">
    <div class="toolbar" style="margin-bottom:16px">
      <span style="font-size:13px;font-weight:600;color:var(--text-muted)">Filtrar por obra:</span>
      <button class="obra-tag active" data-obra="">🌐 Todas</button>
      ${obras.map(o => `<button class="obra-tag" data-obra="${o}">🏗 ${o}</button>`).join('')}
      <button class="btn btn-secondary btn-sm" id="btn-export-dash" style="margin-left:auto">📊 Exportar</button>
    </div>
    <div class="kpi-grid">
      ${[
        {icon:'📋',label:'Total de Requisições',value:reqs.length,color:'#1B4FD8'},
        {icon:'⏳',label:'Aguardando Aprovação',value:byS('pendente'),color:'#F59E0B'},
        {icon:'🔍',label:'Em Cotação',value:byS('cotacao'),color:'#8B5CF6'},
        {icon:'📦',label:'Pedido Efetuado',value:byS('pedido'),color:'#06B6D4'},
        {icon:'🎯',label:'Entregues',value:byS('entregue'),color:'#10B981'},
        {icon:'❌',label:'Rejeitadas',value:byS('rejeitado'),color:'#EF4444'},
        {icon:'⏱',label:'Prazo Médio (dias)',value:avgDays,color:'#64748B'},
      ].map(k => `
        <div class="kpi-card" style="border-top-color:${k.color}">
          <div class="kpi-icon">${k.icon}</div>
          <div class="kpi-value" style="color:${k.color}">${k.value}</div>
          <div class="kpi-label">${k.label}</div>
        </div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;flex-wrap:wrap">
      <div class="chart-card">
        <div class="chart-title">Requisições por Status</div>
        <div class="bar-chart">
          ${barData.map(d => `
            <div class="bar-col">
              <div class="bar-value">${d.count}</div>
              <div class="bar-fill" style="height:${Math.max(d.count/maxBar*100,4)}px;background:${d.v.color}"></div>
              <div class="bar-label">${d.v.icon}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Por Obra</div>
        ${obras.map(o => {
          const t = reqs.filter(r => r.obra===o).length;
          return `<div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
              <span class="fw-bold">${o}</span><span class="text-muted">${t} req.</span>
            </div>
            <div style="height:6px;background:#F1F5F9;border-radius:3px">
              <div style="height:6px;border-radius:3px;background:var(--primary);width:${Math.max(t/reqs.length*100,0)}%"></div>
            </div>
          </div>`;}).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">📋 Requisições Recentes</div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Obra</th><th>OS</th><th>Solicitante</th><th>Status</th><th>Prazo</th></tr></thead>
          <tbody>
            ${recent.map(r => `
              <tr style="cursor:pointer" class="dash-req-row" data-req-id="${r.id}">
                <td class="font-mono fw-bold">${r.id}</td>
                <td>${r.obra}</td>
                <td style="color:var(--text-muted);font-size:12px">${r.osNumber||'—'}</td>
                <td>${getUserById(r.userId).name}</td>
                <td>${renderStatusBadge(r.status)}</td>
                <td style="color:${new Date(r.deadline) < new Date() && r.status!=='entregue' ? 'var(--danger)' : 'inherit'}">${fmtDate(r.deadline)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    ${state.user && state.user.role==="gestao" ? `
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📊 Total de Quantidade por OS</div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>OS</th><th>Quantidade Total</th></tr></thead>
          <tbody>${osRows}</tbody>
        </table>
      </div>
    </div>` : ''}
  </div>`;
}

function renderMaterialsAdmin(user) {
  const materials = getMaterials();
  const categories = [...new Set(materials.map(m=>m.category))].sort();
  return `
  <div id="materials-view">
    <div class="toolbar" style="margin-bottom:16px">
      <button class="btn btn-secondary btn-sm" id="btn-back-materials">← Voltar</button>
      <button class="btn btn-primary" id="btn-open-add-material">+ Novo Material</button>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">📦 Catálogo de Materiais</div><span class="text-muted" style="font-size:12px">${materials.length} materiais cadastrados</span></div>
      <div class="card-body">
        ${categories.map(cat=>`
          <div style="margin-bottom:18px">
            <div style="font-weight:800;font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">${cat}</div>
            ${materials.filter(m=>m.category===cat).map(m=>`
              <div class="material-row ${m.active?'':'material-inactive'}">
                <div style="flex:1;font-size:13px;font-weight:500">${m.name}</div>
                <span class="badge" style="background:#F8FAFC;color:var(--text-muted);border-color:var(--border)">${m.defaultUnit}</span>
                <span class="badge" style="background:${m.active?'#ECFDF5':'#FEF2F2'};color:${m.active?'#10B981':'#EF4444'};border-color:${m.active?'#A7F3D0':'#FECACA'}">${m.active?'Ativo':'Inativo'}</span>
                <button class="btn btn-secondary btn-sm mat-toggle" data-mat-id="${m.id}">${m.active?'Desativar':'Ativar'}</button>
                ${user.role!=='obra'?`<button class="btn btn-danger btn-sm mat-delete" data-mat-id="${m.id}">🗑</button>`:''}
              </div>`).join('')}
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function renderAddMaterialModal() {
  const categories = [...new Set(getMaterials().map(m=>m.category))].sort();
  return `
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">+ Novo Material</div>
      <button class="modal-close" id="modal-close">×</button>
    </div>
    <div class="modal-body">
      <div class="form-row" style="margin-bottom:12px">
        <div>
          <label class="field-label">Categoria *</label>
          <div style="display:flex;gap:8px">
            <select id="mat-cat-select" class="select" style="flex:1">
              ${categories.map(c=>`<option>${c}</option>`).join('')}
              <option value="__new__">+ Nova categoria...</option>
            </select>
          </div>
          <input id="mat-cat-new" class="input hidden" placeholder="Nome da nova categoria" style="margin-top:6px" />
        </div>
      </div>
      <div class="form-row" style="margin-bottom:12px">
        <div>
          <label class="field-label">Nome do Material *</label>
          <input id="mat-name" class="input" placeholder="Ex: Cabo Flexível 6mm² Preto" />
        </div>
      </div>
      <div class="form-row">
        <div>
          <label class="field-label">Unidade padrão</label>
          <select id="mat-unit" class="select">
            ${UNITS.map(u=>`<option>${u}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-close2">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-material">Salvar Material</button>
    </div>
  </div>`;
}
