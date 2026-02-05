// content.js - Spabot Core Logic

const LOG_PREFIX = '[Spabot]';
function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

// Selectors to identify Splunk Search Bar
const SEARCH_BAR_SELECTORS = [
  '.ace_editor',                // Common Splunk ACE Editor
  '.splunk-search-bar-input',   // Generic container
  '.search-query-control',      // Older versions
  'textarea[name="q"]'          // Fallback
];

let observer = null;
let isBotInjected = false;
let currentInputEl = null;

function init() {
  log('Initializing...');
  attemptInjection();
  startObserver();
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
  for (const selector of SEARCH_BAR_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) {
      // If it's the ACE editor itself, we want its parent wrapper usually
      // If it's a textarea, we might want its parent wrapper
      return el.classList.contains('ace_editor') ? el.parentElement : (el.parentElement || el);
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
  wrapper.title = 'Spabot - Click for options';

  // Create Icon Structure (Simplified for Kawaii Splunk Green design)
  // <div class="spabot-icon">
  //   <div class="spabot-head">
  //     <div class="spabot-face-screen">
  //       <div class="spabot-eye left"></div>
  //       <div class="spabot-eye right"></div>
  //       <div class="spabot-mouth"></div>
  //     </div>
  //   </div>
  // </div>
  const icon = document.createElement('div');
  icon.className = 'spabot-icon';
  
  const head = document.createElement('div');
  head.className = 'spabot-head';
  
  const faceScreen = document.createElement('div');
  faceScreen.className = 'spabot-face-screen';
  
  const eyeLeft = document.createElement('div');
  eyeLeft.className = 'spabot-eye left';
  
  const eyeRight = document.createElement('div');
  eyeRight.className = 'spabot-eye right';
  
  const mouth = document.createElement('div');
  mouth.className = 'spabot-mouth';
  
  faceScreen.appendChild(eyeLeft);
  faceScreen.appendChild(eyeRight);
  faceScreen.appendChild(mouth);
  
  head.appendChild(faceScreen);
  icon.appendChild(head);

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
    chrome.storage.local.get(['spabot_settings'], (result) => {
      const settings = result.spabot_settings || {};
      isQuietMode = !!settings.quietMode;
    });
    
    // Listen for changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.spabot_settings) {
        isQuietMode = !!changes.spabot_settings.newValue.quietMode;
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
       const greetings = [
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
