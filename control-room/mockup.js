// NASA and ESA Data Projects · Control room mock-up · © 2026 Malcolm Syme · mcsyme11@gmail.com
// The "Copy for the Data updates chat" button: copies the ready-made message and confirms on the button.
const btn = document.getElementById('copy');
const msg = document.getElementById('msg');
if (btn && msg) {
  btn.addEventListener('click', async () => {
    const text = msg.textContent.replace(/\s+/g, ' ').trim();
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
    catch { btn.textContent = 'Select and copy'; }
    setTimeout(() => { btn.textContent = 'Copy for the chat'; }, 4000);
  });
}
