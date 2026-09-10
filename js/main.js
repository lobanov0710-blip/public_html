document.addEventListener("DOMContentLoaded", () => {

    // =========================
    // SAFE INIT HELPER
    // =========================

    function safeInit(name, initFunction) {

        if (typeof initFunction !== "function") {
            return null;
        }

        try {
            return initFunction();
        } catch (error) {
            console.error(
                `[INIT] ${name} failed:`,
                error
            );

            return null;
        }
    }


    // =========================
    // MAP
    // =========================

    const mapInstance = safeInit(
        "map",
        window.initMap
    );

    if (mapInstance) {
        window.map = mapInstance;
    }


    // =========================
    // CALCULATOR
    // =========================

    safeInit(
        "calculator",
        window.initCalculator
    );


    // =========================
    // UI MODULES
    // =========================

    safeInit(
        "slider",
        window.initSlider
    );

    safeInit(
        "fleet-gallery",
        window.initFleetGallery
    );

    safeInit(
        "form",
        window.initForm
    );

    safeInit(
        "scroll",
        window.initScroll
    );

    safeInit(
        "observer",
        window.initObserver
    );

    safeInit(
        "routes",
        window.initRoutes
    );


    // =========================
    // PROMO BANNER
    // =========================

    const promoBanner =
        document.getElementById(
            "promoBanner"
        );

    const promoCloseButton =
        document.getElementById(
            "promoBannerClose"
        );

    if (
        promoBanner &&
        promoCloseButton
    ) {

        try {

            const wasClosed =
                localStorage.getItem(
                    "promoBannerClosed"
                ) === "1";

            if (wasClosed) {

                promoBanner
                    .classList
                    .add("hidden");

            } else {

                promoCloseButton
                    .addEventListener(
                        "click",
                        () => {

                            promoBanner
                                .classList
                                .add("hidden");

                            try {

                                localStorage.setItem(
                                    "promoBannerClosed",
                                    "1"
                                );

                            } catch (error) {

                                console.warn(
                                    "[PROMO] localStorage unavailable:",
                                    error
                                );
                            }
                        }
                    );
            }

        } catch (error) {

            console.warn(
                "[PROMO] initialization failed:",
                error
            );
        }
    }


    // =========================
    // COOKIE CONSENT
    // =========================

    const cookieBanner =
        document.getElementById(
            "cookieBanner"
        );

    const acceptCookiesButton =
        document.getElementById(
            "acceptCookies"
        );

    const declineCookiesButton =
        document.getElementById(
            "declineCookies"
        );

    if (
        cookieBanner &&
        acceptCookiesButton &&
        declineCookiesButton
    ) {

        let cookieChoice = null;

        try {

            cookieChoice =
                localStorage.getItem(
                    "cookieConsent"
                );

        } catch (error) {

            console.warn(
                "[COOKIES] localStorage unavailable:",
                error
            );
        }


        // Если пользователь ещё не сделал выбор —
        // показываем cookie banner

        if (
            cookieChoice !== "accepted" &&
            cookieChoice !== "declined"
        ) {

            cookieBanner
                .classList
                .add("show");
        }


        // =========================
        // ACCEPT COOKIES
        // =========================

        acceptCookiesButton
            .addEventListener(
                "click",
                () => {

                    try {

                        localStorage.setItem(
                            "cookieConsent",
                            "accepted"
                        );

                    } catch (error) {

                        console.warn(
                            "[COOKIES] Could not save consent:",
                            error
                        );
                    }

                    cookieBanner
                        .classList
                        .remove("show");
                }
            );


        // =========================
        // DECLINE COOKIES
        // =========================

        declineCookiesButton
            .addEventListener(
                "click",
                () => {

                    try {

                        localStorage.setItem(
                            "cookieConsent",
                            "declined"
                        );

                    } catch (error) {

                        console.warn(
                            "[COOKIES] Could not save decline:",
                            error
                        );
                    }

                    cookieBanner
                        .classList
                        .remove("show");
                }
            );
    }

});