        function joinRoom() {
            const btn = document.querySelector('.join-btn');
            btn.textContent = "Welcome home.";
            window.location.href = "loginnsignup.html";
            btn.style.backgroundColor = "#2d3748";
            
            // Subtle feedback
            console.log("Welcome to ROOM. We're glad you're here.");
            
            // Optional: Redirect or show modal logic would go here
        }

        // Add a gentle entrance effect for the text
        document.addEventListener('DOMContentLoaded', () => {
            console.log("ROOM landing page loaded.");
        });