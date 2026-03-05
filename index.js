document.addEventListener('DOMContentLoaded', () => {
    console.log("ROOM landing page loaded.");

    // If already in a session, skip straight to home
    if (sessionStorage.getItem('currentSessionUser')) {
        window.location.href = "home.html";
        return;
    }
});

function joinRoom() {
    const btn = document.querySelector('.join-btn');
    btn.textContent = "Welcome home.";
    btn.style.backgroundColor = "#2d3748";
    console.log("Welcome to ROOM. We're glad you're here.");
    window.location.href = "loginnsignup.html";
}
