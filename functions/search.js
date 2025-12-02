const Search = {
    run: () => {
        const q = document.getElementById('search-in').value.toLowerCase();
        const l = document.getElementById('search-results'); 
        l.innerHTML = '';
        
        if(q.length < 1) return;

        db.ref('users').once('value', s => {
            s.forEach(c => {
                const u = c.val();
                if(u.displayName.toLowerCase().includes(q) || u.shortId.toLowerCase().includes(q)) {
                    const d = document.createElement('div'); 
                    d.className = 'channel-card';
                    
                    // Красивая карточка с аватаром
                    d.innerHTML = `
                        <img src="${u.avatar}" class="ch-avi">
                        <div class="ch-info">
                            <div class="ch-name">${u.displayName}</div>
                            <div class="ch-meta">ID: ${u.shortId}</div>
                        </div>
                    `;
                    d.onclick = () => window.Profile.view(c.key);
                    l.appendChild(d);
                }
            });
        });
    }
};