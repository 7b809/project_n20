import re
import requests
from bs4 import BeautifulSoup

from config import HEADERS, TIMEOUT
from utils import pad_image


def get_html(url):
    response = requests.get(
        url,
        headers=HEADERS,
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.text


def extract_sample_image(html):

    soup = BeautifulSoup(html, "html.parser")

    images = soup.find_all("img")

    for img in images:

        src = img.get("src", "")

        if re.search(r"https://img\.hentai\d+\.io/", src):
            return src

    return None


def build_image_url(sample_image, chapter, index):

    match = re.search(
        r"(https://img\.hentai\d+\.io/.+/chapter-)(\d+)(/.+)",
        sample_image
    )

    if not match:
        return None

    base = match.group(1)

    extension_match = re.search(
        r"\.(jpg|jpeg|png|webp)$",
        sample_image
    )

    ext = extension_match.group(1)

    return f"{base}{chapter}/{pad_image(index)}.{ext}"


def validate_image(url):

    try:
        response = requests.get(
            url,
            headers=HEADERS,
            timeout=5
        )

        return response.status_code == 200

    except:
        return False


def generate_chapter_images(
    sample_image,
    chapter,
    limit=50
):

    valid_images = []

    for i in range(1, limit + 1):

        img_url = build_image_url(
            sample_image,
            chapter,
            i
        )

        if validate_image(img_url):
            valid_images.append(img_url)
        else:
            break

    return valid_images
