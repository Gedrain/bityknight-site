const Chat = {
    toNews: () => {
        const isAdmin = State.profile.role === 'admin' || State.profile.role === 'super';
        document.getElementById('news-input').classList.toggle('hidden', !isAdmin);
        Chat.listen(db.ref('news'), 'news-feed');
    },
    
    checkLen: (el) => {},

    send: (type) => {
        const id = type==='news' ? 'news-msg-in' : 'msg-in';
        const txtEl = document.getElementById(id);
        const txt = txtEl.value.trim();
        const files = document.getElementById('file-in').files;

        if(!txt && files.length === 0) return;

        const push = (img, t) => {
            State.chatRef.push({
                uid: State.user.uid, user: State.profile.displayName, avatar: State.profile.avatar,
                role: State.profile.role, text: t||'', image: img||null,
                ts: firebase.database.ServerValue.TIMESTAMP
            });
        };

        if(txt) { push(null, txt); txtEl.value=''; }
        if(files.length > 0) { Array.from(files).forEach(f => { resizeImage(f, url => push(url, '')); }); document.getElementById('file-in').value = ''; }
    },
    
    // ЛИЧНЫЕ СООБЩЕНИЯ (ИСПРАВЛЕНО)
    loadDMs: () => {
        const l = document.getElementById('dm-list'); l.innerHTML = '';
        db.ref('dms').once('value', s => {
            s.forEach(c => {
                if(c.key.includes(State.user.uid)) {
                    const otherId = c.key.split('_').find(k => k !== State.user.uid);
                    if(otherId) {
                        db.ref('users/'+otherId).once('value', us => {
                            const u = us.val();
                            if(!u) return;
                            
                            const d = document.createElement('div'); 
                            d.className = 'channel-card';
                            if(u.banner) d.style.backgroundImage = `url(${u.banner})`;
                            
                            d.innerHTML = `
                                <div class="ch-content">
                                    <img src="${u.avatar}" class="ch-avi">
                                    <div class="ch-info">
                                        <div class="ch-name">${u.displayName}</div>
                                        <div class="ch-meta">Private Chat</div>
                                    </div>
                                </div>
                            `;
                            // Передаем имя и ID напрямую
                            d.onclick = () => Chat.startDM(otherId, u.displayName);
                            l.appendChild(d);
                        });
                    }
                }
            });
        });
    },

    // Принимает аргументы для надежности
    startDM: (targetId, targetName) => {
        // Если аргументы не переданы, берем из State (случай кнопки в профиле)
        const tid = targetId || State.dmTarget;
        
        if(!tid) {
            console.error("No target for DM");
            return;
        }

        const ids = [State.user.uid, tid].sort();
        
        // Закрываем профиль
        document.getElementById('modal-user').classList.remove('open');
        
        // Если имя не передано, пробуем найти в DOM (фолбэк)
        if(!targetName) {
            const nameEl = document.getElementById('u-name');
            targetName = nameEl ? nameEl.innerText : 'Chat';
        }

        document.getElementById('chat-title').innerText = targetName;
        Route('chat');
        Chat.listen(db.ref('dms/'+ids.join('_')), 'chat-feed');
    },

    listen: (ref, elId) => {
        const feed = document.getElementById(elId); if(!feed) return;
        feed.innerHTML = '';
        if(State.chatRef) State.chatRef.off(); State.chatRef = ref;
        
        ref.limitToLast(50).on('child_added', s => {
            const d = s.val(), key = s.key;
            const isMine = d.uid === State.user.uid;
            const div = document.createElement('div');
            div.className = `msg ${isMine?'mine':''}`;
            div.id = 'msg-'+key;
            
            let del = '';
            if(isMine || State.profile.role==='super') del = `<i class="fas fa-trash" style="margin-left:5px; cursor:pointer; color:#666; font-size:0.8rem;" onclick="Chat.del('${key}')"></i>`;

            div.innerHTML = `
                <img src="${d.avatar}" class="avatar" onclick="window.Profile.view('${d.uid}')">
                <div class="bubble">
                    <div style="font-size:0.75rem; font-weight:700; color:${isMine?'#fff':'#bc13fe'}; margin-bottom:3px;">${d.user} ${del}</div>
                    ${d.text ? `<div>${safe(d.text)}</div>` : ''}
                    ${d.image ? `<img src="${d.image}" class="msg-img" onclick="showImg(this.src)">` : ''}
                </div>
            `;
            feed.appendChild(div); feed.scrollTop = feed.scrollHeight;
        });
        ref.on('child_removed', s => { const el=document.getElementById('msg-'+s.key); if(el)el.remove(); });
    },
    del: k => UI.confirm("DELETE", "Delete message?", () => State.chatRef.child(k).remove()),
    confirmEdit: () => {}
};