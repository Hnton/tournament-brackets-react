const { contextBridge, ipcRenderer } = require('electron');

// Expose a small API to the renderer for fetching Fargo suggestions via the
// trusted preload context. This avoids CSP issues and keeps network calls out
// of unprivileged renderer code.
contextBridge.exposeInMainWorld('api', {
    getFargoSuggestions(name) {
        // Return early for invalid input
        if (!name || typeof name !== 'string') return Promise.resolve([]);

        try {
            const q = name.trim();
            // Build first/last name search terms similar to the renderer logic so the
            // cloud function can proxy the correct Fargo URL.
            const tokens = q.split(/\s+/).filter(Boolean);
            const first = tokens[0] || '';
            const last = tokens.length > 1 ? tokens.slice(1).join(' ') : '';
            let searchParam = '';
            if (first && last) {
                searchParam = `firstName:${encodeURIComponent(first)} AND lastName:${encodeURIComponent(last)}`;
            } else {
                const t = encodeURIComponent(first);
                searchParam = `firstName:${t} OR lastName:${t}`;
            }

            const apiUrl = `https://api.fargorate.com/search?search=${searchParam}`;

            // Build a payload { url, player } and ask main to perform the POST.
            const payload = { url: apiUrl, player: q };
            return ipcRenderer.invoke('fargo-suggestions', payload).catch((err) => {
                console.error('ipc invoke fargo-suggestions error', err);
                return [];
            });
        } catch (err) {
            console.error('getFargoSuggestions error', err);
            return Promise.resolve([]);
        }
    }
});
// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
