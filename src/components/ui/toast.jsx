import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = React.forwardRef(({ children, ...props }, ref) => (
  <div
    ref={ref}
    {...props}
  >
    {children}
  </div>
));
ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed bottom-0 right-0 z-[100] flex flex-col gap-2 p-4 sm:max-w-[420px] pointer-events-none"
    style={{ pointerEvents: 'none' }}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-2xl border-0 p-5 shadow-lg transition-all animate-in slide-in-from-bottom-full fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
  {
    variants: {
      variant: {
        default: "bg-white text-slate-800 border border-slate-100 shadow-md",
        destructive:
          "destructive group bg-red-50 text-red-800 border-red-200",
        success:
          "bg-white text-slate-800 border border-slate-100 shadow-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = "Toast";

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-xl bg-[#03ACEA] hover:opacity-90 text-white px-4 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:bg-red-600 group-[.destructive]:hover:bg-red-700 group-[.destructive]:text-white cursor-pointer",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-full p-1 text-slate-500 opacity-0 transition-opacity hover:text-slate-700 hover:bg-white/50 focus:opacity-100 focus:outline-none group-hover:opacity-100 group-[.destructive]:text-red-500 group-[.destructive]:hover:text-red-700",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}; 