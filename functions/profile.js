window.Settings = {
    croppedData: { avi: null, ban: null },

    defaultTheme: { accent: '#d600ff', bg: '#05000a', panel: '#0e0e12' },
    
    initListeners: () => {
        const handleUpload = (file, ratio, callback) => {
            if (!file) return;
            if (file.type.toLowerCase().includes('gif')) {
                const reader = new FileReader();
                reader.onload = (e) => callback(e.target.result);
                reader.readAsDataURL(file);
            } else {
                UI.Crop.start(file, ratio, (base64) => callback(base64), () => { 
                    if(document.activeElement) document.activeElement.value = ''; 
                });
            }
        };

        const aviIn = document.getElementById('avi-in');
        if(aviIn) aviIn.onchange = e => {
            handleUpload(e.target.files[0], 1, (base64) => {
                Settings.croppedData.avi = base64;
                const el = document.getElementById('my-avi');
                if(el) el.src = base64;
                aviIn.value = '';
            });
        };

        const banIn = document.getElementById('banner-in');
        if(banIn) banIn.onchange = e => {
            handleUpload(e.target.files[0], 2.5, (base64) => {
                Settings.croppedData.ban = base64;
                const el = document.getElementById('my-banner-prev');
                if(el) el.style.backgroundImage = `url(${base64})`;
                banIn.value = '';
            });
        };
    },

    save: () => {
        const n = document.getElementById('my-nick').value.trim();
        const bio = document.getElementById('my-bio').value.trim();
        const prefix = document.getElementById('set-prefix').value.trim();
        const prefixColor = document.getElementById('set-prefix-color').value;

        if(!n) return UI.toast("Name required", "error");
        
        const update = { 
            displayName: n, bio: bio, prefix: prefix, prefixColor: prefixColor,
            theme: {
                accent: document.getElementById('set-accent').value,
                bg: document.getElementById('set-bg').value,
                panel: document.getElementById('set-panel').value
            }
        };

        if(Settings.croppedData.avi) update.avatar = Settings.croppedData.avi;
        if(Settings.croppedData.ban) update.banner = Settings.croppedData.ban;

        db.ref('users/'+State.user.uid).update(update).then(()=>{
            UI.toast("Settings Saved","success");
            Settings.croppedData = { avi: null, ban: null };
        });
    },

    previewTheme: () => {
        const theme = {
            accent: document.getElementById('set-accent').value,
            bg: document.getElementById('set-bg').value,
            panel: document.getElementById('set-panel').value
        };
        Settings.applyTheme(theme);
    },

    resetTheme: () => {
        const t = Settings.defaultTheme;
        const elAcc = document.getElementById('set-accent');
        const elBg = document.getElementById('set-bg');
        const elPan = document.getElementById('set-panel');
        if(elAcc) elAcc.value = t.accent;
        if(elBg) elBg.value = t.bg;
        if(elPan) elPan.value = t.panel;
        Settings.applyTheme(t);
    },

    applyTheme: (t) => {
        if(!t) t = Settings.defaultTheme;
        const styleEl = document.getElementById('theme-style');
        if(!styleEl) return;

        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16),
                  g = parseInt(hex.slice(3, 5), 16),
                  b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        styleEl.innerHTML = `
            :root { --accent: ${t.accent}; --bg: ${t.bg}; --panel: ${t.panel}; }
            body, #bg-canvas { background-color: ${t.bg} !important; }
            .sidebar { background: ${t.panel} !important; border-right: 1px solid ${hexToRgba(t.accent, 0.1)}; }
            .sidebar-header span, .top-title, .nav-item.active, .nav-item.active i, .btn-text, .ch-name i { color: ${t.accent} !important; }
            .nav-item.active { border-right: 3px solid ${t.accent}; background: linear-gradient(90deg, transparent, ${hexToRgba(t.accent, 0.1)}); }
            .btn-solid { background: ${t.accent}; box-shadow: 0 4px 15px ${hexToRgba(t.accent, 0.4)}; }
            .btn-solid:hover { box-shadow: 0 6px 20px ${hexToRgba(t.accent, 0.6)}; }
            .bubble .mine { color: ${t.accent} !important; }
            .msg.mine .bubble { border: 1px solid ${t.accent}; background: ${hexToRgba(t.accent, 0.1)}; }
            .chat-input-area { background: ${t.panel}; border-top: 1px solid ${hexToRgba(t.accent, 0.2)}; }
            .top-bar { background: ${hexToRgba(t.panel, 0.95)}; border-bottom: 1px solid ${hexToRgba(t.accent, 0.1)}; }
            .panel-box, .channel-card { background: ${t.panel}; border: 1px solid ${hexToRgba(t.accent, 0.15)}; }
            .panel-border { border-color: ${t.panel} !important; }
            #my-nick { border-bottom: 2px solid ${t.accent}; }
            #full-img { border-color: ${t.accent} !important; }
            input[type="text"], input[type="password"], input[type="email"], textarea { background: ${t.panel}; color: #fff; border: 1px solid #333; }
            input:focus, textarea:focus { border-color: ${t.accent}; }
        `;
        if(window.Background && window.Background.updateColor) { window.Background.updateColor(t.bg, t.accent); }
    },

    view: (uid) => {
        if(!uid) return;
        console.log("Opening profile for:", uid);

        db.ref('users/'+uid).once('value', s => {
            const u = s.val();
            if(!u) return console.error("User not found");
            
            // Вспомогательная функция для безопасной вставки
            const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
            const setSrc = (id, val) => { const el = document.getElementById(id); if(el) el.src = val; };
            const setBg = (id, val) => { const el = document.getElementById(id); if(el) el.style.backgroundImage = val; };

            // 1. Основные данные
            setBg('u-banner', u.banner ? `url(${u.banner})` : 'none');
            setSrc('u-avi', u.avatar || 'https://via.placeholder.com/100');
            setVal('u-name', u.displayName);
            setVal('u-id', u.shortId);
            
            // 2. Префикс
            const prefContainer = document.getElementById('u-prefix-container');
            if(prefContainer) {
                if (u.prefix) {
                    prefContainer.innerHTML = `<span style="font-size:0.8rem; font-weight:700; color:${u.prefixColor || '#fff'}; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${u.prefix}</span>`;
                } else { prefContainer.innerHTML = ''; }
            }
            
            // 3. Статус Онлайн (с проверкой на старый и новый ID)
            const dot = document.getElementById('u-status-indicator') || document.getElementById('u-status');
            if(dot) {
                const activeClass = dot.id === 'u-status-indicator' ? 'p-status-dot' : 'p-status';
                dot.className = u.status === 'online' ? `${activeClass} online` : `${activeClass}`;
            }
            
            // 4. Роль
            let rName = 'USER';
            if(u.role === 'admin') rName = 'ADMINISTRATOR';
            if(u.role === 'super') rName = 'ROOT ACCESS';
            setVal('u-role', rName);
            
            // 5. Дата регистрации (безопасно)
            const regEl = document.getElementById('u-reg-date');
            if(regEl) {
                if(u.createdAt) {
                    const d = new Date(u.createdAt);
                    regEl.innerText = d.toLocaleDateString();
                } else {
                    regEl.innerText = "N/A";
                }
            }
            
            // 6. Последний онлайн
            const lsEl = document.getElementById('u-last-seen');
            if(lsEl) {
                if(u.status === 'online') {
                    lsEl.innerText = "Online Now";
                    lsEl.style.color = "#00ff9d";
                } else {
                    const ls = u.lastSeen ? new Date(u.lastSeen).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Unknown';
                    lsEl.innerText = ls;
                    lsEl.style.color = "#ccc";
                }
            }

            // 7. Ачивки
            const badgesEl = document.getElementById('u-badges');
            if(badgesEl) {
                badgesEl.innerHTML = '';
                const addBadge = (icon, color, title) => {
                    badgesEl.innerHTML += `<div class="p-badge-box" title="${title}" style="color:${color}; border-color:${color}40"><i class="${icon}"></i></div>`;
                };

                addBadge('fas fa-id-card', '#00e5ff', 'Resident');
                if(u.role === 'admin' || u.role === 'super') addBadge('fas fa-shield-alt', '#ff0055', 'Staff');
                if(u.role === 'super') addBadge('fas fa-code', '#d600ff', 'Developer');
            }

            State.dmTarget = uid; 
            
            // Блокировка (если модуль Block загружен)
            if(window.Block && window.Block.check) {
                Block.check(uid).then(b => {
                    const btn = document.getElementById('btn-block');
                    if(btn) btn.innerText = b ? "UNBLOCK" : "BLOCK";
                });
            }
            
            const modal = document.getElementById('modal-user');
            if(modal) modal.classList.add('open');
        });
    }
};

window.Profile = window.Settings;
document.addEventListener('DOMContentLoaded', () => { Settings.initListeners(); });