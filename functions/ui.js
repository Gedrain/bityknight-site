const UI = {
    notify: (title, body, type='info', iconUrl=null) => {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = `neko-toast ${type}`;
        
        let iconHtml = '<i class="fas fa-info-circle"></i>';
        if(type==='success') iconHtml = '<i class="fas fa-check-circle" style="color:#00ff88"></i>';
        if(type==='error') iconHtml = '<i class="fas fa-exclamation-triangle" style="color:#ff0055"></i>';
        if(type==='msg') iconHtml = iconUrl ? `<img src="${iconUrl}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">` : '<i class="fas fa-comment-alt"></i>';

        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        t.innerHTML = `
            <div class="nt-icon">${iconHtml}</div>
            <div class="nt-content">
                <div class="nt-title">${title}</div>
                <div class="nt-body">${body}</div>
                <div class="nt-time">${time}</div>
            </div>
        `;

        if(document.hidden && Notification.permission === "granted") {
            const sysNotif = new Notification(title, { body: body, icon: iconUrl || 'icon.png', tag: 'neko-msg' });
            sysNotif.onclick = () => { window.focus(); sysNotif.close(); };
        }

        c.appendChild(t);
        setTimeout(() => {
            t.classList.add('hiding');
            t.addEventListener('animationend', () => t.remove());
        }, 4000);
    },

    toast: (msg, type='info') => {
        let title = "System";
        if(type==='error') title = "Error";
        if(type==='success') title = "Success";
        UI.notify(title, msg, type);
    },

    alert: (title, text) => {
        document.getElementById('alert-title').innerText = title;
        document.getElementById('alert-text').innerText = text;
        document.getElementById('custom-alert').classList.add('open');
    },
    confirm: (title, text, cb) => {
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-text').innerText = text;
        const btn = document.getElementById('btn-confirm-yes');
        const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = () => { document.getElementById('custom-confirm').classList.remove('open'); cb(); };
        document.getElementById('custom-confirm').classList.add('open');
    },
    closeConfirm: () => document.getElementById('custom-confirm').classList.remove('open'),
    
    toggleMenu: () => {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebar-overlay');
        sb.classList.toggle('open');
        ov.classList.toggle('open');
    },

    Crop: {
        instance: null, onFinish: null, onCancel: null,

        start: (file, aspectRatio, finishCb, cancelCb) => {
            if(!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.getElementById('crop-img');
                img.src = e.target.result;
                document.getElementById('modal-cropper').classList.add('open');
                UI.Crop.onFinish = finishCb;
                UI.Crop.onCancel = cancelCb;
                if(UI.Crop.instance) UI.Crop.instance.destroy();
                UI.Crop.instance = new Cropper(img, {
                    aspectRatio: aspectRatio, viewMode: 1, autoCropArea: 1, background: false, dragMode: 'move'
                });
            };
            reader.readAsDataURL(file);
        },

        finish: () => {
            if(!UI.Crop.instance) return;
            const canvas = UI.Crop.instance.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024, fillColor: '#000000' });
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            document.getElementById('modal-cropper').classList.remove('open');
            UI.Crop.instance.destroy();
            UI.Crop.instance = null;
            if(UI.Crop.onFinish) UI.Crop.onFinish(dataUrl);
        },

        cancel: () => {
            document.getElementById('modal-cropper').classList.remove('open');
            if(UI.Crop.instance) { UI.Crop.instance.destroy(); UI.Crop.instance = null; }
            if(UI.Crop.onCancel) UI.Crop.onCancel();
        }
    }
};