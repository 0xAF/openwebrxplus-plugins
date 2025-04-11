/*
 * Utils plugin.
 *
 * This plugin provides a function wrapping method (read below)
 * and adds some events for the rest plugins.
 *
 * License: MIT
 * Copyright (c) 2023-2025 Stanislav Lechev [0xAF], LZ2SLL
 *
 * Changes:
 * 0.1:
 *  - initial release
 * 0.2:
 *  - add document.owrx_initialized boolean var, once initialized
 *  - add _DEBUG_ALL_EVENTS
 * 0.3:
 *  - handle return value of AfterCallBack of the wrapper
 * 0.4:
 *  - add on_ready() method to call a callback when OWRX+ is initialized
 */

// Disable CSS loading for this plugin
Plugins.utils.no_css = true;

// Utils plugin version
Plugins.utils._version = 0.4;

/**
 * Wrap an existing function with before and after callbacks.
 * @param {string} name The name of function to wrap with before and after callbacks.
 * @param {function(orig, thisArg, args):boolean} before_cb Callback before original. Return true to call the original.
 * @param {function(result, orig, thisArg, args):any} after_cb Callback after original, will receive the result of original
 * @param {object} obj [optional] Object to look for function into. Default is 'window'
 * @description
 *   - Before Callback:
 *     - Params:
 *       - orig: Original function (in case you want to call it, you have to return false to prevent second calling)
 *       - thisArg: local 'this' for the original function
 *       - args: arguments passed to the original function
 *     - Returns: Boolean. Return false to prevent execution of original function and the after callback.
 *   - After Callback:
 *     - Params:
 *       - res: Result of the original function
 *       - thisArg: local 'this' for the original function
 *       - args: arguments passed to the original function
 *     - Returns: Any. Return anything to the original caller. This can be used to replace the original value.
 *
 * @example
 * // Using before and after callbacks.
 * Plugins.utils.wrap_func('sdr_profile_changed',
 *   function (orig, thisArg, args) { // before callback
 *     console.log(orig.name);
 *     if (something_bad)
 *       console.log('This profile is disabled by proxy function');
 *       return false; // return false to prevent the calling of the original function and the after_cb()
 *     }
 *     return true; // always return true, to call the original function
 *   },
 *   function (res, thisArg, args) { // after callback
 *     console.log(res);
 *     return res;
 *   }
 * );
 *
 * @example
 * // Using only before callback and handle original.
 * Plugins.utils.wrap_func('sdr_profile_changed',
 *   function (orig, thisArg, args) { // before callback
 *     // if we need to call the original in the middle of our work
 *     do_something_before_original();
 *     var res = orig.apply(thisArg, args);
 *     do_something_after_original(res);
 *     return false; // to prevent calling the original and after_cb
 *   },
 *   function (res) { // after callback
 *     // ignored
 *     return res;
 *   }
 * );
 *
 */
Plugins.utils.wrap_func = function (name, before_cb, after_cb, obj = window) {
  if (typeof (obj[name]) !== "function") {
    console.error("Cannot wrap non existing function: '" + obj + '.' + name + "'");
    return false;
  }

  var fn_original = obj[name];
  var proxy = new Proxy(obj[name], {
    apply: function (target, thisArg, args) {
      if (before_cb(target, thisArg, args)) {
        var orgRet = fn_original.apply(thisArg, args);
        var ret = after_cb(orgRet, thisArg, args);
        return ret !== undefined ? ret : orgRet;
      }
    }
  });

  obj[name] = proxy;
}

Plugins.utils.on_ready = function (callback) {
  if (typeof callback === 'function') {
    if (document.owrx_initialized) {
      // console.debug('Utils: calling init callback..');
      callback();
    } else {
      // console.debug('Utils: waiting for OWRX+ to be initialized..');
      setTimeout(() => Plugins.utils.on_ready(callback), 50);
    }
  } else {
    console.error("Plugins.utils.on_init() expects a function as a parameter.");
  }
}

// Init utils plugin
Plugins.utils.init = function () {
  var send_events_for = {};

  // function name to proxy.
  send_events_for['sdr_profile_changed'] = {
    // [optional] event name (prepended with 'event:'). Default is function name.
    name: 'profile_changed',
    // [optional] data to send with the event (should be function).
    data: function () {
      return $('#openwebrx-sdr-profiles-listbox').find(':selected').text()
    }
  };

  send_events_for['on_ws_recv'] = {
    // if we use handler, it will replace the before_cb
    handler: function (orig, thisArg, args) {
      if (typeof (args[0].data) === 'string' && args[0].data.substr(0, 16) !== "CLIENT DE SERVER") {
        try {
          var json = JSON.parse(args[0].data);
          if (Plugins.utils._DEBUG_ALL_EVENTS && json.type !== 'smeter')
            console.debug("server:" + json.type + ":before", [json['value']]);
          $(document).trigger('server:' + json.type + ":before", [json['value']]);
        } catch (e) {}
      }

      // we handle original function here
      orig.apply(thisArg, args);

      if (typeof (json) === 'object') {
        if (Plugins.utils._DEBUG_ALL_EVENTS && json.type !== 'smeter')
          console.debug("server:" + json.type + ":after", [json['value']]);
        $(document).trigger('server:' + json.type + ":after", [json['value']]);
      }

      // do not call the after_cb
      return false;
    }
  };

  $.each(send_events_for, function (key, obj) {
    Plugins.utils.wrap_func(
      key,
      typeof (obj.handler) === 'function' ? obj.handler : function () {
        return true;
      },
      function (res) {
        var ev_data;
        var ev_name = key;
        if (typeof (obj.name) === 'string') ev_name = obj.name;
        if (typeof (obj.data) === 'function') ev_data = obj.data(res);
        if (Plugins.utils._DEBUG_ALL_EVENTS) console.debug("event:" + ev_name, ev_data);
        $(document).trigger("event:" + ev_name, [ev_data]);
      }
    );
  });

  var interval = setInterval(function () {
    if (typeof (clock) === 'undefined') return;
    clearInterval(interval);
    // console.debug('Utils: inform other plugins that OWRX+ is initialized..');
    $(document).trigger('event:owrx_initialized');
    document.owrx_initialized = true;
  }, 100);

  return true;
}
