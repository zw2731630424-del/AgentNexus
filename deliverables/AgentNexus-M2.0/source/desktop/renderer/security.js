const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let draft, revision = -1, pending;
export function securityPage(data) {
  const s = data.security;
  if (!s) return '<h1>Security Center</h1><p>此历史测试入口没有启用 Adaptive Security。</p>';
  if (!draft || revision !== s.revision) { draft = structuredClone(s.desired); revision = s.revision; }
  const groups = [...new Set(s.features.map(f => f.group))];
  const select = (name, current) => `<select data-security-level="${name}" aria-label="${name} Enforcement">${['OFF','ADVISORY','ENFORCED'].map(level => `<option${level === current ? ' selected' : ''}>${level}</option>`).join('')}</select>`;
  return `<div class="page-title"><div><div class="eyebrow">SETTINGS</div><h1>Security Center</h1><div class="subtitle">后端运行状态 · Profile v1 · revision ${s.revision}</div></div><button data-action="refresh">Refresh Status</button></div>
    <div class="panel security-overview"><div class="eyebrow">SECURITY PROFILE</div><h2>${esc(s.active.mode === 'LOCAL_DEVELOPMENT_MODE' ? 'Local Development Mode' : 'Hardened Deployment Mode')}</h2><p>${esc(s.active.mode === 'LOCAL_DEVELOPMENT_MODE' ? '个人开发：无需 TPM、签名设备、CMS 或独立 Credential Service。' : '复用既有隔离与资格合同；未验证的条件持续阻断。')}</p><div class="security-modes"><button data-action="security-mode" data-mode="LOCAL_DEVELOPMENT_MODE">Local Development</button><button data-action="security-mode" data-mode="HARDENED_DEPLOYMENT_MODE">Hardened Deployment</button><span class="tag amber">${esc(s.qualification)}</span></div><p class="muted">Local 凭证由当前用户 OS 存储保护静态数据。同 SID 恶意进程与管理员恶意进程不在本地模式隔离承诺内。</p>${s.pendingRestart ? '<p class="notice" role="status">配置已保存，等待重启 Host 生效。当前显示的状态仍来自活动 Profile。</p>' : ''}</div>
    <div class="panel security-levels"><label>Policy Enforcement${select('policy', draft.policy.enforcement)}</label><label>Data Egress Enforcement${select('egress', draft.dataEgress.enforcement)}</label><p class="muted">OFF：不强制执行。ADVISORY：计算风险并提示。ENFORCED：程序阻断不符合条件的操作。</p></div>
    ${groups.map(group => `<section class="panel security-group"><h2>${esc(group)}</h2>${s.features.filter(f => f.group === group).map(f => `<div class="security-feature" data-security-row="${esc(f.id)}"><div><strong>${esc(f.name)}</strong><div class="muted">${esc(f.reason)}${f.dependencies.length ? '<br>依赖：' + esc(f.dependencies.join(', ')) : ''}${f.restart ? ' · 变更需重启' : ''}</div></div><span class="tag ${f.status === 'ENABLED' ? 'purple' : 'amber'}" data-security-status="${esc(f.id)}">${esc(f.status)}</span><label class="security-switch"><input type="checkbox" data-security-feature="${esc(f.id)}" aria-label="${esc(f.name)}"${draft.features[f.id] ? ' checked' : ''}${f.toggleable ? '' : ' disabled'}><span>${f.toggleable ? '配置' : '固定边界'}</span></label></div>`).join('')}</section>`).join('')}
    <div class="panel"><h2>Budget Limits</h2><div class="form-grid">${Object.entries(draft.budgets).map(([id,n]) => `<label class="field">${esc(id)}<input type="number" min="1" step="1" value="${n}" data-security-budget="${id}" aria-label="${id}"></label>`).join('')}</div><p class="muted">所有 Key 共用账本。关闭费用展示或预算限制不会删除实际记录；原始 100,000,000 Token 授权不会自动扩展。</p></div>
    <div class="panel security-actions"><button class="primary" data-action="security-review">Review Changes</button><button data-action="security-reset">Restore Defaults</button><button data-action="security-export">Export Profile</button><button data-action="security-import">Import Profile</button></div>
    <div class="panel"><h2>Recent Security Audit</h2><p class="muted">必需的配置审计与运行恢复日志持续保留；可选的操作审计受独立开关控制。</p>${s.audit.slice(0,8).map(a => `<div class="security-audit"><code>${esc(a.at)}</code><strong>${esc(a.kind)}</strong><span>${esc(a.actor)}</span></div>`).join('')}</div>`;
}
export function securityChange(el) {
  if (!draft) return;
  if (el.dataset.securityFeature) {
    const id = el.dataset.securityFeature; draft.features[id] = el.checked;
    if (id === 'policy.enforcement') draft.policy.enforcement = el.checked ? 'ENFORCED' : 'OFF';
    if (id === 'policy.engine' && !el.checked) { draft.features['policy.enforcement'] = false; draft.policy.enforcement = 'OFF'; }
    if (id === 'policy.approval' || id === 'execution.fileWriteApproval') { draft.features['policy.approval'] = el.checked; draft.features['execution.fileWriteApproval'] = el.checked; }
    if (id === 'data.egress') { draft.dataEgress.enforcement = el.checked ? 'ENFORCED' : 'OFF'; if (el.checked) draft.features['data.classification'] = true; }
    if (id === 'data.classification' && !el.checked) { draft.features['data.egress'] = false; draft.dataEgress.enforcement = 'OFF'; }
  }
  if (el.dataset.securityLevel === 'policy') { draft.policy.enforcement = el.value; draft.features['policy.enforcement'] = el.value !== 'OFF'; if (el.value !== 'OFF') draft.features['policy.engine'] = true; }
  if (el.dataset.securityLevel === 'egress') { draft.dataEgress.enforcement = el.value; draft.features['data.egress'] = el.value !== 'OFF'; if (el.value !== 'OFF') draft.features['data.classification'] = true; }
  if (el.dataset.securityBudget) draft.budgets[el.dataset.securityBudget] = Number(el.value);
  if (el.id === 'security-ack') document.querySelector('[data-action="security-confirm"]').disabled = !el.checked;
}
function planDialog(plan, dialog) {
  pending = plan;
  dialog('Review Security Change', '仅在本次配置变化时确认。此计划由后端生成。', `<div class="security-plan"><p><strong>${esc(plan.from.mode)} → ${esc(plan.to.mode)}</strong></p><p>需重启：${plan.restart ? '是' : '否'} · 需重新授权/验证：${plan.reauthorization ? '是' : '否'}</p><h3>影响功能</h3><p>${esc(plan.changed.join(', '))}</p><h3>影响 Agent 与工具</h3><p>${esc(plan.affected.join(', '))}</p><h3>风险与安全边界</h3><ul>${plan.risks.map(r => `<li>${esc(r)}</li>`).join('')}</ul><h3>依赖与资格</h3><p>${esc(plan.incompatible.join(', ') || '当前依赖均可解析；不会声明未运行的生产资格通过。')}</p><label class="checkbox"><input type="checkbox" id="security-ack">我已了解本次变化、风险与生效时机</label></div>`, '<button data-action="close-modal">Cancel</button><button class="primary" data-action="security-confirm" disabled>Apply Security Change</button>');
}
export async function securityAction(action, button, { data, api, dialog, closeModal, refresh, toast }) {
  if (action === 'security-review') planDialog(await api('security.preview', { profile: draft, revision: data.security.revision }), dialog);
  else if (action === 'security-mode' || action === 'security-reset') planDialog(await api('security.reset', { mode: button.dataset.mode ?? data.security.desired.mode, revision: data.security.revision }), dialog);
  else if (action === 'security-confirm') { if (!document.querySelector('#security-ack')?.checked || !pending) return; button.disabled = true; await api('security.commit', { id: pending.id, hash: pending.hash, confirmation: 'APPLY_SECURITY_CHANGE' }); pending = null; draft = null; closeModal(); await refresh(); toast('安全配置与变更审计已保存。'); }
  else if (action === 'security-export') { const result = await api('security.export'); dialog('Export Security Profile', '仅含配置，不含 Key、账本或历史部署证据。复制 JSON 可保存为配置文件。', `<textarea class="security-json" aria-label="Exported Profile" readonly>${esc(JSON.stringify(result.securityProfile, null, 2))}</textarea>`, '<button data-action="close-modal">Close</button>'); }
  else if (action === 'security-import') dialog('Import Security Profile', '导入后先检查 Schema、迁移和依赖，确认影响计划后才应用。', '<textarea class="security-json" id="security-import-json" aria-label="Imported Profile" placeholder="粘贴导出的 Security Profile JSON"></textarea>', '<button data-action="close-modal">Cancel</button><button class="primary" data-action="security-import-review">Review Import</button>');
  else if (action === 'security-import-review') { const text = document.querySelector('#security-import-json').value; if (text.length > 65536) throw Error('SECURITY_PROFILE_SIZE'); const parsed = JSON.parse(text); planDialog(await api('security.import', { profile: parsed.securityProfile ?? parsed, revision: data.security.revision }), dialog); }
}
