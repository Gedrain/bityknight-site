const Channels = {
    editingId: null,

    create: () => {
        const n = document.getElementById('new-ch-name').value;
        const aviFile = document.getElementById('new-ch-avi').files[0];
        const banFile = document.getElementById('new-ch-banner').files[0];
        const isPriv = document.getElementById('new-ch-priv').checked;
        const pass = isPriv ? document.getElementById('new-ch-pass').value : null;

        if(!n) return UI.toast("Name required", "error");

        const data = { name: n, pass: pass, image: null, banner: null, creator: State.user.uid };

        const save = () => {
            db.ref('channels').push(data);
            document.getElementById('modal-create').classList.remove('open');
            document.getElementById('new-ch-name').value = '';
        };

        const procBan = () => {
            if(banFile) resizeImage(banFile, u => { data.banner=u; save(); });
            else save();
        };

        if(aviFile) resizeImage(aviFile, u => { data.image=u; procBan(); });
        else procBan();
    },

    load: () => {
        db.ref('channels').on('value', s => {
            const l = document.getElementById('channel-list'); l.innerHTML='';
            s.forEach(c => {
                const v = c.val();
                const d = document.createElement('div');
                d.className = 'channel-card';
                
                if(v.banner) d.style.backgroundImage = `url(${v.banner})`;
                
                const img = v.image || 'https://via.placeholder.com/50/000/fff?text=%23';
                const lock = v.pass ? '<i class="fas fa-lock" style="color:#ffcc00; margin-right:5px; font-size:0.8rem;"></i>' : '';
                
                // Кнопка настроек
                let settings = '';
                if(v.creator === State.user.uid || State.profile.role === 'super') {
                    settings = `<i class="fas fa-cog ch-settings" onclick="event.stopPropagation(); Channels.openSettings('${c.key}')"></i>`;
                }

                d.innerHTML = `
                    <div class="ch-content">
                        <img src="${img}" class="ch-avi">
                        <div class="ch-info">
                            <div class="ch-name">${lock}${v.name}</div>
                            <div class="ch-meta">ID: ${c.key.substr(-4)}</div>
                        </div>
                        ${settings}
                    </div>
                `;
                d.onclick = () => {
                    if(v.pass) { State.pendingCh={id:c.key, name:v.name, pass:v.pass}; document.getElementById('modal-pass').classList.add('open'); }
                    else { 
                        document.getElementById('chat-title').innerText='# '+v.name; 
                        Route('chat'); 
                        Chat.listen(db.ref('channels_msg/'+c.key), 'chat-feed'); 
                    }
                };
                l.appendChild(d);
            });
        });
    },

    auth: () => {
        if(document.getElementById('ch-auth-pass').value === State.pendingCh.pass) {
            document.getElementById('modal-pass').classList.remove('open');
            Route('chat'); 
            Chat.listen(db.ref('channels_msg/'+State.pendingCh.id), 'chat-feed');
        } else UI.toast("Wrong Pass", "error");
    },

    openSettings: (key) => {
        Channels.editingId = key;
        db.ref('channels/'+key).once('value', s => {
            const v = s.val();
            document.getElementById('edit-ch-name').value = v.name;
            document.getElementById('modal-channel-settings').classList.add('open');
        });
    },

    saveSettings: () => {
        const key = Channels.editingId;
        const name = document.getElementById('edit-ch-name').value;
        const avi = document.getElementById('edit-ch-avi').files[0];
        const ban = document.getElementById('edit-ch-banner').files[0];

        if(!name) return UI.toast("Name required", "error");
        
        const update = { name: name };
        const commit = () => {
            db.ref('channels/'+key).update(update);
            document.getElementById('modal-channel-settings').classList.remove('open');
        };

        const procBan = () => { if(ban) resizeImage(ban, u => { update.banner=u; commit(); }); else commit(); };
        if(avi) resizeImage(avi, u => { update.image=u; procBan(); }); else procBan();
    },

    del: () => {
        if(!Channels.editingId) return;
        UI.confirm("DELETE", "Delete channel?", () => {
            db.ref('channels/'+Channels.editingId).remove();
            document.getElementById('modal-channel-settings').classList.remove('open');
        });
    }
};