import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext.jsx';

function AdminDataResetDialog({ pending, restoreFocusTarget, onClose, onConfirm }) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const previousFocus = useRef(null);
  const [confirmation, setConfirmation] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      previousFocus.current = document.activeElement;
      dialog.showModal();
      inputRef.current?.focus();
    }
    return () => {
      if (dialog?.open) dialog.close();
      const target = previousFocus.current?.isConnected ? previousFocus.current : restoreFocusTarget;
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, []);

  function handleCancel(event) {
    event.preventDefault();
    if (!pending) onClose();
  }

  return (
    <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="reset-dialog-title" onCancel={handleCancel}>
      <form className="confirm-dialog-content" onSubmit={(event) => {
        event.preventDefault();
        if (!pending && confirmation === 'RESET') onConfirm(confirmation);
      }}>
        <p className="eyebrow dark">{t('admin.resetTitle')}</p>
        <h2 id="reset-dialog-title">{t('admin.resetExplain')}</h2>
        <p className="reset-preserve-copy">{t('admin.resetPreserve')}</p>
        <label className="field" htmlFor="reset-confirmation">
          <span>{t('admin.resetTypePrompt')}</span>
          <input id="reset-confirmation" ref={inputRef} value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
        </label>
        <div className="confirm-dialog-actions">
          <button className="button secondary" type="button" disabled={pending} onClick={onClose}>{t('common.back')}</button>
          <button className="button danger" type="submit" disabled={pending || confirmation !== 'RESET'}>
            {pending ? t('admin.resetting') : t('admin.resetConfirm')}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default AdminDataResetDialog;
