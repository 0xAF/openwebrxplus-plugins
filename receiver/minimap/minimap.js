/*
 * Plugin: Minimap - Adds a minimap to receiver page.
 *
 * License: MIT
 * Copyright (c) 2026 Martin D. (13MAD86)
 */

// plugin provides its own CSS dynamically
Plugins.minimap.no_css = true;

// plugin default configs
Plugins.minimap.width = 430;
Plugins.minimap.height = 320;
Plugins.minimap.min_width = 260;
Plugins.minimap.min_height = 180;
Plugins.minimap.max_width = 1400;
Plugins.minimap.max_height = 1000;
Plugins.minimap.right = 285;
Plugins.minimap.bottom = 16;
Plugins.minimap.title = "Mini map";
Plugins.minimap.remember_position = true;
Plugins.minimap.remember_size = true;
Plugins.minimap.resizable = true;

Plugins.minimap.init = async function () {
    'use strict';

    var cfg = Plugins.minimap;

    var MiniMap = {
        initialized: false,
        popup: null,
        iframe: null,
        button: null,
        link: null,
        header: null,
        visible: false,
        resizeObserver: null,
        frameObserver: null,
        storageKey: 'openwebrx-minimap-state',
        drag: {
            active: false,
            startX: 0,
            startY: 0,
            startLeft: 0,
            startTop: 0
        },

        getMapUrl: function () {
            return new URL('./map', window.location.href).toString();
        },

        getConfig: function () {
            return {
                width: Number(cfg.width) || 430,
                height: Number(cfg.height) || 320,
                min_width: Number(cfg.min_width) || 260,
                min_height: Number(cfg.min_height) || 180,
                max_width: Number(cfg.max_width) || 1400,
                max_height: Number(cfg.max_height) || 1000,
                right: Number(cfg.right) || 285,
                bottom: Number(cfg.bottom) || 16,
                title: cfg.title || 'Mini map',
                remember_position: cfg.remember_position !== false,
                remember_size: cfg.remember_size !== false,
                resizable: cfg.resizable !== false
            };
        },

        loadState: function () {
            try {
                return JSON.parse(localStorage.getItem(this.storageKey) || '{}') || {};
            } catch (e) {
                return {};
            }
        },

        saveState: function () {
            if (!this.popup) return;

            var conf = this.getConfig();
            if (!conf.remember_position && !conf.remember_size) return;

            var state = {};
            if (conf.remember_size) {
                state.width = this.popup.offsetWidth;
                state.height = this.popup.offsetHeight;
            }

            if (conf.remember_position) {
                state.left = this.popup.style.left || '';
                state.top = this.popup.style.top || '';
                state.right = this.popup.style.right || '';
                state.bottom = this.popup.style.bottom || '';
            }

            try {
                localStorage.setItem(this.storageKey, JSON.stringify(state));
            } catch (e) {}
        },

        injectStyles: function () {
            if (document.getElementById('openwebrx-minimap-styles')) return;

            var conf = this.getConfig();
            var state = this.loadState();

            var width = Math.max(conf.min_width, Math.min(conf.max_width, Number(state.width) || conf.width));
            var height = Math.max(conf.min_height, Math.min(conf.max_height, Number(state.height) || conf.height));

            var style = document.createElement('style');
            style.id = 'openwebrx-minimap-styles';
            style.textContent = [
                '#openwebrx-minimap-popup {',
                '  position: fixed;',
                '  right: ' + conf.right + 'px;',
                '  bottom: ' + conf.bottom + 'px;',
                '  width: ' + width + 'px;',
                '  height: ' + height + 'px;',
                '  min-width: ' + conf.min_width + 'px;',
                '  min-height: ' + conf.min_height + 'px;',
                '  max-width: min(' + conf.max_width + 'px, 96vw);',
                '  max-height: min(' + conf.max_height + 'px, 96vh);',
                '  display: none;',
                '  flex-direction: column;',
                '  background: rgba(18, 18, 18, 0.96);',
                '  border: 1px solid rgba(255,255,255,0.14);',
                '  border-radius: 10px;',
                '  overflow: hidden;',
                '  box-shadow: 0 16px 40px rgba(0,0,0,0.45);',
                '  z-index: 10050;',
                (conf.resizable ? '  resize: both;' : '  resize: none;'),
                '}',
                '#openwebrx-minimap-popup.open { display: flex; }',
                '#openwebrx-minimap-popup.dragging { user-select: none; }',
                '#openwebrx-minimap-header {',
                '  display: flex;',
                '  align-items: center;',
                '  justify-content: space-between;',
                '  gap: 8px;',
                '  padding: 8px 10px;',
                '  color: #fff;',
                '  background: rgba(36, 36, 36, 0.95);',
                '  border-bottom: 1px solid rgba(255,255,255,0.12);',
                '  font: 600 13px/1.2 sans-serif;',
                '  cursor: move;',
                '  flex: 0 0 auto;',
                '}',
                '#openwebrx-minimap-title {',
                '  pointer-events: none;',
                '}',
                '#openwebrx-minimap-actions {',
                '  display: flex;',
                '  align-items: center;',
                '  gap: 6px;',
                '}',
                '#openwebrx-minimap-actions a,',
                '#openwebrx-minimap-actions button {',
                '  padding: 4px 8px;',
                '  border: 1px solid rgba(255,255,255,0.16);',
                '  border-radius: 6px;',
                '  background: rgba(255,255,255,0.06);',
                '  color: #fff;',
                '  cursor: pointer;',
                '  text-decoration: none;',
                '  font: 500 12px/1.2 sans-serif;',
                '}',
                '#openwebrx-minimap-actions button:hover,',
                '#openwebrx-minimap-actions a:hover {',
                '  background: rgba(255,255,255,0.12);',
                '}',
                '#openwebrx-minimap-frame {',
                '  width: 100%;',
                '  height: calc(100% - 42px);',
                '  border: 0;',
                '  background: #111;',
                '  flex: 1 1 auto;',
                '}',
                '#openwebrx-minimap-sidebar-row .openwebrx-button {',
                '  width: 96%;',
                '  text-align: center;',
                '}',
                '#openwebrx-minimap-toggle.active {',
                '  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18);',
                '}',
                '@media (max-width: 900px) {',
                '  #openwebrx-minimap-popup {',
                '    left: 12px;',
                '    right: 12px;',
                '    bottom: 12px;',
                '    width: auto;',
                '    max-width: none;',
                '    height: 40vh;',
                '  }',
                '}',
            ].join('\n');

            document.head.appendChild(style);
        },

        createPopup: function () {
            if (this.popup) return;

            var conf = this.getConfig();
            var state = this.loadState();

            var popup = document.createElement('div');
            popup.id = 'openwebrx-minimap-popup';
            popup.innerHTML = [
                '<div id="openwebrx-minimap-header">',
                '  <span id="openwebrx-minimap-title">' + this.escapeHtml(conf.title) + '</span>',
                '  <div id="openwebrx-minimap-actions">',
                '    <a id="openwebrx-minimap-link" href="#" target="_blank" rel="noopener noreferrer">Open full map</a>',
                '    <button id="openwebrx-minimap-close" type="button">Close</button>',
                '  </div>',
                '</div>',
                '<iframe id="openwebrx-minimap-frame" title="OpenWebRX map" loading="lazy"></iframe>'
            ].join('');

            document.body.appendChild(popup);

            this.popup = popup;
            this.header = popup.querySelector('#openwebrx-minimap-header');
            this.iframe = popup.querySelector('#openwebrx-minimap-frame');
            this.link = popup.querySelector('#openwebrx-minimap-link');
            this.link.href = this.getMapUrl();

            if (state.left || state.top || state.right || state.bottom) {
                if (state.left) popup.style.left = state.left;
                if (state.top) popup.style.top = state.top;
                if (state.right) popup.style.right = state.right;
                if (state.bottom) popup.style.bottom = state.bottom;
            }

            popup.querySelector('#openwebrx-minimap-close').addEventListener('click', this.hide.bind(this));
            this.installDragHandlers();
            this.installFrameLoadHandler();
            this.installResizeHandler();
            this.keepPopupInViewport();
        },

        escapeHtml: function (text) {
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        addSidebarButton: function () {
            if (document.getElementById('openwebrx-minimap-sidebar-row')) {
                this.button = document.getElementById('openwebrx-minimap-toggle');
                return;
            }

            var displayDivider = document.getElementById('openwebrx-section-display');
            var displaySection = displayDivider && displayDivider.nextElementSibling;
            if (!displaySection) return;

            var row = document.createElement('div');
            row.className = 'openwebrx-panel-line';
            row.id = 'openwebrx-minimap-sidebar-row';

            var button = document.createElement('div');
            button.id = 'openwebrx-minimap-toggle';
            button.className = 'openwebrx-button';
            button.textContent = 'Open map';
            button.title = 'Open the map in a popup';
            button.addEventListener('click', this.toggle.bind(this));

            row.appendChild(button);
            displaySection.insertBefore(row, displaySection.firstChild);
            this.button = button;
            this.updateButton();
        },

        updateButton: function () {
            if (!this.button) return;
            this.button.textContent = this.visible ? 'Hide map' : 'Open map';
            this.button.classList.toggle('active', this.visible);
            this.button.title = this.visible ? 'Hide the map popup' : 'Open the map in a popup';
        },

        show: function () {
            this.init();
            this.visible = true;

            var mapUrl = this.getMapUrl();
            if (this.link) this.link.href = mapUrl;
            if (this.iframe && this.iframe.src !== mapUrl) this.iframe.src = mapUrl;
            if (this.popup) this.popup.classList.add('open');

            this.updateButton();
            this.hideEmbeddedHeaderSoon();
        },

        hide: function () {
            this.visible = false;
            if (this.popup) this.popup.classList.remove('open');
            this.updateButton();
            this.saveState();
        },

        toggle: function () {
            if (this.visible) {
                this.hide();
            } else {
                this.show();
            }
        },

        installHotkeys: function () {
            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape' && MiniMap.visible) {
                    MiniMap.hide();
                }
            });

            window.addEventListener('resize', this.keepPopupInViewport.bind(this));
        },

        installDragHandlers: function () {
            if (!this.header) return;

            var self = this;

            this.header.addEventListener('mousedown', function (event) {
                if (event.button !== 0) return;
                if (event.target.closest('#openwebrx-minimap-actions')) return;
                self.startDrag(event.clientX, event.clientY);
                event.preventDefault();
            });

            document.addEventListener('mousemove', function (event) {
                self.onDrag(event.clientX, event.clientY);
            });

            document.addEventListener('mouseup', function () {
                self.stopDrag();
            });

            this.header.addEventListener('touchstart', function (event) {
                if (!event.touches || !event.touches.length) return;
                if (event.target.closest('#openwebrx-minimap-actions')) return;
                var touch = event.touches[0];
                self.startDrag(touch.clientX, touch.clientY);
                event.preventDefault();
            }, { passive: false });

            document.addEventListener('touchmove', function (event) {
                if (!self.drag.active || !event.touches || !event.touches.length) return;
                var touch = event.touches[0];
                self.onDrag(touch.clientX, touch.clientY);
                event.preventDefault();
            }, { passive: false });

            document.addEventListener('touchend', function () {
                self.stopDrag();
            });
        },

        startDrag: function (clientX, clientY) {
            if (!this.popup) return;

            var rect = this.popup.getBoundingClientRect();
            this.drag.active = true;
            this.drag.startX = clientX;
            this.drag.startY = clientY;
            this.drag.startLeft = rect.left;
            this.drag.startTop = rect.top;

            this.popup.classList.add('dragging');
            this.popup.style.left = rect.left + 'px';
            this.popup.style.top = rect.top + 'px';
            this.popup.style.right = 'auto';
            this.popup.style.bottom = 'auto';
        },

        onDrag: function (clientX, clientY) {
            if (!this.drag.active || !this.popup) return;

            var dx = clientX - this.drag.startX;
            var dy = clientY - this.drag.startY;
            var width = this.popup.offsetWidth;
            var height = this.popup.offsetHeight;

            var left = this.drag.startLeft + dx;
            var top = this.drag.startTop + dy;

            left = Math.max(0, Math.min(left, window.innerWidth - width));
            top = Math.max(0, Math.min(top, window.innerHeight - height));

            this.popup.style.left = left + 'px';
            this.popup.style.top = top + 'px';
        },

        stopDrag: function () {
            if (!this.drag.active || !this.popup) return;
            this.drag.active = false;
            this.popup.classList.remove('dragging');
            this.keepPopupInViewport();
            this.saveState();
        },

        keepPopupInViewport: function () {
            if (!this.popup) return;

            var width = this.popup.offsetWidth;
            var height = this.popup.offsetHeight;
            var rect = this.popup.getBoundingClientRect();

            var left = rect.left;
            var top = rect.top;

            if (this.popup.style.left !== '' || this.popup.style.top !== '') {
                left = Math.max(0, Math.min(left, window.innerWidth - width));
                top = Math.max(0, Math.min(top, window.innerHeight - height));
                this.popup.style.left = left + 'px';
                this.popup.style.top = top + 'px';
                this.popup.style.right = 'auto';
                this.popup.style.bottom = 'auto';
            }

            var conf = this.getConfig();
            var newWidth = Math.max(conf.min_width, Math.min(conf.max_width, width, window.innerWidth - 4));
            var newHeight = Math.max(conf.min_height, Math.min(conf.max_height, height, window.innerHeight - 4));

            if (newWidth !== width) this.popup.style.width = newWidth + 'px';
            if (newHeight !== height) this.popup.style.height = newHeight + 'px';
        },

        installResizeHandler: function () {
            if (!this.popup || !this.getConfig().resizable || typeof ResizeObserver === 'undefined') return;

            var self = this;
            if (this.resizeObserver) this.resizeObserver.disconnect();

            this.resizeObserver = new ResizeObserver(function () {
                if (!self.popup) return;

                var conf = self.getConfig();
                var width = self.popup.offsetWidth;
                var height = self.popup.offsetHeight;

                var clampedWidth = Math.max(conf.min_width, Math.min(conf.max_width, width, window.innerWidth - 4));
                var clampedHeight = Math.max(conf.min_height, Math.min(conf.max_height, height, window.innerHeight - 4));

                if (clampedWidth !== width) self.popup.style.width = clampedWidth + 'px';
                if (clampedHeight !== height) self.popup.style.height = clampedHeight + 'px';

                self.keepPopupInViewport();
                self.saveState();
            });

            this.resizeObserver.observe(this.popup);
        },

        installFrameLoadHandler: function () {
            if (!this.iframe) return;

            var self = this;
            this.iframe.addEventListener('load', function () {
                self.hideEmbeddedHeaderSoon();
                self.observeEmbeddedDocument();
            });
        },

        hideEmbeddedHeaderSoon: function () {
            var self = this;
            var tries = 0;

            function tick() {
                tries += 1;
                var hidden = self.hideEmbeddedHeader();
                if (!hidden && tries < 20) {
                    window.setTimeout(tick, 250);
                }
            }

            window.setTimeout(tick, 50);
        },

        hideEmbeddedHeader: function () {
            if (!this.iframe) return false;

            try {
                var doc = this.iframe.contentDocument || (this.iframe.contentWindow && this.iframe.contentWindow.document);
                if (!doc || !doc.documentElement) return false;

                var css = [
                    '.webrx-top-container,',
                    'header,',
                    '#header,',
                    '.header,',
                    '#topbar,',
                    '.topbar,',
                    '#navbar,',
                    '.navbar,',
                    'nav,',
                    '.top-menu,',
                    '#top-menu,',
                    '.openwebrx-header,',
                    '#openwebrx-header,',
                    '.page-header,',
                    '.site-header {',
                    '  display: none !important;',
                    '  visibility: hidden !important;',
                    '  height: 0 !important;',
                    '  min-height: 0 !important;',
                    '  margin: 0 !important;',
                    '  padding: 0 !important;',
                    '}',
                    'html, body {',
                    '  margin-top: 0 !important;',
                    '  padding-top: 0 !important;',
                    '}',
                    'body > :first-child[data-header],',
                    'body > :first-child.header,',
                    'body > :first-child.navbar {',
                    '  display: none !important;',
                    '}',
                ].join('\n');

                var style = doc.getElementById('openwebrx-minimap-embedded-style');
                if (!style) {
                    style = doc.createElement('style');
                    style.id = 'openwebrx-minimap-embedded-style';
                    style.textContent = css;
                    doc.head.appendChild(style);
                }

                var selectors = [
                    '.webrx-top-container', 'header', '#header', '.header', '#topbar', '.topbar', '#navbar',
                    '.navbar', 'nav', '.top-menu', '#top-menu', '.openwebrx-header',
                    '#openwebrx-header', '.page-header', '.site-header'
                ];

                var hiddenAny = false;
                selectors.forEach(function (selector) {
                    var nodes = doc.querySelectorAll(selector);
                    nodes.forEach(function (node) {
                        if (node && node.style) {
                            node.style.setProperty('display', 'none', 'important');
                            node.style.setProperty('visibility', 'hidden', 'important');
                            node.style.setProperty('height', '0', 'important');
                            node.style.setProperty('min-height', '0', 'important');
                            node.style.setProperty('margin', '0', 'important');
                            node.style.setProperty('padding', '0', 'important');
                            hiddenAny = true;
                        }
                    });
                });

                var body = doc.body;
                if (body) {
                    body.style.setProperty('margin-top', '0', 'important');
                    body.style.setProperty('padding-top', '0', 'important');
                }

                if (!hiddenAny && body && body.children && body.children.length) {
                    var first = body.children[0];
                    if (first) {
                        var rect = first.getBoundingClientRect();
                        var styleInfo = (this.iframe.contentWindow || window).getComputedStyle(first);
                        var looksLikeHeader =
                            rect.top <= 5 &&
                            rect.height > 40 &&
                            rect.height < 180 &&
                            (
                                styleInfo.position === 'fixed' ||
                                styleInfo.position === 'sticky' ||
                                rect.width >= window.innerWidth * 0.7
                            );

                        if (looksLikeHeader) {
                            first.style.setProperty('display', 'none', 'important');
                            hiddenAny = true;
                        }
                    }
                }

                return hiddenAny;
            } catch (error) {
                return false;
            }
        },

        observeEmbeddedDocument: function () {
            if (this.frameObserver) {
                this.frameObserver.disconnect();
                this.frameObserver = null;
            }

            try {
                var doc = this.iframe.contentDocument || (this.iframe.contentWindow && this.iframe.contentWindow.document);
                if (!doc || !doc.body) return;

                var self = this;
                this.frameObserver = new MutationObserver(function () {
                    self.hideEmbeddedHeader();
                });
                this.frameObserver.observe(doc.body, { childList: true, subtree: true });
            } catch (error) {
                // ignore cross-origin or timing errors
            }
        },

        setSize: function (width, height) {
            if (!this.popup) return;
            var conf = this.getConfig();

            width = Math.max(conf.min_width, Math.min(conf.max_width, Number(width) || conf.width));
            height = Math.max(conf.min_height, Math.min(conf.max_height, Number(height) || conf.height));

            this.popup.style.width = width + 'px';
            this.popup.style.height = height + 'px';
            this.keepPopupInViewport();
            this.saveState();
        },

        init: function () {
            if (this.initialized) return;
            this.initialized = true;
            this.injectStyles();
            this.createPopup();
            this.addSidebarButton();
            this.installHotkeys();
        }
    };

    MiniMap.init();

    Plugins.minimap.show = function () { MiniMap.show(); };
    Plugins.minimap.hide = function () { MiniMap.hide(); };
    Plugins.minimap.toggle = function () { MiniMap.toggle(); };
    Plugins.minimap.setSize = function (width, height) { MiniMap.setSize(width, height); };
    Plugins.minimap.instance = MiniMap;

    return true;
};
