/** EduSim Virtual Lab - student-friendly A4 report generator. */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('printWorksheetBtn');
  const aiButton = document.getElementById('aiReportBtn');
  const container = document.getElementById('printContainer');
  const canvas = document.getElementById('labSvg');
  if (!button || !container || !canvas) return;
  let dialog;

  button.addEventListener('click', () => {
    dialog ||= createDialog();
    const name = document.getElementById('labProjectName')?.textContent.trim() || 'Untitled Lab';
    dialog.querySelector('[name="title"]').value = name;
    dialog.querySelector('[name="aim"]').value = `To build and test the ${name} circuit using EduSim Virtual Lab.`;
    dialog.hidden = false;
    dialog.querySelector('[name="student"]').focus();
  });

  aiButton?.addEventListener('click', generateAiReport);

  async function generateAiReport() {
    const data = snapshot();
    const original = aiButton.innerHTML;
    aiButton.disabled = true;
    aiButton.setAttribute('aria-busy', 'true');
    aiButton.textContent = 'Generating AI Report...';
    try {
      const response = await fetch('http://127.0.0.1:3746/generate-ai-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aiPayload(data)),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.report) throw new Error(result.error || 'The AI report could not be generated.');
      showAiPreview(result.report, data);
    } catch (error) {
      alert(`AI report generation failed: ${error.message}`);
    } finally {
      aiButton.disabled = false;
      aiButton.removeAttribute('aria-busy');
      aiButton.innerHTML = original;
    }
  }

  function aiPayload(data) {
    const componentById = new Map(data.components.map(component => [component.id, component]));
    return {
      experiment_title: document.getElementById('labProjectName')?.textContent.trim() || 'Untitled Lab',
      components: data.components.map(component => ({ name: componentName(component), values: values(component), description: component.def?.desc || '', pins: (component.def?.pins || []).map(pin => ({ id: pin.id, label: pin.label, type: pin.type })) })),
      connections: data.wires.map(wire => ({
        from_component: componentName(componentById.get(wire.from.compId)), from_pin: endpoint(componentById.get(wire.from.compId), wire.from.pinId).pin,
        to_component: componentName(componentById.get(wire.to.compId)), to_pin: endpoint(componentById.get(wire.to.compId), wire.to.pinId).pin,
      })),
      source_code: data.code,
      simulation: {
        status: data.simulationStatus,
        output: data.consoleEntries.filter(entry => !['err', 'warn'].includes(entry.type)).map(entry => entry.message),
        issues: data.consoleEntries.filter(entry => ['err', 'warn'].includes(entry.type)).map(entry => entry.message),
      },
    };
  }

  function showAiPreview(report, data) {
    const overlay = document.createElement('div');
    overlay.className = 'report-dialog-overlay ai-report-preview-overlay';
    overlay.innerHTML = `<section class="report-dialog ai-report-preview" role="dialog" aria-modal="true" aria-labelledby="aiPreviewTitle">
      <header class="report-dialog-header"><div><h2 id="aiPreviewTitle">AI Lab Report Preview</h2><p>Generated from the current circuit, source code, and simulation log.</p></div><button class="report-icon-button" type="button" data-close aria-label="Close">&times;</button></header>
      <div class="ai-preview-body"><section><h3>Aim</h3><p>${escape(report.aim)}</p></section><section><h3>Circuit Working</h3><p>${escape(report.circuit_working_explanation)}</p></section><section><h3>Simulation Analysis</h3><p>${escape(report.simulation_result_explanation)}</p></section><section><h3>Conclusion</h3><p>${escape(report.conclusion)}</p></section></div>
      <footer class="report-dialog-actions ai-preview-actions"><label>PDF mode<select name="aiMode"><option value="student">Student Report</option><option value="teacher">Teacher Report</option><option value="compact">Compact Circuit Sheet</option></select></label><button type="button" class="report-secondary-button" data-close>Close</button><button type="button" class="report-primary-button" data-generate>Generate PDF</button></footer>
    </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.dataset.close !== undefined) overlay.remove();
      if (event.target.dataset.generate !== undefined) {
        const mode = overlay.querySelector('[name="aiMode"]').value;
        overlay.remove();
        buildReport({ mode, title: document.getElementById('labProjectName')?.textContent.trim() || 'Untitled Lab', date: new Date().toISOString().slice(0, 10) }, report, data);
      }
    });
  }

  function createDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'report-dialog-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<section class="report-dialog" role="dialog" aria-modal="true" aria-labelledby="reportTitle">
      <header class="report-dialog-header"><div><h2 id="reportTitle">Create Lab Report</h2><p>Choose a report format and add the student details.</p></div><button class="report-icon-button" type="button" data-close aria-label="Close">&times;</button></header>
      <form class="report-form">
        <fieldset class="report-mode-fieldset"><legend>Export mode</legend>
          <label><input type="radio" name="mode" value="student" checked> Student Report <span>Full guided report</span></label>
          <label><input type="radio" name="mode" value="teacher"> Teacher Report <span>Full report with marking space</span></label>
          <label><input type="radio" name="mode" value="compact"> Compact Circuit Sheet <span>Diagram, parts, and wiring only</span></label>
        </fieldset>
        <div class="report-form-grid"><label>Student name<input name="student" placeholder="Enter student name"></label><label>Roll number<input name="roll" placeholder="Enter roll number"></label><label>Class / section<input name="class" placeholder="Example: 10-A"></label><label>Experiment date<input name="date" type="date"></label></div>
        <label>Experiment title<input name="title"></label>
        <label>Aim<textarea name="aim" rows="2"></textarea></label>
        <label>Learning objectives <span class="report-field-help">One objective per line</span><textarea name="objectives" rows="3" placeholder="Identify the circuit components&#10;Connect pins correctly&#10;Test the expected output"></textarea></label>
        <footer class="report-dialog-actions"><button type="button" class="report-secondary-button" data-close>Cancel</button><button class="report-primary-button">Print / Save PDF</button></footer>
      </form></section>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[name="date"]').value = new Date().toISOString().slice(0, 10);
    overlay.addEventListener('click', event => { if (event.target === overlay || event.target.dataset.close !== undefined) overlay.hidden = true; });
    overlay.querySelector('form').addEventListener('submit', event => {
      event.preventDefault(); overlay.hidden = true;
      buildReport(Object.fromEntries(new FormData(event.currentTarget).entries()));
    });
    return overlay;
  }

  function buildReport(details, aiReport = null, capturedData = null) {
    const data = capturedData || snapshot();
    const mode = details.mode || 'student';
    const diagram = section('Circuit Diagram', `<div class="print-svg-wrapper">${cloneDiagram(canvas, data.components).outerHTML}</div>`);
    const components = section('Component List with Values', componentTable(data.components));
    const wiring = section('Connection and Pin Mapping', connectionTable(data));
    const results = section('Simulation Result', simulationResult(data));
    const compact = `${diagram}${components}${wiring}${results}`;
    const full = `${textSection('Aim', aiReport?.aim || details.aim, 'State what the circuit is designed to do.')}${objectiveSection(aiReport?.learning_objectives || details.objectives)}${diagram}${section('Circuit Working Explanation', aiReport ? `<p class="print-prose">${escape(aiReport.circuit_working_explanation)}</p>` : '<p class="print-empty">Generated from the circuit connections when using AI Report.</p>')}${components}${section('Component Explanation', aiReport ? `<p class="print-prose">${escape(aiReport.component_explanation)}</p>` : '<p class="print-empty">Generated when using AI Report.</p>')}${wiring}${section('Connection Explanation', aiReport ? `<p class="print-prose">${escape(aiReport.connection_explanation)}</p>` : '<p class="print-empty">Generated when using AI Report.</p>')}${codeSection(data.code, aiReport?.code_explanation)}${results}${aiReport ? section('Simulation Result Explanation', `<p class="print-prose">${escape(aiReport.simulation_result_explanation)}</p>`) : ''}${aiReport ? section('Errors and Solutions', aiErrors(aiReport.errors_and_solutions)) : ''}${section('Observation Table', observationTable())}${section('Viva Questions', vivaQuestions(data, aiReport?.viva_questions))}${textSection('Conclusion', aiReport?.conclusion, 'Write whether the aim was achieved and what you learned.')}${mode === 'teacher' ? teacherReview() : ''}`;
    container.className = `print-container print-mode-${mode}`;
    container.innerHTML = `<article class="print-report"><header class="print-header"><div><div class="print-brand">EduSim Virtual Lab</div><div class="print-document-type">${mode === 'compact' ? 'Compact Circuit Sheet' : mode === 'teacher' ? 'Teacher Lab Report' : 'Student Lab Report'}</div></div><div class="print-report-date">Generated ${escape(formatDate(new Date().toISOString().slice(0, 10)))}</div></header><h1 class="print-title">${escape(details.title || 'Untitled Lab')}</h1>${reportMeta(details, data)}<main>${mode === 'compact' ? compact : full}</main><footer class="print-footer">Generated by EduSim Virtual Lab</footer></article>`;
    window.print();
  }

  function snapshot() {
    const state = window.getLabReportData?.() || {};
    return { components: state.components || window.components || [], wires: state.wires || [], code: state.code || '', targetDeviceId: state.targetDeviceId || '', simulationStatus: state.simulationStatus || 'Ready', consoleEntries: state.consoleEntries || [] };
  }

  function reportMeta(details, data) {
    const target = data.components.find(c => c.id === data.targetDeviceId);
    const fields = [['Student', details.student || '________________________'], ['Roll number', details.roll || '________________________'], ['Class / section', details.class || '________________________'], ['Experiment date', details.date ? formatDate(details.date) : '________________________'], ['Target device', target ? componentName(target) : 'Not selected']];
    return `<section class="print-meta"><table>${fields.map(([name, value]) => `<tr><th>${escape(name)}</th><td>${escape(value)}</td></tr>`).join('')}</table></section>`;
  }

  function section(title, content) { return `<section class="print-section"><h2 class="print-section-title">${title}</h2>${content}</section>`; }
  function textSection(title, value, hint) { return section(title, value ? `<p class="print-prose">${escape(value)}</p>` : `<div class="print-writing-area"><span>${escape(hint)}</span></div>`); }
  function objectiveSection(value) {
    const entered = Array.isArray(value) ? value : String(value || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    const items = entered.length ? entered : ['Identify the components used in this circuit.', 'Make the required pin connections correctly.', 'Run the simulation and compare the output with the expected result.'];
    return section('Learning Objectives', `<ol class="print-objectives">${items.map(item => `<li>${escape(item)}</li>`).join('')}</ol>`);
  }

  function componentTable(components) {
    if (!components.length) return '<p class="print-empty">No components have been added to the circuit.</p>';
    const groups = new Map();
    components.forEach(component => { const key = `${component.defId}|${values(component)}`; const group = groups.get(key) || { component, count: 0 }; group.count++; groups.set(key, group); });
    const rows = [...groups.values()].map(({ component, count }) => `<tr><td>${count}</td><td>${escape(componentName(component))}</td><td>${escape(values(component) || 'Default')}</td><td>${escape(component.def?.desc || '')}</td></tr>`).join('');
    return `<table class="print-table"><thead><tr><th>Qty</th><th>Component</th><th>Value / setting</th><th>Purpose</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function values(component) { return (component.def?.props || []).filter(prop => !['label', 'color'].includes(prop.key) && component.props?.[prop.key] !== undefined && component.props[prop.key] !== '').map(prop => `${prop.label}: ${component.props[prop.key]}`).join(', '); }

  function connectionTable(data) {
    if (!data.wires.length) return '<p class="print-empty">No wire connections have been created yet.</p>';
    const byId = new Map(data.components.map(component => [component.id, component]));
    const rows = data.wires.map((wire, index) => { const from = endpoint(byId.get(wire.from.compId), wire.from.pinId); const to = endpoint(byId.get(wire.to.compId), wire.to.pinId); return `<tr><td>${index + 1}</td><td>${escape(from.component)}</td><td>${escape(from.pin)}</td><td>${escape(to.component)}</td><td>${escape(to.pin)}</td></tr>`; }).join('');
    return `<table class="print-table"><thead><tr><th>#</th><th>From component</th><th>From pin</th><th>To component</th><th>To pin</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function endpoint(component, pinId) { const pin = component?.def?.pins?.find(item => item.id === pinId); return { component: component ? componentName(component) : 'Unknown component', pin: pin ? `${pin.id} (${pin.label})` : pinId }; }

  function codeSection(code, aiExplanation = '') {
    const source = code.trim() || '// No source code has been entered.';
    const explanation = aiExplanation ? [aiExplanation] : explainCode(source);
    return section('Source Code', `<pre class="print-code">${escape(source)}</pre>`) + section('Simple Code Explanation', `<ul class="print-explanation">${explanation.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`);
  }
  function explainCode(code) {
    const notes = [];
    if (/void\s+setup\s*\(/.test(code)) notes.push('setup() runs once when the simulation starts and prepares the circuit.');
    if (/void\s+loop\s*\(/.test(code)) notes.push('loop() runs repeatedly, so the circuit can keep responding.');
    const pins = [...code.matchAll(/pinMode\s*\(\s*([^,]+),\s*(INPUT|OUTPUT)/g)];
    if (pins.length) notes.push(`The code configures ${pins.map(match => `${match[1].trim()} as ${match[2].toLowerCase()}`).join(', ')}.`);
    if (/digitalWrite\s*\(/.test(code)) notes.push('digitalWrite() changes an output HIGH or LOW to control a connected component.');
    if (/analog(Read|Write)\s*\(/.test(code)) notes.push('The program reads or writes an analog value for a sensor or variable output.');
    if (/delay\s*\(/.test(code)) notes.push('delay() pauses the program for the stated time in milliseconds.');
    if (/Serial\.(print|println|begin)/.test(code)) notes.push('Serial instructions send information to the serial monitor for checking results.');
    return notes.length ? notes : ['The source code is included above. Add setup(), loop(), and comments to explain the circuit behaviour.'];
  }

  function simulationResult(data) {
    const logs = data.consoleEntries.filter(entry => entry.message && !/Virtual Lab Ready/.test(entry.message));
    const issues = logs.filter(entry => ['err', 'warn'].includes(entry.type));
    const output = logs.filter(entry => !['err', 'warn'].includes(entry.type)).slice(-6);
    const messages = output.length ? output.map(entry => escape(entry.message)).join('<br>') : 'No simulation output captured yet.';
    return `<div class="print-result-grid"><div><strong>Status:</strong> ${escape(data.simulationStatus)}</div><div><strong>Output:</strong><p>${messages}</p></div></div><div class="print-issues"><strong>Errors / warnings</strong>${issues.length ? `<ul>${issues.map(entry => `<li>${escape(entry.message)}</li>`).join('')}</ul>` : '<p>None recorded.</p>'}</div>`;
  }
  function observationTable() { return `<table class="print-table print-observation-table"><thead><tr><th>Test / input</th><th>Expected result</th><th>Observed result</th><th>Pass?</th></tr></thead><tbody>${[1, 2, 3, 4].map(() => '<tr><td></td><td></td><td></td><td></td></tr>').join('')}</tbody></table>`; }
  function aiErrors(items) { if (!items?.length) return '<p class="print-empty">No errors or warnings were recorded during the simulation.</p>'; return `<table class="print-table"><thead><tr><th>Issue</th><th>Recommended solution</th></tr></thead><tbody>${items.map(item => `<tr><td>${escape(item.issue)}</td><td>${escape(item.solution)}</td></tr>`).join('')}</tbody></table>`; }
  function vivaQuestions(data, generated = null) { const names = data.components.map(componentName).slice(0, 3).join(', ') || 'the components in this circuit'; const questions = Array.isArray(generated) && generated.length ? generated : [`What is the role of ${names} in this circuit?`, 'Which pins carry power, ground, and signal connections?', 'What would you check if the expected output did not appear?', 'How does the program control or read the connected components?']; return `<ol class="print-viva">${questions.map(question => `<li>${escape(question)}<div class="print-answer-line"></div></li>`).join('')}</ol>`; }
  function teacherReview() { return section('Teacher Review', '<div class="print-review-grid"><div>Accuracy of circuit: __________ / 5</div><div>Code and logic: __________ / 5</div><div>Observations: __________ / 5</div><div>Viva: __________ / 5</div></div><div class="print-answer-space"></div>'); }

  function cloneDiagram(original, components) {
    const clone = original.cloneNode(true); clone.removeAttribute('id'); clone.classList.remove('lab-canvas'); clone.classList.add('print-svg');
    clone.querySelector('#activeWire')?.remove(); clone.querySelectorAll('.selected').forEach(item => item.classList.remove('selected')); clone.querySelectorAll('.pin-circle').forEach(item => { item.style.display = 'none'; }); clone.querySelectorAll('.lab-wire').forEach(item => item.setAttribute('stroke', '#222'));
    clone.querySelector('#wiresLayer')?.removeAttribute('transform');
    clone.querySelector('#componentsLayer')?.removeAttribute('transform');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    components.forEach(component => { const def = component.def || {}; const x = component.x || 0; const y = component.y || 0; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + (def.w || 50)); maxY = Math.max(maxY, y + (def.h || 50)); });
    clone.setAttribute('viewBox', minX === Infinity ? '0 0 800 600' : `${minX - 20} ${minY - 20} ${maxX - minX + 40} ${maxY - minY + 40}`); return clone;
  }
  function componentName(component) { return component?.props?.label || component?.def?.label || component?.defId || 'Component'; }
  function formatDate(value) { const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); }
  function escape(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
});
