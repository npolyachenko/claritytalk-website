// Mobile Navigation Toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking a link
const navLinks = document.querySelectorAll('.nav-menu a');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// Smooth scrolling for anchor links only (not mailto, tel, http, or other protocols)
document.querySelectorAll('a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        // Only apply smooth scrolling to internal hash links starting with #
        if (href && href.startsWith('#') && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
        // For all other links (mailto:, http:, etc.), let the browser handle them naturally
    });
});

// Scroll animations using Intersection Observer
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all cards for animation
const animatedElements = document.querySelectorAll(
    '.step-card, .feature-card, .testimonial-card, .science-card, .stat-card, .result-item, .different-card'
);

animatedElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(element);
});

// Enhanced header shadow on scroll
const header = document.querySelector('.header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        header.style.boxShadow = '0 2px 20px rgba(0, 204, 204, 0.3)';
    } else {
        header.style.boxShadow = '0 2px 10px rgba(0, 204, 204, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// Button click handlers (placeholder - replace with actual functionality)
const ctaButtons = document.querySelectorAll('.btn-primary');
ctaButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Placeholder for CTA action
        console.log('CTA clicked - redirect to app or sign up page');
        // window.location.href = 'https://app.claritytalk.com/signup';
    });
});

const secondaryButtons = document.querySelectorAll('.btn-secondary');
secondaryButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Placeholder for secondary action
        console.log('Secondary CTA clicked - show demo or scroll to how it works');
        const howItWorks = document.querySelector('#how-it-works');
        if (howItWorks) {
            howItWorks.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Add gradient animation to hero section
const hero = document.querySelector('.hero');
if (hero) {
    let hue = 0;
    setInterval(() => {
        hue = (hue + 0.5) % 360;
        // Subtle hue shift for visual interest
        hero.style.filter = `hue-rotate(${hue}deg)`;
    }, 100);
}
