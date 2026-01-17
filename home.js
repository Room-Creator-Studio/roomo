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
            console.log(`Saved ${k}`);
        } catch (e) {
            console.error('Storage error:', e);
        }
    },
    remove: (k) => {
        try {
            localStorage.removeItem(k);
        } catch {}
    },
    clear: () => {
        try {
            localStorage.clear();
        } catch {}
    }
};

// Media handling
let selectedMedia = [];
const MAX_IMAGES = 4;
const MAX_VIDEO = 1;

// CRITICAL: Get current user from sessionStorage (per-tab session)
const sessionUser = sessionStorage.getItem('currentSessionUser');
const sessionEmail = sessionStorage.getItem('currentSessionEmail');

console.log('=== SESSION CHECK ===');
console.log('Session user:', sessionUser);
console.log('Session email:', sessionEmail);

// If no session, redirect to login
if (!sessionUser || !sessionEmail) {
    console.log('No active session, redirecting to login');
    window.location.href = 'loginnsignup.html';
    throw new Error('No session');
}

const currentUser = sessionUser;
const currentEmail = sessionEmail;

console.log('=== ACTIVE USER ===');
console.log('Current user:', currentUser);
console.log('Current email:', currentEmail);

// Get account info
const accounts = storage.get('accounts') || {};
const userAccount = accounts[currentEmail] || {};
const isCreator = userAccount.isCreator || currentEmail === 'harki.amrik@gmail.com';

console.log('Is creator:', isCreator);

// Load global rooms
let rooms = storage.get('rooms') || [];

// Load settings
let settings = storage.get('settings') || {
    theme: 'dark',
    reduceAnimations: false,
    quietMode: false,
    onlyImportantUpdates: true,
    appearInvisible: false,
    hideActivityStatus: false
};

// Load feed posts
let feedPosts = storage.get('feedPosts') || [];

let currentRoomId = null;

console.log('Loaded rooms:', rooms.length);
console.log('My rooms:', rooms.filter(r => r.members && r.members.includes(currentUser)).length);

function save() { 
    console.log('=== SAVING DATA ===');
    storage.set('rooms', rooms);
    storage.set('settings', settings);
    storage.set('feedPosts', feedPosts);
    
    // Verify save
    const afterSave = storage.get('rooms');
    console.log('Verified rooms saved:', afterSave ? afterSave.length : 0);
}

window.resetEverything = function() {
    if (!isCreator) {
        alert('Only the Creator account can reset everything.');
        return;
    }
    
    if (confirm('Are you sure you want to reset everything?')) {
        const creatorAccount = accounts['harki.amrik@gmail.com'];
        storage.clear();
        sessionStorage.clear();
        if (creatorAccount) {
            storage.set('accounts', { 'harki.amrik@gmail.com': creatorAccount });
        }
        alert('Everything has been reset.');
        window.location.href = 'loginnsignup.html';
    }
};

function init() {
    console.log('=== INITIALIZING APP ===');
    
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
    
    const saveSettingsBtn = document.querySelector('#settingsOverlay .btn-primary');
    if (saveSettingsBtn) {
        saveSettingsBtn.onclick = saveSettings;
    }
    
    console.log('App initialized');
}

function checkCreatorAccess() {
    const resetSection = document.getElementById('resetSection');
    if (resetSection) {
        resetSection.style.display = isCreator ? 'block' : 'none';
    }
}

function renderJoined() {
    rooms = storage.get('rooms') || [];
    
    const joined = rooms.filter(r => r.members && r.members.includes(currentUser));
    const el = document.getElementById('joinedRoomsContainer');
    const empty = document.getElementById('emptyState');
    
    console.log('Rendering joined rooms:', joined.length);
    
    if (!joined.length) {
        empty.style.display = 'block';
        el.innerHTML = '';
        return;
    }
    
    empty.style.display = 'none';
    el.innerHTML = joined.map(r => `
        <div class="room-card joined" onclick="openRoom(${r.id})">
            <h3 class="room-name">${r.name}</h3>
            <p class="room-description">${r.description}</p>
            <div class="room-meta">
                <div class="member-count">
                    <i class="fas fa-user-friends"></i>
                    <span>${r.members.length} ${r.members.length === 1 ? 'friend' : 'friends'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderAvailable() {
    rooms = storage.get('rooms') || [];
    
    const available = rooms.filter(r => !r.members || !r.members.includes(currentUser));
    const container = document.getElementById('availableRoomsContainer');
    const empty = document.getElementById('availableEmptyState');

    console.log('Rendering available rooms:', available.length);

    if (!available.length) {
        container.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';

    container.innerHTML = available.map(r => `
        <div class="room-card">
            <h3 class="room-name">${r.name}</h3>
            <p class="room-description">${r.description}</p>
            <div class="room-meta">
                <div class="member-count">
                    <i class="fas fa-user-friends"></i>
                    <span>${r.members ? r.members.length : 0} ${r.members && r.members.length === 1 ? 'soul' : 'souls'}</span>
                </div>
                <button class="join-btn" onclick="joinRoom(event, ${r.id})">
                    <i class="fas fa-door-open"></i>
                    Join Quietly
                </button>
            </div>
        </div>
    `).join('');
}

function openRoom(id) {
    rooms = storage.get('rooms') || [];
    
    currentRoomId = id;
    const room = rooms.find(r => r.id === id);
    if (!room) {
        console.error('Room not found:', id);
        return;
    }
    
    console.log('=== OPENING ROOM ===');
    console.log('Room:', room.name);
    console.log('Messages:', room.messages ? room.messages.length : 0);
    
    document.getElementById('roomViewTitle').textContent = room.name;
    document.getElementById('roomCreator').textContent = `Created by ${room.creator}`;
    
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
    
    renderMessages(room);
    document.getElementById('roomViewPage').style.display = 'block';
}

function closeRoomView() {
    document.getElementById('roomViewPage').style.display = 'none';
    currentRoomId = null;
}

function renderMessages(room) {
    const el = document.getElementById('messagesContainer');
    
    console.log('=== RENDERING MESSAGES ===');
    console.log('Room:', room.name);
    console.log('Room ID:', room.id);
    console.log('Messages array:', room.messages);
    console.log('Messages count:', room.messages ? room.messages.length : 0);
    console.log('Current user:', currentUser);
    
    if (!room.messages || room.messages.length === 0) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><h3>No messages yet</h3><p>Start the conversation with a gentle thought</p></div>';
        return;
    }
    
    // Build the HTML
    const html = room.messages.map((m, idx) => {
        const init = m.author.split(' ').map(n => n[0]).join('').toUpperCase();
        const isCurrentUser = m.author === currentUser;
        
        console.log(`Msg ${idx}: ${m.author} - "${m.content.substring(0, 20)}..." - isMine: ${isCurrentUser}`);
        
        return `
            <div class="message-group ${isCurrentUser ? 'own-message' : ''}">
                <div class="message-header">
                    <div class="message-avatar">${init}</div>
                    <span class="message-author">${m.author}</span>
                    <span class="message-time">${m.time}</span>
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
    
    console.log('Generated HTML length:', html.length);
    
    // Set the HTML
    el.innerHTML = html;
    
    console.log('DOM updated');
    
    // Scroll to bottom
    requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        console.log('Scrolled to bottom');
    });
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    console.log('=== SEND MESSAGE ===');
    console.log('Text:', text);
    console.log('Room ID:', currentRoomId);
    console.log('Author:', currentUser);
    
    if (!text || !currentRoomId) {
        console.log('ABORT: No text or room');
        return;
    }
    
    // Get FRESH data
    console.log('Loading fresh rooms...');
    rooms = storage.get('rooms') || [];
    console.log('Loaded rooms:', rooms.length);
    
    const roomIndex = rooms.findIndex(r => r.id === currentRoomId);
    console.log('Room index:', roomIndex);
    
    if (roomIndex === -1) {
        console.error('Room not found!');
        alert('Error: Room not found. Please refresh.');
        return;
    }
    
    const room = rooms[roomIndex];
    console.log('Found room:', room.name);
    
    if (!room.messages) {
        room.messages = [];
        console.log('Initialized messages array');
    }
    
    console.log('Current messages:', room.messages.length);
    
    const message = { 
        author: currentUser, 
        content: text, 
        time: formatTime(new Date()),
        timestamp: Date.now(),
        media: []
    };
    
    console.log('Created message:', message);
    
    room.messages.push(message);
    console.log('Added message. New count:', room.messages.length);
    
    rooms[roomIndex] = room;
    
    console.log('Saving...');
    save();
    
    // VERIFY
    const verification = storage.get('rooms');
    const verifiedRoom = verification.find(r => r.id === currentRoomId);
    console.log('VERIFIED messages count:', verifiedRoom ? verifiedRoom.messages.length : 'NOT FOUND');
    
    if (!verifiedRoom || verifiedRoom.messages.length !== room.messages.length) {
        console.error('SAVE FAILED!');
        alert('Error: Message not saved. Try again.');
        return;
    }
    
    console.log('✓ Save verified');
    
    input.value = '';
    
    // Force a complete re-render with fresh data
    console.log('Re-rendering messages...');
    
    // Get completely fresh data from localStorage
    const freshRooms = storage.get('rooms') || [];
    const freshRoom = freshRooms.find(r => r.id === currentRoomId);
    
    if (!freshRoom) {
        console.error('Could not find fresh room data!');
        return;
    }
    
    console.log('Fresh room has', freshRoom.messages.length, 'messages');
    
    // Clear the container first
    const el = document.getElementById('messagesContainer');
    el.innerHTML = '';
    
    // Then render fresh messages
    renderMessages(freshRoom);
    
    console.log('=== SEND COMPLETE ===');
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
    
    if (!room.members) {
        room.members = [];
    }
    
    if (!room.members.includes(currentUser)) {
        room.members.push(currentUser);
        rooms[roomIndex] = room;
        save();
        renderJoined();
        renderAvailable();
        showNotification(`You've quietly joined "${room.name}"`);
    }
}

function createNewRoom() {
    const name = document.getElementById('newRoomName').value.trim();
    const desc = document.getElementById('newRoomDescription').value.trim();
    const limit = parseInt(document.getElementById('newRoomLimit').value) || 8;
    
    if (!name || !desc) { 
        alert('Please fill all fields'); 
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
        messages: []
    };
    
    console.log('Creating room:', newRoom);
    
    rooms.push(newRoom);
    save();
    closeCreateRoom();
    renderJoined();
    renderAvailable();
    
    showNotification(`"${name}" has been created`);
}

function closeCreateRoom() {
    document.getElementById('createRoomPage').style.display = 'none';
    document.getElementById('newRoomName').value = '';
    document.getElementById('newRoomDescription').value = '';
    document.getElementById('newRoomLimit').value = '8';
}

function showNotification(msg) {
    const el = document.createElement('div');
    el.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #1C1C1C;
        color: #E6E6E6;
        padding: 1rem 2rem;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        z-index: 3000;
        border-left: 4px solid #7FAF96;
    `;
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
    showNotification('Settings saved');
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
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
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
        alert('You can only upload one video, or multiple images (not both)');
        return;
    }
    
    if (existingVideo && files.length > 0) {
        alert('You can only upload one video at a time');
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
                alert(`Max ${MAX_IMAGES} images`);
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
        alert('Please share a thought or add media');
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
    showNotification('Thought shared quietly');
};

document.addEventListener('DOMContentLoaded', init);