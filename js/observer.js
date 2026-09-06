window.initObserver = function () {

    // =========================
    // ELEMENTS
    // =========================

    const items =
        document.querySelectorAll(
            ".fade-up, section"
        );

    if (!items.length) {
        return;
    }


    // =========================
    // REDUCED MOTION
    // =========================

    const prefersReducedMotion =
        window.matchMedia &&
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

    if (prefersReducedMotion) {

        items.forEach(element => {

            element.classList.remove(
                "reveal-pending"
            );

            element.classList.add(
                "show"
            );
        });

        return;
    }


    // =========================
    // FALLBACK
    // =========================

    if (
        !(
            "IntersectionObserver"
            in window
        )
    ) {

        items.forEach(element => {

            element.classList.remove(
                "reveal-pending"
            );

            element.classList.add(
                "show"
            );
        });

        return;
    }


    // =========================
    // PREPARE
    // =========================

    items.forEach(element => {

        element.classList.add(
            "reveal-pending"
        );
    });


    // =========================
    // OBSERVER
    // =========================

    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (
                        !entry.isIntersecting
                    ) {
                        return;
                    }

                    const element =
                        entry.target;

                    element.classList.remove(
                        "reveal-pending"
                    );

                    element.classList.add(
                        "show"
                    );

                    observer.unobserve(
                        element
                    );
                });
            },
            {
                threshold: 0.08,
                rootMargin:
                    "0px 0px -40px 0px"
            }
        );


    // =========================
    // START
    // =========================

    items.forEach(element => {

        observer.observe(
            element
        );
    });

};