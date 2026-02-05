// options.js - Logic for the Options Page

const STORAGE_KEYS = {
  templates: 'spabot_custom_templates',
  indexes: 'spabot_custom_indexes',
  macros: 'spabot_custom_macros',
  rest: 'spabot_custom_rest',
  settings: 'spabot_settings'
};

let currentTab = 'templates';
let currentData = [];
let editIndex = -1; // -1 for add, >= 0 for edit

// DOM Elements
const tabs = document.querySelectorAll('.tab-btn');
const containers = document.querySelectorAll('.container');
const lists = {
  templates: document.getElementById('templateList'),
  indexes: document.getElementById('indexList'),
  macros: document.getElementById('macroList'),
  rest: document.getElementById('restList')
};
const addBtns = {
  templates: document.getElementById('addTplBtn'),
  indexes: document.getElementById('addIdxBtn'),
  macros: document.getElementById('addMacBtn'),
  rest: document.getElementById('addRestBtn')
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
      if (currentTab !== 'settings') {
        loadData();
      }
    });
  });

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

function handleExport() {
    chrome.storage.local.get(null, (items) => {
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: {
                templates: items[STORAGE_KEYS.templates] || [],
                indexes: items[STORAGE_KEYS.indexes] || [],
                macros: items[STORAGE_KEYS.macros] || [],
                rest: items[STORAGE_KEYS.rest] || []
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
                newItems[STORAGE_KEYS.indexes] = mergeList(currentItems[STORAGE_KEYS.indexes], json.data.indexes);
                newItems[STORAGE_KEYS.macros] = mergeList(currentItems[STORAGE_KEYS.macros], json.data.macros);
                newItems[STORAGE_KEYS.rest] = mergeList(currentItems[STORAGE_KEYS.rest], json.data.rest);
                
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
    if (tab && ['templates', 'indexes', 'macros', 'rest'].includes(tab)) {
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
            
            if (currentTab === 'templates') {
                if (value) itemContent.value = value;
                const itemGroup = document.getElementById('itemGroup');
                if (itemGroup && group) itemGroup.value = group;
            } else {
                // Indexes, Macros, Rest use 'desc' field mapping to itemContent
                if (value) itemContent.value = value; 
            }
            
            // Clean hash to avoid reopening on refresh
            history.replaceState(null, null, ' ');
        }, 300);
    }
}

function loadSettings() {
  chrome.storage.local.get([STORAGE_KEYS.settings], (result) => {
    const settings = result[STORAGE_KEYS.settings] || { quietMode: false };
    quietModeCheckbox.checked = settings.quietMode;
  });
}

function saveSettings() {
  const settings = {
    quietMode: quietModeCheckbox.checked
  };
  chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings }, () => {
    showStatus('Settings saved.');
    setTimeout(() => { showStatus(''); }, 2000);
  });
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
      } else if (currentTab === 'indexes' && window.SPABOT_DEFAULT_INDEXES) {
        defaults = window.SPABOT_DEFAULT_INDEXES;
      } else if (currentTab === 'macros' && window.SPABOT_DEFAULT_MACROS) {
        defaults = window.SPABOT_DEFAULT_MACROS;
      } else if (currentTab === 'rest' && window.SPABOT_DEFAULT_REST) {
        defaults = window.SPABOT_DEFAULT_REST;
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
    
    let title = '', content = '', groupHtml = '';
    if (currentTab === 'templates') {
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
  if (currentTab === 'templates') {
    modalTitle.innerText = index === -1 ? 'Add Saved Search' : 'Edit Saved Search';
    
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
    
    contentLabel.innerText = 'SPL Query';
    itemContent.placeholder = 'index=_internal ...';
    
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
    if (currentTab === 'templates') {
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
  
  if (!contentVal && currentTab === 'templates') {
    alert('Please enter content.');
    return;
  }
  
  let newItem;
  if (currentTab === 'templates') {
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
