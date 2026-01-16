# Eventzz Planet Website

A beautiful, responsive website for Eventzz Planet - Your premier event planning partner for weddings and corporate events.

## 🌟 Features

- **Responsive Design**: Fully responsive and works seamlessly on all devices (desktop, tablet, mobile)
- **Modern UI/UX**: Clean, elegant design with smooth animations and transitions
- **Wedding Events Section**: Comprehensive wedding planning services including:
  - Complete Wedding Planning
  - Theme & Décor Design
  - Venue Selection & Setup
  - Bridal & Groom Entry Concepts
  - Wedding Coordination & Management
  - Entertainment & Artist Management
  - All ceremony types (Engagement, Haldi, Mehndi, Sangeet, etc.)

- **Corporate Events Section**: Professional corporate event services including:
  - Conferences & Seminars
  - Product Launches
  - Annual Meetings
  - Corporate Parties & Award Nights
  - Exhibitions & Trade Shows
  - Team Building Events

- **Interactive Elements**:
  - Smooth scroll navigation
  - Animated statistics counter
  - Scroll-to-top button
  - Form validation
  - Parallax effects

## 📁 Project Structure

```
frontend/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All styling and responsive design
├── js/
│   └── script.js       # All JavaScript functionality
├── images/             # Image assets (add your images here)
├── assets/             # Additional assets
└── README.md           # This file
```

## 🚀 Getting Started

1. **Open the website**:
   - Simply open `index.html` in your web browser
   - Or use a local server for better performance:
     ```bash
     # Using Python
     python -m http.server 8000

     # Using Node.js (with http-server)
     npx http-server
     ```

2. **Access the website**:
   - If using a local server, navigate to `http://localhost:8000`
   - Otherwise, just double-click `index.html`

## 🎨 Customization

### Colors
The website uses CSS variables for easy customization. Edit the `:root` section in `styles.css`:

```css
:root {
    --primary-color: #d4af37;    /* Gold color */
    --secondary-color: #1a1a2e;  /* Dark blue */
    --accent-color: #e94560;     /* Red accent */
    /* ... more colors */
}
```

### Images
Replace the placeholder images in the gallery section:
1. Add your images to the `images/` folder
2. Update the image sources in `index.html`

### Contact Information
Update contact details in the Contact section of `index.html`:
- Phone number
- Email address
- Physical address
- Social media links

## 📱 Sections

1. **Hero Section**: Eye-catching landing with call-to-action buttons
2. **Services Section**: Detailed wedding and corporate event services
3. **About Section**: Company information and statistics
4. **Gallery Section**: Showcase of past events (add your images)
5. **Testimonials Section**: Client reviews and feedback
6. **Contact Section**: Contact form and information
7. **Footer**: Quick links and additional information

## 🛠 Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with flexbox and grid
- **JavaScript**: Interactive functionality
- **Font Awesome**: Icon library
- **Google Fonts**: Playfair Display & Poppins

## 📝 Form Integration

The contact form currently logs data to the console. To integrate with a backend:

1. Update the form submission handler in `script.js`
2. Send data to your backend API:

```javascript
fetch('/api/contact', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
})
.then(response => response.json())
.then(data => {
    // Handle success
})
.catch(error => {
    // Handle error
});
```

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📄 License

Copyright © 2024 Eventzz Planet. All rights reserved.

## 👥 Support

For any questions or support, contact:
- Email: info@eventzzplanet.com
- Phone: +91 98765 43210

---

**Eventzz Planet** - Creating Unforgettable Moments
