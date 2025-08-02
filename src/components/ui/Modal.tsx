import { Dialog, DialogContent, DialogTitle } from './dialog';
import { Button } from './button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  headerSticky?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  headerSticky = false,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[90vw] max-h-[90vh] flex flex-col" showCloseButton={false}>
        <div
          className={
            (headerSticky
              ? 'sticky top-0 z-10 bg-background border-b '
              : '') +
            'flex-shrink-0 pb-2 flex justify-between'
          }
        >
          <div>
            <DialogTitle className="text-2xl">{title}</DialogTitle>
            {description && (
              <div className="text-base text-muted-foreground">{description}</div>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto pt-4 scrollbar-hide">{children}</div>
      </DialogContent>
    </Dialog>
  );
}