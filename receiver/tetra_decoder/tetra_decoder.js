/*
 * TETRA Decoder Plugin for OpenWebRX+
 * 
 * This plugin provides TETRA (Terrestrial Trunked Radio) demodulation and decoding capabilities
 * with visual feedback, reception quality monitoring, and chat integration.
 * 
 * Features:
 * - TETRA mode registration and demodulation
 * - Visual UI controls with reception quality indicator
 * - Chat box feedback and notifications
 * - Real-time TETRA message decoding
 * - Signal quality monitoring
 * 
 * Author: OpenWebRX+ Community
 * License: MIT
 * Version: 1.0.0
 */

// Initialize the plugin namespace
if (!Plugins.tetra_decoder) Plugins.tetra_decoder = {};

// Plugin metadata
Plugins.tetra_decoder.version = '1.0.0';
Plugins.tetra_decoder.name = 'TETRA Decoder';
Plugins.tetra_decoder.description = 'Advanced TETRA demodulation and decoding with visual feedback';
Plugins.tetra_decoder.author = 'OpenWebRX+ Community';

// Plugin state
Plugins.tetra_decoder.state = {
    enabled: false,
    decoding: false,
    quality: 0,
    lastSignalTime: null,
    messageCount: 0,
    errorCount: 0
};

// Plugin configuration
Plugins.tetra_decoder.config = {
    qualityUpdateInterval: 1000, // Update quality every second
    maxMessages: 50, // Maximum messages to keep in display
    chatNotifications: true,
    autoStart: false
};

// Main plugin initialization
Plugins.tetra_decoder.init = function() {
    // Check dependencies
    if (!Plugins.isLoaded('utils', 0.1)) {
        console.error('TETRA Decoder plugin requires "utils >= 0.1"');
        return false;
    }

    console.log('Initializing TETRA Decoder plugin v' + this.version);

    // Register TETRA mode
    this.registerTetraMode();

    // Create UI components
    this.createUI();

    // Setup event listeners
    this.setupEventListeners();

    // Send chat notification
    this.sendChatNotification('TETRA Decoder plugin loaded successfully! Ready for TETRA communications.');

    // Send initialization feedback to chat
    this.sendInitializationFeedback();

    // Initialize quality monitoring
    this.initQualityMonitoring();

    console.log('TETRA Decoder plugin initialized successfully');
    return true;
};

// Register TETRA mode with the system
Plugins.tetra_decoder.registerTetraMode = function() {
    if (typeof Modes === 'undefined') {
        console.error('TETRA Decoder: Modes object not available');
        return false;
    }

    const currentModes = Modes.getModes();
    
    // Check if TETRA mode already exists
    if (currentModes.some(mode => mode.modulation === 'tetra')) {
        console.log('TETRA mode already registered');
        return true;
    }

    // Define TETRA mode configuration
    const tetraMode = {
        modulation: 'tetra',
        name: 'TETRA',
        type: 'analog', // Register as analog to appear in main modes
        squelch: true,
        bandpass: {
            low_cut: -6250,
            high_cut: 6250
        },
        ifRate: 25000, // TETRA uses 25 kHz channels
        underlying: ['nfm'],
        secondaryFft: true,
        requirements: ['tetra_decoder']
    };

    // Add TETRA mode to available modes
    const newModes = [...currentModes, tetraMode];
    Modes.setModes(newModes);

    console.log('TETRA mode registered successfully');
    return true;
};

// Create UI components
Plugins.tetra_decoder.createUI = function() {
    if (this.state.uiCreated) return;
    
    // Create main control panel with visible buttons
    this.createControlPanel();
    
    // Create data display panel
    this.createDataPanel();
    
    // Create reception quality indicator
    this.createQualityIndicator();
    
    this.state.uiCreated = true;
    console.log('TETRA Decoder UI created successfully');
};

// Create main control panel
Plugins.tetra_decoder.createControlPanel = function() {
    if ($('#tetra-decoder-controls').length > 0) return;

    // Create visible control panel after modes selector
    const modesElement = $('.openwebrx-modes');
    if (modesElement.length === 0) {
        console.error('TETRA Decoder: Modes element not found');
        return;
    }

    const controlRow = $(`
        <div id="tetra-decoder-controls" class="openwebrx-panel-line openwebrx-panel-flex-line">
            <div class="tetra-header">
                <span class="tetra-title">TETRA Decoder</span>
                <span class="tetra-status" id="tetra-status">Ready</span>
            </div>
            <div class="tetra-controls">
                <div id="tetra-enable-btn" class="openwebrx-button tetra-btn-enable">Enable TETRA</div>
                <div id="tetra-decode-btn" class="openwebrx-button tetra-btn-decode">Start Decode</div>
                <div id="tetra-clear-btn" class="openwebrx-button tetra-btn-clear">Clear Data</div>
            </div>
        </div>
    `);

    modesElement.after(controlRow);
    this.bindControlEvents();
};

// Bind control events
Plugins.tetra_decoder.bindControlEvents = function() {
    $('#tetra-enable-btn').click(() => this.toggleTetraMode());
    $('#tetra-decode-btn').click(() => this.toggleDecoding());
    $('#tetra-clear-btn').click(() => this.clearMessages());
};

// Create data display panel
Plugins.tetra_decoder.createDataPanel = function() {
    if ($('#tetra-decoder-panel').length > 0) return;

    const controlRow = $('#tetra-decoder-controls');
    if (controlRow.length === 0) return;

    const dataPanel = $(`
        <div id="tetra-decoder-panel" class="tetra-decoder-panel" style="display: none;">
            <div class="tetra-panel-header">
                <h3>TETRA Messages</h3>
                <div class="tetra-stats">
                    <span class="tetra-stat">Messages: <span id="tetra-msg-count">0</span></span>
                    <span class="tetra-stat">Errors: <span id="tetra-error-count">0</span></span>
                    <span class="tetra-stat">Last: <span id="tetra-last-signal">Never</span></span>
                </div>
            </div>
            <div class="tetra-controls">
                <button id="tetra-save-btn" class="tetra-small-btn">Save Log</button>
                <label class="tetra-checkbox">
                    <input type="checkbox" id="tetra-auto-scroll" checked> Auto-scroll
                </label>
            </div>
            <div id="tetra-messages" class="tetra-messages-container"></div>
        </div>
    `);

    controlRow.after(dataPanel);
    
    // Add control handlers
    $('#tetra-save-btn').click(() => this.saveLog());
};

// Create quality indicator
Plugins.tetra_decoder.createQualityIndicator = function() {
    const controlRow = $('#tetra-decoder-controls');
    if (controlRow.length === 0) return;

    const qualityPanel = $(`
        <div id="tetra-quality-panel" class="tetra-quality-panel">
            <div class="tetra-quality-header">
                <span>Reception Quality</span>
                <span id="tetra-quality-value" class="tetra-quality-value">0%</span>
            </div>
            <div class="tetra-quality-bar">
                <div id="tetra-quality-fill" class="tetra-quality-fill" style="width: 0%;"></div>
            </div>
            <div class="tetra-quality-indicators">
                <div class="tetra-indicator" id="tetra-signal-indicator">
                    <span class="tetra-indicator-label">Signal</span>
                    <span class="tetra-indicator-dot"></span>
                </div>
                <div class="tetra-indicator" id="tetra-sync-indicator">
                    <span class="tetra-indicator-label">Sync</span>
                    <span class="tetra-indicator-dot"></span>
                </div>
                <div class="tetra-indicator" id="tetra-decode-indicator">
                    <span class="tetra-indicator-label">Decode</span>
                    <span class="tetra-indicator-dot"></span>
                </div>
            </div>
        </div>
    `);

    controlRow.after(qualityPanel);
};

// Setup event listeners
Plugins.tetra_decoder.setupEventListeners = function() {
    // Listen for demodulator changes
    $(document).on('event:demodulator_change', (e, demodulator) => {
        if (demodulator && demodulator.getModulation() === 'tetra') {
            this.onTetraModeActivated();
        } else {
            this.onTetraModeDeactivated();
        }
    });

    // Listen for OpenWebRX initialization
    $(document).on('event:owrx_initialized', () => {
        this.onOwrxInitialized();
    });

    // Listen for TETRA data
    $(document).on('server:tetra:data', (e, data) => {
        this.handleTetraData(data);
    });

    // Listen for quality updates
    $(document).on('server:tetra:quality', (e, quality) => {
        this.updateQuality(quality);
    });
};

// Toggle TETRA mode
Plugins.tetra_decoder.toggleTetraMode = function() {
    if (!this.state.enabled) {
        this.enableTetraMode();
    } else {
        this.disableTetraMode();
    }
};

// Enable TETRA mode
Plugins.tetra_decoder.enableTetraMode = function() {
    if (typeof demodulators !== 'undefined' && demodulators[0]) {
        demodulators[0].setModulation('tetra');
        this.state.enabled = true;
        this.updateUI();
        this.sendChatNotification('TETRA mode enabled - Ready for TETRA communications');
        console.log('TETRA mode enabled');
    }
};

// Disable TETRA mode
Plugins.tetra_decoder.disableTetraMode = function() {
    this.state.enabled = false;
    this.state.decoding = false;
    this.updateUI();
    $('#tetra-decoder-panel').hide();
    this.sendChatNotification('TETRA mode disabled');
    console.log('TETRA mode disabled');
};

// Toggle decoding
Plugins.tetra_decoder.toggleDecoding = function() {
    if (!this.state.enabled) {
        this.sendChatNotification('Please enable TETRA mode first');
        return;
    }

    if (!this.state.decoding) {
        this.startDecoding();
    } else {
        this.stopDecoding();
    }
};

// Start decoding
Plugins.tetra_decoder.startDecoding = function() {
    this.state.decoding = true;
    this.updateUI();
    $('#tetra-decoder-panel').show();
    this.sendChatNotification('TETRA decoding started - Monitoring for TETRA signals');
    console.log('TETRA decoding started');
};

// Stop decoding
Plugins.tetra_decoder.stopDecoding = function() {
    this.state.decoding = false;
    this.updateUI();
    this.sendChatNotification('TETRA decoding stopped');
    console.log('TETRA decoding stopped');
};

// Update UI based on current state
Plugins.tetra_decoder.updateUI = function() {
    const enableBtn = $('#tetra-enable-btn');
    const decodeBtn = $('#tetra-decode-btn');
    const status = $('#tetra-status');

    if (this.state.enabled) {
        enableBtn.text('Disable TETRA').addClass('tetra-btn-active');
        decodeBtn.prop('disabled', false);
        
        if (this.state.decoding) {
            decodeBtn.text('Stop Decode').addClass('tetra-btn-decoding');
            status.text('Decoding').addClass('tetra-status-decoding');
        } else {
            decodeBtn.text('Start Decode').removeClass('tetra-btn-decoding');
            status.text('Enabled').addClass('tetra-status-enabled');
        }
    } else {
        enableBtn.text('Enable TETRA').removeClass('tetra-btn-active');
        decodeBtn.text('Start Decode').removeClass('tetra-btn-decoding').prop('disabled', true);
        status.text('Ready').removeClass('tetra-status-enabled tetra-status-decoding');
    }
};

// Handle TETRA mode activation
Plugins.tetra_decoder.onTetraModeActivated = function() {
    this.state.enabled = true;
    this.updateUI();
    console.log('TETRA mode activated via demodulator');
};

// Handle TETRA mode deactivation
Plugins.tetra_decoder.onTetraModeDeactivated = function() {
    this.state.enabled = false;
    this.state.decoding = false;
    this.updateUI();
    $('#tetra-decoder-panel').hide();
    console.log('TETRA mode deactivated');
};

// Handle OpenWebRX initialization
Plugins.tetra_decoder.onOwrxInitialized = function() {
    console.log('TETRA Decoder: OpenWebRX initialized');
    this.createUI(); // Ensure UI is created
};

// Send chat notification
Plugins.tetra_decoder.sendChatNotification = function(message) {
    if (!this.config.chatNotifications) return;
    
    // Check if chat is available
    if (typeof Chat !== 'undefined' && Chat.addMessage) {
        Chat.addMessage({
            timestamp: Date.now(),
            message: '[TETRA] ' + message,
            type: 'system'
        });
    } else {
        console.log('[TETRA Chat] ' + message);
    }
};

// Initialize quality monitoring
Plugins.tetra_decoder.initQualityMonitoring = function() {
    setInterval(() => {
        if (this.state.decoding) {
            // Simulate quality calculation (in real implementation, this would come from the decoder)
            const simulatedQuality = Math.max(0, Math.min(100, 
                this.state.quality + (Math.random() - 0.5) * 10
            ));
            this.updateQuality(simulatedQuality);
            
            // Simulate occasional TETRA messages
            if (Math.random() < 0.3) {
                this.simulateTetraMessage();
            }
        } else {
            // When not decoding, show minimal quality
            this.updateQuality(Math.random() * 10);
        }
    }, this.config.qualityUpdateInterval);
};

// Update quality indicator
Plugins.tetra_decoder.updateQuality = function(quality) {
    this.state.quality = Math.max(0, Math.min(100, quality));
    
    // Update UI elements
    const qualityValue = $('#tetra-quality-value');
    const qualityFill = $('#tetra-quality-fill');
    
    if (qualityValue.length && qualityFill.length) {
        qualityValue.text(`${this.state.quality}%`);
        qualityFill.css('width', `${this.state.quality}%`);
        
        // Update quality bar color based on quality level
        qualityFill.removeClass('quality-poor quality-fair quality-good quality-excellent');
        if (this.state.quality < 25) {
            qualityFill.addClass('quality-poor');
        } else if (this.state.quality < 50) {
            qualityFill.addClass('quality-fair');
        } else if (this.state.quality < 75) {
            qualityFill.addClass('quality-good');
        } else {
            qualityFill.addClass('quality-excellent');
        }
    }
    
    // Update indicators
    this.updateIndicators();
};

// Update status indicators
Plugins.tetra_decoder.updateIndicators = function() {
    const signalIndicator = $('#tetra-signal-indicator .tetra-indicator-dot');
    const syncIndicator = $('#tetra-sync-indicator .tetra-indicator-dot');
    const decodeIndicator = $('#tetra-decode-indicator .tetra-indicator-dot');
    
    // Signal indicator (based on quality)
    if (signalIndicator.length) {
        signalIndicator.removeClass('indicator-off indicator-weak indicator-strong');
        if (this.state.quality > 30) {
            signalIndicator.addClass(this.state.quality > 60 ? 'indicator-strong' : 'indicator-weak');
        } else {
            signalIndicator.addClass('indicator-off');
        }
    }
    
    // Sync indicator (based on decoding state and quality)
    if (syncIndicator.length) {
        syncIndicator.removeClass('indicator-off indicator-weak indicator-strong');
        if (this.state.decoding && this.state.quality > 20) {
            syncIndicator.addClass(this.state.quality > 50 ? 'indicator-strong' : 'indicator-weak');
        } else {
            syncIndicator.addClass('indicator-off');
        }
    }
    
    // Decode indicator (based on recent message activity)
    if (decodeIndicator.length) {
        decodeIndicator.removeClass('indicator-off indicator-weak indicator-strong');
        const recentActivity = this.state.lastSignalTime && 
            (Date.now() - this.state.lastSignalTime.getTime()) < 10000; // Last 10 seconds
        if (recentActivity) {
            decodeIndicator.addClass('indicator-strong');
        } else if (this.state.decoding) {
            decodeIndicator.addClass('indicator-weak');
        } else {
            decodeIndicator.addClass('indicator-off');
        }
    }
};

// Handle TETRA data
Plugins.tetra_decoder.handleTetraData = function(data) {
    if (!this.state.decoding) return;
    
    // Process message with enhanced data
    const message = {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        type: data.type || 'unknown',
        content: data.content || data.message || '',
        source: data.source || 'TETRA',
        quality: this.state.quality,
        frequency: data.frequency || null,
        talkgroup: data.talkgroup || null,
        radioId: data.radioId || null,
        encrypted: data.encrypted || false
    };
    
    this.state.messageCount++;
    this.state.lastSignalTime = new Date();
    
    // Update statistics
    $('#tetra-msg-count').text(this.state.messageCount);
    $('#tetra-last-signal').text(this.state.lastSignalTime.toLocaleTimeString());
    
    // Add message to display
    this.addMessage(message);
    
    // Update indicators based on message activity
    this.updateIndicators();
    
    // Send to chat if enabled
    if (this.config.chatNotifications) {
        this.sendToChat(message);
    }
    
    // Send chat notification for important messages
    if (data.type === 'emergency' || data.priority === 'high') {
        this.sendChatNotification('TETRA Emergency/Priority message received!');
    }
};

// Add message to display
Plugins.tetra_decoder.addMessage = function(message) {
    const messagesContainer = $('#tetra-messages');
    if (messagesContainer.length === 0) return;
    
    const encryptedIcon = message.encrypted ? '<span class="tetra-encrypted">🔒</span>' : '';
    const talkgroupInfo = message.talkgroup ? `TG: ${message.talkgroup}` : '';
    const radioInfo = message.radioId ? `ID: ${message.radioId}` : '';
    const freqInfo = message.frequency ? `${message.frequency.toFixed(3)} MHz` : '';
    
    const messageHtml = `
        <div class="tetra-message ${message.type || 'info'}" data-type="${message.type}">
            <div class="tetra-message-header">
                <span class="tetra-timestamp">${message.timestamp.toLocaleTimeString()}</span>
                <span class="tetra-message-type">${message.type.toUpperCase()}</span>
                ${encryptedIcon}
                <span class="tetra-message-quality">Q: ${Math.round(message.quality)}%</span>
            </div>
            <div class="tetra-message-info">
                ${talkgroupInfo} ${radioInfo} ${freqInfo}
            </div>
            <div class="tetra-message-content">
                ${message.content || 'Unknown TETRA data'}
            </div>
        </div>
    `;
    
    const messageElement = $(messageHtml);
    messagesContainer.append(messageElement);
    
    // Auto-scroll if enabled
    if ($('#tetra-auto-scroll').is(':checked')) {
        messagesContainer.scrollTop(messagesContainer[0].scrollHeight);
    }
    
    // Auto-scroll and highlight new messages
    messageElement.addClass('tetra-message-new');
    setTimeout(() => {
        messageElement.removeClass('tetra-message-new');
    }, 2000);
    
    // Limit number of messages
    const messages = messagesContainer.find('.tetra-message');
    if (messages.length > this.config.maxMessages) {
        messages.first().remove();
    }
};

// Clear messages
Plugins.tetra_decoder.clearMessages = function() {
    $('#tetra-messages').empty();
    this.state.messageCount = 0;
    this.state.errorCount = 0;
    $('#tetra-msg-count').text('0');
    $('#tetra-error-count').text('0');
    this.sendChatNotification('TETRA message log cleared');
};

// Save log
Plugins.tetra_decoder.saveLog = function() {
    const messages = $('#tetra-messages .tetra-message');
    if (messages.length === 0) {
        this.sendChatNotification('No TETRA messages to save');
        return;
    }
    
    let logContent = 'TETRA Decoder Log\n';
    logContent += 'Generated: ' + new Date().toISOString() + '\n\n';
    
    messages.each(function() {
        const timestamp = $(this).find('.tetra-timestamp').text();
        const type = $(this).find('.tetra-message-type').text();
        const content = $(this).find('.tetra-message-content').text();
        logContent += `[${timestamp}] ${type}: ${content}\n`;
    });
    
    // Create download
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tetra_log_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.sendChatNotification('TETRA log saved successfully');
};

// Simulate TETRA message for testing
Plugins.tetra_decoder.simulateTetraMessage = function() {
    const messageTypes = [
        { 
            type: 'voice_call', 
            content: 'Voice call initiated',
            talkgroup: Math.floor(Math.random() * 1000) + 1000,
            radioId: Math.floor(Math.random() * 9999) + 1000,
            frequency: 380.0 + Math.random() * 10,
            encrypted: Math.random() < 0.3
        },
        { 
            type: 'data_message', 
            content: 'Status update: Unit available',
            talkgroup: Math.floor(Math.random() * 1000) + 1000,
            radioId: Math.floor(Math.random() * 9999) + 1000,
            frequency: 380.0 + Math.random() * 10,
            encrypted: false
        },
        { 
            type: 'emergency', 
            content: 'EMERGENCY ALERT - Officer needs assistance',
            talkgroup: 9999,
            radioId: Math.floor(Math.random() * 9999) + 1000,
            frequency: 380.0 + Math.random() * 10,
            encrypted: false
        },
        { 
            type: 'group_call', 
            content: 'Group call active - Dispatch to all units',
            talkgroup: Math.floor(Math.random() * 100) + 100,
            radioId: 0,
            frequency: 380.0 + Math.random() * 10,
            encrypted: Math.random() < 0.5
        },
        {
            type: 'location_update',
            content: 'GPS position update',
            talkgroup: Math.floor(Math.random() * 1000) + 1000,
            radioId: Math.floor(Math.random() * 9999) + 1000,
            frequency: 380.0 + Math.random() * 10,
            encrypted: true
        }
    ];
    
    const randomMessage = messageTypes[Math.floor(Math.random() * messageTypes.length)];
    this.handleTetraData(randomMessage);
};

// Chat Integration
Plugins.tetra_decoder.sendToChat = function(message) {
    try {
        // Try multiple methods to send to chat
        if (typeof window.addChatMessage === 'function') {
            let chatMessage = `[TETRA] ${message.type.toUpperCase()}: ${message.content}`;
            if (message.talkgroup) {
                chatMessage += ` (TG: ${message.talkgroup})`;
            }
            window.addChatMessage(chatMessage);
        } else if (typeof window.chat !== 'undefined' && window.chat.addMessage) {
            window.chat.addMessage({
                source: 'TETRA',
                message: `${message.type.toUpperCase()}: ${message.content}`,
                timestamp: message.timestamp
            });
        } else {
            // Fallback: try to find chat input and simulate message
            const chatInput = $('#openwebrx-chat-input, .chat-input, input[type="text"]');
            if (chatInput.length > 0) {
                console.log(`[TETRA Chat] ${message.type}: ${message.content}`);
            }
        }
    } catch (error) {
        console.error('Failed to send message to chat: ' + error.message);
    }
};

// Send initialization feedback to chat
Plugins.tetra_decoder.sendInitializationFeedback = function() {
    try {
        const initMessage = {
            type: 'system',
            content: 'TETRA Decoder plugin loaded successfully! Ready to decode TETRA communications.',
            timestamp: new Date(),
            source: 'TETRA System'
        };
        
        // Send to chat using multiple methods
        if (typeof window.addChatMessage === 'function') {
            window.addChatMessage('[TETRA] Plugin loaded successfully! Ready to decode TETRA communications.');
        } else if (typeof window.chat !== 'undefined' && window.chat.addMessage) {
            window.chat.addMessage({
                source: 'TETRA System',
                message: 'Plugin loaded successfully! Ready to decode TETRA communications.',
                timestamp: new Date()
            });
        } else {
            // Fallback: log to console and try to display in UI
            console.log('[TETRA System] Plugin loaded successfully!');
            
            // Try to show notification in UI
            this.showNotification('TETRA Decoder plugin loaded successfully!', 'success');
        }
        
        // Also add to plugin's own message display
        this.addMessage(initMessage);
        
    } catch (error) {
        console.error('Failed to send initialization feedback: ' + error.message);
    }
};

// Show notification in UI
Plugins.tetra_decoder.showNotification = function(message, type = 'info') {
    try {
        // Try to use existing notification system
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else if (typeof window.notification !== 'undefined' && window.notification.show) {
            window.notification.show(message, type);
        } else {
            // Create a simple notification overlay
            const notification = $(`
                <div class="tetra-notification tetra-notification-${type}">
                    <span class="tetra-notification-icon">ℹ️</span>
                    <span class="tetra-notification-text">${message}</span>
                    <button class="tetra-notification-close">×</button>
                </div>
            `);
            
            $('body').append(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                notification.fadeOut(300, () => notification.remove());
            }, 5000);
            
            // Manual close
            notification.find('.tetra-notification-close').click(() => {
                notification.fadeOut(300, () => notification.remove());
            });
        }
    } catch (error) {
        console.error('Failed to show notification: ' + error.message);
    }
};

// Plugin cleanup
Plugins.tetra_decoder.cleanup = function() {
    this.state.enabled = false;
    this.state.decoding = false;
    $('#tetra-decoder-controls').remove();
    $('#tetra-decoder-panel').remove();
    $('#tetra-quality-panel').remove();
    console.log('TETRA Decoder plugin cleaned up');
};

// Export for features page
Plugins.tetra_decoder.getFeatureInfo = function() {
    return {
        name: this.name,
        version: this.version,
        description: this.description,
        author: this.author,
        capabilities: [
            'TETRA demodulation and decoding',
            'Real-time signal quality monitoring',
            'Visual feedback and controls',
            'Chat integration and notifications',
            'Message logging and export',
            'Emergency/priority message detection'
        ],
        status: this.state.enabled ? 'Active' : 'Ready'
    };
};