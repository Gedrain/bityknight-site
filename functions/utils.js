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
            const maxDim = 800;
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

// --- СИСТЕМА УВЕДОМЛЕНИЙ ---
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
                icon: icon || 'icon.png'
            });
        }
    }
};

// --- СИСТЕМА БЛОКИРОВКИ (PocketBase) ---
window.Block = {
    toggle: async () => {
        if(!State.dmTarget) return;
        const btn = document.getElementById('btn-block');
        
        try {
            // Ищем, есть ли уже запись о блокировке
            const records = await pb.collection('blocked').getList(1, 1, {
                filter: `user = "${State.user.uid}" && target = "${State.dmTarget}"`
            });

            if(records.items.length > 0) {
                // Если нашли -> разблокируем (удаляем запись)
                await pb.collection('blocked').delete(records.items[0].id);
                UI.toast("Unblocked");
                if(btn) btn.innerText = "BLOCK";
            } else {
                // Если не нашли -> блокируем (создаем запись)
                await pb.collection('blocked').create({
                    user: State.user.uid,
                    target: State.dmTarget
                });
                UI.toast("Blocked");
                if(btn) btn.innerText = "UNBLOCK";
            }
        } catch(err) {
            console.error("Block error:", err);
            // Если ошибка 404, значит коллекции blocked нет или нет прав
            UI.toast("Error (Check 'blocked' collection)", "error");
        }
    },
    
    check: async (targetUid) => {
        try {
            const records = await pb.collection('blocked').getList(1, 1, {
                filter: `user = "${State.user.uid}" && target = "${targetUid}"`
            });
            return records.items.length > 0;
        } catch(e) { return false; }
    }
};