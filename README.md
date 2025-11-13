# ClarityTalk Website

A modern, responsive website for ClarityTalk - promoting clear and effective communication.

## Features

- **Responsive Design**: Fully responsive layout that works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, contemporary design with smooth animations and transitions
- **Interactive Navigation**: Mobile-friendly navigation with smooth scrolling
- **Contact Form**: Functional contact form with validation
- **Scroll Animations**: Elements animate into view as you scroll
- **Sticky Header**: Navigation bar stays visible while scrolling

## Technologies Used

- HTML5
- CSS3 (with CSS Grid and Flexbox)
- Vanilla JavaScript (ES6+)
- No external dependencies or frameworks

## Project Structure

```
claritytalk-website/
├── index.html          # Main HTML file
├── css/
│   └── style.css      # All styles
├── js/
│   └── script.js      # JavaScript functionality
├── images/            # Image assets
└── README.md          # This file
```

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- A local web server (optional, but recommended)

### Installation

1. Clone or download this repository
2. Open `index.html` in your web browser, or
3. Use a local development server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

## Sections

- **Hero**: Eye-catching hero section with call-to-action buttons
- **Features**: Showcase of ClarityTalk's key benefits
- **About**: Information about the platform
- **Contact**: Contact form for user inquiries
- **Footer**: Additional links and copyright information

## Customization

### Colors

The color scheme is defined using CSS custom properties in `css/style.css`:

```css
:root {
    --primary-color: #2563eb;
    --primary-dark: #1e40af;
    --secondary-color: #64748b;
    --text-dark: #1e293b;
    --text-light: #64748b;
    --bg-light: #f8fafc;
}
```

### Content

Edit the HTML content in `index.html` to customize text, images, and structure.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is open source and available for use.

## Contact

For questions or feedback about ClarityTalk, please use the contact form on the website.
