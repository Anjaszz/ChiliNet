tailwind.config = {
  theme: {
    extend: {
      colors: {
        'neon-green': '#39ff14',
        'neon-pink': '#ff10f0',
        'neon-blue': '#00ffff',
        'neon-yellow': '#ffff00',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
};

function validateForm(event) {
  var fileInput = document.getElementById('file');
  var inputType = document.getElementById('input_type').value;

  if (inputType === 'webcam') {
    return true;
  }

  // Check if file is selected
  if (!fileInput.files || fileInput.files.length === 0) {
    event.preventDefault(); // Prevent form submission
    showModal();
    return false;
  }

  // Show loading overlay AFTER validation passes
  // Don't prevent the form submission - let it proceed normally
  showLoadingOverlay(inputType);
  return true; // Allow form to submit
}

function showLoadingOverlay(inputType) {
  const overlay = document.getElementById('loadingOverlay');
  const message = document.getElementById('loadingMessage');
  const progressBar = document.getElementById('progressBar');

  // Set appropriate message
  if (inputType === 'image') {
    message.textContent = 'Sedang menganalisis gambar dengan AI...';
  } else if (inputType === 'video') {
    message.textContent = 'Sedang memproses video frame demi frame...';
  }

  // Show overlay
  overlay.style.display = 'flex';

  // Animate progress bar
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 10 + 5; // Faster progress
    if (progress > 95) progress = 95; // Don't reach 100% until actually done
    progressBar.style.width = progress + '%';
  }, 300);

  // Store interval to clear it later if needed
  window.loadingInterval = interval;
}

function showModal() {
  document.getElementById('warningModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('warningModal').classList.add('hidden');
  document.getElementById('warningModal').classList.remove('animate-pulse');
}

// Close modal when clicking outside
document.getElementById('warningModal').addEventListener('click', function (e) {
  if (e.target === this) {
    closeModal();
  }
});

// Add event listener to form - MODIFIED
document.querySelector('form').addEventListener('submit', validateForm);

// File input preview with enhanced visual feedback
document.getElementById('file').addEventListener('change', function (e) {
  const fileName = e.target.files[0]?.name;
  const fileSize = e.target.files[0]?.size;
  const fileInput = this;

  if (fileName) {
    // Add visual feedback when file is selected
    fileInput.classList.remove('border-black');
    fileInput.classList.add('border-neon-green');

    // Show file name and size
    let fileNameDisplay = document.getElementById('fileName');
    if (!fileNameDisplay) {
      fileNameDisplay = document.createElement('p');
      fileNameDisplay.id = 'fileName';
      fileNameDisplay.className = 'text-black font-bold mt-2 text-center';
      fileInput.parentNode.appendChild(fileNameDisplay);
    }

    // Format file size
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    fileNameDisplay.innerHTML = `
      <span class="inline-block bg-neon-green border-2 border-black p-2 text-sm">
          ✅ File Dipilih: <strong>${fileName}</strong><br>
          📊 Ukuran: ${formatFileSize(fileSize)}
      </span>
  `;
    fileNameDisplay.classList.remove('hidden');

    // Update submit button
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.classList.remove('bg-neon-green');
    submitBtn.classList.add('bg-neon-pink');
    submitBtn.innerHTML = '🚀 ANALISIS FILE TERPILIH';
  } else {
    // Reset visual feedback
    fileInput.classList.remove('border-neon-green');
    fileInput.classList.add('border-black');

    const fileNameDisplay = document.getElementById('fileName');
    if (fileNameDisplay) {
      fileNameDisplay.classList.add('hidden');
    }

    // Reset submit button
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.classList.remove('bg-neon-pink');
    submitBtn.classList.add('bg-neon-green');
    submitBtn.innerHTML = '🚀 MULAI ANALISIS';
  }
});

// Add visual feedback for different input types
document.getElementById('input_type').addEventListener('change', function () {
  const inputType = this.value;
  const fileInputContainer = document.getElementById('file').parentNode;
  const submitBtn = document.getElementById('submitBtn');

  if (inputType === 'webcam') {
    fileInputContainer.style.opacity = '0.5';
    document.getElementById('file').disabled = true;
    submitBtn.innerHTML = '📹 BERALIH KE WEBCAM';
  } else {
    fileInputContainer.style.opacity = '1';
    document.getElementById('file').disabled = false;

    // Update button text based on type
    if (inputType === 'image') {
      submitBtn.innerHTML = '📸 ANALISIS GAMBAR';
    } else if (inputType === 'video') {
      submitBtn.innerHTML = '🎥 PROSES VIDEO';
    }
  }
});

// Enhanced file validation
document.getElementById('file').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const inputType = document.getElementById('input_type').value;

  if (file) {
    const fileType = file.type;
    const fileSize = file.size;
    const maxSize = 100 * 1024 * 1024; // 100MB limit

    // Validate file type
    if (inputType === 'image' && !fileType.startsWith('image/')) {
      alert('⚠️ Silakan pilih file gambar untuk mode Analisis Gambar!');
      this.value = '';
      return;
    }

    if (inputType === 'video' && !fileType.startsWith('video/')) {
      alert('⚠️ Silakan pilih file video untuk mode Pemrosesan Video!');
      this.value = '';
      return;
    }

    // Validate file size
    if (fileSize > maxSize) {
      alert('⚠️ Ukuran file terlalu besar! Maksimal 100MB.');
      this.value = '';
      return;
    }

    // Show success feedback
    const fileName = document.getElementById('fileName');
    if (fileName) {
      fileName.classList.add('pulse-animation');
      setTimeout(() => {
        fileName.classList.remove('pulse-animation');
      }, 2000);
    }
  }
});

// Auto-hide loading on page load (if coming back from server)
window.addEventListener('load', function () {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }

  // Clear any existing interval
  if (window.loadingInterval) {
    clearInterval(window.loadingInterval);
  }
});

// Handle browser back button
window.addEventListener('pageshow', function (event) {
  if (event.persisted) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }

    if (window.loadingInterval) {
      clearInterval(window.loadingInterval);
    }
  }
});

// Add function to redirect to webcam
function redirectToWebcam() {
  var inputType = document.getElementById('input_type').value;
  var webcamLink = document.getElementById('webcamLink');

  if (inputType === 'webcam') {
    window.location.href = webcamLink.href;
  }
}
function showToast(title = 'Reset Berhasil!', message = 'Halaman telah direset. Silakan upload file baru.', icon = '✅', type = 'success') {
  const toast = document.getElementById('toastContainer');
  const toastContent = toast.querySelector('.toast-content');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  // Set content
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  toastIcon.textContent = icon;

  // Set colors based on type
  if (type === 'success') {
    toastContent.style.background = 'linear-gradient(135deg, #39ff14, #00ffff)';
  } else if (type === 'error') {
    toastContent.style.background = 'linear-gradient(135deg, #ff4444, #ff6666)';
  } else if (type === 'warning') {
    toastContent.style.background = 'linear-gradient(135deg, #ffff00, #ffa500)';
  }

  // Show toast
  toast.classList.add('show');

  // Auto hide after 4 seconds
  setTimeout(() => {
    hideToast();
  }, 4000);
}

// Function untuk menyembunyikan toast
function hideToast() {
  const toast = document.getElementById('toastContainer');
  toast.classList.remove('show');
  toast.classList.add('hide');

  // Reset classes after animation
  setTimeout(() => {
    toast.classList.remove('hide');
  }, 300);
}

// Show toast when page loads after reset (deteksi jika dari reset)
window.addEventListener('load', function () {
  // Cek jika URL mengandung parameter reset atau dari halaman reset
  const urlParams = new URLSearchParams(window.location.search);
  const fromReset = urlParams.get('reset');
  const referrer = document.referrer;

  // Jika ada parameter reset atau referrer dari /reset
  if (fromReset === 'true' || referrer.includes('/reset')) {
    setTimeout(() => {
      showToast('🔄 Reset Berhasil!', 'Halaman telah direset. Silakan pilih file baru untuk dianalisis.', '✅', 'success');
    }, 500); // Delay sedikit untuk smooth loading
  }
});

// Function untuk multiple toast types
function showSuccessToast(message) {
  showToast('✅ Berhasil!', message, '✅', 'success');
}

function showErrorToast(message) {
  showToast('❌ Error!', message, '❌', 'error');
}

function showWarningToast(message) {
  showToast('⚠️ Peringatan!', message, '⚠️', 'warning');
}
function resetPage() {
  if (confirm('🔄 Reset halaman dan upload file baru?')) {
    window.location.href = '/upload?reset=true';
  }
}

// Tambahkan fungsi ini ke file index.js Anda

// Function untuk auto scroll ke result section
function scrollToResults() {
  const resultSection = document.querySelector('.result-section');
  if (resultSection) {
    // Smooth scroll ke result section
    resultSection.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
    
    // Tambahkan highlight effect
    resultSection.classList.add('highlight-result');
    setTimeout(() => {
      resultSection.classList.remove('highlight-result');
    }, 2000);
  }
}

// Function untuk cek apakah ada hasil dan auto scroll
function checkAndScrollToResults() {
  // Cek apakah halaman memiliki hasil
  const hasResults = document.querySelector('.result-section') !== null;
  const fromUpload = document.referrer.includes('/upload') || 
                    window.location.pathname === '/upload';
  
  if (hasResults && fromUpload) {
    // Delay sedikit untuk memastikan halaman fully loaded
    setTimeout(() => {
      scrollToResults();
    }, 800);
  }
}

// Tambahkan event listener untuk auto scroll saat halaman load
window.addEventListener('load', function() {
  // Existing load code...
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }

  if (window.loadingInterval) {
    clearInterval(window.loadingInterval);
  }
  
  // Auto scroll ke results jika ada
  checkAndScrollToResults();
  
  // Show toast logic (existing code)...
  const urlParams = new URLSearchParams(window.location.search);
  const fromReset = urlParams.get('reset');
  const referrer = document.referrer;

  if (fromReset === 'true' || referrer.includes('/reset')) {
    setTimeout(() => {
      showToast('🔄 Reset Berhasil!', 'Halaman telah direset. Silakan pilih file baru untuk dianalisis.', '✅', 'success');
    }, 500);
  }
});

// Enhanced function untuk reset dengan scroll to top
function resetPage() {
  if (confirm('🔄 Reset halaman dan upload file baru?')) {
    // Scroll to top before redirect
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      window.location.href = '/upload?reset=true';
    }, 300);
  }
}