window.Admin = {
    load: () => {
        // Проверка прав
        if (State.profile.role !== 'admin' && State.profile.role !== 'super') return;

        if (State.profile.role === 'super') {
            document.getElementById('super-admin-controls').classList.remove('hidden');
        }

        db.ref('users').on('value', s => {
            const list = document.getElementById('admin-list'); 
            if (!list) return; // Защита
            
            list.innerHTML = '';
            list.className = 'admin-grid';
            
            s.forEach(c => {
                const u = c.val(); 
                const uid = c.key;
                
                if (u.email === SUPER_ADMIN && State.profile.role !== 'super') return; 
                if (uid === State.user.uid) return;

                const card = document.createElement('div'); 
                card.className = 'admin-card';
                
                let btns = '';
                if (State.profile.role === 'super') {
                    if (u.role !== 'admin') btns += `<button class="act-btn" onclick="Admin.role('${uid}','admin')">OP</button>`;
                    else btns += `<button class="act-btn danger" onclick="Admin.role('${uid}','user')">DEOP</button>`;
                    btns += `<button class="act-btn danger" onclick="Admin.rm('${uid}')">DEL</button>`;
                }
                btns += `<button class="act-btn danger" onclick="Admin.mod('${uid}','isBanned',${!u.isBanned})">${u.isBanned?'UNBAN':'BAN'}</button>`;

                card.innerHTML = `
                    <div class="admin-header">
                        <img src="${u.avatar}" class="admin-avi">
                        <div class="admin-info">
                            <h4>${u.displayName}</h4>
                            <span>${u.shortId}</span>
                        </div>
                    </div>
                    <div style="font-size:0.75rem; color:#666; margin-top:5px;">${u.email}</div>
                    <div class="admin-actions">${btns}</div>
                `;
                list.appendChild(card);
            });
        });
    },
    mod: (u,k,v) => db.ref('users/'+u).update({[k]:v}),
    role: (u,r) => db.ref('users/'+u).update({role:r}),
    rm: (u) => UI.confirm("DELETE", "Irreversible action.", () => db.ref('users/'+u).remove()),
    nuke: (p) => UI.confirm("NUKE", "DELETE ALL?", () => db.ref(p).remove())
};