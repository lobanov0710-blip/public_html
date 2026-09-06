window.initSlider = function () {

    // =========================
    // ROOT
    // =========================

    const fleet =
        document.getElementById(
            "fleet"
        );

    if (!fleet) {
        return;
    }


    // =========================
    // DOUBLE INIT PROTECTION
    // =========================

    if (
        window.__fleetSliderInitialized
    ) {
        return;
    }


    // =========================
    // ELEMENTS
    // =========================

    const track =
        fleet.querySelector(
            ".car-track"
        );

    const viewport =
        fleet.querySelector(
            ".car-viewport"
        );

    const cards =
        Array.from(
            fleet.querySelectorAll(
                ".car-card"
            )
        );

    const prevButton =
        fleet.querySelector(
            ".car-btn.prev"
        );

    const nextButton =
        fleet.querySelector(
            ".car-btn.next"
        );

    const dots =
        Array.from(
            fleet.querySelectorAll(
                ".car-dot"
            )
        );


    if (
        !track ||
        !viewport ||
        !cards.length ||
        !prevButton ||
        !nextButton
    ) {
        return;
    }


    window.__fleetSliderInitialized =
        true;


    // =========================
    // STATE
    // =========================

    let index = 0;

    let pointerStartX =
        null;


    // =========================
    // NORMALIZE INDEX
    // =========================

    function normalizeIndex(
        value
    ) {

        const total =
            cards.length;

        return (
            (
                value % total
            ) +
            total
        ) % total;
    }


    // =========================
    // UPDATE
    // =========================

    function update() {

        track.style.transform =
            `translateX(-${index * 100}%)`;


        cards.forEach(
            (
                card,
                cardIndex
            ) => {

                card.setAttribute(
                    "aria-hidden",
                    cardIndex === index
                        ? "false"
                        : "true"
                );
            }
        );


        dots.forEach(
            (
                dot,
                dotIndex
            ) => {

                const isActive =
                    dotIndex === index;

                dot.classList.toggle(
                    "active",
                    isActive
                );

                if (isActive) {

                    dot.setAttribute(
                        "aria-current",
                        "true"
                    );

                } else {

                    dot.removeAttribute(
                        "aria-current"
                    );
                }
            }
        );
    }


    // =========================
    // NAVIGATION
    // =========================

    function goTo(
        newIndex
    ) {

        index =
            normalizeIndex(
                newIndex
            );

        update();
    }


    function next() {

        goTo(
            index + 1
        );
    }


    function previous() {

        goTo(
            index - 1
        );
    }


    // =========================
    // BUTTONS
    // =========================

    nextButton.addEventListener(
        "click",
        next
    );

    prevButton.addEventListener(
        "click",
        previous
    );


    // =========================
    // DOTS
    // =========================

    dots.forEach(
        (
            dot,
            dotIndex
        ) => {

            dot.addEventListener(
                "click",
                () => {

                    goTo(
                        dotIndex
                    );
                }
            );
        }
    );


    // =========================
    // KEYBOARD
    // =========================

    viewport.addEventListener(
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
            }
        }
    );


    // =========================
    // POINTER / SWIPE
    // =========================

    viewport.addEventListener(
        "pointerdown",
        event => {

            pointerStartX =
                event.clientX;
        }
    );


    viewport.addEventListener(
        "pointerup",
        event => {

            if (
                pointerStartX ===
                null
            ) {
                return;
            }


            const delta =
                event.clientX -
                pointerStartX;


            pointerStartX =
                null;


            if (
                Math.abs(delta) <
                50
            ) {
                return;
            }


            if (delta < 0) {

                next();

            } else {

                previous();
            }
        }
    );


    viewport.addEventListener(
        "pointercancel",
        () => {

            pointerStartX =
                null;
        }
    );


    // =========================
    // INITIAL STATE
    // =========================

    update();

};