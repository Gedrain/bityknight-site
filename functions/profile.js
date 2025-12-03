window.Settings = {
    croppedData: { avi: null, ban: null },
    defaultTheme: { accent: '#d600ff', bg: '#05000a', panel: '#0e0e12' },
    
    initListeners: () => {
        const handleUpload = (file, ratio, callback) => {
            if (!file) return;
            // PocketBase отлично ест GIF, не нужно их кропать если не хочешь
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
                document.getElementById('my-avi').src = base64;
                aviIn.value = '';
            });
        };

        const banIn = document.getElementById('banner-in');
        if(banIn) banIn.onchange = e => {
            handleUpload(e.target.files[0], 2.5, (base64) => {
                Settings.croppedData.ban = base64;
                document.getElementById('my-banner-prev').style.backgroundImage = `url(${base64})`;
                banIn.value = '';
            });
        };
    },

    save: async () => {
        const n = document.getElementById('my-nick').value.trim();
        const bio = document.getElementById('my-bio').value.trim();
        const prefix = document.getElementById('set-prefix').value.trim();
        const prefixColor = document.getElementById('set-prefix-color').value;

        if(!n) return UI.toast("Name required", "error");
        
        // Используем FormData для отправки файлов
        const formData = new FormData();
        formData.append('nickname', n); // Используем nickname, поле name системное
        formData.append('name', n);
        formData.append('bio', bio);
        formData.append('prefix', prefix);
        formData.append('prefixColor', prefixColor);
        
        // Тему сохраняем как JSON строку в поле theme (если его создали) 
        // или просто локально, так как PB не любит произвольные JSON объекты в полях
        const theme = {
            accent: document.getElementById('set-accent').value,
            bg: document.getElementById('set-bg').value,
            panel: document.getElementById('set-panel').value
        };
        // Сохраним тему локально для надежности
        localStorage.setItem('neko_theme', JSON.stringify(theme));

        if(Settings.croppedData.avi) {
            formData.append('avatar', dataURLtoFile(Settings.croppedData.avi, 'avatar.jpg'));
        }
        if(Settings.croppedData.ban) {
            formData.append('banner', dataURLtoFile(Settings.croppedData.ban, 'banner.jpg'));
        }

        try {
            const record = await pb.collection('users').update(State.user.uid, formData);
            State.profile = record;
            UI.toast("Settings Saved","success");
            Settings.croppedData = { avi: null, ban: null };
            Settings.applyTheme(theme);
        } catch(err) {
            console.error(err);
            UI.toast("Save failed", "error");
        }
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

    view: async (uid) => {
        if(!uid) return;
        
        try {
            const u = await pb.collection('users').getOne(uid);
            
            const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
            const setSrc = (id, val) => { const el = document.getElementById(id); if(el) el.src = val; };
            
            const avatarUrl = u.avatar ? pb.files.getUrl(u, u.avatar) : 'https://via.placeholder.com/100';
            const bannerUrl = u.banner ? pb.files.getUrl(u, u.banner) : 'none';

            const bannerEl = document.getElementById('u-banner');
            if(bannerEl) bannerEl.style.backgroundImage = bannerUrl === 'none' ? 'none' : `url(${bannerUrl})`;
            
            setSrc('u-avi', avatarUrl);
            setVal('u-name', u.nickname || u.name || "User");
            setVal('u-id', u.shortId);
            
            const prefContainer = document.getElementById('u-prefix-container');
            if(prefContainer) {
                if (u.prefix) {
                    prefContainer.innerHTML = `<span style="font-size:0.8rem; font-weight:700; color:${u.prefixColor || '#fff'}; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${u.prefix}</span>`;
                } else { prefContainer.innerHTML = ''; }
            }
            
            const dot = document.getElementById('u-status-indicator') || document.getElementById('u-status');
            if(dot) {
                const activeClass = dot.id === 'u-status-indicator' ? 'p-status-dot' : 'p-status';
                dot.className = u.status === 'online' ? `${activeClass} online` : `${activeClass}`;
            }
            
            let rName = 'USER';
            if(u.role === 'admin') rName = 'ADMINISTRATOR';
            if(u.role === 'super') rName = 'ROOT ACCESS';
            setVal('u-role', rName);
            
            const regEl = document.getElementById('u-reg-date');
            if(regEl) regEl.innerText = new Date(u.created).toLocaleDateString();
            
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
            
            const modal = document.getElementById('modal-user');
            if(modal) modal.classList.add('open');

        } catch(e) {
            console.error(e);
            UI.toast("User not found", "error");
        }
    }
};
window.Profile = window.Settings;
document.addEventListener('DOMContentLoaded', () => { Settings.initListeners(); });