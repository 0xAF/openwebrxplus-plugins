---
layout: page
title: "OpenWebRX+ Receiver Plugin: Utils (utility)"
permalink: /receiver/utils
---

This `utility` plugin will give a function wrapping method and will send some events.  
This plugin is a dependency for almost all plugins.

## Features

- Function interception via `wrap_func()`
- Initialization hook via `on_ready()`
- Deep object merging via `deepMerge()`
- DOM mutation helper via `observe_mutations()`
- Observer cleanup helper via `disconnect_observers()`

## Load

Add this lines in your `init.js` file (await ensures it finishes before dependents):

```js
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
// load the rest of your plugins here
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).

## API

### `Plugins.utils.wrap_func(name, before_cb, after_cb, obj)`

Wrap a function and intercept calls before and/or after execution.

### `Plugins.utils.on_ready(callback)`

Run `callback` once OpenWebRX+ has completed initialization.

### `Plugins.utils.deepMerge(target, ...sources)`

Deeply merge one or more source objects into `target` and return the mutated target.

- Sources are applied from left to right; later values take precedence.
- Nested objects are merged recursively.
- Arrays, primitives and `null` property values replace the previous value.
- Invalid source arguments are ignored.
- Existing two-argument calls remain supported.

```js
var defaults = {
	open: false,
	colors: {background: 'black', foreground: 'white'},
	steps: [100, 1000]
};
var options = {
	open: true,
	colors: {foreground: 'yellow'}
};

var settings = Plugins.utils.deepMerge({}, defaults, options);
// {
//   open: true,
//   colors: {background: 'black', foreground: 'yellow'},
//   steps: [100, 1000]
// }
```

### `Plugins.utils.observe_mutations(targets, options, callback, run_now)`

Create one or more `MutationObserver` instances with a shared callback.

- `targets`: single node, array, `NodeList`, or `HTMLCollection`
- `options`: standard `MutationObserver.observe()` options
- `callback(mutationsList, observer, target)`: called on mutation batches
- `run_now`: if `true`, callback is called once immediately per valid target

Returns an array of handles: `{ observer, target, disconnect }`.

Example:

```js
var handles = Plugins.utils.observe_mutations(
  [tabEl, rootEl],
  { attributes: true, attributeFilter: ['class'] },
  function () {
    refreshVisibility();
  },
  true
);
```

### `Plugins.utils.disconnect_observers(handles)`

Disconnect handles returned by `observe_mutations()`.

- Accepts a single handle or an array of handles.
- Returns the number of disconnected observers.

```js
Plugins.utils.disconnect_observers(handles);
```

## Code

Code is in the [Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/utils).
