document.addEventListener("DOMContentLoaded", async () => {

    // =========================
    // SAFE MODULE INIT
    // =========================

    try {
        if (typeof window.initMap === "function") {
            const mapInstance = window.initMap();

            // 🔥 КРИТИЧНО: фикс глобальной карты
            if (mapInstance) {
                window.map = mapInstance;
            }
        }
    } catch (e) {
        console.error("map fail", e);
    }

    // =========================
    // WAIT MAP STABILIZATION
    // =========================
    await new Promise(resolve => setTimeout(resolve, 400));

    // =========================
    // CALCULATOR AFTER MAP
    // =========================

    try {
        if (typeof window.initCalculator === "function") {
            window.initCalculator();
        }
    } catch (e) {
        console.error("calc fail", e);
    }

    // =========================
    // LEGACY MODULES
    // =========================

    try { window.initSlider?.(); } catch (e) { console.error("slider fail", e); }
    try { window.initForm?.(); } catch (e) { console.error("form fail", e); }
    try { window.initScroll?.(); } catch (e) { console.error("scroll fail", e); }
    try { window.initObserver?.(); } catch (e) { console.error("observer fail", e); }
    try { window.initRoutes?.(); } catch (e) { console.error("routes fail", e); }


    document.addEventListener("DOMContentLoaded", () => {
    const banner = document.getElementById("promoBanner");
    const closeBtn = document.getElementById("promoBannerClose");

    if (!banner || !closeBtn) return;

    if (localStorage.getItem("promoBannerClosed") === "1") {
        banner.classList.add("hidden");
        return;
    }

    closeBtn.addEventListener("click", () => {
        banner.classList.add("hidden");
        localStorage.setItem("promoBannerClosed", "1");
    });
});

    // =========================
    // COPY BLOCK
    // =========================

    document.addEventListener("copy", (e) => {
        e.preventDefault();
    });

});