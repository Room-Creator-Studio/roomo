// =========================================
// ROOM APP - SECURITY MONITOR SYSTEM (FIXED)
// =========================================

const SecurityMonitor = (function() {
    'use strict';

    const CONFIG = {
        CHECK_INTERVAL: 10000, // Increased to 10 seconds (less aggressive)
        INTEGRITY_KEY: 'app_integrity_hash',
        LAST_CHECK_KEY: 'last_security_check',
        VIOLATION_THRESHOLD: 5, // Increased from 3 to 5
        VIOLATION_COUNT_KEY: 'security_violations',
        GRACE_PERIOD: 30000, // 30 second grace period after page load
        WIPE_COOLDOWN_KEY: 'last_wipe_timestamp'
    };

    const CRITICAL_KEYS = ['accounts', 'rooms', 'settings'];
    let isMonitoring = false;
    let checkInterval = null;
    let pageLoadTime = Date.now();
    let legitimateChangeInProgress = false;

    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    function calculateIntegrityHash() {
        const data = {};
        CRITICAL_KEYS.forEach(key => {
            data[key] = localStorage.getItem(key) || '';
        });
        return simpleHash(JSON.stringify(data));
    }

    function isInGracePeriod() {
        const now = Date.now();
        const timeSinceLoad = now - pageLoadTime;
        return timeSinceLoad < CONFIG.GRACE_PERIOD;
    }

    function isInWipeCooldown() {
        const lastWipe = localStorage.getItem(CONFIG.WIPE_COOLDOWN_KEY);
        if (!lastWipe) return false;
        
        const now = Date.now();
        const timeSinceWipe = now - parseInt(lastWipe);
        return timeSinceWipe < 60000; // 1 minute cooldown
    }

    function emergencyWipe(reason) {
        // Prevent rapid consecutive wipes
        if (isInWipeCooldown()) {
            console.log('⏸️ Wipe cooldown active, skipping...');
            return;
        }

        console.error(`🚨 SECURITY BREACH: ${reason}`);
        console.error('🔥 Initiating emergency wipe...');

        try {
            const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
            const creatorAccount = accounts['harki.amrik@gmail.com'];

            // Store wipe timestamp BEFORE clearing
            const wipeTime = Date.now();

            localStorage.clear();
            sessionStorage.clear();

            // Restore Creator account
            if (creatorAccount) {
                localStorage.setItem('accounts', JSON.stringify({
                    'harki.amrik@gmail.com': creatorAccount
                }));
            }

            // Record wipe with cooldown
            localStorage.setItem(CONFIG.WIPE_COOLDOWN_KEY, wipeTime.toString());

            // Log breach
            const breachLog = {
                timestamp: new Date().toISOString(),
                reason: reason,
                userAgent: navigator.userAgent
            };
            localStorage.setItem('last_breach', JSON.stringify(breachLog));

            // Reset violation count
            localStorage.setItem(CONFIG.VIOLATION_COUNT_KEY, '0');

            console.error('✅ Emergency wipe completed');
            
            // Stop monitoring to prevent immediate re-triggering
            stopMonitoring();
            
            alert('Security breach detected. Data wiped for protection.');
            window.location.href = 'loginnsignup.html';
            
        } catch (error) {
            console.error('Error during wipe:', error);
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'loginnsignup.html';
        }
    }

    function recordViolation(type) {
        // Don't record violations during grace period
        if (isInGracePeriod()) {
            console.log(`🕐 Grace period: Ignoring "${type}"`);
            return 0;
        }

        // Don't record if we just wiped
        if (isInWipeCooldown()) {
            console.log(`⏸️ Cooldown active: Ignoring "${type}"`);
            return 0;
        }

        let count = parseInt(localStorage.getItem(CONFIG.VIOLATION_COUNT_KEY) || '0');
        count++;
        localStorage.setItem(CONFIG.VIOLATION_COUNT_KEY, count.toString());
        
        console.warn(`⚠️ Security violation #${count}: ${type}`);
        
        if (count >= CONFIG.VIOLATION_THRESHOLD) {
            emergencyWipe(`Multiple violations (${count})`);
        }
        
        return count;
    }

    function checkDataIntegrity() {
        const storedHash = localStorage.getItem(CONFIG.INTEGRITY_KEY);
        
        if (!storedHash) {
            const currentHash = calculateIntegrityHash();
            localStorage.setItem(CONFIG.INTEGRITY_KEY, currentHash);
            return false;
        }

        const currentHash = calculateIntegrityHash();
        
        // Only flag as violation if hashes are different AND not in grace period
        if (storedHash !== currentHash) {
            if (!isInGracePeriod() && !legitimateChangeInProgress) {
                recordViolation('Data integrity violation');
                return true;
            } else {
                // Update hash silently during grace period
                localStorage.setItem(CONFIG.INTEGRITY_KEY, currentHash);
            }
        }
        
        return false;
    }

    function checkStorageManipulation() {
        // Don't check during grace period
        if (isInGracePeriod()) return false;

        try {
            // Only check if localStorage has content
            if (localStorage.length === 0) return false;

            const missingKeys = CRITICAL_KEYS.filter(key => {
                const value = localStorage.getItem(key);
                return value === null || value === undefined;
            });

            // Allow some keys to be missing initially
            if (missingKeys.length > 2) {
                recordViolation(`Critical data missing: ${missingKeys.join(', ')}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking storage:', error);
            return false;
        }
    }

    let storageChangeCount = 0;
    let storageChangeTimer = null;

    function checkRapidChanges() {
        // Don't count during grace period
        if (isInGracePeriod()) return false;

        storageChangeCount++;

        if (storageChangeTimer) clearTimeout(storageChangeTimer);

        storageChangeTimer = setTimeout(() => {
            if (storageChangeCount > 100) { // Increased threshold from 50 to 100
                recordViolation(`Rapid changes detected (${storageChangeCount})`);
            }
            storageChangeCount = 0;
        }, 5000);

        return storageChangeCount > 100;
    }

    function runSecurityChecks() {
        try {
            // Don't run checks during grace period
            if (isInGracePeriod()) {
                console.log('🕐 Grace period active, skipping checks');
                return;
            }

            // Don't run checks during cooldown
            if (isInWipeCooldown()) {
                console.log('⏸️ Cooldown active, skipping checks');
                return;
            }

            const lastCheck = localStorage.getItem(CONFIG.LAST_CHECK_KEY);
            const now = Date.now();
            
            if (lastCheck && now - parseInt(lastCheck) < 8000) return;

            checkDataIntegrity();
            checkStorageManipulation();
            localStorage.setItem(CONFIG.LAST_CHECK_KEY, now.toString());
            
        } catch (error) {
            console.error('Error during security check:', error);
        }
    }

    function startMonitoring() {
        if (isMonitoring) {
            console.log('Security monitoring already active');
            return;
        }

        console.log('🔒 Security monitoring activated (Grace period: 30s)');
        isMonitoring = true;
        pageLoadTime = Date.now(); // Reset grace period

        // Wait for grace period before setting initial hash
        setTimeout(() => {
            const initialHash = calculateIntegrityHash();
            localStorage.setItem(CONFIG.INTEGRITY_KEY, initialHash);
        }, CONFIG.GRACE_PERIOD);

        checkInterval = setInterval(runSecurityChecks, CONFIG.CHECK_INTERVAL);

        // Monitor storage events with grace period awareness
        window.addEventListener('storage', function(e) {
            if (e.storageArea === localStorage && !isInGracePeriod()) {
                checkRapidChanges();
                
                // Update integrity hash after legitimate change
                setTimeout(() => {
                    legitimateChangeInProgress = true;
                    const newHash = calculateIntegrityHash();
                    localStorage.setItem(CONFIG.INTEGRITY_KEY, newHash);
                    legitimateChangeInProgress = false;
                }, 200);
            }
        });

        // Start checks after grace period
        setTimeout(() => {
            runSecurityChecks();
        }, CONFIG.GRACE_PERIOD);
    }

    function stopMonitoring() {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        isMonitoring = false;
        console.log('🔓 Security monitoring deactivated');
    }

    function getStatus() {
        return {
            monitoring: isMonitoring,
            violations: parseInt(localStorage.getItem(CONFIG.VIOLATION_COUNT_KEY) || '0'),
            threshold: CONFIG.VIOLATION_THRESHOLD,
            lastCheck: localStorage.getItem(CONFIG.LAST_CHECK_KEY),
            integrityHash: localStorage.getItem(CONFIG.INTEGRITY_KEY),
            lastBreach: localStorage.getItem('last_breach'),
            inGracePeriod: isInGracePeriod(),
            inCooldown: isInWipeCooldown(),
            timeSinceLoad: Date.now() - pageLoadTime
        };
    }

    // Manual wipe with confirmation
    function manualWipe(reason) {
        if (confirm('Are you sure you want to manually trigger a security wipe? This will delete all data.')) {
            emergencyWipe(reason || 'Manual trigger');
        }
    }

    // Reset violations (for testing)
    function resetViolations() {
        localStorage.setItem(CONFIG.VIOLATION_COUNT_KEY, '0');
        localStorage.removeItem(CONFIG.WIPE_COOLDOWN_KEY);
        console.log('✅ Violations reset');
    }

    return {
        start: startMonitoring,
        stop: stopMonitoring,
        check: runSecurityChecks,
        wipe: manualWipe,
        status: getStatus,
        recordViolation: recordViolation,
        reset: resetViolations
    };

})();

if (typeof window !== 'undefined') {
    // Longer delay before starting to allow page to fully load
    setTimeout(() => SecurityMonitor.start(), 2000);
    window.SecurityMonitor = SecurityMonitor;
}
