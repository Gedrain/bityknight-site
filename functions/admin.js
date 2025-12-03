window.Admin = {
    load: async () => {
        if (State.profile.role !== 'admin' && State.profile.role !== 'super') return;

        if (State.profile.role === 'super') {
            document.getElementById('super-admin-controls').classList.remove('hidden');
        }
        
        try {
            const list = document.getElementById('admin-list'); 
            list.innerHTML = 'Loading...';
            
            // Получаем всех пользователей
            const users = await pb.collection('users').getFullList({ sort: '-created' });
            
            list.innerHTML = '';
            list.className = 'admin-grid';
            
            users.forEach(u => {
                if (u.id === State.user.uid) return;

                const card = document.createElement('div'); 
                card.className = 'admin-card';
                const avatar = u.avatar ? pb.files.getUrl(u, u.avatar) : 'https://via.placeholder.com/40';
                
                let btns = '';
                if (State.profile.role === 'super') {
                    if (u.role !== 'admin') btns += `<button class="act-btn" onclick="Admin.role('${u.id}','admin')">OP</button>`;
                    else btns += `<button class="act-btn danger" onclick="Admin.role('${u.id}','user')">DEOP</button>`;
                    
                    btns += `<button class="act-btn danger" onclick="Admin.rm('${u.id}')">DEL</button>`;
                }
                
                // В PB нет стандартного isBanned, но можно использовать поле status или добавить bool поле isBanned
                // Пока используем удаление или смену статуса
                
                card.innerHTML = `
                    <div class="admin-header">
                        <img src="${avatar}" class="admin-avi">
                        <div class="admin-info">
                            <h4>${u.nickname || u.name}</h4>
                            <span>${u.shortId}</span>
                        </div>
                    </div>
                    <div style="font-size:0.75rem; color:#666; margin-top:5px;">${u.email}</div>
                    <div class="admin-actions">${btns}</div>
                `;
                list.appendChild(card);
            });
        } catch(e) { console.error(e); }
    },

    role: async (uid, r) => {
        await pb.collection('users').update(uid, { role: r });
        UI.toast("Role updated", "success");
        Admin.load();
    },

    rm: (uid) => {
        UI.confirm("DELETE", "Delete user?", async () => {
            await pb.collection('users').delete(uid);
            Admin.load();
        });
    }
};