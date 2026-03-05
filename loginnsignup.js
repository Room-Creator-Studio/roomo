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

console.log('✓ loginnsignup.js loaded');

// Use DOMContentLoaded instead of manual promise
function initializeForm() {
    console.log('✓ DOM ready - initializing form');
    
    const usernameForm = document.getElementById('usernameForm');
    const usernameInput = document.getElementById('username');
    
    console.log('Form element found:', !!usernameForm);
    console.log('Input element found:', !!usernameInput);

    if (!usernameForm || !usernameInput) {
        console.error('❌ CRITICAL: Form elements not found!');
        console.error('HTML should have: <form id="usernameForm"> and <input id="username">');
        return false;
    }

    console.log('✓ Form elements located successfully');

    // Generate a unique device ID (stored locally)
    function getDeviceId() {
        let deviceId = localStorage.getItem('roomDeviceId');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('roomDeviceId', deviceId);
            console.log('✓ Generated new device ID:', deviceId);
        } else {
            console.log('✓ Using existing device ID:', deviceId);
        }
        return deviceId;
    }

    // Initialize creator account data in Firestore
    async function initializeCreatorAccount() {
        try {
            const creatorUsername = 'Creator-Of-Room';
            
            await setDoc(doc(db, 'users', 'creator'), {
                name: creatorUsername,
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
            console.warn('⚠️ Could not initialize creator account:', error.message);
        }
    }

    // Initialize on page load
    initializeCreatorAccount();
    
    // Focus on username input
    if (usernameInput) {
        usernameInput.focus();
    }

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
            
            console.log('✓ Session data stored:');
            console.log('  - currentSessionUser:', username);
            console.log('  - currentSessionDeviceId:', deviceId);
            console.log('  - currentSessionId:', sessionId);
            
            // Store user entry in Firestore for multi-device sync
            await setDoc(doc(db, 'sessions', sessionId), {
                username: username,
                deviceId: deviceId,
                createdAt: serverTimestamp(),
                lastActivity: serverTimestamp(),
                isActive: true
            });

            console.log('✓ Room entered successfully');
            console.log('Redirecting to home.html...');
            
            // Redirect to home
            window.location.href = "home.html";
        } catch (error) {
            console.error('Error entering room:', error);
            alert('Error accessing room: ' + error.message);
        }
    });

    // Input micro-interactions
    usernameInput.addEventListener('focus', () => {
        if (usernameInput.parentElement) {
            usernameInput.parentElement.classList.add('focused');
        }
    });

    usernameInput.addEventListener('blur', () => {
        if (usernameInput.parentElement) {
            usernameInput.parentElement.classList.remove('focused');
        }
    });

    console.log('✓ loginnsignup.js initialized successfully');
    return true;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    console.log('Document still loading, waiting...');
    document.addEventListener('DOMContentLoaded', initializeForm);
} else {
    console.log('Document already loaded, initializing immediately');
    initializeForm();
}
