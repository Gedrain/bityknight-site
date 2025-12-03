window.Channels = {
    editingId: null,
    
    // Хранилище для обрезанных фото (base64)
    croppedData: {
        newAvi: null,
        newBan: null,
        editAvi: null,
        editBan: null
    },

    initListeners: () => {
        console.log("Channels: Listeners initialized");

        // ==========================================
        // 1. СОЗДАНИЕ: НОВАЯ АВАТАРКА
        // ==========================================
        const newAviIn = document.getElementById('new-ch-avi');
        if(newAviIn) newAviIn.onchange = e => {
            const f = e.target.files[0];
            if(!f) return;
            UI.Crop.start(f, 1, (base64) => {
                // Success
                Channels.croppedData.newAvi = base64;
                const prev = document.getElementById('new-ch-avi-prev');
                if(prev) prev.src = base64;
                newAviIn.value = ''; // Сброс, чтобы можно было выбрать тот же файл
            }, () => {
                // Cancel
                newAviIn.value = ''; 
            });
        };

        // ==========================================
        // 2. СОЗДАНИЕ: НОВЫЙ БАННЕР
        // ==========================================
        const newBanIn = document.getElementById('new-ch-banner');
        if(newBanIn) newBanIn.onchange = e => {
            const f = e.target.files[0];
            if(!f) return;
            UI.Crop.start(f, 2.5, (base64) => {
                Channels.croppedData.newBan = base64;
                const prev = document.getElementById('new-ch-banner-prev');
                if(prev) prev.style.backgroundImage = `url(${base64})`;
                newBanIn.value = '';
            }, () => {
                newBanIn.value = '';
            });
        };

        // ==========================================
        // 3. РЕДАКТИРОВАНИЕ: АВАТАРКА (Твой случай)
        // ==========================================
        const editAviIn = document.getElementById('edit-ch-avi');
        if(editAviIn) editAviIn.onchange = e => {
            const f = e.target.files[0];
            if(!f) return;
            
            UI.Crop.start(f, 1, (base64) => {
                console.log("Edit Avi Cropped!"); // Debug log
                
                // 1. Сохраняем в память для отправки
                Channels.croppedData.editAvi = base64;
                
                // 2. Ищем превью и обновляем
                const prev = document.getElementById('edit-ch-avi-prev');
                if(prev) {
                    prev.src = base64;
                    console.log("Preview updated src");
                } else {
                    console.error("Preview element 'edit-ch-avi-prev' not found!");
                }
                
                // 3. Чистим инпут
                editAviIn.value = ''; 
            }, () => {
                editAviIn.value = '';
            });
        };

        // ==========================================
        // 4. РЕДАКТИРОВАНИЕ: БАННЕР
        // ==========================================
        const editBanIn = document.getElementById('edit-ch-banner');
        if(editBanIn) editBanIn.onchange = e => {
            const f = e.target.files[0];
            if(!f) return;
            
            UI.Crop.start(f, 2.5, (base64) => {
                console.log("Edit Banner Cropped!");
                
                Channels.croppedData.editBan = base64;
                const prev = document.getElementById('edit-ch-banner-prev');
                if(prev) {
                    prev.style.backgroundImage = `url(${base64})`;
                }
                editBanIn.value = '';
            }, () => {
                editBanIn.value = '';
            });
        };
    },

    // Логика создания
    create: () => {
        const n = document.getElementById('new-ch-name').value;
        const isPriv = document.getElementById('new-ch-priv').checked;
        const pass = isPriv ? document.getElementById('new-ch-pass').value : null;

        if(!n) return UI.toast("Name required", "error");

        const data = { 
            name: n, 
            pass: pass, 
            creator: State.user.uid,
            // Данные берутся из croppedData, которые мы сохранили после кропа
            image: Channels.croppedData.newAvi || null,
            banner: Channels.croppedData.newBan || null
        };

        db.ref('channels').push(data);
        document.getElementById('modal-create').classList.remove('open');
        
        // Reset Form
        document.getElementById('new-ch-name').value = '';
        document.getElementById('new-ch-priv').checked = false;
        if(document.getElementById('new-ch-pass')) document.getElementById('new-ch-pass').value = '';
        
        // Reset Previews
        const pAvi = document.getElementById('new-ch-avi-prev');
        if(pAvi) pAvi.src = 'https://via.placeholder.com/100/000000/ffffff?text=+';
        
        const pBan = document.getElementById('new-ch-banner-prev');
        if(pBan) pBan.style.backgroundImage = 'none';
        
        // Reset Data
        Channels.croppedData.newAvi = null; 
        Channels.croppedData.newBan = null;
    },

    load: () => {
        db.ref('channels').on('value', s => {
            const l = document.getElementById('channel-list'); 
            if(!l) return;
            l.innerHTML='';
            
            s.forEach(c => {
                const v = c.val();
                const d = document.createElement('div');
                d.className = 'channel-card';
                if(v.banner) d.style.backgroundImage = `url(${v.banner})`;
                const img = v.image || 'https://via.placeholder.com/50/000/fff?text=%23';
                const lock = v.pass ? '<i class="fas fa-lock" style="color:#ffcc00; margin-right:5px; font-size:0.8rem;"></i>' : '';
                
                let settings = '';
                if(v.creator === State.user.uid || State.profile.role === 'super') {
                    settings = `<i class="fas fa-cog ch-settings" onclick="event.stopPropagation(); Channels.openSettings('${c.key}')"></i>`;
                }
                
                const badgeId = `ch-badge-${c.key}`;
                
                d.innerHTML = `
                    <div class="ch-content">
                        <img src="${img}" class="ch-avi">
                        <div class="ch-info">
                            <div class="ch-name">${lock}${v.name}</div>
                            <div class="ch-meta">ID: ${c.key.substr(-4)}</div>
                        </div>
                        <span id="${badgeId}" class="badge-count">0</span>
                        ${settings}
                    </div>
                `;
                
                d.onclick = () => {
                    const b = document.getElementById(badgeId);
                    if(b) b.classList.remove('visible');
                    
                    if(v.pass && !State.unlockedChannels.has(c.key)) { 
                        State.pendingCh={id:c.key, name:v.name, pass:v.pass}; 
                        document.getElementById('modal-pass').classList.add('open'); 
                    } else { 
                        const t = document.getElementById('chat-title');
                        if(t) t.innerText='# '+v.name; 
                        Route('chat'); 
                        Chat.listen(db.ref('channels_msg/'+c.key), 'chat-feed'); 
                    }
                };
                
                l.appendChild(d);
                
                // Слушатель сообщений для бейджика
                db.ref('channels_msg/'+c.key).limitToLast(1).on('child_added', snap => {
                    const msg = snap.val();
                    const isFresh = (Date.now() - msg.ts) < 5000; 
                    const isActive = document.getElementById('tab-chat').classList.contains('active') && 
                                     document.getElementById('chat-title').innerText === '# '+v.name;
                    
                    if (isFresh && msg.uid !== State.user.uid && !isActive) {
                        const b = document.getElementById(badgeId);
                        if(b) {
                            let count = parseInt(b.innerText) || 0; 
                            count++; 
                            b.innerText = count; 
                            b.classList.add('visible');
                        }
                    }
                });
            });
        });
    },

    auth: () => {
        const inp = document.getElementById('ch-auth-pass');
        if(inp.value === State.pendingCh.pass) {
            State.unlockedChannels.add(State.pendingCh.id);
            document.getElementById('modal-pass').classList.remove('open');
            inp.value = '';
            Route('chat'); 
            Chat.listen(db.ref('channels_msg/'+State.pendingCh.id), 'chat-feed');
        } else UI.toast("Wrong Pass", "error");
    },

    openSettings: (key) => {
        Channels.editingId = key;
        db.ref('channels/'+key).once('value', s => {
            const v = s.val();
            document.getElementById('edit-ch-name').value = v.name;
            
            // Загружаем текущие изображения в превью
            const avi = v.image || 'https://via.placeholder.com/100/000000/ffffff?text=+';
            const ban = v.banner || 'none';
            
            const pAvi = document.getElementById('edit-ch-avi-prev');
            if(pAvi) pAvi.src = avi;
            
            const pBan = document.getElementById('edit-ch-banner-prev');
            if(pBan) pBan.style.backgroundImage = ban === 'none' ? 'none' : `url(${ban})`;

            document.getElementById('modal-channel-settings').classList.add('open');
            
            // СБРОС (Важно!): Очищаем временные данные, чтобы старые кропы не применились
            Channels.croppedData.editAvi = null; 
            Channels.croppedData.editBan = null;
        });
    },

    // Финальное сохранение настроек
    saveSettings: () => {
        const key = Channels.editingId;
        const name = document.getElementById('edit-ch-name').value;
        if(!name) return UI.toast("Name required", "error");
        
        const update = { name: name };
        
        // Если пользователь обрезал новое фото, оно в croppedData. Если нет - там null и мы не трогаем поле.
        if(Channels.croppedData.editAvi) update.image = Channels.croppedData.editAvi;
        if(Channels.croppedData.editBan) update.banner = Channels.croppedData.editBan;

        db.ref('channels/'+key).update(update);
        document.getElementById('modal-channel-settings').classList.remove('open');
        
        // Очистка
        Channels.croppedData.editAvi = null;
        Channels.croppedData.editBan = null;
    },

    del: () => {
        if(!Channels.editingId) return;
        UI.confirm("DELETE", "Delete channel?", () => {
            db.ref('channels/'+Channels.editingId).remove();
            document.getElementById('modal-channel-settings').classList.remove('open');
        });
    }
};

document.addEventListener('DOMContentLoaded', () => { Channels.initListeners(); });