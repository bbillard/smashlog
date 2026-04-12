import { useMemo } from "react";
import { PanResponder } from "react-native";

export function useSidebarSwipe(onOpen: () => void) {
  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -48 && Math.abs(gestureState.dy) < 40) {
            onOpen();
          }
        },
      }),
    [onOpen],
  );
}
