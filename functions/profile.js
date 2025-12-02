window.Profile = {
    save: () => {
        const n = document.getElementById('my-nick').value.trim();
        const bio = document.getElementById('my-bio').value.trim();
        const avi = document.getElementById('avi-in').files[0];
        const ban = document.getElementById('banner-in').files[0];

        if(!n) return UI.toast("Name required", "error");
        
        const update = { displayName: n, bio: bio };
        const commit = () => db.ref('users/'+State.user.uid).update(update).then(()=>UI.toast("Saved","success"));

        const procBan = () => { if(ban) resizeImage(ban, u => { update.banner=u; commit(); }); else commit(); };
        if(avi) resizeImage(avi, u => { update.avatar=u; procBan(); }); else procBan();
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
            
            const badge = document.getElementById('u-status');
            if(u.status === 'online') badge.className = 'p-status online';
            else badge.className = 'p-status offline';

            // --- ЗНАЧКИ ---
            const badgesEl = document.getElementById('u-badges');
            badgesEl.innerHTML = '';
            
            // Если админ
            if(u.role === 'admin' || u.role === 'super') {
                badgesEl.innerHTML += `<div class="p-badge-icon" data-title="System Admin" style="color:#ff0055; border-color:#ff0055"><i class="fas fa-shield-alt"></i></div>`;
            }
            // Если создатель
            if(u.role === 'super') {
                badgesEl.innerHTML += `<div class="p-badge-icon" data-title="Architect" style="color:#d600ff; border-color:#d600ff"><i class="fas fa-crown"></i></div>`;
            }
            // Тестер (пример)
            if(u.role === 'tester') {
                badgesEl.innerHTML += `<div class="p-badge-icon" data-title="Beta Tester" style="color:#ffcc00"><i class="fas fa-bug"></i></div>`;
            }
            // Всегда добавляем значок пользователя
            badgesEl.innerHTML += `<div class="p-badge-icon" data-title="Operative" style="color:#00e5ff"><i class="fas fa-user"></i></div>`;

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