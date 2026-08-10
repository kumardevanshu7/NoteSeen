/** Hide the HTML boot splash once the UI is ready to paint. */
export function hideBootSplash() {
  const boot = document.getElementById("ns-boot");
  if (!boot || boot.classList.contains("ns-boot-done")) return;
  boot.classList.add("ns-boot-done");
  window.setTimeout(() => boot.remove(), 280);
}
