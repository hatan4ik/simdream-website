import urllib.request
import xml.etree.ElementTree as ET
import re
import json
import urllib.parse
import sys

sitemap_url = "https://www.simdream.co.il/blog-posts-sitemap.xml"
req = urllib.request.Request(sitemap_url, headers={"User-Agent": "Mozilla/5.0"})
xml_data = urllib.request.urlopen(req).read()
root = ET.fromstring(xml_data)

items = []
for url in root.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url"):
    loc = url.find("{http://www.sitemaps.org/schemas/sitemap/0.9}loc").text
    lastmod = url.find("{http://www.sitemaps.org/schemas/sitemap/0.9}lastmod").text
    img = url.find("{http://www.google.com/schemas/sitemap-image/1.1}image")
    img_loc = img.find("{http://www.google.com/schemas/sitemap-image/1.1}loc").text if img is not None else ""
    slug = loc.split("/post/")[-1]
    items.append({"loc": loc, "slug": slug, "lastmod": lastmod, "coverImage": img_loc})

print(f"Total posts to harvest: {len(items)}")

posts = []
for i, item in enumerate(items):
    slug = item["slug"]
    url = "https://www.simdream.co.il/post/" + urllib.parse.quote(slug)
    try:
        r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(r, timeout=15).read().decode("utf-8")
    except Exception as e:
        print(f"Error fetching {slug}: {e}")
        continue

    # JSON-LD extraction
    title = ""
    description = ""
    date_published = item["lastmod"]
    scripts = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
    for s in scripts:
        try:
            data = json.loads(s)
            if isinstance(data, dict) and data.get("@type") == "BlogPosting":
                title = data.get("headline", title)
                description = data.get("description", description)
                date_published = data.get("datePublished", date_published)
        except Exception:
            pass

    if not title:
        m = re.search(r"<title>(.*?)</title>", html)
        title = m.group(1).split(" | ")[0] if m else slug

    read_time_m = re.search(r"זמן קריאה\s*(\d+)\s*דקות", html)
    read_time = int(read_time_m.group(1)) if read_time_m else 4

    article_m = re.search(r"<article[^>]*>(.*?)</article>", html, re.DOTALL)
    article_html = article_m.group(1) if article_m else html

    # Extract structured content nodes: headings, paragraphs, lists
    nodes = []
    pattern = re.compile(r"<(h2|h3|p|ul)[^>]*>(.*?)</\1>", re.DOTALL)
    for tag, content in pattern.findall(article_html):
        clean_text = re.sub(r"<[^>]+>", "", content).strip()
        if not clean_text or len(clean_text) < 3:
            continue
        if "זמן קריאה" in clean_text or ("Sim Dream" in clean_text and len(clean_text) < 30):
            continue
        if tag in ("h2", "h3"):
            nodes.append({"type": "heading", "level": 2 if tag == "h2" else 3, "text": clean_text})
        elif tag == "ul":
            li_items = [re.sub(r"<[^>]+>", "", li).strip() for li in re.findall(r"<li[^>]*>(.*?)</li>", content, re.DOTALL)]
            li_items = [li for li in li_items if li]
            if li_items:
                nodes.append({"type": "list", "items": li_items})
        elif tag == "p":
            nodes.append({"type": "paragraph", "text": clean_text})

    lower_slug = slug.lower()
    lower_title = title.lower()
    
    if any(k in lower_slug or k in lower_title for k in ["ראיון", "מיונים", "fmc", "atpl", "מערכות-מטוס"]):
        category = "airline_prep"
        cta_target = "pro"
    elif any(k in lower_slug or k in lower_title for k in ["פחד", "חרד"]):
        category = "fear_of_flying"
        cta_target = "fear_of_flying"
    elif any(k in lower_slug or k in lower_title for k in ["מתנה", "יום-הולדת", "זוג", "דייט", "שובר", "הפתע", "אירוע"]):
        category = "gifts_and_events"
        cta_target = "vouchers"
    elif any(k in lower_slug or k in lower_title for k in ["קאי-טאק", "אינסברוק", "רוח-צד", "נחית", "טייס-אוטומטי", "שדות"]):
        category = "cockpit_skills"
        cta_target = "experiences"
    else:
        category = "aviation_knowledge"
        cta_target = "general_booking"

    clean_title = title.replace(" | SimDream", "").replace(" | Sim Dream", "").strip()
    excerpt = description or (nodes[0]["text"] if nodes else "")

    posts.append({
        "id": f"post-{i+1:02d}",
        "slug": slug,
        "title": clean_title,
        "excerpt": excerpt,
        "coverImage": item["coverImage"],
        "datePublished": date_published[:10],
        "readingTimeMinutes": read_time,
        "category": category,
        "ctaTarget": cta_target,
        "contentNodes": nodes
    })
    print(f"[{i+1}/{len(items)}] {clean_title} (nodes: {len(nodes)})")

output_file = "lib/data/blog-posts.json"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(posts, f, ensure_ascii=False, indent=2)

print(f"Saved {output_file} with {len(posts)} posts")

