import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import { IS_WEB } from '../config/webLayout';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const WEB_BUTTON_ZOOM_FACTOR = 1.15;
const WEB_WHEEL_SENSITIVITY = 0.002;

export type ZoomableReceiptImageProps = {
  uri: string;
  width: number;
  height: number;
  onError?: () => void;
};

type Matrix = { s: number; tx: number; ty: number };

/**
 * Aperçu ticket : zoom pincement + déplacement (natif), +/− et molette (web uniquement).
 * Implémentation sans Reanimated dans ce fichier (évite les crashs NativeWorklets / Expo Go iOS).
 */
export function ZoomableReceiptImage({ uri, width, height, onError }: ZoomableReceiptImageProps) {
  const [m, setM] = useState<Matrix>({ s: 1, tx: 0, ty: 0 });
  const saved = useRef<Matrix>({ s: 1, tx: 0, ty: 0 });
  const pinchAnchor = useRef(1);
  const panOrigin = useRef({ tx: 0, ty: 0 });

  const syncSaved = (next: Matrix) => {
    saved.current = next;
    setM(next);
  };

  useEffect(() => {
    const z = { s: 1, tx: 0, ty: 0 };
    saved.current = z;
    setM(z);
  }, [uri]);

  const applyZoomFactor = useCallback((factor: number) => {
    const nextS = Math.min(MAX_SCALE, Math.max(MIN_SCALE, saved.current.s * factor));
    if (nextS <= 1.01) {
      syncSaved({ s: 1, tx: 0, ty: 0 });
    } else {
      syncSaved({ s: nextS, tx: saved.current.tx, ty: saved.current.ty });
    }
  }, []);

  const webWheelProps: Record<string, unknown> | undefined = IS_WEB
    ? {
        onWheel: (e: unknown) => {
          const ev = e as { preventDefault?: () => void; deltaY?: number; nativeEvent?: { deltaY?: number } };
          ev.preventDefault?.();
          const dy = ev.deltaY ?? ev.nativeEvent?.deltaY ?? 0;
          if (dy === 0) return;
          applyZoomFactor(Math.exp(-dy * WEB_WHEEL_SENSITIVITY));
        },
      }
    : undefined;

  const imageEl = (
    <Image
      source={{ uri }}
      style={[
        { width, height },
        {
          transform: [{ translateX: m.tx }, { translateY: m.ty }, { scale: m.s }],
        },
      ]}
      resizeMode="contain"
      onError={onError}
    />
  );

  if (IS_WEB) {
    return (
      <View style={[styles.webRoot, { width, height }]} {...webWheelProps}>
        <View style={[styles.box, { width, height }]}>{imageEl}</View>
        <View style={styles.webZoomBar} pointerEvents="box-none">
          <Pressable
            onPress={() => applyZoomFactor(1 / WEB_BUTTON_ZOOM_FACTOR)}
            style={({ pressed }) => [styles.webZoomBtn, pressed && styles.webZoomBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Zoom arrière"
          >
            <Text style={styles.webZoomBtnText}>−</Text>
          </Pressable>
          <Pressable
            onPress={() => applyZoomFactor(WEB_BUTTON_ZOOM_FACTOR)}
            style={({ pressed }) => [styles.webZoomBtn, pressed && styles.webZoomBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Zoom avant"
          >
            <Text style={styles.webZoomBtnText}>+</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <PinchGestureHandler
      onGestureEvent={e => {
        const nextS = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, pinchAnchor.current * e.nativeEvent.scale)
        );
        saved.current = { s: nextS, tx: saved.current.tx, ty: saved.current.ty };
        setM({ ...saved.current });
      }}
      onHandlerStateChange={e => {
        const st = e.nativeEvent.state;
        if (st === State.BEGAN) {
          pinchAnchor.current = saved.current.s;
        }
        if (st === State.END || st === State.CANCELLED) {
          if (saved.current.s <= 1.01) {
            syncSaved({ s: 1, tx: 0, ty: 0 });
          }
        }
      }}
    >
      <View style={[styles.box, { width, height }]}>
        <PanGestureHandler
          onGestureEvent={e => {
            if (saved.current.s <= 1) return;
            const tx = panOrigin.current.tx + e.nativeEvent.translationX;
            const ty = panOrigin.current.ty + e.nativeEvent.translationY;
            saved.current = { s: saved.current.s, tx, ty };
            setM({ ...saved.current });
          }}
          onHandlerStateChange={e => {
            if (e.nativeEvent.state === State.BEGAN) {
              panOrigin.current = { tx: saved.current.tx, ty: saved.current.ty };
            }
          }}
        >
          <View style={[styles.box, { width, height }]}>{imageEl}</View>
        </PanGestureHandler>
      </View>
    </PinchGestureHandler>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webRoot: {
    position: 'relative',
    overflow: 'visible',
  },
  webZoomBar: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  webZoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(36, 41, 73, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  webZoomBtnPressed: {
    backgroundColor: 'rgba(36, 41, 73, 0.9)',
  },
  webZoomBtnText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
    marginTop: -2,
  },
});
