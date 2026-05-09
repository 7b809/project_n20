import logging
import traceback
import time

from flask import (
    Flask,
    render_template,
    request,
    jsonify
)

from scraper import (
    get_html,
    extract_sample_image,
    generate_chapter_images
)



# =========================================
# FLASK APP
# =========================================

app = Flask(__name__)



# =========================================
# LOGGING SETUP
# =========================================

logging.basicConfig(
    level=logging.INFO,
    format=(
        "[%(asctime)s] "
        "[%(levelname)s] "
        "%(message)s"
    )
)

logger = logging.getLogger(__name__)



# =========================================
# BEFORE REQUEST LOGGER
# =========================================

@app.before_request
def before_request():

    logger.info(
        f"[REQUEST] "
        f"{request.method} "
        f"{request.path}"
    )



# =========================================
# HOME PAGE
# =========================================

@app.route("/", methods=["GET"])
def home():

    try:

        logger.info(
            "[HOME] "
            "Rendering index page"
        )

        return render_template(
            "index.html"
        )

    except Exception as e:

        logger.exception(
            "[HOME ERROR]"
        )

        return (
            "Internal Server Error",
            500
        )



# =========================================
# LOAD CHAPTER API
# =========================================

@app.route("/load", methods=["POST"])
def load_chapter():

    start_time = time.time()

    try:

        url = request.form.get("url", "").strip()

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



        # =============================
        # VALIDATIONS
        # =============================

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
                f"[LOAD] Invalid chapter: "
                f"{chapter}"
            )

            return jsonify({
                "success": False,
                "message": "Invalid chapter"
            }), 400



        if limit <= 0 or limit > 300:

            logger.warning(
                f"[LOAD] Invalid limit: "
                f"{limit}"
            )

            return jsonify({
                "success": False,
                "message": (
                    "Limit must be "
                    "between 1 and 300"
                )
            }), 400



        logger.info(
            f"[LOAD] "
            f"URL={url} | "
            f"CHAPTER={chapter} | "
            f"LIMIT={limit}"
        )



        # =============================
        # FETCH HTML
        # =============================

        logger.info(
            "[SCRAPER] "
            "Fetching HTML..."
        )

        html = get_html(url)



        # =============================
        # SAMPLE IMAGE
        # =============================

        logger.info(
            "[SCRAPER] "
            "Extracting sample image..."
        )

        sample_image = extract_sample_image(
            html
        )



        if not sample_image:

            logger.warning(
                "[SCRAPER] "
                "No sample image found"
            )

            return jsonify({
                "success": False,
                "message": (
                    "Could not detect "
                    "sample image"
                )
            }), 404



        logger.info(
            f"[SCRAPER] "
            f"Sample Image: "
            f"{sample_image}"
        )



        # =============================
        # GENERATE IMAGES
        # =============================

        logger.info(
            "[SCRAPER] "
            "Generating chapter images..."
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
            f"[SUCCESS] "
            f"Chapter {chapter} "
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



    except ValueError as e:

        logger.exception(
            "[VALUE ERROR]"
        )

        return jsonify({
            "success": False,
            "message": (
                "Invalid numeric input"
            )
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

            "message": (
                "Internal server error"
            ),

            "error": str(e)

        }), 500



# =========================================
# VIEWER PAGE
# =========================================

@app.route("/viewer")
def viewer():

    try:

        logger.info(
            "[VIEWER] "
            "Rendering viewer"
        )

        return render_template(
            "viewer.html"
        )

    except Exception:

        logger.exception(
            "[VIEWER ERROR]"
        )

        return (
            "Viewer Error",
            500
        )



# =========================================
# HEALTH CHECK
# =========================================

@app.route("/health")
def health():

    return jsonify({

        "success": True,

        "status": "running"

    })



# =========================================
# API STATUS
# =========================================

@app.route("/api/status")
def api_status():

    return jsonify({

        "success": True,

        "service": (
            "Hentai Manga Reader API"
        ),

        "version": "1.0.0"

    })



# =========================================
# GLOBAL ERROR HANDLER
# =========================================

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

        "message": (
            "Internal server error"
        )

    }), 500



# =========================================
# MAIN
# =========================================

if __name__ == "__main__":

    logger.info(
        "================================="
    )

    logger.info(
        "Starting Hentai Manga Reader"
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