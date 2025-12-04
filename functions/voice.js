// --- КОНФИГУРАЦИЯ AGORA ---
const AGORA_APP_ID = "96d3cebedfb044aa846e83d2bb818409"; // ID из твоего примера
// ---------------------------

window.Voice = {
    client: null,
    localAudioTrack: null,
    remoteUsers: {},
    currentChannel: null,
    isMuted: false,
    isDeafened: false,
    croppedBanner: null,
    listListener: null,

    init: () => {
        // Настройка загрузки баннера
        const banIn = document.getElementById('new-v-banner');
        if(banIn) {
            banIn.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;
                UI.Crop.start(file, 2.5, (base64) => {
                    Voice.croppedBanner = base64;
                    document.getElementById('new-v-banner-prev').style.backgroundImage = `url(${base64})`;
                    banIn.value = '';
                });
            };
        }
        
        // Инициализация Agora Client
        if(window.AgoraRTC) {
            Voice.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            Voice.setupAgoraListeners();
        } else {
            console.error("Agora SDK not loaded!");
        }

        Voice.load();
    },

    setupAgoraListeners: () => {
        // Когда удаленный пользователь публикует поток (включает микрофон)
        Voice.client.on("user-published", async (user, mediaType) => {
            await Voice.client.subscribe(user, mediaType);
            
            if (mediaType === "audio") {
                const remoteAudioTrack = user.audioTrack;
                // Если у нас не включен "Deafen" (звук выкл), играем
                if(!Voice.isDeafened) {
                    remoteAudioTrack.play();
                }
                Voice.remoteUsers[user.uid] = user;
            }
        });

        // Когда пользователь уходит
        Voice.client.on("user-unpublished", (user) => {
            delete Voice.remoteUsers[user.uid];
        });
    },

    // --- УПРАВЛЕНИЕ КОМНАТАМИ ---
    create: () => {
        const n = document.getElementById('new-v-name').value;
        const isPriv = document.getElementById('new-v-priv').checked;
        const pass = isPriv ? document.getElementById('new-v-pass').value : null;
        
        if(!n) return UI.toast("Name required", "error");
        
        const data = {
            name: n,
            pass: pass,
            creator: State.user.uid,
            banner: Voice.croppedBanner || null,
            users: {} 
        };
        
        db.ref('voice_channels').push(data).then(() => {
            UI.toast("Voice Channel Created", "success");
            document.getElementById('modal-create-voice').classList.remove('open');
            document.getElementById('new-v-name').value = '';
            document.getElementById('new-v-pass').value = '';
            document.getElementById('new-v-banner-prev').style.backgroundImage = 'none';
            Voice.croppedBanner = null;
        });
    },

    delete: (key) => {
        UI.confirm("DELETE ROOM", "Are you sure?", () => {
            db.ref('voice_channels/' + key).remove().then(() => {
                UI.toast("Room deleted", "success");
                if(Voice.currentChannel === key) Voice.leave();
            });
        });
    },

    load: () => {
        const l = document.getElementById('voice-list');
        if(!l) return;
        
        if (Voice.listListener) db.ref('voice_channels').off('value', Voice.listListener);
        
        Voice.listListener = db.ref('voice_channels').on('value', s => {
            l.innerHTML = '';
            const val = s.val();
            if(!val) { l.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">No active voice channels.</div>'; return; }
            
            Object.keys(val).forEach(key => {
                const v = val[key];
                const count = v.users ? Object.keys(v.users).length : 0;
                
                const div = document.createElement('div');
                div.className = 'voice-card';
                if(Voice.currentChannel === key) div.classList.add('active');

                if(v.banner) {
                    div.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url('${v.banner}')`;
                    div.style.backgroundSize = 'cover';
                    div.style.backgroundPosition = 'center';
                }

                const lockIcon = v.pass ? '<i class="fas fa-lock" style="color:#ffcc00; margin-right:8px; font-size:0.8rem;"></i>' : '';
                
                let usersHtml = '';
                if(v.users) {
                    usersHtml = '<div class="voice-users-preview">';
                    let i = 0;
                    Object.values(v.users).forEach(u => {
                        if(i < 5) usersHtml += `<img src="${u.avatar}" title="${u.name}" class="v-mini-avi">`;
                        i++;
                    });
                    if(count > 5) usersHtml += `<span style="font-size:0.8rem; color:#888; align-self:center;">+${count-5}</span>`;
                    usersHtml += '</div>';
                }

                let controlsHtml = `<div class="v-card-controls">
                    <button class="btn-icon-sm" onclick="event.stopPropagation(); Voice.viewMembers('${key}')"><i class="fas fa-users"></i> Users</button>
                `;
                
                if(v.creator === State.user.uid || (State.profile && State.profile.role === 'super')) {
                    controlsHtml += `<button class="btn-icon-sm danger" onclick="event.stopPropagation(); Voice.delete('${key}')"><i class="fas fa-trash"></i></button>`;
                }
                controlsHtml += `</div>`;

                div.innerHTML = `
                    <div class="v-card-head">
                        <div class="v-card-title">${lockIcon}${v.name}</div>
                        <div class="v-card-count"><i class="fas fa-signal"></i> ${count}</div>
                    </div>
                    ${usersHtml}
                    ${controlsHtml}
                `;
                div.onclick = () => Voice.attemptJoin(key, v);
                l.appendChild(div);
            });
        });
    },

    viewMembers: (key) => {
        const list = document.getElementById('members-list');
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Loading...</div>';
        document.getElementById('modal-members').classList.add('open');

        db.ref('voice_channels/'+key+'/users').once('value', snap => {
            list.innerHTML = '';
            if(!snap.exists()) {
                list.innerHTML = '<div style="text-align:center; color:#555;">No active members</div>';
                return;
            }
            const users = snap.val();
            Object.keys(users).forEach(uid => {
                const u = users[uid];
                const micStatus = u.isMuted ? '<i class="fas fa-microphone-slash" style="color:#ff0055;"></i>' : '<i class="fas fa-microphone" style="color:#00ff9d;"></i>';
                const card = document.createElement('div');
                card.className = 'member-card';
                card.innerHTML = `
                    <div class="member-avi-wrap"><img src="${u.avatar || 'https://via.placeholder.com/50'}" class="member-avi"></div>
                    <div class="member-info"><div class="member-name">${u.name}</div><div class="member-seen">Voice Connected ${micStatus}</div></div>
                    <button class="btn-text" style="padding:5px 10px; border:1px solid #333;" onclick="window.Profile.view('${uid}')">PROFILE</button>
                `;
                list.appendChild(card);
            });
        });
    },

    // --- ЛОГИКА ПОДКЛЮЧЕНИЯ (AGORA) ---

    attemptJoin: (key, data) => {
        if(Voice.currentChannel === key) return; 
        if(Voice.currentChannel) Voice.leave(); 

        if(data.pass) {
            State.pendingVoice = { id: key, pass: data.pass };
            document.getElementById('modal-voice-pass').classList.add('open');
        } else {
            Voice.join(key);
        }
    },

    authAndJoin: () => {
        const inp = document.getElementById('voice-auth-pass');
        if(inp.value === State.pendingVoice.pass) {
            document.getElementById('modal-voice-pass').classList.remove('open');
            inp.value = '';
            Voice.join(State.pendingVoice.id);
        } else {
            UI.toast("Wrong Password", "error");
        }
    },

    join: async (channelName) => {
        try {
            // Используем часть UID как ID для Agora
            const uid = State.user.uid; 

            // 1. Вступаем в канал Agora (token = null для Testing Mode)
            await Voice.client.join(AGORA_APP_ID, channelName, null, uid);

            // 2. Создаем локальный аудио трек
            Voice.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            
            // 3. Публикуем его (отправляем на сервер)
            await Voice.client.publish([Voice.localAudioTrack]);

            // 4. Обновляем UI и БД
            Voice.currentChannel = channelName;
            Voice.renderActiveBar(true);
            UI.toast("Server Connection Established", "success");

            const myData = {
                name: State.profile.displayName,
                avatar: State.profile.avatar,
                uid: State.user.uid,
                isMuted: false,
                isDeaf: false
            };
            
            // Добавляем в БД
            const ref = db.ref(`voice_channels/${channelName}/users/${State.user.uid}`);
            await ref.set(myData);
            ref.onDisconnect().remove(); 

        } catch (e) {
            console.error(e);
            UI.toast("Voice Connection Failed: " + e.message, "error");
            Voice.leave();
        }
    },

    leave: async () => {
        if(!Voice.currentChannel) return;
        
        // Удаляем из БД
        db.ref(`voice_channels/${Voice.currentChannel}/users/${State.user.uid}`).remove();
        
        // Закрываем треки
        if(Voice.localAudioTrack) {
            Voice.localAudioTrack.stop();
            Voice.localAudioTrack.close();
            Voice.localAudioTrack = null;
        }

        // Выходим из Agora
        await Voice.client.leave();

        Voice.currentChannel = null;
        Voice.renderActiveBar(false);
        UI.toast("Disconnected", "msg");
    },

    toggleMute: async () => {
        if(!Voice.localAudioTrack) return;
        
        Voice.isMuted = !Voice.isMuted;
        // Agora метод
        await Voice.localAudioTrack.setEnabled(!Voice.isMuted);

        const btn = document.getElementById('btn-v-mute');
        if(Voice.isMuted) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-microphone"></i>';
        }

        if(Voice.currentChannel) db.ref(`voice_channels/${Voice.currentChannel}/users/${State.user.uid}`).update({isMuted: Voice.isMuted});
    },

    toggleDeafen: () => {
        Voice.isDeafened = !Voice.isDeafened;
        
        // Проходимся по всем удаленным юзерам и мьютим/размьючиваем их
        Object.values(Voice.remoteUsers).forEach(user => {
            if(user.audioTrack) {
                if(Voice.isDeafened) user.audioTrack.stop();
                else user.audioTrack.play();
            }
        });

        const btn = document.getElementById('btn-v-deaf');
        if(Voice.isDeafened) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            UI.toast("Sound Disabled", "msg");
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-volume-up"></i>';
            UI.toast("Sound Enabled", "msg");
        }
        
        if(Voice.currentChannel) db.ref(`voice_channels/${Voice.currentChannel}/users/${State.user.uid}`).update({isDeaf: Voice.isDeafened});
    },

    renderActiveBar: (isActive) => {
        const bar = document.getElementById('voice-control-bar');
        if(isActive) {
            bar.classList.remove('hidden');
            Voice.isMuted = false; 
            Voice.isDeafened = false;
            document.getElementById('btn-v-mute').innerHTML = '<i class="fas fa-microphone"></i>';
            document.getElementById('btn-v-mute').classList.remove('active');
            document.getElementById('btn-v-deaf').innerHTML = '<i class="fas fa-volume-up"></i>';
            document.getElementById('btn-v-deaf').classList.remove('active');
        } else {
            bar.classList.add('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => { if(window.Voice) Voice.init(); });