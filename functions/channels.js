window.Channels = {
    editingId: null,

    initListeners: () => {
        // Простая функция превью (без кроппера)
        const bindPreview = (inputId, previewId, isBg) => {
            const el = document.getElementById(inputId);
            if(!el) return;
            el.onchange = (e) => {
                const f = e.target.files[0];
                if(!f) return;
                const reader = new FileReader();
                reader.onload = res => {
                    const prev = document.getElementById(previewId);
                    if(isBg) prev.style.backgroundImage = `url(${res.target.result})`;
                    else prev.src = res.target.result;
                };
                reader.readAsDataURL(f);
            };
        };

        // Подключаем превью для создания
        bindPreview('new-ch-avi', 'new-ch-avi-prev', false);
        bindPreview('new-ch-banner', 'new-ch-banner-prev', true);
        
        // Подключаем превью для редактирования
        bindPreview('edit-ch-avi', 'edit-ch-avi-prev', false);
        bindPreview('edit-ch-banner', 'edit-ch-banner-prev', true);
    },

    create: async () => {
        const n = document.getElementById('new-ch-name').value;
        const isPriv = document.getElementById('new-ch-priv').checked;
        const pass = isPriv ? document.getElementById('new-ch-pass').value : '';
        
        // Берем файлы напрямую
        const aviFile = document.getElementById('new-ch-avi').files[0];
        const banFile = document.getElementById('new-ch-banner').files[0];

        if(!n) return UI.toast("Name required", "error");

        const formData = new FormData();
        formData.append('name', n);
        formData.append('pass', pass);
        formData.append('creator', State.user.uid);
        formData.append('members', State.user.uid); 
        formData.append('membersCount', 1);

        if(aviFile) formData.append('image', aviFile);
        if(banFile) formData.append('banner', banFile);

        try {
            const record = await pb.collection('channels').create(formData);
            UI.toast("Channel created", "success");
            
            // Сброс формы
            document.getElementById('new-ch-name').value = '';
            document.getElementById('new-ch-pass').value = '';
            document.getElementById('new-ch-avi').value = '';
            document.getElementById('new-ch-banner').value = '';
            
            // Сброс превью
            document.getElementById('new-ch-avi-prev').src = 'https://via.placeholder.com/100/000000/ffffff?text=+';
            document.getElementById('new-ch-banner-prev').style.backgroundImage = '';
            
            document.getElementById('modal-create').classList.remove('open');
            Channels.join(record.id, true);
        } catch(e) {
            console.error(e);
            UI.toast("Error creating channel", "error");
        }
    },

    join: async (chid, isCreator = false) => {
        try {
            await pb.collection('channels').update(chid, {
                'members+': State.user.uid,
                'membersCount+': 1
            });
            if(!isCreator) UI.toast("Joined Channel", "success");
            Channels.openChat(chid);
        } catch(e) {
            Channels.openChat(chid);
        }
    },

    leave: async (chid) => {
        UI.confirm("LEAVE CHANNEL", "Leave this channel?", async () => {
            try {
                await pb.collection('channels').update(chid, {
                    'members-': State.user.uid,
                    'membersCount-': 1
                });
                UI.toast("Left Channel", "success");
                Channels.load();
                document.getElementById('modal-channel-settings').classList.remove('open');
                Route('channels');
            } catch(e) { UI.toast("Error leaving", "error"); }
        });
    },

    leaveFromSettings: () => { if(Channels.editingId) Channels.leave(Channels.editingId); },

    openChat: async (key) => {
        try {
            const v = await pb.collection('channels').getOne(key);
            document.getElementById('chat-title').innerText = '# ' + v.name;
            
            const headerBtn = document.getElementById('chat-top-right');
            if(headerBtn) headerBtn.innerHTML = `<i class="fas fa-users" style="cursor:pointer; color:var(--primary); font-size:1.2rem;" onclick="Channels.viewMembers('${key}')"></i>`;

            Route('chat');
            Chat.listenChannel(key);
        } catch(e) { UI.toast("Channel unavailable", "error"); }
    },

    viewMembers: async (chid) => {
        const list = document.getElementById('members-list');
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Loading...</div>';
        document.getElementById('modal-members').classList.add('open');

        try {
            const ch = await pb.collection('channels').getOne(chid, { expand: 'members' });
            list.innerHTML = '';
            
            const users = ch.expand ? ch.expand.members : [];
            if(users.length === 0) {
                list.innerHTML = '<div style="text-align:center; color:#555;">No members found</div>';
                return;
            }
            
            users.sort((a, b) => (b.status === 'online') - (a.status === 'online'));

            users.forEach(u => {
                const isOnline = u.status === 'online';
                const avatarUrl = u.avatar ? pb.files.getUrl(u, u.avatar) : 'https://via.placeholder.com/50';
                const roleName = u.role === 'user' ? 'USER' : u.role.toUpperCase();
                const displayName = u.name || u.username || "User";

                const card = document.createElement('div');
                card.className = 'member-card';
                card.innerHTML = `
                    <div class="member-avi-wrap">
                        <img src="${avatarUrl}" class="member-avi">
                        <div class="member-status ${isOnline ? 'online' : ''}"></div>
                    </div>
                    <div class="member-info">
                        <div class="member-name">${displayName}</div>
                        <div class="member-seen">${isOnline ? 'Online' : 'Offline'}</div>
                    </div>
                    <div class="member-role">${roleName}</div>
                `;
                card.onclick = () => window.Profile.view(u.id);
                list.appendChild(card);
            });
        } catch(e) { list.innerHTML = 'Error loading members'; }
    },

    load: async () => {
        const l = document.getElementById('channel-list');
        if(!l) return;
        
        pb.collection('channels').unsubscribe();
        pb.collection('channels').subscribe('*', function(e) { Channels.load(); });

        try {
            const records = await pb.collection('channels').getFullList({
                filter: `members ~ "${State.user.uid}"`,
                sort: '-created'
            });
            
            l.innerHTML = '';
            if(records.length === 0) {
                l.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">No channels. Use Search.</div>';
                return;
            }

            records.forEach(v => {
                const d = document.createElement('div');
                d.className = 'channel-card';

                const img = v.image ? pb.files.getUrl(v, v.image) : 'https://via.placeholder.com/60/000/fff?text=%23';
                const bannerStyle = v.banner ? `background-image: url('${pb.files.getUrl(v, v.banner)}');` : '';
                const lock = v.pass ? '<i class="fas fa-lock" style="color:#ffcc00; margin-right:5px;"></i>' : '';
                
                let settings = '';
                if(v.creator === State.user.uid || State.profile.role === 'super') {
                    settings = `<i class="fas fa-cog ch-settings" onclick="event.stopPropagation(); Channels.openSettings('${v.id}')"></i>`;
                } else {
                    settings = `<i class="fas fa-sign-out-alt ch-settings" style="color:#ff0055" onclick="event.stopPropagation(); Channels.leave('${v.id}')"></i>`;
                }
                
                d.innerHTML = `
                    <div class="ch-card-banner" style="${bannerStyle}"></div>
                    <div class="ch-card-body">
                        <img src="${img}" class="ch-card-avi">
                        <div class="ch-card-info">
                            <div class="ch-name">${lock}${v.name}</div>
                            <div class="ch-meta">ID: ${v.id.substr(0,5)} &bull; <span>${v.membersCount}</span></div>
                        </div>
                        <div class="ch-controls">${settings}</div>
                    </div>
                `;
                
                d.onclick = () => {
                    if(v.pass && !State.unlockedChannels.has(v.id) && v.creator !== State.user.uid) { 
                        State.pendingCh={id:v.id, name:v.name, pass:v.pass}; 
                        document.getElementById('modal-pass').classList.add('open'); 
                    } else { 
                        Channels.openChat(v.id);
                    }
                };
                l.appendChild(d);
            });

        } catch(e) { console.error("Load channels error", e); }
    },

    auth: () => {
        const inp = document.getElementById('ch-auth-pass');
        if(inp.value === State.pendingCh.pass) {
            State.unlockedChannels.add(State.pendingCh.id);
            document.getElementById('modal-pass').classList.remove('open');
            inp.value = '';
            Channels.openChat(State.pendingCh.id);
        } else UI.toast("Wrong Pass", "error");
    },

    openSettings: async (key) => {
        Channels.editingId = key;
        try {
            const v = await pb.collection('channels').getOne(key);
            document.getElementById('edit-ch-name').value = v.name;
            
            const avi = v.image ? pb.files.getUrl(v, v.image) : 'https://via.placeholder.com/100';
            const ban = v.banner ? `url(${pb.files.getUrl(v, v.banner)})` : 'none';
            
            document.getElementById('edit-ch-avi-prev').src = avi;
            document.getElementById('edit-ch-banner-prev').style.backgroundImage = ban;
            document.getElementById('modal-channel-settings').classList.add('open');
        } catch(e) {}
    },

    saveSettings: async () => {
        const key = Channels.editingId;
        const name = document.getElementById('edit-ch-name').value;
        const aviFile = document.getElementById('edit-ch-avi').files[0];
        const banFile = document.getElementById('edit-ch-banner').files[0];

        const formData = new FormData();
        formData.append('name', name);
        if(aviFile) formData.append('image', aviFile);
        if(banFile) formData.append('banner', banFile);

        try {
            await pb.collection('channels').update(key, formData);
            
            document.getElementById('edit-ch-avi').value = '';
            document.getElementById('edit-ch-banner').value = '';
            
            document.getElementById('modal-channel-settings').classList.remove('open');
            UI.toast("Saved", "success");
            Channels.load();
        } catch(e) { 
            console.error(e);
            UI.toast("Error saving (Check API Rules!)", "error"); 
        }
    },

    del: () => {
        if(!Channels.editingId) return;
        UI.confirm("DELETE", "Delete channel?", async () => {
            await pb.collection('channels').delete(Channels.editingId);
            document.getElementById('modal-channel-settings').classList.remove('open');
            Channels.load();
        });
    }
};

document.addEventListener('DOMContentLoaded', () => { Channels.initListeners(); });