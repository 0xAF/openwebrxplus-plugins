# SelCall STQC Plugin for OpenWebRX+

This plugin adds STQC (Polish firefighters) selcall decoding to OpenWebRX+. It enhances the existing SelCall functionality to recognize and decode STQC codes used by Polish firefighters.

## Features

- Automatically detects STQC codes in SelCall messages
- Decodes 5-digit codes (AABBC format)
  - AA = Unit type (10-99)
  - BB = Unit number (01-99)
  - C = Subunit or function (0-9)
- Decodes 6-digit codes (AABBCC format)
  - AA = Region code (01-99)
  - BB = District code (01-99)
  - CC = Station code (01-99)
- Displays decoded information inline with the original SelCall message

## Installation

1. Make sure the `utils` plugin is installed
2. Copy the `selcall_stqc` folder to your OpenWebRX+ plugins directory: `/path/to/htdocs/plugins/receiver/`
3. Edit your `init.js` file in the `/path/to/htdocs/plugins/receiver/` directory to load the plugin:

```javascript
// First load the utils plugin
Plugins.load('utils').then(async function () {
    // Then load the STQC plugin
    Plugins.load('selcall_stqc');
});
```

## Usage

Once installed, the plugin will automatically enhance SelCall messages containing STQC codes. No additional configuration is needed.

When a SelCall message contains a 5 or 6-digit code matching the STQC format, the plugin will append the decoded information to the message.

## Example

Original message:
```
[ZVEI1] 25301
```

Enhanced message with STQC decoding:
```
[ZVEI1] 25301 [STQC: Fire engine #53 (Main unit)]
```

## Requirements

- OpenWebRX+ with SelCall functionality enabled
- Utils plugin (version 0.1 or higher)

## License

MIT License