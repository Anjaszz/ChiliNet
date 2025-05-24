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


document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
const donationBtn = document.getElementById('donationBtn');
const donationModal = document.getElementById('donationModal');
const closeModal = document.getElementById('closeModal');
const whatsappBtn = document.getElementById('whatsappBtn');

// Open modal
donationBtn.addEventListener('click', function() {
donationModal.classList.remove('hidden');
document.body.style.overflow = 'hidden'; // Prevent scrolling
});

// Close modal
closeModal.addEventListener('click', function() {
donationModal.classList.add('hidden');
document.body.style.overflow = 'auto'; // Restore scrolling
});

// Close modal when clicking outside
donationModal.addEventListener('click', function(e) {
if (e.target === donationModal) {
    donationModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}
});

// WhatsApp button
whatsappBtn.addEventListener('click', function() {
const message = encodeURIComponent('Halo ChiliNet Team! Saya telah melakukan donasi dan ingin request fitur atau prioritas pengembangan. Berikut request saya:');
const whatsappUrl = `https://wa.me/6282258040148?text=${message}`;
window.open(whatsappUrl, '_blank');
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
if (e.key === 'Escape' && !donationModal.classList.contains('hidden')) {
    donationModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}
});
});

document.addEventListener('DOMContentLoaded', function() {
const faqContainer = document.getElementById('faq-container');

// Function to generate FAQ HTML
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

// Generate FAQ items from data
if (typeof faqData !== 'undefined') {
const faqHTML = faqData.map(generateFAQHTML).join('');
faqContainer.innerHTML = faqHTML;

// Initialize FAQ functionality after generating HTML
initializeFAQ();
} else {
console.error('FAQ data not loaded');
// Fallback content jika data tidak ter-load
faqContainer.innerHTML = `
    <div class="bg-red-100 border-4 border-red-500 p-6 text-center">
        <p class="text-red-700 font-bold">
            ⚠️ FAQ data tidak dapat dimuat. Silakan refresh halaman atau hubungi support.
        </p>
    </div>
`;
}

// FAQ functionality
function initializeFAQ() {
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
});
