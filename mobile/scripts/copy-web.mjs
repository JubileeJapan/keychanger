// web/ 폴더를 앱용 www/ 로 복사한다. 앱은 홈페이지가 아니라 도구 화면(app/)에서 바로 시작한다.
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'web');
const out = join(here, '..', 'www');

rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });
rmSync(join(out, 'sw.js'), { force: true }); // 앱 안에서는 서비스 워커가 필요 없다
writeFileSync(join(out, 'index.html'),
  '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=app/index.html"></head>' +
  '<body style="background:#f6f4ef"><script>location.replace("app/index.html")</script></body></html>');
console.log('copied web -> www');
