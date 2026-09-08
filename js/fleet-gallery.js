window.initFleetGallery = function () {

    // =========================
    // DOUBLE INIT PROTECTION
    // =========================

    if (
        window.__fleetGalleryInitialized
    ) {
        return;
    }


    // =========================
    // GALLERY DATA
    // =========================

    const galleries = {

        "hyundai-solaris": [

            {
                src:
                    "/images/fleet/hyundai-solaris/hyundai-solaris-main.webp",

                alt:
                    "Hyundai Solaris для междугороднего трансфера"
            },

            {
                src:
                    "/images/fleet/hyundai-solaris/hyundai-solaris-front.webp",

                alt:
                    "Hyundai Solaris — вид спереди"
            },

            {
                src:
                    "/images/fleet/hyundai-solaris/hyundai-solaris-side.webp",

                alt:
                    "Hyundai Solaris — вид сбоку"
            },

            {
                src:
                    "/images/fleet/hyundai-solaris/hyundai-solaris-rear.webp",

                alt:
                    "Hyundai Solaris — вид сзади"
            },

            {
                src:
                    "/images/fleet/hyundai-solaris/hyundai-solaris-interior-front.webp",

                alt:
                    "Hyundai Solaris — передняя часть салона"
            },

            {
                src:
                    "/images/fleet/hyundai-solaris/hyundai-solaris-interior-rear.webp",

                alt:
                    "Hyundai Solaris — задняя часть салона"
            },

            {
                src:
                    "/images/fleet/hyundai-solaris/hyundai-solaris-console.webp",

                alt:
                    "Hyundai Solaris — центральная консоль"
            }
        ]
    };


    // =========================
    // STATE
    // =========================

    let activeGallery =
        null;

    let activeIndex =
        0;

    let lastFocusedElement =
        null;


    // =========================
    // CREATE DIALOG
    // =========================

    const dialog =
        document.createElement(
            "dialog"
        );

    dialog.className =
        "fleet-gallery";

    dialog.setAttribute(
        "aria-label",
        "Галерея автомобиля"
    );


    dialog.innerHTML = `
        <div class="fleet-gallery__panel">

            <div class="fleet-gallery__header">

                <div>
                    <span class="fleet-gallery__eyebrow">
                        Реальные фотографии
                    </span>

                    <strong class="fleet-gallery__title">
                        Hyundai Solaris
                    </strong>
                </div>

                <button
                    type="button"
                    class="fleet-gallery__close"
                    aria-label="Закрыть галерею"
                >
                    ×
                </button>

            </div>


            <div class="fleet-gallery__stage">

                <button
                    type="button"
                    class="fleet-gallery__nav fleet-gallery__nav--prev"
                    aria-label="Предыдущая фотография"
                >
                    ‹
                </button>


                <div class="fleet-gallery__image-wrap">

                    <img
                        class="fleet-gallery__image"
                        src=""
                        alt=""
                    >

                    <span
                        class="fleet-gallery__counter"
                        aria-live="polite"
                    ></span>

                </div>


                <button
                    type="button"
                    class="fleet-gallery__nav fleet-gallery__nav--next"
                    aria-label="Следующая фотография"
                >
                    ›
                </button>

            </div>


            <div
                class="fleet-gallery__thumbs"
                aria-label="Фотографии автомобиля"
            ></div>

        </div>
    `;


    document.body.appendChild(
        dialog
    );


    // =========================
    // ELEMENTS
    // =========================

    const image =
        dialog.querySelector(
            ".fleet-gallery__image"
        );

    const counter =
        dialog.querySelector(
            ".fleet-gallery__counter"
        );

    const thumbsContainer =
        dialog.querySelector(
            ".fleet-gallery__thumbs"
        );

    const closeButton =
        dialog.querySelector(
            ".fleet-gallery__close"
        );

    const previousButton =
        dialog.querySelector(
            ".fleet-gallery__nav--prev"
        );

    const nextButton =
        dialog.querySelector(
            ".fleet-gallery__nav--next"
        );


    if (
        !image ||
        !counter ||
        !thumbsContainer ||
        !closeButton ||
        !previousButton ||
        !nextButton
    ) {

        dialog.remove();

        return;
    }


    // =========================
    // NORMALIZE INDEX
    // =========================

    function normalizeIndex(
        value
    ) {

        if (
            !activeGallery ||
            !activeGallery.length
        ) {
            return 0;
        }


        const total =
            activeGallery.length;


        return (
            (
                value % total
            ) +
            total
        ) % total;
    }


    // =========================
    // RENDER ACTIVE IMAGE
    // =========================

    function render() {

        if (
            !activeGallery ||
            !activeGallery.length
        ) {
            return;
        }


        activeIndex =
            normalizeIndex(
                activeIndex
            );


        const item =
            activeGallery[
                activeIndex
            ];


        image.src =
            item.src;

        image.alt =
            item.alt;


        counter.textContent =
            `${activeIndex + 1} / ${activeGallery.length}`;


        const thumbButtons =
            Array.from(
                thumbsContainer.querySelectorAll(
                    ".fleet-gallery__thumb"
                )
            );


        thumbButtons.forEach(
            (
                button,
                index
            ) => {

                const isActive =
                    index ===
                    activeIndex;


                button.classList.toggle(
                    "active",
                    isActive
                );


                if (isActive) {

                    button.setAttribute(
                        "aria-current",
                        "true"
                    );

                } else {

                    button.removeAttribute(
                        "aria-current"
                    );
                }
            }
        );


        const activeThumb =
            thumbButtons[
                activeIndex
            ];


        if (activeThumb) {

            activeThumb.scrollIntoView(
                {
                    behavior:
                        "smooth",

                    block:
                        "nearest",

                    inline:
                        "center"
                }
            );
        }
    }


    // =========================
    // BUILD THUMBNAILS
    // =========================

    function buildThumbnails() {

        thumbsContainer.innerHTML =
            "";


        if (
            !activeGallery
        ) {
            return;
        }


        activeGallery.forEach(
            (
                item,
                index
            ) => {

                const button =
                    document.createElement(
                        "button"
                    );


                button.type =
                    "button";

                button.className =
                    "fleet-gallery__thumb";

                button.setAttribute(
                    "aria-label",
                    `Открыть фотографию ${index + 1}`
                );


                const thumbImage =
                    document.createElement(
                        "img"
                    );


                thumbImage.src =
                    item.src;

                thumbImage.alt =
                    "";

                thumbImage.loading =
                    "lazy";


                button.appendChild(
                    thumbImage
                );


                button.addEventListener(
                    "click",
                    () => {

                        activeIndex =
                            index;

                        render();
                    }
                );


                thumbsContainer.appendChild(
                    button
                );
            }
        );
    }


    // =========================
    // OPEN
    // =========================

    function openGallery(
        galleryName
    ) {

        const gallery =
            galleries[
                galleryName
            ];


        if (
            !gallery ||
            !gallery.length
        ) {
            return;
        }


        activeGallery =
            gallery;

        activeIndex =
            0;

        lastFocusedElement =
            document.activeElement;


        buildThumbnails();

        render();


        if (
            typeof dialog.showModal ===
            "function"
        ) {

            dialog.showModal();

        } else {

            dialog.setAttribute(
                "open",
                ""
            );
        }


        document.body.classList.add(
            "gallery-open"
        );


        closeButton.focus();
    }


    // =========================
    // CLOSE
    // =========================

    function closeGallery() {

        if (
            dialog.open &&
            typeof dialog.close ===
            "function"
        ) {

            dialog.close();

        } else {

            dialog.removeAttribute(
                "open"
            );
        }


        document.body.classList.remove(
            "gallery-open"
        );


        if (
            lastFocusedElement &&
            typeof lastFocusedElement.focus ===
            "function"
        ) {

            lastFocusedElement.focus();
        }


        activeGallery =
            null;
    }


    // =========================
    // NAVIGATION
    // =========================

    function next() {

        if (
            !activeGallery
        ) {
            return;
        }


        activeIndex +=
            1;

        render();
    }


    function previous() {

        if (
            !activeGallery
        ) {
            return;
        }


        activeIndex -=
            1;

        render();
    }


    // =========================
    // OPEN BUTTONS
    // =========================

    document.addEventListener(
        "click",
        event => {

            const trigger =
                event.target.closest(
                    "[data-fleet-gallery]"
                );


            if (
                !trigger
            ) {
                return;
            }


            const galleryName =
                trigger.getAttribute(
                    "data-fleet-gallery"
                );


            if (
                !galleryName
            ) {
                return;
            }


            event.preventDefault();


            openGallery(
                galleryName
            );
        }
    );


    // =========================
    // BUTTON EVENTS
    // =========================

    closeButton.addEventListener(
        "click",
        closeGallery
    );


    previousButton.addEventListener(
        "click",
        previous
    );


    nextButton.addEventListener(
        "click",
        next
    );


    // =========================
    // BACKDROP CLICK
    // =========================

    dialog.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                dialog
            ) {

                closeGallery();
            }
        }
    );


    // =========================
    // KEYBOARD
    // =========================

    dialog.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "ArrowRight"
            ) {

                event.preventDefault();

                next();

                return;
            }


            if (
                event.key ===
                "ArrowLeft"
            ) {

                event.preventDefault();

                previous();

                return;
            }


            if (
                event.key ===
                "Escape"
            ) {

                event.preventDefault();

                closeGallery();
            }
        }
    );


    // =========================
    // DIALOG CANCEL
    // =========================

    dialog.addEventListener(
        "cancel",
        event => {

            event.preventDefault();

            closeGallery();
        }
    );


    // =========================
    // INIT COMPLETE
    // =========================

    window.__fleetGalleryInitialized =
        true;
};