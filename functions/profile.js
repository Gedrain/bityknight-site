window.Settings = {
    // Храним только обрезанные данные, так как редактор обязателен
    croppedData: { avi: null, ban: null },

    defaultTheme: {
        accent: '#d600ff',
        bg: '#05000a',
        panel: '#0e0e12'
    },
    
    initListeners: () => {
        // --- AVATAR ---
        const aviIn = document.getElementById('avi-in');
        if(aviIn) aviIn.onchange = e => {
            const f = e.target.files[0];
            if(f) {
                // Авто-открытие кроппера
                UI.Crop.start(f, 1, (base64) => {
                    Settings.croppedData.avi = base64;
                    document.getElementById('my-avi').src = base64;
                }, () => {
                    aviIn.value = ''; // Отмена - очищаем
                });
            }
        };

        // --- BANNER ---
        const banIn = document.getElementById('banner-in');
        if(banIn) banIn.onchange = e => {
            const f = e.target.files[0];
            if(f) {
                UI.Crop.start(f, 2.5, (base64) => {
                    Settings.croppedData.ban = base64;
                    document.getElementById('my-banner-prev').style.backgroundImage = `url(${base64})`;
                }, () => {
                    banIn.value = '';
                });
            }
        };
    },

    save: () => {
        const n = document.getElementById('my-nick').value.trim();
        const bio = document.getElementById('my-bio').value.trim();
        const prefix = document.getElementById('set-prefix').value.trim();
        const prefixColor = document.getElementById('set-prefix-color').value;

        if(!n) return UI.toast("Name required", "error");
        
        const update = { 
            displayName: n, 
            bio: bio,
            prefix: prefix,
            prefixColor: prefixColor,
            theme: {
                accent: document.getElementById('set-accent').value,
                bg: document.getElementById('set-bg').value,
                panel: document.getElementById('set-panel').value
            }
        };

        // Сохраняем обрезанные картинки
        if(Settings.croppedData.avi) update.avatar = Settings.croppedData.avi;
        if(Settings.croppedData.ban) update.banner = Settings.croppedData.ban;

        db.ref('users/'+State.user.uid).update(update).then(()=>{
            UI.toast("Settings Saved","success");
            
            // Сброс
            Settings.croppedData = { avi: null, ban: null };
            document.getElementById('avi-in').value = '';
            document.getElementById('banner-in').value = '';
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
        document.getElementById('set-accent').value = t.accent;
        document.getElementById('set-bg').value = t.bg;
        document.getElementById('set-panel').value = t.panel;
        Settings.applyTheme(t);
    },

    applyTheme: (t) => {
        if(!t) t = Settings.defaultTheme;
        const styleEl = document.getElementById('theme-style');
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

        if(window.Background && window.Background.updateColor) {
            window.Background.updateColor(t.bg, t.accent);
        }
    },

    view: (uid) => {
        if(!uid) return;
        db.ref('users/'+uid).once('value', s => {
            const u = s.val();
            if(!u) return;
            document.getElementById('u-banner').style.backgroundImage = u.banner ? `url(${u.banner})` : 'none';
            document.getElementById('u-avi').src = u.avatar || 'https://via.placeholder.com/100';
            document.getElementById('u-name').innerText = u.displayName;
            document.getElementById('u-id').innerText = "#" + u.shortId;
            const prefContainer = document.getElementById('u-prefix-container');
            if (u.prefix) prefContainer.innerHTML = `<span style="color:${u.prefixColor || '#fff'}; text-shadow:0 0 10px ${u.prefixColor};">[ ${u.prefix} ]</span>`;
            else prefContainer.innerHTML = '';
            const badge = document.getElementById('u-status');
            badge.className = u.status === 'online' ? 'p-status online' : 'p-status offline';
            const badgesEl = document.getElementById('u-badges');
            badgesEl.innerHTML = '';
            if(u.role === 'admin' || u.role === 'super') badgesEl.innerHTML += `<div class="p-badge-icon" style="color:#ff0055; border-color:#ff0055"><i class="fas fa-shield-alt"></i></div>`;
            if(u.role === 'super') badgesEl.innerHTML += `<div class="p-badge-icon" style="color:#d600ff; border-color:#d600ff"><i class="fas fa-crown"></i></div>`;
            badgesEl.innerHTML += `<div class="p-badge-icon" style="color:#00e5ff"><i class="fas fa-user"></i></div>`;
            let rName = 'OPERATIVE';
            if(u.role === 'super') rName = 'SYSTEM ARCHITECT';
            if(u.role === 'admin') rName = 'ADMINISTRATOR';
            document.getElementById('u-role').innerText = rName;
            State.dmTarget = uid; 
            Block.check(uid).then(b => document.getElementById('btn-block').innerText = b ? "UNBLOCK" : "BLOCK");
            document.getElementById('modal-user').classList.add('open');
        });
    }
};

window.Profile = window.Settings;
document.addEventListener('DOMContentLoaded', () => { Settings.initListeners(); });