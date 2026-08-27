export function unlockUi(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.body.classList.remove('modal-open');
  document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
}
