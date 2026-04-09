(function () {
  'use strict';

  // ── Read config from the block's data attributes ──────────────────────────
  var root = document.getElementById('aic-root');
  if (!root) return; // block not present on this page

  var CONFIG = {
    backendUrl:      (root.dataset.backendUrl     || '').replace(/\/$/, ''),
    storeName:       root.dataset.storeName       || 'Our Store',
    welcomeMessage:  root.dataset.welcomeMessage  || 'Hi! Ask me anything about our products!',
    primaryColor:    root.dataset.primaryColor    || '#6366f1',
    position:        root.dataset.position        || 'right',   // 'right' | 'left'
    showOnMobile:    root.dataset.showOnMobile    !== 'false',
  };

  if (!CONFIG.backendUrl) {
    console.warn('[AI Chatbot] backendUrl is not configured. Set it in the theme customizer.');
    return;
  }

  // ── Inject CSS custom property ─────────────────────────────────────────────
  document.documentElement.style.setProperty('--aic-primary', CONFIG.primaryColor);

  // ── State ──────────────────────────────────────────────────────────────────
  var history  = [];
  var isOpen   = false;
  var isBusy   = false;
  var greeted  = false;

  // ── Build DOM ──────────────────────────────────────────────────────────────
  var posClass = 'aic-pos-' + CONFIG.position;

  var panel = el('div', 'aic-panel ' + posClass);
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat assistant');

  // Header
  var header = el('div', 'aic-header');
  var headerLeft = el('div', 'aic-header-left');
  var nameEl = el('div', 'aic-store-name');
  nameEl.textContent = CONFIG.storeName;
  var statusEl = el('div', 'aic-status');
  var dot = el('div', 'aic-status-dot');
  var statusText = el('span', 'aic-status-text');
  statusText.textContent = 'Online';
  statusEl.appendChild(dot);
  statusEl.appendChild(statusText);
  var nameWrap = el('div', '');
  nameWrap.appendChild(nameEl);
  nameWrap.appendChild(statusEl);
  headerLeft.appendChild(nameWrap);
  var closeBtn = el('button', 'aic-close-btn');
  closeBtn.setAttribute('aria-label', 'Close chat');
  closeBtn.innerHTML = '&times;';
  header.appendChild(headerLeft);
  header.appendChild(closeBtn);

  // Messages
  var messagesEl = el('div', 'aic-messages');
  messagesEl.setAttribute('aria-live', 'polite');

  // Typing indicator
  var typingEl = el('div', 'aic-typing');
  var typingBubble = el('div', 'aic-typing-bubble');
  typingBubble.innerHTML = '<div class="aic-dot"></div><div class="aic-dot"></div><div class="aic-dot"></div>';
  typingEl.appendChild(typingBubble);
  messagesEl.appendChild(typingEl);

  // Input row
  var inputRow = el('div', 'aic-input-row');
  var textarea = el('textarea', 'aic-textarea');
  textarea.setAttribute('placeholder', 'Ask about our products…');
  textarea.setAttribute('aria-label', 'Chat message');
  textarea.setAttribute('rows', '1');

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.pdf,.txt,.csv';
  fileInput.style.display = 'none';

  var uploadBtn = el('button', 'aic-icon-btn');
  uploadBtn.setAttribute('aria-label', 'Upload knowledge file');
  uploadBtn.setAttribute('title', 'Upload PDF, TXT or CSV');
  uploadBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';

  var sendBtn = el('button', 'aic-send-btn');
  sendBtn.setAttribute('aria-label', 'Send message');
  sendBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

  inputRow.appendChild(textarea);
  inputRow.appendChild(fileInput);
  inputRow.appendChild(uploadBtn);
  inputRow.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(messagesEl);
  panel.appendChild(inputRow);

  // Trigger button
  var trigger = el('button', 'aic-trigger ' + posClass);
  trigger.setAttribute('aria-label', 'Open chat assistant');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H6l-2 2V4h16v10z"/></svg>';

  // Mount everything
  document.body.appendChild(panel);
  document.body.appendChild(trigger);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendMessage(role, text) {
    var row = el('div', 'aic-msg-row ' + (role === 'user' ? 'aic-user' : 'aic-bot'));
    var bubble = el('div', 'aic-bubble');
    bubble.textContent = text;
    var time = el('div', 'aic-time');
    time.textContent = formatTime(new Date());
    row.appendChild(bubble);
    row.appendChild(time);
    messagesEl.insertBefore(row, typingEl);
    scrollBottom();
    return row;
  }

  function showTyping()  { typingEl.classList.add('aic-visible');    scrollBottom(); }
  function hideTyping()  { typingEl.classList.remove('aic-visible'); }

  function setDisabled(disabled) {
    textarea.disabled  = disabled;
    sendBtn.disabled   = disabled;
    uploadBtn.disabled = disabled;
    isBusy = disabled;
  }

  // ── Open / close ───────────────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.classList.add('aic-open');
    trigger.setAttribute('aria-expanded', 'true');
    textarea.focus();
    if (!greeted) {
      greeted = true;
      appendMessage('bot', CONFIG.welcomeMessage);
    }
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('aic-open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', function () { isOpen ? closePanel() : openPanel(); });
  closeBtn.addEventListener('click', closePanel);

  // ── Send message ───────────────────────────────────────────────────────────
  function sendMessage() {
    var text = textarea.value.trim();
    if (!text || isBusy) return;
    textarea.value = '';
    textarea.style.height = 'auto';
    appendMessage('user', text);
    setDisabled(true);
    showTyping();

    history.push({ role: 'user', content: text });

    fetch(CONFIG.backendUrl + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history.slice(-10) }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        hideTyping();
        var reply = data.reply || 'I did not get a response. Please try again.';
        appendMessage('bot', reply);
        history.push({ role: 'model', content: reply });
      })
      .catch(function () {
        hideTyping();
        appendMessage('bot', 'Connection error. Please check your internet and try again.');
        history.pop();
      })
      .finally(function () {
        setDisabled(false);
        textarea.focus();
      });
  }

  sendBtn.addEventListener('click', sendMessage);
  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  textarea.addEventListener('input', function () {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 88) + 'px';
  });

  // ── File upload ────────────────────────────────────────────────────────────
  uploadBtn.addEventListener('click', function () {
    if (!isBusy) fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0];
    if (!file) return;
    fileInput.value = '';
    setDisabled(true);
    appendMessage('bot', 'Uploading your file, please wait…');

    var form = new FormData();
    form.append('file', file);

    fetch(CONFIG.backendUrl + '/api/upload', { method: 'POST', body: form })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          appendMessage('bot', 'Your file has been loaded! I will now use it as a reference when answering your questions.');
        } else {
          appendMessage('bot', data.error || 'Sorry, I could not upload that file. Please make sure it is a PDF, TXT, or CSV under 10MB.');
        }
      })
      .catch(function () {
        appendMessage('bot', 'Sorry, I could not upload that file. Please make sure it is a PDF, TXT, or CSV under 10MB.');
      })
      .finally(function () {
        setDisabled(false);
        textarea.focus();
      });
  });

})();
