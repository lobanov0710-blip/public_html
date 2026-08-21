if (!window.WS_API) {
  console.warn("WS disabled");
} else {

  let socket;
  let reconnectAttempts = 0;
  const maxReconnect = 10;

  function connectWS() {

    socket = new WebSocket(window.WS_API);

    // =====================
    // OPEN
    // =====================
    socket.onopen = () => {

      console.log("WS connected 🚀");

      reconnectAttempts = 0;

      // 🔥 AUTH DRIVER (VERY IMPORTANT)
      const token = localStorage.getItem("driver_token");

      if (token) {
        socket.send(JSON.stringify({
          type: "auth",
          token
        }));
      }

      // heartbeat (Uber style)
      setInterval(() => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, 15000);
    };

    // =====================
    // MESSAGE
    // =====================
    socket.onmessage = (event) => {

      try {

        const msg = JSON.parse(event.data);

        if (!msg || !msg.type) return;

        // =====================
        // NEW ORDER EVENT
        // =====================
        if (msg.type === "new_order") {

          window.dispatchEvent(
            new CustomEvent("new_order", {
              detail: msg.order
            })
          );
        }

        // =====================
        // PONG (optional)
        // =====================
        if (msg.type === "pong") {
          console.log("WS alive 💚");
        }

      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    // =====================
    // CLOSE
    // =====================
    socket.onclose = () => {

      console.warn("WS disconnected ❌");

      if (reconnectAttempts < maxReconnect) {

        reconnectAttempts++;

        const timeout = Math.min(1000 * reconnectAttempts, 10000);

        console.log(`WS reconnect in ${timeout}ms`);

        setTimeout(connectWS, timeout);

      } else {
        console.error("WS max reconnect reached");
      }
    };

    // =====================
    // ERROR
    // =====================
    socket.onerror = (err) => {
      console.error("WS error:", err);
      socket.close();
    };
  }

  connectWS();
}