import { useEffect } from "react";

export function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    function handlePointerDown(event) {
      const targetElement = ref.current;

      if (!targetElement || targetElement.contains(event.target)) {
        return;
      }

      handler(event);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [active, handler, ref]);
}
