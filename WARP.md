# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ClarityTalk is a static website promoting clear and effective communication. Built with vanilla HTML5, CSS3, and JavaScript (ES6+) with zero external dependencies or frameworks.

## Development Commands

### Running the Website Locally

The site can be opened directly in a browser, but using a local server is recommended:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js http-server (if available)
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

### Opening Directly

```bash
# macOS
open index.html

# Linux
xdg-open index.html
```

## Architecture & Structure

### File Organization

```
├── index.html          # Single-page application structure
├── css/
│   └── style.css       # All styles with CSS custom properties
├── js/
│   └── script.js       # All JavaScript functionality
└── images/             # Image assets (currently empty)
```

### CSS Architecture

- **CSS Custom Properties**: All colors and common values defined in `:root` for easy theming
- **Responsive Design**: Mobile-first with breakpoints at 768px and 480px
- **Layout Systems**: Uses both CSS Grid (features grid, about section) and Flexbox (navigation, buttons)
- **No preprocessors**: Pure CSS3 with modern features

### JavaScript Architecture

**Key Features** (all in `js/script.js`):
1. **Mobile Navigation**: Toggle menu visibility with `.nav-toggle` button
2. **Smooth Scrolling**: Event listeners on all anchor links with `scrollIntoView()`
3. **Contact Form**: Client-side form handling with `preventDefault()` and alert notification
4. **Scroll Animations**: Uses `IntersectionObserver` API to fade in feature cards on scroll
5. **Header Effects**: Dynamic shadow on header based on scroll position

**No modules or bundling**: Single JavaScript file loaded at end of `<body>`

### HTML Structure

**Sections**:
- Header with sticky navigation
- Hero section with CTA buttons
- Features grid (4 feature cards)
- About section (two-column layout)
- Contact form
- Footer with links

**Key patterns**:
- Semantic HTML5 elements (`<header>`, `<main>`, `<section>`, `<footer>`)
- BEM-like class naming (e.g., `.hero-content`, `.feature-card`)
- All navigation uses hash links (`#features`, `#about`, `#contact`)

## Customization

### Changing Colors

Edit CSS custom properties in `css/style.css`:

```css
:root {
    --primary-color: #2563eb;      /* Main brand color */
    --primary-dark: #1e40af;       /* Darker variant */
    --secondary-color: #64748b;    /* Secondary elements */
    --text-dark: #1e293b;          /* Primary text */
    --text-light: #64748b;         /* Secondary text */
    --bg-light: #f8fafc;           /* Background sections */
}
```

### Modifying Content

All content is in `index.html` - edit directly. No templating system.

### Adding Images

Place files in `images/` directory and reference with relative paths:
```html
<img src="images/your-image.jpg" alt="description">
```

## Browser Compatibility

**Modern browsers required** for:
- CSS Grid and Flexbox
- CSS Custom Properties
- Intersection Observer API
- ES6+ JavaScript features

Targets: Chrome, Firefox, Safari, Edge (latest versions)

## Development Workflow

This is a **no-build** project:
1. Edit HTML, CSS, or JS files directly
2. Refresh browser to see changes (or use live reload extension)
3. No compilation, bundling, or transpilation needed
4. Git commit and push when ready

## Known Patterns

- **Contact form** is client-side only (shows alert, doesn't actually send data)
- **Images** use placeholder gradient div (`.placeholder-image`) - replace with actual images as needed
- **Navigation links** close mobile menu automatically when clicked
- **Feature cards** animate in on scroll (opacity + translateY transition)
