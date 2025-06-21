// URL Shortener Application
class URLShortener {
    constructor() {
        this.baseUrl = window.location.origin;
        this.recentUrls = this.loadRecentUrls();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTheme();
        this.renderRecentUrls();
    }

    setupEventListeners() {
        // Form submission
        const urlForm = document.getElementById('urlForm');
        urlForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.addEventListener('click', () => this.toggleTheme());

        // Copy button
        const copyBtn = document.getElementById('copyBtn');
        copyBtn.addEventListener('click', () => this.copyToClipboard());

        // QR code button
        const qrBtn = document.getElementById('qrBtn');
        qrBtn.addEventListener('click', () => this.showQRCode());

        // Modal close
        const closeQrModal = document.getElementById('closeQrModal');
        closeQrModal.addEventListener('click', () => this.closeQRModal());

        // Modal backdrop click
        const qrModal = document.getElementById('qrModal');
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) {
                this.closeQRModal();
            }
        });

        // URL validation on input
        const longUrlInput = document.getElementById('longUrl');
        longUrlInput.addEventListener('input', () => this.validateURL());

        // Custom code validation
        const customCodeInput = document.getElementById('customCode');
        customCodeInput.addEventListener('input', () => this.validateCustomCode());
    }

    // Form handling
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const longUrl = document.getElementById('longUrl').value.trim();
        const customCode = document.getElementById('customCode').value.trim();
        
        if (!this.validateURL()) {
            return;
        }

        if (customCode && !this.validateCustomCode()) {
            return;
        }

        this.showLoading(true);
        
        try {
            const shortUrl = await this.shortenURL(longUrl, customCode);
            this.displayResult(shortUrl, longUrl);
            this.addToRecentUrls(shortUrl, longUrl);
            this.showToast('Success!', 'URL shortened successfully', 'success');
        } catch (error) {
            console.error('Error shortening URL:', error);
            this.showToast('Error', error.message || 'Failed to shorten URL', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // URL validation
    validateURL() {
        const urlInput = document.getElementById('longUrl');
        const urlError = document.getElementById('urlError');
        const url = urlInput.value.trim();
        
        if (!url) {
            urlError.textContent = '';
            return true;
        }

        try {
            new URL(url);
            urlError.textContent = '';
            return true;
        } catch {
            urlError.textContent = 'Please enter a valid URL (e.g., https://example.com)';
            return false;
        }
    }

    // Custom code validation
    validateCustomCode() {
        const customCodeInput = document.getElementById('customCode');
        const customCode = customCodeInput.value.trim();
        
        if (!customCode) {
            return true;
        }

        const validPattern = /^[a-zA-Z0-9-_]+$/;
        if (!validPattern.test(customCode)) {
            customCodeInput.setCustomValidity('Only letters, numbers, hyphens, and underscores allowed');
            return false;
        }

        if (customCode.length < 3 || customCode.length > 20) {
            customCodeInput.setCustomValidity('Custom code must be between 3 and 20 characters');
            return false;
        }

        customCodeInput.setCustomValidity('');
        return true;
    }

    // URL shortening logic - now calls the backend
    async shortenURL(longUrl, customCode = '') {
        const response = await fetch('/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ longUrl, customCode }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Something went wrong');
        }

        const result = await response.json();
        return result.shortUrl;
    }

    // Display result
    displayResult(shortUrl, originalUrl) {
        const resultsSection = document.getElementById('resultsSection');
        const shortUrlDisplay = document.getElementById('shortUrlDisplay');
        const testLink = document.getElementById('testLink');
        
        shortUrlDisplay.textContent = shortUrl;
        testLink.href = shortUrl;
        
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Copy to clipboard
    async copyToClipboard() {
        const shortUrl = document.getElementById('shortUrlDisplay').textContent;
        const copyBtn = document.getElementById('copyBtn');
        
        try {
            await navigator.clipboard.writeText(shortUrl);
            
            // Visual feedback
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
            
            this.showToast('Copied!', 'URL copied to clipboard', 'success');
            
            // Reset button after 2 seconds
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.innerHTML = '<i class="fas fa-copy"></i><span>Copy</span>';
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showToast('Error', 'Failed to copy URL', 'error');
        }
    }

    // QR Code functionality
    showQRCode() {
        const shortUrl = document.getElementById('shortUrlDisplay').textContent;
        const qrModal = document.getElementById('qrModal');
        const qrCodeContainer = document.getElementById('qrCode');
        
        // Generate QR code using a simple library or API
        this.generateQRCode(shortUrl, qrCodeContainer);
        
        qrModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeQRModal() {
        const qrModal = document.getElementById('qrModal');
        qrModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    // Simple QR code generation (using a free API)
    generateQRCode(text, container) {
        // Clear previous content
        container.innerHTML = '';
        
        // Create QR code using QR Server API
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
        
        const img = document.createElement('img');
        img.src = qrUrl;
        img.alt = 'QR Code';
        img.style.borderRadius = '0.5rem';
        img.style.boxShadow = 'var(--shadow)';
        
        container.appendChild(img);
    }

    // Recent URLs management
    addToRecentUrls(shortUrl, originalUrl) {
        const urlData = {
            shortUrl,
            originalUrl,
            timestamp: new Date().toISOString(),
            clicks: 0
        };
        
        // Add to beginning of array
        this.recentUrls.unshift(urlData);
        
        // Keep only last 10 URLs
        if (this.recentUrls.length > 10) {
            this.recentUrls = this.recentUrls.slice(0, 10);
        }
        
        this.saveRecentUrls();
        this.renderRecentUrls();
    }

    renderRecentUrls() {
        const recentUrlsList = document.getElementById('recentUrlsList');
        
        if (this.recentUrls.length === 0) {
            recentUrlsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No recent URLs. Shorten your first URL to see it here!</p>';
            return;
        }
        
        recentUrlsList.innerHTML = this.recentUrls.map(urlData => `
            <div class="recent-url-item">
                <div class="recent-url-info">
                    <div class="recent-url-original">${this.truncateUrl(urlData.originalUrl)}</div>
                    <div class="recent-url-short">${urlData.shortUrl}</div>
                </div>
                <div class="recent-url-actions">
                    <button onclick="urlShortener.copyRecentUrl('${urlData.shortUrl}')" title="Copy URL">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button onclick="urlShortener.openRecentUrl('${urlData.shortUrl}')" title="Open URL">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button onclick="urlShortener.showRecentQR('${urlData.shortUrl}')" title="QR Code">
                        <i class="fas fa-qrcode"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    copyRecentUrl(shortUrl) {
        navigator.clipboard.writeText(shortUrl).then(() => {
            this.showToast('Copied!', 'URL copied to clipboard', 'success');
        }).catch(() => {
            this.showToast('Error', 'Failed to copy URL', 'error');
        });
    }

    openRecentUrl(shortUrl) {
        window.open(shortUrl, '_blank');
    }

    showRecentQR(shortUrl) {
        const qrModal = document.getElementById('qrModal');
        const qrCodeContainer = document.getElementById('qrCode');
        
        this.generateQRCode(shortUrl, qrCodeContainer);
        
        qrModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    truncateUrl(url) {
        if (url.length <= 50) return url;
        return url.substring(0, 47) + '...';
    }

    // Local storage management
    saveRecentUrls() {
        try {
            localStorage.setItem('recentUrls', JSON.stringify(this.recentUrls));
        } catch (error) {
            console.error('Failed to save recent URLs:', error);
        }
    }

    loadRecentUrls() {
        try {
            const saved = localStorage.getItem('recentUrls');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load recent URLs:', error);
            return [];
        }
    }

    // Theme management
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update theme toggle icon
        const themeToggle = document.getElementById('themeToggle');
        const icon = themeToggle.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeToggle = document.getElementById('themeToggle');
        const icon = themeToggle.querySelector('i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Loading spinner
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.classList.add('show');
        } else {
            spinner.classList.remove('show');
        }
    }

    // Toast notifications
    showToast(title, message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        
        toast.innerHTML = `
            <i class="${icon}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    getToastIcon(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-exclamation-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            default: return 'fas fa-info-circle';
        }
    }
}

// Initialize the application
let urlShortener;

function handleRedirect() {
    const shortCode = window.location.hash.substring(1); // Remove '#'
    
    if (shortCode) {
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                font-family: 'Inter', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
                padding: 2rem;
            ">
                <div>
                    <h1 style="font-size: 2rem; margin-bottom: 1rem;">🚀 URL Shortener Demo</h1>
                    <p style="font-size: 1.2rem; margin-bottom: 2rem;">
                        This would redirect to the original URL for code: <strong>${shortCode}</strong>
                    </p>
                    <a href="${window.location.pathname}" style="
                        background: white;
                        color: #667eea;
                        padding: 0.75rem 1.5rem;
                        border-radius: 0.5rem;
                        text-decoration: none;
                        font-weight: 600;
                        display: inline-block;
                    ">Back to Shortener</a>
                </div>
            </div>
        `;
        return true; // Indicates we are in redirect mode
    }
    return false; // Indicates we should load the main app
}

document.addEventListener('DOMContentLoaded', () => {
    // Check for hash on page load. If it exists, show redirect page.
    // Otherwise, initialize the main application.
    if (!handleRedirect()) {
        urlShortener = new URLShortener();
    }

    // Also handle hash changes for SPAs, though less critical here.
    window.addEventListener('hashchange', handleRedirect, false);
}); 