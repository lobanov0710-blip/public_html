const ALLOWED_ORIGINS = new Set([
    "https://transfer-servis52.ru",
    "https://www.transfer-servis52.ru"
]);

const ALLOWED_SERVICES = new Set([
    "Автоподбор под ключ",
    "Комплексная проверка автомобиля",
    "Проверка VIN и документов",
    "Эксперт на рабочий день",
    "Проверка нового автомобиля",
    "Помощь в выборе объявлений",
    "ОСАГО и КАСКО",
    "Выезд в другой регион",
    "Перегон автомобиля"
]);

function corsHeaders(origin) {
    const headers = {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin",
        "Content-Type": "application/json; charset=UTF-8"
    };

    if (ALLOWED_ORIGINS.has(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
    }

    return headers;
}

function json(data, status, origin) {
    return new Response(JSON.stringify(data), {
        status,
        headers: corsHeaders(origin)
    });
}

function clean(value, maxLength = 500) {
    return String(value ?? "")
        .trim()
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .slice(0, maxLength);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function validPhone(phone) {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
}

function buildMessage(data) {
    return [
        "🚘 <b>НОВАЯ ЗАЯВКА — АВТОПОДБОР</b>",
        "",
        `<b>Услуга:</b> ${escapeHtml(data.service)}`,
        `<b>Имя:</b> ${escapeHtml(data.name)}`,
        `<b>Телефон:</b> ${escapeHtml(data.phone)}`,
        `<b>Бюджет:</b> ${escapeHtml(data.budget || "не указан")}`,
        `<b>Автомобиль:</b> ${escapeHtml(data.car || "не указан")}`,
        `<b>Регион:</b> ${escapeHtml(data.region || "не указан")}`,
        "",
        `<b>Комментарий:</b> ${escapeHtml(data.comment || "нет")}`,
        "",
        `<b>Источник:</b> ${escapeHtml(data.source)}`
    ].join("\n");
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get("Origin") || "";

        if (request.method === "OPTIONS") {
            if (!ALLOWED_ORIGINS.has(origin)) {
                return json({ok: false, error: "Origin not allowed"}, 403, origin);
            }
            return new Response(null, {status: 204, headers: corsHeaders(origin)});
        }

        if (request.method !== "POST") {
            return json({ok: false, error: "Method not allowed"}, 405, origin);
        }

        if (!ALLOWED_ORIGINS.has(origin)) {
            return json({ok: false, error: "Origin not allowed"}, 403, origin);
        }

        const contentType = request.headers.get("Content-Type") || "";
        if (!contentType.toLowerCase().includes("application/json")) {
            return json({ok: false, error: "Unsupported content type"}, 415, origin);
        }

        const contentLength = Number(request.headers.get("Content-Length") || 0);
        if (contentLength > 12000) {
            return json({ok: false, error: "Payload too large"}, 413, origin);
        }

        if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
            console.error("[AUTOSELECT] Missing Telegram secrets");
            return json({ok: false, error: "Server configuration error"}, 500, origin);
        }

        let body;
        try {
            body = await request.json();
        } catch (_) {
            return json({ok: false, error: "Invalid JSON"}, 400, origin);
        }

        // Простая honeypot-защита от автоматического заполнения формы.
        if (clean(body.website, 200)) {
            return json({ok: true}, 200, origin);
        }

        const data = {
            name: clean(body.name, 100),
            phone: clean(body.phone, 40),
            service: clean(body.service, 80),
            budget: clean(body.budget, 80),
            car: clean(body.car, 120),
            region: clean(body.region, 120),
            comment: clean(body.comment, 1000),
            source: clean(body.source, 180),
            privacy: body.privacy === true
        };

        if (!data.name || !data.phone || !data.service || !data.privacy) {
            return json({ok: false, error: "Required fields are missing"}, 400, origin);
        }

        if (!ALLOWED_SERVICES.has(data.service)) {
            return json({ok: false, error: "Unknown service"}, 400, origin);
        }

        if (!validPhone(data.phone)) {
            return json({ok: false, error: "Invalid phone"}, 400, origin);
        }

        const telegramResponse = await fetch(
            `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    chat_id: env.TELEGRAM_CHAT_ID,
                    text: buildMessage(data),
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                })
            }
        );

        let telegramResult = null;
        try {
            telegramResult = await telegramResponse.json();
        } catch (_) {
            telegramResult = null;
        }

        if (!telegramResponse.ok || telegramResult?.ok !== true) {
            console.error("[AUTOSELECT] Telegram API error:", telegramResult);
            return json({ok: false, error: "Telegram delivery failed"}, 502, origin);
        }

        return json({ok: true}, 200, origin);
    }
};
