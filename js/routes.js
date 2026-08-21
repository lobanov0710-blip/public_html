document.addEventListener("DOMContentLoaded", () => {

    const routes = [
        { title: "Нижний Новгород → Москва", price: "от 22000 ₽", time: "6–7 часов", link: "nn-moscow.html" },
        { title: "Нижний Новгород → Казань", price: "от 21500 ₽", time: "4–5 часов", link: "nn-kazan.html" },
        { title: "Нижний Новгород → Санкт-Петербург", price: "от 62000 ₽", time: "10–12 часов", link: "nn-spb.html" },
        { title: "Нижний Новгород → Ростов-на-Дону", price: "от 69000 ₽", time: "10–11 часов", link: "nn-rostov.html" },
        { title: "Нижний Новгород → Луганск", price: "от 63000 ₽", time: "12–14 часов", link: "nn-lugansk.html" },
        { title: "Нижний Новгород → Донецк", price: "от 73000 ₽", time: "13–15 часов", link: "nn-donetsk.html" },
        { title: "Нижний Новгород → Ульяновск", price: "от 26000 ₽", time: "6–7 часов", link: "nn-ulyanovsk.html" },
        { title: "Нижний Новгород → Саратов", price: "от 32000 ₽", time: "8–9 часов", link: "nn-saratov.html" },
        { title: "Нижний Новгород → Сочи", price: "от 78000 ₽", time: "20–24 часа", link: "nn-sochi.html" },
        { title: "Нижний Новгород → Екатеринбург", price: "от 65000 ₽", time: "16–18 часов", link: "nn-ekaterinburg.html" }
    ];

    const grid = document.getElementById("routesGrid");

    if (!grid) {
        console.error("❌ routesGrid не найден");
        return;
    }

    // очищаем
    grid.innerHTML = "";

    // =========================
    // RANDOM 3 ROUTES
    // =========================
    const shuffled = [...routes].sort(() => Math.random() - 0.5);

    const randomRoutes = shuffled.slice(0, 3);

    const fragment = document.createDocumentFragment();

    randomRoutes.forEach(route => {

        const card = document.createElement("a");

        card.className = "route-card";
        card.href = route.link || "#";

        // SEO + accessibility
        card.setAttribute(
            "aria-label",
            `${route.title}, ${route.price}, время в пути ${route.time}`
        );

        card.innerHTML = `
            <div class="route-badge">
                🔥 Популярный маршрут
            </div>

            <h3>${route.title}</h3>

            <p>
                ${route.price} • ${route.time}
            </p>

            <span class="route-link">
                Подробнее
            </span>
        `;

        fragment.appendChild(card);

    });

    grid.appendChild(fragment);

});