const Chat = {
    init: () => {
        const inp = document.getElementById('msg-in');
        if(inp) {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); Chat.send(); }
            });
        }
    },

    back: () => {
        // Очищаем кнопку участников, так как выходим из чата
        const rightBtn = document.getElementById('chat-top-right');
        if(rightBtn) rightBtn.innerHTML = '';

        // Возвращаемся туда, откуда пришли
        if (State.chatMode === 'dm') {
            Route('dms');
        } else {
            Route('channels');
        }
    },

    send: (type) => {
        const id = 'msg-in';
        const txtEl = document.getElementById(id);
        if(!txtEl) return; 
        
        const txt = txtEl.value.trim();
        const files = document.getElementById('file-in').files;

        if(!txt && files.length === 0) return;

        const push = (img, t) => {
            State.chatRef.push({
                uid: State.user.uid, 
                user: State.profile.displayName, 
                avatar: State.profile.avatar,
                prefix: State.profile.prefix || null,
                prefixColor: State.profile.prefixColor || null,
                role: State.profile.role, 
                text: t||'', 
                image: img||null,
                ts: firebase.database.ServerValue.TIMESTAMP,
                read: false
            });
        };

        if(txt) { push(null, txt); txtEl.value=''; }
        
        if(files.length > 0) { 
            Array.from(files).forEach(f => { 
                if(f.type.match('image/gif')) {
                    const reader = new FileReader();
                    reader.onload = e => push(e.target.result, '');
                    reader.readAsDataURL(f);
                } else {
                    resizeImage(f, url => push(url, '')); 
                }
            }); 
            document.getElementById('file-in').value = ''; 
        }
    },
    
    loadDMs: () => {
        const l = document.getElementById('dm-list'); l.innerHTML = '';
        let totalUnread = 0;
        const totalBadge = document.getElementById('total-dm-badge');

        db.ref('dms').on('value', s => {
            l.innerHTML = '';
            totalUnread = 0;

            s.forEach(c => {
                if(c.key.includes(State.user.uid)) {
                    const otherId = c.key.split('_').find(k => k !== State.user.uid);
                    if(otherId) {
                        let localUnread = 0;
                        const messages = c.val();
                        Object.values(messages).forEach(m => {
                            if (m.uid !== State.user.uid && !m.read) localUnread++;
                        });
                        totalUnread += localUnread;

                        db.ref('users/'+otherId).once('value', us => {
                            const u = us.val();
                            if(!u) return;
                            
                            const d = document.createElement('div'); 
                            d.className = 'channel-card'; 

                            const bannerStyle = u.banner ? `background-image: url('${u.banner}')` : '';
                            const badgeHtml = localUnread > 0 ? `<span class="badge-count visible" style="margin-left:auto;">${localUnread}</span>` : '';
                            const avatar = u.avatar || 'https://via.placeholder.com/100';

                            d.innerHTML = `
                                <div class="ch-card-banner" style="${bannerStyle}"></div>
                                <div class="ch-card-body">
                                    <img src="${avatar}" class="ch-card-avi">
                                    <div class="ch-card-info">
                                        <div class="ch-name">${u.displayName}</div>
                                        <div class="ch-meta">Private Chat</div>
                                    </div>
                                    ${badgeHtml}
                                </div>
                            `;
                            
                            d.onclick = () => Chat.startDM(otherId, u.displayName);
                            l.appendChild(d);
                        });
                    }
                }
            });
            
            if(totalUnread > 0) {
                totalBadge.innerText = totalUnread;
                totalBadge.classList.add('visible');
            } else {
                totalBadge.classList.remove('visible');
            }
        });
    },

    startDM: (targetId, targetName) => {
        const tid = targetId || State.dmTarget;
        if(!tid) return console.error("No target for DM");

        // ВАЖНО: Ставим режим ЛС
        State.chatMode = 'dm';
        
        // Убираем кнопку участников (в ЛС она не нужна)
        const rightBtn = document.getElementById('chat-top-right');
        if(rightBtn) rightBtn.innerHTML = '';

        const ids = [State.user.uid, tid].sort();
        document.getElementById('modal-user').classList.remove('open');
        
        if(!targetName) {
            const nameEl = document.getElementById('u-name');
            targetName = nameEl ? nameEl.innerText : 'Chat';
        }

        const titleEl = document.getElementById('chat-title');
        if(titleEl) titleEl.innerText = targetName;
        
        Route('chat');
        Chat.listen(db.ref('dms/'+ids.join('_')), 'chat-feed');
    },

    listen: (ref, elId) => {
        const feed = document.getElementById(elId); if(!feed) return;
        feed.innerHTML = '';
        if(State.chatRef) State.chatRef.off(); State.chatRef = ref;
        
        let initialLoad = true;
        setTimeout(() => { initialLoad = false; }, 1500);

        const markRead = (snap) => {
            const val = snap.val();
            if (val.uid !== State.user.uid && !val.read) {
                snap.ref.update({read: true});
            }
        };

        ref.limitToLast(50).on('child_added', s => {
            const d = s.val(), key = s.key;
            const isMine = d.uid === State.user.uid;
            
            if (!isMine && document.getElementById('tab-chat').classList.contains('active') && !document.hidden) {
                markRead(s);
            }

            if (!isMine && !initialLoad && (document.hidden || !document.getElementById('tab-chat').classList.contains('active'))) {
                UI.notify(d.user, d.image ? 'sent an image' : d.text, 'msg', d.avatar);
            }

            const div = document.createElement('div');
            div.className = `msg ${isMine?'mine':''}`;
            div.id = 'msg-'+key;
            
            let del = '';
            if(isMine || State.profile.role==='super') del = `<i class="fas fa-trash" style="margin-left:5px; cursor:pointer; color:#666; font-size:0.8rem;" onclick="Chat.del('${key}')"></i>`;

            const aviId = `avi-${key}`;
            let statusHtml = '';
            if (isMine) {
                const checkClass = d.read ? 'read' : '';
                statusHtml = `<div class="msg-meta"><span class="msg-checks ${checkClass}"><i class="fas fa-check-double"></i></span></div>`;
            }

            let prefixHtml = '';
            if (d.prefix) {
                prefixHtml = `<span style="color:${d.prefixColor || '#fff'}; margin-right:5px; font-weight:800; font-family:'Exo 2'; text-shadow:0 0 5px ${d.prefixColor};">[${d.prefix}]</span>`;
            }

            div.innerHTML = `
                <img id="${aviId}" src="${d.avatar}" class="avatar" onclick="window.Profile.view('${d.uid}')">
                <div class="bubble">
                    <div style="font-size:0.75rem; font-weight:700; color:${isMine?'#fff':'#bc13fe'}; margin-bottom:3px;">
                        ${prefixHtml}${d.user} ${del}
                    </div>
                    ${d.text ? `<div>${safe(d.text)}</div>` : ''}
                    ${d.image ? `<img src="${d.image}" class="msg-img" style="height: 150px; width: auto; max-width: 100%; object-fit: cover; display: block; border-radius: 8px; margin-top: 5px; cursor: pointer;" onclick="showImg(this.src)">` : ''}
                    ${statusHtml}
                </div>
            `;
            feed.appendChild(div); feed.scrollTop = feed.scrollHeight;

            db.ref(`users/${d.uid}/avatar`).once('value', snap => {
                if(snap.exists()) {
                    const realAvatar = snap.val();
                    const imgEl = document.getElementById(aviId);
                    if(imgEl && realAvatar !== d.avatar) {
                        imgEl.src = realAvatar;
                    }
                }
            });
        });

        ref.limitToLast(50).on('child_changed', s => {
            const d = s.val();
            const el = document.getElementById('msg-'+s.key);
            if (el && d.uid === State.user.uid) {
                const checks = el.querySelector('.msg-checks');
                if (checks) {
                    if (d.read) checks.classList.add('read');
                    else checks.classList.remove('read');
                }
            }
        });

        ref.on('child_removed', s => { const el=document.getElementById('msg-'+s.key); if(el)el.remove(); });
    },
    del: k => UI.confirm("DELETE", "Delete message?", () => State.chatRef.child(k).remove()),
    confirmEdit: () => {}
};

document.addEventListener('DOMContentLoaded', () => { Chat.init(); });