from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)
CORS(app)

BASE_URL = "https://hentai20.io/page/{}"
HEADERS = {"User-Agent": "Mozilla/5.0"}
BASE_IMG_URL = "https://img.hentai1.io/"

# =========================
# SCRAPE PAGE DATA (UNCHANGED)
# =========================
def scrape_page(page_no):
    url = BASE_URL.format(page_no)
    res = requests.get(url, headers=HEADERS, timeout=15)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")
    cards = []

    for uta in soup.find_all("div", class_="uta"):
        a_tag = uta.select_one("a.series")
        img_tag = a_tag.find("img") if a_tag else None

        if a_tag and img_tag:
            cards.append({
                "relation": a_tag.get("rel")[0] if a_tag.get("rel") else None,
                "title": a_tag.get("title"),
                "url": a_tag.get("href"),
                "img_url": img_tag.get("src")
            })

    max_page = 1
    pagination = soup.select_one(".pagination-buttons")
    if pagination:
        numbers = pagination.select("a.number")
        if numbers:
            max_page = max(int(a.get_text()) for a in numbers if a.get_text().isdigit())

    return cards, max_page

# =========================
# API ROUTE (UNCHANGED)
# =========================
@app.route("/api/page/<int:page>")
def api_page(page):
    cards, max_page = scrape_page(page)
    return jsonify({
        "cards": cards,
        "max_page": max_page
    })

# =========================
# HOME ROUTE (UNCHANGED)
# =========================
@app.route("/")
def home():
    page = int(request.args.get("page", 1))
    cards, max_page = scrape_page(page)
    return render_template(
        "index.html",
        cards=cards,
        current_page=page,
        max_page=max_page
    )

# =========================
# SCRAPE DETAILS PAGE (UNCHANGED)
# =========================
def scrape_details(url):
    res = requests.get(url, headers=HEADERS, timeout=15)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")
    data = {}

    desc = soup.select_one(".entry-content p")
    data["description"] = desc.get_text(strip=True) if desc else ""

    info = {}
    for row in soup.select("table.infotable tr"):
        tds = row.find_all("td")
        if len(tds) == 2:
            key = tds[0].get_text(strip=True).lower().replace(" ", "_")
            value = tds[1].get_text(strip=True)
            info[key] = value
    data["info"] = info

    data["genres"] = [a.get_text(strip=True) for a in soup.select(".seriestugenre a")]

    chapters = []
    for li in soup.select("#chapterlist li"):
        a = li.select_one("a")
        if not a:
            continue
        num = a.select_one(".chapternum")
        date = a.select_one(".chapterdate")
        title = (num.get_text(strip=True) if num else "")
        date_text = (date.get_text(strip=True) if date else "")
        chapters.append({
            "title": f"{title} __ {date_text}".strip(),
            "url": a.get("href")
        })

    data["chapters"] = chapters
    return data

# =========================
# NEW: GET FIRST IMAGE OF A CHAPTER
# =========================
# =========================
# NEW: GET FIRST IMAGE OF A CHAPTER (FIXED)
# =========================
@app.route("/api/chapter-first-image")
def chapter_first_image():
    chapter_url = request.args.get("url")
    if not chapter_url:
        return jsonify({"error": "Missing chapter URL"}), 400
    print(chapter_url)

    try:
        res = requests.get(chapter_url, headers=HEADERS, timeout=10)
        if res.status_code == 404:
            return jsonify({"error": "Chapter URL not found"}), 404

        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")

        # Look inside #readerarea for the first image
        img_tag = soup.select_one("#readerarea img.ts-main-image")
        if not img_tag or not img_tag.get("src"):
            return jsonify({"error": "No image found"}), 404

        first_img_url = img_tag["src"]
        parts = first_img_url.replace(BASE_IMG_URL, "").rsplit("/", 1)
        folder_path = parts[0]
        first_img_file = parts[1]

        return jsonify({
            "folder_path": folder_path,
            "first_img_file": first_img_file,
            "base_url": BASE_IMG_URL
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# DETAILS ROUTE (UNCHANGED)
# =========================
@app.route("/details")
def details():
    url = request.args.get("url")
    img_url = request.args.get("img_url")
    title = request.args.get("title")
    relation = request.args.get("relation")

    if not url:
        return "Missing URL", 400

    data = scrape_details(url)
    return render_template(
        "details.html",
        data=data,
        img_url=img_url,
        title=title,
        relation=relation
    )

if __name__ == "__main__":
    app.run(debug=True)
