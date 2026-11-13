// menu_controller.js - UI and Logic for the Spabot Menu

(function(global) {

  // --- Platform Detection ---
  // This script loads before content.js, so detect from URL directly.
  const IS_ELK = location.pathname.includes('/app/discover');
  const PLATFORM = IS_ELK ? 'elk' : 'splunk';

  // --- Logic Helpers ---

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Format SPL removed as per user request (replaced by Index Reference)

  // --- Storage Helper ---
  const Storage = {
    // We now have multiple keys
    keys: {
      templates: 'spabot_custom_templates',
      templatesElk: 'spabot_custom_templates_elk',
      indexes: 'spabot_custom_indexes',
      macros: 'spabot_custom_macros',
      rest: 'spabot_custom_rest',
      esql: 'spabot_custom_esql',
      dataviews: 'spabot_custom_dataviews'
    },
    
    // Generic load
    load: function(key, callback) {
      if (!chrome.storage) {
        if (callback) callback(null); // Return null to indicate missing storage/env
        return;
      }
      try {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
             const msg = chrome.runtime.lastError.message;
             console.error('[Spabot] Storage load error:', msg);
             this.checkInvalidated(msg);
             if (callback) callback([]);
             return;
          }
          // Return raw result to distinguish undefined vs empty
          if (callback) callback(result[key]); 
        });
      } catch (e) {
        console.error('[Spabot] Storage access exception:', e);
        this.checkInvalidated(e.message);
        if (callback) callback([]);
      }
    },

    checkInvalidated: function(msg) {
        if (msg && msg.includes('Extension context invalidated')) {
            if (document.getElementById('spabot-invalidated-msg')) return;
            
            const div = document.createElement('div');
            div.id = 'spabot-invalidated-msg';
            Object.assign(div.style, {
                position: 'fixed', top: '0', left: '0', width: '100%',
                backgroundColor: '#d9534f', color: '#fff', textAlign: 'center',
                padding: '12px', zIndex: '2147483647', fontFamily: 'sans-serif',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)', fontSize: '14px'
            });
            div.innerHTML = '<strong>Spabot Updated</strong>: Please <a href="javascript:location.reload()" style="color:#fff;text-decoration:underline;font-weight:bold;">refresh the page</a> to reconnect.';
            
            const close = document.createElement('span');
            close.innerHTML = '&times;';
            close.style.cursor = 'pointer';
            close.style.marginLeft = '15px';
            close.style.opacity = '0.8';
            close.onclick = () => div.remove();
            div.appendChild(close);
            
            document.body.appendChild(div);
        }
    },

    // Initialize or Load
    initOrLoad: function(key, defaults, callback) {
      this.load(key, (data) => {
        if (data === undefined || data === null) {
           // Not initialized, save defaults
           const initialData = Array.isArray(defaults) ? defaults : [];
           chrome.storage.local.set({ [key]: initialData }, () => {
             if (callback) callback(initialData);
           });
        } else {
           // Already initialized
           if (callback) callback(data);
        }
      });
    },
    
    // Generic Save
    saveItem: function(key, item, callback) {
        this.load(key, (current) => {
            const list = Array.isArray(current) ? current : [];
            const updated = [...list, item];
            chrome.storage.local.set({ [key]: updated }, () => {
                if (callback) callback(updated);
            });
        });
    },

    // Specific Wrappers
    saveTemplate: function(template, callback) {
        this.saveItem(this.keys.templates, template, callback);
    },
    saveTemplateElk: function(template, callback) {
        this.saveItem(this.keys.templatesElk, template, callback);
    },
    saveIndex: function(item, callback) {
        this.saveItem(this.keys.indexes, item, callback);
    },
    saveMacro: function(item, callback) {
        this.saveItem(this.keys.macros, item, callback);
    },
    saveRest: function(item, callback) {
        this.saveItem(this.keys.rest, item, callback);
    },
    saveEsql: function(item, callback) {
        this.saveItem(this.keys.esql, item, callback);
    },
    saveDataview: function(item, callback) {
        this.saveItem(this.keys.dataviews, item, callback);
    }
  };

  // --- UI Controller ---

  const MenuController = {
    menuElement: null,
    tplListElement: null,
    inputElement: null,
    modalElement: null,
    indexModalElement: null,
    macroModalElement: null,
    restModalElement: null,
    capturedSelection: '', 
    
    activeTemplates: [],
    activeIndexList: [],
    activeMacroList: [],
    activeRestList: [],
    activeEsqlList: [],
    activeDataviewList: [],

    init: function(inputEl) {
      this.inputElement = inputEl;
      this.createMenuDOM();
      this.createModalDOM();
      if (IS_ELK) {
        this.createEsqlModalDOM();
        this.createDataviewModalDOM();
      } else {
        this.createIndexModalDOM();
        this.createMacroModalDOM();
        this.createRestModalDOM();
      }
      this.loadAllData();
    },

    loadAllData: function() {
      this.loadTemplates();
      if (IS_ELK) {
        this.loadEsql();
        this.loadDataviews();
      } else {
        this.loadIndexes();
        this.loadMacros();
        this.loadRest();
      }
    },

    loadTemplates: function() {
      const key = IS_ELK ? Storage.keys.templatesElk : Storage.keys.templates;
      const defaultDb = IS_ELK ? global.SPABOT_DEFAULT_ELK_SAVED_SEARCHES : global.SPABOT_DEFAULT_SAVED_SEARCHES;
      const defaults = (defaultDb && Array.isArray(defaultDb)) ? defaultDb : [];

      Storage.initOrLoad(key, defaults, (data) => {
        this.activeTemplates = data;
        this.renderTemplateList();
      });
    },

    loadEsql: function() {
      const defaults = (global.SPABOT_DEFAULT_ESQL_REFERENCE && Array.isArray(global.SPABOT_DEFAULT_ESQL_REFERENCE))
        ? global.SPABOT_DEFAULT_ESQL_REFERENCE
        : [];

      Storage.initOrLoad(Storage.keys.esql, defaults, (data) => {
        this.activeEsqlList = data;
        // If modal is open, re-render
        if (this.esqlModalElement && this.esqlModalElement.style.display === 'flex') {
           const searchInput = document.getElementById('spabot-esql-search');
           this.renderEsqlList(searchInput ? searchInput.value : '');
        }
      });
    },

    loadDataviews: function() {
      const defaults = (global.SPABOT_DEFAULT_ELK_DATAVIEWS && Array.isArray(global.SPABOT_DEFAULT_ELK_DATAVIEWS))
        ? global.SPABOT_DEFAULT_ELK_DATAVIEWS
        : [];

      Storage.initOrLoad(Storage.keys.dataviews, defaults, (data) => {
        this.activeDataviewList = data;
        // If modal is open, re-render
        if (this.dataviewModalElement && this.dataviewModalElement.style.display === 'flex') {
           const searchInput = document.getElementById('spabot-dv-search');
           this.renderDataviewList(searchInput ? searchInput.value : '');
        }
      });
    },

    loadIndexes: function() {
      const defaults = (global.SPABOT_DEFAULT_INDEXES && Array.isArray(global.SPABOT_DEFAULT_INDEXES))
        ? global.SPABOT_DEFAULT_INDEXES
        : [];
        
      Storage.initOrLoad(Storage.keys.indexes, defaults, (data) => {
        this.activeIndexList = data;
        // If modal is open, re-render
        if (this.indexModalElement && this.indexModalElement.style.display === 'flex') {
           const searchInput = document.getElementById('spabot-idx-search');
           this.renderIndexList(searchInput ? searchInput.value : '');
        }
      });
    },

    loadMacros: function() {
      const defaults = (global.SPABOT_DEFAULT_MACROS && Array.isArray(global.SPABOT_DEFAULT_MACROS))
        ? global.SPABOT_DEFAULT_MACROS
        : [];
        
      Storage.initOrLoad(Storage.keys.macros, defaults, (data) => {
        this.activeMacroList = data;
        // If modal is open, re-render
        if (this.macroModalElement && this.macroModalElement.style.display === 'flex') {
           const searchInput = document.getElementById('spabot-mac-search');
           this.renderMacroList(searchInput ? searchInput.value : '');
        }
      });
    },

    loadRest: function() {
      const defaults = (global.SPABOT_DEFAULT_REST && Array.isArray(global.SPABOT_DEFAULT_REST))
        ? global.SPABOT_DEFAULT_REST
        : [];
        
      Storage.initOrLoad(Storage.keys.rest, defaults, (data) => {
        this.activeRestList = data;
        // If modal is open, re-render
        if (this.restModalElement && this.restModalElement.style.display === 'flex') {
           const searchInput = document.getElementById('spabot-rest-search');
           this.renderRestList(searchInput ? searchInput.value : '');
        }
      });
    },

    createMenuDOM: function() {
      if (this.menuElement) return;

      const menu = document.createElement('div');
      menu.className = 'spabot-menu';
      menu.style.display = 'none';

      // Helper to create Header with Add Button
      const createHeader = (title, onClickAdd) => {
          const header = document.createElement('div');
          header.className = 'spabot-menu-header';
          
          const titleSpan = document.createElement('span');
          titleSpan.innerText = title;
          header.appendChild(titleSpan);

          const addBtn = document.createElement('span');
          addBtn.className = 'spabot-add-btn';
          addBtn.innerHTML = '+';
          addBtn.title = 'Add New';
          addBtn.onclick = (e) => {
            // Prevent event propagation to avoid closing menu immediately if logic is async
            e.stopPropagation();
            e.preventDefault(); 
            onClickAdd();
            this.hide(); 
          };
          header.appendChild(addBtn);
          return header;
      };

      // 1. Saved Search Section
      const tplHeader = createHeader('Saved Search', () => {
          // Open Modal instead of Options Page
          const selection = this.capturedSelection || window.getSelection().toString();
          this.openUniversalAddModal('templates', { value: selection });
      });

      // Insert Search Icon Button into Header
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'spabot-header-actions';
      
      // Move the existing Add Button into actionsDiv
      const existingAddBtn = tplHeader.querySelector('.spabot-add-btn');
      if (existingAddBtn) {
          // Remove from header directly, we will re-append inside actionsDiv
          tplHeader.removeChild(existingAddBtn);
          
          const searchBtn = document.createElement('span');
          searchBtn.className = 'spabot-search-btn';
          searchBtn.innerHTML = '🔍'; // Magnifying glass emoji or SVG
          searchBtn.title = 'Search Saved Items';
          searchBtn.onclick = (e) => {
              e.stopPropagation();
              this.toggleSearchBox();
          };
          
          actionsDiv.appendChild(searchBtn);
          actionsDiv.appendChild(existingAddBtn); // Add button last
          
          tplHeader.appendChild(actionsDiv);
      }
      
      menu.appendChild(tplHeader);
      
      // Search Box Container (Hidden by default)
      const searchBox = document.createElement('div');
      searchBox.className = 'spabot-menu-search-box';
      searchBox.id = 'spabot-tpl-search-container';
      searchBox.innerHTML = `<input type="text" id="spabot-tpl-search-input" placeholder="Filter...">`;
      menu.appendChild(searchBox);
      
      // Bind Search Event
      // Wait for DOM append? No, we can bind now but element is not in doc yet.
      // Better to bind on input element directly.
      const searchInput = searchBox.querySelector('input');
      searchInput.onclick = (e) => e.stopPropagation(); // Prevent menu close
      searchInput.addEventListener('input', (e) => {
          this.renderTemplateList(e.target.value);
      });

      const tplList = document.createElement('ul');
      tplList.className = 'spabot-menu-list';
      this.tplListElement = tplList;
      menu.appendChild(tplList);

      // 2. Tools Section Header
      const toolsHeader = document.createElement('div');
      toolsHeader.className = 'spabot-menu-header';
      toolsHeader.innerText = 'Tools';
      menu.appendChild(toolsHeader);

      const actList = document.createElement('ul');
      actList.className = 'spabot-menu-list';
      
      const createRefLi = (text, onOpen, onAdd) => {
          const li = document.createElement('li');
          li.style.display = 'flex';
          li.style.justifyContent = 'space-between';
          
          const textSpan = document.createElement('span');
          textSpan.innerText = text;
          textSpan.style.flexGrow = '1';
          textSpan.onclick = (e) => {
              e.stopPropagation();
              onOpen();
              this.hide();
          };
          
          const addSpan = document.createElement('span');
          addSpan.innerHTML = '+';
          addSpan.className = 'spabot-add-btn';
          addSpan.title = 'Add New';
          addSpan.onclick = (e) => {
              e.stopPropagation();
              onAdd();
              this.hide();
          };
          
          li.appendChild(textSpan);
          li.appendChild(addSpan);
          return li;
      };

      // Index Reference (Splunk only)
      if (!IS_ELK) {
        actList.appendChild(createRefLi('Index Reference',
          () => this.openIndexModal(),
          () => this.openUniversalAddModal('indexes')
        ));

        // Macro Reference
        actList.appendChild(createRefLi('Macro Reference',
          () => this.openMacroModal(),
          () => this.openUniversalAddModal('macros')
        ));

        // REST Reference
        actList.appendChild(createRefLi('REST Reference',
          () => this.openRestModal(),
          () => this.openUniversalAddModal('rest')
        ));
      } else {
        // ELK / Kibana specific references
        actList.appendChild(createRefLi('ES|QL Reference',
          () => this.openEsqlModal(),
          () => this.openUniversalAddModal('esql')
        ));

        actList.appendChild(createRefLi('Data View',
          () => this.openDataviewModal(),
          () => this.openUniversalAddModal('dataviews')
        ));
      }

      menu.appendChild(actList);
      
      // ... msg area ...
      const msgArea = document.createElement('div');
      msgArea.className = 'spabot-menu-msg';
      menu.appendChild(msgArea);
      this.msgArea = msgArea;

      document.body.appendChild(menu);
      this.menuElement = menu;
      
      document.addEventListener('click', (e) => {
        if (!this.menuElement) return;
        if (this.menuElement.style.display === 'block' && 
            !this.menuElement.contains(e.target) && 
            !e.target.closest('.spabot-wrapper')) {
          this.hide();
        }
      });
    },

    // --- Universal Add Modal ---
    
    getExistingGroups: function() {
        const groups = new Set();
        if (this.activeTemplates) {
            this.activeTemplates.forEach(t => {
                if (t.group) groups.add(t.group);
            });
        }
        return Array.from(groups).sort();
    },

    openUniversalAddModal: function(type, initialData = {}) {
        // Remove existing modal if any
        if (this.modalElement) {
            document.body.removeChild(this.modalElement);
            this.modalElement = null;
        }

        const modal = document.createElement('div');
        modal.className = 'spabot-modal-overlay';
        
        let title = 'Add Item';
        let fieldsHtml = '';
        
        if (type === 'templates') {
            title = IS_ELK ? 'Add Saved Search (ES|QL)' : 'Add Saved Search';

            // Build datalist options
            const groups = this.getExistingGroups();
            const datalistOptions = groups.map(g => `<option value="${this.escapeHtml(g)}">`).join('');

            const codeLabel = IS_ELK ? 'ES|QL Query' : 'SPL Code';
            const codePlaceholder = IS_ELK ? 'FROM logs-* | WHERE ...' : 'index=_internal ...';

            fieldsHtml = `
                <div class="spabot-form-group">
                    <label>Name</label>
                    <input type="text" id="spabot-add-name" placeholder="e.g. Error Logs" value="${this.escapeHtml(initialData.name || '')}">
                </div>
                <div class="spabot-form-group">
                    <label>Group (Optional)</label>
                    <input type="text" id="spabot-add-group" list="spabot-group-list" placeholder="Select or type new group..." value="${this.escapeHtml(initialData.group || '')}">
                    <datalist id="spabot-group-list">
                        ${datalistOptions}
                    </datalist>
                </div>
                <div class="spabot-form-group">
                    <label>${codeLabel}</label>
                    <textarea id="spabot-add-value" placeholder="${codePlaceholder}">${this.escapeHtml(initialData.value || '')}</textarea>
                </div>
            `;
        } else {
            // Index, Macro, Rest, ES|QL syntax, Data View
            const typeLabel = type === 'indexes' ? 'Index'
                : (type === 'macros' ? 'Macro'
                : (type === 'rest' ? 'REST Endpoint'
                : (type === 'esql' ? 'ES|QL Syntax' : 'Data View')));
            title = `Add ${typeLabel}`;
            const valLabel = 'Description';
            const valPlaceholder = `Description for this ${typeLabel.toLowerCase()}...`;

            fieldsHtml = `
                <div class="spabot-form-group">
                    <label>Name</label>
                    <input type="text" id="spabot-add-name" placeholder="Name..." value="${this.escapeHtml(initialData.name || '')}">
                </div>
                <div class="spabot-form-group">
                    <label>${valLabel}</label>
                    <textarea id="spabot-add-value" placeholder="${valPlaceholder}">${this.escapeHtml(initialData.desc || '')}</textarea>
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="spabot-modal-content">
                <h3>${title}</h3>
                ${fieldsHtml}
                <div class="spabot-modal-actions">
                    <button id="spabot-btn-cancel">Cancel</button>
                    <button id="spabot-btn-save" class="primary">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modalElement = modal;

        // Focus first input
        setTimeout(() => {
            const firstInput = document.getElementById('spabot-add-name');
            if (firstInput) firstInput.focus();
        }, 50);

        // Bind events
        document.getElementById('spabot-btn-cancel').onclick = () => {
            document.body.removeChild(modal);
            this.modalElement = null;
        };
        
        document.getElementById('spabot-btn-save').onclick = () => {
            const name = document.getElementById('spabot-add-name').value.trim();
            const value = document.getElementById('spabot-add-value').value;
            const groupEl = document.getElementById('spabot-add-group');
            const group = groupEl ? groupEl.value.trim() : '';

            if (!name) {
                alert('Please enter a name.');
                return;
            }

            if (type === 'templates') {
                if (!value) { alert(IS_ELK ? 'Please enter ES|QL code.' : 'Please enter SPL code.'); return; }
                const newItem = { name, value, group, label: name, code: value }; // Compat fields
                const saveTplFn = IS_ELK ? 'saveTemplateElk' : 'saveTemplate';
                Storage[saveTplFn](newItem, () => {
                    this.loadTemplates(); // Refresh menu data
                    document.body.removeChild(modal);
                    this.modalElement = null;
                    this.showMessage(`Saved "${name}"!`);
                    setTimeout(() => this.showMessage(''), 2000);
                });
            } else {
                const newItem = { name, desc: value };
                const saveFn = type === 'indexes' ? 'saveIndex'
                    : (type === 'macros' ? 'saveMacro'
                    : (type === 'rest' ? 'saveRest'
                    : (type === 'esql' ? 'saveEsql' : 'saveDataview')));
                Storage[saveFn](newItem, () => {
                    // Refresh specific list
                    if (type === 'indexes') this.loadIndexes();
                    if (type === 'macros') this.loadMacros();
                    if (type === 'rest') this.loadRest();
                    if (type === 'esql') this.loadEsql();
                    if (type === 'dataviews') this.loadDataviews();

                    document.body.removeChild(modal);
                    this.modalElement = null;
                    this.showMessage(`Saved "${name}"!`);
                    setTimeout(() => this.showMessage(''), 2000);
                });
            }
        };

        // Close on click outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                this.modalElement = null;
            }
        };
    },

    createModalDOM: function() {
        // Deprecated
    },
    
    // --- Index Modal ---
    createIndexModalDOM: function() {
      if (this.indexModalElement) return;

      const modal = document.createElement('div');
      modal.className = 'spabot-modal-overlay';
      modal.style.display = 'none';

      modal.innerHTML = `
          <div class="spabot-modal-content spabot-index-modal">
              <h3>Index Reference</h3>
              <div class="spabot-search-box">
                  <input type="text" id="spabot-idx-search" placeholder="Search indexes...">
              </div>
              <ul id="spabot-idx-list" class="spabot-scroll-list">
                  <!-- Items injected here -->
              </ul>
              <div class="spabot-modal-actions">
                  <button id="spabot-idx-close">Close</button>
              </div>
          </div>
      `;

      document.body.appendChild(modal);
      this.indexModalElement = modal;
      
      document.getElementById('spabot-idx-close').onclick = () => {
          this.indexModalElement.style.display = 'none';
      };
      
      // Close on click outside
      this.indexModalElement.onclick = (e) => {
          if (e.target === this.indexModalElement) {
              this.indexModalElement.style.display = 'none';
          }
      };
      
      // Live search
      const searchInput = document.getElementById('spabot-idx-search');
      searchInput.addEventListener('input', () => this.renderIndexList(searchInput.value));
    },

    // --- Macro Modal ---
    createMacroModalDOM: function() {
      if (this.macroModalElement) return;

      const modal = document.createElement('div');
      modal.className = 'spabot-modal-overlay';
      modal.style.display = 'none';

      modal.innerHTML = `
          <div class="spabot-modal-content spabot-index-modal">
              <h3>Macro Reference</h3>
              <div class="spabot-search-box">
                  <input type="text" id="spabot-mac-search" placeholder="Search macros...">
              </div>
              <ul id="spabot-mac-list" class="spabot-scroll-list">
                  <!-- Items injected here -->
              </ul>
              <div class="spabot-modal-actions">
                  <button id="spabot-mac-close">Close</button>
              </div>
          </div>
      `;

      document.body.appendChild(modal);
      this.macroModalElement = modal;
      
      document.getElementById('spabot-mac-close').onclick = () => {
          this.macroModalElement.style.display = 'none';
      };
      
      // Close on click outside
      this.macroModalElement.onclick = (e) => {
          if (e.target === this.macroModalElement) {
              this.macroModalElement.style.display = 'none';
          }
      };
      
      // Live search
      const searchInput = document.getElementById('spabot-mac-search');
      searchInput.addEventListener('input', () => this.renderMacroList(searchInput.value));
    },

    // --- REST Modal ---
    createRestModalDOM: function() {
      if (this.restModalElement) return;

      const modal = document.createElement('div');
      modal.className = 'spabot-modal-overlay';
      modal.style.display = 'none';

      modal.innerHTML = `
          <div class="spabot-modal-content spabot-index-modal">
              <h3>REST Reference</h3>
              <div class="spabot-search-box">
                  <input type="text" id="spabot-rest-search" placeholder="Search REST endpoints...">
              </div>
              <ul id="spabot-rest-list" class="spabot-scroll-list">
                  <!-- Items injected here -->
              </ul>
              <div class="spabot-modal-actions">
                  <button id="spabot-rest-close">Close</button>
              </div>
          </div>
      `;

      document.body.appendChild(modal);
      this.restModalElement = modal;
      
      document.getElementById('spabot-rest-close').onclick = () => {
          this.restModalElement.style.display = 'none';
      };
      
      // Close on click outside
      this.restModalElement.onclick = (e) => {
          if (e.target === this.restModalElement) {
              this.restModalElement.style.display = 'none';
          }
      };
      
      // Live search
      const searchInput = document.getElementById('spabot-rest-search');
      searchInput.addEventListener('input', () => this.renderRestList(searchInput.value));
    },

    // --- ES|QL Reference Modal (ELK) ---
    createEsqlModalDOM: function() {
      if (this.esqlModalElement) return;

      const modal = document.createElement('div');
      modal.className = 'spabot-modal-overlay';
      modal.style.display = 'none';

      modal.innerHTML = `
          <div class="spabot-modal-content spabot-index-modal">
              <h3>ES|QL Reference</h3>
              <div class="spabot-search-box">
                  <input type="text" id="spabot-esql-search" placeholder="Search ES|QL syntax...">
              </div>
              <ul id="spabot-esql-list" class="spabot-scroll-list">
                  <!-- Items injected here -->
              </ul>
              <div class="spabot-modal-actions">
                  <button id="spabot-esql-close">Close</button>
              </div>
          </div>
      `;

      document.body.appendChild(modal);
      this.esqlModalElement = modal;

      document.getElementById('spabot-esql-close').onclick = () => {
          this.esqlModalElement.style.display = 'none';
      };

      // Close on click outside
      this.esqlModalElement.onclick = (e) => {
          if (e.target === this.esqlModalElement) {
              this.esqlModalElement.style.display = 'none';
          }
      };

      // Live search
      const searchInput = document.getElementById('spabot-esql-search');
      searchInput.addEventListener('input', () => this.renderEsqlList(searchInput.value));
    },

    // --- Data View Modal (ELK) ---
    createDataviewModalDOM: function() {
      if (this.dataviewModalElement) return;

      const modal = document.createElement('div');
      modal.className = 'spabot-modal-overlay';
      modal.style.display = 'none';

      modal.innerHTML = `
          <div class="spabot-modal-content spabot-index-modal">
              <h3>Data View</h3>
              <div class="spabot-search-box">
                  <input type="text" id="spabot-dv-search" placeholder="Search data views...">
              </div>
              <ul id="spabot-dv-list" class="spabot-scroll-list">
                  <!-- Items injected here -->
              </ul>
              <div class="spabot-modal-actions">
                  <button id="spabot-dv-close">Close</button>
              </div>
          </div>
      `;

      document.body.appendChild(modal);
      this.dataviewModalElement = modal;

      document.getElementById('spabot-dv-close').onclick = () => {
          this.dataviewModalElement.style.display = 'none';
      };

      // Close on click outside
      this.dataviewModalElement.onclick = (e) => {
          if (e.target === this.dataviewModalElement) {
              this.dataviewModalElement.style.display = 'none';
          }
      };

      // Live search
      const searchInput = document.getElementById('spabot-dv-search');
      searchInput.addEventListener('input', () => this.renderDataviewList(searchInput.value));
    },

    openEsqlModal: function() {
        if (!this.esqlModalElement) return;
        this.loadEsql(); // Refresh data
        this.esqlModalElement.style.display = 'flex';
        document.getElementById('spabot-esql-search').value = '';
        document.getElementById('spabot-esql-search').focus();
        this.renderEsqlList('');
    },

    openDataviewModal: function() {
        if (!this.dataviewModalElement) return;
        this.loadDataviews(); // Refresh data
        this.dataviewModalElement.style.display = 'flex';
        document.getElementById('spabot-dv-search').value = '';
        document.getElementById('spabot-dv-search').focus();
        this.renderDataviewList('');
    },

    renderEsqlList: function(filterText) {
        const listEl = document.getElementById('spabot-esql-list');
        listEl.innerHTML = '';

        const esqlItems = this.activeEsqlList || [];
        const lowerFilter = filterText.toLowerCase();

        const filtered = esqlItems.filter(item =>
            item.name.toLowerCase().includes(lowerFilter) ||
            (item.desc && item.desc.toLowerCase().includes(lowerFilter))
        );

        if (filtered.length === 0) {
            listEl.innerHTML = '<li class="empty">No ES|QL syntax found</li>';
            return;
        }

        filtered.forEach(item => {
            const li = document.createElement('li');
            li.className = 'spabot-idx-item';
            li.innerHTML = `
                <div class="idx-name">${this.escapeHtml(item.name)}</div>
                <div class="idx-desc">${this.escapeHtml(item.desc)}</div>
            `;
            li.onclick = () => {
                this.insertCode(item.desc || item.name, false); // Insert syntax snippet
                this.esqlModalElement.style.display = 'none';
            };
            listEl.appendChild(li);
        });
    },

    renderDataviewList: function(filterText) {
        const listEl = document.getElementById('spabot-dv-list');
        listEl.innerHTML = '';

        const dvs = this.activeDataviewList || [];
        const lowerFilter = filterText.toLowerCase();

        const filtered = dvs.filter(dv =>
            dv.name.toLowerCase().includes(lowerFilter) ||
            (dv.desc && dv.desc.toLowerCase().includes(lowerFilter))
        );

        if (filtered.length === 0) {
            listEl.innerHTML = '<li class="empty">No data views found</li>';
            return;
        }

        filtered.forEach(dv => {
            const li = document.createElement('li');
            li.className = 'spabot-idx-item';
            li.innerHTML = `
                <div class="idx-name">${this.escapeHtml(dv.name)}</div>
                <div class="idx-desc">${this.escapeHtml(dv.desc)}</div>
            `;
            li.onclick = () => {
                this.insertCode(dv.name, false); // Insert data view name
                this.dataviewModalElement.style.display = 'none';
            };
            listEl.appendChild(li);
        });
    },

    openIndexModal: function() {
        if (!this.indexModalElement) return;
        this.loadIndexes(); // Refresh data
        this.indexModalElement.style.display = 'flex';
        document.getElementById('spabot-idx-search').value = '';
        document.getElementById('spabot-idx-search').focus();
        this.renderIndexList('');
    },

    openMacroModal: function() {
        if (!this.macroModalElement) return;
        this.loadMacros(); // Refresh data
        this.macroModalElement.style.display = 'flex';
        document.getElementById('spabot-mac-search').value = '';
        document.getElementById('spabot-mac-search').focus();
        this.renderMacroList('');
    },

    openRestModal: function() {
        if (!this.restModalElement) return;
        this.loadRest(); // Refresh data
        this.restModalElement.style.display = 'flex';
        document.getElementById('spabot-rest-search').value = '';
        document.getElementById('spabot-rest-search').focus();
        this.renderRestList('');
    },

    renderIndexList: function(filterText) {
        const listEl = document.getElementById('spabot-idx-list');
        listEl.innerHTML = '';
        
        const indexes = this.activeIndexList || [];
        const lowerFilter = filterText.toLowerCase();
        
        const filtered = indexes.filter(idx => 
            idx.name.toLowerCase().includes(lowerFilter) || 
            (idx.desc && idx.desc.toLowerCase().includes(lowerFilter))
        );

        if (filtered.length === 0) {
            listEl.innerHTML = '<li class="empty">No indexes found</li>';
            return;
        }

        filtered.forEach(idx => {
            const li = document.createElement('li');
            li.className = 'spabot-idx-item';
            li.innerHTML = `
                <div class="idx-name">${this.escapeHtml(idx.name)}</div>
                <div class="idx-desc">${this.escapeHtml(idx.desc)}</div>
            `;
            li.onclick = () => {
                this.insertCode(`index=${idx.name}`, false); // Insert at cursor
                this.indexModalElement.style.display = 'none';
            };
            listEl.appendChild(li);
        });
    },

    renderMacroList: function(filterText) {
        const listEl = document.getElementById('spabot-mac-list');
        listEl.innerHTML = '';
        
        const macros = this.activeMacroList || [];
        const lowerFilter = filterText.toLowerCase();
        
        const filtered = macros.filter(mac => 
            mac.name.toLowerCase().includes(lowerFilter) || 
            (mac.desc && mac.desc.toLowerCase().includes(lowerFilter))
        );

        if (filtered.length === 0) {
            listEl.innerHTML = '<li class="empty">No macros found</li>';
            return;
        }

        filtered.forEach(mac => {
            const li = document.createElement('li');
            li.className = 'spabot-idx-item';
            li.innerHTML = `
                <div class="idx-name">${this.escapeHtml(mac.name)}</div>
                <div class="idx-desc">${this.escapeHtml(mac.desc)}</div>
            `;
            li.onclick = () => {
                this.insertCode(`\`${mac.name}\``, false); // Insert at cursor with backticks
                this.macroModalElement.style.display = 'none';
            };
            listEl.appendChild(li);
        });
    },

    renderRestList: function(filterText) {
        const listEl = document.getElementById('spabot-rest-list');
        listEl.innerHTML = '';
        
        const restList = this.activeRestList || [];
        const lowerFilter = filterText.toLowerCase();
        
        const filtered = restList.filter(item => 
            item.name.toLowerCase().includes(lowerFilter) || 
            (item.desc && item.desc.toLowerCase().includes(lowerFilter))
        );

        if (filtered.length === 0) {
            listEl.innerHTML = '<li class="empty">No endpoints found</li>';
            return;
        }

        filtered.forEach(item => {
            const li = document.createElement('li');
            li.className = 'spabot-idx-item';
            li.innerHTML = `
                <div class="idx-name" style="font-family:monospace; color:#0052CC;">${this.escapeHtml(item.name)}</div>
                <div class="idx-desc">${this.escapeHtml(item.desc)}</div>
            `;
            li.onclick = () => {
                this.insertCode(`| rest ${item.name}`, false); // Insert at cursor with '| rest ' prefix
                this.restModalElement.style.display = 'none';
            };
            listEl.appendChild(li);
        });
    },

    openAddModal: function() {
        if (!this.modalElement) return;
        
        const selection = this.capturedSelection || window.getSelection().toString();
        
        document.getElementById('spabot-tpl-name').value = '';
        document.getElementById('spabot-tpl-code').value = selection || '';
        
        this.modalElement.style.display = 'flex';
        document.getElementById('spabot-tpl-name').focus();
    },

    closeAddModal: function() {
        if (this.modalElement) {
            this.modalElement.style.display = 'none';
        }
    },

    handleModalSave: function() {
        const name = document.getElementById('spabot-tpl-name').value.trim();
        const code = document.getElementById('spabot-tpl-code').value;

        if (!name) {
            alert('Please enter a name.');
            return;
        }
        if (!code) {
            alert('Please enter SPL code.');
            return;
        }

        const newTemplate = { label: name, code: code };
        Storage.saveTemplate(newTemplate, () => {
            this.loadTemplates();
            this.closeAddModal();
        });
    },

    toggleSearchBox: function() {
        const box = document.getElementById('spabot-tpl-search-container');
        if (!box) return;
        
        if (box.style.display === 'block') {
            box.style.display = 'none';
            this.renderTemplateList(''); // Clear filter
            // Clear input value
            const input = document.getElementById('spabot-tpl-search-input');
            if(input) input.value = '';
        } else {
            box.style.display = 'block';
            const input = document.getElementById('spabot-tpl-search-input');
            if (input) input.focus();
        }
    },

    renderTemplateList: function(filterText = '') {
      if (!this.tplListElement || !this.activeTemplates) return;
      this.tplListElement.innerHTML = '';
      
      const lowerFilter = filterText.toLowerCase();
      
      // 1. Process data into groups and flat items
      const groups = {};
      const flatItems = [];
      
      this.activeTemplates.forEach(item => {
        // Schema check: supports {name, value, group} AND {label, code}
        const name = item.name || item.label;
        const code = item.value || item.code;
        const group = item.group;
        
        // Filter logic
        if (filterText) {
            if (!name.toLowerCase().includes(lowerFilter) && 
                !code.toLowerCase().includes(lowerFilter) &&
                !(group && group.toLowerCase().includes(lowerFilter))) {
                return; // Skip mismatch
            }
        }
        
        if (group && group.trim()) {
            const groupName = group.trim();
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push({ name, code });
        } else {
            flatItems.push({ name, code });
        }
      });
      
      // If filtering, maybe flatten everything? 
      // User experience: if I search "error", I want to see "Error Logs" directly, 
      // not have to expand a folder.
      // Strategy: If filter is active, show flat list with Group badge.
      // If no filter, show hierarchical.
      
      if (filterText) {
          // Flat Render Mode
          const allMatches = [];
          
          // Collect from groups
          Object.keys(groups).forEach(g => {
              groups[g].forEach(item => {
                  allMatches.push({ ...item, group: g });
              });
          });
          // Collect flats
          flatItems.forEach(item => allMatches.push(item));
          
          if (allMatches.length === 0) {
              this.tplListElement.innerHTML = '<li style="color:#999; cursor:default; padding:10px;">No matches found</li>';
              return;
          }
          
          allMatches.sort((a,b) => a.name.localeCompare(b.name)).forEach(item => {
              const li = document.createElement('li');
              let groupBadge = item.group ? `<span style="color:#999; font-size:11px; margin-right:6px;">[${this.escapeHtml(item.group)}]</span>` : '';
              li.innerHTML = `${groupBadge}${this.escapeHtml(item.name)}`;
              this.bindClick(li, item);
              this.tplListElement.appendChild(li);
          });
          
      } else {
          // Hierarchical Render Mode (Default)
          // 2. Render Groups (Folders)
          Object.keys(groups).sort().forEach(groupName => {
              const folderLi = document.createElement('li');
              folderLi.className = 'spabot-folder-item';
              // Use SVG folder icon for Splunk-like look
              const folderIconSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
              folderLi.innerHTML = `<span class="spabot-folder-icon">${folderIconSvg}</span><span>${this.escapeHtml(groupName)}</span> <span class="arrow">▸</span>`;
              
              // Create Submenu container
              const submenu = document.createElement('ul');
              submenu.className = 'spabot-submenu';
              submenu.style.display = 'none';
              
              groups[groupName].forEach(item => {
                  const subLi = document.createElement('li');
                  subLi.innerText = item.name;
                  this.bindClick(subLi, item);
                  submenu.appendChild(subLi);
              });
              
              folderLi.appendChild(submenu);
              
              // Hover Interaction
              let timer = null;
              
              folderLi.addEventListener('mouseenter', () => {
                  if (timer) clearTimeout(timer);
                  submenu.style.display = 'block';
                  // Positioning logic... CSS handles left: 100%
              });
              
              folderLi.addEventListener('mouseleave', () => {
                  timer = setTimeout(() => {
                      submenu.style.display = 'none';
                  }, 200); 
              });
              
              this.tplListElement.appendChild(folderLi);
          });
          
          // 3. Render Flat Items
          flatItems.forEach(item => {
            const li = document.createElement('li');
            li.innerText = item.name;
            this.bindClick(li, item);
            this.tplListElement.appendChild(li);
          });
      }
    },
    
    bindClick: function(element, item) {
        const handleClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (!item.code) {
            console.error('[Spabot] Template has no code:', item);
            this.showMessage('⚠️ Error: Empty template code');
            return;
          }
          this.insertCode(item.code, true);
        };

        element.addEventListener('click', handleClick);
        element.addEventListener('mousedown', handleClick);
    },

    toggle: function(anchorRect) {
      if (!this.menuElement) return;
      
      if (this.menuElement.style.display === 'none') {
        this.show(anchorRect);
      } else {
        this.hide();
      }
    },

    show: function(anchorRect) {
      // Refresh all data when menu opens to get latest from options page
      this.loadAllData();
      
      const sel = window.getSelection();
      this.capturedSelection = sel ? sel.toString() : '';
      
      this.menuElement.style.display = 'block';

      // Clamp the menu inside the viewport. On Kibana the query bar spans the
      // whole width, so the icon sits near the right edge and an unclamped
      // menu would be rendered outside the browser frame.
      const menuRect = this.menuElement.getBoundingClientRect();
      const menuWidth = menuRect.width || 200;
      const menuHeight = menuRect.height || 0;
      const gap = 10;
      const pad = 8;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const viewportW = document.documentElement.clientWidth;
      const viewportH = document.documentElement.clientHeight;

      let left = anchorRect.left + scrollX;
      left = Math.max(scrollX + pad, Math.min(left, scrollX + viewportW - menuWidth - pad));

      // Open downward; flip above the icon when there is not enough room below
      let top = anchorRect.top + anchorRect.height + gap + scrollY;
      if (anchorRect.bottom + gap + menuHeight > viewportH &&
          anchorRect.top - gap - menuHeight > 0) {
        top = anchorRect.top - gap - menuHeight + scrollY;
      }

      this.menuElement.style.top = `${top}px`;
      this.menuElement.style.left = `${left}px`;
      this.showMessage(''); 
    },

    hide: function() {
      if (!this.menuElement) return;
      this.menuElement.style.display = 'none';
    },

    // Tear down all DOM owned by the menu (used when the user disables the
    // extension for the current platform).
    destroy: function() {
      this.hide();
      [
        this.menuElement,
        this.modalElement,
        this.indexModalElement,
        this.macroModalElement,
        this.restModalElement,
        this.esqlModalElement,
        this.dataviewModalElement
      ].forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });

      this.menuElement = null;
      this.tplListElement = null;
      this.msgArea = null;
      this.modalElement = null;
      this.indexModalElement = null;
      this.macroModalElement = null;
      this.restModalElement = null;
      this.esqlModalElement = null;
      this.dataviewModalElement = null;
      this.inputElement = null;
    },

    insertCode: function(code, replaceAll = false) {
      if (!this.inputElement) {
        console.error('[Spabot] Input element not found');
        return;
      }
      
      let finalCode = code;
      if (finalCode.includes('{{UUID}}')) {
        finalCode = finalCode.replace(/{{UUID}}/g, generateUUID());
      }
      
      const el = this.inputElement;
      el.focus();
      
      if (replaceAll) {
        this.updateInputValue(finalCode, true);
      } else {
        this.updateInputValue(finalCode, false);
      }
      
      this.hide();
    },

    handleInsertUUID: function() {
      this.insertCode(generateUUID(), false);
    },

    updateInputValue: function(newValue, selectAll = false) {
      const el = this.inputElement;
      const isACE = el.classList.contains('ace_text-input');
      // Monaco hidden inputarea (Kibana 8.x+/9.x ES|QL editor) behaves like ACE:
      // direct value assignment is ignored, must go through execCommand.
      const isMonaco = el.classList.contains('inputarea') && !!el.closest('.monaco-editor');

      if (isACE || isMonaco) {
        try {
          el.focus();
          if (selectAll) {
            document.execCommand('selectAll');
          }
          const success = document.execCommand('insertText', false, newValue);
          if (success) return; 
        } catch (e) {
          console.warn('[Spabot] execCommand failed, falling back to value setter', e);
        }
      }

      if (selectAll) {
        el.value = newValue;
      } else {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const text = el.value;
        el.value = text.substring(0, start) + newValue + text.substring(end);
      }
      
      try {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 
          "value"
        ).set;
        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(el, el.value);
        }
      } catch (e) { }

      const events = ['input', 'change', 'blur', 'focus'];
      events.forEach(type => {
        const event = new Event(type, { bubbles: true });
        el.dispatchEvent(event);
      });
    },

    showMessage: function(msg) {
      if (this.msgArea) {
        this.msgArea.innerText = msg;
        this.msgArea.style.display = msg ? 'block' : 'none';
      }
    },
    
    escapeHtml: function(text) {
      if (!text) return '';
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  };

  global.SpabotMenu = MenuController;

})(window);
