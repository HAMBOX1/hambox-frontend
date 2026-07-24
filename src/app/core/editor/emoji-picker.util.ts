/** Small curated set covering common documentation use (status, reactions, objects) — no emoji-picker dependency needed for this. */
const EMOJI_SET = [
  '🙂', '😀', '😄', '😉', '😍', '🤔', '😅', '🎉', '👍', '👎',
  '✅', '❌', '⚠️', '💡', '🔥', '⭐', '📌', '📎', '🔗', '🔒',
  '🔑', '💾', '📦', '🛠️', '⚙️', '🚀', '🐛', '📝', '📅', '⏱️',
];

let openPopup: HTMLElement | null = null;
let outsideClickHandler: ((event: MouseEvent) => void) | null = null;

function closeEmojiPicker(): void {
  openPopup?.remove();
  openPopup = null;
  if (outsideClickHandler) {
    document.removeEventListener('mousedown', outsideClickHandler);
    outsideClickHandler = null;
  }
}

/** Opens a small floating emoji grid anchored under `anchorEl`; calls `onPick` and closes on selection. */
export function openEmojiPicker(anchorEl: HTMLElement, onPick: (emoji: string) => void): void {
  closeEmojiPicker();

  const rect = anchorEl.getBoundingClientRect();
  const popup = document.createElement('div');
  popup.className = 'hbx-emoji-picker';
  popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;

  for (const emoji of EMOJI_SET) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = emoji;
    button.className = 'hbx-emoji-picker__item';
    button.addEventListener('click', () => {
      onPick(emoji);
      closeEmojiPicker();
    });
    popup.appendChild(button);
  }

  document.body.appendChild(popup);
  openPopup = popup;

  outsideClickHandler = (event: MouseEvent) => {
    if (!popup.contains(event.target as Node) && event.target !== anchorEl) {
      closeEmojiPicker();
    }
  };
  setTimeout(() => document.addEventListener('mousedown', outsideClickHandler!), 0);
}
