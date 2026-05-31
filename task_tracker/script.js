/* Task Tracker - cleaned, modular JS with event delegation */
(function(){
  'use strict';

  const translations = {
    de: {
      settings: 'Einstellungen', accent_color: 'Akzentfarbe', font_size: 'Schriftgrösse',
      subtitle: 'Behalte deine Aufgaben und Projekte im Blick', new_task: 'Neue Aufgabe eingeben...', add: 'Hinzufügen',
      due_date: 'Fälligkeitsdatum (optional)', tags: 'Tags (kommagetrennt)...', filter_all: 'Alle', filter_open: 'Offen',
      filter_done: 'Erledigt', filter_overdue: 'Überfällig', search: 'Tasks durchsuchen...', total: 'Gesamt', open: 'Offen',
      done_label: 'Erledigt', prio_low: 'Niedrig', prio_medium: 'Mittel', prio_high: 'Hoch',
      empty_state: 'Noch keine Tasks da. Füge oben deine erste Aufgabe hinzu!', no_results: 'Keine Tasks gefunden.',
      no_overdue: 'Keine überfälligen Tasks!', no_done: 'Noch keine erledigten Tasks.', all_done: 'Alle Tasks erledigt!',
      no_tag_results: 'Keine Tasks mit Tag "{tag}".', clear_filter: 'Filter zurücksetzen', percent_done: '% erledigt',
      overdue_count: 'überfällig', no_overdue_msg: 'Keine überfälligen!', delete_project: 'Projekt löschen',
      default_project: 'Allgemein', project_search: 'Projekt suchen...', new_project_name: 'Neuer Projektname...', create: 'Erstellen', priority: 'Priorität', tag_wichtig: 'Wichtig', drag_handle: 'Ziehen zum Verschieben', add_subtask: 'Subtask hinzufügen...', lang_tooltip: 'Auf Englisch umschalten'
    },
    en: {
      settings: 'Settings', accent_color: 'Accent Color', font_size: 'Font Size', subtitle: 'Keep track of your tasks and projects',
      new_task: 'Enter new task...', add: 'Add', due_date: 'Due date (optional)', tags: 'Tags (comma-separated)...',
      filter_all: 'All', filter_open: 'Open', filter_done: 'Done', filter_overdue: 'Overdue', search: 'Search tasks...',
      total: 'Total', open: 'Open', done_label: 'Done', prio_low: 'Low', prio_medium: 'Medium', prio_high: 'High',
      empty_state: 'No tasks yet. Add your first task above!', no_results: 'No tasks found.', no_overdue: 'No overdue tasks!',
      no_done: 'No completed tasks yet.', all_done: 'All tasks completed!', no_tag_results: 'No tasks with tag "{tag}".',
      clear_filter: 'Clear filter', percent_done: '% done', overdue_count: 'overdue', no_overdue_msg: 'No overdue!',
      delete_project: 'Delete project', default_project: 'General', project_search: 'Search project...', new_project_name: 'New project name...', create: 'Create', priority: 'Priority', tag_wichtig: 'Important', drag_handle: 'Drag to move', add_subtask: 'Add subtask...', lang_tooltip: 'Auf Deutsch umschalten'
    }
  };

  // State
  let currentLang = localStorage.getItem('taskTracker_lang') || 'de';
  let currentAccent = localStorage.getItem('taskTracker_accent') || 'purple';
  let currentProject = 'Allgemein';
  let tasks = [];
  let projects = ['Allgemein'];
  let allTags = ['wichtig'];
  let currentFilter = 'all';
  let searchQuery = '';
  let activeTagFilter = null;
  let draggedTaskId = null;

  // Helpers
  const qs = (s, ctx=document) => ctx.querySelector(s);
  const qsa = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));
  const escapeHtml = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  const fmtDate = s => { if(!s) return ''; const [y,m,d] = s.split('-'); return `${d}.${m}.${y}`; };
  const isOverdue = d => { if(!d) return false; const today = new Date(); today.setHours(0,0,0,0); return new Date(d) < today; };

  function t(key, rep){
    const txt = (translations[currentLang] && translations[currentLang][key]) || translations.de[key] || key;
    if(!rep) return txt;
    return Object.keys(rep).reduce((s,k)=>s.replace('{'+k+'}', rep[k]), txt);
  }

  function getProjectLabel(name){
    return name === 'Allgemein' ? t('default_project') : name;
  }

  function getTagLabel(tag){
    const key = 'tag_' + tag;
    if(translations[currentLang] && translations[currentLang][key]) return t(key);
    if(translations.de && translations.de[key]) return translations[currentLang] ? t(key) : translations.de[key];
    return tag;
  }

  function loadData(){
    const sT = localStorage.getItem('taskTracker_tasks');
    const sP = localStorage.getItem('taskTracker_projects');
    const sG = localStorage.getItem('taskTracker_tags');
    const sL = localStorage.getItem('taskTracker_lang');
    const sA = localStorage.getItem('taskTracker_accent');
    if(sT) tasks = JSON.parse(sT);
    if(sP) projects = JSON.parse(sP); 
    if(sG) allTags = JSON.parse(sG); else allTags = ['wichtig'];
    // remove legacy default tags but keep user-added tags and 'wichtig'
    if(Array.isArray(allTags)){
      const removeDefaults = ['frontend','backend','bug','feature'];
      allTags = allTags.filter(tag => tag === 'wichtig' || !removeDefaults.includes(tag));
    }
    if(sL) currentLang = sL;
    if(sA) currentAccent = sA;
    // sanitize loaded projects: remove empty strings and test/demo entries
    if(Array.isArray(projects)){
      projects = projects.filter(p => typeof p === 'string' && p.trim() !== '');
      // remove known test prefixes created during automated checks
      projects = projects.filter(p => !/^mp-|^mobile-|^mobile-test-|^mobile-check-/.test(p));
      // ensure default project exists
      if(!projects.includes('Allgemein')) projects.unshift('Allgemein');
    } else {
      projects = ['Allgemein'];
    }
    // ensure currentProject is valid
    if(!projects.includes(currentProject)) currentProject = 'Allgemein';
    tasks.forEach(td => {
      if(!td.hasOwnProperty('dueDate')) td.dueDate = null;
      if(!td.hasOwnProperty('priority')) td.priority = 'medium';
      if(!td.hasOwnProperty('subtasks')) td.subtasks = [];
      if(!td.hasOwnProperty('tags')) td.tags = [];
      if(!td.hasOwnProperty('order')) td.order = td.id || Date.now();
    });
  }

  function saveData(){
    localStorage.setItem('taskTracker_tasks', JSON.stringify(tasks));
    localStorage.setItem('taskTracker_projects', JSON.stringify(projects));
    localStorage.setItem('taskTracker_tags', JSON.stringify(allTags));
    localStorage.setItem('taskTracker_accent', currentAccent);
  }

  // Renderers
  function applyTranslations(){
    qsa('[data-lang]').forEach(el => {
      const k = el.getAttribute('data-lang');
      const txt = t(k);
      if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = txt;
      else if(el.id === 'projectDropdownBtn' && k === 'default_project') el.textContent = `${txt} ▾`;
      else el.textContent = txt;
    });
    qsa('[data-lang-placeholder]').forEach(el => { const k = el.getAttribute('data-lang-placeholder'); if(k) el.placeholder = t(k); });
    qsa('[data-lang-title]').forEach(el => { const k = el.getAttribute('data-lang-title'); if(k) el.title = t(k); });
    const priorityOptions = qsa('#prioritySelect option');
    if(priorityOptions.length){
      const prefix = t('priority');
      priorityOptions.forEach(opt => {
        const key = 'prio_' + opt.value;
        opt.textContent = `${prefix}: ${t(key)}`;
      });
    }
    const createBtn = qs('#projectNewBtn');
    if(createBtn){ createBtn.textContent = '+ ' + t('create'); }
    const b = qs('#langBtn'); if(b){ b.title = t('lang_tooltip'); b.textContent = currentLang === 'de' ? '🇬🇧' : '🇩🇪'; }
  }

  function toggleLanguage(){
    currentLang = currentLang === 'de' ? 'en' : 'de';
    localStorage.setItem('taskTracker_lang', currentLang);
    applyTranslations();
    render();
  }

  function applyAccentColor(){
    const body = document.body;
    body.classList.remove('accent-blue','accent-green','accent-orange','accent-pink');
    if(currentAccent !== 'purple') body.classList.add('accent-' + currentAccent);
    qsa('.color-circle').forEach(cc => cc.classList.toggle('active', cc.getAttribute('data-color') === currentAccent));
  }

  function renderStats(){
    const tot = tasks.length;
    const op = tasks.filter(td => !td.done).length;
    const dn = tasks.filter(td => td.done).length;
    const ov = tasks.filter(td => !td.done && isOverdue(td.dueDate)).length;
    const pct = tot > 0 ? Math.round((dn / tot) * 100) : 0;
    const totalEl = qs('#totalTasks'); if(totalEl) totalEl.textContent = tot;
    const openEl = qs('#openTasks'); if(openEl) openEl.textContent = op;
    const doneEl = qs('#doneTasks'); if(doneEl) doneEl.textContent = dn;
    const statsExtra = qs('#statsExtra'); if(statsExtra) statsExtra.innerHTML = `<span class="stats-pct">${pct} ${t('percent_done')}</span>${ov>0?` · <span class="stats-overdue">${ov} ${t('overdue_count')}</span>`:` · <span class="stats-allgood">${t('no_overdue_msg')}</span>`}`;
  }

  function renderTagFilter(){
    const sec = qs('#tagFilterSection'); if(!sec) return;
    if(allTags.length === 0){ sec.innerHTML = ''; return; }
    const chips = allTags.map(tag => {
      const active = activeTagFilter === tag ? ' active' : '';
      return `<span class="tag-filter-chip${active}" data-action="filter-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(getTagLabel(tag))}</span>`;
    }).join('');
    const clear = activeTagFilter ? `<span class="tag-filter-clear" data-action="clear-filter">✕ ${t('clear_filter')}</span>` : '';
    sec.innerHTML = `<div class="tag-filter-list">${chips}${clear}</div>`;
  }

  function filterTasks(){
    let r = tasks.slice();
    if(currentFilter === 'open') r = r.filter(td => !td.done);
    else if(currentFilter === 'done') r = r.filter(td => td.done);
    else if(currentFilter === 'overdue') r = r.filter(td => !td.done && isOverdue(td.dueDate));
    if(searchQuery.trim()){
      const q = searchQuery.toLowerCase();
      r = r.filter(td => td.text.toLowerCase().includes(q) || td.subtasks.some(s => s.text.toLowerCase().includes(q)) || td.tags.some(tag => tag.toLowerCase().includes(q)));
    }
    if(activeTagFilter) r = r.filter(td => td.tags.includes(activeTagFilter));
    return r;
  }

  function render(){
    applyAccentColor();
    const grid = qs('#projectsGrid'); if(!grid) return;
    grid.innerHTML = '';
    renderProjectSelect();
    renderStats();
    renderTagFilter();

    const filtered = filterTasks();
    const grouped = {};
    projects.forEach(p => {
      const pt = filtered.filter(td => td.project === p).sort((a,b) => a.order - b.order);
      if(pt.length) grouped[p] = pt;
    });

    if(Object.keys(grouped).length === 0){
      let msg = t('no_results');
      if(activeTagFilter) msg = t('no_tag_results',{tag: activeTagFilter});
      else if(currentFilter === 'overdue') msg = t('no_overdue') + ' 🎉';
      else if(currentFilter === 'done') msg = t('no_done');
      else if(currentFilter === 'open') msg = t('all_done') + ' 🎉';
      grid.innerHTML = `<div class="project-card" style="grid-column:1/-1"><div class="empty-state"><div class="empty-icon">📝</div><p>${msg}</p></div></div>`;
      return;
    }

    Object.entries(grouped).forEach(([pn, pt]) => {
      const card = document.createElement('div');
      card.className = 'project-card';
      card.dataset.project = pn;

      const headerRight = `<div class="project-header-right"><span class="project-count">${pt.length}</span>${pn !== 'Allgemein' ? `<button class="project-delete" data-action="delete-project" data-project="${escapeHtml(pn)}" title="${t('delete_project')}">✕</button>` : ''}</div>`;
      let html = `<div class="project-header"><span class="project-title">${escapeHtml(getProjectLabel(pn))}</span>${headerRight}</div><ul class="task-list">`;

      pt.forEach(task => {
        const od = !task.done && isOverdue(task.dueDate);
        const ds = task.subtasks.filter(s => s.done).length;
        const ts = task.subtasks.length;
        const sp = ts>0?Math.round((ds/ts)*100):0;

        html += `<li class="task-item${od?' task-overdue':''}" data-task-id="${task.id}" draggable="true">
          <span class="drag-handle" title="${t('drag_handle')}">⠿</span>
          <span class="priority-dot priority-${task.priority}" title="Priorität: ${priorityLabel(task.priority)}"></span>
          <input type="checkbox" class="task-checkbox" data-task-id="${task.id}" ${task.done?'checked':''}>
          <div class="task-content"><div class="task-main">
            <span class="task-text${task.done?' done':''}">${escapeHtml(task.text)}</span>
            ${task.dueDate?`<span class="task-date${od?' overdue-text':''}">${od?'⚠️ ':'📅 '}${fmtDate(task.dueDate)}</span>`:''}
          </div>`;

        if(task.tags && task.tags.length){
          html += '<div class="task-tags">' + task.tags.map(tag=>`<span class="task-tag" data-action="filter-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(getTagLabel(tag))}</span>`).join('') + '</div>';
        }

        if(ts>0){
          html += `<div class="subtask-progress"><div class="progress-bar"><div class="progress-fill" style="width:${sp}%"></div></div><span class="progress-text">${ds}/${ts}</span></div>`;
          html += '<ul class="subtask-list">' + task.subtasks.map(sub=>`<li class="subtask-item"><input type="checkbox" class="subtask-checkbox" data-task-id="${task.id}" data-sub-id="${sub.id}" ${sub.done?'checked':''}><span class="subtask-text${sub.done?' done':''}">${escapeHtml(sub.text)}</span></li>`).join('') + '</ul>';
        }

        html += `<div class="subtask-add"><input type="text" class="subtask-input" placeholder="${t('add_subtask')}" data-task-id="${task.id}"><button class="subtask-add-btn" data-action="add-subtask" data-task-id="${task.id}">+</button></div>`;
        html += `</div><button class="task-delete" data-action="delete-task" data-task-id="${task.id}">✕</button></li>`;
      });

      html += '</ul>';
      card.innerHTML = html;
      grid.appendChild(card);
    });

    // Update filter buttons active state
    qsa('.filter-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-filter') === currentFilter));
  }

  // UI actions
  function addTask(){
    const inp = qs('#taskInput'); if(!inp) return;
    const prio = qs('#prioritySelect'); const dateInp = qs('#dueDateInput'); const tagInp = qs('#tagInput');
    const text = inp.value.trim(); if(!text){ inp.focus(); return; }
    const projName = currentProject;
    const newTags = (tagInp?tagInp.value:'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    newTags.forEach(tag=>{ if(!allTags.includes(tag)) allTags.push(tag); });
    if(!projects.includes(projName)){ projects.push(projName); saveData(); }
    const pt = tasks.filter(td => td.project === projName);
    const mo = pt.length ? Math.max(...pt.map(td=>td.order)) : 0;
    tasks.push({ id: Date.now(), text, project: projName, done: false, dueDate: dateInp?dateInp.value:null, priority: prio?prio.value:'medium', subtasks:[], tags: newTags, order: mo+1 });
    inp.value = ''; if(dateInp) dateInp.value = ''; if(tagInp) tagInp.value = '';
    inp.focus(); saveData(); render();
  }

  function toggleTaskById(id){ const tk = tasks.find(td=>td.id==id); if(!tk) return; tk.done = !tk.done; tk.subtasks.forEach(s=>s.done = tk.done); saveData(); render(); }
  function deleteTaskById(id){ tasks = tasks.filter(td=>td.id!=id); saveData(); render(); }
  function addSubtaskByTask(id){ const input = qs(`.subtask-input[data-task-id="${id}"]`); if(!input) return; const text = input.value.trim(); if(!text) return; const tk = tasks.find(td=>td.id==id); if(!tk) return; tk.subtasks.push({ id: Date.now(), text, done: false }); input.value = ''; saveData(); render(); }
  function toggleSubtaskByIds(tid, sid){ const tk = tasks.find(td=>td.id==tid); if(!tk) return; const sub = tk.subtasks.find(s=>s.id==sid); if(!sub) return; sub.done = !sub.done; tk.done = tk.subtasks.length>0 && tk.subtasks.every(s=>s.done); saveData(); render(); }
  function deleteProjectByName(name){ if(name === 'Allgemein') return; if(projects.length <= 1) return; tasks.forEach(td=>{ if(td.project === name) td.project = 'Allgemein'; }); projects = projects.filter(p=>p!==name); saveData(); render(); }
  function setTagFilter(tag){ activeTagFilter = activeTagFilter === tag ? null : tag; render(); }

  // Drag & drop (delegated)
  function onDragStart(e){ const li = e.target.closest('.task-item'); if(!li) return; draggedTaskId = Number(li.dataset.taskId || li.getAttribute('data-task-id')); li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; }
  function onDragEnd(e){ const li = e.target.closest('.task-item'); if(li) li.classList.remove('dragging'); qsa('.drop-target').forEach(el=>el.classList.remove('drop-target')); draggedTaskId = null; }
  function onDragOver(e){ e.preventDefault(); }
  function onDrop(e){ e.preventDefault(); const card = e.target.closest('.project-card'); if(!card || draggedTaskId==null) return; const toProject = card.dataset.project; const dragged = tasks.find(td=>td.id==draggedTaskId); if(!dragged) return; dragged.project = toProject; saveData(); render(); }

  // Event delegation for clicks/changes
  function handleGridClick(e){ const actionEl = e.target.closest('[data-action]'); if(actionEl){ const action = actionEl.getAttribute('data-action'); if(action === 'delete-task'){ deleteTaskById(Number(actionEl.dataset.taskId)); }
    else if(action === 'add-subtask'){ addSubtaskByTask(Number(actionEl.dataset.taskId)); }
    else if(action === 'delete-project'){ deleteProjectByName(actionEl.dataset.project); }
    else if(action === 'filter-tag'){ setTagFilter(actionEl.dataset.tag); }
    else if(action === 'clear-filter'){ activeTagFilter = null; render(); }
  }
  // checkbox handlers
  if(e.target.classList && e.target.classList.contains('task-checkbox')){ const id = e.target.dataset.taskId; toggleTaskById(Number(id)); }
}

  function handleGridChange(e){ const target = e.target; if(target.classList.contains('task-checkbox')){ const id = Number(target.dataset.taskId); toggleTaskById(id); }
    else if(target.classList.contains('subtask-checkbox')){ const tid = Number(target.dataset.taskId); const sid = Number(target.dataset.subId); toggleSubtaskByIds(tid, sid); }
  }

  function handleKeyDown(e){ if(e.key !== 'Enter') return; const input = e.target; if(input.classList.contains('subtask-input')){ const tid = Number(input.dataset.taskId); addSubtaskByTask(tid); } }

  // Priority label helper
  function priorityLabel(p){ return p === 'high' ? t('prio_high') : p === 'low' ? t('prio_low') : t('prio_medium'); }

  // Project select and dropdown helpers (existing behavior)
  function selectProject(name){ currentProject = name; const btn = qs('#projectDropdownBtn'); if(btn) btn.textContent = getProjectLabel(name) + ' ▾'; const content = qs('#projectDropdownContent'); if(content) content.classList.remove('show'); renderProjectSelect(); }
  function createProjectFromInput(){ const ni = qs('#projectNewInput'); if(!ni) return; const name = ni.value.trim(); if(!name) return; if(!projects.includes(name)){ projects.push(name); saveData(); } selectProject(name); ni.value = ''; }
  function renderProjectSelect(){ const items = qs('#projectDropdownItems'); if(!items) return; const btn = qs('#projectDropdownBtn'); if(btn) btn.textContent = getProjectLabel(currentProject) + ' ▾'; items.innerHTML = ''; projects.forEach(p=>{ const div = document.createElement('div'); div.className = 'dropdown-item' + (p === currentProject ? ' selected' : ''); div.textContent = getProjectLabel(p); div.addEventListener('click', ()=> selectProject(p)); items.appendChild(div); }); const si = qs('#projectSearchInput'); if(si && !si._hasListener){ si.addEventListener('input', function(){ const q=this.value.toLowerCase(); qsa('#projectDropdownItems .dropdown-item').forEach(it=>{ it.style.display = it.textContent.toLowerCase().includes(q) ? '' : 'none'; }); }); si._hasListener = true; } const ni = qs('#projectNewInput'); const btnNew = qs('#projectNewBtn'); if(ni && !ni._hasListener){ ni.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); createProjectFromInput(); } }); ni._hasListener = true; } if(btnNew && !btnNew._hasListener){ btnNew.addEventListener('click', createProjectFromInput); btnNew._hasListener = true; } }

  // Bind UI
  function bindUI(){
    const addBtn = qs('#addBtn'); if(addBtn) addBtn.addEventListener('click', addTask);
    const taskInput = qs('#taskInput'); if(taskInput) taskInput.addEventListener('keypress', e=>{ if(e.key==='Enter') addTask(); });
    qsa('.filter-btn').forEach(btn => btn.addEventListener('click', function(){ currentFilter = this.getAttribute('data-filter'); render(); }));
    const search = qs('#searchInput'); if(search) search.addEventListener('input', function(){ searchQuery = this.value; render(); });
    const langBtn = qs('#langBtn'); if(langBtn) langBtn.addEventListener('click', toggleLanguage);
    const darkBtn = qs('#darkBtn'); if(darkBtn) darkBtn.addEventListener('click', function(){ document.body.classList.toggle('dark-mode'); this.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙'; });
    const settingsBtn = qs('#settingsBtn'); if(settingsBtn) settingsBtn.addEventListener('click', function(){ const p = qs('#settingsPanel'); if(!p) return; p.style.display = p.style.display === 'none' ? 'block' : 'none'; });
    const projectDropdownBtn = qs('#projectDropdownBtn'); if(projectDropdownBtn) projectDropdownBtn.addEventListener('click', function(e){ e.stopPropagation(); const c = qs('#projectDropdownContent'); if(c) c.classList.toggle('show'); renderProjectSelect(); });
    document.addEventListener('click', function(){ const c = qs('#projectDropdownContent'); if(c) c.classList.remove('show'); });
    const pdc = qs('#projectDropdownContent'); if(pdc) pdc.addEventListener('click', e=> e.stopPropagation());
    qsa('.color-circle').forEach(c=> c.addEventListener('click', function(){ currentAccent = this.getAttribute('data-color'); saveData(); applyAccentColor(); }));
    qsa('.font-btn').forEach(btn => btn.addEventListener('click', function(){ document.body.classList.remove('font-small','font-medium','font-large'); document.body.classList.add('font-' + this.getAttribute('data-font')); qsa('.font-btn').forEach(b => b.classList.remove('active')); this.classList.add('active'); }));

    // Delegated handlers on projects grid
    const grid = qs('#projectsGrid'); if(grid){
      grid.addEventListener('click', function(e){ handleGridClickDelegated(e); });
      grid.addEventListener('change', handleGridChange);
      grid.addEventListener('keydown', handleKeyDown);
      grid.addEventListener('dragstart', function(e){ onDragStart(e); });
      grid.addEventListener('dragend', function(e){ onDragEnd(e); });
      grid.addEventListener('dragover', function(e){ onDragOver(e); });
      grid.addEventListener('drop', function(e){ onDrop(e); });
    }
  }

  // Delegated click handler wrapper
  function handleGridClickDelegated(e){
    const act = e.target.closest('[data-action]');
    if(act){ const action = act.getAttribute('data-action'); if(action==='delete-task'){ deleteTaskById(Number(act.dataset.taskId)); }
      else if(action==='add-subtask'){ addSubtaskByTask(Number(act.dataset.taskId)); }
      else if(action==='delete-project'){ deleteProjectByName(act.dataset.project); }
      else if(action==='filter-tag'){ setTagFilter(act.dataset.tag); }
      else if(action==='clear-filter'){ activeTagFilter = null; render(); }
      return;
    }
    // checkbox clicks handled on change
    if(e.target.classList.contains('task-checkbox')){ toggleTaskById(Number(e.target.dataset.taskId)); }
  }

  function handleGridChange(e){ const target = e.target; if(target.classList.contains('task-checkbox')){ toggleTaskById(Number(target.dataset.taskId)); }
    else if(target.classList.contains('subtask-checkbox')){ toggleSubtaskByIds(Number(target.dataset.taskId), Number(target.dataset.subId)); } }

  function handleKeyDown(e){ if(e.key !== 'Enter') return; const input = e.target; if(input.classList.contains('subtask-input')){ addSubtaskByTask(Number(input.dataset.taskId)); } }

  // Expose a few helpers used above
  function toggleTaskById(id){ toggleTaskByIdInner(id); }
  function toggleTaskByIdInner(id){ const tk = tasks.find(td=>td.id==id); if(tk){ tk.done = !tk.done; tk.subtasks.forEach(s=>s.done = tk.done); saveData(); render(); } }

  // Start
  loadData();
  applyTranslations();
  bindUI();
  render();

})();
