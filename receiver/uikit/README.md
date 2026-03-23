# UI Kit (uikit)

UI helper toolkit for OpenWebRX+ plugins. Provides a dockable panel, settings modal, plugin modals, toast notifications, loading overlays, and helper methods for other plugins to build UI.

**Version:** 0.2

## Load

Add to your `plugins/receiver/init.js`:

```js
Plugins.uikit = Plugins.uikit || {};
Plugins.uikit.settings = {
  position: 'bottom',   // top | right | bottom | left
  visible: true,
  mode: 'overlay'       // overlay | push
};

await Plugins.load('uikit');
```

---

## Panel & Settings API

### `addTab(name, opts)` → slug

Adds a tab to the dockable panel. Returns the slug used in the element id.

**opts:** `{ order: number, icon: SVGElement|string, activate: bool }`

### `addSettingsTab(name, opts)` → slug

Adds a tab to the settings modal.

### `getTabEl(name)` → HTMLElement | null

Returns the panel tab content element. Element id: `uikit-tab-{slug}`.

### `getSettingsTabEl(name)` → HTMLElement | null

Returns the settings tab content element. Element id: `uikit-settings-tab-{slug}`.

### `openSettings(tabName?)`

Opens the settings modal, optionally activating a tab by name.

### `closeSettings()`

Closes the settings modal.

### `setPanelPosition(pos)`

Sets panel position (`top` | `right` | `bottom` | `left`).

### `setPanelVisible(visible)`

Shows or hides the panel.

### `setPanelMode(mode)`

Sets panel mode (`overlay` or `push`).

### `svgFromString(svgString)` → SVGElement | null

Parses an SVG string and returns a proper SVG DOM element.

---

## Button Factory

### `createButton(label, opts)` → HTMLButtonElement

Creates a styled button element.

**opts:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `style` | `'default'`\|`'primary'`\|`'ghost'`\|`'danger'` | `'default'` | Button visual style |
| `onClick` | function\|null | `null` | Click handler |
| `className` | string | `''` | Extra CSS class(es) |
| `title` | string\|null | `null` | Tooltip text |
| `disabled` | bool | `false` | Initially disabled |

```js
var ok = Plugins.uikit.createButton('Save', {
  style: 'primary',
  onClick: function () { m.close(); }
});
m.footerEl.appendChild(ok);

var cancel = Plugins.uikit.createButton('Cancel', { style: 'ghost' });
```

---

## Plugin Modal API

### `createModal(slug, opts)` → handle

Creates and registers a modal. Idempotent — calling again with the same slug updates opts and returns the existing handle.

**opts:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | string\|false | `false` | Title text. Shows title bar if set. |
| `titleBar` | bool | auto | Force title bar on/off. |
| `closeButton` | bool | `true` | Show a close button. |
| `closeButtonPosition` | `'left'`\|`'right'` | `'right'` | Close button placement. |
| `closeOnBackdrop` | bool | `true` | Click outside to close. |
| `closeOnEsc` | bool | `true` | Escape key to close. |
| `border` | bool | `true` | Show border. |
| `borderStyle` | string | theme | CSS `border` shorthand. |
| `borderRadius` | string | theme | CSS `border-radius`. |
| `resizable` | bool | `false` | Drag handle on bottom-right. |
| `width` | string | `'480px'` | Initial width. |
| `height` | string | `'auto'` | Initial height. |
| `minWidth` | string | `'200px'` | Min width (resizable). |
| `minHeight` | string | `'80px'` | Min height (resizable). |
| `className` | string | `''` | Extra CSS class(es). |
| `backdrop` | bool | `true` | Dimming backdrop. |
| `footer` | bool | `false` | Bottom button bar. |
| `onOpen` | function\|null | `null` | Called after modal opens. |
| `onClose` | function\|null | `null` | Called before close. Return `false` to prevent. |

**Handle object:**

```js
{
  contentEl,  // <div> for your content
  footerEl,   // <div> for buttons (null if footer:false)
  open(),     // open the modal
  close(),    // close the modal
  destroy()   // remove from DOM and registry
}
```

### `openModal(slug)`

Opens a registered modal by slug.

### `closeModal(slug)`

Closes a modal. Calls `onClose` hook first — if it returns `false`, the close is prevented.

### `destroyModal(slug)`

Removes a modal from the DOM and internal registry.

### `getModal(slug)` → handle | null

Returns the handle for an existing modal, or `null`.

### Example

```js
var m = Plugins.uikit.createModal('my-dialog', {
  title: 'Settings',
  resizable: true,
  footer: true,
  width: '500px',
  onClose: function () {
    console.log('modal closing');
  }
});

m.contentEl.innerHTML = '<p>Plugin content here</p>';

var saveBtn = document.createElement('button');
saveBtn.className = 'owrx-uikit__btn owrx-uikit__btn--primary';
saveBtn.textContent = 'Save';
saveBtn.addEventListener('click', function () { m.close(); });
m.footerEl.appendChild(saveBtn);

m.open();
```

---

## Dialogs

### `info(message, opts)` → Promise

Shows a modal with a message and an **OK** button. Returns a Promise that resolves when OK is clicked. The modal is auto-destroyed.

```js
await Plugins.uikit.info('Scan complete.', { title: 'Done' });
```

**opts:** `{ title: 'Information', okLabel: 'OK', width: '400px' }`

`message` can be a string or an HTMLElement.

### `question(message, opts)` → Promise\<boolean\>

Shows a modal with **OK / Cancel** buttons. Resolves `true` (OK) or `false` (Cancel). Auto-destroyed.

```js
var yes = await Plugins.uikit.question('Delete this bookmark?', {
  title: 'Confirm',
  okLabel: 'Delete',
  cancelLabel: 'Keep'
});
if (yes) { /* confirmed */ }
```

**opts:** `{ title: 'Confirm', okLabel: 'OK', cancelLabel: 'Cancel', width: '400px' }`

---

## Toast Notifications

Replaces the standalone `notify` plugin. Toasts stack vertically with auto-dismiss timers that pause on hover.

### `toast(message, opts)` → id

Shows a toast notification. Returns a unique ID for early dismissal.

**opts:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | string | `'info'` | `'info'`, `'success'`, `'warning'`, `'error'` |
| `title` | string\|false | `false` | Bold title line above the message. |
| `timeout` | number (ms) | `4000` | Auto-dismiss delay. `0` = never. |
| `closable` | bool | `true` | Show × close button. |
| `position` | string | `'bottom-center'` | See positions below. |

**Positions:** `'top-left'`, `'top-center'`, `'top-right'`, `'bottom-left'`, `'bottom-center'`, `'bottom-right'`

```js
Plugins.uikit.toast('Signal locked.', { type: 'success', timeout: 3000 });

Plugins.uikit.toast('Low SNR detected.', {
  type: 'warning',
  title: 'Warning',
  timeout: 5000
});
```

### `dismissToast(id)`

Immediately dismisses a toast by ID (animates out then removes).

### `dismissAllToasts()`

Dismisses all visible toasts.

### Hover pause

When the mouse cursor enters a toast, the auto-dismiss timer pauses and the progress bar freezes. When the cursor leaves, the timer resumes with the remaining time.

---

## Loading Overlay

### `loading(el, show)`

Shows or hides a dimming overlay with a spinner over any DOM element.

- `el` — DOM element or CSS selector string
- `show` — `true` to show, `false` to remove

```js
Plugins.uikit.loading(panelEl, true);
await fetchData();
Plugins.uikit.loading(panelEl, false);
```

Works on modal content too:

```js
var m = Plugins.uikit.getModal('my-modal');
Plugins.uikit.loading(m.contentEl, true);
```

---

## CSS Classes

All styles are scoped under `.owrx-uikit`. Button classes available for use in modals and footers:

- `.owrx-uikit__btn` — base button
- `.owrx-uikit__btn--primary` — primary action (blue)
- `.owrx-uikit__btn--danger` — destructive action (red)
- `.owrx-uikit__btn--ghost` — secondary/cancel (outline)

---

## Demo Plugin

See `receiver/example_uikit/` for a working demo that exercises every feature described above. Load it after uikit:

```js
await Plugins.load('uikit');
await Plugins.load('example_uikit');
```

---

## Notes

- Settings are stored under localStorage key `uikit` via `LS.save/LS.loadStr`.
- On mobile (viewport < 768px), only `top` and `bottom` panel positions are available.
- Toast containers are appended to `document.body`, independent of the panel position.
- Plugin modals are appended to the uikit root element at z-index 10001.
