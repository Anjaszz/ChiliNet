// Tailwind config
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'neon-green': '#39ff14',
                'neon-pink': '#ff10f0',
                'neon-blue': '#00ffff',
                'neon-yellow': '#F28B82',
            },
            fontFamily: {
                'mono': ['JetBrains Mono', 'monospace'],
            }
        }
    }
}

// Socket.IO connection
const socket = io();

// Global variables
let donationModal, leaderboardModal, donationForm, toastContainer;

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    // Initialize elements
    initializeElements();
    
    // Initialize systems
    initializeSocketEvents();
    initializeDonationModal();
    initializeFAQ();
    
    // Load data
    loadRecentDonations();
    
    console.log('✅ ChiliNet donation system initialized');
});

// Initialize DOM elements
function initializeElements() {
    donationModal = document.getElementById('donationModal');
    leaderboardModal = document.getElementById('leaderboardModal');
    donationForm = document.getElementById('donationForm');
    
    // Create toast container if not exists
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed top-4 right-4 z-50 space-y-4';
        document.body.appendChild(toastContainer);
    }
    
    console.log('✅ Elements initialized');
}

// Socket Events
function initializeSocketEvents() {
    socket.on('connect', function() {
        console.log('✅ Connected to donation system');
        showInfoToast('Terhubung ke sistem donasi real-time! 🔗');
    });
    
    socket.on('new_donation', function(data) {
        console.log('🎉 New donation received:', data);
        showDonationToast(data);
        playNotificationSound();
        createConfetti();
        
        // Auto-refresh data
        loadRecentDonations();
        
        // Auto-refresh leaderboard if modal is open
        if (leaderboardModal && !leaderboardModal.classList.contains('hidden')) {
            loadLeaderboard();
        }
    });
    
    socket.on('leaderboard_updated', function(data) {
        console.log('📊 Leaderboard updated:', data);
        
        // Update leaderboard if modal is open
        if (leaderboardModal && !leaderboardModal.classList.contains('hidden')) {
            displayLeaderboard(data.leaderboard);
        }
        
        showInfoToast('Leaderboard telah diperbarui! 📊');
    });
    
    socket.on('recent_donations_updated', function(data) {
        console.log('💚 Recent donations updated:', data);
        displayRecentDonations(data.donations);
    });
    
    socket.on('disconnect', function() {
        console.log('❌ Disconnected from donation system');
        showErrorToast('Koneksi terputus dari sistem donasi');
    });
}

// Initialize donation modal
function initializeDonationModal() {
    const donationBtn = document.getElementById('donationBtn');
    const closeModal = document.getElementById('closeModal');
    const leaderboardBtn = document.getElementById('leaderboardBtn');
    const closeLeaderboard = document.getElementById('closeLeaderboard');
    
    // Modal controls
    if (donationBtn) {
        donationBtn.addEventListener('click', function() {
            donationModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', function() {
            loadLeaderboard();
            leaderboardModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            donationModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        });
    }
    
    if (closeLeaderboard) {
        closeLeaderboard.addEventListener('click', function() {
            leaderboardModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        });
    }
    
    // Close modals when clicking outside
    [donationModal, leaderboardModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    document.body.style.overflow = 'auto';
                }
            });
        }
    });
    
    // Initialize donation form
    if (donationForm) {
        initializeDonationForm();
    }
    
    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (donationModal && !donationModal.classList.contains('hidden')) {
                donationModal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
            if (leaderboardModal && !leaderboardModal.classList.contains('hidden')) {
                leaderboardModal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
        }
    });
}

// Initialize donation form
function initializeDonationForm() {
    // Preset amount buttons
    document.querySelectorAll('.preset-amount').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = this.dataset.amount;
            const amountInput = document.getElementById('donationAmount');
            
            // Remove active class from all buttons
            document.querySelectorAll('.preset-amount').forEach(b => 
                b.classList.remove('bg-yellow-400'));
            
            if (amount === 'custom') {
                this.classList.add('bg-yellow-400');
                amountInput.value = '';
                amountInput.focus();
            } else {
                this.classList.add('bg-yellow-400');
                amountInput.value = amount;
            }
        });
    });
    
    // Form submission
    donationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        processDonation();
    });
}

// Process donation
async function processDonation() {
    const donateButton = document.getElementById('donateButton');
    if (!donateButton) return;
    
    const originalText = donateButton.innerHTML;
    
    // Show loading state
    donateButton.innerHTML = '⏳ Memproses...';
    donateButton.disabled = true;
    
    try {
        const formData = new FormData(donationForm);
        const data = {
            donor_name: formData.get('donor_name'),
            amount: parseInt(formData.get('amount')),
            message: formData.get('message') || ''
        };
        
        console.log('🔄 Sending donation data:', data);
        
        // Validate
        if (!data.donor_name || data.amount < 5000) {
            throw new Error('Nama dan minimal donasi Rp 5.000 wajib diisi');
        }
        
        const response = await fetch('/donate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        console.log('📥 Donation response:', result);
        
        if (result.success) {
            // Close modal
            donationModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
            
            showInfoToast('Membuka halaman pembayaran... 💳');
            
            // Check if snap is available
            if (typeof snap === 'undefined') {
                throw new Error('Midtrans Snap tidak tersedia. Pastikan script Midtrans sudah dimuat.');
            }
            
            // Open Midtrans payment
            snap.pay(result.snap_token, {
                onSuccess: function(result) {
                    console.log('✅ Payment success:', result);
                    showSuccessToast('Pembayaran berhasil! Terima kasih atas donasi Anda! 🙏');
                    
                    // Reset form
                    if (donationForm) {
                        donationForm.reset();
                    }
                    
                    // Auto-refresh leaderboard after 2 seconds
                    setTimeout(() => {
                        loadRecentDonations();
                        if (leaderboardModal && !leaderboardModal.classList.contains('hidden')) {
                            loadLeaderboard();
                        }
                    }, 2000);
                    
                    // Redirect to finish page after showing success
                    setTimeout(() => {
                        window.location.href = `/donation/finish?order_id=${result.order_id}`;
                    }, 3000);
                },
                onPending: function(result) {
                    console.log('⏳ Payment pending:', result);
                    showInfoToast('Pembayaran sedang diproses... ⏳');
                },
                onError: function(result) {
                    console.log('❌ Payment error:', result);
                    showErrorToast('Pembayaran gagal. Silakan coba lagi.');
                },
                onClose: function() {
                    console.log('🔒 Payment popup closed');
                    showInfoToast('Jendela pembayaran ditutup');
                }
            });
        } else {
            throw new Error(result.message || 'Terjadi kesalahan');
        }
        
    } catch (error) {
        console.error('❌ Donation error:', error);
        showErrorToast(error.message);
    } finally {
        donateButton.innerHTML = originalText;
        donateButton.disabled = false;
    }
}

// Load recent donations
async function loadRecentDonations() {
    try {
        const response = await fetch('/api/recent-donations');
        const data = await response.json();
        
        if (data.success) {
            displayRecentDonations(data.donations);
        }
    } catch (error) {
        console.error('Error loading recent donations:', error);
    }
}

// Display recent donations
function displayRecentDonations(donations) {
    const container = document.getElementById('recentDonations');
    if (!container) return;
    
    if (donations.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-400 font-bold">Belum ada donasi. Jadilah yang pertama! 🎉</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = donations.map((donation, index) => `
        <div class="bg-white border-2 border-green-400 p-4 transform transition-all duration-300 hover:scale-105">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="text-lg font-bold text-black">${donation.donor_name}</h4>
                    <p class="text-sm text-gray-600 font-bold">
                        ${donation.message || 'Donasi untuk pengembangan ChiliNet'}
                    </p>
                </div>
                <div class="text-right">
                    <p class="text-xl font-bold text-green-600">
                        Rp ${donation.amount.toLocaleString('id-ID')}
                    </p>
                    <p class="text-xs text-gray-500">
                        ${new Date(donation.paid_at || donation.created_at).toLocaleDateString('id-ID')}
                    </p>
                </div>
            </div>
        </div>
    `).join('');
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        
        if (data.success) {
            displayLeaderboard(data.leaderboard);
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Display leaderboard
function displayLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboardContent');
    if (!container) return;
    
    if (leaderboard.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-600 font-bold">Belum ada donatur. Jadilah yang pertama! 🎉</p>
            </div>
        `;
        return;
    }
    
    const medals = ['🥇', '🥈', '🥉'];
    
    container.innerHTML = leaderboard.map((donor, index) => {
        const medal = medals[index] || '🏅';
        const progressWidth = Math.min((donor.total_amount / leaderboard[0].total_amount) * 100, 100);
        
        return `
            <div class="leaderboard-item bg-gradient-to-r from-yellow-100 to-yellow-200 border-4 border-black neobrutalism-shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-4">
                        <span class="text-4xl">${medal}</span>
                        <div>
                            <h4 class="text-xl font-bold text-black">${donor.name}</h4>
                            <p class="text-sm text-gray-600 font-bold">
                                ${donor.donation_count} donasi • Terakhir: ${new Date(donor.last_donation).toLocaleDateString('id-ID')}
                            </p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-2xl font-bold text-green-600">
                            Rp ${donor.total_amount.toLocaleString('id-ID')}
                        </p>
                        <p class="text-sm text-gray-600 font-bold">Total Donasi</p>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="w-full bg-gray-300 h-3 border-2 border-black">
                    <div 
                        class="progress-bar bg-green-500 h-full border-r-2 border-black" 
                        style="--progress-width: ${progressWidth}%; width: ${progressWidth}%"
                    ></div>
                </div>
            </div>
        `;
    }).join('');
}

// Toast notifications
function showDonationToast(donation) {
    const toast = document.createElement('div');
    toast.className = 'toast-enter bg-green-500 border-4 border-black neobrutalism-shadow-sm p-4 max-w-sm transform translate-x-full transition-transform duration-500';
    
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="text-2xl animate-bounce">💝</span>
            <div class="flex-1">
                <h4 class="font-bold text-white">Donasi Baru!</h4>
                <p class="text-sm text-white">
                    <strong>${donation.donor_name}</strong> berdonasi 
                    <strong>Rp ${donation.amount.toLocaleString('id-ID')}</strong>
                </p>
                ${donation.message ? `<p class="text-xs text-green-100 mt-1">"${donation.message}"</p>` : ''}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-red-200">
                ✕
            </button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 500);
        }
    }, 10000);
}

function showSuccessToast(message) {
    showToast(message, 'success', '✅');
}

function showErrorToast(message) {
    showToast(message, 'error', '❌');
}

function showInfoToast(message) {
    showToast(message, 'info', 'ℹ️');
}

function showToast(message, type, icon) {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };
    
    const toast = document.createElement('div');
    toast.className = `${colors[type]} border-4 border-black neobrutalism-shadow-sm p-4 max-w-sm transform translate-x-full transition-transform duration-500`;
    
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="text-xl">${icon}</span>
            <div class="flex-1">
                <p class="text-white font-bold">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                ✕
            </button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 500);
        }
    }, 5000);
}

// Confetti animation
function createConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.cssText = `
                position: fixed;
                top: 20px;
                right: 80px;
                width: 8px;
                height: 8px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                animation: confetti-fall 2s ease-out forwards;
            `;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 2000);
        }, Math.random() * 200);
    }
}

// Notification sound
function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.log('Audio notification not supported');
    }
}

// FAQ initialization
function initializeFAQ() {
    const faqContainer = document.getElementById('faq-container');
    if (!faqContainer) return;

    function generateFAQHTML(faqItem) {
        return `
            <div class="faq-item bg-${faqItem.color} border-4 border-black neobrutalism-shadow-sm">
                <button class="faq-question w-full text-left p-6 flex justify-between items-center hover:bg-opacity-80 transition-colors">
                    <span class="text-xl font-bold text-black">${faqItem.emoji} ${faqItem.question}</span>
                    <span class="faq-arrow text-2xl font-bold text-black transform transition-transform">+</span>
                </button>
                <div class="faq-answer hidden p-6 pt-0">
                    <p class="text-black font-bold">
                        ${faqItem.answer}
                    </p>
                </div>
            </div>
        `;
    }

    if (typeof faqData !== 'undefined') {
        const faqHTML = faqData.map(generateFAQHTML).join('');
        faqContainer.innerHTML = faqHTML;
        initializeFAQFunctionality();
    } else {
        console.error('FAQ data not loaded');
        faqContainer.innerHTML = `
            <div class="bg-red-100 border-4 border-red-500 p-6 text-center">
                <p class="text-red-700 font-bold">
                    ⚠️ FAQ data tidak dapat dimuat. Silakan refresh halaman atau hubungi support.
                </p>
            </div>
        `;
    }

    function initializeFAQFunctionality() {
        const faqItems = document.querySelectorAll('.faq-item');

        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const arrow = item.querySelector('.faq-arrow');
            
            question.addEventListener('click', function() {
                const isActive = item.classList.contains('active');
                
                // Close all other FAQ items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.faq-answer').classList.add('hidden');
                        otherItem.querySelector('.faq-arrow').textContent = '+';
                    }
                });
                
                // Toggle current item
                if (isActive) {
                    item.classList.remove('active');
                    answer.classList.add('hidden');
                    arrow.textContent = '+';
                } else {
                    item.classList.add('active');
                    answer.classList.remove('hidden');
                    arrow.textContent = '−';
                }
            });
        });
    }
}

// Auto-refresh recent donations every 30 seconds
setInterval(loadRecentDonations, 30000);

// Test function for debugging
function testToast() {
    showSuccessToast('Test toast berhasil! 🎉');
}

// Export for debugging
window.testToast = testToast;
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showInfoToast = showInfoToast;