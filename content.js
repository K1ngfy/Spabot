// content.js - Spabot Core Logic

const LOG_PREFIX = '[Spabot]';
function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

// Platform detection: 'elk' (Kibana Discover) | 'splunk' | null
function detectPlatform() {
  const path = location.pathname;
  if (path.includes('/app/discover')) return 'elk';
  if (path.includes('/search')) return 'splunk';
  return null;
}
const PLATFORM = detectPlatform();
window.SPABOT_PLATFORM = PLATFORM;

// Search bar selectors per platform
const PLATFORM_SELECTORS = {
  splunk: [
    '.ace_editor',                // Common Splunk ACE Editor
    '.splunk-search-bar-input',   // Generic container
    '.search-query-control',      // Older versions
    'textarea[name="q"]'          // Fallback
  ],
  elk: [
    'textarea[data-test-subj="queryInput"]',       // Official Kibana test locator (7.x/8.x classic)
    '.kbnQueryBar textarea',                       // Query bar container fallback
    'div[data-test-subj="kbnQueryBar"] textarea',  // Container test-subj fallback
    '[data-test-subj="globalQueryBar"] textarea',  // Monaco inputarea (8.x+/9.x ES|QL editor)
    '.kibanaCodeEditor textarea',                  // Monaco code editor wrapper fallback
    '[data-test-subj="ESQLEditor"] textarea'       // ES|QL editor container fallback
  ]
};

let observer = null;
let isBotInjected = false;
let currentInputEl = null;
let currentSkin = 'default';
let currentBubble = 'default';

function init() {
  // Not a Splunk search / Kibana Discover page: bail out early (no DOM work).
  if (!PLATFORM) return;
  log('Initializing...', PLATFORM);
  loadSettings();
  attemptInjection();
  startObserver();
}

function loadSettings() {
  if (chrome.storage) {
    chrome.storage.local.get(['spabot_settings'], (result) => {
      const settings = result.spabot_settings || {};
      isQuietMode = !!settings.quietMode;
      currentSkin = settings.skin || 'default';
      currentBubble = settings.bubble || 'default';
      updateAppearance();
    });
  }
}

function updateAppearance() {
    const wrapper = document.querySelector('.spabot-wrapper');
    const bubble = document.querySelector('.spabot-speech-bubble');
    
    if (wrapper) {
        // Reset and apply skin
        wrapper.className = 'spabot-wrapper';
        if (currentSkin !== 'default') {
            wrapper.classList.add(`spabot-skin-${currentSkin}`);
        }
        // Shape skins use a different DOM: rebuild the icon when shape changes
        const shape = SKIN_ICON_BUILDERS[currentSkin] ? currentSkin : 'default';
        if (wrapper.dataset.shape !== shape) {
            wrapper.dataset.shape = shape;
            const oldIcon = wrapper.querySelector('.spabot-icon');
            if (oldIcon) oldIcon.remove();
            wrapper.insertBefore(buildIcon(currentSkin), wrapper.firstChild);
        }
    }
    
    if (bubble) {
        // Reset and apply bubble
        // Preserve 'visible' class if present
        const isVisible = bubble.classList.contains('visible');
        bubble.className = 'spabot-speech-bubble';
        if (isVisible) bubble.classList.add('visible');
        
        if (currentBubble !== 'default') {
            bubble.classList.add(`spabot-bubble-${currentBubble}`);
        }
    }
}

function attemptInjection() {
  if (isBotInjected || document.querySelector('.spabot-wrapper')) {
    return;
  }

  const searchContainer = findSearchContainer();
  if (searchContainer) {
    injectBot(searchContainer);
  }
}

function findSearchContainer() {
  const selectors = PLATFORM_SELECTORS[PLATFORM] || PLATFORM_SELECTORS.splunk;
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      // If it's the ACE editor itself, we want its parent wrapper usually
      if (el.classList.contains('ace_editor')) return el.parentElement;
      // Monaco hidden inputarea (Kibana 8.x+/9.x ES|QL editor):
      // anchor the bot to the stable outer code-editor wrapper, not Monaco's
      // internal overflow-guard (which gets re-rendered and clips overflow)
      if (el.classList.contains('inputarea')) {
        return el.closest('.kibanaCodeEditor')
          || el.closest('[data-test-subj="globalQueryBar"]')
          || el.parentElement;
      }
      return el.parentElement || el;
    }
  }
  return null;
}

function findInputElement(container) {
  // Try to find the actual textarea/input
  // 1. Inside ACE Editor
  const aceTextarea = container.querySelector('textarea.ace_text-input');
  if (aceTextarea) return aceTextarea;

  // 2. Generic textarea or input
  const genericInput = container.querySelector('textarea, input[type="text"]');
  if (genericInput) return genericInput;

  // 3. If the container itself is the input (unlikely but possible for fallback selector)
  if (container.tagName === 'TEXTAREA' || container.tagName === 'INPUT') {
    return container;
  }

  return null;
}

function startObserver() {
  observer = new MutationObserver((mutations) => {
    // If we lost the bot (e.g. page rerender), try to inject again
    if (!document.querySelector('.spabot-wrapper')) {
      isBotInjected = false;
      attemptInjection();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Icon shape builders live in icon_shapes.js (shared with the options page
// preview): buildIcon(skin) / SKIN_ICON_BUILDERS.

function injectBot(container) {
  log('Target container found:', container);

  // Ensure container has relative positioning for absolute child
  const style = window.getComputedStyle(container);
  if (style.position === 'static') {
    container.style.position = 'relative';
  }

  // Find the input element for listening
  const inputEl = findInputElement(container);
  if (!inputEl) {
    log('Could not find input element within container. Aborting injection.');
    return;
  }
  currentInputEl = inputEl;

  // Initialize Menu
  if (window.SpabotMenu) {
    window.SpabotMenu.init(inputEl);
  }

  // Create Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'spabot-wrapper';
  if (currentSkin !== 'default') {
      wrapper.classList.add(`spabot-skin-${currentSkin}`);
  }
  wrapper.title = 'Spabot - Click for options';

  // Create Icon: dispatch to a shape builder based on the active skin.
  // Shape skins (ufo/cat/astro/octo/...) build a completely different
  // DOM structure; other skins restyle the default capsule robot via CSS.
  const icon = buildIcon(currentSkin);
  wrapper.dataset.shape = SKIN_ICON_BUILDERS[currentSkin] ? currentSkin : 'default';

  // Assemble
  wrapper.appendChild(icon);

  // Inject
  container.appendChild(wrapper);
  isBotInjected = true;
  log('Bot injected successfully.');
  
  // Interaction: Click to toggle menu
  wrapper.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent closing immediately
    if (window.SpabotMenu) {
      const rect = wrapper.getBoundingClientRect();
      window.SpabotMenu.toggle(rect);
    }
  });

  // Interaction: Double click to force mood bubble
  wrapper.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    if (typeof showRandomQuote === 'function') {
      showRandomQuote(true); // Force show
    }
  });

  // Create Speech Bubble (Hidden by default)
  const speechBubble = document.createElement('div');
  speechBubble.className = 'spabot-speech-bubble';
  if (currentBubble !== 'default') {
      speechBubble.classList.add(`spabot-bubble-${currentBubble}`);
  }
  
  // Inner text container for safe overflow handling
  const speechBubbleText = document.createElement('div');
  speechBubbleText.className = 'spabot-speech-bubble-text';
  speechBubble.appendChild(speechBubbleText);

  wrapper.appendChild(speechBubble);
  
  // Close bubble on click
  speechBubble.addEventListener('click', (e) => {
    e.stopPropagation();
    hideBubble();
  });

  // --- Mood & Fun Logic ---
  let lastInputTime = Date.now();
  let isQuietMode = false;
  let bubbleTimer = null;

  // Load Quiet Mode setting
  if (chrome.storage) {
    // Initial load moved to init()

    // Listen for changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.spabot_settings) {
        const newSettings = changes.spabot_settings.newValue || {};
        isQuietMode = !!newSettings.quietMode;
        currentSkin = newSettings.skin || 'default';
        currentBubble = newSettings.bubble || 'default';
        updateAppearance();
      }
    });
  }

  // Helper: Get Random Item from Array
  const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Helper: Get Random Quote
  const getRandomQuote = () => {
    if (!window.QUOTES_DB) return "Hello World!";
    
    const db = window.QUOTES_DB;
    const categories = ['optimization_tips', 'secops', 'life', 'waiting', 'stock_market'];
    // Weight categories? For now random
    const cat = getRandom(categories);
    let quote = getRandom(db[cat]);
    
    // Process placeholders
    if (quote.includes('[TIME_LEFT]')) {
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(18, 0, 0, 0); // Assume 18:00 end of day
        let diff = endOfDay - now;
        if (diff < 0) diff = 0;
        const hours = Math.floor(diff / 1000 / 60 / 60);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        quote = quote.replace('[TIME_LEFT]', `${hours}小时${mins}分`);
    }
    
    return quote;
  };

  const showBubble = (text) => {
    speechBubbleText.innerText = text;
    speechBubble.classList.add('visible');
    
    // Auto hide
    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
        hideBubble();
    }, 15000); // 15s display
  };

  const hideBubble = () => {
    speechBubble.classList.remove('visible');
  };

  const showRandomQuote = (force = false) => {
    if (isQuietMode && !force) return;
    
    const quote = getRandomQuote();
    showBubble(quote);
  };

  // Periodic Check (Heartbeat)
   // Adjusted frequency: Check every 45s, 50% chance
   setInterval(() => {
     if (isQuietMode) return;

     const now = Date.now();
     const idleTime = now - lastInputTime;
     
     // Only pop if idle for > 10s
     if (idleTime > 10000) {
         // 50% chance to pop
         if (Math.random() < 0.5) {
             showRandomQuote();
         }
     }
   }, 30 * 1000); // Check every 30 seconds for better engagement

  // Update input time
  const updateActivity = () => {
    lastInputTime = Date.now();
  };

  // Interaction: Live Syntax Check & Emotions
  const validate = () => {
    updateActivity(); // User is typing
    
    // Thinking state removed - simplified interaction
    // Just reset classes to neutral if needed or handle other interactions
  };

  // Listen to events
  inputEl.addEventListener('input', validate);
  inputEl.addEventListener('keyup', validate); 
  
  // Initial check
  validate();

  // Initial Greeting
  setTimeout(() => {
    if (!isQuietMode) {
       const greetings = PLATFORM === 'elk' ? [
           "Spabot online! Ready to explore your logs.",
           "Hi there! Let's write some ES|QL.",
           "System check complete. All systems go!",
           "Ready to dig into those logs?"
       ] : [
           "Spabot online! Ready to search.",
           "Hi there! Let's write some SPL.",
           "System check complete. All systems go!",
           "Ready to dig into those logs?"
       ];
       showBubble(greetings[Math.floor(Math.random() * greetings.length)]);
    }
  }, 2000);
}

// Start execution
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
