/**
 * Mama Nia's Pizza - Main JavaScript
 * Handles all interactivity, animations, and user experience
 */

// =====================================================
// 1. DOM READY & INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initNavigation();
    initScrollReveal();
    initMenuTabs();
    initTestimonialSlider();
    initFormHandling();
    initOrderButtons();
    initSmoothScroll();
    initParallaxEffects();
});

// =====================================================
// 2. PRELOADER
// =====================================================

function initPreloader() {
    const preloader = document.getElementById('preloader');

    // Add loading class to body
    document.body.classList.add('loading');

    // Hide preloader after content loads
    window.addEventListener('load', () => {
        setTimeout(() => {
            preloader.classList.add('hidden');
            document.body.classList.remove('loading');

            // Trigger initial animations
            triggerHeroAnimations();
        }, 800);
    });

    // Fallback - hide after 3 seconds max
    setTimeout(() => {
        preloader.classList.add('hidden');
        document.body.classList.remove('loading');
    }, 3000);
}

function triggerHeroAnimations() {
    const animatedElements = document.querySelectorAll('.animate-slide-up');
    animatedElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.15}s`;
    });
}

// =====================================================
// 3. NAVIGATION
// =====================================================

function initNavigation() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Scroll effect
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Add/remove scrolled class
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });

    // Mobile menu toggle
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Update active nav link on scroll
    updateActiveNavOnScroll();
}

function updateActiveNavOnScroll() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// =====================================================
// 4. SCROLL REVEAL ANIMATIONS
// =====================================================

function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // Optional: unobserve after reveal for performance
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));
}

// =====================================================
// 5. MENU TABS
// =====================================================

function initMenuTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.menu-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Update buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');

                    // Re-trigger reveal animations for new tab content
                    const revealElements = content.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale');
                    revealElements.forEach((el, index) => {
                        el.classList.remove('revealed');
                        setTimeout(() => {
                            el.classList.add('revealed');
                        }, index * 100);
                    });
                }
            });
        });
    });
}

// =====================================================
// 6. TESTIMONIAL SLIDER
// =====================================================

function initTestimonialSlider() {
    const track = document.getElementById('testimonial-track');
    const cards = document.querySelectorAll('.testimonial-card');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const dotsContainer = document.getElementById('slider-dots');

    if (!track || cards.length === 0) return;

    let currentIndex = 0;
    const totalSlides = cards.length;
    let autoplayInterval;

    // Create dots
    cards.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.dot');

    function updateSlider() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;

        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    function goToSlide(index) {
        currentIndex = index;
        updateSlider();
        resetAutoplay();
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateSlider();
    }

    function prevSlide() {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateSlider();
    }

    function resetAutoplay() {
        clearInterval(autoplayInterval);
        autoplayInterval = setInterval(nextSlide, 5000);
    }

    // Event listeners
    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoplay();
    });

    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoplay();
    });

    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
            resetAutoplay();
        }
    }

    // Start autoplay
    autoplayInterval = setInterval(nextSlide, 5000);

    // Pause on hover
    track.addEventListener('mouseenter', () => clearInterval(autoplayInterval));
    track.addEventListener('mouseleave', () => resetAutoplay());
}

// =====================================================
// 7. FORM HANDLING
// =====================================================

function initFormHandling() {
    const form = document.getElementById('reservation-form');

    if (!form) return;

    // Set minimum date to today
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        // Show loading state
        submitBtn.innerHTML = '<span>Reserving...</span>';
        submitBtn.disabled = true;

        // Simulate API call
        await simulateApiCall(1500);

        // Show success
        submitBtn.innerHTML = '<span>Reserved!</span> ✓';
        submitBtn.style.background = 'var(--accent)';

        showToast('Reservation confirmed! We\'ll see you soon.');

        // Reset form after delay
        setTimeout(() => {
            form.reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            submitBtn.style.background = '';
        }, 3000);
    });

    // Input animations
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', () => {
            input.parentElement.classList.remove('focused');
        });
    });
}

function simulateApiCall(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================
// 8. ORDER BUTTONS
// =====================================================

function initOrderButtons() {
    const orderButtons = document.querySelectorAll('.btn-order');

    orderButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();

            // Get item name
            const card = button.closest('.menu-card');
            const itemName = card.querySelector('.card-title').textContent;

            // Button animation
            const originalText = button.textContent;
            button.textContent = 'Added!';
            button.style.background = 'var(--accent)';

            // Show toast
            showToast(`${itemName} added to your order!`);

            // Add to cart animation
            animateAddToCart(button);

            // Reset button
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 1500);
        });
    });
}

function animateAddToCart(button) {
    // Create floating element
    const rect = button.getBoundingClientRect();
    const floater = document.createElement('span');
    floater.textContent = '🍕';
    floater.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.left}px;
        font-size: 2rem;
        z-index: 1000;
        pointer-events: none;
        transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    document.body.appendChild(floater);

    // Animate to nav
    requestAnimationFrame(() => {
        floater.style.top = '20px';
        floater.style.left = '50%';
        floater.style.opacity = '0';
        floater.style.transform = 'scale(0.5)';
    });

    // Remove after animation
    setTimeout(() => floater.remove(), 800);
}

// =====================================================
// 9. TOAST NOTIFICATIONS
// =====================================================

function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = toast.querySelector('.toast-message');

    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// =====================================================
// 10. SMOOTH SCROLL
// =====================================================

function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            if (href === '#') return;

            e.preventDefault();

            const target = document.querySelector(href);
            if (!target) return;

            const navHeight = document.getElementById('navbar').offsetHeight;
            const targetPosition = target.offsetTop - navHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    });
}

// =====================================================
// 11. PARALLAX EFFECTS
// =====================================================

function initParallaxEffects() {
    const ingredients = document.querySelectorAll('.ingredient');

    if (ingredients.length === 0) return;

    // Only enable on desktop
    if (window.matchMedia('(min-width: 768px)').matches) {
        window.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX / window.innerWidth - 0.5;
            const mouseY = e.clientY / window.innerHeight - 0.5;

            ingredients.forEach((ingredient, index) => {
                const speed = (index + 1) * 10;
                const x = mouseX * speed;
                const y = mouseY * speed;

                ingredient.style.transform = `translate(${x}px, ${y}px)`;
            });
        });
    }

    // Scroll parallax for decorative elements
    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset;

        // Pizza decoration
        const pizzaDeco = document.querySelector('.deco-pizza');
        if (pizzaDeco) {
            pizzaDeco.style.transform = `rotate(${scrollY * 0.1}deg)`;
        }
    });
}

// =====================================================
// 12. GALLERY LIGHTBOX (OPTIONAL ENHANCEMENT)
// =====================================================

function initGalleryLightbox() {
    const galleryItems = document.querySelectorAll('.gallery-item');

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const caption = item.dataset.caption;
            const bgColor = getComputedStyle(item.querySelector('.gallery-image')).background;

            // Create lightbox
            const lightbox = document.createElement('div');
            lightbox.className = 'lightbox';
            lightbox.innerHTML = `
                <div class="lightbox-content">
                    <div class="lightbox-image" style="background: ${bgColor}"></div>
                    <p class="lightbox-caption">${caption}</p>
                    <button class="lightbox-close">&times;</button>
                </div>
            `;

            lightbox.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                animation: fadeIn 0.3s ease;
            `;

            document.body.appendChild(lightbox);
            document.body.style.overflow = 'hidden';

            // Close handlers
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
                    lightbox.remove();
                    document.body.style.overflow = '';
                }
            });

            document.addEventListener('keydown', function closeOnEsc(e) {
                if (e.key === 'Escape') {
                    lightbox.remove();
                    document.body.style.overflow = '';
                    document.removeEventListener('keydown', closeOnEsc);
                }
            });
        });
    });
}

// =====================================================
// 13. PERFORMANCE OPTIMIZATIONS
// =====================================================

// Debounce function for scroll events
function debounce(func, wait = 10) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for frequent events
function throttle(func, limit = 16) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// =====================================================
// 14. ACCESSIBILITY ENHANCEMENTS
// =====================================================

// Handle keyboard navigation
document.addEventListener('keydown', (e) => {
    // Close mobile menu on Escape
    if (e.key === 'Escape') {
        const navMenu = document.getElementById('nav-menu');
        const hamburger = document.getElementById('hamburger');

        if (navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

// Focus trap for mobile menu
function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    element.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                lastFocusable.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                firstFocusable.focus();
                e.preventDefault();
            }
        }
    });
}

// =====================================================
// 15. UTILITY FUNCTIONS
// =====================================================

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Get scroll percentage
function getScrollPercentage() {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    return (scrollTop / docHeight) * 100;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// =====================================================
// 16. CONSOLE EASTER EGG
// =====================================================

console.log(`
%c🍕 Welcome to Mama Nia's Pizza! 🍕

%cMade with love, just like our pizzas.
Visit us at 123 Little Italy Lane!

%c(This website was crafted with care)
`,
'font-size: 24px; font-weight: bold;',
'font-size: 14px; color: #D32F2F;',
'font-size: 12px; color: #888;'
);
