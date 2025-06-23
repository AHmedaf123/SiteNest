"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === DialogTrigger) {
          return React.cloneElement(child as React.ReactElement<any>, { onClick: () => onOpenChange(true) })
        }
        if (React.isValidElement(child) && child.type === DialogContent && open) {
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="fixed inset-0 bg-black/50"
                onClick={() => onOpenChange(false)}
              />
              <div className="relative z-50">
                {React.cloneElement(child as React.ReactElement<any>, { onClose: () => onOpenChange(false) })}
              </div>
            </div>
          )
        }
        return null
      })}
    </>
  )
}

const DialogTrigger = ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => {
  return React.cloneElement(children as React.ReactElement, { onClick })
}

const DialogContent = ({
  children,
  className,
  onClose
}: {
  children: React.ReactNode
  className?: string
  onClose?: () => void
}) => (
  <div className={cn(
    "bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl",
    className
  )}>
    <button
      onClick={onClose}
      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
    >
      ×
    </button>
    {children}
  </div>
)

const DialogHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("mb-4", className)}>
    {children}
  </div>
)

const DialogTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <h2 className={cn("text-lg font-semibold", className)}>
    {children}
  </h2>
)

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
}
