import json
import requests

from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

HEADERS = {
    "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "upgrade-insecure-requests": "1",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/147.0.0.0 Safari/537.36"
    ),
    "Referer": "https://hentai20.io/"
}

BASE_URL = "https://hentai20.io"

def parse_manga(item):

    try:

        title_tag = item.select_one("a.series h4")
        manga_link_tag = item.select_one("a.series")
        image_tag = item.select_one("img")
        status_tag = item.select_one(".statusind")

        chapters = []

        for li in item.select("ul li"):

            chapter_a = li.select_one("a")
            time_span = li.select_one("span")

            chapters.append({
                "chapter_title": chapter_a.get_text(strip=True) if chapter_a else "",
                "chapter_url": chapter_a["href"] if chapter_a else "",
                "time": time_span.get_text(strip=True) if time_span else ""
            })

        return {
            "title": title_tag.get_text(strip=True) if title_tag else "",
            "manga_url": manga_link_tag["href"] if manga_link_tag else "",
            "image_url": image_tag["src"] if image_tag else "",
            "status": status_tag.get_text(strip=True) if status_tag else "",
            "chapters": chapters
        }

    except Exception as e:

        print("Parse Error:", e)

        return None

def get_max_pagination(soup):

    try:

        numbers = []

        for a in soup.select(".pagination-buttons a.number"):

            text = a.get_text(strip=True)

            if text.isdigit():
                numbers.append(int(text))

        current = soup.select_one(".pagination-buttons .current")

        if current and current.get_text(strip=True).isdigit():
            numbers.append(int(current.get_text(strip=True)))

        return max(numbers) if numbers else 1

    except:
        return 1

def get_page_data(page=1):

    url = f"{BASE_URL}/page/{page}/"

    response = requests.get(
        url,
        headers=HEADERS,
        timeout=30
    )

    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    manga_items = soup.select("div.utao.styletwo")

    data = []

    with ThreadPoolExecutor(max_workers=10) as executor:

        results = executor.map(
            parse_manga,
            manga_items
        )

        for result in results:

            if result:
                data.append(result)

    return {
        "success": True,
        "page": page,
        "max_pagination": get_max_pagination(soup),
        "count": len(data),
        "data": data
    }


# # Example Usage
# if __name__ == "__main__":

#     result = get_page_data(2)
#     with open("data.json",'w',encoding='utf-8')as f:
#         json.dump(result,f,indent=4)
