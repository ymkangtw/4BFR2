async function getModels(req, res) {
    const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    try {
        const r = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) {
            return res.status(r.status).json({ message: `Ollama 回應錯誤: HTTP ${r.status}` });
        }
        const json = await r.json();
        res.status(200).json(json.models || []);
    } catch (err) {
        const msg = err.name === 'TimeoutError'
            ? `Ollama 連線逾時 (${baseUrl})，請確認 ollama serve 已啟動`
            : `無法連線 Ollama (${baseUrl}): ${err.message}`;
        res.status(503).json({ message: msg });
    }
}

module.exports = { getModels };
