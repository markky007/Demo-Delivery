// Run only after applying 00034_menu_image_thumbnails.sql.
// Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, sips, and cwebp.
// Never changes or deletes original Storage objects.
import { createClient } from '@supabase/supabase-js';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';

const run = promisify(execFile);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, key, { auth: { persistSession: false } });
const bucket = supabase.storage.from('menu-images');
let cursor = 0;
let made = 0;
let skipped = 0;
let failed = 0;

while (true) {
  const { data: rows, error } = await supabase
    .from('menu_items')
    .select('id,image_url,thumb_path')
    .order('id')
    .range(cursor, cursor + 199);
  if (error) throw error;
  if (!rows?.length) break;
  for (const row of rows) {
    if (
      row.thumb_path ||
      !row.image_url?.startsWith(`${url}/storage/v1/object/public/menu-images/`)
    ) {
      skipped++;
      continue;
    }
    const folder = await mkdtemp(join(tmpdir(), 'menu-thumb-'));
    try {
      const source = new URL(row.image_url);
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Image HTTP ${response.status}`);
      const original = join(folder, 'original');
      const resized = join(folder, 'resized.jpg');
      const output = join(folder, 'thumb.webp');
      await writeFile(original, Buffer.from(await response.arrayBuffer()));
      await run('sips', [
        '-s',
        'format',
        'jpeg',
        '--resampleHeightWidthMax',
        '320',
        original,
        '--out',
        resized,
      ]);
      await run('cwebp', ['-quiet', '-q', '80', resized, '-o', output]);
      const path = `items/thumb/backfill-${row.id}-${randomUUID()}.webp`;
      const { error: uploadError } = await bucket.upload(path, await readFile(output), {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: updated, error: updateError } = await supabase
        .from('menu_items')
        .update({ thumb_path: path })
        .eq('id', row.id)
        .is('thumb_path', null)
        .select('id');
      if (updateError) throw updateError;
      if (!updated?.length)
        throw new Error('Row changed during backfill; uploaded thumb is unreferenced');
      made++;
      console.log(`Created thumbnail for ${row.id}`);
    } catch (error) {
      failed++;
      console.error(`Failed ${row.id}: ${error.message}`);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  }
  cursor += rows.length;
  if (rows.length < 200) break;
}
console.log(JSON.stringify({ made, skipped, failed }));
if (failed) process.exitCode = 1;
