---
layout: default
title: Listeners
parent: Receiver Plugins
permalink: /receiver/listeners/
---

# Listeners

Listeners shows what the active clients of an OpenWebRX+ receiver are listening to. It uses [Supabase Realtime Presence](https://supabase.com/docs/guides/realtime/presence) directly from each browser, so the receiver administrator does not need to install or maintain a separate backend.

The plugin has its own native OpenWebRX+ floating window and does not use uikit.

## Features

- Total number of participating listeners.
- Compact listener-count badge on the native `LST` plugin button.
- Listener counts grouped by active SDR profile.
- Frequency with four decimal places, selected mode, underlying demodulator, filter and listening duration.
- Click a row belonging to the current receiver to select its profile and tune there.
- Optional network view: several receivers can share one network name and see each other's active listeners. Remote receivers are informational and can link back to their own receiver page.
- Automatic Realtime reconnection with exponential backoff; rapid tuning changes are coalesced to stay within Presence rate limits.
- Inactive profiles and receivers are not shown.

The plugin does not publish signal levels, scanner state, decoded messages, IP addresses, browser details or a persistent user identifier. Every browser tab receives a new random session identifier.

Loading the plugin opts that browser tab into publishing its selected profile, frequency, mode and filter to the configured public Presence channel. There is deliberately no client-side hide option: the listener counts and tuning details always describe the same participating clients.

## Supabase setup

1. Create a Supabase project.
2. Open the project in the Supabase Dashboard and click **Connect** in the project header.
3. Select **Framework — Use a client library**, choose **Astro**, then open the **`.env.local`** tab under **Add files**. You do not need to install the package or add the files shown by Supabase; the plugin loads the browser library itself.
4. Copy only the two values from the `.env.local` example into the plugin configuration:
   - The value after `SUPABASE_URL=` goes into `supabaseUrl`. It must end immediately after `.supabase.co`.
   - The value after `SUPABASE_KEY=` goes into `supabaseKey`. It normally starts with `sb_publishable_`; a legacy `anon` key also works.
   - If another framework is selected, the variable names may differ, but the URL and Publishable key values are the same. The key is also available under **Project Settings → API Keys**. Do not copy a Secret or `service_role` key.
5. Open **Realtime → Set up Realtime for me → Permissions Settings → Schema, Logs and Database** and make sure Realtime is enabled. No database table, SQL migration or user registration is required; the plugin uses a public Presence channel.
6. Add the configuration shown below to `receiver/init.js`.

Do not use the REST endpoint from **Integrations → Data API** as the Project URL:

```text
Project URL: https://abcdefgh.supabase.co          ← use this
REST URL:    https://abcdefgh.supabase.co/rest/v1/ ← not this
```

For convenience, the plugin recognizes and removes `/rest/v1/` if it is pasted accidentally.

The publishable/anon key is designed to be used in browser code and is not a secret. Never put a Supabase `service_role` or secret key in `init.js`. The network name is a namespace, not an access-control boundary: a visitor can inspect the browser configuration and join the public channel. Use a dedicated Supabase project and do not publish sensitive information through it.

## Configuration

Load `utils`, wait for the receiver page, then load and configure Listeners:

```javascript
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/listeners/listeners.js');
await Plugins.listeners.setup({
	supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
	supabaseKey: 'YOUR-PUBLISHABLE-KEY'
});
```

Alternatively, let visitors enable it through `plugin_loader`. Listeners is hidden from that window until its public Supabase settings are present:

```javascript
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/plugin_loader/plugin_loader.js');
await Plugins.plugin_loader.setup({
	allowed: ['listeners'],
	plugin_options: {
		listeners: {
			supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
			supabaseKey: 'YOUR-PUBLISHABLE-KEY'
		}
	}
});
```

The minimal setup groups clients from the current receiver only. To create an SDR network, use the same Supabase project, key and `network` value on every receiver:

```javascript
await Plugins.listeners.setup({
	supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
	supabaseKey: 'YOUR-PUBLISHABLE-KEY',
	network: 'my-private-network-name',
	receiverId: 'sdr-sofia',
	receiverName: 'Sofia SDR',
	receiverUrl: 'https://sdr.example.com/'
});
```

Available options:

| Option | Default | Description |
| :----- | :------ | :---------- |
| `supabaseUrl` | empty | Supabase project URL. |
| `supabaseKey` | empty | Supabase Publishable key or legacy `anon` key. |
| `network` | empty | Shared channel name. Empty isolates presence to this receiver. |
| `receiverId` | current host | Stable unique ID inside a shared network. |
| `receiverName` | receiver title | Human-readable receiver name. |
| `receiverUrl` | current page | Link shown for a remote receiver. |
| `open` | `false` | Open the Listeners window immediately after loading. |
| `sdkUrl` | jsDelivr | Alternate URL for the Supabase JavaScript SDK. |

Use the Project URL from the **Connect → App Frameworks** dialog. The plugin also strips common copied API endpoint suffixes automatically, but the root Project URL is the unambiguous value expected by Supabase.

Supabase free-plan quotas and Realtime limits apply. Each open receiver tab uses one Realtime connection and one Presence member.

## Code

[Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/listeners)
