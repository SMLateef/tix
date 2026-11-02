const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const tokenKey = "tix-admin-token";
let token = sessionStorage.getItem(tokenKey) || "";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (paise) => paise === 0 ? "Free" : `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
const when = (s) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
function showDashboard() { loginPanel.classList.add("hidden"); dashboard.classList.remove("hidden"); refresh(); }
async function refresh() {
  try {
    const [events, bookings] = await Promise.all([api("/api/admin/events"), api("/api/admin/bookings")]);
    document.querySelector("#admin-events").innerHTML = events.length ? events.map((event) => `<article class="admin-event-row"><div><strong>${esc(event.title)}</strong><small>${when(event.starts_at)} · ${esc(event.city)}<br>${event.remaining} / ${event.capacity} left · ${money(event.price_paise)}${event.published ? "" : " · HIDDEN"}</small></div><div class="event-actions"><button class="tiny-button" data-action="toggle" data-id="${esc(event.id)}" data-published="${event.published}">${event.published ? "Hide" : "Publish"}</button></div></article>`).join("") : `<p class="no-data">No events yet. Add the first one here.</p>`;
    document.querySelector("#admin-bookings").innerHTML = bookings.length ? bookings.map((booking) => `<article class="admin-booking-row"><span><strong>${esc(booking.event_title)}</strong><small>${esc(booking.customer_name)} · ${esc(booking.customer_email)}<br>${when(booking.created_at)}</small></span><span><strong>${esc(booking.confirmation_code)}</strong><small>${booking.quantity} × ${money(booking.total_paise / booking.quantity)}</small></span></article>`).join("") : `<p class="no-data">No reservations so far. Your next good thing is just around the corner.</p>`;
  } catch (error) {
    if (error.message.includes("sign in")) { sessionStorage.removeItem(tokenKey); token = ""; loginPanel.classList.remove("hidden"); dashboard.classList.add("hidden"); }
    else document.querySelector("#admin-events").innerHTML = `<p class="form-error">${esc(error.message)}</p>`;
  }
}

document.querySelector("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget; const error = form.querySelector(".form-error"); const button = form.querySelector("button");
  error.textContent = ""; button.disabled = true;
  try {
    const data = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password: new FormData(form).get("password") }) });
    token = data.token; sessionStorage.setItem(tokenKey, token); form.reset(); showDashboard();
  } catch (err) { error.textContent = err.message; }
  finally { button.disabled = false; }
});
document.querySelector("#event-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget; const error = form.querySelector(".form-error"); const success = form.querySelector(".form-success"); const button = form.querySelector("button");
  error.textContent = ""; success.textContent = ""; button.disabled = true;
  const data = Object.fromEntries(new FormData(form));
  try {
    await api("/api/admin/events", { method: "POST", body: JSON.stringify({ ...data, priceRupees: Number(data.priceRupees), capacity: Number(data.capacity) }) });
    form.reset(); form.elements.city.value = "Mumbai"; form.elements.priceRupees.value = "0"; form.elements.capacity.value = "50";
    success.textContent = "Your event is on the calendar."; await refresh();
  } catch (err) { error.textContent = err.message; }
  finally { button.disabled = false; }
});
document.querySelector("#admin-events").addEventListener("click", async (e) => {
  const button = e.target.closest("button[data-action=toggle]"); if (!button) return;
  button.disabled = true;
  try { await api(`/api/admin/events/${encodeURIComponent(button.dataset.id)}`, { method: "PATCH", body: JSON.stringify({ published: button.dataset.published !== "1" }) }); await refresh(); }
  catch (error) { button.insertAdjacentHTML("afterend", `<small class="form-error">${esc(error.message)}</small>`); button.disabled = false; }
});
document.querySelector("#logout").addEventListener("click", () => { token = ""; sessionStorage.removeItem(tokenKey); dashboard.classList.add("hidden"); loginPanel.classList.remove("hidden"); });
if (token) showDashboard();
