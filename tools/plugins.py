#!/usr/bin/env python3
"""
Validate receiver/plugins.json and regenerate the plugin tables in README.md.

receiver/plugins.json is the single source of truth for receiver plugins.
It is used by the plugin_loader plugin and to generate the README tables.

Usage:
  python3 tools/plugins.py          # validate and rewrite README.md tables
  python3 tools/plugins.py --check  # validate only; exit 1 if README.md is outdated

License: MIT
Copyright (c) 2026 Stanislav Lechev [0xAF], LZ2SLL
"""

import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'receiver', 'plugins.json')
README = os.path.join(ROOT, 'README.md')

CATEGORIES = ('builtin', 'receiver', 'utility', 'deprecated', 'experimental', 'thirdparty')
# categories rendered as README tables (experimental plugins are not listed)
TABLES = ('builtin', 'receiver', 'utility', 'deprecated', 'thirdparty')
KNOWN_KEYS = {
	'id', 'category', 'description', 'author', 'requires', 'conflicts',
	'replaced_by', 'global', 'since', 'detect', 'homepage', 'url',
}


def tracked_plugin_folders():
	"""Return receiver plugin folder names that have <name>/<name>.js tracked in git."""
	try:
		out = subprocess.check_output(
			['git', 'ls-files', 'receiver'], cwd=ROOT, text=True, stderr=subprocess.DEVNULL)
		files = out.splitlines()
	except (OSError, subprocess.CalledProcessError):
		# not a git checkout - fall back to the filesystem
		files = []
		for name in os.listdir(os.path.join(ROOT, 'receiver')):
			files.append('receiver/%s/%s.js' % (name, name))
	names = set()
	for f in files:
		parts = f.split('/')
		if len(parts) == 3 and parts[2] == parts[1] + '.js' \
				and os.path.isfile(os.path.join(ROOT, f)):
			names.add(parts[1])
	return names


def validate(plugins):
	errors = []
	ids = [p.get('id') for p in plugins]
	by_id = {}
	for p in plugins:
		pid = p.get('id')
		where = 'plugin "%s"' % pid
		if not pid:
			errors.append('entry without "id": %r' % p)
			continue
		if pid in by_id:
			errors.append('%s: duplicate id' % where)
		by_id[pid] = p
		for key in p:
			if key not in KNOWN_KEYS:
				errors.append('%s: unknown key "%s"' % (where, key))
		if p.get('category') not in CATEGORIES:
			errors.append('%s: category must be one of %s' % (where, ', '.join(CATEGORIES)))
		if not p.get('description'):
			errors.append('%s: missing "description"' % where)
		category = p.get('category')
		only = {
			'global': 'builtin', 'since': 'builtin', 'detect': 'builtin',
			'homepage': 'thirdparty', 'url': 'thirdparty',
		}
		for key, cat in only.items():
			if key in p and category != cat:
				errors.append('%s: "%s" is only for %s plugins' % (where, key, cat))
		if category == 'builtin':
			for key in ('global', 'since'):
				if not p.get(key):
					errors.append('%s: built-in plugins need "%s"' % (where, key))
			if p.get('requires'):
				errors.append('%s: built-in plugins cannot have "requires"' % where)
		elif category == 'thirdparty':
			if not p.get('homepage'):
				errors.append('%s: third-party plugins need "homepage"' % where)
			url = p.get('url')
			if url is not None and not re.match(r'^https://.+\.js$', url):
				errors.append('%s: "url" must be an https:// link to the plugin .js file' % where)
		elif category in CATEGORIES:
			base = os.path.join(ROOT, 'receiver', pid)
			if not os.path.isfile(os.path.join(base, pid + '.js')):
				errors.append('%s: receiver/%s/%s.js not found' % (where, pid, pid))
			if not os.path.isfile(os.path.join(base, 'README.md')):
				errors.append('%s: receiver/%s/README.md not found' % (where, pid))

	for p in plugins:
		where = 'plugin "%s"' % p.get('id')
		for dep in p.get('requires', []):
			if dep not in by_id:
				errors.append('%s: requires unknown plugin "%s"' % (where, dep))
			elif by_id[dep]['category'] == 'builtin':
				errors.append('%s: cannot require built-in plugin "%s"' % (where, dep))
		for other in p.get('conflicts', []):
			if other not in by_id:
				errors.append('%s: conflicts with unknown plugin "%s"' % (where, other))
		rep = p.get('replaced_by')
		if rep is not None and rep not in by_id:
			errors.append('%s: replaced_by unknown plugin "%s"' % (where, rep))

	for name in sorted(tracked_plugin_folders() - set(ids)):
		errors.append('receiver/%s is not listed in receiver/plugins.json' % name)

	return errors


def cell(text):
	return text.replace('|', '\\|').replace('\n', ' ')


def credit(p):
	return ' ([%s](#contributors))' % p['author'] if p.get('author') else ''


def render(category, plugins):
	rows = [p for p in plugins if p['category'] == category]
	if category == 'builtin':
		lines = [
			'| Name | Description | Available since | `init.js` command |',
			'| :--- | :---------- | :-------------- | :---------------- |',
		]
		for p in rows:
			lines.append('|`%s`|%s|OpenWebRX+ %s|`%s.init();`|' % (
				p['id'], cell(p['description']), p['since'], p['global']))
	else:
		lines = [
			'| Name | Description |',
			'| :------ | :---------- |',
		]
		for p in rows:
			name = '~~%s~~' % p['id'] if category == 'deprecated' else p['id']
			link = p['homepage'] if category == 'thirdparty' else 'receiver/' + p['id']
			lines.append('|[%s](%s)|%s%s|' % (
				name, link, cell(p['description']), credit(p)))
	return '\n'.join(lines)


def update_readme(text, plugins):
	for category in TABLES:
		start = '<!-- plugins:%s:start -->' % category
		end = '<!-- plugins:%s:end -->' % category
		pattern = re.compile(re.escape(start) + r'.*?' + re.escape(end), re.S)
		if not pattern.search(text):
			raise SystemExit('README.md: markers %s ... %s not found' % (start, end))
		# blank lines around the table: kramdown (GitHub Pages) ignores tables glued to HTML comments
		block = '%s\n<!-- generated by tools/plugins.py from receiver/plugins.json - do not edit -->\n\n%s\n\n%s' % (
			start, render(category, plugins), end)
		text = pattern.sub(lambda m: block, text)
	return text


def main():
	check = '--check' in sys.argv[1:]
	with open(MANIFEST, encoding='utf-8') as f:
		manifest = json.load(f)
	plugins = manifest.get('plugins', [])

	errors = validate(plugins)
	if errors:
		for e in errors:
			print('ERROR: ' + e, file=sys.stderr)
		return 1

	with open(README, encoding='utf-8') as f:
		old = f.read()
	new = update_readme(old, plugins)

	if old == new:
		print('receiver/plugins.json is valid, README.md is up to date.')
		return 0
	if check:
		print('README.md is outdated. Run: python3 tools/plugins.py', file=sys.stderr)
		return 1
	with open(README, 'w', encoding='utf-8') as f:
		f.write(new)
	print('README.md tables updated from receiver/plugins.json.')
	return 0


if __name__ == '__main__':
	sys.exit(main())
