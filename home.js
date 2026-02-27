// =========================================
// ROOM - HOME PAGE
// Migrated to Firebase for data persistence
// =========================================

import { db, auth } from './firebase/firebase.js';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    query,
    where,
    onSnapshot,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Session data (temporary, in-memory only)
const sessionUser = sessionStorage.getItem('currentSessionUser');
const sessionEmail = sessionStorage.getItem('currentSessionEmail');
const sessionUid = sessionStorage.getItem('currentSessionUid');

if (!sessionUser || !sessionEmail) {
    window.location.href = 'loginnsignup.html';
    throw new Error('No session');
}

const currentUser = sessionUser;
const currentEmail = sessionEmail;
const currentUid = sessionUid;

// Determine if user is creator
const isCreator = currentEmail === 'harki.amrik@gmail.com';

// App state
let rooms = [];
let settings = {
    theme: 'dark',
    reduceAnimations: false,
    quietMode: false,
    onlyImportantUpdates: true,
    appearInvisible: false,
    hideActivityStatus: false
};
let feedPosts = [];
let currentRoomId = null;
let selectedMedia = [];
const MAX_IMAGES = 4;

// Real-time listeners
let roomsUnsubscribe = null;
let currentRoomUnsubscribe = null;

// Load user settings from Firestore
async function loadUserSettings() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentEmail));
        if (userDoc.exists() && userDoc.data().settings) {
            settings = { ...settings, ...userDoc.data().settings };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings to Firestore
async function saveSettingsToFirestore() {
    try {
        await updateDoc(doc(db, 'users', currentEmail), {
            settings: settings
        });
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Load rooms from Firestore with real-time updates
function setupRoomsListener() {
    try {
        const q = query(collection(db, 'rooms'));
        
        roomsUnsubscribe = onSnapshot(q, (snapshot) => {
            rooms = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            renderJoined();
            renderAvailable();
        });
    } catch (error) {
        console.error('Error setting up rooms listener:', error);
    }
}

// Load feed posts from Firestore
async function loadFeedPosts() {
    try {
        const snapshot = await getDocs(collection(db, 'feedPosts'));
        feedPosts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading feed posts:', error);
    }
}

// Create a new room in Firestore
async function createNewRoom() {
    const name = document.getElementById('newRoomName').value.trim();
    const desc = document.getElementById('newRoomDescription').value.trim();
    const limit = parseInt(document.getElementById('newRoomLimit').value) || 8;
    const roomType = document.getElementById('newRoomType').value || 'open';
    const messageTimer = document.getElementById('newMessageTimer').value || 'none';
    
    if (!name || !desc) { 
        alert('Fill everything out first'); 
        return; 
    }
    
    try {
        const newRoom = {
            name: name,
            description: desc,
            members: [currentUser],
            limit: Math.max(2, Math.min(12, limit)),
            creator: currentUser,
            roomType: roomType,
            messageTimer: messageTimer,
            createdAt: new Date().toISOString(),
            createdBy: currentUser
        };
        
        const docRef = await addDoc(collection(db, 'rooms'), newRoom);
        
        closeCreateRoom();
        showNotification(`Your room is ready`);
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Failed to create room');
    }
}

function closeCreateRoom() {
    document.getElementById('createRoomPage').style.display = 'none';
    document.getElementById('newRoomName').value = '';
    document.getElementById('newRoomDescription').value = '';
    document.getElementById('newRoomLimit').value = '8';
    document.getElementById('newRoomType').value = 'open';
    document.getElementById('newMessageTimer').value = 'none';
}

// Join a room
async function joinRoom(evt, id) {
    evt.stopPropagation();
    
    try {
        const roomRef = doc(db, 'rooms', id);
        const roomDoc = await getDoc(roomRef);
        
        if (!roomDoc.exists()) return;
        
        const room = roomDoc.data();
        if (!room.members || !room.members.includes(currentUser)) {
            await updateDoc(roomRef, {
                members: arrayUnion(currentUser)
            });
            showNotification(`You're in!`);
        }
    } catch (error) {
        console.error('Error joining room:', error);
    }
}

// Leave a room
async function leaveRoom(roomId) {
    try {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, {
            members: arrayRemove(currentUser)
        });
    } catch (error) {
        console.error('Error leaving room:', error);
    }
}

// Send a message to current room
async function sendMessage() {
    if (!currentRoomId) return;
    
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content && selectedMedia.length === 0) return;
    
    try {
        const roomRef = doc(db, 'rooms', currentRoomId);
        const roomDoc = await getDoc(roomRef);
        
        if (!roomDoc.exists()) return;
        
        const room = roomDoc.data();
        
        // Check permissions
        if (!checkCanSendMessage(room)) {
            alert('You cannot send messages in this room');
            return;
        }
        
        const message = {
            author: currentUser,
            content: content,
            timestamp: new Date().toISOString(),
            media: [...selectedMedia]
        };
        
        // Add message to subcollection
        await addDoc(collection(db, 'rooms', currentRoomId, 'messages'), message);
        
        messageInput.value = '';
        selectedMedia = [];
        updateMediaPreview();
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
    }
}

function checkCanSendMessage(room) {
    if (room.roomType === 'no-text') return false;
    if (room.roomType === 'creator-only' && room.creator !== currentUser) return false;
    return true;
}

// Render rooms user has joined
function renderJoined() {
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
        <div class="room-card joined" onclick="openRoom('${r.id}')">
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

// Render available rooms to join
function renderAvailable() {
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
                    <button class="join-btn" onclick="joinRoom(event, '${r.id}')">
                        <i class="fas fa-door-open"></i> Join Quietly
                    </button>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// Open a room and load messages
async function openRoom(id) {
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
    
    // Display members
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
    
    // Load and render messages
    await loadAndRenderMessages(id);
    
    document.getElementById('roomViewPage').style.display = 'block';
}

// Load messages from Firestore
async function loadAndRenderMessages(roomId) {
    try {
        const snapshot = await getDocs(collection(db, 'rooms', roomId, 'messages'));
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Sort by timestamp
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        renderMessages(messages);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Render messages in current room
function renderMessages(messages) {
    const el = document.getElementById('messagesContainer');
    
    if (!messages || messages.length === 0) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><h3>Nobody\'s said anything yet. Break the ice?</h3><p>Start whenever you feel like it</p></div>';
        return;
    }
    
    const html = messages.map((m) => {
        const init = m.author.split(' ').map(n => n[0]).join('').toUpperCase();
        const isCurrentUser = m.author === currentUser;
        
        const date = new Date(m.timestamp);
        const time = formatTime(date);
        
        return `
            <div class="message-group ${isCurrentUser ? 'own-message' : ''}">
                <div class="message-header">
                    <div class="message-avatar">${init}</div>
                    <span class="message-author">${m.author}</span>
                    <span class="message-time">${time}</span>
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
}

function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
}

function closeRoomView() {
    document.getElementById('roomViewPage').style.display = 'none';
    currentRoomId = null;
}

// Room settings
function openRoomSettings() {
    if (!currentRoomId) return;
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

window.saveRoomSettings = async function() {
    if (!currentRoomId) return;
    
    try {
        const roomRef = doc(db, 'rooms', currentRoomId);
        await updateDoc(roomRef, {
            roomType: document.getElementById('settingsRoomType').value,
            messageTimer: document.getElementById('settingsMessageTimer').value
        });
        
        closeRoomSettings();
        showNotification('All set');
        
        // Reload room
        const room = rooms.find(r => r.id === currentRoomId);
        if (room) await openRoom(currentRoomId);
    } catch (error) {
        console.error('Error saving room settings:', error);
        alert('Failed to save settings');
    }
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

// Settings management
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

window.saveSettings = async function() {
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
    
    await saveSettingsToFirestore();
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
        sessionStorage.removeItem('currentSessionUid');
        window.location.href = 'loginnsignup.html';
    }
};

// Feed functionality
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString();
}

async function renderFeed() {
    try {
        // Load feed posts
        await loadFeedPosts();
        
        // Collect user messages from all joined rooms
        const userMessages = [];
        for (const room of rooms) {
            if (room.members && room.members.includes(currentUser)) {
                try {
                    const snapshot = await getDocs(collection(db, 'rooms', room.id, 'messages'));
                    snapshot.docs.forEach(doc => {
                        const msg = doc.data();
                        if (msg.author === currentUser) {
                            userMessages.push({
                                roomName: room.name,
                                content: msg.content,
                                timestamp: msg.timestamp,
                                roomId: room.id,
                                media: msg.media || []
                            });
                        }
                    });
                } catch (error) {
                    console.error('Error loading room messages:', error);
                }
            }
        }
        
        const allPosts = [...feedPosts, ...userMessages]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
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
    } catch (error) {
        console.error('Error rendering feed:', error);
    }
}

function openFeed() {
    renderFeed();
    document.getElementById('feedPage').style.display = 'block';
}

function closeFeed() {
    document.getElementById('feedPage').style.display = 'none';
}

function openCreatePost() {
    const modal = document.getElementById('createPostModal');
    modal.style.display = 'flex';
    
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

window.createPost = async function() {
    const content = document.getElementById('postContent').value.trim();
    const roomId = document.getElementById('postRoomSelect').value;
    
    if (!content && !selectedMedia.length) {
        alert('Say something or add a photo first');
        return;
    }
    
    try {
        if (roomId) {
            // Add to room messages
            await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                author: currentUser,
                content: content,
                timestamp: new Date().toISOString(),
                media: [...selectedMedia]
            });
        } else {
            // Add to feed posts
            await addDoc(collection(db, 'feedPosts'), {
                roomName: 'Personal',
                content: content,
                timestamp: new Date().toISOString(),
                media: [...selectedMedia]
            });
        }
        
        closeCreatePost();
        showNotification('Shared');
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Failed to share post');
    }
};

function checkCreatorAccess() {
    const resetSection = document.getElementById('resetSection');
    if (resetSection) resetSection.style.display = isCreator ? 'block' : 'none';
}

// Initialize the app
async function init() {
    try {
        // Load user settings
        await loadUserSettings();
        
        // Setup real-time listeners
        setupRoomsListener();
        
        // Render initial state
        renderJoined();
        renderAvailable();
        loadSettings();
        checkCreatorAccess();
        
        // Setup event listeners
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
        
        console.log('✓ ROOM app initialized with Firebase');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Make functions globally available
window.openRoom = openRoom;
window.closeRoomView = closeRoomView;
window.joinRoom = joinRoom;
window.leaveRoom = leaveRoom;
window.openRoomSettings = openRoomSettings;
window.closeRoomSettings = closeRoomSettings;
window.sendMessage = sendMessage;
window.openFeed = openFeed;
window.closeFeed = closeFeed;
window.openCreatePost = openCreatePost;
window.closeCreatePost = closeCreatePost;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.createNewRoom = createNewRoom;
window.closeCreateRoom = closeCreateRoom;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (roomsUnsubscribe) roomsUnsubscribe();
    if (currentRoomUnsubscribe) currentRoomUnsubscribe();
});
