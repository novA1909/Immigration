# Eventzz Planet - Deployment Guide

## 🌐 Live Hosting Options

### Option 1: GitHub Pages (Recommended)

**Step 1: Enable GitHub Pages**
1. Go to your repository: https://github.com/novA1909/Immigration
2. Click **Settings** → **Pages**
3. Under "Source", select branch and folder
4. Click **Save**

**Your live URL will be:**
```
https://nova1909.github.io/Immigration/frontend/
```

**Alternative: Custom Domain**
- Buy a domain (e.g., `eventzzplanet.com`)
- In GitHub Pages settings, add your custom domain
- Update DNS records with your domain provider

---

### Option 2: Netlify (Easiest)

**Method A: Drag & Drop (Fastest - 2 minutes)**

1. Visit: https://app.netlify.com/drop
2. Drag the `frontend` folder onto the page
3. Wait for upload to complete
4. Get your live URL: `https://random-name.netlify.app`
5. Optional: Change site name to `https://eventzzplanet.netlify.app`

**Method B: Connect GitHub (Best for updates)**

1. Visit: https://netlify.com
2. Sign up with GitHub account
3. Click **"New site from Git"**
4. Choose **GitHub** → Select your repository
5. Configure build settings:
   ```
   Base directory: frontend
   Build command: (leave empty)
   Publish directory: frontend
   ```
6. Click **"Deploy site"**
7. Your site is live at: `https://[site-name].netlify.app`

**Custom Domain on Netlify:**
- Go to Site Settings → Domain Management
- Add custom domain (e.g., `www.eventzzplanet.com`)
- Follow DNS configuration instructions

---

### Option 3: Vercel

1. Visit: https://vercel.com
2. Sign up with GitHub
3. Click **"New Project"**
4. Import your repository: `novA1909/Immigration`
5. Configure:
   ```
   Framework Preset: Other
   Root Directory: frontend
   Build Command: (leave empty)
   Output Directory: (leave empty)
   ```
6. Click **"Deploy"**
7. Live at: `https://immigration.vercel.app`

**Custom Domain on Vercel:**
- Go to Project Settings → Domains
- Add your custom domain
- Update DNS records

---

### Option 4: Cloudflare Pages

1. Visit: https://pages.cloudflare.com
2. Sign in/Sign up
3. Click **"Create a project"**
4. Connect GitHub account
5. Select repository: `novA1909/Immigration`
6. Configure build:
   ```
   Framework preset: None
   Build output directory: frontend
   Root directory: frontend
   ```
7. Click **"Save and Deploy"**
8. Live at: `https://immigration.pages.dev`

---

## 🚀 Quick Deploy Commands

### Deploy to GitHub Pages

```bash
# Navigate to your project
cd /home/user/Immigration

# Create and switch to gh-pages branch
git checkout -b gh-pages

# Push to GitHub
git push -u origin gh-pages

# Enable GitHub Pages in repository settings
```

### Deploy to Netlify via CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Navigate to frontend folder
cd /home/user/Immigration/frontend

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=.
```

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure:

- [ ] Logo file is in `frontend/images/eventzz-planet-logo.png`
- [ ] All images are optimized (compressed)
- [ ] Contact form email is configured (if using backend)
- [ ] Social media links are updated
- [ ] Phone numbers and addresses are correct
- [ ] Test website locally first
- [ ] Check mobile responsiveness

---

## 🔧 After Deployment

### Update Content:
1. Make changes to files locally
2. Commit changes: `git add . && git commit -m "Update content"`
3. Push: `git push`
4. Most hosts auto-deploy on push!

### Performance Optimization:
- Enable HTTPS (usually automatic)
- Compress images before uploading
- Use CDN (included with most hosts)
- Enable caching

---

## 🌐 Custom Domain Setup

### Purchase Domain:
- Namecheap: https://www.namecheap.com
- GoDaddy: https://www.godaddy.com
- Google Domains: https://domains.google

### Connect Domain to Your Host:

**For Netlify:**
1. Add domain in Netlify dashboard
2. Update DNS records:
   ```
   Type: A
   Name: @
   Value: 75.2.60.5

   Type: CNAME
   Name: www
   Value: [your-site].netlify.app
   ```

**For Vercel:**
1. Add domain in Vercel dashboard
2. Update DNS records:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

**For GitHub Pages:**
1. Create CNAME file in repository root
2. Add your domain inside
3. Update DNS records:
   ```
   Type: A
   Name: @
   Value: 185.199.108.153

   Type: CNAME
   Name: www
   Value: nova1909.github.io
   ```

---

## 📱 Testing Your Live Site

After deployment, test:
- [ ] All pages load correctly
- [ ] Navigation works
- [ ] Forms submit properly
- [ ] Images display
- [ ] Mobile responsiveness
- [ ] Different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Page speed: https://pagespeed.web.dev

---

## 🆘 Troubleshooting

**Site not loading?**
- Check deployment logs
- Verify file paths (case-sensitive on Linux servers)
- Clear browser cache
- Wait 5-10 minutes for DNS propagation

**Images not showing?**
- Check file paths are correct
- Verify images exist in deployment
- Check browser console for errors

**Need Help?**
- Netlify Support: https://answers.netlify.com
- Vercel Support: https://vercel.com/support
- GitHub Pages Docs: https://docs.github.com/pages

---

## 📊 Recommended Choice

**For Eventzz Planet, I recommend:**

1. **Netlify** - Best for ease of use and features
   - Free SSL certificate
   - Auto-deploy on git push
   - Form handling built-in
   - Easy custom domain setup
   - Great performance

**Steps:**
1. Go to https://app.netlify.com/drop
2. Drag `frontend` folder
3. Get instant URL
4. Optional: Add custom domain later

---

**Your website will be live in under 5 minutes!** 🎉

For any issues, refer to this guide or contact the hosting provider's support.
