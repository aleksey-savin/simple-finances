import * as React from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  mobileFullHeight?: boolean
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  mobileFullHeight = false,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-5xl flex flex-col max-h-[90dvh]"
          {...(!description && { 'aria-describedby': undefined })}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {children}
          </div>
          {footer && <DialogFooter className="shrink-0">{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={
          mobileFullHeight ? 'h-[100dvh] !max-h-[100dvh] !mt-0' : 'pb-10'
        }
      >
        <DrawerHeader className={mobileFullHeight ? 'shrink-0' : undefined}>
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div
          className={
            mobileFullHeight
              ? 'no-scrollbar flex-1 min-h-0 overflow-y-auto px-4 pb-4'
              : 'no-scrollbar overflow-y-auto px-4'
          }
        >
          {children}
        </div>
        {footer && (
          <DrawerFooter className={mobileFullHeight ? 'shrink-0' : undefined}>
            {footer}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}
