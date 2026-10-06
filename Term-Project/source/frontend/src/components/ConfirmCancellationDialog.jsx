import { useEffect, useRef } from 'react';

function ConfirmCancellationDialog({ open, pending, title, message, keepLabel, confirmLabel, pendingLabel, restoreFocusTarget, onKeep, onConfirm }) {
  const dialogRef = useRef(null);
  const keepRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) {
      previousFocus.current = document.activeElement;
      dialog.showModal();
      keepRef.current?.focus();
    }
    return () => {
      if (dialog?.open) dialog.close();
      const target = previousFocus.current?.isConnected ? previousFocus.current : restoreFocusTarget;
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, [open]);

  function handleCancel(event) {
    event.preventDefault();
    if (!pending) onKeep();
  }

  return (
    <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="cancel-dialog-title" onCancel={handleCancel}>
      <div className="confirm-dialog-content">
        <p className="eyebrow dark">{title}</p>
        <h2 id="cancel-dialog-title">{message}</h2>
        <div className="confirm-dialog-actions">
          <button ref={keepRef} className="button secondary" type="button" disabled={pending} onClick={onKeep}>{keepLabel}</button>
          <button className="button danger" type="button" disabled={pending} onClick={onConfirm}>
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default ConfirmCancellationDialog;
