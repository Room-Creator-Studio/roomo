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

// Storage helper
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
        } catch {}
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

// Pre-register Creator account
function initializeCreatorAccount() {
    const creatorEmail = 'harki.amrik@gmail.com';
    const creatorUsername = 'Creator-Of-Room';
    const creatorPassword = 'ijokpluh0908';
    
    let accounts = storage.get('accounts') || {};
    
    if (!accounts[creatorEmail]) {
        accounts[creatorEmail] = {
            name: creatorUsername,
            email: creatorEmail,
            password: creatorPassword,
            isCreator: true,
            createdAt: new Date().toISOString()
        };
        storage.set('accounts', accounts);
        console.log('Creator account initialized');
    }
}

// Initialize on page load
initializeCreatorAccount();

// Login Form
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    
    const accounts = storage.get('accounts') || {};
    const account = accounts[email];
    
    if (account && account.password === password) {
        // CRITICAL: Use sessionStorage for current session (per-tab)
        sessionStorage.setItem('currentSessionUser', account.name);
        sessionStorage.setItem('currentSessionEmail', email);
        
        console.log('✓ Login successful');
        console.log('Session user:', account.name);
        console.log('Session email:', account.email);
        
        alert('Login successful');
        window.location.href = "home.html";
    } else {
        console.log('✗ Invalid credentials');
        alert('Invalid email or password');
    }
});

// Signup Form
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    console.log('=== SIGNUP ATTEMPT ===');
    console.log('Name:', name);
    console.log('Email:', email);

    let accounts = storage.get('accounts') || {};
    
    if (accounts[email]) {
        alert('An account with this email already exists. Please login instead.');
        showForm('login');
        return;
    }

    // Create new account
    accounts[email] = {
        name: name || 'You',
        email: email,
        password: password,
        isCreator: false,
        createdAt: new Date().toISOString()
    };
    storage.set('accounts', accounts);

    // CRITICAL: Use sessionStorage for current session
    sessionStorage.setItem('currentSessionUser', name || 'You');
    sessionStorage.setItem('currentSessionEmail', email);

    console.log('✓ Signup successful');
    sessionStorage.setItem('currentSessionUser', name || 'You');
    sessionStorage.setItem('currentSessionEmail', email);
    
    alert('Account created successfully');
    window.location.href = "homev1.html";
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