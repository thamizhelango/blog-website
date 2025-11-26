#!/usr/bin/env python3
"""
Script to download images from Medium blog posts and save them with the correct names.
"""

import json
import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import time
from pathlib import Path

# Configuration
BLOGS_JSON = 'blogs.json'
ASSETS_FOLDER = 'assets'
DELAY_BETWEEN_REQUESTS = 1  # seconds to wait between requests
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

def get_image_from_medium(url):
    """
    Extract the main image URL from a Medium blog post.
    Tries multiple methods:
    1. Open Graph meta tag (og:image)
    2. Twitter card meta tag (twitter:image)
    3. First large image in article content
    4. JSON-LD structured data
    """
    try:
        headers = {'User-Agent': USER_AGENT}
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Method 1: Try Open Graph image
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            img_url = og_image['content']
            # Remove query parameters and resize parameters from Medium URLs
            img_url = re.sub(r'\?.*$', '', img_url)
            img_url = re.sub(r'/resize:[^/]+', '', img_url)
            return img_url
        
        # Method 2: Try Twitter card image
        twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
        if twitter_image and twitter_image.get('content'):
            img_url = twitter_image['content']
            img_url = re.sub(r'\?.*$', '', img_url)
            img_url = re.sub(r'/resize:[^/]+', '', img_url)
            return img_url
        
        # Method 3: Try JSON-LD structured data
        json_ld = soup.find('script', type='application/ld+json')
        if json_ld:
            try:
                data = json.loads(json_ld.string)
                if isinstance(data, dict):
                    if 'image' in data:
                        img_url = data['image']
                        if isinstance(img_url, dict) and 'url' in img_url:
                            img_url = img_url['url']
                        img_url = re.sub(r'\?.*$', '', str(img_url))
                        img_url = re.sub(r'/resize:[^/]+', '', img_url)
                        return img_url
            except:
                pass
        
        # Method 4: Find first large image in article
        article_images = soup.find_all('img', src=True)
        for img in article_images:
            src = img.get('src', '')
            # Look for Medium CDN images (miro.medium.com)
            if 'miro.medium.com' in src or 'cdn-images' in src:
                # Get the original image URL (remove resize parameters)
                img_url = re.sub(r'\?.*$', '', src)
                img_url = re.sub(r'/resize:[^/]+', '', img_url)
                # Prefer larger images (check for size indicators)
                if any(size in img_url for size in ['828', '1400', '2000', '4800']):
                    return img_url
        
        # If no specific image found, return first Medium image
        for img in article_images:
            src = img.get('src', '')
            if 'miro.medium.com' in src or 'cdn-images' in src:
                img_url = re.sub(r'\?.*$', '', src)
                img_url = re.sub(r'/resize:[^/]+', '', img_url)
                return img_url
        
        return None
        
    except Exception as e:
        print(f"  Error fetching {url}: {str(e)}")
        return None

def download_image(image_url, save_path):
    """Download an image from URL and save it to the specified path."""
    try:
        headers = {'User-Agent': USER_AGENT}
        response = requests.get(image_url, headers=headers, timeout=30, stream=True)
        response.raise_for_status()
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        # Download and save
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return True
    except Exception as e:
        print(f"  Error downloading image: {str(e)}")
        return False

def main():
    """Main function to process all blog entries."""
    # Load blogs.json
    print("Loading blogs.json...")
    try:
        with open(BLOGS_JSON, 'r', encoding='utf-8') as f:
            blogs = json.load(f)
    except Exception as e:
        print(f"Error loading {BLOGS_JSON}: {e}")
        return
    
    print(f"Found {len(blogs)} blog entries\n")
    
    # Ensure assets folder exists
    os.makedirs(ASSETS_FOLDER, exist_ok=True)
    
    # Process each blog entry
    downloaded = 0
    skipped = 0
    failed = 0
    
    for i, blog in enumerate(blogs, 1):
        url = blog.get('url', '')
        thumbnail = blog.get('thumbnail', '')
        title = blog.get('title', 'Untitled')
        
        if not url or not thumbnail:
            print(f"[{i}/{len(blogs)}] Skipping entry (missing URL or thumbnail)")
            skipped += 1
            continue
        
        # Extract filename from thumbnail path
        filename = os.path.basename(thumbnail)
        save_path = os.path.join(ASSETS_FOLDER, filename)
        
        # Check if image already exists
        if os.path.exists(save_path):
            print(f"[{i}/{len(blogs)}] ✓ Already exists: {filename}")
            skipped += 1
            continue
        
        print(f"[{i}/{len(blogs)}] Processing: {title[:60]}...")
        print(f"  URL: {url}")
        print(f"  Expected filename: {filename}")
        
        # Get image URL from Medium
        image_url = get_image_from_medium(url)
        
        if not image_url:
            print(f"  ✗ Could not find image URL")
            failed += 1
            continue
        
        print(f"  Found image: {image_url[:80]}...")
        
        # Download image
        if download_image(image_url, save_path):
            print(f"  ✓ Downloaded: {filename}")
            downloaded += 1
        else:
            print(f"  ✗ Failed to download")
            failed += 1
        
        # Be nice to Medium's servers
        if i < len(blogs):
            time.sleep(DELAY_BETWEEN_REQUESTS)
        
        print()
    
    # Summary
    print("=" * 60)
    print("Summary:")
    print(f"  Downloaded: {downloaded}")
    print(f"  Skipped (already exists): {skipped}")
    print(f"  Failed: {failed}")
    print(f"  Total processed: {len(blogs)}")
    print("=" * 60)

if __name__ == '__main__':
    main()

