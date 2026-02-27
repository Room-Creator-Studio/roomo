// =========================================
// ROOM - LOGIN & SIGNUP
// Migrated to Firebase for user management
// =========================================

import { db, auth } from './firebase/firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
    collection,
    doc,
    setDoc,
    getDoc,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const tagline = document.getElementById('tagline');
const toggleBtns = document.querySelectorAll('.toggle-btn');

function showForm(type) {
    if (type === 'login') {
        loginForm.classList.add('active');
        loginForm.classList.remove('hidden-left');
        signupForm.classList.remove('active');
        signupForm.classList.add('hidden-left');
        
        toggleBtns[0].classList.add('active');
        toggleBtns[1].classList.remove('active');
        tagline.innerText = "Welcome back";
    } else {
        signupForm.classList.add('active');
        signupForm.classList.remove('hidden-left');
        loginForm.classList.remove('active');
        loginForm.classList.add('hidden-left');

        toggleBtns[1].classList.add('active');
        toggleBtns[0].classList.remove('active');
        tagline.innerText = "Join the quiet space";
    }
}

function togglePasswordVisibility(id) {
    const input = document.getElementById(id);
    const btn = input.nextElementSibling;
    if (input.type === "password") {
        input.type = "text";
        btn.innerText = "HIDE";
    } else {
        input.type = "password";
        btn.innerText = "SHOW";
    }
}

// Initialize creator account in Firestore
async function initializeCreatorAccount() {
    try {
        const creatorEmail = 'harki.amrik@gmail.com';
        const creatorUsername = 'Creator-Of-Room';
        
        const userDoc = await getDoc(doc(db, 'users', creatorEmail));
        
        if (!userDoc.exists()) {
            // Store creator account in Firestore
            await setDoc(doc(db, 'users', creatorEmail), {
                name: creatorUsername,
                email: creatorEmail,
                isCreator: true,
                createdAt: new Date().toISOString(),
                settings: {
                    theme: 'dark',
                    reduceAnimations: false,
                    quietMode: false,
                    onlyImportantUpdates: true,
                    appearInvisible: false,
                    hideActivityStatus: false
                }
            });
            console.log('Creator account initialized in Firestore');
        }
    } catch (error) {
        console.error('Error initializing creator account:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeCreatorAccount);

// Login Form
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    
    try {
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Get user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', email));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Store in sessionStorage for current session (temporary, in-memory state)
            sessionStorage.setItem('currentSessionUser', userData.name);
            sessionStorage.setItem('currentSessionEmail', email);
            sessionStorage.setItem('currentSessionUid', user.uid);
            
            console.log('✓ Login successful');
            console.log('Session user:', userData.name);
            console.log('Session email:', email);
            
            alert('Login successful');
            window.location.href = "home.html";
        } else {
            throw new Error('User profile not found');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Invalid email or password');
    }
});

// Signup Form
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }
    
    if (!name) {
        alert("Please enter your name");
        return;
    }

    console.log('=== SIGNUP ATTEMPT ===');
    console.log('Name:', name);
    console.log('Email:', email);

    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Store user profile in Firestore
        await setDoc(doc(db, 'users', email), {
            name: name || 'You',
            email: email,
            isCreator: false,
            createdAt: new Date().toISOString(),
            settings: {
                theme: 'dark',
                reduceAnimations: false,
                quietMode: false,
                onlyImportantUpdates: true,
                appearInvisible: false,
                hideActivityStatus: false
            }
        });
        
        // Store in sessionStorage for current session
        sessionStorage.setItem('currentSessionUser', name || 'You');
        sessionStorage.setItem('currentSessionEmail', email);
        sessionStorage.setItem('currentSessionUid', user.uid);

        console.log('✓ Signup successful');
        
        alert('Account created successfully');
        window.location.href = "home.html";
    } catch (error) {
        console.error('Signup error:', error);
        
        // Handle specific Firebase errors
        if (error.code === 'auth/email-already-in-use') {
            alert('An account with this email already exists. Please login instead.');
            showForm('login');
        } else if (error.code === 'auth/weak-password') {
            alert('Password is too weak. Please use a stronger password.');
        } else {
            alert('Error creating account: ' + error.message);
        }
    }
});

// Input micro-interactions
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.classList.add('focused');
    });
    input.addEventListener('blur', () => {
        input.parentElement.classList.remove('focused');
    });
});
