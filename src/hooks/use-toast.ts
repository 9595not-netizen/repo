import { useEffect, useState } from "react";
import { ToastActionElement } from "@/components/ui/toast";

export interface ToastPayload {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  [key: string]: unknown;
}

type Toast = ToastPayload & { id: string };

type ToastState = { toasts: Toast[] };

type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "UPDATE_TOAST"; toast: Toast };

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: ToastAction) {
  memoryState = {
    ...memoryState,
    toasts:
      action.type === "ADD_TOAST"
        ? [...memoryState.toasts, action.toast]
        : action.type === "DISMISS_TOAST"
          ? action.toastId
            ? memoryState.toasts.filter((t) => t.id !== action.toastId)
            : []
          : action.type === "UPDATE_TOAST"
            ? memoryState.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t))
            : memoryState.toasts,
  };
  listeners.forEach((listener) => listener(memoryState))
}

export function useToast() {
  const [state, setState] = useState(memoryState)

  useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export const toast = ({ ...props }: Omit<Toast, "id">) => {
  const id = genId();
  const update = (p: ToastPayload) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...p, id },
    });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}
