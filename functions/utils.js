function showImg(s){ document.getElementById('full-img').src=s; document.getElementById('modal-img').classList.add('open'); }
function safe(t){ return t ? t.replace(/</g,'&lt;') : ''; }

function resizeImage(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxDim = 1024; // Чуть увеличили качество
            let w = img.width; let h = img.height;
            if (w > h) { if (w > maxDim) { h *= maxDim / w; w = maxDim; } } 
            else { if (h > maxDim) { w *= maxDim / h; h = maxDim; } }
            canvas.width = w; canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Конвертация Blob (аудио) в Base64
function blobToBase64(blob, callback) {
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = reader.result;
        callback(dataUrl);
    };
    reader.readAsDataURL(blob);
}

// --- NOTIFICATIONS SYSTEM ---
window.Notifications = {
    init: () => {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    },
    send: (title, body, icon) => {
        if (Notification.permission === "granted" && document.hidden) {
            new Notification(title, {
                body: body,
                icon: icon || 'https://cdn-icons-png.flaticon.com/512/733/733585.png'
            });
        }
    }
};

window.Block = {
    toggle: () => {
        if(!State.dmTarget) return;
        const ref = db.ref('users/'+State.user.uid+'/blocked/'+State.dmTarget);
        ref.once('value', s => {
            if(s.exists()){ ref.remove(); UI.toast("Unblocked"); document.getElementById('btn-block').innerText="BLOCK"; }
            else { ref.set(true); UI.toast("Blocked"); document.getElementById('btn-block').innerText="UNBLOCK"; }
        });
    },
    check: (targetUid) => {
        return db.ref('users/'+targetUid+'/blocked/'+State.user.uid).once('value').then(s => s.exists());
    }
};