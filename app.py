import logging
import time
import traceback

from flask import Flask, jsonify, render_template, request

from scraper import (
    get_html,
    extract_sample_image,
    generate_chapter_images
)

from manga_listing_scraper import get_page_data

app = Flask(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s"
)

logger = logging.getLogger(__name__)

@app.before_request
def before_request():
    logger.info(
        f"[REQUEST] {request.method} {request.path}"
    )

@app.route("/")
def home():

    try:

        logger.info(
            "[HOME] Rendering dashboard"
        )

        return render_template(
            "index.html"
        )

    except Exception:

        logger.exception(
            "[HOME ERROR]"
        )

        return (
            "Internal Server Error",
            500
        )

@app.route("/viewer")
def viewer():

    try:

        url = request.args.get(
            "url",
            ""
        )

        logger.info(
            f"[VIEWER] URL={url}"
        )

        return render_template(
            "viewer.html",
            url=url
        )

    except Exception:

        logger.exception(
            "[VIEWER ERROR]"
        )

        return (
            "Viewer Error",
            500
        )

@app.route("/api/home")
def api_home():

    try:

        page = int(
            request.args.get(
                "page",
                1
            )
        )

        logger.info(
            f"[HOME API] PAGE={page}"
        )

        data = get_page_data(page)

        return jsonify(data)

    except Exception as e:

        logger.exception(
            "[HOME API ERROR]"
        )

        return jsonify({
            "success": False,
            "message": "Failed to load homepage",
            "error": str(e)
        }), 500

@app.route("/load", methods=["POST"])
def load_chapter():

    start_time = time.time()

    try:

        url = request.form.get(
            "url",
            ""
        ).strip()

        chapter = int(
            request.form.get(
                "chapter",
                1
            )
        )

        limit = int(
            request.form.get(
                "limit",
                50
            )
        )

        if not url:

            logger.warning(
                "[LOAD] Empty URL"
            )

            return jsonify({
                "success": False,
                "message": "URL is required"
            }), 400

        if chapter <= 0:

            logger.warning(
                f"[LOAD] Invalid chapter: {chapter}"
            )

            return jsonify({
                "success": False,
                "message": "Invalid chapter"
            }), 400

        if limit <= 0 or limit > 300:

            logger.warning(
                f"[LOAD] Invalid limit: {limit}"
            )

            return jsonify({
                "success": False,
                "message": (
                    "Limit must be between 1 and 300"
                )
            }), 400

        logger.info(
            f"[LOAD] URL={url} | "
            f"CHAPTER={chapter} | "
            f"LIMIT={limit}"
        )

        logger.info(
            "[SCRAPER] Fetching HTML..."
        )

        html = get_html(url)

        logger.info(
            "[SCRAPER] Extracting sample image..."
        )

        sample_image = extract_sample_image(
            html
        )

        if not sample_image:

            logger.warning(
                "[SCRAPER] No sample image found"
            )

            return jsonify({
                "success": False,
                "message": (
                    "Could not detect sample image"
                )
            }), 404

        logger.info(
            f"[SCRAPER] Sample={sample_image}"
        )

        logger.info(
            "[SCRAPER] Generating images..."
        )

        images = generate_chapter_images(
            sample_image,
            chapter,
            limit
        )

        total_time = round(
            time.time() - start_time,
            2
        )

        logger.info(
            f"[SUCCESS] Chapter {chapter} "
            f"loaded with "
            f"{len(images)} images "
            f"in {total_time}s"
        )

        return jsonify({
            "success": True,
            "images": images,
            "chapter": chapter,
            "sample": sample_image,
            "count": len(images),
            "load_time": total_time
        })

    except ValueError:

        logger.exception(
            "[VALUE ERROR]"
        )

        return jsonify({
            "success": False,
            "message": "Invalid numeric input"
        }), 400

    except Exception as e:

        logger.error(
            "[LOAD ERROR]"
        )

        logger.error(str(e))

        logger.error(
            traceback.format_exc()
        )

        return jsonify({
            "success": False,
            "message": "Internal server error",
            "error": str(e)
        }), 500

@app.route("/health")
def health():

    return jsonify({
        "success": True,
        "status": "running"
    })

@app.route("/api/status")
def api_status():

    return jsonify({
        "success": True,
        "service": "Hentai Manga Dashboard API",
        "version": "3.0.0"
    })

@app.errorhandler(404)
def not_found(e):

    return jsonify({
        "success": False,
        "message": "Route not found"
    }), 404

@app.errorhandler(500)
def internal_error(e):

    logger.exception(
        "[500 ERROR]"
    )

    return jsonify({
        "success": False,
        "message": "Internal server error"
    }), 500

if __name__ == "__main__":

    logger.info(
        "================================="
    )

    logger.info(
        "Starting Hentai Manga Dashboard"
    )

    logger.info(
        "Server: http://127.0.0.1:5000"
    )

    logger.info(
        "================================="
    )

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        threaded=True
    )