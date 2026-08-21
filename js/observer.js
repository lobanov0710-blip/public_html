window.initObserver = function () {

    const items = document.querySelectorAll(".fade-up, section");

    if (!("IntersectionObserver" in window)) {
        items.forEach(el => el.classList.add("show"));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add("show");
            }
        });
    }, { threshold: 0.1 });

    items.forEach(el => observer.observe(el));
};