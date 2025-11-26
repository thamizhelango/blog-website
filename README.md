# Blog Collection Website

A static website to display and search through blog posts with card-based layout, search functionality, and tag filtering.

## Features

- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🔍 **Search**: Search blogs by title or tags
- 🏷️ **Tag Filtering**: Filter blogs by clicking on tags
- 🎨 **Modern UI**: Clean, card-based layout with smooth animations
- ⚡ **Fast**: Pure HTML, CSS, and JavaScript - no frameworks required

## Setup

1. **Add your blog data**: Edit `blogs.json` and add all 510 blog entries in the following format:

```json
[
    {
        "url": "https://thamizhelango.medium.com/your-blog-url",
        "title": "Your Blog Title",
        "thumbnail": "https://your-image-url.com/image.jpg",
        "tags": ["Tag1", "Tag2", "Tag3"]
    }
]
```

2. **Open the website**: Simply open `index.html` in a web browser, or use a local server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

## File Structure

```
blog-site/
├── index.html      # Main HTML file
├── styles.css      # Stylesheet
├── script.js       # JavaScript functionality
├── blogs.json      # Blog data (you'll populate this)
└── README.md       # This file
```

## Usage

- **Search**: Type in the search box to filter blogs by title or tags
- **Filter by Tags**: Click on any tag button to filter blogs by that tag. Click again to remove the filter
- **Clear Filters**: Click "Clear Filters" to reset all filters and search
- **View Blog**: Click on any card to open the blog in a new tab

## Customization

You can customize the appearance by modifying `styles.css`. The CSS uses CSS variables for easy theming:

- `--primary-color`: Main accent color
- `--background`: Page background color
- `--card-background`: Card background color
- And more...

## Browser Support

Works on all modern browsers (Chrome, Firefox, Safari, Edge).

