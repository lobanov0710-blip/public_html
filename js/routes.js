(function () {

    "use strict";


    // =========================
    // ROUTES DATA
    // =========================

    const routes = [

        {
            title: "Нижний Новгород → Москва",
            description:
                "Индивидуальный трансфер без пересадок до Москвы и аэропортов.",
            link: "/nn-moscow.html"
        },

        {
            title: "Нижний Новгород → Казань",
            description:
                "Междугородняя поездка от адреса до адреса без смены транспорта.",
            link: "/nn-kazan.html"
        },

        {
            title: "Нижний Новгород → Санкт-Петербург",
            description:
                "Индивидуальный трансфер до Санкт-Петербурга и аэропорта Пулково.",
            link: "/nn-spb.html"
        },

        {
            title: "Нижний Новгород → Ростов-на-Дону",
            description:
                "Прямая междугородняя поездка с остановками по согласованию.",
            link: "/nn-rostov.html"
        },

        {
            title: "Нижний Новгород → Луганск",
            description:
                "Дальний индивидуальный трансфер без обязательных пересадок.",
            link: "/nn-lugansk.html"
        },

        {
            title: "Нижний Новгород → Донецк",
            description:
                "Междугородний трансфер по заранее согласованному маршруту.",
            link: "/nn-donetsk.html"
        },

        {
            title: "Нижний Новгород → Ульяновск",
            description:
                "Комфортная поездка до нужного адреса без смены транспорта.",
            link: "/nn-ulyanovsk.html"
        },

        {
            title: "Нижний Новгород → Саратов",
            description:
                "Индивидуальная междугородняя поездка от адреса до адреса.",
            link: "/nn-saratov.html"
        },

        {
            title: "Нижний Новгород → Сочи",
            description:
                "Дальний трансфер с заранее согласованными условиями поездки.",
            link: "/nn-sochi.html"
        },

        {
            title: "Нижний Новгород → Екатеринбург",
            description:
                "Индивидуальный дальний маршрут без обязательных пересадок.",
            link: "/nn-ekaterinburg.html"
        }

    ];


    // =========================
    // NORMALIZE PATH
    // =========================

    function normalizePath(path) {

        if (!path) {
            return "/";
        }

        let normalized = path
            .split("?")[0]
            .split("#")[0];

        if (
            normalized.length > 1 &&
            normalized.endsWith("/")
        ) {
            normalized =
                normalized.slice(0, -1);
        }

        return normalized;
    }


    // =========================
    // SHUFFLE
    // Fisher-Yates
    // =========================

    function shuffle(items) {

        const result = [...items];

        for (
            let i = result.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    Math.random() * (i + 1)
                );

            [
                result[i],
                result[j]
            ] = [
                result[j],
                result[i]
            ];
        }

        return result;
    }


    // =========================
    // CREATE ROUTE CARD
    // =========================

    function createRouteCard(route) {

        const card =
            document.createElement("a");

        card.className = "route-card";
        card.href = route.link;

        card.setAttribute(
            "aria-label",
            `${route.title}. Подробнее о маршруте`
        );


        const badge =
            document.createElement("span");

        badge.className =
            "route-badge";

        badge.textContent =
            "Междугородний трансфер";


        const title =
            document.createElement("h3");

        title.textContent =
            route.title;


        const description =
            document.createElement("p");

        description.textContent =
            route.description;


        const linkText =
            document.createElement("span");

        linkText.className =
            "route-link";

        linkText.textContent =
            "Подробнее →";


        card.append(
            badge,
            title,
            description,
            linkText
        );

        return card;
    }


    // =========================
    // INIT ROUTES
    // =========================

    function initRoutes() {

        const grid =
            document.getElementById(
                "routesGrid"
            );

        if (!grid) {
            return;
        }


        const currentPath =
            normalizePath(
                window.location.pathname
            );


        // Исключаем текущую страницу
        // из блока "Другие направления"

        const availableRoutes =
            routes.filter(
                route =>
                    normalizePath(route.link) !==
                    currentPath
            );


        // Случайная ротация
        // при каждой загрузке страницы

        const randomRoutes =
            shuffle(
                availableRoutes
            ).slice(0, 3);


        const fragment =
            document.createDocumentFragment();


        randomRoutes.forEach(
            route => {

                fragment.appendChild(
                    createRouteCard(route)
                );
            }
        );


        grid.replaceChildren(
            fragment
        );
    }


    // =========================
    // EXPORT
    // =========================

    window.initRoutes =
        initRoutes;

})();