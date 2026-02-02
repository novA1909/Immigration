/**
 * La Dolce Pizza - Premium Pizza Restaurant Hero Section
 * Interactive JavaScript for enhanced user experience
 */

(function() {
    'use strict';

    // =====================================================
    // DOM Elements
    // =====================================================
    const navbar = document.querySelector('.navbar');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const heroContent = document.querySelector('.hero-content');
    const pizzaPlate = document.querySelector('.pizza-plate');

    // =====================================================
    // Navbar Scroll Effect
    // =====================================================
    function handleNavbarScroll() {
        const scrollY = window.scrollY;

        if (scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    // =====================================================
    // Mobile Menu Toggle
    // =====================================================
    function toggleMobileMenu() {
        navLinks.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');

        // Animate hamburger to X
        const spans = mobileMenuBtn.querySelectorAll('span');
        if (mobileMenuBtn.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    }

    // =====================================================
    // Parallax Effect for Pizza
    // =====================================================
    function handleParallax(e) {
        if (!pizzaPlate || window.innerWidth < 1024) return;

        const rect = pizzaPlate.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = (e.clientX - centerX) / 30;
        const deltaY = (e.clientY - centerY) / 30;

        pizzaPlate.style.transform = `
            perspective(1000px)
            rotateX(${-deltaY}deg)
            rotateY(${deltaX}deg)
            translateZ(10px)
        `;
    }

    function resetPizzaPosition() {
        if (!pizzaPlate) return;
        pizzaPlate.style.transform = '';
    }

    // =====================================================
    // Smooth Scroll for Anchor Links
    // =====================================================
    function handleSmoothScroll(e) {
        const href = e.target.getAttribute('href');

        if (href && href.startsWith('#') && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const navHeight = navbar.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                if (navLinks.classList.contains('active')) {
                    toggleMobileMenu();
                }
            }
        }
    }

    // =====================================================
    // Intersection Observer for Animations
    // =====================================================
    function setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe elements with animation classes
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }

    // =====================================================
    // Counter Animation for Stats
    // =====================================================
    function animateCounter(element, target, duration = 2000) {
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;

        const updateCounter = () => {
            current += increment;
            if (current < target) {
                element.textContent = Math.floor(current) + '+';
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target + '+';
            }
        };

        updateCounter();
    }

    // =====================================================
    // Tilt Effect for Feature Cards
    // =====================================================
    function addTiltEffect(elements) {
        elements.forEach(el => {
            el.addEventListener('mouseenter', function(e) {
                this.style.transform = 'translateY(-5px) scale(1.02)';
                this.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.15)';
            });

            el.addEventListener('mouseleave', function() {
                this.style.transform = '';
                this.style.boxShadow = '';
            });
        });
    }

    // =====================================================
    // Ripple Effect for Buttons
    // =====================================================
    function createRipple(e) {
        const button = e.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();

        const diameter = Math.max(rect.width, rect.height);
        const radius = diameter / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${diameter}px;
            height: ${diameter}px;
            left: ${e.clientX - rect.left - radius}px;
            top: ${e.clientY - rect.top - radius}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
        `;

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    }

    // Add ripple animation to document
    if (!document.querySelector('#ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'ripple-styles';
        style.textContent = `
            @keyframes ripple-animation {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }

            .nav-links.active {
                display: flex;
                position: fixed;
                top: 70px;
                left: 0;
                right: 0;
                background: rgba(253, 245, 230, 0.98);
                flex-direction: column;
                padding: 2rem;
                gap: 1.5rem;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                animation: slideDown 0.3s ease;
            }

            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // =====================================================
    // Lazy Loading Images
    // =====================================================
    function setupLazyLoading() {
        const lazyImages = document.querySelectorAll('img[data-src]');

        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            });

            lazyImages.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }
    }

    // =====================================================
    // Performance: Throttle Function
    // =====================================================
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // =====================================================
    // Performance: Debounce Function
    // =====================================================
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // =====================================================
    // Initialize
    // =====================================================
    function init() {
        // Event Listeners
        window.addEventListener('scroll', throttle(handleNavbarScroll, 100));

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        }

        // Smooth scroll for all anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', handleSmoothScroll);
        });

        // Parallax effect on mouse move
        document.addEventListener('mousemove', throttle(handleParallax, 50));
        document.addEventListener('mouseleave', resetPizzaPosition);

        // Tilt effect for features
        const features = document.querySelectorAll('.feature');
        addTiltEffect(features);

        // Ripple effect for buttons
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', createRipple);
        });

        // Setup observers
        setupIntersectionObserver();
        setupLazyLoading();

        // Initial scroll check
        handleNavbarScroll();

        // Log initialization
        console.log('🍕 La Dolce Pizza Hero Section Initialized');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
