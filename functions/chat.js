const Chat = {
    init: () => {
        const inp = document.getElementById('msg-in');
        if(inp) {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); Chat.send(); }
            });
        }
    },
    
    back: () => {
        document.getElementById('chat-top-right').innerHTML = '';
        
        // Decide where to go back based on current mode
        if (State.chatMode === 'dm') {
             Route('dms');
        } else {
             Route('channels');
        }
        
        // Stop listening
        if(State.activeSubscription) {
            State.activeSubscription();
            State.activeSubscription = null;
        }
        State.currentChannelId = null;
        State.dmTarget = null;
    },

    send: async () => {
        const txtEl = document.getElementById('msg-in');
        const txt = txtEl.value.trim();
        const files = document.getElementById('file-in').files;

        if(!txt && files.length === 0) return;
        
        // Validate destination
        if(!State.currentChannelId && !State.dmTarget) return UI.toast("No destination selected", "error");

        const formData = new FormData();
        formData.append('author', State.user.uid);
        
        if (State.chatMode === 'channel') {
            formData.append('channel', State.currentChannelId);
        } else if (State.chatMode === 'dm') {
            formData.append('target', State.dmTarget);
        }
        
        if(txt) formData.append('text', txt);
        if(files.length > 0) formData.append('image', files[0]);

        try {
            await pb.collection('messages').create(formData);
            txtEl.value = '';
            document.getElementById('file-in').value = '';
        } catch(e) {
            console.error(e);
            UI.toast("Error sending", "error");
        }
    },

    // === LISTEN TO A PUBLIC CHANNEL ===
    listenChannel: async (chid) => {
        State.chatMode = 'channel';
        State.currentChannelId = chid;
        State.dmTarget = null;
        
        const feed = document.getElementById('chat-feed');
        Chat.prepareFeed(feed);

        try {
            const resultList = await pb.collection('messages').getList(1, 50, {
                filter: `channel = "${chid}"`,
                sort: '-created',
                expand: 'author'
            });
            
            Chat.renderList(resultList.items, feed);

            State.activeSubscription = await pb.collection('messages').subscribe('*', function(e) {
                if (e.action === 'create' && e.record.channel === chid) {
                    Chat.addOne(e.record, feed);
                }
                if (e.action === 'delete') Chat.removeOne(e.record.id);
            });
        } catch(err) { console.error(err); }
    },

    // === LISTEN TO PRIVATE MESSAGES (DM) ===
    listenDM: async (targetUid) => {
        State.chatMode = 'dm';
        State.dmTarget = targetUid;
        State.currentChannelId = null;

        const feed = document.getElementById('chat-feed');
        Chat.prepareFeed(feed);

        // Get target user info for header
        try {
            const u = await pb.collection('users').getOne(targetUid);
            document.getElementById('chat-title').innerText = '@' + (u.username || u.name);
        } catch(e) { document.getElementById('chat-title').innerText = 'User'; }

        try {
            // Filter: Messages where (I am author AND they are target) OR (They are author AND I am target)
            const myId = State.user.uid;
            const filter = `(author = "${myId}" && target = "${targetUid}") || (author = "${targetUid}" && target = "${myId}")`;

            const resultList = await pb.collection('messages').getList(1, 50, {
                filter: filter,
                sort: '-created',
                expand: 'author'
            });

            Chat.renderList(resultList.items, feed);

            State.activeSubscription = await pb.collection('messages').subscribe('*', function(e) {
                const rec = e.record;
                // Check if message belongs to this conversation
                const isRelevant = (rec.author === myId && rec.target === targetUid) || 
                                   (rec.author === targetUid && rec.target === myId);
                
                if (e.action === 'create' && isRelevant) {
                    Chat.addOne(rec, feed);
                }
                if (e.action === 'delete') Chat.removeOne(rec.id);
            });
        } catch(err) { console.error(err); }
    },

    // --- Helpers ---
    prepareFeed: (feed) => {
        feed.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Loading...</div>';
        if(State.activeSubscription) { State.activeSubscription(); State.activeSubscription = null; }
    },

    renderList: (items, feed) => {
        feed.innerHTML = '';
        items.reverse().forEach(msg => Chat.renderMessage(msg, feed));
        feed.scrollTop = feed.scrollHeight;
    },

    addOne: async (rec, feed) => {
        const fullMsg = await pb.collection('messages').getOne(rec.id, {expand: 'author'});
        Chat.renderMessage(fullMsg, feed);
        feed.scrollTop = feed.scrollHeight;
    },

    removeOne: (id) => {
        const el = document.getElementById('msg-'+id);
        if(el) el.remove();
    },

    renderMessage: (msg, container) => {
        const isMine = msg.author === State.user.uid;
        const author = msg.expand ? msg.expand.author : { username: 'Unknown', name: 'Unknown', avatar: '' };
        
        const avatarUrl = author.avatar ? pb.files.getUrl(author, author.avatar) : 'https://via.placeholder.com/40';
        let imageUrl = msg.image ? pb.files.getUrl(msg, msg.image) : '';
        const displayName = author.name || author.username || "User";

        const div = document.createElement('div');
        div.className = `msg ${isMine?'mine':''}`;
        div.id = 'msg-'+msg.id;
        
        let del = '';
        if(isMine || State.profile.role === 'super' || State.profile.role === 'admin') {
            del = `<i class="fas fa-trash" style="margin-left:8px; cursor:pointer; opacity:0.5; font-size:0.7rem;" onclick="Chat.del('${msg.id}')"></i>`;
        }

        let prefixHtml = '';
        if (author.prefix) {
            prefixHtml = `<span style="color:${author.prefixColor || '#fff'}; margin-right:5px; font-weight:800; text-shadow:0 0 5px ${author.prefixColor};">[${author.prefix}]</span>`;
        }

        div.innerHTML = `
            <img src="${avatarUrl}" class="avatar" onclick="window.Profile.view('${msg.author}')">
            <div class="bubble">
                <div style="font-size:0.75rem; font-weight:700; color:${isMine?'#fff':'#bc13fe'}; margin-bottom:3px; display:flex; align-items:center;">
                    ${prefixHtml}${displayName} ${del}
                </div>
                ${msg.text ? `<div>${Chat.safe(msg.text)}</div>` : ''}
                ${imageUrl ? `<img src="${imageUrl}" class="msg-img" onclick="UI.alert('Image','View logic here')">` : ''}
            </div>
        `;
        container.appendChild(div);
    },

    safe: (str) => {
        if(!str) return '';
        const d = document.createElement('div');
        d.innerText = str;
        return d.innerHTML;
    },

    del: async (id) => {
        if(confirm("Delete message?")) {
            try { await pb.collection('messages').delete(id); } 
            catch(e) { UI.toast("Cannot delete", "error"); }
        }
    },
    
    // --- DM List Logic ---
    loadDMs: async () => {
        const list = document.getElementById('dm-list');
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Loading DMs...</div>';
        
        try {
            // PocketBase doesn't have "distinct" query easily.
            // We fetch all users except self to show a list of potential DMs (Simple approach)
            // OR we fetch messages where I am involved and extract users.
            
            // Approach: List all users for now (simplest for this architecture)
            // You can later optimize to "Recent Chats"
            const users = await pb.collection('users').getList(1, 50, {
                sort: '-lastSeen',
                filter: `id != "${State.user.uid}"`
            });

            list.innerHTML = '';
            users.items.forEach(u => {
                 const isOnline = u.status === 'online';
                 const avi = u.avatar ? pb.files.getUrl(u, u.avatar) : 'https://via.placeholder.com/50';
                 
                 const el = document.createElement('div');
                 el.className = 'channel-card'; // Reuse channel card style
                 el.innerHTML = `
                    <div class="ch-card-body" style="margin-top:0; padding:15px;">
                        <img src="${avi}" class="ch-card-avi">
                        <div class="ch-card-info">
                            <div class="ch-name">${u.name || u.username}</div>
                            <div class="ch-meta" style="color:${isOnline?'#00ff9d':'#777'}">
                                ${isOnline ? '● Online' : 'Offline'}
                            </div>
                        </div>
                        <i class="fas fa-comment-dots" style="color:#d600ff"></i>
                    </div>
                 `;
                 el.onclick = () => {
                     Chat.startDM(u.id);
                 };
                 list.appendChild(el);
            });
            
        } catch(e) { list.innerHTML = "Error loading users"; }
    },

    startDM: (uid) => {
        // Close modals if open
        document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('open'));
        Route('chat');
        Chat.listenDM(uid);
    }
};

document.addEventListener('DOMContentLoaded', () => { Chat.init(); });