        // ==========================
        // ELEMENTS
        // ==========================
        const profileBtn = document.getElementById('profileBtn');
        const createRoomBtn = document.getElementById('createRoomBtn');
        const browseRoomsBtn = document.getElementById('browseRoomsBtn');

        const settingsOverlay = document.getElementById('settingsOverlay');
        const createRoomPage = document.getElementById('createRoomPage');

        const suggestionPills = document.querySelectorAll('.pill');

        // ==========================
        // OVERLAY SYSTEM
        // ==========================
        function closeAllOverlays() {
            settingsOverlay.style.display = 'none';
            createRoomPage.style.display = 'none';
            document.body.style.overflow = '';
        }

        function openOverlay(overlay) {
            closeAllOverlays();
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        // ==========================
        // SETTINGS
        // ==========================
        function loadSettings() {
            // Load theme
            const themeRadios = settingsOverlay.querySelectorAll('input[name="theme"]');
            themeRadios.forEach(radio => {
                if (radio.value === settings.theme) {
                    radio.checked = true;
                }
            });
            
            // Load checkboxes based on settings
            const checkboxes = settingsOverlay.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach((cb, index) => {
                const label = cb.closest('label')?.textContent.trim() || '';
                if (label.includes('Reduce animations')) {
                    cb.checked = settings.reduceAnimations;
                } else if (label.includes('Quiet mode')) {
                    cb.checked = settings.quietMode;
                } else if (label.includes('Only important updates')) {
                    cb.checked = settings.onlyImportantUpdates;
                } else if (label.includes('Pause all notifications')) {
                    cb.checked = settings.pauseAllNotifications || false;
                } else if (label.includes('Hide member counts')) {
                    cb.checked = settings.hideMemberCounts || false;
                } else if (label.includes('Disable read receipts')) {
                    cb.checked = settings.disableReadReceipts || false;
                } else if (label.includes('Keep things minimal')) {
                    cb.checked = settings.keepMinimal !== false;
                } else if (label.includes('Appear invisible')) {
                    cb.checked = settings.appearInvisible;
                } else if (label.includes('Hide activity status')) {
                    cb.checked = settings.hideActivityStatus;
                }
            });
        }

        window.saveSettings = function() {
            // Get theme
            const themeRadio = settingsOverlay.querySelector('input[name="theme"]:checked');
            if (themeRadio) {
                settings.theme = themeRadio.value || 'dark';
            }
            
            // Get all checkboxes
            const checkboxes = settingsOverlay.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                const label = cb.closest('label')?.textContent.trim() || '';
                if (label.includes('Reduce animations')) {
                    settings.reduceAnimations = cb.checked;
                } else if (label.includes('Quiet mode')) {
                    settings.quietMode = cb.checked;
                } else if (label.includes('Only important updates')) {
                    settings.onlyImportantUpdates = cb.checked;
                } else if (label.includes('Pause all notifications')) {
                    settings.pauseAllNotifications = cb.checked;
                } else if (label.includes('Hide member counts')) {
                    settings.hideMemberCounts = cb.checked;
                } else if (label.includes('Disable read receipts')) {
                    settings.disableReadReceipts = cb.checked;
                } else if (label.includes('Keep things minimal')) {
                    settings.keepMinimal = cb.checked;
                } else if (label.includes('Appear invisible')) {
                    settings.appearInvisible = cb.checked;
                } else if (label.includes('Hide activity status')) {
                    settings.hideActivityStatus = cb.checked;
                }
            });
            
            storage.set('settings', settings);
            closeSettings();
            alert('Settings saved quietly');
        };

        profileBtn.addEventListener('click', () => {
            loadSettings();
            openOverlay(settingsOverlay);
        });

        function closeSettings() {
            closeAllOverlays();
        }

        settingsOverlay.addEventListener('click', e => {
            if (e.target === settingsOverlay) closeSettings();
        });

        // Settings save button
        const saveSettingsBtn = settingsOverlay.querySelector('.btn-primary');
        if (saveSettingsBtn && !saveSettingsBtn.onclick) {
            saveSettingsBtn.onclick = saveSettings;
        }

        function logout() {
            if (confirm('Are you sure you want to log out?')) {
                window.location.href = 'loginnsignup.html';
            }
        }

        // ==========================
        // STORAGE SYSTEM
        // ==========================
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
                } catch {
                    // fail silently
                }
            },
            remove: (k) => {
                try {
                    localStorage.removeItem(k);
                } catch {
                    // fail silently
                }
            },
            clear: () => {
                try {
                    localStorage.clear();
                } catch {
                    // fail silently
                }
            }
        };

        // Reset everything function - only available for Creator account
        window.resetEverything = function() {
            const userProfile = storage.get('userProfile') || {};
            const accounts = storage.get('accounts') || {};
            const currentEmail = userProfile.email;
            const account = accounts[currentEmail];
            
            // Check if user is the Creator account
            const isCreator = account && (account.isCreator || currentEmail === 'harki.amrik@gmail.com');
            
            if (!isCreator) {
                alert('Only the Creator account can reset everything.');
                return;
            }
            
            if (confirm('Are you sure you want to reset everything? This will delete all rooms, messages, settings, and profile data (except the Creator account).')) {
                // Save Creator account before clearing
                const creatorAccount = accounts['harki.amrik@gmail.com'];
                
                // Clear all localStorage
                storage.clear();
                
                // Restore Creator account
                if (creatorAccount) {
                    storage.set('accounts', { 'harki.amrik@gmail.com': creatorAccount });
                }
                
                // Reset in-memory variables
                rooms = [];
                settings = {
                    theme: 'dark',
                    reduceAnimations: false,
                    quietMode: false,
                    onlyImportantUpdates: true,
                    appearInvisible: false,
                    hideActivityStatus: false
                };
                
                // Reload the page to start fresh
                alert('Everything has been reset. The page will reload.');
                window.location.reload();
            }
        };

        // Load rooms from localStorage
        let rooms = storage.get('rooms');
        if (!Array.isArray(rooms)) {
            rooms = [];
        }

        // Load user profile and settings
        const userProfile = storage.get('userProfile') || {};
        const currentUser = storage.get('currentUser') || userProfile.name || "You";
        
        // Load settings with defaults
        let settings = storage.get('settings') || {
            theme: 'dark',
            reduceAnimations: false,
            quietMode: false,
            onlyImportantUpdates: true,
            appearInvisible: false,
            hideActivityStatus: false
        };

        function saveRooms() {
            storage.set('rooms', rooms);
            storage.set('settings', settings);
        }

        // ==========================
        // CREATE ROOM
        // ==========================
        createRoomBtn.addEventListener('click', () => {
            openOverlay(createRoomPage);
            setTimeout(() => {
                document.getElementById('newRoomName').focus();
            }, 100);
        });

        function closeCreateRoom() {
            closeAllOverlays();

            document.getElementById('newRoomName').value = '';
            document.getElementById('newRoomDescription').value = '';
            document.getElementById('newRoomLimit').value = '8';
            document.getElementById('nameCount').textContent = '0';
            document.getElementById('descCount').textContent = '0';
        }

        createRoomPage.addEventListener('click', e => {
            if (e.target === createRoomPage) closeCreateRoom();
        });

        function createNewRoom() {
            const name = document.getElementById('newRoomName').value.trim();
            const description = document.getElementById('newRoomDescription').value.trim();
            const limit = parseInt(document.getElementById('newRoomLimit').value) || 8;

            if (!name) {
                alert('Every gentle space needs a name');
                return;
            }
            if (!description) {
                alert('What makes this space special?');
                return;
            }

            // Create new room object
            const newRoom = {
                id: Date.now(),
                name: name,
                description: description,
                members: [currentUser],
                limit: Math.max(2, Math.min(12, limit)),
                joined: true, // User automatically joins room they create
                creator: currentUser,
                messages: []
            };

            // Add to rooms array and save to localStorage
            rooms.push(newRoom);
            saveRooms();

            closeCreateRoom();
            alert(`"${name}" has been created as your new safe space`);
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 500);
        }

        // ==========================
        // CHARACTER COUNTERS
        // ==========================
        document.getElementById('newRoomName').addEventListener('input', e => {
            document.getElementById('nameCount').textContent = e.target.value.length;
        });

        document.getElementById('newRoomDescription').addEventListener('input', e => {
            document.getElementById('descCount').textContent = e.target.value.length;
        });

        // ==========================
        // BROWSE ROOMS
        // ==========================
        browseRoomsBtn.addEventListener('click', () => {
            window.location.href = 'home.html';
        });

        // ==========================
        // SUGGESTIONS
        // ==========================
        suggestionPills.forEach(pill => {
            pill.addEventListener('click', () => {
                const roomName = pill.textContent;
                alert(`Exploring "${roomName}" - A gentle space for quiet connection.`);
            });
        });

        function checkCreatorAccess() {
            const userProfile = storage.get('userProfile') || {};
            const accounts = storage.get('accounts') || {};
            const currentEmail = userProfile.email;
            const account = accounts[currentEmail];
            const isCreator = account && (account.isCreator || currentEmail === 'harki.amrik@gmail.com');
            
            // Show reset section only for Creator
            const resetSection = document.getElementById('resetSection');
            if (resetSection) {
                resetSection.style.display = isCreator ? 'block' : 'none';
            }
        }

        // ==========================
        // INIT
        // ==========================
        document.addEventListener('DOMContentLoaded', () => {
            closeAllOverlays();
            checkCreatorAccess();
        });