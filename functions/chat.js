const Chat = {
    mediaRecorder: null, audioChunks: [], recInterval: null, isRecording: false, pendingImage: null,
    
    // Глобальное состояние аудио
    activeAudio: null,
    activeUrl: null,

    init: () => {
        const inp = document.getElementById('msg-in'); const fileIn = document.getElementById('file-in');
        if(inp) { inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); Chat.send(); } }); inp.addEventListener('input', Chat.updateInputState); }
        if(fileIn) { fileIn.addEventListener('change', (e) => { const file = e.target.files[0]; if(file) { resizeImage(file, (base64) => { Chat.pendingImage = base64; Chat.showPreview(base64); Chat.updateInputState(); }); } }); }
    },
    
    back: () => { 
        // Не останавливаем глобальное аудио при выходе из чата!
        const rightBtn = document.getElementById('chat-top-right'); if(rightBtn) rightBtn.innerHTML = ''; if (State.chatMode === 'dm') Route('dms'); else Route('channels'); 
    },
    
    showPreview: (base64) => { const box = document.getElementById('media-preview'); const img = document.getElementById('preview-img-el'); img.src = base64; box.classList.remove('hidden'); },
    clearPreview: () => { Chat.pendingImage = null; document.getElementById('file-in').value = ''; document.getElementById('media-preview').classList.add('hidden'); Chat.updateInputState(); },
    
    updateInputState: () => { const txt = document.getElementById('msg-in').value.trim(); const btnSend = document.getElementById('btn-send'); const btnMic = document.getElementById('btn-mic'); if (txt.length > 0 || Chat.pendingImage) { btnSend.classList.remove('hidden'); btnMic.classList.add('hidden'); } else { btnSend.classList.add('hidden'); btnMic.classList.remove('hidden'); } },
    
    startRec: async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); Chat.mediaRecorder = new MediaRecorder(stream); Chat.audioChunks = []; Chat.mediaRecorder.ondataavailable = event => { Chat.audioChunks.push(event.data); }; Chat.mediaRecorder.start(); Chat.isRecording = true; document.getElementById('chat-input-controls').classList.add('hidden'); document.getElementById('recording-ui').classList.remove('hidden'); let sec = 0; const timerEl = document.getElementById('rec-time'); timerEl.innerText = "0:00"; Chat.recInterval = setInterval(() => { sec++; const m = Math.floor(sec / 60); const s = sec % 60; timerEl.innerText = `${m}:${s < 10 ? '0'+s : s}`; }, 1000); } catch (err) { UI.toast("Microphone access denied", "error"); } },
    cancelRec: () => { if(Chat.mediaRecorder) { Chat.mediaRecorder.stop(); Chat.mediaRecorder.stream.getTracks().forEach(t => t.stop()); } Chat.resetRecUI(); },
    finishRec: () => { if(!Chat.mediaRecorder || !Chat.isRecording) return; Chat.mediaRecorder.onstop = () => { const audioBlob = new Blob(Chat.audioChunks, { type: 'audio/webm' }); blobToBase64(audioBlob, (base64Audio) => { Chat.pushMessage(null, '', base64Audio); }); Chat.mediaRecorder.stream.getTracks().forEach(t => t.stop()); }; Chat.mediaRecorder.stop(); Chat.resetRecUI(); },
    resetRecUI: () => { Chat.isRecording = false; clearInterval(Chat.recInterval); document.getElementById('recording-ui').classList.add('hidden'); document.getElementById('chat-input-controls').classList.remove('hidden'); },
    
    send: async () => { 
        const txtEl = document.getElementById('msg-in'); 
        const txt = txtEl.value.trim(); 
        if (!txt && !Chat.pendingImage) return; 
        if(State.chatMode === 'dm' && State.dmTarget) {
             const check = await Privacy.check(State.dmTarget, 'dm');
             if(!check.allowed) { UI.toast(check.error || "Message blocked", "error"); return; }
        }
        // Передаем null вместо video, так как это обычная отправка
        Chat.pushMessage(Chat.pendingImage, txt, null, null); 
        txtEl.value = ''; 
        Chat.clearPreview(); 
    },

    // ОБНОВЛЕНО: добавлен аргумент video
    pushMessage: (img, txt, audio, video) => { 
        if(!State.chatRef) return; 
        State.chatRef.push({ 
            uid: State.user.uid, 
            user: State.profile.displayName, 
            avatar: State.profile.avatar, 
            prefix: State.profile.prefix || null, 
            prefixColor: State.profile.prefixColor || null, 
            role: State.profile.role, 
            text: txt || '', 
            image: img || null, 
            audio: audio || null, 
            video: video || null, // Новое поле
            ts: firebase.database.ServerValue.TIMESTAMP, 
            read: false 
        }); 
    },
    
    loadDMs: () => { 
        const l = document.getElementById('dm-list'); l.innerHTML = ''; 
        db.ref('dms').on('value', s => { 
            l.innerHTML = ''; 
            s.forEach(c => { 
                if(c.key.includes(State.user.uid)) { 
                    const otherId = c.key.split('_').find(k => k !== State.user.uid); 
                    if(otherId) { 
                        let localUnread = 0; const messages = c.val(); Object.values(messages).forEach(m => { if (m.uid !== State.user.uid && !m.read) localUnread++; }); 
                        db.ref('users/'+otherId).once('value', us => { 
                            const u = us.val(); if(!u) return; 
                            const isOnline = u.status === 'online';
                            const statusDot = `<span class="dm-status-dot ${isOnline ? 'online' : ''}" title="${isOnline ? 'Online' : 'Offline'}"></span>`;
                            const d = document.createElement('div'); d.className = 'channel-card'; 
                            const bannerStyle = u.banner ? `background-image: url('${u.banner}')` : ''; 
                            const badgeHtml = localUnread > 0 ? `<span class="badge-count visible" style="margin-left:auto;">${localUnread}</span>` : ''; 
                            const avatar = u.avatar || 'https://via.placeholder.com/100'; 
                            d.innerHTML = `<div class="ch-card-banner" style="${bannerStyle}"></div><div class="ch-card-body"><img src="${avatar}" class="ch-card-avi"><div class="ch-card-info"><div class="ch-name">${u.displayName}${statusDot}</div><div class="ch-meta">Private Chat</div></div>${badgeHtml}</div>`; 
                            d.onclick = () => Chat.startDM(otherId, u.displayName); 
                            l.appendChild(d); 
                        }); 
                    } 
                } 
            }); 
        }); 
    },
    
    startDM: async (targetId, targetName) => { 
        const tid = targetId || State.dmTarget; 
        if(!tid) return console.error("No target for DM"); 
        const check = await Privacy.check(tid, 'dm');
        if(!check.allowed) { UI.toast(check.error || "Cannot open DM", "error"); }
        State.chatMode = 'dm'; State.dmTarget = tid; 
        const rightBtn = document.getElementById('chat-top-right'); 
        if(rightBtn) { rightBtn.innerHTML = `<i class="fas fa-phone-alt" style="cursor:pointer; color:var(--primary); font-size:1.1rem; padding:10px;" onclick="Voice.callUser('${tid}')"></i>`; }
        const ids = [State.user.uid, tid].sort(); 
        document.getElementById('modal-user').classList.remove('open'); 
        if(!targetName) { const nameEl = document.getElementById('u-name'); targetName = nameEl ? nameEl.innerText : 'Chat'; } 
        const titleEl = document.getElementById('chat-title'); 
        if(titleEl) { titleEl.innerHTML = `${targetName} <i class="fas fa-user-circle" style="font-size:0.7em; opacity:0.5; margin-left:8px;"></i>`; titleEl.classList.add('clickable-header'); titleEl.onclick = () => window.Profile.view(tid); } 
        Route('chat'); Chat.listen(db.ref('dms/'+ids.join('_')), 'chat-feed'); 
    },
    
    decryptEffect: (element) => { const originalText = element.innerText; if(!originalText || originalText.length === 0) return; const chars = "01"; let iterations = 0; const speed = 30; element.style.fontFamily = "'JetBrains Mono', monospace"; element.style.color = "var(--secondary)"; const interval = setInterval(() => { element.innerText = originalText.split("").map((letter, index) => { if (index < iterations) return originalText[index]; return chars[Math.floor(Math.random() * 2)]; }).join(""); if (iterations >= originalText.length) { clearInterval(interval); element.style.color = ""; element.style.fontFamily = ""; } iterations += 1 / 2; }, speed); },
    
    // --- GLOBAL PLAYER LOGIC ---

    // 1. Рендерим в чате простую кнопку (как раньше)
    renderAudio: (url, key) => {
        return `
        <div class="simple-audio-msg" onclick="Chat.startGlobalPlayer('${url}', 'Audio Message')">
            <i class="fas fa-play-circle sam-icon"></i>
            <span class="sam-text">Voice Message</span>
        </div>`;
    },

    // 2. Запускаем глобальный плеер сверху
    startGlobalPlayer: (url, title) => {
        const bar = document.getElementById('global-player-bar');
        
        // Если уже играет это же - пауза/плей
        if (Chat.activeAudio && Chat.activeUrl === url) {
            Chat.toggleGlobalPlay();
            return;
        }

        // Если играет другое - стоп
        if (Chat.activeAudio) {
            Chat.activeAudio.pause();
        }

        Chat.activeAudio = new Audio(url);
        Chat.activeUrl = url;
        
        // Показываем бар
        bar.classList.remove('hidden');
        document.getElementById('gab-title').innerText = title || "Audio Track";
        
        // Обновляем иконку Play
        const playBtn = document.getElementById('gab-play-btn');
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';

        Chat.activeAudio.play().catch(e => console.error(e));

        // События
        Chat.activeAudio.ontimeupdate = Chat.updateGlobalProgress;
        Chat.activeAudio.onended = () => {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            document.getElementById('gab-progress').style.width = '0%';
        };
    },

    toggleGlobalPlay: () => {
        if(!Chat.activeAudio) return;
        const btn = document.getElementById('gab-play-btn');
        
        if(Chat.activeAudio.paused) {
            Chat.activeAudio.play();
            btn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            Chat.activeAudio.pause();
            btn.innerHTML = '<i class="fas fa-play"></i>';
        }
    },

    updateGlobalProgress: () => {
        if(!Chat.activeAudio) return;
        const dur = Chat.activeAudio.duration;
        const cur = Chat.activeAudio.currentTime;
        if(!dur) return;

        const percent = (cur / dur) * 100;
        document.getElementById('gab-progress').style.width = percent + '%';

        const min = Math.floor(cur / 60);
        const sec = Math.floor(cur % 60);
        document.getElementById('gab-time').innerText = `${min}:${sec<10?'0'+sec:sec}`;
    },

    seekGlobal: (seconds) => {
        if(Chat.activeAudio) Chat.activeAudio.currentTime += seconds;
    },

    toggleGlobalSpeed: () => {
        const btn = document.getElementById('gab-speed');
        if(!Chat.activeAudio) return;
        
        let s = Chat.activeAudio.playbackRate;
        if(s === 1) s = 1.5;
        else if(s === 1.5) s = 2;
        else s = 1;
        
        Chat.activeAudio.playbackRate = s;
        btn.innerText = s + 'x';
    },

    closeGlobalPlayer: () => {
        if(Chat.activeAudio) {
            Chat.activeAudio.pause();
            Chat.activeAudio = null;
        }
        document.getElementById('global-player-bar').classList.add('hidden');
    },

    listen: (ref, elId) => {
        const feed = document.getElementById(elId); if(!feed) return; feed.innerHTML = ''; if(State.chatRef) State.chatRef.off(); State.chatRef = ref;
        let initialLoad = true; setTimeout(() => { initialLoad = false; }, 2000);
        const markRead = (snap) => { const val = snap.val(); if (val.uid !== State.user.uid && !val.read) snap.ref.update({read: true}); };
        
        ref.limitToLast(50).on('child_added', async s => {
            const d = s.val(), key = s.key; const isMine = d.uid === State.user.uid;
            if(!isMine) { const isBlocked = await Block.isBlockedByMe(d.uid); if(isBlocked) return; }
            if (!isMine && document.getElementById('tab-chat').classList.contains('active') && !document.hidden) markRead(s);
            if (!isMine && !initialLoad && (document.hidden || !document.getElementById('tab-chat').classList.contains('active'))) { 
                let notifText = d.text; 
                if(d.audio) notifText = '🎤 Voice Message'; 
                else if(d.image) notifText = '📷 Image'; 
                else if(d.video) notifText = '📹 Video Message'; // Уведомление для видео
                UI.notify(d.user, notifText, 'msg', d.avatar); 
            }
            
            const div = document.createElement('div'); div.className = `msg ${isMine?'mine':''}`; div.id = 'msg-'+key;
            let del = ''; if(isMine || State.profile.role==='super') del = `<i class="fas fa-trash" style="margin-left:5px; cursor:pointer; color:#666; font-size:0.8rem;" onclick="Chat.del('${key}')"></i>`;
            const aviId = `avi-${key}`;
            let prefixHtml = ''; if (d.prefix) { prefixHtml = `<span style="color:${d.prefixColor || '#fff'}; margin-right:5px; font-weight:800; font-family:'Exo 2'; text-shadow:0 0 5px ${d.prefixColor};">[${d.prefix}]</span>`; }
            const textHtml = d.text ? `<div class="decode-target">${safe(d.text)}</div>` : '';
            
            let audioHtml = ''; if (d.audio) audioHtml = Chat.renderAudio(d.audio, key);
            
            // Рендер видео-кружка
            let videoHtml = ''; 
            if (d.video) {
                videoHtml = `
                <div class="video-msg-wrapper">
                    <video src="${d.video}" class="msg-square-video" controls playsinline></video>
                </div>`;
            }
            
            div.innerHTML = `<img id="${aviId}" src="${d.avatar}" class="avatar" onclick="window.Profile.view('${d.uid}')"><div class="bubble"><div style="font-size:0.75rem; font-weight:700; color:${isMine?'#fff':'#bc13fe'}; margin-bottom:3px;">${prefixHtml}${d.user} ${del}</div>${d.image ? `<img src="${d.image}" class="msg-img" onclick="showImg(this.src)">` : ''}${videoHtml}${audioHtml}${textHtml}</div>`;
            feed.appendChild(div); feed.scrollTop = feed.scrollHeight;
            if (!initialLoad && d.text) { const textEl = div.querySelector('.decode-target'); if (textEl) Chat.decryptEffect(textEl); }
            db.ref(`users/${d.uid}/avatar`).once('value', snap => { if(snap.exists()) { const realAvatar = snap.val(); const imgEl = document.getElementById(aviId); if(imgEl && realAvatar !== d.avatar) imgEl.src = realAvatar; } });
        });
        ref.on('child_removed', s => { const el=document.getElementById('msg-'+s.key); if(el)el.remove(); });
    },
    del: k => UI.confirm("DELETE", "Delete message?", () => State.chatRef.child(k).remove()), confirmEdit: () => {}
};
document.addEventListener('DOMContentLoaded', () => { Chat.init(); });