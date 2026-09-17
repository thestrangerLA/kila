import { defineConfig } from 'vite';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function edgeTtsPlugin() {
  return {
    name: 'edge-tts-middleware',
    configureServer(server) {
      server.middlewares.use('/api/tts', (req, res) => {
        const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const text = reqUrl.searchParams.get('text') || 'สวัสดีครับ';
        const voice = reqUrl.searchParams.get('voice') || 'th-TH-NiwatNeural';
        const rate = reqUrl.searchParams.get('rate') || '+15%';

        const uvExe = `C:\\Users\\LENOVO\\AppData\\Local\\Microsoft\\WinGet\\Packages\\astral-sh.uv_Microsoft.Winget.Source_8wekyb3d8bbwe\\uv.exe`;
        const timestamp = Date.now();
        const tmpMp3 = path.join(process.cwd(), 'public', `tts_${timestamp}.mp3`);
        const tmpPy = path.join(process.cwd(), 'public', `script_${timestamp}.py`);

        // Escape text safely for Python multiline raw string
        const safeText = text.replace(/\\/g, '\\\\').replace(/'''/g, "\\'\\'\\'");

        const pyCode = `import asyncio, edge_tts

async def gen():
    tts = edge_tts.Communicate('''${safeText}''', '${voice}', rate='${rate}')
    await tts.save(r'${tmpMp3}')

asyncio.run(gen())
`;

        fs.writeFileSync(tmpPy, pyCode, 'utf-8');

        const proc = spawn(uvExe, ['run', '--with', 'edge-tts', 'python', tmpPy]);

        proc.on('close', (code) => {
          try { if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy); } catch(e) {}
          
          if (code === 0 && fs.existsSync(tmpMp3)) {
            const audioData = fs.readFileSync(tmpMp3);
            try { if (fs.existsSync(tmpMp3)) fs.unlinkSync(tmpMp3); } catch(e) {}

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(audioData);
          } else {
            console.error('Edge-TTS process exited with code:', code);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `TTS exit code ${code}` }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [edgeTtsPlugin()]
});
