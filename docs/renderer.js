const fs = require('fs');
const path = require('path');

// Read the JSON source of truth
const jsonPath = '/Users/arunnark/.quickwork/profiles/enterprise-27689cf04f4c/sessions/a224e8bb-2d7b-4318-886e-77e34f2371b2/workspace/attached_files/claude-aws-guide.json';
const outputPath = '/Users/arunnark/.quickwork/profiles/enterprise-27689cf04f4c/sessions/a224e8bb-2d7b-4318-886e-77e34f2371b2/workspace/artifacts/Claude_on_AWS_-_Deployment_Guide.html';

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// ==================== CSS ====================
const CSS = `
:root {
  --color-bg: #ffffff;
  --color-surface: #ffffff;
  --color-surface-hover: #f9fafb;
  --color-surface-active: #f3f4f6;
  --color-text: #111827;
  --color-text-secondary: #4b5563;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-border-light: #f3f4f6;
  --color-primary: #6366f1;
  --color-warning: #f59e0b;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
  background: var(--color-bg); 
  color: var(--color-text);
  min-height: 100vh;
}
body.dark {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-surface-hover: #334155;
  --color-text: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-border: #334155;
  --color-border-light: #1e293b;
  --color-primary: #818cf8;
  --color-warning: #f59e0b;
}
body.dark .info-callout { background: #1e293b; border-color: #334155; color: #93c5fd; }
body.dark .info-callout.success { background: #022c22; border-color: #065f46; color: #6ee7b7; }
body.dark .option-card { background: #1e293b; border-color: #334155; }
body.dark .placeholder-card, body.dark .placeholder-box { background: #1e293b; border-color: #334155; }
body.dark a { color: var(--color-primary); }

.header { background: var(--color-surface); border-bottom: 1px solid var(--color-border-light); padding: 20px 24px 0; }
.header h1 { font-size: 20px; font-weight: 600; color: var(--color-text); margin-bottom: 6px; }
.header > p { font-size: 13px; color: var(--color-text-muted); margin-bottom: 16px; }

.main-tabs { display: flex; gap: 0; }
.main-tab { padding: 10px 20px; font-size: 13px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; border: 1px solid transparent; border-bottom: none; border-radius: 8px 8px 0 0; background: transparent; transition: all 0.15s ease; display: flex; align-items: center; gap: 8px; }
.main-tab:hover { background: var(--color-surface-hover); color: var(--color-text); }
.main-tab.active { background: var(--color-bg); color: var(--color-primary); border-color: var(--color-border-light); border-bottom-color: var(--color-bg); margin-bottom: -1px; font-weight: 600; }

.subtab-bar { display: flex; gap: 4px; padding: 12px 24px; background: var(--color-bg); border-bottom: 1px solid var(--color-border-light); }
.subtab { padding: 6px 14px; font-size: 12px; font-weight: 500; color: var(--color-text-muted); cursor: pointer; border-radius: 6px; background: transparent; border: none; transition: all 0.15s ease; }
.subtab:hover { background: var(--color-surface-hover); color: var(--color-text); }
.subtab.active { background: var(--color-primary); color: #ffffff; }

.content-area { padding: 24px; max-width: none; margin: 0; }

.option-card { background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: 12px; padding: 24px; margin-bottom: 16px; transition: border-color 0.15s ease; }
.option-card:hover { border-color: var(--color-primary); }
.option-card h3 { font-size: 15px; font-weight: 600; color: var(--color-text); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.option-card h3 .card-number { background: var(--color-primary); color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.option-card ul { list-style: none; padding: 0; }
.option-card li { font-size: 13px; color: var(--color-text-secondary); padding: 6px 0 6px 20px; position: relative; line-height: 1.5; }
.option-card li::before { content: "→"; position: absolute; left: 0; color: var(--color-primary); font-weight: 600; }

.section-heading { margin-bottom: 24px; }
.section-heading h2 { font-size: 22px; font-weight: 700; color: var(--color-text); margin-bottom: 8px; }
.section-heading p { font-size: 14px; color: var(--color-text-secondary); line-height: 1.5; }

.nav-buttons { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--color-border-light); }
.nav-btn { padding: 10px 18px; font-size: 13px; font-weight: 500; border-radius: 8px; cursor: pointer; border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text-secondary); transition: all 0.15s ease; display: flex; align-items: center; gap: 6px; }
.nav-btn:hover { background: var(--color-primary); color: #ffffff; border-color: var(--color-primary); }
.nav-btn.hidden { visibility: hidden; }

.info-callout { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #1e40af; margin-top: 16px; line-height: 1.5; }
.info-callout.warning { background: #fffbeb; border-color: #fde68a; color: #92400e; }
.info-callout.success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }

.placeholder-box { background: var(--color-surface); border: 2px dashed var(--color-border); border-radius: 12px; padding: 48px 24px; text-align: center; color: var(--color-text-muted); }
.placeholder-box h3 { font-size: 16px; margin-bottom: 8px; color: var(--color-text-secondary); }
.placeholder-box p { font-size: 13px; }

.hero { text-align: center; padding: 40px 0 32px; }
.hero h2 { font-size: 24px; font-weight: 700; color: var(--color-text); margin-bottom: 12px; }
.hero p { font-size: 15px; color: var(--color-text-secondary); max-width: 600px; margin: 0 auto; line-height: 1.6; }
.placeholder-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 24px; }
.placeholder-card { background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: 12px; padding: 24px; text-align: center; color: var(--color-text-muted); font-size: 13px; }

.guided-layout { display: grid; grid-template-columns: 220px 1fr; gap: 32px; min-height: 400px; }
.step-sidebar { border-right: 1px solid var(--color-border-light); padding-right: 20px; }
.step-sidebar-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.15s ease; margin-bottom: 4px; }
.step-sidebar-item:hover { background: var(--color-surface-hover); }
.step-sidebar-item.active { background: var(--color-surface); border: 1px solid var(--color-primary); }
.step-number { width: 24px; height: 24px; border-radius: 50%; background: var(--color-border); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.step-sidebar-item.active .step-number { background: var(--color-primary); }
.step-sidebar-label { font-size: 12px; font-weight: 500; color: var(--color-text-secondary); line-height: 1.4; }
.step-sidebar-item.active .step-sidebar-label { color: var(--color-primary); font-weight: 600; }
.step-content { padding: 4px 0; }
.step-content h3 { font-size: 18px; font-weight: 600; color: var(--color-text); margin-bottom: 12px; }
.step-content p { font-size: 14px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px; }
.step-content .step-detail-list { list-style: none; padding: 0; }
.step-content .step-detail-list li { font-size: 13px; color: var(--color-text-secondary); padding: 8px 0 8px 24px; position: relative; line-height: 1.5; border-bottom: 1px solid var(--color-border-light); }
.step-content .step-detail-list li::before { content: ""; position: absolute; left: 0; top: 14px; width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary); opacity: 0.5; }
.step-nav-buttons { display: flex; justify-content: space-between; margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--color-border-light); }

.bedrock-layout { display: grid; grid-template-columns: 200px 1fr; gap: 0; min-height: 500px; margin: -24px; }
.bedrock-content { padding: 24px 32px; }
.bedrock-left-nav { border-right: 1px solid var(--color-border-light); padding: 24px 0; position: sticky; top: 0; align-self: start; background: var(--color-surface); min-height: calc(100vh - 140px); }
.bedrock-nav-item { display: block; padding: 8px 16px; font-size: 12px; font-weight: 500; color: var(--color-text-muted); cursor: pointer; border-radius: 0; border-left: 3px solid transparent; transition: all 0.15s ease; }
.bedrock-nav-item:hover { background: var(--color-surface-hover); color: var(--color-text); border-left-color: var(--color-border); }
.bedrock-nav-item.active { color: var(--color-primary); border-left-color: var(--color-primary); background: var(--color-surface-hover); font-weight: 600; }

.bedrock-section h2 { font-size: 20px; font-weight: 700; color: var(--color-text); margin-bottom: 8px; }
.bedrock-section > p { font-size: 14px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px; }
.bedrock-section h3 { font-size: 14px; font-weight: 600; color: var(--color-text); margin-top: 20px; margin-bottom: 10px; }
.bedrock-section .step-detail-list { list-style: none; padding: 0; margin-bottom: 16px; }
.bedrock-section .step-detail-list li { font-size: 13px; color: var(--color-text-secondary); padding: 8px 0 8px 24px; position: relative; line-height: 1.5; border-bottom: 1px solid var(--color-border-light); }
.bedrock-section .step-detail-list li::before { content: ""; position: absolute; left: 0; top: 14px; width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary); opacity: 0.5; }
.bedrock-section .step-detail-list li strong { color: var(--color-text); font-weight: 600; }

.bedrock-section .code-block-wrapper { position: relative; margin: 12px 0 16px; border-radius: 8px; overflow: hidden; border: 1px solid var(--color-border-light); }
.bedrock-section .code-block-wrapper pre { background: #1e293b; color: #e2e8f0; padding: 16px 20px; font-size: 12px; line-height: 1.6; overflow-x: auto; margin: 0; font-family: 'SF Mono', 'Fira Code', monospace; }
.bedrock-section .code-block-wrapper pre code, .code-block-wrapper pre code { color: inherit; }
.bedrock-section .code-block-wrapper .copy-btn { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #94a3b8; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; transition: all 0.15s; }
.bedrock-section .code-block-wrapper .copy-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }

.bedrock-content-panel { padding: 24px 40px; max-width: 100%; }
.code-block-wrapper { position: relative; margin-top: 12px; border-radius: 8px; overflow: hidden; border: 1px solid var(--color-border-light); }
.code-block-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: #1e293b; font-size: 11px; color: #94a3b8; }
.code-block-header .lang-label { font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
.copy-btn { background: transparent; border: 1px solid #475569; color: #94a3b8; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; transition: all 0.15s; }
.copy-btn:hover { background: #475569; color: #e2e8f0; }
.copy-btn.copied { background: #10b981; border-color: #10b981; color: #fff; }
.code-block-body { background: #0f172a; padding: 16px; overflow-x: auto; max-height: 300px; overflow-y: auto; }
.code-block-body pre { margin: 0; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; line-height: 1.5; color: #e2e8f0; white-space: pre; }

.substep { border: 1px solid var(--color-border-light); border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
.substep-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; cursor: pointer; transition: background 0.15s; }
.substep-header:hover { background: var(--color-surface-hover); }
.substep-header .chevron { color: var(--color-text-muted); font-size: 10px; transition: transform 0.2s; }
.substep.open .substep-header .chevron { transform: rotate(90deg); }
.substep-title { font-size: 13px; font-weight: 600; color: var(--color-text); flex: 1; }
.substep-owner { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 4px; background: #dbeafe; color: #1d4ed8; }
.substep-owner.identity { background: #fae8ff; color: #7e22ce; }
.substep-body { display: none; padding: 0 16px 16px; }
.substep.open .substep-body { display: block; }
.substep-body ul { list-style: none; padding: 0; }
.substep-body li { font-size: 13px; color: var(--color-text-secondary); padding: 6px 0 6px 20px; position: relative; line-height: 1.5; }
.substep-body li::before { content: "→"; position: absolute; left: 0; color: var(--color-primary); font-weight: 600; }

.code-collapsible { margin-top: 8px; }
.code-collapsible-toggle { display: flex; align-items: center; gap: 6px; padding: 6px 10px; font-size: 11px; font-weight: 500; color: var(--color-text-muted); cursor: pointer; border: none; background: none; }
.code-collapsible-toggle:hover { color: var(--color-primary); }
.code-collapsible-toggle .chevron { transition: transform 0.2s ease; }
.code-collapsible.open .code-collapsible-toggle .chevron { transform: rotate(90deg); }
.code-collapsible .code-block-wrapper { display: none; }
.code-collapsible.open .code-block-wrapper { display: block; }

.theme-toggle { position: fixed; top: 12px; right: 16px; z-index: 100; padding: 6px 12px; font-size: 12px; border-radius: 6px; border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text-muted); cursor: pointer; }
.theme-toggle:hover { background: var(--color-surface-hover); }

table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
table th { text-align: left; padding: 8px 12px; color: var(--color-text-muted); border-bottom: 2px solid var(--color-border); }
table td { padding: 8px 12px; border-bottom: 1px solid var(--color-border-light); color: var(--color-text-secondary); }
`;

// ==================== HELPERS ====================
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInlineFormatting(text) {
  // Convert **bold** to <strong>
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Convert `code` to <code>
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Convert *italic* to <em>
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  // Convert [text](url) to <a>
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--color-primary);">$1</a>');
  return text;
}

function renderList(items, className) {
  if (!items || !items.length) return '';
  const cls = className || 'step-detail-list';
  return '<ul class="' + cls + '">' + items.map(item => '<li>' + renderInlineFormatting(item) + '</li>').join('') + '</ul>';
}

function renderCallout(callout) {
  const type = callout.type || 'info';
  return '<div class="info-callout ' + type + '">' + renderInlineFormatting(callout.text) + '</div>';
}

function renderCodeBlock(code) {
  const lang = code.language || 'text';
  return '<div class="code-collapsible" onclick="toggleCode(this); event.stopPropagation();"><button class="code-collapsible-toggle"><span class="chevron">▶</span> View ' + lang.toUpperCase() + '</button><div class="code-block-wrapper" onclick="event.stopPropagation()"><div class="code-block-header"><span class="lang-label">' + lang.toUpperCase() + '</span><button class="copy-btn" onclick="copyCode(this); event.stopPropagation();">⧉ Copy</button></div><div class="code-block-body"><pre>' + escapeHtml(code.content) + '</pre></div></div></div>';
}

function renderTable(table) {
  let html = '<div style="overflow-x: auto; margin-top: 16px;"><table>';
  if (table.headers && table.headers.length) {
    html += '<thead><tr>' + table.headers.map(h => '<th>' + h + '</th>').join('') + '</tr></thead>';
  }
  if (table.rows && table.rows.length) {
    html += '<tbody>' + table.rows.map(row => '<tr>' + row.map(cell => '<td>' + renderInlineFormatting(cell) + '</td>').join('') + '</tr>').join('') + '</tbody>';
  }
  html += '</table></div>';
  return html;
}

function renderSubsteps(substeps) {
  return substeps.map((sub, i) => {
    const ownerClass = (sub.owner && sub.owner.toLowerCase().includes('identity')) ? ' identity' : '';
    let html = '<div class="substep' + (i === 0 ? ' open' : '') + '" onclick="this.classList.toggle(\x27open\x27)">';
    html += '<div class="substep-header"><span class="chevron">▶</span><span class="substep-title">' + escapeHtml(sub.title) + '</span>';
    if (sub.owner) {
      html += '<span class="substep-owner' + ownerClass + '">' + escapeHtml(sub.owner) + '</span>';
    }
    html += '</div><div class="substep-body">';
    if (sub.items && sub.items.length) {
      html += '<ul>' + sub.items.map(item => '<li>' + renderInlineFormatting(item) + '</li>').join('') + '</ul>';
    }
    if (sub.code) {
      html += renderCodeBlock(sub.code);
    }
    html += '</div></div>';
    return html;
  }).join('');
}

// ==================== LAYOUT RENDERERS ====================

function renderChecklist(content) {
  let html = '<div class="section-heading"><h2>' + escapeHtml(content.heading) + '</h2><p>' + renderInlineFormatting(content.description) + '</p></div>';
  if (content.options) {
    content.options.forEach((opt, i) => {
      html += '<div class="option-card"><h3><span class="card-number">' + (i + 1) + '</span> ' + escapeHtml(opt.title) + '</h3>';
      html += renderList(opt.items, '');
      html += '</div>';
    });
  }
  if (content.callout) {
    html += renderCallout(content.callout);
  }
  return html;
}

function renderGuidedSteps(content, prefix) {
  const steps = content.steps || [];
  let sidebarHtml = '<div class="step-sidebar" id="' + prefix + '-sidebar">';
  steps.forEach((step, i) => {
    sidebarHtml += '<div class="step-sidebar-item' + (i === 0 ? ' active' : '') + '" data-step="' + step.id + '" onclick="showStep(\x27' + prefix + '\x27, \x27' + step.id + '\x27)"><span class="step-number">' + i + '</span><span class="step-sidebar-label">' + escapeHtml(step.title) + '</span></div>';
  });
  sidebarHtml += '</div>';

  let contentHtml = '<div class="step-content-area">';
  steps.forEach((step, i) => {
    contentHtml += '<div class="step-content" id="' + step.id + '"' + (i > 0 ? ' style="display:none"' : '') + '>';
    contentHtml += '<h3>' + escapeHtml(step.title) + '</h3>';
    if (step.description) contentHtml += '<p>' + renderInlineFormatting(step.description) + '</p>';
    if (step.items && step.items.length) contentHtml += renderList(step.items);
    if (step.callouts) step.callouts.forEach(c => { contentHtml += renderCallout(c); });
    if (step.subsections) {
      step.subsections.forEach(sub => {
        contentHtml += '<h4 style="font-size:14px;font-weight:600;color:var(--color-text);margin-top:24px;margin-bottom:12px;">' + escapeHtml(sub.title) + '</h4>';
        if (sub.description) contentHtml += '<p style="font-size:13px;color:var(--color-text-secondary);margin-bottom:12px;">' + renderInlineFormatting(sub.description) + '</p>';
        if (sub.items && sub.items.length) contentHtml += renderList(sub.items);
      });
    }
    if (step.substeps && step.substeps.length) contentHtml += renderSubsteps(step.substeps);
    if (step.code_blocks) step.code_blocks.forEach(cb => { contentHtml += renderCodeBlock(cb); });
    if (step.table) contentHtml += renderTable(step.table);
    // Nav buttons
    contentHtml += '<div class="step-nav-buttons">';
    if (i > 0) contentHtml += '<button class="nav-btn" onclick="showStep(\x27' + prefix + '\x27, \x27' + steps[i-1].id + '\x27)">← ' + escapeHtml(steps[i-1].title) + '</button>';
    else contentHtml += '<button class="nav-btn hidden">← Previous</button>';
    if (i < steps.length - 1) contentHtml += '<button class="nav-btn" onclick="showStep(\x27' + prefix + '\x27, \x27' + steps[i+1].id + '\x27)">Next: ' + escapeHtml(steps[i+1].title) + ' →</button>';
    else contentHtml += '<button class="nav-btn hidden">Next →</button>';
    contentHtml += '</div>';
    contentHtml += '</div>';
  });
  contentHtml += '</div>';

  return '<div class="section-heading"><h2>' + escapeHtml(content.heading) + '</h2><p>' + renderInlineFormatting(content.description) + '</p></div><div class="guided-layout">' + sidebarHtml + contentHtml + '</div>';
}

function renderLeftNav(content, navId) {
  const sections = content.sections || [];
  let navHtml = '<div class="bedrock-left-nav" id="' + navId + '">';
  sections.forEach((sec, i) => {
    navHtml += '<div class="bedrock-nav-item' + (i === 0 ? ' active' : '') + '" data-sec="' + sec.id + '" onclick="showLeftNavSection(\x27' + navId + '\x27, \x27' + sec.id + '\x27)">' + escapeHtml(sec.label) + '</div>';
  });
  navHtml += '</div>';

  let contentHtml = '<div class="bedrock-content">';
  sections.forEach((sec, i) => {
    contentHtml += '<div class="bedrock-section" id="' + navId + '-' + sec.id + '"' + (i > 0 ? ' style="display:none"' : '') + '>';
    contentHtml += '<h2>' + escapeHtml(sec.heading) + '</h2>';
    if (sec.description) contentHtml += '<p>' + renderInlineFormatting(sec.description) + '</p>';
    if (sec.stakeholder) contentHtml += '<div class="info-callout" style="margin-bottom:16px"><strong>Stakeholder:</strong> ' + escapeHtml(sec.stakeholder) + '</div>';
    if (sec.callouts) sec.callouts.forEach(c => { contentHtml += renderCallout(c); });
    if (sec.items && sec.items.length) contentHtml += renderList(sec.items);
    if (sec.subsections) {
      sec.subsections.forEach(sub => {
        contentHtml += '<h3>' + escapeHtml(sub.title) + '</h3>';
        if (sub.description) contentHtml += '<p style="font-size:13px;color:var(--color-text-secondary);margin-bottom:12px;">' + renderInlineFormatting(sub.description) + '</p>';
        if (sub.items && sub.items.length) contentHtml += renderList(sub.items);
        if (sub.code) {
          contentHtml += '<div class="code-block-wrapper"><pre><code>' + escapeHtml(sub.code.content) + '</code></pre><button class="copy-btn" onclick="copyCode(this)">⧉ Copy</button></div>';
        }
      });
    }
    if (sec.substeps && sec.substeps.length) contentHtml += renderSubsteps(sec.substeps);
    if (sec.layout === 'guided-steps' && sec.steps) {
      contentHtml += renderGuidedSteps({heading: '', description: '', steps: sec.steps}, navId + '-' + sec.id);
    }
    if (sec.content) {
      sec.content.forEach(block => {
        if (block.type === 'cards') {
          block.items.forEach(card => {
            contentHtml += '<div class="option-card"><h3><span class="card-number">' + (card.icon || '') + '</span> ' + escapeHtml(card.title) + '</h3>';
            if (card.items) contentHtml += renderList(card.items, '');
            contentHtml += '</div>';
          });
        } else if (block.type === 'heading') {
          const tag = 'h' + (block.level || 3);
          contentHtml += '<' + tag + ' style="font-size:14px;font-weight:600;margin-top:24px;margin-bottom:12px;">' + escapeHtml(block.text) + '</' + tag + '>';
        } else if (block.type === 'list') {
          contentHtml += renderList(block.items);
        }
      });
    }
    contentHtml += '</div>';
  });
  contentHtml += '</div>';

  return '<div class="bedrock-layout">' + navHtml + contentHtml + '</div>';
}

function renderHeroWithCards(content) {
  let html = '<div class="hero"><h2>' + escapeHtml(content.heading) + '</h2><p>' + renderInlineFormatting(content.description) + '</p></div>';
  if (content.cards && content.cards.length) {
    html += '<div class="placeholder-grid">';
    content.cards.forEach(card => {
      html += '<div class="placeholder-card">' + (card.icon || '') + '<br>' + escapeHtml(card.title) + '<br><small>' + escapeHtml(card.subtitle || '') + '</small></div>';
    });
    html += '</div>';
  }
  return html;
}

// ==================== MAIN RENDER ====================
function render(data) {
  let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + CSS + '</style></head><body>';
  html += '<button class="theme-toggle" id="themeToggle" onclick="toggleTheme()">☀️ Light</button>';
  
  // Header
  html += '<div class="header"><h1>' + escapeHtml(data.title) + '</h1><p>' + escapeHtml(data.description) + '</p>';
  
  // Main tabs
  html += '<div class="main-tabs">';
  data.tabs.forEach((tab, i) => {
    html += '<div class="main-tab' + (i === 0 ? ' active' : '') + '" data-tab="' + tab.id + '">' + escapeHtml(tab.label) + '</div>';
  });
  html += '</div></div>';
  
  // Subtab bars
  data.tabs.forEach((tab, i) => {
    html += '<div class="subtab-bar" id="subtabs-' + tab.id + '"' + (i > 0 ? ' style="display:none"' : '') + '>';
    tab.subtabs.forEach((st, j) => {
      html += '<div class="subtab' + (j === 0 ? ' active' : '') + '" data-subtab="' + st.id + '">' + escapeHtml(st.label) + '</div>';
    });
    html += '</div>';
  });
  
  // Content
  html += '<div class="content-area">';
  data.tabs.forEach((tab, ti) => {
    tab.subtabs.forEach((st, si) => {
      const isFirst = (ti === 0 && si === 0);
      html += '<div class="tab-content" id="content-' + st.id + '"' + (!isFirst ? ' style="display:none"' : '') + '>';
      
      const layout = st.layout;
      const content = st.content;
      
      if (layout === 'checklist') {
        html += renderChecklist(content);
      } else if (layout === 'guided-steps') {
        html += renderGuidedSteps(content, st.id);
      } else if (layout === 'left-nav') {
        html += renderLeftNav(content, st.id + '-nav');
      } else if (layout === 'hero-with-cards') {
        html += renderHeroWithCards(content);
      }
      
      // Nav buttons
      if (st.nav_buttons && st.nav_buttons.length) {
        html += '<div class="nav-buttons">';
        const prev = st.nav_buttons.find(b => b.startsWith('prev:'));
        const next = st.nav_buttons.find(b => b.startsWith('next:'));
        html += prev ? '<button class="nav-btn" onclick="navigateTo(\x27' + prev.split(':')[1] + '\x27)">← Previous</button>' : '<button class="nav-btn hidden">← Previous</button>';
        html += next ? '<button class="nav-btn" onclick="navigateTo(\x27' + next.split(':')[1] + '\x27)">Next →</button>' : '<button class="nav-btn hidden">Next →</button>';
        html += '</div>';
      }
      
      html += '</div>';
    });
  });
  html += '</div>';
  
  // JavaScript
  html += '<script>' + JS + '</script>';
  html += '</body></html>';
  return html;
}

// ==================== JS ====================
const JS = `
function toggleTheme() {
  var body = document.body;
  var btn = document.getElementById('themeToggle');
  if (body.classList.contains('dark')) { body.classList.remove('dark'); btn.innerHTML = '☀️ Light'; }
  else { body.classList.add('dark'); btn.innerHTML = '🌙 Dark'; }
}

function copyCode(btn) {
  try {
    var wrapper = btn.closest('.code-block-wrapper') || btn.closest('.code-collapsible');
    if (!wrapper) return;
    var code = wrapper.querySelector('pre').textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function(){}, function(){});
    } else {
      var ta = document.createElement('textarea'); ta.value = code;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    }
    btn.innerHTML = '✓ Copied'; btn.classList.add('copied');
    setTimeout(function() { btn.innerHTML = '⧉ Copy'; btn.classList.remove('copied'); }, 2000);
  } catch(e) { console.error(e); }
}

function toggleCode(el) { el.classList.toggle('open'); }

function navigateTo(subtabId) {
  var btn = document.querySelector('[data-subtab="' + subtabId + '"]');
  if (btn) btn.click();
}

function showStep(prefix, stepId) {
  try {
    var sidebar = document.getElementById(prefix + '-sidebar');
    var contentArea = sidebar.closest('.guided-layout').querySelector('.step-content-area');
    var steps = contentArea.querySelectorAll('.step-content');
    for (var i = 0; i < steps.length; i++) steps[i].style.display = 'none';
    var target = document.getElementById(stepId);
    if (target) target.style.display = 'block';
    var items = sidebar.querySelectorAll('.step-sidebar-item');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
    var activeItem = sidebar.querySelector('[data-step="' + stepId + '"]');
    if (activeItem) activeItem.classList.add('active');
  } catch(e) { console.error(e); }
}

function showLeftNavSection(navId, secId) {
  try {
    var nav = document.getElementById(navId);
    var layout = nav.closest('.bedrock-layout');
    var sections = layout.querySelectorAll('.bedrock-section');
    for (var i = 0; i < sections.length; i++) sections[i].style.display = 'none';
    var target = document.getElementById(navId + '-' + secId);
    if (target) target.style.display = 'block';
    var items = nav.querySelectorAll('.bedrock-nav-item');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
    var activeItem = nav.querySelector('[data-sec="' + secId + '"]');
    if (activeItem) activeItem.classList.add('active');
  } catch(e) { console.error(e); }
}

(function() {
  var mainTabs = document.querySelectorAll('.main-tab');
  for (var t = 0; t < mainTabs.length; t++) {
    (function(tab) {
      tab.addEventListener('click', function() {
        var tabId = tab.getAttribute('data-tab');
        var allTabs = document.querySelectorAll('.main-tab');
        for (var i = 0; i < allTabs.length; i++) allTabs[i].classList.remove('active');
        tab.classList.add('active');
        var bars = document.querySelectorAll('.subtab-bar');
        for (var i = 0; i < bars.length; i++) bars[i].style.display = 'none';
        document.getElementById('subtabs-' + tabId).style.display = 'flex';
        var contents = document.querySelectorAll('.tab-content');
        for (var i = 0; i < contents.length; i++) contents[i].style.display = 'none';
        var firstSubtab = document.querySelector('#subtabs-' + tabId + ' .subtab');
        if (firstSubtab) {
          var subs = document.querySelectorAll('#subtabs-' + tabId + ' .subtab');
          for (var i = 0; i < subs.length; i++) subs[i].classList.remove('active');
          firstSubtab.classList.add('active');
          document.getElementById('content-' + firstSubtab.getAttribute('data-subtab')).style.display = 'block';
        }
      });
    })(mainTabs[t]);
  }
  var subtabs = document.querySelectorAll('.subtab');
  for (var t = 0; t < subtabs.length; t++) {
    (function(subtab) {
      subtab.addEventListener('click', function() {
        var parent = subtab.closest('.subtab-bar');
        var siblings = parent.querySelectorAll('.subtab');
        for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove('active');
        subtab.classList.add('active');
        var tabId = parent.id.replace('subtabs-', '');
        var contents = document.querySelectorAll('.tab-content');
        for (var i = 0; i < contents.length; i++) {
          if (contents[i].id.indexOf('content-' + tabId) === 0) contents[i].style.display = 'none';
        }
        document.getElementById('content-' + subtab.getAttribute('data-subtab')).style.display = 'block';
      });
    })(subtabs[t]);
  }
})();
`;

// Generate and write output
const output = render(data);
fs.writeFileSync(outputPath, output, 'utf8');
console.log('Generated: ' + outputPath + ' (' + output.length + ' chars)');
