// Storage helper with localStorage
const storage = {
    get: (k) => {
        try {
            const d = localStorage.getItem(k);
            return d ? JSON.parse(d) : null;
        } catch {
            return null;
        }
    },
    set: (k, v) => {
        try {
            localStorage.setItem(k, JSON.stringify(v));
        } catch (e) {
            console.error('Storage error:', e);
        }
    }
};

// Session check
const sessionUser = sessionStorage.getItem('currentSessionUser');
const sessionEmail = sessionStorage.getItem('currentSessionEmail');

if (!sessionUser || !sessionEmail) {
    window.location.href = 'loginnsignup.html';
    throw new Error('No session');
}

const currentUser = sessionUser;
const currentEmail = sessionEmail;
const accounts = storage.get('accounts') || {};
const userAccount = accounts[currentEmail] || {};
const isCreator = userAccount.isCreator || currentEmail === 'harki.amrik@gmail.com';

let rooms = storage.get('rooms') || [];
let settings = storage.get('settings') || {
    theme: 'dark',
    reduceAnimations: false,
    quietMode: false,
    onlyImportantUpdates: true,
    appearInvisible: false,
    hideActivityStatus: false
};
let feedPosts = storage.get('feedPosts') || [];
let currentRoomId = null;
let selectedMedia = [];
const MAX_IMAGES = 4;

function save() { 
    storage.set('rooms', rooms);
    storage.set('settings', settings);
    storage.set('feedPosts', feedPosts);
}

window.resetEverything = function() {
    if (!isCreator) {
        alert('Only the Creator account can reset everything.');
        return;
    }
    if (confirm('Are you sure you want to reset everything?')) {
        const creatorAccount = accounts['harki.amrik@gmail.com'];
        localStorage.clear();
        sessionStorage.clear();
        if (creatorAccount) storage.set('accounts', { 'harki.amrik@gmail.com': creatorAccount });
        alert('Everything has been reset.');
        window.location.href = 'loginnsignup.html';
    }
};

function init() {
    renderJoined();
    renderAvailable();
    loadSettings();
    checkCreatorAccess();
    
    document.getElementById('createRoomBtn').onclick = () => document.getElementById('createRoomPage').style.display = 'block';
    document.getElementById('profileBtn').onclick = openSettings;
    document.getElementById('feedBtn').onclick = openFeed;
    document.getElementById('createPostBtn').onclick = openCreatePost;
    document.getElementById('sendBtn').onclick = sendMessage;
    
    const messageInput = document.getElementById('messageInput');
    messageInput.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            sendMessage(); 
        }
    };
    
    document.getElementById('postContent').oninput = (e) => {
        document.getElementById('postCharCount').textContent = e.target.value.length;
    };
    
    document.getElementById('mediaInput').onchange = handleMediaSelect;
    document.getElementById('createPostModal').onclick = (e) => {
        if (e.target.id === 'createPostModal') closeCreatePost();
    };
    document.getElementById('settingsOverlay').onclick = (e) => {
        if (e.target.id === 'settingsOverlay') closeSettings();
    };
    document.getElementById('roomSettingsModal').onclick = (e) => {
        if (e.target.id === 'roomSettingsModal') closeRoomSettings();
    };
}

function checkCreatorAccess() {
    const resetSection = document.getElementById('resetSection');
    if (resetSection) resetSection.style.display = isCreator ? 'block' : 'none';
}

function renderJoined() {
    rooms = storage.get('rooms') || [];
    const joined = rooms.filter(r => r.members && r.members.includes(currentUser));
    const el = document.getElementById('joinedRoomsContainer');
    const empty = document.getElementById('emptyState');
    
    if (!joined.length) {
        empty.style.display = 'block';
        el.innerHTML = '';
        return;
    }
    
    empty.style.display = 'none';
    el.innerHTML = joined.map(r => {
        const roomTypeLabel = r.roomType === 'creator-only' ? 'Your voice' : 
                             r.roomType === 'no-text' ? 'Quiet space' : 'Open hearts';
        return `
        <div class="room-card joined" onclick="openRoom(${r.id})">
            <h3 class="room-name">${r.name}</h3>
            <p class="room-description">${r.description}</p>
            <div class="room-meta">
                <div class="member-count">
                    <i class="fas fa-user-friends"></i>
                    <span>${r.members.length} ${r.members.length === 1 ? 'soul' : 'souls'}</span>
                </div>
                <span class="room-type-badge">${roomTypeLabel}</span>
            </div>
        </div>
    `;
    }).join('');
}

function renderAvailable() {
    rooms = storage.get('rooms') || [];
    const available = rooms.filter(r => !r.members || !r.members.includes(currentUser));
    const container = document.getElementById('availableRoomsContainer');
    const empty = document.getElementById('availableEmptyState');

    if (!available.length) {
        container.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';
    container.innerHTML = available.map(r => {
        const roomTypeLabel = r.roomType === 'creator-only' ? 'Your voice' : 
                             r.roomType === 'no-text' ? 'Quiet space' : 'Open hearts';
        return `
        <div class="room-card">
            <h3 class="room-name">${r.name}</h3>
            <p class="room-description">${r.description}</p>
            <div class="room-meta">
                <div class="member-count">
                    <i class="fas fa-user-friends"></i>
                    <span>${r.members ? r.members.length : 0} ${r.members && r.members.length === 1 ? 'soul' : 'souls'}</span>
                </div>
                <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
                    <span class="room-type-badge">${roomTypeLabel}</span>
                    <button class="join-btn" onclick="joinRoom(event, ${r.id})">
                        <i class="fas fa-door-open"></i> Join Quietly
                    </button>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

function checkCanSendMessage(room) {
    if (room.roomType === 'no-text') return false;
    if (room.roomType === 'creator-only' && room.creator !== currentUser) return false;
    return true;
}

function cleanExpiredMessages(room) {
    if (!room.messages || !room.messageTimer || room.messageTimer === 'none') return;
    const now = Date.now();
    const timerMs = parseInt(room.messageTimer) * 60 * 1000;
    
    let changed = false;
    room.messages = room.messages.filter(msg => {
        if (!msg.timestamp) return true;
        if (now - msg.timestamp >= timerMs) {
            changed = true;
            return false;
        }
        return true;
    });
    
    if (changed) {
        rooms = storage.get('rooms') || [];
        const roomIndex = rooms.findIndex(r => r.id === room.id);
        if (roomIndex !== -1) {
            rooms[roomIndex] = room;
            save();
        }
    }
}

function startMessageTimer(messageElement, expiresAt) {
    const updateTimer = () => {
        const now = Date.now();
        const remaining = expiresAt - now;
        
        if (remaining <= 0) {
            messageElement.style.opacity = '0.3';
            const timerEl = messageElement.querySelector('.message-timer');
            if (timerEl) timerEl.textContent = 'Gone';
            return;
        }
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        const timerEl = messageElement.querySelector('.message-timer');
        if (timerEl) timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        setTimeout(updateTimer, 1000);
    };
    updateTimer();
}

function openRoom(id) {
    rooms = storage.get('rooms') || [];
    currentRoomId = id;
    const room = rooms.find(r => r.id === id);
    if (!room) return;
    
    document.getElementById('roomViewTitle').textContent = room.name;
    document.getElementById('roomCreator').textContent = `Created by ${room.creator}`;
    
    const roomSettingsBtn = document.getElementById('roomSettingsBtn');
    if (roomSettingsBtn) roomSettingsBtn.style.display = room.creator === currentUser ? 'flex' : 'none';
    
    const canSendMessages = checkCanSendMessage(room);
    const messageInputContainer = document.querySelector('.message-input-container');
    
    if (!canSendMessages) {
        messageInputContainer.style.opacity = '0.5';
        messageInputContainer.style.pointerEvents = 'none';
        if (room.roomType === 'creator-only') {
            document.getElementById('messageInput').placeholder = 'This room is just for listening right now.';
        } else if (room.roomType === 'no-text') {
            document.getElementById('messageInput').placeholder = 'A quiet space, just for being together...';
        }
    } else {
        messageInputContainer.style.opacity = '1';
        messageInputContainer.style.pointerEvents = 'auto';
        document.getElementById('messageInput').placeholder = 'Share your thoughts gently...';
    }
    
    document.getElementById('membersList').innerHTML = room.members.map(m => {
        const init = m.split(' ').map(n => n[0]).join('').toUpperCase();
        const isRoomCreator = m === room.creator;
        return `
            <div class="member-item">
                <div class="member-avatar">${init}</div>
                <div>
                    <div class="member-name">${m}${isRoomCreator ? '<span class="creator-badge">Creator</span>' : ''}</div>
                </div>
            </div>
        `;
    }).join('');
    
    cleanExpiredMessages(room);
    renderMessages(room);
    document.getElementById('roomViewPage').style.display = 'block';
}

function closeRoomView() {
    document.getElementById('roomViewPage').style.display = 'none';
    currentRoomId = null;
}

function renderMessages(room) {
    const el = document.getElementById('messagesContainer');
    
    if (!room.messages || room.messages.length === 0) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><h3>Nobody\'s said anything yet. Break the ice?</h3><p>Start whenever you feel like it</p></div>';
        return;
    }
    
    const hasTimer = room.messageTimer && room.messageTimer !== 'none';
    const timerMs = hasTimer ? parseInt(room.messageTimer) * 60 * 1000 : 0;
    const now = Date.now();
    
    const html = room.messages.map((m) => {
        const init = m.author.split(' ').map(n => n[0]).join('').toUpperCase();
        const isCurrentUser = m.author === currentUser;
        
        let timerDisplay = '';
        let messageClass = '';
        
        if (hasTimer && m.timestamp) {
            const expiresAt = m.timestamp + timerMs;
            const remaining = expiresAt - now;
            
            if (remaining > 0) {
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                timerDisplay = `<span class="message-timer"><i class="fas fa-clock"></i> ${minutes}:${seconds.toString().padStart(2, '0')}</span>`;
            } else {
                messageClass = 'expired-message';
                timerDisplay = '<span class="message-timer expired">Gone</span>';
            }
        }
        
        return `
            <div class="message-group ${isCurrentUser ? 'own-message' : ''} ${messageClass}" data-timestamp="${m.timestamp || 0}">
                <div class="message-header">
                    <div class="message-avatar">${init}</div>
                    <span class="message-author">${m.author}</span>
                    <span class="message-time">${m.time}</span>
                    ${timerDisplay}
                </div>
                <div class="message-content">${m.content}</div>
                ${m.media && m.media.length > 0 ? `
                    <div class="message-media">
                        ${m.media.map(media => {
                            if (media.type === 'video') {
                                return `<video controls src="${media.data}" class="message-video"></video>`;
                            } else {
                                return `<img src="${media.data}" alt="Shared image" class="message-image">`;
                            }
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    el.innerHTML = html;
    
    if (hasTimer) {
        const messageElements = el.querySelectorAll('.message-group');
        messageElements.forEach(msgEl => {
            const timestamp = parseInt(msgEl.dataset.timestamp);
            if (timestamp) {
                const expiresAt = timestamp + timerMs;
                if (expiresAt > now) startMessageTimer(msgEl, expiresAt);
            }
        });
    }
    
    requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
    });
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentRoomId) return;
    
    rooms = storage.get('rooms') || [];
    const roomIndex = rooms.findIndex(r => r.id === currentRoomId);
    if (roomIndex === -1) {
        alert('Error: Room not found. Please refresh.');
        return;
    }
    
    const room = rooms[roomIndex];
    if (!checkCanSendMessage(room)) {
        alert("This room is just for listening right now.");
        return;
    }
    
    if (!room.messages) room.messages = [];
    
    const message = { 
        author: currentUser, 
        content: text, 
        time: formatTime(new Date()),
        timestamp: Date.now(),
        media: []
    };
    
    room.messages.push(message);
    rooms[roomIndex] = room;
    save();
    
    input.value = '';
    
    const freshRooms = storage.get('rooms') || [];
    const freshRoom = freshRooms.find(r => r.id === currentRoomId);
    if (freshRoom) {
        const el = document.getElementById('messagesContainer');
        el.innerHTML = '';
        renderMessages(freshRoom);
    }
}

function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
}

function joinRoom(evt, id) {
    evt.stopPropagation();
    rooms = storage.get('rooms') || [];
    const roomIndex = rooms.findIndex(r => r.id === id);
    if (roomIndex === -1) return;
    
    const room = rooms[roomIndex];
    if (!room.members) room.members = [];
    
    if (!room.members.includes(currentUser)) {
        room.members.push(currentUser);
        rooms[roomIndex] = room;
        save();
        renderJoined();
        renderAvailable();
        showNotification(`You're in!`);
    }
}

function createNewRoom() {
    const name = document.getElementById('newRoomName').value.trim();
    const desc = document.getElementById('newRoomDescription').value.trim();
    const limit = parseInt(document.getElementById('newRoomLimit').value) || 8;
    const roomType = document.getElementById('newRoomType').value || 'open';
    const messageTimer = document.getElementById('newMessageTimer').value || 'none';
    
    if (!name || !desc) { 
        alert('Fill everything out first'); 
        return; 
    }
    
    rooms = storage.get('rooms') || [];
    
    const newRoom = {
        id: Date.now(),
        name, 
        description: desc,
        members: [currentUser],
        limit: Math.max(2, Math.min(12, limit)),
        creator: currentUser,
        messages: [],
        roomType: roomType,
        messageTimer: messageTimer
    };
    
    rooms.push(newRoom);
    save();
    closeCreateRoom();
    renderJoined();
    renderAvailable();
    showNotification(`Your room is ready`);
}

function closeCreateRoom() {
    document.getElementById('createRoomPage').style.display = 'none';
    document.getElementById('newRoomName').value = '';
    document.getElementById('newRoomDescription').value = '';
    document.getElementById('newRoomLimit').value = '8';
    document.getElementById('newRoomType').value = 'open';
    document.getElementById('newMessageTimer').value = 'none';
}

function openRoomSettings() {
    if (!currentRoomId) return;
    rooms = storage.get('rooms') || [];
    const room = rooms.find(r => r.id === currentRoomId);
    
    if (!room || room.creator !== currentUser) {
        alert('Only you can change your room.');
        return;
    }
    
    document.getElementById('settingsRoomType').value = room.roomType || 'open';
    document.getElementById('settingsMessageTimer').value = room.messageTimer || 'none';
    document.getElementById('roomSettingsModal').style.display = 'flex';
}

function closeRoomSettings() {
    document.getElementById('roomSettingsModal').style.display = 'none';
}

window.saveRoomSettings = function() {
    if (!currentRoomId) return;
    rooms = storage.get('rooms') || [];
    const roomIndex = rooms.findIndex(r => r.id === currentRoomId);
    if (roomIndex === -1) return;
    
    const room = rooms[roomIndex];
    if (room.creator !== currentUser) {
        alert('Only the person who made this room can change it.');
        return;
    }
    
    room.roomType = document.getElementById('settingsRoomType').value;
    room.messageTimer = document.getElementById('settingsMessageTimer').value;
    rooms[roomIndex] = room;
    save();
    
    closeRoomSettings();
    showNotification('All set');
    openRoom(currentRoomId);
};

function showNotification(msg) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:100px;left:50%;transform:translateX(-50%);background:#1C1C1C;color:#E6E6E6;padding:1rem 2rem;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.3);z-index:3000;border-left:4px solid #7FAF96;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
        if (el.parentNode) document.body.removeChild(el);
    }, 3000);
}

function loadSettings() {
    const settingsOverlay = document.getElementById('settingsOverlay');
    const themeRadios = settingsOverlay.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => radio.checked = false);
    
    if (settings.theme === 'light') {
        const lightRadio = Array.from(themeRadios).find(r => r.nextSibling && r.nextSibling.textContent.includes('Light'));
        if (lightRadio) lightRadio.checked = true;
    } else {
        const darkRadio = Array.from(themeRadios).find(r => r.nextSibling && r.nextSibling.textContent.includes('Dark'));
        if (darkRadio) darkRadio.checked = true;
    }
    
    const checkboxes = settingsOverlay.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        const label = cb.closest('label')?.textContent.trim() || '';
        if (label.includes('Reduce animations')) cb.checked = settings.reduceAnimations || false;
        else if (label.includes('Quiet mode')) cb.checked = settings.quietMode || false;
        else if (label.includes('Only important')) cb.checked = settings.onlyImportantUpdates !== false;
        else if (label.includes('invisible')) cb.checked = settings.appearInvisible || false;
        else if (label.includes('activity')) cb.checked = settings.hideActivityStatus || false;
    });
}

window.saveSettings = function() {
    const settingsOverlay = document.getElementById('settingsOverlay');
    const themeRadio = settingsOverlay.querySelector('input[name="theme"]:checked');
    
    if (themeRadio) {
        const label = themeRadio.closest('label')?.textContent.trim() || '';
        if (label.includes('Light')) settings.theme = 'light';
        else if (label.includes('Dark')) settings.theme = 'dark';
        else settings.theme = 'system';
    }
    
    const checkboxes = settingsOverlay.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        const label = cb.closest('label')?.textContent.trim() || '';
        if (label.includes('Reduce animations')) settings.reduceAnimations = cb.checked;
        else if (label.includes('Quiet mode')) settings.quietMode = cb.checked;
        else if (label.includes('Only important')) settings.onlyImportantUpdates = cb.checked;
        else if (label.includes('invisible')) settings.appearInvisible = cb.checked;
        else if (label.includes('activity')) settings.hideActivityStatus = cb.checked;
    });
    
    storage.set('settings', settings);
    closeSettings();
    showNotification('Got it');
};

function openSettings() {
    loadSettings();
    document.getElementById('settingsOverlay').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settingsOverlay').style.display = 'none';
}

window.logout = function() {
    if (confirm('Are you sure you want to log out?')) {
        sessionStorage.removeItem('currentSessionUser');
        sessionStorage.removeItem('currentSessionEmail');
        window.location.href = 'loginnsignup.html';
    }
};

function openFeed() {
    renderFeed();
    document.getElementById('feedPage').style.display = 'block';
}

function closeFeed() {
    document.getElementById('feedPage').style.display = 'none';
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString();
}

function renderFeed() {
    rooms = storage.get('rooms') || [];
    feedPosts = storage.get('feedPosts') || [];
    
    const userMessages = [];
    rooms.forEach(room => {
        if (room.members && room.members.includes(currentUser)) {
            if (room.messages && Array.isArray(room.messages)) {
                room.messages.forEach(msg => {
                    if (msg.author === currentUser) {
                        userMessages.push({
                            roomName: room.name,
                            content: msg.content,
                            timestamp: msg.timestamp || Date.now(),
                            roomId: room.id,
                            media: msg.media || []
                        });
                    }
                });
            }
        }
    });
    
    const allPosts = [...feedPosts, ...userMessages]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 50);

    if (!allPosts.length) {
        document.getElementById('feedContent').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-feather-alt"></i>
                <h3>No thoughts shared yet</h3>
                <p>Your quiet moments will appear here</p>
            </div>
        `;
        return;
    }

    document.getElementById('feedContent').innerHTML = allPosts.map(post => {
        let mediaClass = '';
        if (post.media && post.media.length > 0) {
            if (post.media.length === 1) mediaClass = 'single';
            else if (post.media.length === 2) mediaClass = 'double';
            else if (post.media.length === 3) mediaClass = 'triple';
            else mediaClass = 'quad';
        }

        return `
            <div class="post-card">
                <span class="post-room-tag">from ${post.roomName}</span>
                <div class="post-content">${post.content}</div>
                ${post.media && post.media.length > 0 ? `
                    <div class="post-media ${mediaClass}">
                        ${post.media.map(media => {
                            if (media.type === 'video') {
                                return `<video controls src="${media.data}" class="post-video"></video>`;
                            } else {
                                return `<img src="${media.data}" alt="Posted image" class="post-image">`;
                            }
                        }).join('')}
                    </div>
                ` : ''}
                <div class="post-meta">
                    <span>${formatTimeAgo(post.timestamp)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function openCreatePost() {
    const modal = document.getElementById('createPostModal');
    modal.style.display = 'flex';
    
    rooms = storage.get('rooms') || [];
    
    const roomSelect = document.getElementById('postRoomSelect');
    const joinedRooms = rooms.filter(r => r.members && r.members.includes(currentUser));
    
    roomSelect.innerHTML = '<option value="">Personal thought</option>';
    joinedRooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        roomSelect.appendChild(option);
    });
    
    document.getElementById('postContent').value = '';
    document.getElementById('postCharCount').textContent = '0';
    selectedMedia = [];
    updateMediaPreview();
}

function closeCreatePost() {
    document.getElementById('createPostModal').style.display = 'none';
    selectedMedia = [];
    updateMediaPreview();
}

function handleMediaSelect(event) {
    const files = Array.from(event.target.files);
    const hasVideo = files.some(f => f.type.startsWith('video/'));
    const existingVideo = selectedMedia.some(m => m.type === 'video');
    
    if (hasVideo && (existingVideo || selectedMedia.length > 0)) {
        alert('Pick one video OR up to 4 photos (not both)');
        return;
    }
    
    if (existingVideo && files.length > 0) {
        alert('Just one video');
        return;
    }
    
    files.forEach(file => {
        if (file.type.startsWith('video/')) {
            if (selectedMedia.length === 0) processMediaFile(file);
        } else if (file.type.startsWith('image/')) {
            const currentImages = selectedMedia.filter(m => m.type === 'image').length;
            if (currentImages < MAX_IMAGES && selectedMedia.length < MAX_IMAGES) {
                processMediaFile(file);
            } else {
                alert('Only 4 photos');
            }
        }
    });
    
    event.target.value = '';
}

function processMediaFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        selectedMedia.push({
            type: file.type.startsWith('video/') ? 'video' : 'image',
            data: e.target.result,
            name: file.name
        });
        updateMediaPreview();
    };
    reader.readAsDataURL(file);
}

function updateMediaPreview() {
    const preview = document.getElementById('mediaPreview');
    
    if (!selectedMedia.length) {
        preview.innerHTML = '';
        preview.style.display = 'none';
        return;
    }
    
    preview.style.display = 'grid';
    preview.innerHTML = selectedMedia.map((media, index) => `
        <div class="media-preview-item">
            ${media.type === 'video' 
                ? `<video src="${media.data}" class="preview-video"></video>`
                : `<img src="${media.data}" alt="Preview" class="preview-image">`
            }
            <button class="remove-media-btn" onclick="removeMedia(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

window.removeMedia = function(index) {
    selectedMedia.splice(index, 1);
    updateMediaPreview();
};

window.createPost = function() {
    const content = document.getElementById('postContent').value.trim();
    const roomId = document.getElementById('postRoomSelect').value;
    
    if (!content && !selectedMedia.length) {
        alert('Say something or add a photo first');
        return;
    }
    
    rooms = storage.get('rooms') || [];
    feedPosts = storage.get('feedPosts') || [];
        
    if (roomId) {
        const roomIndex = rooms.findIndex(r => r.id == roomId);
        if (roomIndex !== -1) {
            if (!rooms[roomIndex].messages) rooms[roomIndex].messages = [];
            rooms[roomIndex].messages.push({
                author: currentUser,
                content: content,
                time: formatTime(new Date()),
                timestamp: Date.now(),
                media: [...selectedMedia]
            });
        }
    } else {
        feedPosts.unshift({
            roomName: 'Personal',
            content: content,
            timestamp: Date.now(),
            media: [...selectedMedia]
        });
    }
        
    save();
    closeCreatePost();
    showNotification('Shared');
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
