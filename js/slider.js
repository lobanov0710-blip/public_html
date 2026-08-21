window.initSlider = function () {

    const track = document.querySelector(".car-track");
    const cards = document.querySelectorAll(".car-card");
    const prevBtn = document.querySelector(".car-btn.prev");
    const nextBtn = document.querySelector(".car-btn.next");

    if (!track || !cards.length || !prevBtn || !nextBtn) return;

    let index = 0;

    function update() {
        track.style.transform = `translateX(-${index * 100}%)`;
    }

    nextBtn.addEventListener("click", () => {
        index = (index + 1) % cards.length;
        update();
    });

    prevBtn.addEventListener("click", () => {
        index = (index - 1 + cards.length) % cards.length;
        update();
    });

    update();
};