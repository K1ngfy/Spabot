// options.js - Logic for the Options Page

const STORAGE_KEYS = {
  templates: 'spabot_custom_templates',
  templatesElk: 'spabot_custom_templates_elk',
  indexes: 'spabot_custom_indexes',
  macros: 'spabot_custom_macros',
  rest: 'spabot_custom_rest',
  esql: 'spabot_custom_esql',
  dataviews: 'spabot_custom_dataviews',
  settings: 'spabot_settings'
};

const SKIN_OPTIONS = [
    { value: 'default', label: 'Default (Kawaii Green)' },
    { value: 'steampunk', label: 'Steampunk (Brass)' },
    { value: 'retro', label: 'Retro (Gameboy)' },
    { value: 'ufo', label: 'UFO (Flying Saucer)' },
    { value: 'cat', label: 'Cat Bot (Ears & Whiskers)' },
    { value: 'astro', label: 'Astro (Helmet)' },
    { value: 'octo', label: 'Octo (Tentacles)' },
    { value: 'panda', label: 'Panda Bot' },
    { value: 'duck', label: 'Ducky (Duckling)' },
    { value: 'penguin', label: 'Penguin Bot' },
    { value: 'bunny', label: 'Bunny (Long Ears)' },
    { value: 'frog', label: 'Frog Bot' },
    { value: 'slime', label: 'Slime (Jelly)' },
    { value: 'bili-tv', label: 'Bilibili TV (Blue)' }
];

const BUBBLE_OPTIONS = [
    { value: 'default', label: 'Default (Yellow Note)' },
    { value: 'bilibili', label: 'Bilibili Pink Style' },
    { value: 'bilibili-blue', label: 'Bilibili Blue Style' },
    { value: 'comic', label: 'Comic Book' },
    { value: 'futuristic', label: 'Futuristic HUD' },
    { value: 'minimal', label: 'Minimalist White' },
    { value: 'chalkboard', label: 'Chalkboard' },
    { value: 'neon', label: 'Neon Glow' }
];

let currentTab = 'templates';
let currentData = [];
let editIndex = -1; // -1 for add, >= 0 for edit

// Tabs that hold saved-search templates (support group field)
const isTemplateTab = (tab) => tab === 'templates' || tab === 'templatesElk';

// Platform grouping: which platform a config tab belongs to
const TAB_PLATFORM = {
  templates: 'splunk', indexes: 'splunk', macros: 'splunk', rest: 'splunk',
  templatesElk: 'kibana', esql: 'kibana', dataviews: 'kibana'
};
let currentPlatform = 'splunk';
let listFilter = { search: '', group: '__all' };

// DOM Elements
const tabs = document.querySelectorAll('.tab-btn');
const containers = document.querySelectorAll('.container');
const lists = {
  templates: document.getElementById('templateList'),
  templatesElk: document.getElementById('templateListElk'),
  indexes: document.getElementById('indexList'),
  macros: document.getElementById('macroList'),
  rest: document.getElementById('restList'),
  esql: document.getElementById('esqlList'),
  dataviews: document.getElementById('dataviewList')
};
const addBtns = {
  templates: document.getElementById('addTplBtn'),
  templatesElk: document.getElementById('addTplElkBtn'),
  indexes: document.getElementById('addIdxBtn'),
  macros: document.getElementById('addMacBtn'),
  rest: document.getElementById('addRestBtn'),
  esql: document.getElementById('addEsqlBtn'),
  dataviews: document.getElementById('addDvBtn')
};

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const itemName = document.getElementById('itemName');
const itemContent = document.getElementById('itemContent');
const contentLabel = document.getElementById('contentLabel');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');
const quietModeCheckbox = document.getElementById('quietMode');

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadData();
  loadSettings();
});

function setupTabs() {
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      // Switch Tab UI
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Switch Container
      const tabName = btn.dataset.tab;
      containers.forEach(c => c.classList.remove('active'));
      document.getElementById(tabName).classList.add('active');
      
      currentTab = tabName;
      // Keep platform nav in sync (e.g. when opened via hash link)
      if (TAB_PLATFORM[tabName]) setPlatformUI(TAB_PLATFORM[tabName]);
      // Show toolbar for data lists, reset previous filter state
      const toolbar = document.getElementById('listToolbar');
      if (toolbar) toolbar.classList.remove('hidden');
      resetListFilter();
      if (currentTab !== 'settings') {
        loadData();
      }
    });
  });

  // Platform switcher (Splunk / Kibana / General Settings)
  document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.platform;
      if (p === 'settings') {
        showSettings();
        return;
      }
      // Activate the first sub-tab of that platform; the tab click
      // handler takes care of platform UI, container and data loading.
      const row = document.getElementById(p === 'kibana' ? 'tabsKibana' : 'tabsSplunk');
      const first = row.querySelector('.tab-btn');
      if (first) first.click();
    });
  });

  // List toolbar (search + group filter)
  setupListToolbar();

  // Settings listener
  quietModeCheckbox.addEventListener('change', saveSettings);
  
  // Export/Import listeners
  const btnExport = document.getElementById('btnExport');
  const btnImport = document.getElementById('btnImport');
  const fileImport = document.getElementById('fileImport');
  
  if (btnExport) btnExport.addEventListener('click', handleExport);
  if (btnImport) btnImport.addEventListener('click', () => fileImport.click());
  if (fileImport) fileImport.addEventListener('change', handleImport);
  
  // Hash Params Handler (for opening from menu)
  handleHashParams();
}

function setPlatformUI(platform) {
  currentPlatform = platform;
  document.querySelectorAll('.platform-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.platform === platform));
  document.getElementById('tabsSplunk').classList.toggle('hidden', platform !== 'splunk');
  document.getElementById('tabsKibana').classList.toggle('hidden', platform !== 'kibana');
}

function showSettings() {
  currentPlatform = 'settings';
  currentTab = 'settings';
  document.querySelectorAll('.platform-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.platform === 'settings'));
  document.getElementById('tabsSplunk').classList.add('hidden');
  document.getElementById('tabsKibana').classList.add('hidden');
  const toolbar = document.getElementById('listToolbar');
  if (toolbar) toolbar.classList.add('hidden');
  tabs.forEach(b => b.classList.remove('active'));
  containers.forEach(c => c.classList.remove('active'));
  document.getElementById('settings').classList.add('active');
}

// --- List Toolbar (search + group filter) ---
function resetListFilter() {
  listFilter = { search: '', group: '__all' };
  const searchInput = document.getElementById('listSearch');
  if (searchInput) searchInput.value = '';
}

function setupListToolbar() {
  const toolbar = document.getElementById('listToolbar');
  if (!toolbar) return;
  document.getElementById('listSearch').addEventListener('input', (e) => {
    listFilter.search = e.target.value.trim().toLowerCase();
    applyListFilter();
  });
  document.getElementById('listGroupFilters').addEventListener('click', (e) => {
    const chip = e.target.closest('.group-chip');
    if (!chip) return;
    listFilter.group = chip.dataset.group;
    document.querySelectorAll('#listGroupFilters .group-chip').forEach(c =>
      c.classList.toggle('active', c === chip));
    applyListFilter();
  });
}

function refreshGroupChips() {
  const wrap = document.getElementById('listGroupFilters');
  if (!wrap) return;
  const groups = [];
  if (isTemplateTab(currentTab)) {
    currentData.forEach(item => {
      if (item.group && !groups.includes(item.group)) groups.push(item.group);
    });
  }
  groups.sort();
  if (listFilter.group !== '__all' && !groups.includes(listFilter.group)) {
    listFilter.group = '__all';
  }
  const chips = ['__all', ...groups];
  wrap.innerHTML = chips.map(g =>
    `<button class="group-chip${g === listFilter.group ? ' active' : ''}" data-group="${escapeHtml(g)}">${g === '__all' ? 'All' : escapeHtml(g)}</button>`
  ).join('');
}

function applyListFilter() {
  const listEl = lists[currentTab];
  if (!listEl) return;
  const items = Array.from(listEl.querySelectorAll('.template-item'));
  let visible = 0;
  items.forEach(li => {
    const okGroup = listFilter.group === '__all' || li.dataset.group === listFilter.group;
    const okSearch = !listFilter.search || li.textContent.toLowerCase().includes(listFilter.search);
    const show = okGroup && okSearch;
    li.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  // Show a hint when everything is filtered out
  let noMatch = listEl.querySelector('.no-match-item');
  if (items.length > 0 && visible === 0) {
    if (!noMatch) {
      noMatch = document.createElement('li');
      noMatch.className = 'no-match-item';
      noMatch.style.cssText = 'padding:20px;text-align:center;color:#888;';
      noMatch.textContent = 'No matches found.';
      listEl.appendChild(noMatch);
    }
    noMatch.style.display = '';
  } else if (noMatch) {
    noMatch.style.display = 'none';
  }
}

function handleExport() {
    chrome.storage.local.get(null, (items) => {
        const exportData = {
            version: '1.1',
            timestamp: new Date().toISOString(),
            data: {
                templates: items[STORAGE_KEYS.templates] || [],
                templatesElk: items[STORAGE_KEYS.templatesElk] || [],
                indexes: items[STORAGE_KEYS.indexes] || [],
                macros: items[STORAGE_KEYS.macros] || [],
                rest: items[STORAGE_KEYS.rest] || [],
                esql: items[STORAGE_KEYS.esql] || [],
                dataviews: items[STORAGE_KEYS.dataviews] || []
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spabot_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus('Data exported successfully.');
    });
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if (!json.data) throw new Error('Invalid backup format');
            
            if (!confirm('This will MERGE imported data with your existing data. Continue?')) {
                fileImport.value = '';
                return;
            }
            
            // Merge logic
            chrome.storage.local.get(null, (currentItems) => {
                const newItems = {};
                
                // Helper to merge lists unique by 'name'
                const mergeList = (current, incoming) => {
                    const map = new Map();
                    (current || []).forEach(i => map.set(i.name, i));
                    (incoming || []).forEach(i => map.set(i.name, i)); // Overwrite duplicates
                    return Array.from(map.values());
                };
                
                newItems[STORAGE_KEYS.templates] = mergeList(currentItems[STORAGE_KEYS.templates], json.data.templates);
                newItems[STORAGE_KEYS.templatesElk] = mergeList(currentItems[STORAGE_KEYS.templatesElk], json.data.templatesElk);
                newItems[STORAGE_KEYS.indexes] = mergeList(currentItems[STORAGE_KEYS.indexes], json.data.indexes);
                newItems[STORAGE_KEYS.macros] = mergeList(currentItems[STORAGE_KEYS.macros], json.data.macros);
                newItems[STORAGE_KEYS.rest] = mergeList(currentItems[STORAGE_KEYS.rest], json.data.rest);
                newItems[STORAGE_KEYS.esql] = mergeList(currentItems[STORAGE_KEYS.esql], json.data.esql);
                newItems[STORAGE_KEYS.dataviews] = mergeList(currentItems[STORAGE_KEYS.dataviews], json.data.dataviews);
                
                chrome.storage.local.set(newItems, () => {
                    showStatus('Data imported and merged successfully!');
                    fileImport.value = ''; // Reset
                    // Reload current view if needed
                    if (currentTab !== 'settings') loadData();
                });
            });
            
        } catch (err) {
            alert('Import failed: ' + err.message);
            fileImport.value = '';
        }
    };
    reader.readAsText(file);
}

function handleHashParams() {
    if (!window.location.hash) return;
    
    // Parse hash params: #tab=templates&name=foo&value=bar
    // URLSearchParams can parse query strings, let's strip the #
    const hash = window.location.hash.substring(1); 
    const params = new URLSearchParams(hash);
    
    const tab = params.get('tab');
    if (tab && ['templates', 'templatesElk', 'indexes', 'macros', 'rest', 'esql', 'dataviews'].includes(tab)) {
        // Switch tab
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
        if (tabBtn) tabBtn.click();
        
        // Wait for data load? loadData is async.
        // We can hook into loadData or just set a timeout/flag.
        // Or simpler: Pre-fill the modal and open it after a short delay.
        
        const name = params.get('name') || '';
        const value = params.get('value') || '';
        const group = params.get('group') || '';
        
        // We want to open the "Add" modal with these values.
        // We can open modal immediately after a small delay to ensure DOM is ready/switched.
        
        setTimeout(() => {
            openModal(-1);

            // Override values
            if (name) itemName.value = name;

            if (isTemplateTab(currentTab)) {
                if (value) itemContent.value = value;
                const itemGroup = document.getElementById('itemGroup');
                if (itemGroup && group) itemGroup.value = group;
            } else {
                // Indexes, Macros, Rest, ES|QL, Dataviews use 'desc' field mapping to itemContent
                if (value) itemContent.value = value;
            }
            
            // Clean hash to avoid reopening on refresh
            history.replaceState(null, null, ' ');
        }, 300);
    }
}

function loadSettings() {
  chrome.storage.local.get([STORAGE_KEYS.settings], (result) => {
    const settings = result[STORAGE_KEYS.settings] || { quietMode: false, skin: 'default', bubble: 'default' };
    quietModeCheckbox.checked = settings.quietMode;
    
    renderAppearanceOptions(settings.skin || 'default', settings.bubble || 'default');
    updatePreview(settings.skin || 'default', settings.bubble || 'default');
  });
}

function saveSettings() {
  // Get selected skin and bubble
  const selectedSkin = document.querySelector('input[name="skin"]:checked').value;
  const selectedBubble = document.querySelector('input[name="bubble"]:checked').value;

  const settings = {
    quietMode: quietModeCheckbox.checked,
    skin: selectedSkin,
    bubble: selectedBubble
  };
  chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings }, () => {
    // Silent success: the live preview is the feedback. Showing the top
    // "Settings saved." banner on every radio/checkbox click shifts the
    // page layout (visible jitter) and is noisy. Only report errors.
    if (chrome.runtime.lastError) {
      showStatus('Error saving settings: ' + chrome.runtime.lastError.message);
      setTimeout(() => { showStatus(''); }, 3000);
    }
  });
}

function renderAppearanceOptions(currentSkin, currentBubble) {
    const skinContainer = document.getElementById('skinSelector');
    const bubbleContainer = document.getElementById('bubbleSelector');
    
    if (!skinContainer || !bubbleContainer) return;
    
    // Render Skins
    skinContainer.innerHTML = SKIN_OPTIONS.map(opt => `
        <label style="cursor: pointer; display: flex; align-items: center;">
            <input type="radio" name="skin" value="${opt.value}" ${opt.value === currentSkin ? 'checked' : ''} style="margin-right: 8px;">
            ${opt.label}
        </label>
    `).join('');
    
    // Render Bubbles
    bubbleContainer.innerHTML = BUBBLE_OPTIONS.map(opt => `
        <label style="cursor: pointer; display: flex; align-items: center;">
            <input type="radio" name="bubble" value="${opt.value}" ${opt.value === currentBubble ? 'checked' : ''} style="margin-right: 8px;">
            ${opt.label}
        </label>
    `).join('');
    
    // Bind change events for preview
    document.querySelectorAll('input[name="skin"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const bubble = document.querySelector('input[name="bubble"]:checked').value;
            updatePreview(e.target.value, bubble);
            saveSettings(); // Auto-save on change? User requested "configure", auto-save is nice.
        });
    });
    
    document.querySelectorAll('input[name="bubble"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const skin = document.querySelector('input[name="skin"]:checked').value;
            updatePreview(skin, e.target.value);
            saveSettings();
        });
    });
}

function updatePreview(skin, bubble) {
    const wrapper = document.getElementById('previewWrapper');
    const bubbleEl = document.getElementById('previewBubble');

    if (!wrapper || !bubbleEl) return;

    // Reset classes
    wrapper.className = 'spabot-wrapper';
    bubbleEl.className = 'spabot-speech-bubble visible';

    // Apply Skin
    if (skin !== 'default') {
        wrapper.classList.add(`spabot-skin-${skin}`);
    }

    // Apply Bubble
    if (bubble !== 'default') {
        bubbleEl.classList.add(`spabot-bubble-${bubble}`);
    }

    // Shape skins (ufo/cat/astro/octo/...) use a different DOM:
    // rebuild the preview icon instead of only toggling classes
    const oldIcon = wrapper.querySelector('.spabot-icon');
    if (oldIcon) oldIcon.remove();
    wrapper.insertBefore(buildIcon(skin), wrapper.firstChild);
}

function loadData() {
  const key = STORAGE_KEYS[currentTab];
  
  chrome.storage.local.get([key], (result) => {
    if (chrome.runtime.lastError) {
      showStatus('Error loading: ' + chrome.runtime.lastError.message);
      return;
    }
    
    // Check if data is uninitialized (undefined)
    if (result[key] === undefined) {
      // Initialize with defaults
      let defaults = [];
      if (currentTab === 'templates' && window.SPABOT_DEFAULT_SAVED_SEARCHES) {
        defaults = window.SPABOT_DEFAULT_SAVED_SEARCHES;
      } else if (currentTab === 'templatesElk' && window.SPABOT_DEFAULT_ELK_SAVED_SEARCHES) {
        defaults = window.SPABOT_DEFAULT_ELK_SAVED_SEARCHES;
      } else if (currentTab === 'indexes' && window.SPABOT_DEFAULT_INDEXES) {
        defaults = window.SPABOT_DEFAULT_INDEXES;
      } else if (currentTab === 'macros' && window.SPABOT_DEFAULT_MACROS) {
        defaults = window.SPABOT_DEFAULT_MACROS;
      } else if (currentTab === 'rest' && window.SPABOT_DEFAULT_REST) {
        defaults = window.SPABOT_DEFAULT_REST;
      } else if (currentTab === 'esql' && window.SPABOT_DEFAULT_ESQL_REFERENCE) {
        defaults = window.SPABOT_DEFAULT_ESQL_REFERENCE;
      } else if (currentTab === 'dataviews' && window.SPABOT_DEFAULT_ELK_DATAVIEWS) {
        defaults = window.SPABOT_DEFAULT_ELK_DATAVIEWS;
      }
      
      // Save defaults to storage then render
      chrome.storage.local.set({ [key]: defaults }, () => {
        currentData = defaults;
        renderList();
      });
    } else {
      // Data exists (could be empty array if user deleted all)
      currentData = result[key] || [];
      renderList();
    }
  });
}

function saveData() {
  const key = STORAGE_KEYS[currentTab];
  chrome.storage.local.set({ [key]: currentData }, () => {
    if (chrome.runtime.lastError) {
      showStatus('Error saving: ' + chrome.runtime.lastError.message);
    } else {
      showStatus('Saved successfully!');
      setTimeout(() => { showStatus(''); }, 2000);
      renderList();
    }
  });
}

function renderList() {
  const listEl = lists[currentTab];
  listEl.innerHTML = '';
  
  if (currentData.length === 0) {
    listEl.innerHTML = '<li style="padding:20px; text-align:center; color:#888;">No custom items yet.</li>';
    return;
  }

  currentData.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'template-item';
    li.dataset.group = (isTemplateTab(currentTab) && item.group) ? item.group : '';
    
    let title = '', content = '', groupHtml = '';
    if (isTemplateTab(currentTab)) {
      title = item.name || item.label;
      content = item.value || item.code;
      if (item.group) {
        groupHtml = `<span style="background:#e0e0e0; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:8px; color:#555;">📁 ${escapeHtml(item.group)}</span>`;
      }
    } else {
      title = item.name;
      content = item.desc;
    }
    
    li.innerHTML = `
      <div class="template-info">
        <div class="template-label">${groupHtml}${escapeHtml(title)}</div>
        <div class="template-code">${escapeHtml(content)}</div>
      </div>
      <div class="actions">
        <button class="btn-edit" data-index="${index}">Edit</button>
        <button class="btn-delete" data-index="${index}">Delete</button>
      </div>
    `;
    
    listEl.appendChild(li);
  });

  // Bind events
  listEl.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => openModal(parseInt(e.target.dataset.index)));
  });
  
  listEl.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => deleteItem(parseInt(e.target.dataset.index)));
  });

  // Apply toolbar state (rebuild group chips for the fresh data)
  refreshGroupChips();
  applyListFilter();
}

function deleteItem(index) {
  if (confirm('Are you sure you want to delete this item?')) {
    currentData.splice(index, 1);
    saveData();
  }
}

function openModal(index) {
  editIndex = index;
  modal.style.display = 'flex';
  
  // Adjust labels based on tab
  if (isTemplateTab(currentTab)) {
    const isElk = currentTab === 'templatesElk';
    modalTitle.innerText = index === -1
      ? (isElk ? 'Add ELK Search' : 'Add Saved Search')
      : (isElk ? 'Edit ELK Search' : 'Edit Saved Search');
    
    // Inject custom form for Saved Search (with Group)
    // Check if group input exists, if not create it
    let groupGroup = document.getElementById('groupGroup');
    if (!groupGroup) {
        // Collect existing groups
        const groups = new Set();
        currentData.forEach(item => {
            if (item.group) groups.add(item.group);
        });
        const datalistOptions = Array.from(groups).sort().map(g => `<option value="${escapeHtml(g)}">`).join('');
        
        // Create the group input field structure
        const groupDiv = document.createElement('div');
        groupDiv.className = 'form-group';
        groupDiv.id = 'groupGroup';
        groupDiv.innerHTML = `
            <label>Group (Optional)</label>
            <input type="text" id="itemGroup" list="spabot-options-group-list" placeholder="Select or type new group...">
            <datalist id="spabot-options-group-list">
                ${datalistOptions}
            </datalist>
        `;
        // Insert after Name field
        itemName.parentElement.after(groupDiv);
    } else {
        groupGroup.style.display = 'block';
        // Refresh datalist options on re-open
        const groups = new Set();
        currentData.forEach(item => {
            if (item.group) groups.add(item.group);
        });
        const datalistOptions = Array.from(groups).sort().map(g => `<option value="${escapeHtml(g)}">`).join('');
        const datalist = document.getElementById('spabot-options-group-list');
        if (datalist) datalist.innerHTML = datalistOptions;
    }
    
    contentLabel.innerText = isElk ? 'ES|QL Query' : 'SPL Query';
    itemContent.placeholder = isElk ? 'FROM logs-* | WHERE ...' : 'index=_internal ...';

  } else {
    // For other tabs, hide the group field if it exists
    const groupGroup = document.getElementById('groupGroup');
    if (groupGroup) {
        groupGroup.style.display = 'none';
    }

    if (currentTab === 'indexes') {
        modalTitle.innerText = index === -1 ? 'Add Index' : 'Edit Index';
        contentLabel.innerText = 'Description';
        itemContent.placeholder = 'Description for this index...';
    } else if (currentTab === 'macros') {
        modalTitle.innerText = index === -1 ? 'Add Macro' : 'Edit Macro';
        contentLabel.innerText = 'Description';
        itemContent.placeholder = 'Description for this macro...';
    } else if (currentTab === 'esql') {
        modalTitle.innerText = index === -1 ? 'Add ES|QL Syntax' : 'Edit ES|QL Syntax';
        contentLabel.innerText = 'Syntax / Example';
        itemContent.placeholder = '| WHERE error.message IS NOT NULL';
    } else if (currentTab === 'dataviews') {
        modalTitle.innerText = index === -1 ? 'Add Data View' : 'Edit Data View';
        contentLabel.innerText = 'Description';
        itemContent.placeholder = 'Description for this data view...';
    } else {
        modalTitle.innerText = index === -1 ? 'Add REST Endpoint' : 'Edit REST Endpoint';
        contentLabel.innerText = 'Description';
        itemContent.placeholder = 'Description for this endpoint...';
    }
  }
  
  if (index === -1) {
    itemName.value = '';
    itemContent.value = '';
    const itemGroup = document.getElementById('itemGroup');
    if (itemGroup) itemGroup.value = '';
  } else {
    const item = currentData[index];
    if (isTemplateTab(currentTab)) {
      itemName.value = item.label || item.name; // Compat
      itemContent.value = item.code || item.value; // Compat
      const itemGroup = document.getElementById('itemGroup');
      if (itemGroup) itemGroup.value = item.group || '';
    } else {
      itemName.value = item.name;
      itemContent.value = item.desc;
    }
  }
  
  itemName.focus();
}

function closeModal() {
  modal.style.display = 'none';
}

function handleSave() {
  const nameVal = itemName.value.trim();
  const contentVal = itemContent.value; 
  const itemGroup = document.getElementById('itemGroup');
  const groupVal = itemGroup ? itemGroup.value.trim() : '';

  if (!nameVal) {
    alert('Please enter a name.');
    return;
  }
  
  if (!contentVal && isTemplateTab(currentTab)) {
    alert('Please enter content.');
    return;
  }

  let newItem;
  if (isTemplateTab(currentTab)) {
    // Schema: { name, value, group, desc? }
    newItem = { 
        name: nameVal, 
        value: contentVal, 
        group: groupVal,
        label: nameVal, // Keep for backward compat
        code: contentVal // Keep for backward compat
    };
  } else {
    newItem = { name: nameVal, desc: contentVal };
  }
  
  if (editIndex === -1) {
    currentData.push(newItem);
  } else {
    currentData[editIndex] = newItem;
  }
  
  saveData();
  closeModal();
}

// Event Listeners
Object.values(addBtns).forEach(btn => {
  if(btn) btn.addEventListener('click', () => openModal(-1));
});

cancelBtn.addEventListener('click', closeModal);
saveBtn.addEventListener('click', handleSave);

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showStatus(msg) {
  statusDiv.innerText = msg;
}
