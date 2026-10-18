// Turns dist-single/index.html into a page body for the claude.ai artifact viewer:
// drops the document wrapper and <meta> tags, keeps <title>, fonts, styles and the
// inlined script byte-for-byte. Fails if the script was altered.
import { readFileSync, writeFileSync } from 'node:fs';

const [src = 'dist-single/index.html', out = 'dist-single/artifact.html'] = process.argv.slice(2);
const html = readFileSync(src, 'utf8');
const scriptStart = html.indexOf('<script');
const scriptEnd = html.indexOf('</script>', scriptStart) + '</script>'.length;
if (scriptStart < 0 || scriptEnd < scriptStart) throw new Error('No inline script found');
const script = html.slice(scriptStart, scriptEnd);

const markup = (s) => s
  .replace(/<!doctype[^>]*>/i, '')
  .replace(/<\/?(html|head|body)[^>]*>/gi, '')
  .replace(/<meta[^>]*>/gi, '')
  .replace(/<title>[\s\S]*?<\/title>/i, '');

const before = markup(html.slice(0, scriptStart));
const after = markup(html.slice(scriptEnd));
const page = `<title>Dungeon Forge</title>\n<style>:root{color-scheme:dark}html,body{height:100%}</style>\n${before.trim()}\n${script}\n${after.trim()}\n`;
if (!page.includes(script)) throw new Error('Script changed during packaging');
writeFileSync(out, page);
console.log(`artifact page: ${out} (${(page.length / 1024).toFixed(0)} kB)`);
