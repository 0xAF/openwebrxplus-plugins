/*
 * Listeners plugin for OpenWebRX+
 * Share and display live listener tuning through Supabase Realtime Presence.
 *
 * Copyright (c) 2026 Stanislav Lechev [0xAF], LZ2SLL
 * Licensed under MIT
 */

Plugins.listeners = Plugins.listeners || {};
Plugins.listeners._version = 0.1;

Plugins.listeners.defaults = {
	supabaseUrl: '',
	supabaseKey: '',
	network: '',
	receiverId: '',
	receiverName: '',
	receiverUrl: '',
	open: false,
	sdkUrl: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
};

Plugins.listeners.config = Plugins.utils && Plugins.utils.deepMerge
	? Plugins.utils.deepMerge({}, Plugins.listeners.defaults)
	: {};

Plugins.listeners.state = {
	initialized: false,
	client: null,
	channel: null,
	connected: false,
	generation: 0,
	sessionId: null,
	presences: [],
	lastPayload: '',
	lastTrackAt: 0,
	tuningSignature: '',
	tunedSince: null,
	pendingTune: null,
	publishTimer: null,
	reconnectTimer: null,
	reconnectAttempts: 0,
	pollTimer: null,
	renderTimer: null,
	statusKind: 'idle',
	statusText: 'Not configured'
};

Plugins.listeners._shortText = function (value, maxLength) {
	if (value === undefined || value === null) return '';
	return String(value).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
};

Plugins.listeners._number = function (value) {
	if (value === undefined || value === null || value === '') return null;
	var number = Number(value);
	return Number.isFinite(number) ? number : null;
};

Plugins.listeners._sessionId = function () {
	var bytes = new Uint8Array(12);
	if (window.crypto && window.crypto.getRandomValues) {
		window.crypto.getRandomValues(bytes);
	} else {
		for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
	}
	return Array.prototype.map.call(bytes, function (value) {
		return ('0' + value.toString(16)).slice(-2);
	}).join('');
};

Plugins.listeners._receiverId = function () {
	return this._shortText(this.config.receiverId || window.location.host, 100);
};

Plugins.listeners._receiverName = function () {
	var title = $('.webrx-rx-title').first().text().trim();
	return this._shortText(this.config.receiverName || title || window.location.host, 100);
};

Plugins.listeners._receiverUrl = function () {
	return this._shortText(this.config.receiverUrl || (window.location.origin + window.location.pathname), 500);
};

Plugins.listeners._topic = function () {
	var scope = String(this.config.network || this._receiverId());
	var slug = String(scope).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
	var hash = 2166136261;
	for (var i = 0; i < scope.length; i++) {
		hash ^= scope.charCodeAt(i);
		hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
	}
	return 'owrx-listeners-' + (slug || 'network').slice(0, 80) + '-' + (hash >>> 0).toString(16);
};

Plugins.listeners._normalizeSupabaseUrl = function (value) {
	var raw = String(value || '').trim();
	if (!raw) return '';
	try {
		var url = new URL(raw);
		var path = url.pathname.replace(/\/+$/, '');
		var match = path.match(/^(.*)\/(?:rest|auth|realtime|storage)\/v1$/);
		if (match) {
			url.pathname = match[1] || '/';
			url.search = '';
			url.hash = '';
		}
		return url.href.replace(/\/+$/, '');
	} catch (error) {
		return raw.replace(/\/+$/, '');
	}
};

Plugins.listeners._panel = function () {
	if (window.UI && typeof UI.getDemodulatorPanel === 'function') return UI.getDemodulatorPanel();
	return $('#openwebrx-panel-receiver').demodulatorPanel();
};

Plugins.listeners._nativeFrequency = function () {
	var container = document.querySelector('.webrx-actual-freq');
	var display = container ? $(container).data('frequencyDisplay') : null;
	if (display && Number.isFinite(display.frequency)) return Math.round(display.frequency);

	var panel = this._panel();
	var demodulator = panel && panel.getDemodulator ? panel.getDemodulator() : null;
	if (!demodulator || typeof center_freq === 'undefined') return null;
	var frequency = Number(center_freq) + Number(demodulator.get_offset_frequency());
	if (demodulator.get_modulation() === 'cw' && window.UI && UI.getCwOffset) {
		frequency += UI.getCwOffset();
	}
	return Number.isFinite(frequency) ? Math.round(frequency) : null;
};

Plugins.listeners._profile = function () {
	var select = document.getElementById('openwebrx-sdr-profiles-listbox');
	var selected = select && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
	var profile = window.currentprofile || {};
	return {
		profile_key: this._shortText(select ? select.value : '', 160),
		profile_name: this._shortText(selected ? selected.text : '', 100),
		sdr_id: this._shortText(profile.sdr_id, 80),
		profile_id: this._shortText(profile.profile_id, 80)
	};
};

Plugins.listeners._capture = function () {
	var panel = this._panel();
	var demodulator = panel && panel.getDemodulator ? panel.getDemodulator() : null;
	if (!panel || !demodulator) return null;

	var profile = this._profile();
	var mode = panel.mode || null;
	var bandpass = demodulator.getBandpass ? demodulator.getBandpass() : {};
	var frequency = this._nativeFrequency();
	var modeId = mode && mode.modulation ? mode.modulation : (demodulator.get_secondary_demod() || demodulator.get_modulation());
	var underlyingId = demodulator.get_modulation ? demodulator.get_modulation() : '';
	var signature = [profile.profile_key, frequency, modeId, underlyingId].join('|');

	if (signature !== this.state.tuningSignature) {
		this.state.tuningSignature = signature;
		this.state.tunedSince = new Date().toISOString();
	}

	return {
		protocol_version: 1,
		plugin_version: this._version,
		receiver_id: this._receiverId(),
		receiver_name: this._receiverName(),
		receiver_url: this._receiverUrl(),
		sdr_id: profile.sdr_id,
		profile_id: profile.profile_id,
		profile_key: profile.profile_key,
		profile_name: profile.profile_name || profile.profile_id || profile.profile_key,
		frequency: frequency,
		mode_id: this._shortText(modeId, 40),
		mode: this._shortText(mode && mode.name ? mode.name : String(modeId).toUpperCase(), 40),
		underlying_mode_id: this._shortText(underlyingId, 40),
		underlying_mode: this._shortText(String(underlyingId).toUpperCase(), 40),
		filter_low: this._number(bandpass.low_cut),
		filter_high: this._number(bandpass.high_cut),
		tuned_since: this.state.tunedSince
	};
};

Plugins.listeners._publish = function () {
	if (!this.state.connected || !this.state.channel) return;
	var self = this;
	var payload = this._capture();
	if (!payload || payload.frequency === null || !payload.profile_key) return;
	var serialized = JSON.stringify(payload);
	if (serialized === this.state.lastPayload) return;

	// Supabase Presence is rate-limited. Coalesce rapid tuning changes and
	// publish the most recent receiver state when the interval expires.
	var wait = 6500 - (Date.now() - this.state.lastTrackAt);
	if (wait > 0) {
		if (!this.state.publishTimer) {
			this.state.publishTimer = setTimeout(function () {
				self.state.publishTimer = null;
				self._publish();
			}, wait);
		}
		return;
	}

	this.state.lastPayload = serialized;
	this.state.lastTrackAt = Date.now();
	this.state.channel.track(payload).then(function (result) {
		if (result !== 'ok') {
			self.state.lastPayload = '';
			console.warn('Listeners: presence track returned', result);
		}
	}).catch(function (error) {
		self.state.lastPayload = '';
		console.warn('Listeners: unable to publish presence', error);
	});
};

Plugins.listeners._validPresence = function (presence) {
	if (!presence || Number(presence.protocol_version) !== 1) return null;
	var frequency = this._number(presence.frequency);
	if (frequency === null || frequency <= 0 || frequency > 1e12) return null;
	var tunedSince = Date.parse(presence.tuned_since);
	return {
		receiver_id: this._shortText(presence.receiver_id, 100) || 'unknown',
		receiver_name: this._shortText(presence.receiver_name, 100) || 'Receiver',
		receiver_url: this._safeUrl(presence.receiver_url),
		sdr_id: this._shortText(presence.sdr_id, 80),
		profile_id: this._shortText(presence.profile_id, 80),
		profile_key: this._shortText(presence.profile_key, 160),
		profile_name: this._shortText(presence.profile_name, 100) || 'Profile',
		frequency: Math.round(frequency),
		mode_id: this._shortText(presence.mode_id, 40),
		mode: this._shortText(presence.mode, 40) || '—',
		underlying_mode_id: this._shortText(presence.underlying_mode_id, 40),
		underlying_mode: this._shortText(presence.underlying_mode, 40),
		filter_low: this._number(presence.filter_low),
		filter_high: this._number(presence.filter_high),
		tuned_since: Number.isFinite(tunedSince) ? new Date(tunedSince).toISOString() : null
	};
};

Plugins.listeners._safeUrl = function (value) {
	try {
		var url = new URL(String(value || ''), window.location.href);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
	} catch (error) {
		return '';
	}
};

Plugins.listeners._syncPresence = function () {
	if (!this.state.channel) return;
	var raw = this.state.channel.presenceState();
	var presences = [];
	var self = this;
	Object.keys(raw).forEach(function (key) {
		(raw[key] || []).forEach(function (presence) {
			var valid = self._validPresence(presence);
			if (valid) presences.push(valid);
		});
	});
	this.state.presences = presences;
	this._render();
};

Plugins.listeners._setStatus = function (kind, text) {
	this.state.statusKind = kind;
	this.state.statusText = text;
	var status = $('#owrx-listeners-status');
	status.attr('data-status', kind).text(text);
	$('#plugin-button-listeners').attr('data-status', kind);
	this._render();
};

Plugins.listeners._formatFrequency = function (frequency) {
	if (frequency >= 1e9) return (frequency / 1e9).toFixed(4) + ' GHz';
	if (frequency >= 30e6) return (frequency / 1e6).toFixed(4) + ' MHz';
	if (frequency >= 1e3) return (frequency / 1e3).toFixed(4) + ' kHz';
	return Number(frequency).toFixed(4) + ' Hz';
};

Plugins.listeners._formatDuration = function (isoDate) {
	if (!isoDate) return '';
	var seconds = Math.max(0, Math.floor((Date.now() - Date.parse(isoDate)) / 1000));
	if (seconds < 60) return seconds + 's';
	if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
	if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
	return Math.floor(seconds / 86400) + 'd ' + Math.floor((seconds % 86400) / 3600) + 'h';
};

Plugins.listeners._groups = function () {
	var receivers = Object.create(null);
	this.state.presences.forEach(function (presence) {
		var receiver = receivers[presence.receiver_id];
		if (!receiver) {
			receiver = receivers[presence.receiver_id] = {
				id: presence.receiver_id,
				name: presence.receiver_name,
				url: presence.receiver_url,
				count: 0,
				profiles: Object.create(null)
			};
		}
		receiver.count++;
		var profileKey = presence.profile_key || presence.profile_id || presence.profile_name;
		var profile = receiver.profiles[profileKey];
		if (!profile) {
			profile = receiver.profiles[profileKey] = {
				key: presence.profile_key,
				name: presence.profile_name,
				count: 0,
				tunings: Object.create(null)
			};
		}
		profile.count++;
		var tuningKey = [presence.frequency, presence.mode_id, presence.underlying_mode_id,
			presence.filter_low, presence.filter_high].join('|');
		var tuning = profile.tunings[tuningKey];
		if (!tuning) {
			tuning = profile.tunings[tuningKey] = {
				data: presence,
				count: 0,
				oldest: presence.tuned_since
			};
		}
		tuning.count++;
		if (presence.tuned_since && (!tuning.oldest || presence.tuned_since < tuning.oldest)) {
			tuning.oldest = presence.tuned_since;
		}
	});
	return receivers;
};

Plugins.listeners._renderReceiver = function (receiver, local) {
	var self = this;
	var section = $('<section class="owrx-listeners__receiver"></section>');
	var heading = $('<div class="owrx-listeners__receiver-heading"></div>');
	var name = $('<span class="owrx-listeners__receiver-name"></span>').text(receiver.name);
	if (!local && receiver.url) {
		name = $('<a class="owrx-listeners__receiver-name" target="_blank" rel="noopener noreferrer"></a>')
			.attr('href', receiver.url).text(receiver.name);
	}
	heading.append(name).append($('<span class="owrx-listeners__badge"></span>').text(receiver.count));
	if (!local) heading.append($('<span class="owrx-listeners__remote"></span>').text('remote'));
	section.append(heading);

	Object.keys(receiver.profiles).sort(function (a, b) {
		return receiver.profiles[a].name.localeCompare(receiver.profiles[b].name);
	}).forEach(function (profileKey) {
		var profile = receiver.profiles[profileKey];
		var block = $('<div class="owrx-listeners__profile"></div>');
		var profileHeading = $('<div class="owrx-listeners__profile-heading"></div>')
			.append($('<span></span>').text(profile.name))
			.append($('<span class="owrx-listeners__profile-count"></span>').text(profile.count));
		block.append(profileHeading);

		Object.keys(profile.tunings).sort(function (a, b) {
			return profile.tunings[a].data.frequency - profile.tunings[b].data.frequency;
		}).forEach(function (tuningKey) {
			var tuning = profile.tunings[tuningKey];
			var data = tuning.data;
			var row = $('<div class="owrx-listeners__tuning"></div>');
			if (local) {
				row.addClass('owrx-listeners__tuning--local').attr('title', 'Tune here').on('click', function () {
					self._tune(data);
				});
			}
			row.append($('<span class="owrx-listeners__frequency"></span>').text(self._formatFrequency(data.frequency)));
			var modeLabel = data.mode;
			if (data.underlying_mode && data.underlying_mode_id !== data.mode_id) modeLabel += ' · ' + data.underlying_mode;
			row.append($('<span class="owrx-listeners__mode"></span>').text(modeLabel));
			row.append($('<span class="owrx-listeners__duration"></span>').text(self._formatDuration(tuning.oldest)));
			row.append($('<span class="owrx-listeners__count"></span>').text(tuning.count));
			block.append(row);
		});
		section.append(block);
	});
	return section;
};

Plugins.listeners._render = function () {
	var content = $('#owrx-listeners-content');
	if (!content.length) return;
	content.empty();
	var receivers = this._groups();
	var ids = Object.keys(receivers);
	var localId = this._receiverId();
	var total = this.state.presences.length;
	$('#owrx-listeners-total').text(total + (total === 1 ? ' listener' : ' listeners'));
	$('#plugin-button-listeners')
		.attr('data-count', total)
		.attr('title', 'Listeners: ' + total)
		.attr('aria-label', 'Listeners: ' + total);
	if (!ids.length) {
		var emptyText = 'Waiting for Supabase…';
		if (this.state.connected) emptyText = 'No active listeners.';
		else if (this.state.statusKind === 'idle') emptyText = 'Supabase is not configured.';
		else if (this.state.statusKind === 'error') emptyText = this.state.statusText + '. Check the browser console.';
		content.append($('<div class="owrx-listeners__empty"></div>').text(emptyText));
		return;
	}
	var self = this;
	ids.sort(function (a, b) {
		if (a === localId) return -1;
		if (b === localId) return 1;
		return receivers[a].name.localeCompare(receivers[b].name);
	}).forEach(function (id) {
		content.append(self._renderReceiver(receivers[id], id === localId));
	});
};

Plugins.listeners._setFrequency = function (frequency) {
	var container = document.querySelector('.webrx-actual-freq');
	if (container) $(container).trigger('frequencychange', [frequency]);
};

Plugins.listeners._applyTune = function (data) {
	var panel = this._panel();
	if (!panel) return;
	if (data.mode_id && panel.setMode) panel.setMode(data.mode_id, data.underlying_mode_id || undefined);
	var demodulator = panel.getDemodulator ? panel.getDemodulator() : null;
	if (demodulator && demodulator.setBandpass && data.filter_low !== null && data.filter_high !== null) {
		demodulator.setBandpass({low_cut: data.filter_low, high_cut: data.filter_high});
	}
	this._setFrequency(data.frequency);
	this.state.pendingTune = null;
};

Plugins.listeners._tune = function (data) {
	var select = document.getElementById('openwebrx-sdr-profiles-listbox');
	if (!select || !data.profile_key) return;
	if (select.value === data.profile_key) {
		this._applyTune(data);
		return;
	}
	var exists = Array.prototype.some.call(select.options, function (option) {
		return option.value === data.profile_key;
	});
	if (!exists || typeof window.sdr_profile_changed !== 'function') return;
	this.state.pendingTune = data;
	select.value = data.profile_key;
	window.sdr_profile_changed();
};

Plugins.listeners._profileChanged = function () {
	var self = this;
	setTimeout(function () {
		var pending = self.state.pendingTune;
		var select = document.getElementById('openwebrx-sdr-profiles-listbox');
		if (pending && select && select.value === pending.profile_key) self._applyTune(pending);
		self._publish();
	}, 250);
};

Plugins.listeners._disconnect = function () {
	this.state.generation++;
	this.state.connected = false;
	this.state.lastPayload = '';
	this.state.lastTrackAt = 0;
	this.state.presences = [];
	if (this.state.publishTimer) clearTimeout(this.state.publishTimer);
	if (this.state.reconnectTimer) clearTimeout(this.state.reconnectTimer);
	this.state.publishTimer = null;
	this.state.reconnectTimer = null;
	var client = this.state.client;
	var channel = this.state.channel;
	this.state.channel = null;
	this.state.client = null;
	if (channel) {
		try { channel.untrack(); } catch (error) { /* socket cleanup is best effort */ }
		if (client && client.removeChannel) client.removeChannel(channel);
	}
	this._render();
};

Plugins.listeners._scheduleReconnect = function (generation) {
	if (generation !== this.state.generation || this.state.reconnectTimer) return;
	var self = this;
	var delay = Math.min(1000 * Math.pow(2, this.state.reconnectAttempts), 30000);
	this.state.reconnectAttempts++;
	this.state.connected = false;
	this.state.presences = [];
	this._setStatus('connecting', 'Reconnecting in ' + Math.ceil(delay / 1000) + 's');
	this.state.reconnectTimer = setTimeout(function () {
		self.state.reconnectTimer = null;
		if (generation === self.state.generation) self._connect(true);
	}, delay);
};

Plugins.listeners._loadSdk = function () {
	if (window.supabase && window.supabase.createClient) return Promise.resolve();
	return Plugins._load_script(this.config.sdkUrl).then(function () {
		if (!window.supabase || !window.supabase.createClient) throw new Error('Supabase SDK did not load');
	});
};

Plugins.listeners._connect = function (retry) {
	var self = this;
	if (!retry) this.state.reconnectAttempts = 0;
	this._disconnect();
	if (!this.config.supabaseUrl || !this.config.supabaseKey) {
		this._setStatus('idle', 'Not configured');
		return Promise.resolve(false);
	}

	var generation = this.state.generation;
	this._setStatus('connecting', 'Connecting');
	return this._loadSdk().then(function () {
		if (generation !== self.state.generation) return false;
		var projectUrl = self._normalizeSupabaseUrl(self.config.supabaseUrl);
		var client = window.supabase.createClient(projectUrl, self.config.supabaseKey, {
			auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}
		});
		var channel = client.channel(self._topic(), {
			config: {presence: {key: self.state.sessionId}}
		});
		self.state.client = client;
		self.state.channel = channel;
		channel.on('presence', {event: 'sync'}, function () { self._syncPresence(); });
		channel.subscribe(function (status, error) {
			if (generation !== self.state.generation) return;
			if (status === 'SUBSCRIBED') {
				if (self.state.reconnectTimer) clearTimeout(self.state.reconnectTimer);
				self.state.reconnectTimer = null;
				self.state.reconnectAttempts = 0;
				self.state.connected = true;
				self._setStatus('live', 'Live');
				self._publish();
			} else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
				self.state.connected = false;
				if (error) console.error('Listeners: Realtime subscription failed', error);
				self._scheduleReconnect(generation);
			} else if (status === 'CLOSED') {
				self.state.connected = false;
				self._scheduleReconnect(generation);
			}
		});
		return true;
	}).catch(function (error) {
		if (generation === self.state.generation) {
			self._setStatus('error', 'Connection error');
			console.error('Listeners:', error);
			self._scheduleReconnect(generation);
		}
		return false;
	});
};

Plugins.listeners.setup = function (options) {
	this.config = Plugins.utils.deepMerge({}, this.defaults, options || {});
	this.config.supabaseUrl = this._normalizeSupabaseUrl(this.config.supabaseUrl);
	if (!this.state.initialized) return Promise.resolve(true);
	if (options && Object.prototype.hasOwnProperty.call(options, 'open')) {
		Plugins.toggleWindow('listeners', !!options.open);
	}
	return this._connect(false);
};

Plugins.listeners.init = async function () {
	if (!Plugins.isLoaded('utils', 0.9)) {
		console.warn('Listeners plugin requires utils plugin v0.9 or higher.');
		return false;
	}
	if (typeof Plugins.addButton !== 'function' || typeof Plugins.addWindow !== 'function') {
		console.warn('Listeners plugin requires an OpenWebRX+ version with native plugin windows.');
		return false;
	}
	if (this.state.initialized) return true;
	await new Promise(function (resolve) { Plugins.utils.on_ready(resolve); });

	this.state.initialized = true;
	this.state.sessionId = this._sessionId();
	var button = Plugins.addButton('listeners', 'LST', function () { Plugins.toggleWindow('listeners'); });
	$(button).attr('data-count', 0).attr('aria-label', 'Listeners: 0');
	Plugins.addWindow('listeners', 'Listeners',
		'<div class="owrx-listeners">' +
			'<div class="owrx-listeners__summary">' +
				'<span id="owrx-listeners-total">0 listeners</span>' +
				'<span id="owrx-listeners-status" data-status="idle">Not configured</span>' +
			'</div>' +
			'<div id="owrx-listeners-content" class="owrx-listeners__content"></div>' +
			'<div class="owrx-listeners__hint">Click a row on this receiver to tune there.</div>' +
		'</div>');

	var self = this;
	this.state.pollTimer = setInterval(function () { self._publish(); }, 1000);
	this.state.renderTimer = setInterval(function () { self._render(); }, 30000);
	$(document).on('server:config:after.listeners event:profile_changed.listeners', function () {
		self._profileChanged();
	});
	window.addEventListener('beforeunload', function () { self._disconnect(); });
	if (this.config.open) Plugins.toggleWindow('listeners', true);
	this._render();
	if (this.config.supabaseUrl && this.config.supabaseKey) this._connect(false);
	return true;
};
