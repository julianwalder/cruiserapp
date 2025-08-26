import { Dialog, DialogContent, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerSticky?: boolean;
  headerActions?: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  headerSticky = false,
  headerActions,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[90vw] max-h-[90vh] flex flex-col" showCloseButton={false} aria-describedby="modal-content">
        <div
          className={
            (headerSticky
              ? 'sticky top-0 z-10 bg-background border-b '
              : '') +
            'flex-shrink-0 pb-2 flex justify-between items-center'
          }
        >
          <div className="hidden sm:block">
            <DialogTitle className="text-2xl">{title}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {headerActions}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <DialogDescription className="sr-only">
          Modal content
        </DialogDescription>
        <div id="modal-content" className="flex-1 overflow-y-auto pt-4 scrollbar-hide">{children}</div>
      </DialogContent>
    </Dialog>
  );
}