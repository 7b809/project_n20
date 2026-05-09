const form = document.getElementById("loadForm");

const viewerContainer =
    document.getElementById("viewerContainer");

const chapterButtons =
    document.getElementById("chapterButtons");

const prevChapterBtn =
    document.getElementById(
        "prevChapterBtn"
    );

const nextChapterBtn =
    document.getElementById(
        "nextChapterBtn"
    );



let currentUrl = "";

let currentChapter = 1;

let isLoading = false;

let loadedChapters = new Set();

let chapterObserver = null;





/* =========================
   INITIAL BUTTON STATE
========================= */

prevChapterBtn.style.display = "none";

nextChapterBtn.style.display = "none";





/* =========================
   LOAD CHAPTER
========================= */

async function loadChapter(chapter){

    if(!currentUrl){
        return;
    }

    if(isLoading){
        return;
    }

    if(loadedChapters.has(chapter)){
        return;
    }

    isLoading = true;

    currentChapter = chapter;



    /* show nav buttons */

    prevChapterBtn.style.display = "flex";

    nextChapterBtn.style.display = "flex";



    updateFloatingButtons();



    const limit =
        document.getElementById("limit").value;

    const formData = new FormData();

    formData.append("url", currentUrl);

    formData.append("chapter", chapter);

    formData.append("limit", limit);



    const loadingHtml = `
        <div
            class="text-center py-5 chapter-loading"
        >

            <div
                class="spinner-border text-light"
            ></div>

            <div
                class="mt-3 text-secondary"
            >
                Loading Chapter ${chapter}
            </div>

        </div>
    `;



    viewerContainer.insertAdjacentHTML(
        "beforeend",
        loadingHtml
    );



    try{

        const response = await fetch("/load",{
            method:"POST",
            body:formData
        });

        const data = await response.json();



        document
            .querySelectorAll(".chapter-loading")
            .forEach((el)=>el.remove());



        if(!data.success){

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



        if(data.images.length === 0){

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

                            ${data.images.length}
                            Images Loaded

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



        data.images.forEach((img,index)=>{

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



        if(data.images.length > 0){

            addChapterButton(chapter + 1);
        }



        highlightActiveChapterButton(
            chapter
        );



        isLoading = false;

    }
    catch(error){

        document
            .querySelectorAll(".chapter-loading")
            .forEach((el)=>el.remove());

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





/* =========================
   LAZY IMAGE LOADING
========================= */

function initializeLazyLoading(){

    const lazyImages =
        document.querySelectorAll(
            ".lazy-image:not(.loaded)"
        );



    const observer =
        new IntersectionObserver((entries)=>{

        entries.forEach((entry)=>{

            const img = entry.target;



            if(entry.isIntersecting){

                if(!img.src){

                    img.src = img.dataset.src;
                }

                img.classList.add("loaded");



                img.onload = ()=>{

                    img.style.opacity = "1";

                    const loader =
                        img.previousElementSibling;

                    if(loader){
                        loader.remove();
                    }
                };



                img.onerror = ()=>{

                    img.parentElement.remove();
                };

            }

        });

    },{
        rootMargin:"1200px"
    });



    lazyImages.forEach((img)=>{

        observer.observe(img);
    });
}





/* =========================
   CHAPTER BUTTONS
========================= */

function addChapterButton(chapter){

    if(chapter <= 0){
        return;
    }



    if(
        document.getElementById(
            `chapter-${chapter}`
        )
    ){
        return;
    }



    const btn =
        document.createElement("button");

    btn.className = "chapter-btn";

    btn.id = `chapter-${chapter}`;

    btn.innerText = `Chapter ${chapter}`;



    btn.onclick = ()=>{

        goToChapter(chapter);
    };



    chapterButtons.appendChild(btn);
}





/* =========================
   GO TO CHAPTER
========================= */

async function goToChapter(chapter){

    if(chapter <= 0){
        return;
    }

    if(!currentUrl){
        return;
    }



    currentChapter = chapter;

    updateFloatingButtons();



    const existingSection =
        document.getElementById(
            `chapter-section-${chapter}`
        );



    if(existingSection){

        existingSection.scrollIntoView({
            behavior:"smooth"
        });

        return;
    }



    await loadChapter(chapter);



    setTimeout(()=>{

        const newSection =
            document.getElementById(
                `chapter-section-${chapter}`
            );

        if(newSection){

            newSection.scrollIntoView({
                behavior:"smooth"
            });
        }

    },500);
}





/* =========================
   FLOATING NAVIGATION
========================= */

function updateFloatingButtons(){

    prevChapterBtn.innerHTML = `
        <i class="bi bi-arrow-left"></i>
        Prev
    `;

    nextChapterBtn.innerHTML = `
        Next
        <i class="bi bi-arrow-right"></i>
    `;
}



prevChapterBtn.onclick = ()=>{

    goToChapter(currentChapter - 1);
};



nextChapterBtn.onclick = ()=>{

    goToChapter(currentChapter + 1);
};





/* =========================
   OBSERVE CHAPTERS
========================= */

function observeChapterSections(){

    if(chapterObserver){

        chapterObserver.disconnect();
    }



    const sections =
        document.querySelectorAll(
            ".chapter-section"
        );



    chapterObserver =
        new IntersectionObserver((entries)=>{

        entries.forEach((entry)=>{

            if(entry.isIntersecting){

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

    },{
        threshold:0.4
    });



    sections.forEach((section)=>{

        chapterObserver.observe(section);
    });
}





/* =========================
   ACTIVE BUTTON
========================= */

function highlightActiveChapterButton(chapter){

    document
        .querySelectorAll(".chapter-btn")
        .forEach((btn)=>{

            btn.style.background =
                "#1c2330";
        });



    const activeBtn =
        document.getElementById(
            `chapter-${chapter}`
        );



    if(activeBtn){

        activeBtn.style.background =
            "#4f7cff";
    }
}





/* =========================
   INFINITE SCROLL
========================= */

function initializeInfiniteScroll(){

    window.addEventListener("scroll",()=>{

        /* prevent startup bug */

        if(!currentUrl){
            return;
        }

        if(isLoading){
            return;
        }



        const scrollPosition =
            window.innerHeight +
            window.scrollY;

        const threshold =
            document.body.offsetHeight - 2500;



        if(scrollPosition >= threshold){

            loadChapter(currentChapter + 1);
        }
    });
}





/* =========================
   COPY URL
========================= */

function copyImageUrl(url){

    navigator.clipboard.writeText(url);

    showToast("Copied URL");
}





/* =========================
   TOAST
========================= */

function showToast(message){

    const toast =
        document.createElement("div");

    toast.className = "custom-toast";

    toast.innerText = message;

    document.body.appendChild(toast);



    setTimeout(()=>{

        toast.classList.add("show");

    },100);



    setTimeout(()=>{

        toast.remove();

    },2500);
}





/* =========================
   KEYBOARD NAVIGATION
========================= */

document.addEventListener(
    "keydown",
    (e)=>{

    if(!currentUrl){
        return;
    }

    if(e.key === "ArrowRight"){

        goToChapter(currentChapter + 1);
    }

    if(e.key === "ArrowLeft"){

        goToChapter(currentChapter - 1);
    }
});





/* =========================
   FORM SUBMIT
========================= */

form.addEventListener("submit",(e)=>{

    e.preventDefault();



    currentUrl =
        document.getElementById("url").value.trim();



    if(!currentUrl){

        showToast("Please enter URL");

        return;
    }



    currentChapter =
        parseInt(
            document.getElementById("chapter").value
        );



    viewerContainer.innerHTML = "";

    chapterButtons.innerHTML = "";

    loadedChapters.clear();



    loadChapter(currentChapter);
});





/* =========================
   INITIALIZE
========================= */

initializeInfiniteScroll();