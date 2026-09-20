import AlertModal from '@/components/ui/AlertModal';
import { useAlertStore } from '@/lib/alert';

/**
 * Renderiza el alert global controlado por `showAlert()`. Debe montarse una
 * sola vez, como hermano del `Stack`, para poder superponerse a toda ruta.
 */
export default function AlertHost() {
  const { visible, title, message, type, onConfirm, close } = useAlertStore();

  const handleClose = () => {
    onConfirm?.();
    close();
  };

  return (
    <AlertModal
      visible={visible}
      title={title}
      message={message}
      type={type}
      onClose={handleClose}
    />
  );
}
