// =========================================
// ROOM - USERNAME ENTRY
// Simple username entry with Firestore sync for multi-device
// =========================================

import { db } from './firebase/firebase.js';
import {
    collection,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const usernameForm = document.getElementById('usernameForm');
const usernameInput = document.getElementById('username');

// Generate a unique device ID (stored locally)
function getDeviceId() {
    let deviceId = localStorage.getItem('roomDeviceId');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('roomDeviceId', deviceId);
    }
    return deviceId;
}

// Initialize creator account data in Firestore
async function initializeCreatorAccount() {
    try {
        const creatorEmail = 'harki.amrik@gmail.com';
        const creatorUsername = 'Creator-Of-Room';
        
        await setDoc(doc(db, 'users', creatorEmail), {
            name: creatorUsername,
            email: creatorEmail,
            isCreator: true,
            createdAt: serverTimestamp(),
            settings: {
                theme: 'dark',
                reduceAnimations: false,
                quietMode: false,
                onlyImportantUpdates: true,
                appearInvisible: false,
                hideActivityStatus: false
            }
        }, { merge: true });
        console.log('✓ Creator account initialized in Firestore');
    } catch (error) {
        console.warn('Could not initialize creator account:', error.message);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeCreatorAccount();
    // Focus on username input
    usernameInput.focus();
});

// Username Form Submit
usernameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert("Please enter your name");
        return;
    }

    console.log('=== ENTERING ROOM ===');
    console.log('Username:', username);

    try {
        const deviceId = getDeviceId();
        const sessionId = 'session_' + Date.now();
        
        // Store in sessionStorage for current session
        sessionStorage.setItem('currentSessionUser', username);
        sessionStorage.setItem('currentSessionDeviceId', deviceId);
        sessionStorage.setItem('currentSessionId', sessionId);
        
        // Store user entry in Firestore for multi-device sync
        await setDoc(doc(db, 'sessions', sessionId), {
            username: username,
            deviceId: deviceId,
            createdAt: serverTimestamp(),
            lastActivity: serverTimestamp(),
            isActive: true
        });

        console.log('✓ Room entered successfully');
        console.log('Username:', username);
        console.log('Device ID:', deviceId);
        console.log('Session ID:', sessionId);
        
        // Redirect to home
        window.location.href = "home.html";
    } catch (error) {
        console.error('Error entering room:', error);
        alert('Error accessing room: ' + error.message);
    }
});

// Input micro-interactions
usernameInput.addEventListener('focus', () => {
    usernameInput.parentElement.classList.add('focused');
});

usernameInput.addEventListener('blur', () => {
    usernameInput.parentElement.classList.remove('focused');
});
