const form = document.getElementById("loadForm");
const mangaGrid = document.getElementById("mangaGrid");
const refreshBtn = document.getElementById("refreshBtn");
const paginationContainer = document.getElementById("paginationContainer");

const viewerContainer = document.getElementById("viewerContainer");
const chapterButtons = document.getElementById("chapterButtons");
const prevChapterBtn = document.getElementById("prevChapterBtn");
const nextChapterBtn = document.getElementById("nextChapterBtn");
const reloadBtn = document.getElementById("reloadBtn");

let currentUrl = "";
let currentChapter = 1;
let currentPage = 1;
let isLoading = false;
let loadedChapters = new Set();
let chapterObserver = null;

window.onload = () => {

    initializeDashboard();
    initializeViewer();
};

function initializeDashboard() {

    if (!mangaGrid) {
        return;
    }

    loadHomepage();

    if (refreshBtn) {

        refreshBtn.onclick = () => {
            loadHomepage(currentPage);
        };
    }

    if (form) {

        form.addEventListener("submit", (e) => {

            e.preventDefault();

            const url =
                document.getElementById("url")
                    .value
                    .trim();

            if (!url) {
                return;
            }

            window.location.href =
                `/viewer?url=${encodeURIComponent(url)}`;
        });
    }
}

function initializeViewer() {

    if (!viewerContainer) {
        return;
    }

    currentUrl =
        document.getElementById("url")
            ?.value
            ?.trim() || "";

    if (prevChapterBtn) {
        prevChapterBtn.style.display = "none";
    }

    if (nextChapterBtn) {
        nextChapterBtn.style.display = "none";
    }

    if (reloadBtn) {

        reloadBtn.onclick = () => {

            currentUrl =
                document.getElementById("url")
                    .value
                    .trim();

            currentChapter = parseInt(
                document.getElementById("chapter")
                    .value
            );

            viewerContainer.innerHTML = "";
            chapterButtons.innerHTML = "";

            loadedChapters.clear();

            loadChapter(currentChapter);
        };
    }

    if (currentUrl) {
        loadChapter(1);
    }

    initializeInfiniteScroll();
    initializeKeyboardNavigation();
}

async function loadHomepage(page = 1) {

    currentPage = page;

    mangaGrid.innerHTML = `
        <div class="col-12 text-center py-5">

            <div class="spinner-border text-light"></div>

            <div class="mt-3 text-secondary">
                Loading Manga Dashboard...
            </div>

        </div>
    `;

    try {

        const response =
            await fetch(
                `/api/home?page=${page}`
            );

        const data =
            await response.json();

        if (!data.success) {

            mangaGrid.innerHTML = `
                <div class="alert alert-danger">
                    Failed To Load Homepage
                </div>
            `;

            return;
        }

        renderMangaCards(data.data);

        renderPagination(
            data.max_pagination,
            page
        );

    } catch (error) {

        mangaGrid.innerHTML = `
            <div class="alert alert-danger">
                ${error}
            </div>
        `;
    }
}

function renderMangaCards(items) {

    mangaGrid.innerHTML = "";

    items.forEach((item) => {

        const chapterUrl =
            item.chapters?.[0]?.chapter_url || "";

        const chapterTitle =
            item.chapters?.[0]?.chapter_title || "Read";

        mangaGrid.innerHTML += `
            <div class="col-xl-3 col-lg-4 col-md-6 col-12">

                <div class="manga-card">

                    <img
                        src="${item.image_url}"
                        class="manga-cover"
                        loading="lazy"
                    >

                    <div class="p-3">

                        <div class="manga-title">
                            ${item.title}
                        </div>

                        <div class="manga-status">
                            ${item.status}
                        </div>

                        <button
                            class="btn btn-primary w-100 mt-3"
                            onclick="openManga('${chapterUrl}')"
                        >
                            ${chapterTitle}
                        </button>

                    </div>

                </div>

            </div>
        `;
    });
}

function renderPagination(max, current) {

    if (!paginationContainer) {
        return;
    }

    paginationContainer.innerHTML = "";

    let pages = [];

    // FIRST 3

    for (let i = 1; i <= 3; i++) {

        if (i <= max) {
            pages.push(i);
        }
    }

    // LEFT DOTS

    if (current > 5) {
        pages.push("...");
    }

    // CURRENT AREA

    for (
        let i = current - 1;
        i <= current + 1;
        i++
    ) {

        if (
            i > 3 &&
            i < max - 2
        ) {
            pages.push(i);
        }
    }

    // RIGHT DOTS

    if (current < max - 4) {
        pages.push("...");
    }

    // LAST 3

    for (
        let i = max - 2;
        i <= max;
        i++
    ) {

        if (i > 3) {
            pages.push(i);
        }
    }

    pages = [...new Set(pages)];

    pages.forEach((page) => {

        if (page === "...") {

            paginationContainer.innerHTML += `
                <div class="chapter-btn">
                    ...
                </div>
            `;

            return;
        }

        paginationContainer.innerHTML += `
            <button
                class="chapter-btn ${page === current
                ? "active-page"
                : ""
            }"
                onclick="loadHomepage(${page})"
            >
                ${page}
            </button>
        `;
    });
}

function openManga(url) {

    if (!url) {

        showToast(
            "No chapter URL found"
        );

        return;
    }

    window.location.href =
        `/viewer?url=${encodeURIComponent(url)}`;
}

async function loadChapter(chapter) {

    if (
        !currentUrl ||
        isLoading ||
        loadedChapters.has(chapter)
    ) {
        return;
    }

    isLoading = true;

    currentChapter = chapter;

    if (prevChapterBtn) {
        prevChapterBtn.style.display = "flex";
    }

    if (nextChapterBtn) {
        nextChapterBtn.style.display = "flex";
    }

    const limit =
        document.getElementById("limit")
            ?.value || 50;

    const formData = new FormData();

    formData.append(
        "url",
        currentUrl
    );

    formData.append(
        "chapter",
        chapter
    );

    formData.append(
        "limit",
        limit
    );

    viewerContainer.insertAdjacentHTML(
        "beforeend",
        `
        <div class="text-center py-5 chapter-loading">

            <div class="spinner-border text-light"></div>

            <div class="mt-3 text-secondary">
                Loading Chapter ${chapter}
            </div>

        </div>
        `
    );

    try {

        const response =
            await fetch("/load", {
                method: "POST",
                body: formData
            });

        const data =
            await response.json();

        document
            .querySelectorAll(
                ".chapter-loading"
            )
            .forEach((el) => {
                el.remove();
            });

        if (!data.success) {

            viewerContainer.insertAdjacentHTML(
                "beforeend",
                `
                <div class="alert alert-danger">
                    ${data.message}
                </div>
                `
            );

            isLoading = false;

            return;
        }

        if (data.images.length === 0) {

            showToast(
                `No images found for chapter ${chapter}`
            );

            isLoading = false;

            return;
        }

        loadedChapters.add(chapter);

        addChapterButton(chapter);

        let html = `
            <div
                class="chapter-section"
                id="chapter-section-${chapter}"
                data-chapter="${chapter}"
            >

                <div class="chapter-header">

                    <div>

                        <h2 class="fw-bold">
                            Chapter ${chapter}
                        </h2>

                        <div class="text-secondary small">
                            ${data.images.length} Images Loaded
                        </div>

                    </div>

                    <div class="d-flex gap-2">

                        <button
                            class="btn btn-dark btn-sm"
                            onclick="goToChapter(${chapter - 1})"
                        >
                            Prev
                        </button>

                        <button
                            class="btn btn-primary btn-sm"
                            onclick="goToChapter(${chapter + 1})"
                        >
                            Next
                        </button>

                    </div>

                </div>
        `;

        data.images.forEach((img, index) => {

            html += `
                <div class="reader-image-box">

                    <div class="loading-box"></div>

                    <img
                        class="reader-image lazy-image"
                        data-src="${img}"
                        loading="lazy"
                        alt="chapter-${chapter}-${index}"
                    >

                    <div class="image-toolbar">

                        <button
                            class="btn btn-sm btn-primary"
                            onclick="copyImageUrl('${img}')"
                        >
                            Copy
                        </button>

                        <a
                            href="${img}"
                            target="_blank"
                            class="btn btn-sm btn-dark"
                        >
                            Open
                        </a>

                    </div>

                </div>
            `;
        });

        html += `</div>`;

        viewerContainer.insertAdjacentHTML(
            "beforeend",
            html
        );

        initializeLazyLoading();
        observeChapterSections();

        if (data.images.length > 0) {
            addChapterButton(chapter + 1);
        }

        highlightActiveChapterButton(chapter);

        isLoading = false;

    } catch (error) {

        document
            .querySelectorAll(
                ".chapter-loading"
            )
            .forEach((el) => {
                el.remove();
            });

        viewerContainer.insertAdjacentHTML(
            "beforeend",
            `
            <div class="alert alert-danger">
                ${error}
            </div>
            `
        );

        isLoading = false;
    }
}

function initializeLazyLoading() {

    const lazyImages =
        document.querySelectorAll(
            ".lazy-image:not(.loaded)"
        );

    const observer =
        new IntersectionObserver((entries) => {

            entries.forEach((entry) => {

                const img = entry.target;

                if (entry.isIntersecting) {

                    if (!img.src) {
                        img.src = img.dataset.src;
                    }

                    img.classList.add("loaded");

                    img.onload = () => {

                        img.style.opacity = "1";

                        const loader =
                            img.previousElementSibling;

                        if (loader) {
                            loader.remove();
                        }
                    };

                    img.onerror = () => {
                        img.parentElement.remove();
                    };
                }
            });

        }, {
            rootMargin: "1200px"
        });

    lazyImages.forEach((img) => {
        observer.observe(img);
    });
}

function addChapterButton(chapter) {

    if (
        !chapterButtons ||
        chapter <= 0 ||
        document.getElementById(
            `chapter-${chapter}`
        )
    ) {
        return;
    }

    const btn =
        document.createElement("button");

    btn.className = "chapter-btn";

    btn.id = `chapter-${chapter}`;

    btn.innerText = `Chapter ${chapter}`;

    btn.onclick = () => {
        goToChapter(chapter);
    };

    chapterButtons.appendChild(btn);
}

async function goToChapter(chapter) {

    if (chapter <= 0 || !currentUrl) {
        return;
    }

    currentChapter = chapter;

    const existingSection =
        document.getElementById(
            `chapter-section-${chapter}`
        );

    if (existingSection) {

        existingSection.scrollIntoView({
            behavior: "smooth"
        });

        return;
    }

    await loadChapter(chapter);

    setTimeout(() => {

        const newSection =
            document.getElementById(
                `chapter-section-${chapter}`
            );

        if (newSection) {

            newSection.scrollIntoView({
                behavior: "smooth"
            });
        }

    }, 500);
}

function observeChapterSections() {

    if (chapterObserver) {
        chapterObserver.disconnect();
    }

    const sections =
        document.querySelectorAll(
            ".chapter-section"
        );

    chapterObserver =
        new IntersectionObserver((entries) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {

                    const chapter =
                        parseInt(
                            entry.target.dataset.chapter
                        );

                    currentChapter = chapter;

                    highlightActiveChapterButton(
                        chapter
                    );
                }
            });

        }, {
            threshold: 0.4
        });

    sections.forEach((section) => {
        chapterObserver.observe(section);
    });
}

function highlightActiveChapterButton(chapter) {

    document
        .querySelectorAll(".chapter-btn")
        .forEach((btn) => {
            btn.style.background = "#1c2330";
        });

    const activeBtn =
        document.getElementById(
            `chapter-${chapter}`
        );

    if (activeBtn) {
        activeBtn.style.background = "#4f7cff";
    }
}

function initializeInfiniteScroll() {

    window.addEventListener("scroll", () => {

        if (!currentUrl || isLoading) {
            return;
        }

        const scrollPosition =
            window.innerHeight +
            window.scrollY;

        const threshold =
            document.body.offsetHeight - 2500;

        if (scrollPosition >= threshold) {
            loadChapter(currentChapter + 1);
        }
    });
}

function initializeKeyboardNavigation() {

    document.addEventListener("keydown", (e) => {

        if (!currentUrl) {
            return;
        }

        if (e.key === "ArrowRight") {
            goToChapter(currentChapter + 1);
        }

        if (e.key === "ArrowLeft") {
            goToChapter(currentChapter - 1);
        }
    });

    if (prevChapterBtn) {

        prevChapterBtn.onclick = () => {
            goToChapter(currentChapter - 1);
        };
    }

    if (nextChapterBtn) {

        nextChapterBtn.onclick = () => {
            goToChapter(currentChapter + 1);
        };
    }
}

function copyImageUrl(url) {

    navigator.clipboard.writeText(url);

    showToast("Copied URL");
}

function showToast(message) {

    const toast =
        document.createElement("div");

    toast.className = "custom-toast";

    toast.innerText = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    setTimeout(() => {
        toast.remove();
    }, 2500);
}