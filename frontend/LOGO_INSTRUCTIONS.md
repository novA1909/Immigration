# Adding the Eventzz Planet Logo

## Quick Setup

Follow these simple steps to add your logo to the website:

### Step 1: Save the Logo File

1. Save your logo image as `eventzz-planet-logo.png`
2. Place it in the `frontend/images/` directory

**Important:** The logo should be in PNG format with a transparent background for best results.

### Step 2: Verify the File Path

Make sure the file is located at:
```
frontend/images/eventzz-planet-logo.png
```

### Step 3: Open the Website

Open `frontend/index.html` in your browser, and you should see your logo in:
- The navigation bar (top of the page)
- The footer section (bottom of the page)

## Logo Specifications

### Recommended Specifications
- **Format:** PNG (with transparent background)
- **Width:** 400-600px (for high resolution)
- **Height:** Approximately 150-200px
- **Aspect Ratio:** The current logo maintains its original proportions
- **File Size:** Under 200KB for optimal loading

### Alternative Formats
If you prefer to use a different format:
- **SVG:** Best for scalability (edit HTML to change `.png` to `.svg`)
- **JPG:** Use white or light background (not recommended for transparency)

## Logo Styling

The website automatically handles logo sizing:
- **Desktop Navigation:** 50px height
- **Mobile Navigation:** 40px height
- **Footer:** 60px height

### Custom Sizing

To adjust logo sizes, edit `frontend/css/styles.css`:

```css
/* Navigation Logo */
.logo-image {
    height: 50px;  /* Change this value */
    width: auto;
}

/* Footer Logo */
.footer-logo-image {
    height: 60px;  /* Change this value */
    width: auto;
}
```

## Footer Logo Filter

The footer logo has a white filter applied to match the footer's dark background. If you want to use the original colors:

Edit `frontend/css/styles.css` and remove or comment out this line:

```css
.footer-logo-image {
    /* filter: brightness(0) invert(1); */  /* Remove this line */
}
```

## Troubleshooting

### Logo Not Showing?

1. **Check the file path:** Ensure the file is in `frontend/images/eventzz-planet-logo.png`
2. **Check the file name:** It must be exactly `eventzz-planet-logo.png` (case-sensitive on some systems)
3. **Clear browser cache:** Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac) to hard refresh
4. **Check browser console:** Press `F12` and look for any error messages

### Logo Too Large/Small?

Edit the height values in `styles.css` as shown in the "Custom Sizing" section above.

### Logo Quality Issues?

- Use a higher resolution PNG (at least 400px width)
- Consider using SVG format for perfect scaling
- Ensure the logo has a transparent background

## Using a Different Logo File Name

If you want to use a different file name, update these lines in `index.html`:

**Navigation (around line 18):**
```html
<img src="images/YOUR-LOGO-NAME.png" alt="Eventzz Planet">
```

**Footer (around line 485):**
```html
<img src="images/YOUR-LOGO-NAME.png" alt="Eventzz Planet">
```

## Need Help?

If you encounter any issues or need assistance with logo integration, please check:
- Browser developer console (F12) for errors
- File permissions (ensure the image file is readable)
- Image file integrity (try opening it in an image viewer first)

---

**Eventzz Planet** - Creating Unforgettable Moments
