// =========================================
// ROOM APP - SECURITY MONITOR SYSTEM
// =========================================

const SecurityMonitor = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        CHECK_INTERVAL: 5000, // Check every 5 seconds
        INTEGRITY_KEY: 'app_integrity_hash',
        LAST_CHECK_KEY: 'last_security_check',
        VIOLATION_THRESHOLD: 3, // Wipe after 3 violations
        VIOLATION_COUNT_KEY: 'security_violations'
    };

    const CRITICAL_KEYS = ['accounts', 'rooms', 'settings'];
    let isMonitoring = false;
    let checkInterval = null;

    // Simple hash function
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    // Calculate integrity hash
    function calculateIntegrityHash() {
        const data = {};
        CRITICAL_KEYS.forEach(key => {
            data[key] = localStorage.getItem(key) || '';
        });
        return simpleHash(JSON.stringify(data));
    }

    // Emergency wipe function
    function emergencyWipe(reason) {
        console.error(`🚨 SECURITY BREACH: ${reason}`);
        console.error('🔥 Initiating emergency wipe...');

        try {
            // Save Creator account
            const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
            const creatorAccount = accounts['harki.amrik@gmail.com'];

            // Clear everything
            localStorage.clear();
            sessionStorage.clear();

            // Restore Creator
            if (creatorAccount) {
                localStorage.setItem('accounts', JSON.stringify({
                    'harki.amrik@gmail.com': creatorAccount
                }));
            }

            // Log breach
            const breachLog = {
                timestamp: new Date().toISOString(),
                reason: reason,
                userAgent: navigator.userAgent
            };
            localStorage.setItem('last_breach', JSON.stringify(breachLog));

            console.error('✅ Emergency wipe completed');
            alert('Security breach detected. Data wiped for protection.');
            window.location.href = 'loginnsignup.html';
            
        } catch (error) {
            console.error('Error during wipe:', error);
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'loginnsignup.html';
        }
    }

    // Record security violation
    function recordViolation(type) {
        let count = parseInt(localStorage.getItem(CONFIG.VIOLATION_COUNT_KEY) || '0');
        count++;
        localStorage.setItem(CONFIG.VIOLATION_COUNT_KEY, count.toString());
        
        console.warn(`⚠️ Security violation #${count}: ${type}`);
        
        if (count >= CONFIG.VIOLATION_THRESHOLD) {
            emergencyWipe(`Multiple violations (${count})`);
        }
        
        return count;
    }

    // Check data integrity
    function checkDataIntegrity() {
        const storedHash = localStorage.getItem(CONFIG.INTEGRITY_KEY);
        
        if (!storedHash) {
            const currentHash = calculateIntegrityHash();
            localStorage.setItem(CONFIG.INTEGRITY_KEY, currentHash);
            return false;
        }

        const currentHash = calculateIntegrityHash();
        
        if (storedHash !== currentHash) {
            recordViolation('Data integrity violation - unauthorized modification');
            return true;
        }
        
        return false;
    }

    // Check for missing critical data
    function checkStorageManipulation() {
        try {
            const missingKeys = CRITICAL_KEYS.filter(key => 
                !localStorage.hasOwnProperty(key) && localStorage.getItem(key) === null
            );

            if (missingKeys.length > 0 && localStorage.length > 0) {
                recordViolation(`Critical data missing: ${missingKeys.join(', ')}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking storage:', error);
            return false;
        }
    }

    // Monitor rapid changes (potential attack)
    let storageChangeCount = 0;
    let storageChangeTimer = null;

    function checkRapidChanges() {
        storageChangeCount++;

        if (storageChangeTimer) clearTimeout(storageChangeTimer);

        storageChangeTimer = setTimeout(() => {
            if (storageChangeCount > 50) {
                recordViolation(`Rapid changes detected (${storageChangeCount})`);
            }
            storageChangeCount = 0;
        }, 5000);

        return storageChangeCount > 50;
    }

    // Run all security checks
    function runSecurityChecks() {
        try {
            const lastCheck = localStorage.getItem(CONFIG.LAST_CHECK_KEY);
            const now = Date.now();
            
            if (lastCheck && now - parseInt(lastCheck) < 3000) return;

            checkDataIntegrity();
            checkStorageManipulation();
            localStorage.setItem(CONFIG.LAST_CHECK_KEY, now.toString());
            
        } catch (error) {
            console.error('Error during security check:', error);
        }
    }

    // Start monitoring
    function startMonitoring() {
        if (isMonitoring) return;

        console.log('🔒 Security monitoring activated');
        isMonitoring = true;

        const initialHash = calculateIntegrityHash();
        localStorage.setItem(CONFIG.INTEGRITY_KEY, initialHash);

        checkInterval = setInterval(runSecurityChecks, CONFIG.CHECK_INTERVAL);

        window.addEventListener('storage', function(e) {
            if (e.storageArea === localStorage) {
                checkRapidChanges();
                setTimeout(() => {
                    const newHash = calculateIntegrityHash();
                    localStorage.setItem(CONFIG.INTEGRITY_KEY, newHash);
                }, 100);
            }
        });

        runSecurityChecks();
    }

    // Stop monitoring
    function stopMonitoring() {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        isMonitoring = false;
    }

    // Get status
    function getStatus() {
        return {
            monitoring: isMonitoring,
            violations: parseInt(localStorage.getItem(CONFIG.VIOLATION_COUNT_KEY) || '0'),
            threshold: CONFIG.VIOLATION_THRESHOLD,
            lastCheck: localStorage.getItem(CONFIG.LAST_CHECK_KEY),
            integrityHash: localStorage.getItem(CONFIG.INTEGRITY_KEY),
            lastBreach: localStorage.getItem('last_breach')
        };
    }

    return {
        start: startMonitoring,
        stop: stopMonitoring,
        check: runSecurityChecks,
        wipe: emergencyWipe,
        status: getStatus,
        recordViolation: recordViolation
    };

})();

// Auto-start monitoring
if (typeof window !== 'undefined') {
    setTimeout(() => SecurityMonitor.start(), 1000);
    window.SecurityMonitor = SecurityMonitor;
}