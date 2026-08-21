window.Auth = {

  // =====================
  // GET TOKEN
  // =====================
  getToken() {
    try {
      const token = localStorage.getItem("driver_token");
      return token && token.length > 10 ? token : null;
    } catch {
      return null;
    }
  },

  // =====================
  // GET DRIVER DATA
  // =====================
  getDriver() {
    try {
      const raw = localStorage.getItem("driver_data");

      if (!raw) return {};

      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object") {
        return {};
      }

      return parsed;

    } catch (e) {
      console.warn("Auth.getDriver parse error:", e);
      return {};
    }
  },

  // =====================
  // SET SESSION
  // =====================
  setSession(token, driver) {

    try {

      if (token) {
        localStorage.setItem("driver_token", token);
      }

      if (driver && typeof driver === "object") {
        localStorage.setItem("driver_data", JSON.stringify(driver));
      }

    } catch (e) {
      console.error("Auth.setSession error:", e);
    }
  },

  // =====================
  // CHECK AUTH
  // =====================
  isAuth() {
    const token = this.getToken();
    return typeof token === "string" && token.length > 10;
  },

  // =====================
  // LOGOUT
  // =====================
  logout() {
    try {
      localStorage.removeItem("driver_token");
      localStorage.removeItem("driver_data");
    } catch (e) {
      console.error("Logout error:", e);
    }

    window.location.href = "/drivers/login.html";
  },

  // =====================
  // FORCE CHECK (optional Uber-style)
  // =====================
  requireAuth() {
    if (!this.isAuth()) {
      window.location.href = "/drivers/login.html";
    }
  }
};